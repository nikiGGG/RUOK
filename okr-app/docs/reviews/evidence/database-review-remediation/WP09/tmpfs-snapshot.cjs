const fs=require('node:fs');
const testDir=process.env.TMPDIR;
if(testDir!=='/dev/shm/ruok-wp09-tests')throw new Error('Expected private functional-test TMPDIR');
const tmp=fs.statfsSync(testDir),original=fs.statfsSync('/tmp');
const record={utc:new Date().toISOString(),label:process.argv[2],directory:testDir,type:tmp.type,typeHex:'0x'+tmp.type.toString(16),originalTmpTypeHex:'0x'+original.type.toString(16),totalBytes:tmp.blocks*tmp.bsize,availableBytes:tmp.bavail*tmp.bsize,minFreeBytes:16*1024*1024,node:process.version};
fs.appendFileSync(process.env.WP09_EVIDENCE+'/tmpfs-filesystem.jsonl',JSON.stringify(record)+'\n');
console.log(JSON.stringify(record));
if(tmp.type!==0x01021994)throw new Error('Test directory is not tmpfs; refuse silent filesystem substitution');
if(record.availableBytes<record.minFreeBytes)throw new Error('Less than 16 MiB free in test tmpfs');
