/**
 * Canonical fingerprinted legacy classification (FR-002 / T005, T006, T007).
 *
 * Pure, shared logic that classifies a live backend's structural + semantic
 * fingerprint against a canonical expected layout and the full checked
 * migration history. It decides whether a database is fresh, already at the
 * expected schema (`ready`), a recognized legacy layout that may be adopted
 * (`adopt`), or an unknown/incompatible layout that must be rejected before
 * any mutation.
 *
 * DRIFT-2 remediation: index *definitions* (uniqueness, ordered keys,
 * collation, direction, predicate), column definitions (type/nullability/
 * default/PK position), foreign-key mappings/actions and full journal
 * integrity are compared — not just names. An incompatible definition hidden
 * behind an expected name is rejected.
 *
 * This function performs NO I/O and is fully unit-testable. Dialect-specific
 * inspection of a live database (reading tables/indexes, running data-integrity
 * checks, applying deltas in a transaction) lives in the adapter migrators.
 */
import type {
	AddColumnDelta,
	AddIndexDelta,
	ColumnDescriptor,
	DbShape,
	ExpectedLayout,
	ForeignKeyDescriptor,
	IndexDescriptor,
	LegacyClassification,
	MigrationMeta
} from './contracts'

const JOURNAL_TABLE = '__drizzle_migrations'

function userTables(current: DbShape): string[] {
	return Object.keys(current.tables).filter((t) => t !== JOURNAL_TABLE)
}

/** Collapse insignificant whitespace so harmless formatting stays equivalent. */
function normalizeDefault(d: string | null): string | null {
	if (d == null) return null
	return d.replace(/\s+/g, ' ').trim()
}

function columnSignature(c: ColumnDescriptor): string {
	return JSON.stringify([
		c.name,
		normalizeDefault(c.type),
		c.notNull,
		normalizeDefault(c.default),
		c.pkPosition
	])
}

function indexKeySignature(c: { name: string | null; expression: string | null; collation: string | null; order: string }): string {
	return JSON.stringify([c.name, c.expression, c.collation, c.order])
}

function indexSignature(i: IndexDescriptor): string {
	return JSON.stringify([
		i.name,
		i.table,
		i.unique,
		i.columns.map(indexKeySignature),
		i.predicate
	])
}

function fkSignature(f: ForeignKeyDescriptor): string {
	return JSON.stringify([
		f.child,
		f.parent,
		f.columns.map((c) => `${c.from}->${c.to}`).join(','),
		f.onUpdate,
		f.onDelete
	])
}

/**
 * Validate journal records (hash + timestamp pairs). Duplicate, unknown,
 * future and corrupt (hash-mismatched) rows are rejected. Name-only fixtures
 * that lack hashes still validate the timestamp inventory for duplicates and
 * unknown timestamps.
 */
