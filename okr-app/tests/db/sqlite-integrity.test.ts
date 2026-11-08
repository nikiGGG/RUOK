/**
 * SQLite semantic-integrity regressions (DRIFT-2 / FR-002 / T005, T007, T009).
 *
 * Real SQLite tamper matrix exercised through the production `migrateDatabase`
 * path. A definition hidden behind an expected name (nonunique wrong-column
 * index, altered type/nullability/default/PK, altered FK mapping/actions, an
 * unsupported CHECK constraint) and corrupt/unknown/duplicate journal records
 * are all REJECTED with catalog/data/journal left unchanged. Supported layouts
 * (fresh, journal-managed, db:push, missing additive column, incomplete
 * journal) remain adoptable, and harmless formatting differences stay
 * equivalent.
 */
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import { loadConfig, migrateDatabase } from '../../src/lib/db'
import { readMigrationFolder } from '../../src/lib/db/migrations'
import { buildLegacyFixture, SQLITE_FOLDER, type Fixture } from './migration-fixtures'

const cleanups: Array<() => void> = []
const { migrations } = readMigrationFolder(SQLITE_FOLDER)

function migrated(): Fixture {
	const f = buildLegacyFixture('journal-managed')
	cleanups.push(f.cleanup)
	return f
}

function writable(path: string): Database.Database {
	const db = new Database(path)
	// Fixtures build with FK enforcement off so controlled rebuilds are possible.
	db.pragma('foreign_keys = OFF')
	return db
}

function journalRows(path: string): Array<{ hash: string; created_at: number }> {
	const raw = new Database(path, { readonly: true })
	try {
		return raw
			.prepare('SELECT hash, created_at FROM __drizzle_migrations ORDER BY created_at')
			.all() as Array<{ hash: string; created_at: number }>
	} finally {
		raw.close()
	}
}

function indexUnique(path: string, name: string): boolean {
	const raw = new Database(path, { readonly: true })
	try {
		const list = raw.pragma(`index_list(\`users\`)`) as unknown as Array<{
			name: string
			unique: number
		}>
		const info = list.find((i) => i.name === name)
		if (!info) throw new Error(`index ${name} not found`)
		return !!info.unique
	} finally {
		raw.close()
	}
}

afterEach(() => {
	for (const c of cleanups.splice(0)) c()
})

describe('supported layouts remain adoptable (T005)', () => {
	it('keeps a journal-managed migrated database ready', async () => {
		const f = migrated()
		const config = loadConfig({ DATABASE_PATH: f.path })
		const result = await migrateDatabase(config, { migrationsFolder: SQLITE_FOLDER })
		expect(result.classification).toBe('ready')
		expect(result.recorded).toBe(0)
	})

	it('adopts a db:push schema by recording the history only', async () => {
		const f = buildLegacyFixture('db-push')
		cleanups.push(f.cleanup)
		const config = loadConfig({ DATABASE_PATH: f.path })
		const result = await migrateDatabase(config, { migrationsFolder: SQLITE_FOLDER })
		expect(result.classification).toBe('adopt')
		expect(result.recorded).toBe(7)
	})

	it('adopts a db:push schema missing an additive column', async () => {
		const f = buildLegacyFixture('db-push-missing-additive')
		cleanups.push(f.cleanup)
		const config = loadConfig({ DATABASE_PATH: f.path })
		const result = await migrateDatabase(config, { migrationsFolder: SQLITE_FOLDER })
		expect(result.classification).toBe('adopt')
		expect(result.recorded).toBe(7)
	})

	it('adopts an incomplete journal by recording the missing facts', async () => {
		const f = buildLegacyFixture('incomplete-journal')
		cleanups.push(f.cleanup)
		const config = loadConfig({ DATABASE_PATH: f.path })
		const result = await migrateDatabase(config, { migrationsFolder: SQLITE_FOLDER })
		expect(result.classification).toBe('adopt')
		expect(result.recorded).toBe(3)
	})

	it('treats harmless index formatting as equivalent (still ready)', async () => {
		const f = migrated()
		const db = writable(f.path)
		try {
			db.exec('DROP INDEX users_username_unique')
			// Harmless whitespace/quoting/case differences only.
			db.exec('CREATE UNIQUE INDEX  users_username_unique  ON  users ( USERNAME )')
		} finally {
			db.close()
		}
		const config = loadConfig({ DATABASE_PATH: f.path })
		const result = await migrateDatabase(config, { migrationsFolder: SQLITE_FOLDER })
		expect(result.classification).toBe('ready')
	})
})

describe('incompatible index definitions are rejected (DRIFT-2 / T009)', () => {
	it('rejects an expected-name unique index replaced by a nonunique wrong-column index, unchanged', async () => {
		const f = migrated()
		const beforeJournal = journalRows(f.path)
		const db = writable(f.path)
		try {
			db.exec('DROP INDEX users_username_unique')
			db.exec('CREATE INDEX users_username_unique ON users (id)') // nonunique, wrong column
		} finally {
			db.close()
		}

		const config = loadConfig({ DATABASE_PATH: f.path })
		await expect(
			migrateDatabase(config, { migrationsFolder: SQLITE_FOLDER })
		).rejects.toThrow(/index 'users_username_unique' definition differs/)

		// No mutation: the tampered index is still present and still nonunique,
		// and the journal is untouched.
		expect(indexUnique(f.path, 'users_username_unique')).toBe(false)
		expect(journalRows(f.path)).toEqual(beforeJournal)
	})
})

