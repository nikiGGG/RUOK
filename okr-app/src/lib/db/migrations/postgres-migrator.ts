/**
 * PostgreSQL migration execution (FR-004 / FR-005 / FR-009 / T009/T011/T012).
 *
 * Dialect-specific runner for the independent PostgreSQL history. Uses ONE
 * pinned connection protected by a PostgreSQL advisory lock so concurrent
 * startups/CLI invocations serialize; schema DDL and journal recording run in
 * a single transaction on that pinned connection. There is no legacy SQLite
 * adoption here — PostgreSQL is a fresh backend with its own versioned history.
 *
 * Supports a schema-verification mode (`verifyOnly`) for deployments where the
 * runtime role may not execute DDL: it verifies the expected history is fully
 * recorded without mutating anything.
 *
 * PostgreSQL reads/writes are asynchronous; every awaited statement runs on
 * the pinned client (never a pool). This is a separate process from any
 * better-sqlite3 transaction, so `await` is safe here.
 */
import { Client } from 'pg'
import { buildPostgresPoolConfig } from '../config'
import { readMigrationFolder } from './migration-files'
import type { MigrationResult } from './contracts'
import type { PostgresConfig } from '../contracts'

const MIGRATION_SCHEMA = 'drizzle'
const MIGRATION_TABLE = '__drizzle_migrations'

/** Fixed advisory-lock key so all RUOK processes serialize on the same lock. */
const LOCK_CLASS = 798137
const LOCK_ID = 9003

async function createJournal(client: Client): Promise<void> {
	await client.query(`CREATE SCHEMA IF NOT EXISTS ${MIGRATION_SCHEMA}`)
	await client.query(
		`CREATE TABLE IF NOT EXISTS ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (` +
			`id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`
	)
}

async function appliedWhen(client: Client): Promise<Set<number>> {
	const res = await client.query(
		`SELECT created_at FROM ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} ORDER BY created_at ASC`
	)
	return new Set((res.rows as Array<{ created_at: string }>).map((r) => Number(r.created_at)))
}

export interface PostgresMigrationOptions {
	/** Verify the expected history is fully recorded without mutating (no-DDL role). */
	verifyOnly?: boolean
}

/**
 * Run (or verify) PostgreSQL migrations on a pinned, advisory-locked client.
 * The caller owns the connection lifecycle (connect/close).
 */
export async function runPostgresMigrations(
	client: Client,
	config: PostgresConfig,
	migrationsFolder: string,
	options: PostgresMigrationOptions = {}
): Promise<MigrationResult> {
	const { migrations } = readMigrationFolder(migrationsFolder)
	await createJournal(client)
	const existing = await appliedWhen(client)

	const pending = migrations.filter((m) => !existing.has(m.when))

	if (options.verifyOnly) {
		if (pending.length > 0) {
			throw new Error(
				`PostgreSQL schema verification failed: ${pending.length} migration(s) not applied ` +
					`(${pending.map((m) => m.tag).join(', ')}). Run the migration role first; the runtime role cannot DDL.`
			)
		}
		return {
			dialect: 'postgres',
			classification: 'ready',
			appliedCount: migrations.length,
			recorded: 0,
			schemaVersion: migrations.length - 1
		}
	}

	const appliedCount = migrations.length - pending.length
	if (pending.length === 0) {
		return {
			dialect: 'postgres',
			classification: 'ready',
			appliedCount: migrations.length,
			recorded: 0,
			schemaVersion: migrations.length - 1
		}
	}

	await client.query('BEGIN')
	try {
		for (const m of pending) {
			for (const stmt of m.sql) {
				await client.query(stmt)
			}
			await client.query(
				`INSERT INTO ${MIGRATION_SCHEMA}.${MIGRATION_TABLE} (hash, created_at) VALUES ($1, $2)`,
				[m.hash, m.when]
			)
		}
		await client.query('COMMIT')
	} catch (err) {
		await client.query('ROLLBACK').catch(() => undefined)
		throw err
	}

	return {
		dialect: 'postgres',
		classification: appliedCount === 0 ? 'fresh' : 'ready',
		appliedCount: migrations.length,
		recorded: pending.length,
		schemaVersion: migrations.length - 1
	}
}

/**
 * Acquire the process-wide advisory migration lock on {@link client}.
 */
export async function acquirePostgresMigrationLock(client: Client): Promise<void> {
	await client.query(`SELECT pg_advisory_lock($1, $2)`, [LOCK_CLASS, LOCK_ID])
}

/**
 * Release the advisory migration lock previously acquired on {@link client}.
 */
export async function releasePostgresMigrationLock(client: Client): Promise<void> {
	await client.query(`SELECT pg_advisory_unlock($1, $2)`, [LOCK_CLASS, LOCK_ID]).catch(() => undefined)
}

/**
 * Convenience: open a dedicated pinned migration client for a validated config
 * (same TLS/verified settings as the runtime pool via {@link buildPostgresPoolConfig}).
 */
export function createPostgresMigrationClient(config: PostgresConfig): Client {
	return new Client(buildPostgresPoolConfig(config))
}