function validateJournal(
	current: DbShape,
	migrations: MigrationMeta[]
): string[] {
	const reasons: string[] = []
	const byWhen = new Map(migrations.map((m) => [m.when, m]))
	const seen = new Set<number>()
	const records: Array<{ hash: string | null; createdAt: number }> =
		current.journalRecords?.map((r) => ({ hash: r.hash, createdAt: r.createdAt })) ??
		current.journalCreatedAts.map((c) => ({ hash: null, createdAt: c }))

	for (const rec of records) {
		if (seen.has(rec.createdAt)) {
			reasons.push(`duplicate journal record at created_at=${rec.createdAt}`)
		}
		seen.add(rec.createdAt)
		const m = byWhen.get(rec.createdAt)
		if (!m) {
			reasons.push(`unknown journal record at created_at=${rec.createdAt}`)
			continue
		}
		if (rec.hash != null && m.hash !== rec.hash) {
			reasons.push(`corrupt journal record at created_at=${rec.createdAt}: hash mismatch`)
		}
	}
	return reasons
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
	const addColumns: AddColumnDelta[] = []
	const addIndexes: AddIndexDelta[] = []

	// --- Name-level inventory (always checked) ---
	for (const t of tables) {
		if (!expected.tables[t]) reasons.push(`unknown table '${t}'`)
	}
	for (const [t, cols] of Object.entries(current.tables)) {
		if (t === JOURNAL_TABLE) continue
		const expectedCols = expected.tables[t]
		if (!expectedCols) continue
		for (const c of cols) {
			if (!expectedCols.includes(c)) reasons.push(`unknown column '${t}.${c}'`)
		}
	}
	for (const name of Object.keys(current.indexes)) {
		if (name.startsWith('sqlite_autoindex_')) continue
		if (!expected.namedIndexes[name]) reasons.push(`unknown index '${name}'`)
	}
	for (const t of Object.keys(expected.tables)) {
		if (!current.tables[t]) reasons.push(`missing table '${t}' (incomplete layout)`)
	}

	// --- Semantic column comparison (definitions, not names) ---
	if (current.columns && expected.columns) {
		for (const [t, expectedCols] of Object.entries(expected.columns)) {
			const curCols = current.columns[t]
			if (!curCols) continue
			const expByCol = new Map(expectedCols.map((c) => [c.name, c]))
			for (const col of curCols) {
				const exp = expByCol.get(col.name)
				if (!exp) continue // missing-from-expected columns are handled at name level
				if (columnSignature(col) !== columnSignature(exp)) {
					reasons.push(
						`column '${t}.${col.name}' definition differs from expected (type/nullability/default/PK)`
					)
				}
			}
		}
	}

	// --- Semantic index comparison (definition, not name) ---
	if (current.indexDescriptors && expected.indexDescriptors) {
		for (const [name, exp] of Object.entries(expected.indexDescriptors)) {
			const cur = current.indexDescriptors[name]
			if (!cur) continue // missing index handled at name level
			if (indexSignature(cur) !== indexSignature(exp)) {
				reasons.push(
					`index '${name}' definition differs from expected (uniqueness/columns/order/predicate)`
				)
			}
		}
	}

	// --- Foreign-key comparison ---
	if (current.foreignKeys && expected.foreignKeys) {
		const curSig = new Set(current.foreignKeys.map(fkSignature))
		for (const fk of expected.foreignKeys) {
			if (!curSig.has(fkSignature(fk))) {
				reasons.push(
					`foreign key ${fk.child}.(${fk.columns.map((c) => c.from).join(',')}) -> ${fk.parent} differs from expected (mapping/actions)`
				)
			}
		}
	}

	// --- Unsupported CHECK constraints (the checked grammar declares none) ---
	if (current.tableChecks && expected.tableChecks) {
		for (const [t, count] of Object.entries(current.tableChecks)) {
			if (count > 0 && !(expected.tableChecks[t] ?? 0)) {
				reasons.push(`unsupported CHECK constraint on table '${t}'`)
			}
		}
	}

	// --- Journal validation + reconciliation ---
	let journalToRecord: MigrationMeta[] = []
	let journalComplete = false
	if (current.journalPresent) {
		reasons.push(...validateJournal(current, migrations))
		const knownWhen = new Set(current.journalCreatedAts)
		journalToRecord = migrations.filter((m) => !knownWhen.has(m.when))
		journalComplete = journalToRecord.length === 0 && migrations.length > 0
	} else {
		journalToRecord = migrations
	}

	// --- Missing additive columns (recognized deltas) vs drift ---
	for (const [t, expectedCols] of Object.entries(expected.tables)) {
		const curCols = current.tables[t]
		if (!curCols) continue
		for (const c of expectedCols) {
			if (curCols.includes(c)) continue
			const def = expected.additiveColumns[t]?.[c]
			if (def) addColumns.push({ table: t, column: c, definition: def })
			else reasons.push(`missing column '${t}.${c}' not covered by a supported additive migration`)
		}
	}

	// --- Missing base/additive indexes ---
	for (const [name, def] of Object.entries(expected.namedIndexes)) {
		if (current.indexes[name]) continue
		const additiveDef = expected.additiveIndexes[name]
		if (additiveDef) addIndexes.push({ name, definition: additiveDef })
		else reasons.push(`missing base index '${name}'`)
	}

	if (reasons.length > 0) {
		return { kind: 'reject', reasons }
	}

	if (addColumns.length === 0 && addIndexes.length === 0 && journalComplete) {
		return { kind: 'ready', journalComplete: true }
	}

	return { kind: 'adopt', addColumns, addIndexes, journalToRecord }
}