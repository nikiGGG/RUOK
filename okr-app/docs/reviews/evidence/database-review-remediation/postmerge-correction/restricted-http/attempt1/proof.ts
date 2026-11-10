/** Independent MR-1 built-image HTTP verification with enforced no-DDL role. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { Client } from 'pg';

const trace=(phase:string, data:Record<string,unknown>={})=>console.log(JSON.stringify({utc:new Date().toISOString(),phase,...data}));
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const quote=(id:string)=>'"'+id.replaceAll('"','""')+'"';
const suffix=randomBytes(8).toString('hex');
const database='ruok_review_http_'+suffix, role='ruok_review_role_'+suffix;
let child:ChildProcess|undefined, admin:Client|undefined, owner:Client|undefined;
let createdDatabase=false, createdRole=false;
let privateOutput='';
async function inventory(db:Client) {
  return {
    objects:(await db.query(`SELECT n.nspname,c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','drizzle') ORDER BY 1,2,3`)).rows,
    columns:(await db.query(`SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema IN ('public','drizzle') ORDER BY 1,2,ordinal_position`)).rows,
    journal:(await db.query('SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at')).rows
  };
}
async function main() {
  const raw=process.env.RUOK_TEST_PG_ADMIN_URL;
  assert.ok(raw,'private admin URL required');
  assert.ok(process.env.REVIEW_IMAGE_ID,'immutable corrected image identity required');
  const administrative=new URL(raw); administrative.pathname='/postgres';
  admin=new Client({connectionString:administrative.toString(),connectionTimeoutMillis:3000,statement_timeout:5000});
  await admin.connect();
  assert.equal((await admin.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0].rolsuper,true,'disposable DB event trigger requires superuser fixture');
  await admin.query('CREATE DATABASE '+quote(database)); createdDatabase=true;
  // Random fixture password remains private; no SQL statement/DSN is logged.
  const password=randomBytes(32).toString('hex');
  await admin.query('CREATE ROLE '+quote(role)+" LOGIN PASSWORD '"+password+"'"); createdRole=true;
  const ownerUrl=new URL(administrative); ownerUrl.pathname='/'+database;
  const migrate=spawnSync(process.execPath,['/app/build/db-migrate.mjs'],{cwd:'/app',env:{...process.env,DATABASE_TYPE:'postgres',DATABASE_URL:ownerUrl.toString(),DATABASE_SSL_MODE:'disable',MIGRATION_MODE:'migrate'},encoding:'utf8',timeout:20000});
  assert.equal(migrate.status,0,'immutable-image migration CLI must succeed');
  assert.equal(migrate.signal,null);
  assert.match(migrate.stdout,/OK classification=ready/);
  owner=new Client({connectionString:ownerUrl.toString(),connectionTimeoutMillis:3000,statement_timeout:5000}); await owner.connect();
  await owner.query('REVOKE ALL ON DATABASE '+quote(database)+' FROM PUBLIC');
  await owner.query('GRANT CONNECT ON DATABASE '+quote(database)+' TO '+quote(role));
  for(const schema of ['public','drizzle']) {
    await owner.query('REVOKE ALL ON SCHEMA '+quote(schema)+' FROM PUBLIC');
    await owner.query('GRANT USAGE ON SCHEMA '+quote(schema)+' TO '+quote(role));
  }
  await owner.query('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO '+quote(role));
  await owner.query('GRANT SELECT ON drizzle.__drizzle_migrations TO '+quote(role));
  await owner.query('GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO '+quote(role));
  await owner.query('GRANT USAGE ON ALL SEQUENCES IN SCHEMA drizzle TO '+quote(role));
  await owner.query(`CREATE FUNCTION public.review_forbid_runtime_ddl() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN IF current_user = '${role}' THEN RAISE EXCEPTION 'review_forbidden_runtime_ddl'; END IF; END $$`);
  await owner.query('CREATE EVENT TRIGGER review_runtime_ddl_guard ON ddl_command_start EXECUTE FUNCTION public.review_forbid_runtime_ddl()');
  const runtimeUrl=new URL(ownerUrl); runtimeUrl.username=role; runtimeUrl.password=password;
  const runtime=new Client({connectionString:runtimeUrl.toString(),connectionTimeoutMillis:3000,statement_timeout:5000}); await runtime.connect();
  try {
    const privileges=(await runtime.query(`SELECT has_database_privilege(current_user,current_database(),'CREATE') AS db_create,has_schema_privilege(current_user,'public','CREATE') AS public_create,has_schema_privilege(current_user,'drizzle','CREATE') AS journal_create`)).rows[0];
    assert.deepEqual(privileges,{db_create:false,public_create:false,journal_create:false});
    assert.equal(Number((await owner.query('SELECT count(*) AS n FROM pg_class WHERE relowner=(SELECT oid FROM pg_roles WHERE rolname=$1)',[role])).rows[0].n),0);
    // Negative control: a command that would otherwise be a harmless no-op must
    // trip the guard, proving migration's CREATE IF NOT EXISTS is detectable.
    await assert.rejects(runtime.query('CREATE SCHEMA IF NOT EXISTS drizzle'),/review_forbidden_runtime_ddl/);
    trace('restricted role and active DDL guard verified',{...privileges,owned_objects:0,negative_control:'CREATE SCHEMA IF NOT EXISTS rejected by event trigger'});
    await runtime.query("INSERT INTO system_config(key,value,is_secret,updated_at) VALUES ('review_dml','retained',false,now())");
    assert.equal((await runtime.query("SELECT value FROM system_config WHERE key='review_dml'")).rows[0].value,'retained');
    trace('data-only role DML verified');
  } finally { await runtime.end(); }
  const before=await inventory(owner);
  const socket=createServer(); await new Promise<void>(resolve=>socket.listen(0,'127.0.0.1',resolve));
  const address=socket.address(); assert.ok(address && typeof address!=='string'); const port=address.port;
  await new Promise<void>(resolve=>socket.close(()=>resolve()));
  child=spawn(process.execPath,['/app/build/index.js'],{cwd:'/app',env:{...process.env,NODE_ENV:'production',HOST:'127.0.0.1',PORT:String(port),DATABASE_TYPE:'postgres',DATABASE_URL:runtimeUrl.toString(),DATABASE_SSL_MODE:'disable',MIGRATION_MODE:'verify',DATABASE_CONNECT_TIMEOUT_MS:'1500',DATABASE_STATEMENT_TIMEOUT_MS:'2000'},stdio:['ignore','pipe','pipe']});
  child.stdout?.on('data',data=>{privateOutput+=String(data)}); child.stderr?.on('data',data=>{privateOutput+=String(data)});
  const pid=child.pid; assert.ok(pid); const base='http://127.0.0.1:'+port;
  const request=async(path:string)=>{
    const began=performance.now(); const response=await fetch(base+path,{signal:AbortSignal.timeout(5000)}); const body=await response.json();
    const elapsed=performance.now()-began; assert.ok(elapsed<5000); assert.equal(child!.exitCode,null); process.kill(pid,0);
    trace('HTTP',{path,status:response.status,request_ms:+elapsed.toFixed(1),pid,...(path==='/api/ready'?{ready:body.ready}:{})});
    return {status:response.status,body};
  };
  const healthStart=performance.now(); let healthy=false;
  while(performance.now()-healthStart<10000){ try { healthy=(await request('/api/health')).status===200; if(healthy)break; } catch{} await sleep(100); }
  assert.ok(healthy,'health listening within10s');
  const begin=performance.now(); let ready=false;
  while(performance.now()-begin<30000) { const result=await request('/api/ready'); assert.ok([200,503].includes(result.status)); if(result.status===200){ready=true;break;} await sleep(250); }
  assert.ok(ready,'restricted built HTTP verify ready within30s with DDL guard active');
  assert.equal((await request('/api/health')).status,200);
  assert.deepEqual(await inventory(owner),before,'application catalog/journal unchanged');
  assert.equal((await owner.query("SELECT value FROM system_config WHERE key='review_dml'")).rows[0].value,'retained');
  assert.equal(privateOutput.includes('review_forbidden_runtime_ddl'),false,'application never trips DDL guard');
  trace('PASS built-image readiness uses no DDL',{image_id:process.env.REVIEW_IMAGE_ID,pid,same_pid:true,catalog_and_journal_unchanged:true,ddl_guard_active:true,ready_ms:+(performance.now()-begin).toFixed(1)});
}
async function cleanup() {
  if(child && child.exitCode===null){ const done=new Promise(resolve=>child!.once('exit',resolve)); child.kill('SIGTERM'); await Promise.race([done,sleep(3000)]); if(child.exitCode===null){child.kill('SIGKILL');await done;} }
  await owner?.end().catch(()=>undefined);
  if(admin){ if(createdDatabase)await admin.query('DROP DATABASE IF EXISTS '+quote(database)+' WITH (FORCE)'); if(createdRole)await admin.query('DROP ROLE IF EXISTS '+quote(role)); await admin.end(); }
  trace('cleanup complete',{database_removed:createdDatabase,role_removed:createdRole});
}
main().catch(error=>{ // Error messages can contain connection details: emit only
  // a bounded assertion label/code; never child output, URL, SQL or password.
  console.error(JSON.stringify({phase:'FAIL',name:error?.name,code:error?.code,assertion:error?.operator ?? null}));process.exitCode=1;
}).finally(()=>cleanup().catch(()=>{console.error('fixture cleanup failed');process.exitCode=1}));
