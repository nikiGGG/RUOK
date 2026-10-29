/**
 * Readiness probe (FR-012 / T012).
 *
 * Reports whether the selected backend is open AND migrated/verified at the
 * expected schema version. Independent of authentication; requires no login.
 * Output is deliberately redacted: dialect, open flag and schema version only —
 * never credentials, paths or connection strings. Returns 503 when the backend
 * is not ready (e.g. database unreachable or TLS/migration failure).
 */
import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getReadiness } from '$lib/db'

export const GET: RequestHandler = async () => {
	const readiness = getReadiness()
	if (!readiness.ready) {
		return json(
			{
				ready: false,
				dialect: readiness.dialect ?? null,
				open: readiness.open,
				schemaVersion: readiness.schemaVersion ?? null
			},
			{ status: 503 }
		)
	}
	return json({
		ready: true,
		dialect: readiness.dialect,
		open: readiness.open,
		schemaVersion: readiness.schemaVersion
	})
}