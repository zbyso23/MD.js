'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {packFiles,createIDE,prepareFiles,MAX_PAYLOAD,MAX_DISK}=require('../PC-Disk-Images.js');
const {PCMachine}=require('../PC-Machine.js');
const rd16=(b,o)=>b[o]|b[o+1]<<8,rd32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;
function readRoot(buffer,offset=0){
 const b=new Uint8Array(buffer),p=offset*512,res=rd16(b,p+14),fats=b[p+16],fatSz=rd16(b,p+22),rootCnt=rd16(b,p+17),rootPos=p+(res+fats*fatSz)*512;
 return Array.from({length:rootCnt},(_,i)=>b.subarray(rootPos+i*32,rootPos+(i+1)*32)).filter(e=>e[0]!==0&&e[0]!==0xe5);
}
function lookup(buffer,dir,part=0){
 const b=new Uint8Array(buffer),base=part*512,fatSz=rd16(b,base+22),res=rd16(b,base+14),nfat=b[base+16],rootCnt=rd16(b,base+17),spc=b[base+13];
 const rootSec=Math.ceil(rootCnt*32/512),fatOffset=base+res*512,dataOffset=base+(res+nfat*fatSz+rootSec)*512;
 const size=rd32(dir,28),count=Math.ceil(size/(512*spc)),kind=part?16:12;
 let id=rd16(dir,26),out=new Uint8Array(size);let o=0;
 for(let n=0;n<count;n++){
  assert.ok(id>=2,'FAT cluster');const len=Math.min(size-o,spc*512);out.set(b.subarray(dataOffset+(id-2)*spc*512,dataOffset+(id-2)*spc*512+len),o);o+=len;
  let next;if(kind===16)next=rd16(b,fatOffset+id*2);
  else {const at=fatOffset+Math.floor(id*3/2);next=id&1?((b[at]>>>4)|(b[at+1]<<4)):(b[at]|((b[at+1]&15)<<8));}
  if(n<count-1){assert.ok(next>=2&&next<(kind===12?0xff8:0xfff8),'FAT chain');id=next;}
  else assert.ok(next>=(kind===12?0xff8:0xfff8),'FAT end-of-chain');
 }
 return out;
}
function payload(name,n){const bytes=new Uint8Array(n);for(let i=0;i<n;i++)bytes[i]=(i*17+(i>>9))&255;return {name,data:bytes};}
for(const [name,n,expected] of [['HELLO.COM',22,'720K'],['ART.JPG',400000,'720K'],['FILE.ZIP',1_000_000,'1.44M'],['GAME.EXE',5*1024*1024,'8MiB']]){
 test(`host ${name} (${n} bytes) becomes readable DOS file in FAT ${expected}`,()=>{
  const f=payload(name,n),p=packFiles([f]);assert.equal(p.format,expected);
  const part=p.kind==='ide'?63:0,dirs=readRoot(p.buffer,part);assert.equal(dirs.length,1);
  assert.equal(Buffer.from(dirs[0].subarray(0,11)).toString('ascii').trim(),(name.split('.')[0].padEnd(8,' ')+name.split('.')[1].padEnd(3,' ')));
  assert.deepEqual(lookup(p.buffer,dirs[0],part),f.data);assert.equal(p.mapping[0].dosName,name);
  const machine=new PCMachine(part?'at':'xt');if(part)machine.ide.mount(p.buffer);else machine.fdd.mount(1,p.buffer);
  assert.ok(part?machine.ide.capacity>0:machine.fdd.disks[1]);
 });
}
test('multiple files, empty file, truncation collisions, unsafe paths and opaque ZIP',()=>{
 const data=[payload('Program with VERY LONG name.com',512),payload('Program with VERY LONG name.com',513),payload('../CON.txt',0),payload('music.zip',300),payload('EMPTY.TXT',0)];
 const p=packFiles(data);assert.equal(p.kind,'floppy');assert.equal(p.mapping.length,5);
 assert.equal(new Set(p.mapping.map(x=>x.dosName)).size,5);
 assert.equal(p.mapping[2].dosName,'CON~1.TXT');
 const dirs=readRoot(p.buffer);assert.equal(dirs.length,5);
 for(let i=0;i<5;i++)assert.deepEqual(lookup(p.buffer,dirs[i]),data[i].data);
});
test('forces floppy/IDE, no XT IDE; oversized payload rejects before disk creation',()=>{
 const f=payload('README.TXT',1_600_000);
 assert.throws(()=>packFiles([f],'floppy'),/do not fit/);
 assert.equal(packFiles([f],'ide').format,'8MiB');
 assert.throws(()=>packFiles([payload('NO.TXT',MAX_PAYLOAD+1)]),/5 MiB/);
 assert.throws(()=>packFiles([]),/at least one/);
 assert.throws(()=>packFiles([{name:'',data:new Uint8Array(1)}]),/Invalid file/);
 assert.throws(()=>packFiles([payload('a',1)],'bogus'),/Unknown target/);
 assert.equal(MAX_DISK,80*1000*1000);
});
test('80 MB FAT16 media: CHS, FAT cluster count, and IDE last-sector access',()=>{
 const b=createIDE(80),v=new Uint8Array(b),m=new PCMachine('at');m.ide.mount(b);
 assert.equal(v.length,MAX_DISK);assert.equal(m.ide.geometry.cylinders,611);assert.deepEqual(m.ide.geometry,{heads:8,sectors:32,cylinders:611});
 assert.equal(v[63*512+13],4);assert.equal(rd32(v,458),MAX_DISK/512-63);
 const sector=new Uint8Array(512).fill(0xb3);m.ide.writeSector(m.ide.capacity-1,sector);
 assert.equal(m.ide.readSector(m.ide.capacity-1)[123],0xb3);
 const g=m.ide.geometry;assert.ok(g.cylinders<=1024);
});
test('copy-on-write isolation after packing and mounting',()=>{
 const f=payload('DEMO.COM',1536),p=packFiles([f]),m=new PCMachine('xt');m.fdd.mount(1,p.buffer);
 const original=readRoot(p.buffer)[0][0],sec=m.fdd.readSector(1,0,0,3);sec.fill(0x81);
 m.fdd.writeSector(1,0,0,3,sec);
 assert.equal(readRoot(p.buffer)[0][0],original);
 assert.notDeepEqual(new Uint8Array(m.fdd.exportArrayBuffer(1)),new Uint8Array(p.buffer));
});
