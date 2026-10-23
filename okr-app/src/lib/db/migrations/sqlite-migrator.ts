/**
 * SQLite migration execution (FR-004 / FR-005 / FR-010 / T009-T012).
 *
 * Dialect-specific migration/adoption runner. It owns the SQLite-specific
 * queries and synchronous transaction, while the canonical expected layout,
 * classification and journal reconciliation are shared (`expected-sqlite.ts`,
 * `fingerprint.ts`, `migration-files.ts`).
 *
 * Flow:
 *  1. Apply journal + busy-timeout pragmas (FK enforcement is enabled by the
 *     adapter after this preflight/adoption completes).
 *  2. Inspect the structural fingerprint and classify it against the canonical
 *     expected layout + full history.
 *  3. fresh        -> apply the full checked history in one transaction.
 *     ready        -> nothing to do (schema + journal already aligned).
 *     adopt        -> run a data-integrity (FK orphan) preflight, then apply
 *                     ONLY the supported additive deltas and record the
 *                     reconciled journal facts atomically in one transaction.
 *     reject       -> fail with reasons BEFORE any mutation.
 *
 * better-sqlite3 transactions are synchronous: no `await` appears inside a
 * transaction callback in this module.
 */
import type Database from 'better-sqlite3'
import { getExpectedSqliteLayout } from './expected-sqlite'
import { classifyLegacy } from './fingerprint'
import { readMigrationFolder } from './migration-files'
import type { DbShape, MigrationResult } from './contracts'
import type { SqliteConfig } from '../contracts'

const JOURNAL_TABLE = '__drizzle_migrations'

interface FkEdge {
	child: string
	parent: string
	cols: Array<{ from: string; to: string }>
}

function appliedWhen(sqlite: Database.Database): number[] {
	return (sqlite
		.prepare(`SELECT created_at FROM ${JOURNAL_TABLE}`)
		.all() as Array<{ created_at: number }>).map((r) => Number(r.created_at))
}

function inspectSqlite(sqlite: Database.Database): DbShape {
	const tables: Record<string, string[]> = {}
	const tableRows = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{
		name: string
	}>
	for (const r of tableRows) {
		if (r.name.startsWith('sqlite_')) continue
		const cols = (
			sqlite.prepare(`PRAGMA table_info(\`${r.name}\`)`).all() as Array<{ name: string }>
		).map((c) => c.name)
		tables[r.name] = cols
	}

	const indexes: Record<string, string> = {}
	const idxRows = (
		sqlite.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL`).all() as Array<{
			name: string
			sql: string
		}>
	)
	for (const r of idxRows) indexes[r.name] = r.sql

	const journalPresent = Object.prototype.hasOwnProperty.call(tables, JOURNAL_TABLE)
	return {
		tables,
		indexes,
		journalPresent,
		journalCreatedAts: journalPresent ? appliedWhen(sqlite) : []
	}
}

/** Foreign-key edges from `PRAGMA foreign_key_list`, grouped by FK id. */
function readFkEdges(sqlite: Database.Database): FkEdge[] {
	const edges: FkEdge[] = []
	const tableRows = Object.keys(inspectSqlite(sqlite).tables).filter((t) => t !== JOURNAL_TABLE)
	for (const table of tableRows) {
		const rows = sqlite.pragma(`foreign_key_list(\`${table}\`)`) as unknown as Array<{
			id: number
			table: string
			from: string
			to: string
		}>
		const groups = new Map<number, FkEdge>()
		for (const r of rows) {
			let edge = groups.get(r.id)
			if (!edge) {
				edge = { child: table, parent: r.table, cols: [] }
				groups.set(r.id, edge)
			}
			edge.cols.push({ from: r.from, to: r.to })
		}
		for (const edge of groups.values()) edges.push(edge)
	}
	return edges
}

/**
 * Data-integrity preflight: ensure no orphaned foreign-key rows exist before a
 * legacy layout is adopted. Failures are reported and never auto-deleted.
 */
function assertFkIntegrity(sqlite: Database.Database): void {
	const orphans: string[] = []
	for (const edge of readFkEdges(sqlite)) {
		if (edge.cols.length === 0) continue
		const joinSql = edge.cols
			.map((c) => `child.\`${c.from}\` = parent.\`${c.to}\``)
			.join(' AND ')
		const whereSql = edge.cols.map((c) => `child.\`${c.from}\` IS NOT NULL`).join(' AND ')
		// A LEFT JOIN with no parent match nulls every parent column, so checking
		// the first referenced parent column is sufficient for the null test.
		const parentProbe = `parent.\`${edge.cols[0].to}\``
		const sql = `SELECT COUNT(*) AS c FROM \`${edge.child}\` child LEFT JOIN \`${edge.parent}\` parent ON ${joinSql} WHERE ${whereSql} AND ${parentProbe} IS NULL`
		const row = sqlite.prepare(sql).get() as { c: number }
		if (row.c > 0) {
			orphans.push(`${edge.child}.${edge.cols.map((c) => c.from).join(',')} -> ${edge.parent}`)
		}
	}
	if (orphans.length > 0) {
		throw new Error(
			`Legacy adoption aborted: foreign-key orphans found (${orphans.join(', ')}). ` +
				'No schema changes were applied. Fix or migrate the orphan data explicitly; orphan data is never auto-deleted.'
		)
	}
}

