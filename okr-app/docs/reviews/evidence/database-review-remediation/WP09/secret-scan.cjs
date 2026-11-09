// Run with the disposable URL privately in the environment. Only counts and
// filenames are emitted, never matched values or surrounding text.
const fs=require('node:fs'),path=require('node:path');
const app=process.cwd();
if(!process.env.DATABASE_URL)throw new Error('Supply private DATABASE_URL for exact secret scanning');
const url=new URL(process.env.DATABASE_URL);
const privateValues=[process.env.DATABASE_URL,url.password,decodeURIComponent(url.password)].filter(Boolean);
const roots=['docs/DATABASES.md','docs/DATABASE-VERIFICATION.md','docs/reviews/database-review-findings-remediation.md','docs/reviews/evidence/database-review-remediation/WP09'];
// Exact public literals only; the TLS literal is an unevaluated source template.
const allowlist = new Map([
 ['docs/DATABASES.md', ['postgresql://user:pass@host:5432/db']],
 ['docs/reviews/evidence/database-review-remediation/WP09/tls-proof/live.ts', ['postgres://postgres:${encodeURIComponent(password)}@${host}:5432/postgres?sslmode=require&application_name=wp09_tls_proof']],
 ['docs/reviews/evidence/database-review-remediation/WP09/secret-scan.cjs', ['postgresql://user:pass@host:5432/db', 'postgres://postgres:${encodeURIComponent(password)}@${host}:5432/postgres?sslmode=require&application_name=wp09_tls_proof']]
]);
let files=0,exactPrivate=0,privateKeys=0,unexpectedUris=0,publicSourceUris=0;
function scan(relative){
 const absolute=path.join(app,relative);
 if(fs.statSync(absolute).isDirectory()){for(const name of fs.readdirSync(absolute))scan(path.join(relative,name));return;}
 if(/SHA256SUMS$|secret-scan\.log$/.test(relative))return;
 const contents=fs.readFileSync(absolute,'utf8');files++;
 if(privateValues.some(value=>contents.includes(value))){exactPrivate++;console.log(`exact-private-material file=${relative}`);}
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(contents)){privateKeys++;console.log(`private-key-header file=${relative}`);}
 const found=contents.match(/postgres(?:ql)?:\/\/(?![^\s]*CHANGE_ME)[^\s'"<>`]+:[^\s@'"<>`]+@[^\s'"<>`]+/g)||[];
 for(const uri of found){if((allowlist.get(relative)||[]).includes(uri))publicSourceUris++;else{unexpectedUris++;console.log(`unexpected-credential-uri file=${relative}`);}}
}
for(const root of roots)scan(root);
console.log(`files=${files} exact-private-material=${exactPrivate} private-key-headers=${privateKeys} unexpected-credential-uris=${unexpectedUris} allowlisted-public-source-uris=${publicSourceUris}`);
process.exitCode=exactPrivate||privateKeys||unexpectedUris?1:0;
