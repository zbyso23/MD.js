'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {PCIDE}=require('../PC-IDE.js');
const SECTOR=512;
function rng(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s;};}
function ide(){const m=new PCMachine('at');const d=new PCIDE(m);d.mount(new Uint8Array(SECTOR*256),'CHAOS');return d;}
function address(d,lba,sectorCount=1){d.write8(0x1f6,0xe0|((lba>>>24)&0xf));d.write8(0x1f5,(lba>>>16)&255);d.write8(0x1f4,(lba>>>8)&255);d.write8(0x1f3,lba&255);d.write8(0x1f2,sectorCount);}
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(v,max)=>{if(typeof v!=='string'||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v))throw Error('invalid base64');const b=Buffer.from(v,'base64');if(b.length>max)throw Error('oversize');return new Uint8Array(b);}};
test('ATA IDENTIFY must NOT modify task-file address/count (regression 4Q)',()=>{
 const d=ide();address(d,37,4);const before=[0x1f2,0x1f3,0x1f4,0x1f5,0x1f6].map(p=>d.read8(p));
 d.write8(0x1f7,0xec);assert.equal(d.status,0x58);
 let data=[];for(let i=0;i<256;i++)data.push(d.read16(0x1f0));
 assert.equal(data[0],0x40);assert.equal(data[60],256);assert.equal(d.status,0x50);
 assert.deepEqual([0x1f2,0x1f3,0x1f4,0x1f5,0x1f6].map(p=>d.read8(p)),before,'IDENTIFY should not advance the disk address');
});
test('ATA PIO reproducible random multi-sector writes, reads, reset, export/reimport',()=>{
 const next=rng(0x4a17cafe),d=ide(),oracle=new Uint8Array(SECTOR*256);
 for(let trial=0;trial<80;trial++){
  const count=1+next()%5,lba=next()%(256-count),data=new Uint8Array(SECTOR*count);
  for(let i=0;i<data.length;i++)data[i]=next()&255;
  address(d,lba,count);d.write8(0x1f7,0x30);assert.equal(d.status,0x58);
  for(let i=0;i<data.length;i+=2)d.write16(0x1f0,data[i]|(data[i+1]<<8));
  assert.equal(d.status,0x50,`WRITE trial ${trial}`);
  oracle.set(data,lba*SECTOR);
  address(d,lba,count);d.write8(0x1f7,0x20);
  const got=new Uint8Array(data.length);
  for(let i=0;i<got.length;i+=2){const w=d.read16(0x1f0);got[i]=w&255;got[i+1]=w>>>8;}
  assert.deepEqual(got,data,`READ trial ${trial}`);
  if(trial%13===0){const exp=d.exportImage();assert.deepEqual(exp,oracle);const snapshot=d.snapshot(codec);d.restore(snapshot,codec);assert.deepEqual(d.exportImage(),oracle);}
 }
 d.reset();assert.deepEqual(d.exportImage(),oracle,'controller reset retains IDE media');
 const exported=d.exportImage();const r=ide();r.mount(exported,'import');assert.deepEqual(r.exportImage(),oracle);
});
test('ATA address/count boundaries, device misuse and malformed snapshots do not corrupt disk',()=>{
 const d=ide();const original=d.exportImage();
 for(const [lba,count] of [[256,1],[255,2],[251,6]]){
  address(d,lba,count);d.write8(0x1f7,0x30);assert.equal(d.status,0x51);
  assert.deepEqual(d.exportImage(),original);
 }
 address(d,3);d.write8(0x1f6,0xf0);d.write8(0x1f7,0x20);assert.equal(d.status,0x51);
 address(d,2);d.write8(0x1f7,0x90);assert.equal(d.status,0x51);
 const st=d.snapshot(codec);
 const invalid=[{...st,image:'bad!'}, {...st,transfer:Buffer.alloc(511).toString('base64')},{...st,remaining:999},{...st,lba:257},{...st,index:513},{...st,name:null}];
 for(const corrupt of invalid){assert.throws(()=>d.restore(corrupt,codec));assert.deepEqual(d.exportImage(),original);}
});
