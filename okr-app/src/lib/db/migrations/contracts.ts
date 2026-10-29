/**
 * Migration lifecycle types (FR-004 / FR-005 / T009).
 *
 * Shared, dialect-agnostic shapes for independent checked migration
 * histories, fingerprinted legacy adoption and readiness. Canonical
 * validation/classification logic lives here and in {@link ./fingerprint}
 * only dialect SQL/transaction/migration execution belongs in adapters
 * (`migrations/sqlite-migrator.ts`, `migrations/postgres-migrator.ts`).
 */

/** One migration in a checked, versioned history (tag + sha256 + SQL). */
export interface MigrationMeta {
	/** Drizzle journal tag, e.g. `0006_max_agent_rounds`. */
	tag: string
	/** Folder timestamp (`journal.when`); drives applied-ordering. */
	when: number
	/** sha256 (hex) of the migration file body — the journal record hash. */
	hash: string
	/** Migration SQL split on `--> statement-breakpoint`. */
	sql: string[]
	/** Whether breakpoints were declared in the journal entry. */
	breakpoints: boolean
}

/** A parsed, checked migration folder (journal + files). */
export interface MigrationFolder {
	folder: string
	migrations: MigrationMeta[]
}

/** Structural fingerprint of a live backend schema. */
export interface DbShape {
	/** table name -> physical column names (excludes `__drizzle_migrations`). */
	tables: Record<string, string[]>
	/** named index -> full CREATE INDEX statement. */
	indexes: Record<string, string>
	/** Whether the migration journal table exists. */
	journalPresent: boolean
	/** Applied journal `created_at` (folderMillis) values, if the table exists. */
	journalCreatedAts: number[]
}

/** A column that may be applied to an existing table during adoption. */
export interface AddColumnDelta {
	table: string
	column: string
	definition: string
}

/** A named index that may be created during adoption. */
export interface AddIndexDelta {
	name: string
	definition: string
}

export type LegacyClassification =
	| { kind: 'fresh' }
	| { kind: 'ready'; journalComplete: boolean }
	| {
			kind: 'adopt'
			addColumns: AddColumnDelta[]
			addIndexes: AddIndexDelta[]
			journalToRecord: MigrationMeta[]
	  }
	| { kind: 'reject'; reasons: string[] }

/** Canonical expected layout a fingerprint is checked against. */
export interface ExpectedLayout {
	/** table -> physical columns. */
	tables: Record<string, string[]>
	/** all expected named indexes (base + additive). */
	namedIndexes: Record<string, string>
	/** additive columns: table -> column -> ALTER definition (added post-baseline). */
	additiveColumns: Record<string, Record<string, string>>
	/** additive indexes: name -> CREATE definition (added post-baseline). */
	additiveIndexes: Record<string, string>
}

/** Outcome of a migration run (fresh or adopted). */
export interface MigrationResult {
	/** The selected backend dialect. */
	dialect: 'sqlite' | 'postgres'
	/** How the target schema was reached. */
	classification: 'fresh' | 'ready' | 'adopt'
	/** Number of migrations present in the applied history. */
	appliedCount: number
	/** Number of migration journal records written by this run. */
	recorded: number
	/** Schema version = index of the highest applied migration (0-based). */
	schemaVersion: number
}

/** Readiness of a selected backend (login-independent, redacted). */
export interface ReadinessState {
	ready: boolean
	/** Undefined when no backend has been opened yet. */
	dialect?: 'sqlite' | 'postgres'
	open: boolean
	schemaVersion?: number
}