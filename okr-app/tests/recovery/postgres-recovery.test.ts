/**
 * PostgreSQL native dump/restore rehearsal (T023 / T031 / FR-014, US5).
 *
 * This is the PostgreSQL half of the native installation-recovery rehearsal.
 * It is intentionally separate from the SQLite test (`native-recovery.test.ts`)
 * and from user-export portability (FR-008): native dumps preserve
 * installation-wide data (accounts, sessions, system config, social links,
 * plugin credentials, AI config) that user exports intentionally exclude.
 *
 * It performs a real `pg_dump` of a migrated, seeded disposable database,
 * drops and recreates an empty database, `pg_restore`s the dump, then verifies
 * the restored installation is classified ready and every seeded row is
 * readable through the typed boundary.
 *
 * GATING (T022): this suite runs whenever the live-test prerequisites are met.
 * It is NOT silently skipped. Missing prerequisites (no `RUOK_TEST_PG_ADMIN_URL`,
 * no `pg_dump`/`pg_restore`/`psql`, or no reachable PG18 server) FAIL the suite
 * with a credential-free report from {@link assertPostgresPrerequisites} — the
 * recovery claim is fail-closed and never substitutes SQLite. Native dumps
 * cannot switch backend engines: a PostgreSQL dump restores only to PostgreSQL.
 */
import { execFile } from 'child_process'
import { Client } from 'pg'
import { describe, expect, it } from 'vitest'
import { createDatabaseServices, migrateDatabase } from '../../src/lib/db'
import type { PostgresConfig } from '../../src/lib/db/contracts'
import { assertPostgresPrerequisites } from '../../scripts/require-postgres-test'
import { seedInstall } from './seed'

const adminUrl = process.env.RUOK_TEST_PG_ADMIN_URL

function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
	return new Promise((resolve) => {
		execFile(cmd, args, (error, stdout, stderr) => {
			resolve({ code: error ? (error as { code?: number }).code ?? 1 : 0, stdout, stderr })
		})
	})
}

async function withDisposableDb(
	fn: (config: PostgresConfig, dbName: string) => Promise<void>
): Promise<void> {
	const admin = new Client({ connectionString: adminUrl })
	await admin.connect()
	const dbName = `ruok_recover_${Math.random().toString(36).slice(2, 10)}`
	try {
		await admin.query(`CREATE DATABASE ${dbName}`)
	} finally {
		await admin.end()
	}

	const appUrl = new URL(adminUrl as string)
	appUrl.pathname = `/${dbName}`
	const config: PostgresConfig = {
		type: 'postgres',
		connectionString: appUrl.toString(),
		poolMax: 5,
		connectTimeoutMs: 10000,
		statementTimeoutMs: 30000,
		sslMode: 'disable'
	}

	try {
		await fn(config, dbName)
	} finally {
		const admin2 = new Client({ connectionString: adminUrl })
		await admin2.connect()
		try {
			await admin2.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
		} finally {
			await admin2.end()
		}
	}
}

describe('T031 PostgreSQL native recovery rehearsal', () => {
	it('pg_dump + pg_restore preserves a full migrated installation', async () => {
		// Fail-closed prerequisite gate (T022): the preflight checks
		// RUOK_TEST_PG_ADMIN_URL, pg_dump/pg_restore/psql and a reachable PG18.
		const prereq = await assertPostgresPrerequisites(process.env)
		expect(prereq.ok, prereq.missing.join('; ')).toBe(true)

		await withDisposableDb(async (config, dbName) => {
			// 1. Migrate + seed a full installation.
			expect((await migrateDatabase(config)).classification).toBe('fresh')
			const services = createDatabaseServices(config)
			await services.open()
			await seedInstall(services)
			await services.close()

			// 2. Native dump.
			const dumpPath = `/tmp/ruok-${dbName}.dump`
			const dump = await run('pg_dump', ['-Fc', '--no-owner', '--no-privileges', config.connectionString, '-f', dumpPath])
			expect(dump.code).toBe(0)
			expect(dump.stderr).toBe('')

			// 3. Drop and recreate an empty database, then restore. pg_restore was
			//    already confirmed by the preflight before the rehearsal.
			const admin = new Client({ connectionString: adminUrl })
			await admin.connect()
			try {
				await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
				await admin.query(`CREATE DATABASE ${dbName}`)
			} finally {
				await admin.end()
			}
			const restore = await run('pg_restore', ['--no-owner', '--no-privileges', '-d', config.connectionString, dumpPath])
			expect(restore.code).toBe(0)

			// 4. Verify the restored installation is classified ready (migration check
			//    sees an aligned schema + history) and every row is readable.
			const migrated = await migrateDatabase(config)
			expect(migrated.classification).toBe('ready')
			expect(migrated.recorded).toBe(0)

			const restored = createDatabaseServices(config)
			await restored.open()
			try {
				expect((await restored.users.findByUsername('alice'))?.passwordHash).toBe('hash-a')
				expect((await restored.users.findByUsername('bob'))?.isAdmin).toBe(true)
				expect((await restored.systemConfig.all()).length).toBe(2)
				expect(await restored.friendships.findBetween('alice', 'bob')).toBeDefined()
				expect((await restored.plugins.findByUserAndPlugin('alice', 'fitbit'))?.enabled).toBe(true)
				expect((await restored.userAiConfig.findByUser('alice'))?.provider).toBe('anthropic')
				expect((await restored.objectives.findById('o1'))?.title).toBe('Yearly goal')
				expect((await restored.tasks.findById('t1'))?.title).toBe('Write code')
			} finally {
				await restored.close()
			}
		})
	})
})