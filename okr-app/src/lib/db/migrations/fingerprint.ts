/**
 * Canonical fingerprinted legacy classification (FR-004 / T010).
 *
 * Pure, shared logic that classifies a live backend's structural fingerprint
 * against a canonical expected layout and the full checked migration history.
 * It decides whether a database is fresh, already at the expected schema
 * (`ready`), a recognized legacy layout that may be adopted (`adopt`), or an
 * unknown/unrecognized layout that must be rejected before any mutation.
 *
 * This function performs NO I/O and is fully unit-testable. Dialect-specific
 * inspection of a live database (reading tables/indexes, running data-integrity
 * checks, applying deltas in a transaction) lives in the adapter migrators.
 */
import type {
	AddColumnDelta,
	AddIndexDelta,
	DbShape,
	ExpectedLayout,
	LegacyClassification,
	MigrationMeta
} from './contracts'

const JOURNAL_TABLE = '__drizzle_migrations'

function userTables(current: DbShape): string[] {
	return Object.keys(current.tables).filter((t) => t !== JOURNAL_TABLE)
}

/**
 * Classify a structural fingerprint against the expected layout and history.
 */
export function classifyLegacy(
	current: DbShape,
	expected: ExpectedLayout,
	migrations: MigrationMeta[]
): LegacyClassification {
	const tables = userTables(current)

	// A database with no user tables is a fresh install: apply full history.
	if (tables.length === 0) {
		return { kind: 'fresh' }
	}

	const reasons: string[] = []

	// Unknown tables.
	for (const t of tables) {
		if (!expected.tables[t]) reasons.push(`unknown table '${t}'`)
	}
	// Unknown columns.
	for (const [t, cols] of Object.entries(current.tables)) {
		if (t === JOURNAL_TABLE) continue
		const expectedCols = expected.tables[t]
		if (!expectedCols) continue
		for (const c of cols) {
			if (!expectedCols.includes(c)) reasons.push(`unknown column '${t}.${c}'`)
		}
	}
	// Unknown named indexes (auto indexes created by SQLite for PK/UNIQUE are
	// ignored; only drift from the expected named set is reported).
	for (const name of Object.keys(current.indexes)) {
		if (name.startsWith('sqlite_autoindex_')) continue
		if (!expected.namedIndexes[name]) reasons.push(`unknown index '${name}'`)
	}
	// Missing tables (an incomplete/unrecognized layout is not supported).
	for (const t of Object.keys(expected.tables)) {
		if (!current.tables[t]) reasons.push(`missing table '${t}' (incomplete layout)`)
	}

	if (reasons.length > 0) {
		return { kind: 'reject', reasons }
	}

	// Compute missing additive columns and missing additive indexes. A missing
	// column/index that is NOT a supported additive delta is unrecognized drift.
	const addColumns: AddColumnDelta[] = []
	const addIndexes: AddIndexDelta[] = []
	for (const [t, expectedCols] of Object.entries(expected.tables)) {
		const curCols = current.tables[t]
		for (const c of expectedCols) {
			if (curCols.includes(c)) continue
			const def = expected.additiveColumns[t]?.[c]
			if (def) addColumns.push({ table: t, column: c, definition: def })
			else reasons.push(`missing column '${t}.${c}' not covered by a supported additive migration`)
		}
	}
	for (const [name, def] of Object.entries(expected.namedIndexes)) {
		if (current.indexes[name]) continue
		const additiveDef = expected.additiveIndexes[name]
		if (additiveDef) addIndexes.push({ name, definition: additiveDef })
		else reasons.push(`missing base index '${name}'`)
	}

	if (reasons.length > 0) {
		return { kind: 'reject', reasons }
	}

	// Journal reconciliation: which history records are missing?
	const journalToRecord = current.journalPresent
		? migrations.filter((m) => !current.journalCreatedAts.includes(m.when))
		: migrations
	const journalComplete =
		current.journalPresent && journalToRecord.length === 0 && migrations.length > 0

	if (addColumns.length === 0 && addIndexes.length === 0 && journalComplete) {
		return { kind: 'ready', journalComplete: true }
	}

	return { kind: 'adopt', addColumns, addIndexes, journalToRecord }
}