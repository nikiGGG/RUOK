const fs=require('node:fs'),path=require('node:path');
const dir=__dirname;
const rows=fs.readFileSync(path.join(dir,'stages.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const mandatory=['sqlite_after_cutoff_tmpfs','postgres_after_close_tmpfs','application_sqlite_tmpfs','application_postgres_after_close_tmpfs','recovery_postgres_after_close_tmpfs','stability_tmpfs','remaining_contracts_after_close_tmpfs','full_after_pg_close_tmpfs'];
const latest=name=>rows.filter(r=>r.name===name).at(-1);
let failures=0;
const table=['# Final required execution matrix','','The failed earlier attempts remain in `stages.jsonl` and their original logs.','Selected diagnostic/baseline filters are separate proof, not acceptance coverage.','','| Stage | Actual command | Exit / expected | Tests passed / skipped | UTC interval |','|---|---|---|---|---|'];
for(const name of mandatory){
  const row=latest(name);
  if(!row){table.push(`| ${name} | not executed | missing | — | — |`);failures++;continue;}
  const text=fs.readFileSync(path.join(dir,name+'.log'),'utf8').replace(/\u001b\[[0-9;]*m/g,'');
  const summary=text.split('\n').find(line=>/^\s*Tests\s+/.test(line))||'';
  const passed=/(\d+) passed/.exec(summary)?.[1]||'?';
  const skipped=Number(/(\d+) skipped/.exec(summary)?.[1]||0);
  table.push(`| ${name} | \`${row.command.replace(/\|/g,'\\|')}\` | ${row.code} / ${row.expected} | ${passed} / ${skipped} | ${row.start}–${row.end} |`);
  if(row.code!==0||row.expected!==0||row.signal||skipped||passed==='?')failures++;
}
const comparisonPath=path.join(dir,'diagnostic-comparison-after-pg-close.json');
const comparison=fs.existsSync(comparisonPath)?JSON.parse(fs.readFileSync(comparisonPath,'utf8')):null;
table.push('','Diagnostic comparison: '+(comparison?`baseline ${comparison.baseline.length}, current ${comparison.current.length}, added ${comparison.added.length}, resolved ${comparison.resolved.length}. Actual baseline/current check exits remain 1.`:'not executed.'));
if(!comparison?.noNewDiagnostics)failures++;
const pgProbeLog=path.join(dir,'postgres-probe-proof/cycle.log');
const pgProbeProvenance=path.join(dir,'postgres-probe-proof/provenance.txt');
const pgCyclePassed=fs.existsSync(pgProbeLog)&&fs.existsSync(pgProbeProvenance)&&fs.readFileSync(pgProbeLog,'utf8').includes('PASS complete PostgreSQL HTTP cycle')&&/^exit=0$/m.test(fs.readFileSync(pgProbeProvenance,'utf8'));
table.push('',`Supplemental complete PostgreSQL same-PID HTTP cycle: ${pgCyclePassed?'passed':'incomplete'}.`);
if(!pgCyclePassed)failures++;
const finalResults=path.join(dir,'final-image/live-results.txt');
const finalRows=fs.existsSync(finalResults)?fs.readFileSync(finalResults,'utf8').trim().split('\n').filter(Boolean):[];
table.push('',`Final-source production-image scenarios: ${finalRows.length}/6 recorded.`);
if(finalRows.length!==6)failures++;
for(const line of finalRows){
  const match=/^(\S+).* exit=(\d+) expected=(success|failure)$/.exec(line);
  if(!match||(match[3]==='success'&&match[2]!=='0')||(match[3]==='failure'&&match[2]==='0'))failures++;
}
const finalProvenance=path.join(dir,'final-image/provenance.txt');
if(!fs.existsSync(finalProvenance)||!fs.readFileSync(finalProvenance,'utf8').includes('source_stability_exit=0'))failures++;
table.push('',`Incomplete checks: ${failures}. RISK-2 remains unresolved/operator-deferred.`,'');
fs.writeFileSync(path.join(dir,'result-matrix.md'),table.join('\n'));
console.log(`required stages=${mandatory.length} incomplete checks=${failures}`);
process.exitCode=failures?1:0;
