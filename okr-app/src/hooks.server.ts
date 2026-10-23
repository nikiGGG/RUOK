import type { Handle } from '@sveltejs/kit';
import { getSessionIdFromCookies, getUserFromSession } from '$lib/server/auth';
import { initializePlugins } from '$lib/server/plugins';
import { startScheduler, stopScheduler, isSchedulerRunning } from '$lib/server/plugins/scheduler';
import { getDatabase } from '$lib/server/database';
import { closeDatabase } from '$lib/db';

// Initialize plugins and scheduler on server start.
//
// Startup ordering (T027): readiness PRECEDES authentication and the scheduler.
// The first request awaits `getDatabase()` — which runs the selected backend's
// checked migrations and opens it — before any authenticated work or the
// plugin sync scheduler begins. This guarantees jobs never touch an unready
// database and PostgreSQL never opens a SQLite file.
let initialized = false;
let initializing: Promise<void> | null = null;

async function initializeOnce(): Promise<void> {
	if (initialized) return;
	if (initializing) return initializing;
	initializing = (async () => {
		// Await database readiness (migrate + open) first.
		await getDatabase();

		// Register all plugins and start the sync scheduler only after readiness.
		initializePlugins();
		if (!isSchedulerRunning()) {
			startScheduler(60 * 60 * 1000); // 1 hour
		}

		initialized = true;
		initializing = null;
	})();
	return initializing;
}

// Close jobs and the database on shutdown (FR-005 / T027).
let shutdownRegistered = false;
function registerShutdown(): void {
	if (shutdownRegistered) return;
	shutdownRegistered = true;
	const shutdown = () => {
		stopScheduler();
		closeDatabase().catch((err) => console.error('[shutdown] closeDatabase failed:', err));
	};
	process.once('SIGTERM', shutdown);
	process.once('SIGINT', shutdown);
	process.once('exit', () => {
		stopScheduler();
	});
}

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize plugins, scheduler and database readiness on first request.
	registerShutdown();
	await initializeOnce();

	// Get session ID from cookies
	const sessionId = getSessionIdFromCookies(event.cookies);

	if (sessionId) {
		// Get user from session
		const user = await getUserFromSession(sessionId);
		if (user) {
			event.locals.user = user;
		}
	}

	return resolve(event);
};