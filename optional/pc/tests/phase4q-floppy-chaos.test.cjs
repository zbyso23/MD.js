'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js'),{createFloppy}=require('../PC-Disk-Images.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(v,max)=>{const b=Buffer.from(v,'base64');if(b.length>max)throw Error('oversize');return new Uint8Array(b);}};
function rng(seed){let n=seed>>>0;return ()=>n=(Math.imul(n,1664525)+1013904223)>>>0;}
test('FDD randomized CHS read/write, media isolation, write protect, snapshot on XT and 286',()=>{
 const random=rng(0x4f4f4f17);
 for(const profile of ['xt','at']){
  const m=new PCMachine(profile);const original=createFloppy('720K');m.fdd.mount(0,original,'system',true);
  m.fdd.mount(1,createFloppy('720K'),'working',false);
  const oracle=m.fdd.exportImage(1);
  for(let trial=0;trial<130;trial++){
   const cyl=random()%80,head=random()%2,sec=1+random()%9,lba=cyl*18+head*9+sec-1;
   const data=new Uint8Array(512);for(let j=0;j<512;j++)data[j]=random()&255;
   assert.ok(m.fdd.writeSector(1,cyl,head,sec,data));oracle.set(data,lba*512);
   assert.deepEqual(m.fdd.readSector(1,cyl,head,sec),data);
   if(trial%25===0){const st=m.fdd.snapshot(codec);const another=new PCMachine(profile);another.fdd.restore(st,codec);assert.deepEqual(another.fdd.exportImage(1),oracle);assert.ok(another.fdd.disks[0].writeProtected);}
  }
  m.fdd.setWriteProtected(1,true);
  assert.equal(m.fdd.writeSector(1,0,0,1,new Uint8Array(512).fill(123)),false);
  assert.deepEqual(m.fdd.exportImage(1),oracle);
  assert.deepEqual(m.fdd.exportImage(0),new Uint8Array(original));
  const independent=m.fdd.exportImage(1);independent[512]=0x3e;assert.deepEqual(m.fdd.exportImage(1),oracle);
 }
});
test('FDD atomic restore: corrupt B, malformed controller, invalid write protect leaves BOTH disks alone',()=>{
 const m=new PCMachine('xt');m.fdd.mount(0,createFloppy('720K'),'system',true);m.fdd.mount(1,createFloppy('360K'),'developer',false);
 const baseline=m.fdd.snapshot(codec),a=m.fdd.exportImage(0),b=m.fdd.exportImage(1);
 for(const corrupt of [
  {...baseline,disks:[baseline.disks[0],{...baseline.disks[1],bytes:'AQ=='}]},
  {...baseline,disks:[baseline.disks[0],{...baseline.disks[1],writeProtected:'yes'}]},
  {...baseline,cyl:[0,-1]}, {...baseline,expected:300},
  {...baseline,lastInterrupt:{st0:'bad',cyl:0}}, {...baseline,result:new Array(100).fill(0)}
 ]){
  assert.throws(()=>m.fdd.restore(corrupt,codec));
  assert.deepEqual(m.fdd.exportImage(0),a);assert.deepEqual(m.fdd.exportImage(1),b);
  assert.equal(m.fdd.disks[0].writeProtected,true);assert.equal(m.fdd.disks[1].writeProtected,false);
 }
});
