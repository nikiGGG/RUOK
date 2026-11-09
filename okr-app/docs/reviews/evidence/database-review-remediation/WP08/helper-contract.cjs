// Supplemental helper-contract checks; real image/backend runs are recorded separately.
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const lib = path.resolve(__dirname, '../../../../../tests/container/lib.sh');
const cases = [
  ['bad-status', 503, '{}', 'http_json GET /test 200', 1],
  ['malformed-json', 200, 'not json', 'http_json GET /test 200', 1],
  ['empty-id', 201, '{"objective":{"id":"","title":"WP08 persistence test"}}', 'SMOKE_USER=test; smoke_write', 1],
  ['missing-objective', 200, '{"objectives":[]}', 'OBJ_ID=expected; OBJECTIVE_TITLE=expected; smoke_read', 1],
  ['substring-id', 200, '{"objectives":[{"id":"prefix-expected-suffix","title":"expected"}]}', 'OBJ_ID=expected; OBJECTIVE_TITLE=expected; smoke_read', 1],
  ['changed-title', 200, '{"objectives":[{"id":"expected","title":"changed"}]}', 'OBJ_ID=expected; OBJECTIVE_TITLE=expected; smoke_read', 1],
  ['exact-match', 200, '{"objectives":[{"id":"expected","title":"expected"}]}', 'OBJ_ID=expected; OBJECTIVE_TITLE=expected; smoke_read', 0],
  ['timeout', 200, null, 'http_json GET /test 200', 1],
  ['readiness-deadline', 503, '{}', 'wait_ready "$SMOKE_PORT"', 1],
];
(async () => {
 for (const [name,status,body,command,expected] of cases) {
  const sockets = new Set();
  const server = http.createServer((req,res)=>{if(body===null)return; res.writeHead(status,{'Content-Type':'application/json'});res.end(body);});
  server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const start=Date.now();
  const code=await new Promise((resolve,reject)=>{
   const p=spawn('bash',['-c', 'set -e; source "$1"; COOKIE_JAR=$(mktemp); trap \'rm -f "$COOKIE_JAR"\' EXIT; '+command,'helper-contract',lib],{env:{...process.env,RUOK_SMOKE_PORT:String(server.address().port),RUOK_SMOKE_HTTP_TIMEOUT:'1',RUOK_SMOKE_READY_TIMEOUT:'2'},stdio:'ignore'});
   p.on('error',reject);p.on('close',resolve);
  });
  for(const s of sockets)s.destroy();
  await new Promise(r=>server.close(r));
  const duration=Date.now()-start;
  if((expected===0 ? code!==0 : code===0) || duration>6000) throw new Error(`${name}: exit=${code} duration=${duration}ms`);
  console.log(`${name}: expected=${expected===0?'success':'nonzero'} actual=${code} elapsed_ms=${duration} PASS`);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
