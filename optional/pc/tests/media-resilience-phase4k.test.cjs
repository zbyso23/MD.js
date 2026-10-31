'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js'),{createFloppy,createIDE,packFiles}=require('../PC-Disk-Images.js');
const {R,F,S}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(v,max)=>{const b=Buffer.from(v,'base64');if(b.length>max)throw Error('oversize');return new Uint8Array(b);}};
test('IDE rejects malformed snapshot atomically, preserving original disk, overlay, and registers',()=>{
 const m=new PCMachine('at'),ide=m.ide;ide.mount(createIDE(8),'ORIGINAL');
 const patch=new Uint8Array(512).fill(0x5a);ide.writeSector(70,patch);
 ide.write8(0x1f2,3);const before={name:ide.name,sector:ide.readSector(70),count:ide.count,overlay:ide.overlay.size};
 const good=ide.snapshot(codec);
 for(const corrupt of [
  {...good,count:-1}, {...good,remaining:257}, {...good,transfer:'AQ=='},
  {...good,drive:65536}, {...good,image:'AA=='}, {...good,lba:ide.capacity+1},
  {...good,name:null}, {...good,remaining:1,image:null}
 ]){
  assert.throws(()=>ide.restore(corrupt,codec));
  assert.equal(ide.name,before.name);assert.equal(ide.count,before.count);
  assert.deepEqual(ide.readSector(70),before.sector);assert.equal(ide.overlay.size,before.overlay);
 }
});
test('IDE real 16-bit PIO multi-sector read/write and copy-on-write original',()=>{
 const m=new PCMachine('at'),ide=m.ide,buffer=createIDE(8),source=new Uint8Array(buffer);
 ide.mount(buffer,'test');const last=ide.capacity-2;ide.write8(0x1f6,0xe0|((last>>>24)&0x0f));
 ide.write8(0x1f5,(last>>>16)&255);ide.write8(0x1f4,(last>>>8)&255);ide.write8(0x1f3,last&255);
 ide.write8(0x1f2,2);ide.write8(0x1f7,0x30);
 for(let k=0;k<512;k++)ide.write16(0x1f0,(k*23+7)&65535);
 assert.equal(ide.status,0x50);assert.equal(ide.remaining,0);
 const originalAt=source.subarray(last*512,last*512+512);assert.notEqual(originalAt[0],7);
 ide.write8(0x1f6,0xe0|((last>>>24)&0x0f));ide.write8(0x1f5,(last>>>16)&255);
 ide.write8(0x1f4,(last>>>8)&255);ide.write8(0x1f3,last&255);ide.write8(0x1f2,2);ide.write8(0x1f7,0x20);
 for(let k=0;k<512;k++)assert.equal(ide.read16(0x1f0),(k*23+7)&65535);
 assert.equal(ide.status,0x50);
 ide.write8(0x1f3,0xff);ide.write8(0x1f2,5);ide.write8(0x1f7,0x20);
 assert.equal(ide.status,0x51,'out of range ATA must fail with ERR');
});
test('FDD read-only lock blocks direct sectors and BIOS INT13h writes, survives snapshot',()=>{
 const m=new PCMachine('xt'),disk=new Uint8Array(createFloppy('720K'));
 m.fdd.mount(1,disk,'read-only.img');m.fdd.setWriteProtected(1,true);
 const before=m.fdd.readSector(1,0,0,1);assert.equal(m.fdd.writeSector(1,0,0,1,new Uint8Array(512).fill(0x72)),false);
 assert.deepEqual(m.fdd.readSector(1,0,0,1),before);
 // INT 13h AH=03, AL=1, CH=0, CL=1, DH=0, DL=1.
 const c=m.cpu;c.r[R.AX]=0x0301;c.r[R.CX]=1;c.r[R.DX]=1;c.r[R.BX]=0x0200;
 c.loadSegment(S.ES,0);c.loadSegment(S.SS,0);c.r[R.SP]=0x8000;m.write16Physical(0x8004,0);m.bios.diskService(c);
 assert.ok(m.read16Physical(0x8004)&F.CF);assert.equal((c.r[R.AX]>>>8),3);
 m.fdd.execute([0x05,1,0,0,1,2,9,0,0]);assert.equal(m.fdd.result[1],2,'FDC status write-protect bit');
 const snap=m.fdd.snapshot(codec);const n=new PCMachine('xt');n.fdd.restore(snap,codec);
 assert.equal(n.fdd.disks[1].writeProtected,true);
 assert.equal(n.fdd.writeSector(1,0,0,1,new Uint8Array(512)),false);
 n.fdd.setWriteProtected(1,false);assert.equal(n.fdd.writeSector(1,0,0,1,new Uint8Array(512).fill(4)),true);
});
test('Quick media boundary at 5 MiB and 80MB disk with no accidental input mutation',()=>{
 const data=new Uint8Array(5*1024*1024);data[0]=0x7e;data[data.length-1]=0xa7;
 const p=packFiles([{name:'LONG DEMO.EXE',data}],'ide');assert.ok(p.buffer.byteLength<=80*1000*1000);
 assert.equal(data[0],0x7e);assert.equal(data[data.length-1],0xa7);
 assert.throws(()=>packFiles([{name:'bad.zip',data:new Uint8Array(5*1024*1024+1)}],'ide'),/5 MiB/);
});
