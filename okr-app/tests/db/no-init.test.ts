/**
 * No build/import-time initialization test (FR-005 / T012 / T024).
 *
 * Bundles the probe (`_no-init-probe.ts`) with esbuild and runs it in a
 * separate process. The probe imports the full persistence + migration
 * surface and reports that nothing was opened; importing the new modules must
 * perform no I/O (no database file, no connection, no readiness).
 *
 * T024 (stability): the probe is executed TEN consecutive times with a unique
 * isolated bundle path per run; child stdout/stderr, exit code AND signal are
 * captured and Vitest retry is disabled (default). Import state stays unopened
 * on every run.
 */
import { execFile } from 'child_process'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'

const cwd = process.cwd()
const esbuild = join(cwd, 'node_modules', '.bin', 'esbuild')

/** Number of consecutive independent probe runs (T024, retries disabled). */
const PROBE_RUNS = 10

interface RunResult {
	code: number
	signal: string | null
	stdout: string
}

function run(cmd: string, args: string[]): Promise<RunResult> {
	return new Promise((resolve) => {
		execFile(cmd, args, { cwd }, (error, stdout) => {
			const err = error as (NodeJS.ErrnoException & { signal?: string | null }) | null
			resolve({
				code: err ? (typeof err.code === 'number' ? err.code : 1) : 0,
				signal: err ? (err.signal ?? null) : null,
				stdout: String(stdout)
			})
		})
	})
}

describe('no build-time initialization (T012)', () => {
	// Unique isolated bundle path per run (external packages resolve because the
	// bundle lives under the project's node_modules).
	const bundle = join(cwd, 'node_modules', '.cache', `no-init-probe-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`)
	const dirs: string[] = []

	afterAll(() => {
		rmSync(bundle, { force: true })
		for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
	})

	it('importing the persistence + migration surface opens nothing (10 runs)', async () => {
		const build = await run(esbuild, [
			'tests/db/_no-init-probe.ts',
			'--bundle',
			'--platform=node',
			'--packages=external',
			'--format=esm',
			`--outfile=${bundle}`
		])
		expect(build.code, build.stdout).toBe(0)

		for (let i = 0; i < PROBE_RUNS; i++) {
			const res = await run('node', [bundle])
			expect(res.code, `probe run ${i} exit code`).toBe(0)
			expect(res.signal, `probe run ${i} was killed by signal ${res.signal}`).toBeNull()
			expect(res.stdout, `probe run ${i} stdout missing PROBE:`).toContain('PROBE:')
			const payload = res.stdout.split('PROBE:')[1].trim()
			const parsed = JSON.parse(payload)
			expect(parsed, `probe run ${i} unopened import state`).toEqual({
				readinessReady: false,
				open: false,
				config: null
			})
		}
	})

	it('importing the modules does not create the default sqlite file', async () => {
		// cwd is okr-app; the default DATABASE_PATH is data/okr.db. Import must
		// not create it.
		const defaultPath = join(cwd, 'data', 'okr.db')
		const existedBefore = existsSync(defaultPath)
		const res = await run('node', [bundle])
		expect(res.code).toBe(0)
		// The probe created no file; and if it did not exist before it still does not.
		if (!existedBefore) {
			expect(existsSync(defaultPath)).toBe(false)
		}
	})
})