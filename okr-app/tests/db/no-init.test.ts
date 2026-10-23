/**
 * No build/import-time initialization test (FR-005 / T012).
 *
 * Bundles the probe (`_no-init-probe.ts`) with esbuild and runs it in a
 * separate process. The probe imports the full persistence + migration
 * surface and reports that nothing was opened; importing the new modules must
 * perform no I/O (no database file, no connection, no readiness).
 */
import { execFile } from 'child_process'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterAll, describe, expect, it } from 'vitest'

const cwd = process.cwd()
const esbuild = join(cwd, 'node_modules', '.bin', 'esbuild')

function run(cmd: string, args: string[]): Promise<{ code: number; stdout: string }> {
	return new Promise((resolve) => {
		execFile(cmd, args, { cwd }, (error, stdout) => {
			resolve({ code: error ? (error as { code?: number }).code ?? 1 : 0, stdout })
		})
	})
}

describe('no build-time initialization (T012)', () => {
	const dir = mkdtempSync(join(tmpdir(), 'ruok-noinit-'))
	// Bundle under the project's node_modules so external packages resolve.
	const bundle = join(cwd, 'node_modules', '.cache', 'no-init-probe.mjs')

	afterAll(() => {
		rmSync(dir, { recursive: true, force: true })
		rmSync(bundle, { force: true })
	})

	it('importing the persistence + migration surface opens nothing', async () => {
		const build = await run(esbuild, [
			'tests/db/_no-init-probe.ts',
			'--bundle',
			'--platform=node',
			'--packages=external',
			'--format=esm',
			`--outfile=${bundle}`
		])
		expect(build.code).toBe(0)

		const res = await run('node', [bundle])
		expect(res.code).toBe(0)
		expect(res.stdout).toContain('PROBE:')
		const payload = res.stdout.split('PROBE:')[1].trim()
		const parsed = JSON.parse(payload)
		expect(parsed).toEqual({ readinessReady: false, open: false, config: null })
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