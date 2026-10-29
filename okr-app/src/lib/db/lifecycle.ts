/**
 * Selected-backend connection ownership (FR-001 / FR-005 / T007 / T011/T012).
 *
 * A process owns at most one {@link DatabaseServices} instance for exactly one
 * configured backend. `open`/`close`/`isOpen` are awaitable and idempotent.
 * Opening happens at runtime (startup/readiness), never at import or build
 * time, so importing the database module is free of connection side effects.
 *
 * Migration (FR-004/FR-005): `openDatabase` runs the selected backend's checked
 * migration history (or schema verification in `verify` mode) BEFORE opening
 * the runtime connection, serializing concurrent startups/CLI. The process-wide
 * readiness surface reflects whether the backend is open AND migrated.
 *
 * The singleton is optional: callers may use {@link createDatabaseServices} to
 * manage their own instance (e.g. tests). Importing this module performs no I/O.
 */
import type { DatabaseConfig, DatabaseServices } from './contracts'
import type { ReadinessState } from './migrations'
import { migrateDatabase, type MigrateOptions } from './migrations'
import { PostgresDatabaseServices } from './adapters/postgres'
import { SqliteDatabaseServices } from './adapters/sqlite'

/** Construct the concrete adapter selected by a validated config. */
export function createDatabaseServices(config: DatabaseConfig): DatabaseServices {
	switch (config.type) {
		case 'sqlite':
			return new SqliteDatabaseServices(config)
		case 'postgres':
			return new PostgresDatabaseServices(config)
	}
}

// ---------------------------------------------------------------------------
// Optional process-wide singleton
// ---------------------------------------------------------------------------

let singleton: DatabaseServices | undefined
let singletonConfig: DatabaseConfig | undefined
let lastMigrationVersion: number | undefined

/**
 * Return the process-wide services, constructing it lazily on first use with
 * the provided config. Importing this module has no side effects; the backend
 * is only opened when {@link openDatabase} is called.
 */
export function getDatabaseServices(config?: DatabaseConfig): DatabaseServices {
	if (!singleton) {
		if (!config) {
			throw new Error(
				'getDatabaseServices requires a DatabaseConfig on first use (no instance open yet)'
			)
		}
		singleton = createDatabaseServices(config)
		singletonConfig = config
	}
	return singleton
}

/**
 * Open the process-wide backend and make it ready. Idempotent. Runs the
 * selected backend's migrations (or verification in `verify` mode) first.
 */
export async function openDatabase(
	config?: DatabaseConfig,
	migrateOptions: MigrateOptions = {}
): Promise<DatabaseServices> {
	const services = getDatabaseServices(config)
	const resolved = getOpenConfig() ?? config
	if (resolved) {
		const result = await migrateDatabase(resolved, migrateOptions)
		lastMigrationVersion = result.schemaVersion
	}
	await services.open()
	return services
}

/** Whether the process-wide backend is currently open. */
export function isDatabaseOpen(): boolean {
	return singleton?.isOpen() ?? false
}

/**
 * Login-independent readiness of the process-wide backend (FR-012 / T012):
 * open AND migrated/verified at the expected schema version. Never includes
 * secrets or connection strings.
 */
export function getReadiness(): ReadinessState {
	const open = isDatabaseOpen()
	const config = getOpenConfig()
	if (!config) {
		return { ready: false, open, schemaVersion: undefined }
	}
	const schemaVersion = lastMigrationVersion
	return { ready: open && schemaVersion !== undefined, dialect: config.type, open, schemaVersion }
}

/** Release all process-wide database resources. Idempotent. */
export async function closeDatabase(): Promise<void> {
	if (singleton) {
		await singleton.close()
	}
}

/** The validated config used for the open process-wide backend, if any. */
export function getOpenConfig(): DatabaseConfig | undefined {
	return singletonConfig
}

/** Clear the process-wide singleton (test isolation only). */
export function resetDatabaseForTests(): void {
	singleton = undefined
	singletonConfig = undefined
	lastMigrationVersion = undefined
}