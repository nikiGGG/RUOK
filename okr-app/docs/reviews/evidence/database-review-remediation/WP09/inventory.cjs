// Read-only inventory: preserve older owner evidence, including stale hashes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const app = process.cwd();
const base = path.join(app, 'docs/reviews/evidence/database-review-remediation');
const out = path.join(base, 'WP09');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const wps = ['WP01','WP02','WP03','WP04','WP05','WP06','WP07','WP08','WP10','WP11'];
if (!/^[a-f0-9]{40}$/.test(process.argv[2]||'')) throw new Error('Pass git rev-parse HEAD as the source identity argument');
const inventory = { capturedAt: new Date().toISOString(), source: process.argv[2], owners: [] };
for (const wp of wps) {
  const dir = path.join(base,wp);
  const files = fs.readdirSync(dir).filter(n=>fs.statSync(path.join(dir,n)).isFile()).sort();
  const owner = { wp, files:files.map(name=>({name,sha256:hash(path.join(dir,name))})), checksumVerification:[] };
  for (const name of files.filter(n=>/checksum|SHA256SUMS/i.test(n))) {
    const text = fs.readFileSync(path.join(dir,name),'utf8');
    for (const line of text.split('\n')) {
      const first = /^([a-f0-9]{64})\s+\*?(.+?)\s*$/.exec(line);
      const last = /^(.+?)\s+([a-f0-9]{64})\s*$/.exec(line);
      if (!first && !last) continue;
      const expected=first?first[1]:last[2], item=first?first[2]:last[1];
      const historicSuffix=item.includes('/okr-app/')?item.split('/okr-app/').slice(1).join('/okr-app/'):null;
      const candidates=[path.join(dir,item),path.join(app,item),path.join(app,'..',item),...(historicSuffix?[path.join(app,historicSuffix)]:[])];
      const actualFile=candidates.find(n=>fs.existsSync(n)&&fs.statSync(n).isFile());
      owner.checksumVerification.push({ list:name,path:item,expected,actual:actualFile?hash(actualFile):null,match:actualFile?hash(actualFile)===expected:false });
    }
  }
  inventory.owners.push(owner);
}
fs.writeFileSync(path.join(out,'owner-inventory.json'),JSON.stringify(inventory,null,2)+'\n');
for(const owner of inventory.owners){
  const checks=owner.checksumVerification;
  console.log(`${owner.wp}: artifacts=${owner.files.length} listed_checks=${checks.length} matches=${checks.filter(c=>c.match).length} mismatches_or_missing=${checks.filter(c=>!c.match).length}`);
}
