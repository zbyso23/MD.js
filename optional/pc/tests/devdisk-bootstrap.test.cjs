'use strict';
const {test}=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'),crypto=require('node:crypto');
const PC=path.resolve(__dirname,'..'),ROOT=path.resolve(PC,'../..');
const img=fs.readFileSync(path.join(PC,'x86DEV-720K-XT286.img'));
function entries(b){const sectorSize=b.readUInt16LE(11);const start=(b.readUInt16LE(14)+b[16]*b.readUInt16LE(22))*sectorSize;
 const result=new Map();for(let i=0;i<b.readUInt16LE(17);i++){const o=start+i*32;if(!b[o])break;if(b[o]===0xe5)continue;
 const name=b.toString('ascii',o,o+8).trim(),ext=b.toString('ascii',o+8,o+11).trim();result.set(name+(ext?'.'+ext:''),{size:b.readUInt32LE(o+28),startCluster:b.readUInt16LE(o+26)});}return result;}
const files=entries(img);
test('Phase 4M.1 developer B: ships verified XT/AT C toolchain and deliberately excludes NASM',()=>{
 assert.equal(img.length,737280);assert.equal(img.toString('ascii',54,59),'FAT12');assert.equal(img[510],0x55);assert.equal(img[511],0xaa);
 for(const x of ['EDIT.COM','DEBUG.COM','HELLO.C','DEVHELP.TXT','NOTICE.TXT','CC.EXE','ASM.EXE','YLINK.EXE','CLIB.LIB','STDIO.H'])assert.ok(files.has(x),x+' missing');
 for(const [name,fn] of [['CC.EXE','cc.exe'],['ASM.EXE','asm.exe'],['YLINK.EXE','ylink.exe'],['CLIB.LIB','clib.lib'],['STDIO.H','stdio.h']]){
  const b=fs.readFileSync(path.join(PC,'devtools/vendor',fn));assert.equal(files.get(name).size,b.length,name+' length');if(name.endsWith('.EXE'))assert.equal(b.toString('ascii',0,2),'MZ');
 }
 assert.ok(!files.has('NASM.EXE'),'NASM must not be on built-in B:');assert.ok(!files.has('HELLO.ASM'),'NASM-only example must not be on B:');assert.ok(files.get('EDIT.COM').size>3000);assert.ok(!files.has('MININASM.COM'),'the supplied mininasm ZIP contains source, no DOS executable');
 const used=[...files.values()].reduce((n,f)=>n+f.size,0);assert.ok(used<600*1024, 'leave working space');
});
test('XT and AT enforce read-only built-in B and independent work copy',()=>{
 const {PCMachine}=require(path.join(PC,'PC-Machine.js'));
 for(const profile of ['xt','at']){const original=Buffer.from(img),m=new PCMachine(profile);m.mountDisk(1,img,'dev.img');m.fdd.setWriteProtected(1,true);
  assert.equal(m.fdd.writeSector(1,0,0,2,new Uint8Array(512).fill(123)),false);
  const copy=new PCMachine(profile);copy.mountDisk(1,m.fdd.exportImage(1),'work.img');copy.fdd.setWriteProtected(1,false);
  assert.equal(copy.fdd.writeSector(1,0,0,2,new Uint8Array(512).fill(123)),true);
  assert.deepEqual(Buffer.from(img),original);
 }
});
test('developer IMG is embedded byte-for-byte for offline mode and B prompt is recognized',()=>{
 const script=fs.readFileSync(path.join(PC,'PC-EmbeddedAssets.js'),'utf8');const m=script.match(/devtools720k:"([A-Za-z0-9+/=]+)"/);
 assert.ok(m);assert.deepEqual(Buffer.from(m[1],'base64'),img);
 const html=fs.readFileSync(path.join(PC,'index.html'),'utf8');assert.match(html,/mountEmbeddedDeveloperDisk\(true\)/);
 assert.match(html,/fdd-devwork/);assert.match(html,/fdd-devrestore/);assert.match(html,/\^\[A-Z\]:/);
 assert.ok(fs.existsSync(path.join(PC,'devtools/upstream/Small-C-master.zip')));
});
test('toolchain builder and supplied source assets are present with provenance',()=>{
 const build=fs.readFileSync(path.join(PC,'devtools/build_devdisk.js'),'utf8');assert.match(build,/bundle-verified/);
 const text=fs.readFileSync(path.join(PC,'devtools/README.md'),'utf8');assert.match(text,/NASM is \*\*excluded/);assert.ok(!fs.existsSync(path.join(PC,'devtools/vendor/NASM.EXE')));assert.ok(!fs.existsSync(path.join(PC,'devtools/upstream/nsm09839.zip')));
 assert.match(fs.readFileSync(path.join(PC,'devtools/BUILD-INPUTS.txt'),'utf8'),/sha256=[0-9a-f]{64}/);
});
