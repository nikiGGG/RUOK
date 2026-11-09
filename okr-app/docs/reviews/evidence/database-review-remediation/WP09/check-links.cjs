const fs=require('node:fs'),path=require('node:path');
const app=process.cwd();
const files=['docs/DATABASES.md','docs/DATABASE-VERIFICATION.md','docs/reviews/database-review-findings-remediation.md','docs/reviews/evidence/database-review-remediation/WP09/manifest.md'];
let checked=0,missing=0;
for(const file of files){
  for(const match of fs.readFileSync(path.join(app,file),'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
    const target=match[1].split('#')[0];
    if(!target||/^[a-z]+:\/\//i.test(target))continue;
    checked++;
    if(!fs.existsSync(path.resolve(app,path.dirname(file),target))){console.log(`MISSING ${file} -> ${target}`);missing++;}
  }
}
console.log(`local links checked=${checked} missing=${missing}`);
process.exitCode=missing?1:0;
