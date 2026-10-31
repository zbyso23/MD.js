'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const PC=path.resolve(__dirname,'..');const {PCMachine}=require(path.join(PC,'PC-Machine.js'));
const embedded=require('node:fs').readFileSync(path.join(PC,'PC-EmbeddedAssets.js'),'utf8');
function fatEntries(bytes){let entries=[];const b=bytes,rootSector=1+b[22]*2,rootStart=rootSector*512;for(let i=0;i<112;i++){const x=rootStart+i*32;if(!b[x])break;if(b[x]===0xe5)continue;entries.push({name:Buffer.from(b.subarray(x,x+11)).toString('ascii').trim(),size:b[x+28]+(b[x+29]<<8)+(b[x+30]<<16)+(b[x+31]*16777216)});}return entries;}
test('Developer B: is a real 720K FAT12 image with editor + debugger + ASM/C samples, not fake compiler',()=>{
 const img=fs.readFileSync(path.join(PC,'x86DEV-720K-XT286.img'));
 assert.equal(img.length,737280);assert.equal(img.toString('ascii',54,59),'FAT12');assert.equal(img[510],0x55);assert.equal(img[511],0xaa);
 const files=fatEntries(img);for(const n of ['EDIT    COM','DEBUG   COM','HELLO   ASM','HELLO   C','DEVHELP TXT'])assert.ok(files.some(x=>x.name===n),n+' missing');
 assert.ok(!files.some(x=>/^MININASM|^NASM|^SMALLC|^INSIGHT|^SCC/.test(x.name)),'must not pretend to bundle unavailable tools');
 assert.ok(files.some(x=>x.name==='EDIT    COM'&&x.size>3000));
});
test('Both XT and AT can mount the developer image read only, copy and reset without altering source',()=>{
 const img=fs.readFileSync(path.join(PC,'x86DEV-720K-XT286.img'));const original=Buffer.from(img);
 for(const profile of ['xt','at']){
  const m=new PCMachine(profile);m.mountDisk(1,img,'dev.img');m.fdd.setWriteProtected(1,true);
  assert.equal(m.fdd.writeSector(1,0,0,2,new Uint8Array(512).fill(123)),false);assert.deepEqual(Buffer.from(m.fdd.exportImage(1)),original);
  const tmp=new PCMachine(profile);tmp.mountDisk(1,m.fdd.exportImage(1),'work.img');tmp.fdd.setWriteProtected(1,false);
  assert.equal(tmp.fdd.writeSector(1,0,0,2,new Uint8Array(512).fill(123)),true);assert.deepEqual(Buffer.from(img),original);
 }
});
test('Dev B: is embedded as a self-contained base64 payload for file://; tool-install script exists',()=>{
 const m=embedded.match(/devtools720k:"([A-Za-z0-9+/=]+)"/);assert.ok(m,'missing embedded B:');const actual=Buffer.from(m[1],'base64');assert.deepEqual(actual,fs.readFileSync(path.join(PC,'x86DEV-720K-XT286.img')));
 assert.ok(fs.existsSync(path.join(PC,'devtools/build_devdisk.js')));
 const html=fs.readFileSync(path.join(PC,'index.html'),'utf8');assert.match(html,/mountEmbeddedDeveloperDisk\(true\)/);assert.match(html,/fdd-devwork/);assert.match(html,/fdd-devrestore/);
});
