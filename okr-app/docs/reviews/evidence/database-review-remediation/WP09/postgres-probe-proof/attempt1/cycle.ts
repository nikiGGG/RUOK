/** Real built HTTP PostgreSQL lifecycle proof; no product implementation substituted. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import { Client } from 'pg';
import { startServer, CookieJar, type RunningServer } from '../../../../../../tests/application/http-fixture';

const requireHere = createRequire(__filename);
const childProcess = requireHere('node:child_process') as typeof import('node:child_process');
const originalSpawn = childProcess.spawn;
let appChild: import('node:child_process').ChildProcess | undefined;
let privateChildOutput = '';
// Observation only: the imported real fixture still starts/owns the built process.
(childProcess as any).spawn = (...args: any[]) => {
  const child = (originalSpawn as any)(...args);
  if (args[0] === process.execPath && Array.isArray(args[1]) && args[1][0] === 'build') {
    assert.equal(appChild, undefined, 'exactly one real built application process');
    appChild = child;
    child.stdout?.on('data', (chunk: Buffer) => { privateChildOutput += chunk.toString(); });
    child.stderr?.on('data', (chunk: Buffer) => { privateChildOutput += chunk.toString(); });
  }
  return child;
};
const originalFetch = globalThis.fetch;
// Include the original fixture's listening probe in the strict request-abort policy.
globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}) => {
  const deadline = AbortSignal.timeout(5000);
  const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  return originalFetch(input, {...init, signal});
}) as typeof fetch;

const started = performance.now();
let server: RunningServer | undefined;
let initialPid = -1;
const trace = (phase: string, data: Record<string, unknown> = {}) => console.log(JSON.stringify({
  utc: new Date().toISOString(), elapsed_ms: +(performance.now()-started).toFixed(1),
  phase, pid: server?.pid ?? null, ...data
}));
function alive() {
  assert.ok(server && appChild, 'real built process captured');
  assert.equal(server.pid, initialPid, 'same fixture PID');
  assert.equal(appChild.pid, initialPid, 'same child PID');
  assert.equal(appChild.exitCode, null, 'child has not exited');
  assert.equal(appChild.signalCode, null, 'child not killed');
  process.kill(initialPid, 0);
}
async function http(path: string, phase: string, init: RequestInit = {}, jar?: CookieJar) {
  assert.ok(server);
  alive();
  const start = performance.now();
  const response = await server.request(path, {...init, signal: AbortSignal.timeout(5000)}, jar);
  const body = await response.json();
  const ms = performance.now()-start;
  assert.ok(ms < 5000, `${phase} ${path}: response including body below5000ms`);
  trace(phase, {path, status: response.status, request_ms: +ms.toFixed(1),
    ...(path==='/api/health'?{uptime: body.uptime}:{}),
    ...(path==='/api/ready'?{ready:body.ready}: {})});
  return {status:response.status, body};
}
const sleep = (ms:number) => new Promise(resolve => setTimeout(resolve,ms));
async function readiness(expected: number, bound: number, phase: string) {
  const begin = performance.now();
  let sample = 0;
  while (performance.now()-begin < bound) {
    const result = await http('/api/ready', `${phase} sample${++sample}`);
    if (result.status===expected) {
      assert.equal(result.body.ready, expected===200);
      const elapsed = performance.now()-begin;
      assert.ok(elapsed < bound, `${phase} whole phase below${bound}ms`);
      trace(`${phase} complete`, {phase_ms:+elapsed.toFixed(1), bound_ms:bound, samples:sample});
      return;
    }
    assert.ok(result.status===200 || result.status===503, 'only meaningful readiness states');
    await sleep(1000);
  }
  throw new Error(`${phase}: readiness did not reach${expected} within${bound}ms`);
}

async function main() {
  const adminUrl = process.env.RUOK_TEST_PG_ADMIN_URL ?? process.env.DATABASE_URL;
  assert.ok(adminUrl, 'private PostgreSQL admin URL required');
  const normalizedAdminUrl = new URL(adminUrl); normalizedAdminUrl.pathname='/postgres';
  const name = `ruok_probe_${randomBytes(8).toString('hex')}`;
  assert.match(name, /^[a-z0-9_]+$/);
  const appUrl = new URL(normalizedAdminUrl); appUrl.pathname=`/${name}`;
  const admin = new Client({connectionString:normalizedAdminUrl.toString(), connectionTimeoutMillis:3000, statement_timeout:3000});
  let created = false;
  await admin.connect();
  try {
    const absent = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name]);
    assert.equal(absent.rowCount,0,'startup points to a real nonexistent database');
    trace('fixture confirmed database absent',{database:name});
    server = await startServer({backend:'postgres', requireReady:false, env:{
      DATABASE_URL:appUrl.toString(), DATABASE_SSL_MODE:'disable', MIGRATION_MODE:'verify',
      DATABASE_CONNECT_TIMEOUT_MS:'1500', DATABASE_STATEMENT_TIMEOUT_MS:'2000', DATABASE_POOL_MAX:'2',
      ADMIN_USERNAME:'admin'
    }});
    initialPid=server.pid;
    alive();
    trace('built process listening',{mode:'verify', child_exit_code:appChild!.exitCode});
    const h1=await http('/api/health','startup-unavailable');
    assert.equal(h1.status,200); assert.equal(h1.body.status,'ok');
    const r1=await http('/api/ready','startup-unavailable');
    assert.equal(r1.status,503); assert.equal(r1.body.ready,false);
    await admin.query(`CREATE DATABASE "${name}"`); created=true;
    trace('startup recovery database created');
    const migrationStart=performance.now();
    const migration=childProcess.spawnSync(process.execPath,['/app/build/db-migrate.mjs'],{
      cwd:'/workspace/okr-app', env:{...process.env,DATABASE_TYPE:'postgres',DATABASE_URL:appUrl.toString(),DATABASE_SSL_MODE:'disable',MIGRATION_MODE:'migrate'},
      encoding:'utf8',timeout:20000
    });
    assert.equal(migration.status,0,'actual built migration CLI must succeed');
    assert.equal(migration.signal,null,'migration CLI must not time out');
    assert.match(migration.stdout,/OK classification=ready/);
    trace('startup recovery schema available',{migration_cli_exit:migration.status,migration_ms:+(performance.now()-migrationStart).toFixed(1)});
    await readiness(200,30000,'first recovery');
    const h2=await http('/api/health','first recovery');
    assert.equal(h2.status,200); assert.ok(h2.body.uptime>h1.body.uptime);
    const jar=new CookieJar();
    const username=`probe_${randomBytes(8).toString('hex')}`;
    const password=randomBytes(24).toString('hex');
    const register=await http('/api/auth/register','authenticated registration',{method:'POST',body:JSON.stringify({username,password})},jar);
    assert.equal(register.status,200);
    const title=`PostgreSQL probe persistence ${randomBytes(8).toString('hex')}`;
    const made=await http('/api/objectives','objective create',{method:'POST',body:JSON.stringify({title,level:'yearly',year:2026})},jar);
    assert.equal(made.status,201);
    const id=made.body.objective?.id ?? made.body.id;
    assert.equal(typeof id,'string'); assert.ok(id.length>0);
    const before=await http('/api/objectives','exact pre-outage read',{},jar);
    assert.equal(before.status,200);
    assert.ok(before.body.objectives.some((o:any)=>o.id===id&&o.title===title),'exact pre-outage ID/title');
    trace('exact objective verified before outage',{id,title});
    const idle=await admin.query('SELECT pid,state FROM pg_stat_activity WHERE datname=$1',[name]);
    assert.ok(idle.rows.some(row=>row.state==='idle'),'at least one actual idle app backend before termination');
    trace('fault prerequisite',{app_backends:idle.rowCount,idle_backends:idle.rows.filter(row=>row.state==='idle').length});
    const faultStart=performance.now();
    await admin.query(`ALTER DATABASE "${name}" ALLOW_CONNECTIONS false`);
    const killed=await admin.query('SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE datname=$1',[name]);
    assert.ok(killed.rowCount!>=1 && killed.rows.every(row=>row.terminated===true),'actual app backends terminated');
    trace('later outage injected',{terminated_backends:killed.rowCount});
    await readiness(503,10000,'later outage detection');
    assert.ok(performance.now()-faultStart <10000,'whole outage injection+detection below10000ms');
    const h3=await http('/api/health','later outage');
    assert.equal(h3.status,200); assert.ok(h3.body.uptime>h2.body.uptime);
    const idleErrors=(privateChildOutput.match(/\[postgres\] idle pool error:/g)??[]).length;
    assert.ok(idleErrors>=1,'actual production idle-pool error handler observed');
    trace('actual idle pool error handled',{idle_pool_error_markers:idleErrors,child_exit_code:appChild!.exitCode});
    await admin.query(`ALTER DATABASE "${name}" ALLOW_CONNECTIONS true`);
    trace('later recovery storage available');
    await readiness(200,30000,'second recovery');
    const h4=await http('/api/health','second recovery');
    assert.equal(h4.status,200); assert.ok(h4.body.uptime>h3.body.uptime);
    const after=await http('/api/objectives','exact post-recovery read',{},jar);
    assert.equal(after.status,200);
    assert.ok(after.body.objectives.some((o:any)=>o.id===id&&o.title===title),'exact original ID/title retained after second recovery');
    alive();
    trace('PASS complete PostgreSQL HTTP cycle',{id,title,mode:'verify',same_pid:initialPid,child_exit_code:appChild!.exitCode,uptime_increased:true});
  } finally {
    const cleanupFailures:string[]=[];
    await server?.stop().catch(()=>cleanupFailures.push('built server stop'));
    if(created) {
      await admin.query(`ALTER DATABASE "${name}" ALLOW_CONNECTIONS true`).catch(()=>cleanupFailures.push('restore disposable database connections'));
      await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1',[name]).catch(()=>cleanupFailures.push('terminate disposable database sessions'));
      await admin.query(`DROP DATABASE "${name}"`).catch(()=>cleanupFailures.push('drop disposable database'));
    }
    const remaining=await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name]).catch(()=>{cleanupFailures.push('verify disposable database absent');return undefined;});
    if(remaining?.rowCount!==0) cleanupFailures.push('disposable database remains');
    await admin.end().catch(()=>cleanupFailures.push('admin connection close'));
    trace('cleanup complete',{database:name,created,cleanup_failures:cleanupFailures});
    globalThis.fetch=originalFetch;
    (childProcess as any).spawn=originalSpawn;
    assert.equal(cleanupFailures.length,0,'complete cleanup required');
  }
}
main().catch(error=>{console.error(`FAIL PostgreSQL HTTP cycle: ${error instanceof Error?error.message:'unexpected failure'}`);process.exitCode=1;});