describe('altered column/constraint definitions are rejected (T009)', () => {
	async function assertRejectsTamper(name: string, tamper: (db: Database.Database) => void, reason: RegExp): Promise<void> {
		const f = migrated()
		const beforeJournal = journalRows(f.path)
		const db = writable(f.path)
		try {
			tamper(db)
		} finally {
			db.close()
		}
		const config = loadConfig({ DATABASE_PATH: f.path })
		await expect(
			migrateDatabase(config, { migrationsFolder: SQLITE_FOLDER })
		).rejects.toThrow(reason)
		// No journal mutation on rejection.
		expect(journalRows(f.path)).toEqual(beforeJournal)
	}

	it('rejects an altered column type', async () => {
		await assertRejectsTamper(
			'type',
			(db) => {
				db.exec('DROP TABLE system_config')
				db.exec(
					'CREATE TABLE system_config (`key` text PRIMARY KEY NOT NULL, `value` blob NOT NULL, `is_secret` integer DEFAULT false NOT NULL, `updated_at` integer NOT NULL)'
				)
			},
			/column 'system_config.value' definition differs/
		)
	})

	it('rejects an altered column nullability', async () => {
		await assertRejectsTamper(
			'nullability',
			(db) => {
				db.exec('DROP TABLE system_config')
				db.exec(
					'CREATE TABLE system_config (`key` text PRIMARY KEY NOT NULL, `value` text, `is_secret` integer DEFAULT false NOT NULL, `updated_at` integer NOT NULL)'
				)
			},
			/column 'system_config.value' definition differs/
		)
	})

	it('rejects an altered column default', async () => {
		await assertRejectsTamper(
			'default',
			(db) => {
				db.exec('DROP TABLE system_config')
				db.exec(
					'CREATE TABLE system_config (`key` text PRIMARY KEY NOT NULL, `value` text NOT NULL, `is_secret` integer DEFAULT true NOT NULL, `updated_at` integer NOT NULL)'
				)
			},
			/column 'system_config.is_secret' definition differs/
		)
	})

	it('rejects an altered primary key', async () => {
		await assertRejectsTamper(
			'pk',
			(db) => {
				db.exec('DROP TABLE system_config')
				db.exec(
					'CREATE TABLE system_config (`key` text NOT NULL, `value` text NOT NULL, `is_secret` integer DEFAULT false NOT NULL, `updated_at` integer NOT NULL)'
				)
			},
			/column 'system_config.key' definition differs/
		)
	})

	it('rejects an altered foreign-key action', async () => {
		await assertRejectsTamper(
			'fk-action',
			(db) => {
				db.exec('DROP TABLE sessions')
				db.exec(
					"CREATE TABLE sessions (`id` text PRIMARY KEY NOT NULL, `user_id` text NOT NULL, `expires_at` integer NOT NULL, FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null)"
				)
			},
			/foreign key sessions.*differs from expected/
		)
	})

	it('rejects an unsupported CHECK constraint', async () => {
		await assertRejectsTamper(
			'check',
			(db) => {
				db.exec('DROP TABLE system_config')
				db.exec(
					'CREATE TABLE system_config (`key` text PRIMARY KEY NOT NULL, `value` text NOT NULL, `is_secret` integer DEFAULT false NOT NULL, `updated_at` integer NOT NULL, CHECK (length(`key`) > 0))'
				)
			},
			/unsupported CHECK constraint on table 'system_config'/
		)
	})
})

describe('journal integrity is validated (T007)', () => {
	async function assertRejectsJournal(name: string, tamper: (db: Database.Database) => void, reason: RegExp): Promise<void> {
		const f = migrated()
		const db = writable(f.path)
		try {
			tamper(db)
		} finally {
			db.close()
		}
		// The tamper itself mutates the journal (update/insert), so the no-mutation
		// assertion must compare the state the DB is in when migration runs (after
		// the tamper) with the state after the rejected migrate — not the pre-tamper
		// state, which would already differ by the injected fault.
		const afterTamper = journalRows(f.path)
		const config = loadConfig({ DATABASE_PATH: f.path })
		await expect(
			migrateDatabase(config, { migrationsFolder: SQLITE_FOLDER })
		).rejects.toThrow(reason)
		// The corrupt journal is never rewritten on rejection.
		expect(journalRows(f.path)).toEqual(afterTamper)
	}

	it('rejects a corrupt (hash-mismatched) journal record', async () => {
		await assertRejectsJournal(
			'corrupt',
			(db) => {
				db.prepare('UPDATE __drizzle_migrations SET hash = ? WHERE created_at = ?').run(
					'0'.repeat(64),
					migrations[0].when
				)
			},
			/corrupt journal record/
		)
	})

	it('rejects a duplicate journal record', async () => {
		await assertRejectsJournal(
			'duplicate',
			(db) => {
				db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(
					migrations[0].hash,
					migrations[0].when
				)
			},
			/duplicate journal record/
		)
	})

	it('rejects an unknown/future journal record', async () => {
		await assertRejectsJournal(
			'unknown',
			(db) => {
				db.prepare('INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)').run(
					'f'.repeat(64),
					9999999999999
				)
			},
			/unknown journal record/
		)
	})
})