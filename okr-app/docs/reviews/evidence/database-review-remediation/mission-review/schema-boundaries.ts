// Independent post-merge review reproduction only; no production changes.
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../../../../../src/lib/db/config';
import { migrateDatabase } from '../../../../../src/lib/db/migrations/migrate';
import { buildLegacyFixture, SQLITE_FOLDER } from '../../../../../tests/db/migration-fixtures';

async function main() {
  console.log(JSON.stringify({utc:new Date().toISOString(),node:process.version,cwd:process.cwd()}));
  for (const extra of ['UNIQUE(value)', 'FOREIGN KEY(value) REFERENCES users(id)']) {
    const f=buildLegacyFixture('journal-managed');
    const db=new Database(f.path);
    db.pragma('foreign_keys=OFF');
    db.exec('DROP TABLE system_config');
    db.exec('CREATE TABLE system_config (`key` text PRIMARY KEY NOT NULL, `value` text NOT NULL, `is_secret` integer DEFAULT false NOT NULL, `updated_at` integer NOT NULL, '+extra+')');
    console.log(JSON.stringify({case:extra,columns:db.pragma('table_info(system_config)'),indexes:db.pragma('index_list(system_config)'),foreignKeys:db.pragma('foreign_key_list(system_config)')}));
    db.close();
    for (const mode of ['migrate','verify'] as const) {
      try { console.log(JSON.stringify({case:extra,mode,result:await migrateDatabase(loadConfig({DATABASE_PATH:f.path}),{mode,migrationsFolder:SQLITE_FOLDER}),unexpected_acceptance:true})); }
      catch(error) { console.log(JSON.stringify({case:extra,mode,rejected:String(error)})); }
    }
    const raw=new Database(f.path); raw.pragma('foreign_keys=ON');
    try {
      raw.exec("INSERT INTO system_config VALUES ('one','same',0,1)");
      raw.exec("INSERT INTO system_config VALUES ('two','same',0,1)");
      console.log(JSON.stringify({case:extra,write:'both accepted'}));
    } catch(error) { console.log(JSON.stringify({case:extra,normal_write_rejected:String(error)})); }
    raw.close(); f.cleanup();
  }
  const dir=mkdtempSync(join(tmpdir(),'review-journal-only-'));
  const path=join(dir,'db.sqlite');
  const db=new Database(path);
  db.exec('CREATE TABLE __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)');
  db.exec("INSERT INTO __drizzle_migrations (hash,created_at) VALUES ('unknown-corrupt-row',123)");
  const before=db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all(); db.close();
  try { console.log(JSON.stringify({case:'journal-only unknown record',before,result:await migrateDatabase(loadConfig({DATABASE_PATH:path}),{migrationsFolder:SQLITE_FOLDER}),unexpected_acceptance:true})); }
  catch(error) { console.log(JSON.stringify({case:'journal-only unknown record',rejected:String(error)})); }
  const after=new Database(path,{readonly:true});
  console.log(JSON.stringify({case:'journal-only unknown record',afterTables:after.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all(),afterJournal:after.prepare('SELECT hash,created_at FROM __drizzle_migrations ORDER BY created_at').all()})); after.close();
}
main().catch(error=>{ console.error(error); process.exitCode=1; });
