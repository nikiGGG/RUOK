/**
 * Server-side access to the typed persistence boundary.
 *
 * Lazily opens the configured backend (via `$lib/db`) on first use and returns
 * the process-wide {@link DatabaseServices} instance. Application server code
 * (auth, configuration, goals) consumes repositories through this accessor and
 * never imports a raw driver handle or a dialect schema.
 *
 * Opening is deferred so importing this module performs no filesystem/network
 * I/O; the first caller triggers `openDatabase`, which runs the selected
 * backend's checked migration history before publishing ready repositories.
 */
import { loadConfig, openDatabase } from '$lib/db';
import type { DatabaseServices } from '$lib/db';

let services: DatabaseServices | undefined;
let opening: Promise<DatabaseServices> | undefined;

export function getDatabase(): Promise<DatabaseServices> {
	if (services) return Promise.resolve(services);
	if (!opening) {
		opening = openDatabase(loadConfig()).then((s) => {
			services = s;
			return s;
		});
	}
	return opening;
}