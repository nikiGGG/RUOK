/**
 * Concurrency serialization test (T011 / T012).
 *
 * Two independent `db:migrate` CLI processes race to migrate the same fresh
 * SQLite file. The migration lock/busy-timeout must serialize them: both
 * succeed and the resulting schema + journal are valid (not corrupted, not
 * double-applied). Uses the REAL bundled CLI so this exercises the shipped
 * migration runtime.
 */
import { execFile } from 'child_process'
import Database from 'better-sqlite3'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'

const cwd = process.cwd()
const esbuild = join(cwd, 'node_modules', '.bin', 'esbuild')

function run(cmd: string, args: string[], opts: { env: NodeJS.ProcessEnv }): Promise<{ code: number; stdout: string; stderr: string }> {
	return new Promise((resolve) => {
		execFile(cmd, args, { ...opts, cwd }, (error, stdout, stderr) => {
			resolve({ code: error ? (error as { code?: number }).code ?? 1 : 0, stdout, stderr })
		})
	})
}

describe('concurrent startup/CLI migration (T011/T012)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'ruok-conc-'))
	const dbPath = join(dir, 'okr.db')
	// Bundle under the project's node_modules so external packages resolve.
	const bundle = join(cwd, 'node_modules', '.cache', 'db-migrate-conc.mjs')

	afterAll(() => {
		rmSync(dir, { recursive: true, force: true })
		rmSync(bundle, { force: true })
	})

	it('serializes two concurrent CLI migrations and converges cleanly', async () => {
		// Bundle the CLI once (avoids racing the output file), then run two
		// processes against the same fresh database concurrently.
		const bundleRes = await run(esbuild, ['scripts/db-migrate.ts', '--bundle', '--platform=node', '--packages=external', '--format=esm', `--outfile=${bundle}`], { env: process.env })
		expect(bundleRes.code).toBe(0)

		const env = { ...process.env, DATABASE_PATH: dbPath }
		const [a, b] = await Promise.all([
			run('node', [bundle], { env }),
			run('node', [bundle], { env })
		])

		expect(a.code).toBe(0)
		expect(b.code).toBe(0)

		// The converged database is valid: 25 app tables, full journal, no dupes.
		const raw = new Database(dbPath, { readonly: true })
		try {
			const tables = raw
				.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations'`)
				.all() as Array<{ name: string }>
			expect(tables).toHaveLength(25)
			const journal = raw.prepare('SELECT count(*) AS c FROM __drizzle_migrations').get() as { c: number }
			expect(journal.c).toBe(7)
			const dupes = raw
				.prepare('SELECT created_at, count(*) AS c FROM __drizzle_migrations GROUP BY created_at HAVING c > 1')
				.all()
			expect(dupes).toHaveLength(0)
		} finally {
			raw.close()
		}
	})
})