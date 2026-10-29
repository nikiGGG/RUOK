/**
 * Canonical expected SQLite layout (FR-004 / FR-010 / T010).
 *
 * Derives the expected final SQLite surface (25 tables and their physical
 * columns) from the live dialect schema (`schema/sqlite.ts`) so the expected
 * layout cannot silently drift from the application's real surface. It also
 * declares the *additive* deltas — columns and indexes introduced after the
 * 0000 baseline — which are the only changes fingerprinted legacy adoption is
 * allowed to apply. Any missing base table/column/index is unrecognized
 * drift and must be rejected, never auto-repaired.
 *
 * Historical migrations (`okr-app/drizzle/0000..0006*.sql`) are a frozen
 * surface; this module only describes what adoption may safely add.
 */
import { getTableName, type Table } from 'drizzle-orm'
import * as schema from '../schema/sqlite'

// ---------------------------------------------------------------------------
// Derive expected physical columns per table from the dialect schema.
// ---------------------------------------------------------------------------
type ColumnRef = { name: string; dataType?: string }
type TableShape = Record<string, ColumnRef>

function isColumn(v: unknown): v is ColumnRef {
	return v !== null && typeof v === 'object' && typeof (v as ColumnRef).name === 'string'
}

function collectTables(mod: Record<string, unknown>): Record<string, TableShape> {
	const out: Record<string, TableShape> = {}
	for (const [, value] of Object.entries(mod)) {
		if (typeof value !== 'object' || value === null) continue
		const physicalName = getTableName(value as Table)
		if (typeof physicalName !== 'string') continue
		const cols: TableShape = {}
		for (const [colKey, col] of Object.entries(value as Record<string, unknown>)) {
			if (isColumn(col)) cols[colKey] = col
		}
		if (Object.keys(cols).length > 0) out[physicalName] = cols
	}
	return out
}

const tablesShape = collectTables(schema as unknown as Record<string, unknown>)

const EXPECTED_TABLES: Record<string, string[]> = {}
for (const [tableKey, cols] of Object.entries(tablesShape)) {
	EXPECTED_TABLES[tableKey] = Object.values(cols)
		.map((c) => c.name)
		.sort()
}

// ---------------------------------------------------------------------------
// Additive deltas (post-0000). These are the ONLY allowed adoption changes.
// ---------------------------------------------------------------------------

/**
 * Additive columns introduced by migrations 0001/0003/0004/0005/0006.
 * Definition strings are SQLite `ALTER TABLE ... ADD COLUMN` clauses.
 */
const ADDITIVE_COLUMNS: Record<string, Record<string, string>> = {
	users: {
		week_start_day: "text DEFAULT 'monday' NOT NULL",
		timezone: "text DEFAULT 'UTC' NOT NULL",
		bg_color: 'text',
		is_admin: 'integer DEFAULT false NOT NULL',
		is_disabled: 'integer DEFAULT false NOT NULL'
	},
	tasks: {
		time_spent_ms: 'integer DEFAULT 0 NOT NULL',
		timer_started_at: 'integer'
	},
	objectives: {
		color_index: 'integer'
	},
	key_results: {
		score_label: 'text'
	},
	user_ai_config: {
		max_agent_rounds: 'integer DEFAULT 20 NOT NULL'
	}
}

/**
 * All expected named indexes. Base index created by 0000 must exist for
 * adoption; additive indexes may be created during adoption.
 */
const EXPECTED_NAMED_INDEXES: Record<string, string> = {
	users_username_unique: 'CREATE UNIQUE INDEX users_username_unique ON users (username)',
	objective_reflections_unique:
		'CREATE UNIQUE INDEX objective_reflections_unique ON objective_reflections (user_id, level, year, month)',
	user_ai_config_user_id_unique:
		'CREATE UNIQUE INDEX user_ai_config_user_id_unique ON user_ai_config (user_id)'
}

/** Indexes that adoption may create (added after the 0000 baseline). */
const ADDITIVE_INDEXES: Record<string, string> = {
	objective_reflections_unique:
		'CREATE UNIQUE INDEX objective_reflections_unique ON objective_reflections (user_id, level, year, month)',
	user_ai_config_user_id_unique:
		'CREATE UNIQUE INDEX user_ai_config_user_id_unique ON user_ai_config (user_id)'
}

/**
 * The canonical expected layout fingerprint used by legacy adoption.
 */
export function getExpectedSqliteLayout() {
	return {
		tables: EXPECTED_TABLES,
		namedIndexes: EXPECTED_NAMED_INDEXES,
		additiveColumns: ADDITIVE_COLUMNS,
		additiveIndexes: ADDITIVE_INDEXES
	}
}