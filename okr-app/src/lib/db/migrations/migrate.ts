/**
 * Canonical migration orchestration entry (FR-004 / FR-005 / T009/T011).
 *
 * Runs the selected backend's checked migration history (or a schema
 * verification) ahead of opening the runtime connection. Used by the startup
 * lifecycle and the standalone `db:migrate` CLI — one config contract, one
 * runner. Importing this module performs no I/O; the backend is opened and
 * migrated only when `migrateDatabase` is invoked.
 */
import Database from 'better-sqlite3'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'
import { runSqliteMigrations } from './sqlite-migrator'
import {
	acquirePostgresMigrationLock,
	createPostgresMigrationClient,
	releasePostgresMigrationLock,
	runPostgresMigrations
} from './postgres-migrator'
import type { DatabaseConfig } from '../contracts'
import type { MigrationResult } from './contracts'

export interface MigrateOptions {
	/**
	 * `verify` runs only schema/history verification without applying DDL
	 * (for deployments where the runtime role may not migrate). Default `migrate`.
	 */
	mode?: 'migrate' | 'verify'
	/** Override the migration folder (defaults to the configured dialect folder). */
	migrationsFolder?: string
}

/** Default migration folder per dialect (relative to the process cwd). */
export function defaultMigrationsFolder(dialect: 'sqlite' | 'postgres'): string {
	return join(process.cwd(), dialect === 'sqlite' ? 'drizzle' : 'drizzle-postgres')
}

/**
 * Migrate (or verify) the selected backend's schema. Serializes concurrent
 * migration attempts (SQLite exclusive transaction; PostgreSQL advisory lock).
 */
export async function migrateDatabase(
	config: DatabaseConfig,
	options: MigrateOptions = {}
): Promise<MigrationResult> {
	const mode = options.mode ?? 'migrate'

	if (config.type === 'sqlite') {
		mkdirSync(dirname(config.path), { recursive: true })
		const sqlite = new Database(config.path)
		try {
			if (mode === 'verify') {
				const { runSqliteVerify } = await import('./sqlite-verify')
				return runSqliteVerify(sqlite, options.migrationsFolder ?? defaultMigrationsFolder('sqlite'))
			}
			return runSqliteMigrations(
				sqlite,
				config,
				options.migrationsFolder ?? defaultMigrationsFolder('sqlite')
			)
		} finally {
			sqlite.close()
		}
	}

	const client = createPostgresMigrationClient(config)
	try {
		await client.connect()
		await acquirePostgresMigrationLock(client)
		try {
			return await runPostgresMigrations(
				client,
				config,
				options.migrationsFolder ?? defaultMigrationsFolder('postgres'),
				{ verifyOnly: mode === 'verify' }
			)
		} finally {
			await releasePostgresMigrationLock(client)
		}
	} finally {
		await client.end().catch(() => undefined)
	}
}