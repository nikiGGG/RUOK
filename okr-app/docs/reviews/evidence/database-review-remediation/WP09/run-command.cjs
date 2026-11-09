// Capture complete command output before redaction, so secrets split over writes
// cannot escape. Raw output stays in memory and is never written to disk.
const { spawn } = require('node:child_process');
const { appendFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const [name, command, expected = '0', cwd = process.cwd()] = process.argv.slice(2);
if (!name || !command) throw new Error('name and command required');
const evidence = process.env.WP09_EVIDENCE;
const start = new Date().toISOString();
const privateValues = [];
for (const key of ['DATABASE_URL', 'RUOK_TEST_PG_ADMIN_URL']) {
  if (!process.env[key]) continue;
  privateValues.push(process.env[key]);
  const url = new URL(process.env[key]);
  if (url.password) privateValues.push(url.password, decodeURIComponent(url.password));
}
function redact(text) {
  for (const value of privateValues.filter(Boolean).sort((a, b) => b.length - a.length)) {
    text = text.split(value).join('<redacted>');
  }
  return text.replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/gi, '<redacted-postgres-url>');
}
const child = spawn('/bin/sh', ['-c', command], { cwd, env: process.env });
let stdout = '', stderr = '';
child.stdout.on('data', chunk => { stdout += chunk; });
child.stderr.on('data', chunk => { stderr += chunk; });
child.on('error', error => { stderr += String(error); });
child.on('close', (code, signal) => {
  const record = { name, command, cwd, start, end: new Date().toISOString(), code, signal, expected: Number(expected) };
  writeFileSync(join(evidence, `${name}.log`), redact(`command: ${command}\ncwd: ${cwd}\nstart: ${start}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}\nend: ${record.end}\nexit: ${code}\nsignal: ${signal}\n`));
  appendFileSync(join(evidence, 'stages.jsonl'), JSON.stringify(record) + '\n');
  console.log(`${name}: exit=${code} expected=${expected} start=${start} end=${record.end}`);
  process.exitCode = code === Number(expected) && !signal ? 0 : 1;
});
