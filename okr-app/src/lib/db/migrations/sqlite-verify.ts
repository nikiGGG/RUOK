/**
 * SQLite schema-verification mode (FR-005 / T011).
 *
 * For deployments where the runtime role may not execute DDL (separate
 * migration role), verification asserts the target schema + history are
 * already in place WITHOUT mutating anything. An un-migrated database, an
 * unrecognized layout, or a layout still needing adoption deltas is reported
 * as not ready rather than repaired.
 */
import type Database from 'better-sqlite3'
import { getExpectedSqliteLayout } from './expected-sqlite'
import { classifyLegacy } from './fingerprint'
import { readMigrationFolder } from './migration-files'
import type { MigrationResult } from './contracts'

export function runSqliteVerify(
	sqlite: Database.Database,
	migrationsFolder: string
): MigrationResult {
	const { migrations } = readMigrationFolder(migrationsFolder)
	const expected = getExpectedSqliteLayout()

	// Structural fingerprint (tables/columns/indexes/journal).
	const tables: Record<string, string[]> = {}
	const tableRows = sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as Array<{
		name: string
	}>
	for (const r of tableRows) {
		if (r.name.startsWith('sqlite_')) continue
		tables[r.name] = (
			sqlite.prepare(`PRAGMA table_info(\`${r.name}\`)`).all() as Array<{ name: string }>
		).map((c) => c.name)
	}
	const indexes: Record<string, string> = {}
	const idxRows = (
		sqlite.prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL`).all() as Array<{
			name: string
			sql: string
		}>
	)
	for (const r of idxRows) indexes[r.name] = r.sql
	const journalPresent = Object.prototype.hasOwnProperty.call(tables, '__drizzle_migrations')
	const journalCreatedAts = journalPresent
		? (sqlite
				.prepare(`SELECT created_at FROM __drizzle_migrations`)
				.all() as Array<{ created_at: number }>).map((r) => Number(r.created_at))
		: []

	const classification = classifyLegacy({ tables, indexes, journalPresent, journalCreatedAts }, expected, migrations)

	switch (classification.kind) {
		case 'fresh':
			throw new Error(
				'SQLite schema verification failed: database has not been migrated. Run the migration role first.'
			)
		case 'ready':
			return {
				dialect: 'sqlite',
				classification: 'ready',
				appliedCount: migrations.length,
				recorded: 0,
				schemaVersion: migrations.length - 1
			}
		case 'adopt':
			throw new Error(
				`SQLite schema verification failed: schema still requires adoption ` +
					`(${classification.addColumns.length} column(s), ${classification.addIndexes.length} index(es), ` +
					`${classification.journalToRecord.length} journal record(s)). Run the migration role first; the runtime role cannot DDL.`
			)
		case 'reject':
			throw new Error(
				`Unrecognized SQLite schema; verification failed. Reasons: ${classification.reasons.join('; ')}`
			)
	}
}