/**
 * Run migrations/adoption for a SQLite database against the checked history.
 * The caller owns the open {@link sqlite} connection (lifetime + close).
 *
 * Serialization (T011): the whole inspect -> classify -> apply sequence runs
 * inside a `BEGIN IMMEDIATE` transaction, which immediately acquires the write
 * (RESERVED) lock. A concurrent migrator blocks on the bounded busy_timeout,
 * then re-reads the now-converged state and no-ops — so two processes never
 * double-apply or race on the schema.
 */
export function runSqliteMigrations(
	sqlite: Database.Database,
	config: SqliteConfig,
	migrationsFolder: string
): MigrationResult {
	sqlite.pragma(`journal_mode = ${config.journalMode}`)
	sqlite.pragma(`busy_timeout = ${config.busyTimeoutMs}`)

	const { migrations } = readMigrationFolder(migrationsFolder)
	const expected = getExpectedSqliteLayout()

	sqlite.exec('BEGIN IMMEDIATE')
	let result: MigrationResult
	try {
		const current = inspectSqlite(sqlite)
		const classification = classifyLegacy(current, expected, migrations)

		switch (classification.kind) {
			case 'fresh': {
				applyFresh(sqlite, migrations)
				result = {
					dialect: 'sqlite',
					classification: 'fresh',
					appliedCount: migrations.length,
					recorded: migrations.length,
					schemaVersion: migrations.length - 1
				}
				break
			}
			case 'ready': {
				result = {
					dialect: 'sqlite',
					classification: 'ready',
					appliedCount: migrations.length,
					recorded: 0,
					schemaVersion: migrations.length - 1
				}
				break
			}
			case 'adopt': {
				// Data-integrity preflight BEFORE any mutation (inside the lock).
				assertFkIntegrity(sqlite)
				applyAdoption(
					sqlite,
					classification.addColumns,
					classification.addIndexes,
					classification.journalToRecord
				)
				result = {
					dialect: 'sqlite',
					classification: 'adopt',
					appliedCount: migrations.length,
					recorded: classification.journalToRecord.length,
					schemaVersion: migrations.length - 1
				}
				break
			}
			case 'reject': {
				throw new Error(
					`Unrecognized SQLite schema; refusing to mutate. Reasons: ${classification.reasons.join('; ')}. ` +
						'Unknown layouts are left unchanged and rejected; no partial changes or automatic deletion.'
				)
			}
		}
		sqlite.exec('COMMIT')
		return result
	} catch (err) {
		sqlite.exec('ROLLBACK')
		throw err
	}
}

function ensureJournalTable(sqlite: Database.Database): void {
	sqlite.exec(
		`CREATE TABLE IF NOT EXISTS ${JOURNAL_TABLE} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`
	)
}

/** Apply the full checked history in order (fresh install). Runs in the caller's transaction. */
function applyFresh(sqlite: Database.Database, migrations: Array<{ when: number; sql: string[]; hash: string }>): void {
	ensureJournalTable(sqlite)
	const existing = new Set(appliedWhen(sqlite))
	const insert = sqlite.prepare(`INSERT INTO ${JOURNAL_TABLE} (hash, created_at) VALUES (?, ?)`)
	for (const m of migrations) {
		if (existing.has(m.when)) continue
		for (const stmt of m.sql) sqlite.exec(stmt)
		insert.run(m.hash, m.when)
	}
}

/** Apply supported additive deltas + reconciled journal facts atomically (in caller's transaction). */
function applyAdoption(
	sqlite: Database.Database,
	addColumns: Array<{ table: string; column: string; definition: string }>,
	addIndexes: Array<{ definition: string }>,
	journalToRecord: Array<{ when: number; hash: string }>
): void {
	ensureJournalTable(sqlite)
	const existing = new Set(appliedWhen(sqlite))
	for (const d of addColumns) {
		sqlite.exec(`ALTER TABLE \`${d.table}\` ADD COLUMN \`${d.column}\` ${d.definition}`)
	}
	for (const ix of addIndexes) {
		sqlite.exec(ix.definition)
	}
	const insert = sqlite.prepare(`INSERT INTO ${JOURNAL_TABLE} (hash, created_at) VALUES (?, ?)`)
	for (const m of journalToRecord) {
		if (existing.has(m.when)) continue
		insert.run(m.hash, m.when)
	}
}