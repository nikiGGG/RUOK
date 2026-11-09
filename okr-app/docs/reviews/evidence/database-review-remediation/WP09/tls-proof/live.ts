/** Supplemental WP09 TLS proof. Imports production implementations verbatim. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client, Pool } from 'pg';
import { loadConfig, buildPostgresPoolConfig } from '../../../../../../src/lib/db/config';
import { createPostgresMigrationClient } from '../../../../../../src/lib/db/migrations/postgres-migrator';

const certRoot = '/private-tls';
const password = process.env.POSTGRES_PASSWORD;
assert.ok(password, 'private fixture password required');
const url = (host: string) => `postgres://postgres:${encodeURIComponent(password)}@${host}:5432/postgres?sslmode=require&application_name=wp09_tls_proof`;
function config(host: string, ca = 'ca.crt') {
  const value = loadConfig({
    DATABASE_TYPE: 'postgres', DATABASE_URL: url(host),
    DATABASE_SSL_MODE: 'verify-full', DATABASE_SSL_CA_FILE: `${certRoot}/${ca}`,
    DATABASE_CONNECT_TIMEOUT_MS: '3000', DATABASE_STATEMENT_TIMEOUT_MS: '3000'
  });
  assert.equal(value.type, 'postgres');
  if (value.type !== 'postgres') throw new Error('wrong backend');
  return value;
}
function effective(settings: object) {
  return (new Client(settings) as unknown as {connectionParameters: {ssl: unknown}}).connectionParameters.ssl;
}
const caBody = readFileSync(`${certRoot}/ca.crt`, 'utf8');
const rawNoVerify = effective({connectionString: url('tls-match').replace('sslmode=require', 'sslmode=no-verify'), ssl: {rejectUnauthorized: true, ca: caBody}});
assert.deepEqual(rawNoVerify, {rejectUnauthorized: false});
console.log('BASELINE raw pg parser: sslmode=no-verify overrides explicit verification; reproduced');
const rawRequire = effective({connectionString: url('tls-match'), ssl: {rejectUnauthorized: true, ca: caBody}});
assert.deepEqual(rawRequire, {});
console.log('BASELINE raw pg parser: sslmode=require discards explicit CA; reproduced');
const fixed = buildPostgresPoolConfig(config('tls-match'));
assert.deepEqual(effective(fixed), {rejectUnauthorized: true, ca: caBody});
assert.equal(new URL(fixed.connectionString!).searchParams.has('sslmode'), false);
assert.equal(new URL(fixed.connectionString!).searchParams.get('application_name'), 'wp09_tls_proof');
console.log('FIXED effective pg parser: verification and CA retained; TLS URL hint consumed, unrelated parameter retained');
assert.throws(() => loadConfig({DATABASE_TYPE:'postgres', DATABASE_URL: url('tls-match').replace('sslmode=require', 'sslmode=no-verify')}), /Unsupported TLS sslmode/);
console.log('FIXED downgrade URL: rejected before connect');

async function connect(path: 'runtime-pool'|'migration-client', host: string, ca: string) {
  const cfg = config(host, ca);
  const connection = path === 'runtime-pool' ? new Pool(buildPostgresPoolConfig(cfg)) : createPostgresMigrationClient(cfg);
  try {
    if (connection instanceof Client) await connection.connect();
    const result = await connection.query('SELECT 1 AS one, (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()) AS tls, version() AS server_version');
    assert.equal(result.rows[0].one, 1);
    assert.equal(result.rows[0].tls, true, 'server confirms TLS; plaintext fallback forbidden');
    return result.rows[0].server_version as string;
  } finally { await connection.end().catch(() => undefined); }
}
async function expectedRejection(path: 'runtime-pool'|'migration-client', host: string, ca: string, expected: RegExp, label: string) {
  const start = Date.now();
  try { await connect(path, host, ca); }
  catch (error) {
    const e = error as Error & {code?: string};
    assert.match(`${e.code ?? ''} ${e.message}`, expected, 'must reject for intended certificate identity reason');
    // Only controlled allow-listed error code; never serialize configuration or URLs.
    console.log(`PASS ${path} ${label}: certificate rejection code=${e.code ?? 'certificate-error'} elapsed_ms=${Date.now()-start}`);
    return;
  }
  throw new Error(`${path} ${label}: unexpectedly connected`);
}
async function main() {
  for (const path of ['runtime-pool','migration-client'] as const) {
    const server = await connect(path, 'tls-match', 'ca.crt');
    console.log(`PASS ${path} trusted matching CA/hostname: SELECT1=1 server_TLS=true server=${server}`);
    await expectedRejection(path, 'tls-match', 'foreign-ca.crt', /certificate|self.signed|authorized|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER/i, 'untrusted CA');
    await expectedRejection(path, 'tls-wrong', 'ca.crt', /ERR_TLS_CERT_ALTNAME_INVALID|hostname|altnames/i, 'hostname mismatch');
  }
  console.log('SUMMARY: baseline parser reproduced; fixed parser policy passed; all6 live TLS cases passed with no plaintext fallback');
}
main().catch(() => { console.error('FAIL live TLS proof; no config/credential output emitted'); process.exitCode=1; });
