// Compare actual Svelte diagnostic identities, not historical total counts.
const fs = require('node:fs');
const path = require('node:path');
const evidence = __dirname;
function parse(name) {
  const input = fs.readFileSync(path.join(evidence,name),'utf8').replace(/\u001b\[[0-9;]*m/g,'').replace(/\r\n/g,'\n');
  const diagnostics=[];
  const lines=input.split('\n');
  for(let i=0;i<lines.length;i++){
    const location=/^\/(?:workspace|baseline)\/okr-app\/(.+):(\d+):(\d+)\s*$/.exec(lines[i]);
    if(!location)continue;
    const message=/^(Error|Warn(?:ing)?):\s*(.*)$/.exec(lines[i+1]||'');
    if(!message)continue;
    diagnostics.push({ file:location[1],line:Number(location[2]),column:Number(location[3]),severity:message[1],message:message[2],context:lines.slice(i+2,i+5).join('\n') });
  }
  if(!diagnostics.length)throw new Error(`No diagnostic identities parsed from ${name}; inspect output format`);
  return diagnostics;
}
const baseline=parse(process.argv[3]||'baseline-check.log');
const current=parse(process.argv[2]||'current-check.log');
const key=d=>`${d.file}\t${d.severity}\t${d.message}`;
const remaining=[...baseline];
const added=[];
for(const diagnostic of current){
  const found=remaining.findIndex(candidate=>key(candidate)===key(diagnostic));
  if(found<0)added.push(diagnostic);else remaining.splice(found,1);
}
const report={capturedAt:new Date().toISOString(),method:'relative file + severity + message multiset; source context retained for review; line/column changes alone are not new diagnostics',baseline,current,added,resolved:remaining,noNewDiagnostics:added.length===0};
fs.writeFileSync(path.join(evidence,process.argv[4]||'diagnostic-comparison.json'),JSON.stringify(report,null,2)+'\n');
console.log(`baseline=${baseline.length} current=${current.length} added=${added.length} resolved=${remaining.length}`);
for(const d of added)console.log(`NEW ${d.file}:${d.line}:${d.column} ${d.severity}: ${d.message}`);
process.exitCode=added.length?1:0;
