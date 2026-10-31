'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createFloppy,createIDE,copyBytes,FLOPPY}=require('../PC-Disk-Images.js');
const {PCMachine}=require('../PC-Machine.js');
const rd16=(v,o)=>v[o]|(v[o+1]<<8),rd32=(v,o)=>(v[o]|(v[o+1]<<8)|(v[o+2]<<16)|(v[o+3]<<24))>>>0;
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(b,max)=>{const raw=Buffer.from(b,'base64');if(raw.length>max)throw Error('oversize');return new Uint8Array(raw);}};
for(const [type,g] of Object.entries(FLOPPY)){
 test(`ArrayBuffer FDD ${type}: FAT12 BPB/FAT copies, usable in XT and AT`,()=>{
  const buffer=createFloppy(type);assert.ok(buffer instanceof ArrayBuffer);assert.equal(buffer.byteLength,g.size);
  const b=new Uint8Array(buffer),v=new DataView(buffer),sectors=g.size/512;
  assert.equal(rd16(b,510),0xaa55);assert.equal(rd16(b,11),512);assert.equal(b[13],g.spc);
  assert.equal(b[16],2);assert.equal(rd16(b,19),sectors);assert.equal(b[21],g.media);
  const fats=rd16(b,22),f1=512,f2=(1+fats)*512;
  assert.equal(b[f1],g.media);assert.equal(b[f2],g.media);assert.equal(b[f1+1],255);assert.equal(b[f1+2],255);
  assert.equal(rd16(b,24),g.s);assert.equal(rd16(b,26),g.h);
  const root=(1+fats*2)*512,end=Math.min(b.length,root+32);assert.ok(b.slice(root,end).every(x=>x===0));
  const m=new PCMachine('xt');m.mountDisk(1,buffer,type+'.img');assert.equal(m.fdd.disks[1].geometry.type,type);
  b[512]=42;assert.equal(m.fdd.disks[1].data[512],g.media,'mount must isolate original');
  const m2=new PCMachine('at');m2.mountDisk(1,buffer);assert.equal(m2.fdd.disks[1].data.byteLength,g.size);
 });
}
for(const megs of [8,16,32]){
 test(`ArrayBuffer IDE ${megs}MiB: valid MBR + FAT16 partition and FAT entries`,()=>{
  const arr=createIDE(megs);assert.ok(arr instanceof ArrayBuffer);assert.equal(arr.byteLength,megs*1048576);
  const b=new Uint8Array(arr),lba=rd32(b,454),count=rd32(b,458),fatBase=lba*512;
  assert.equal(rd16(b,510),0xaa55);assert.equal(b[450],0x06);assert.equal(lba,63);
  assert.equal(count,arr.byteLength/512-lba);assert.equal(rd16(b,fatBase+510),0xaa55);
  const mbrCHS=(pos)=>((b[pos+1]&63)-1)+16*b[pos]+64*(b[pos+2]|((b[pos+1]&0xc0)<<2));
  assert.equal(mbrCHS(447),lba,'partition CHS start and LBA must agree');
  assert.equal(mbrCHS(451),arr.byteLength/512-1,'partition CHS end and disk size must agree');
  assert.equal(rd16(b,fatBase+11),512);assert.equal(rd32(b,fatBase+28),63);
  assert.equal(b[fatBase+13],2);assert.equal(b[fatBase+16],2);
  const fats=rd16(b,fatBase+22),fat1=fatBase+512,fat2=fatBase+(1+fats)*512;
  assert.ok(fats>0);assert.deepEqual([...b.slice(fat1,fat1+4)],[0xf8,0xff,0xff,0xff]);
  assert.deepEqual([...b.slice(fat2,fat2+4)],[0xf8,0xff,0xff,0xff]);
  const m=new PCMachine('at');m.ide.mount(arr);assert.equal(m.ide.capacity,arr.byteLength/512);
  assert.equal(m.ide.readSector(0)[450],6);assert.equal(m.ide.readSector(63)[510],0x55);
 });
}
test('FDD changes export as copy; save/reload does not mutate previous ArrayBuffer',()=>{
 const original=createFloppy('720K'),m=new PCMachine('xt');m.fdd.mount(0,original);
 const sector=new Uint8Array(512).fill(0xa5);assert.equal(m.fdd.writeSector(0,0,0,3,sector),true);
 const saved=m.fdd.exportArrayBuffer(0);assert.ok(saved instanceof ArrayBuffer);
 assert.equal(new Uint8Array(original)[1024],0);assert.equal(new Uint8Array(saved)[1024],0xa5);
 new Uint8Array(saved)[1024]=0x77;assert.equal(m.fdd.readSector(0,0,0,3)[0],0xa5);
 const n=new PCMachine('at');n.fdd.mount(0,saved);assert.equal(n.fdd.readSector(0,0,0,3)[0],0x77);
});
test('IDE write overlay survives export/restore and base ArrayBuffer stays unchanged',()=>{
 const original=createIDE(8),m=new PCMachine('at');m.ide.mount(original);const sec=new Uint8Array(512).fill(0x71);
 m.ide.writeSector(200,sec);assert.equal(m.ide.image[200*512],0);assert.equal(new Uint8Array(original)[200*512],0);
 const saved=m.ide.exportArrayBuffer();assert.ok(saved instanceof ArrayBuffer);
 const n=new PCMachine('at');n.ide.mount(saved);assert.equal(n.ide.readSector(200)[0],0x71);assert.equal(n.ide.readSector(63)[510],0x55);
 n.ide.writeSector(200,new Uint8Array(512).fill(0xaa));assert.equal(m.ide.readSector(200)[0],0x71);
});
test('snapshot round-trip preserves FDD A/B and IDE contents and custom medium',()=>{
 const m=new PCMachine('at',{videoAdapter:'vga'});m.mountDisk(0,createFloppy('720K'),'A-blank.img');m.mountDisk(1,createFloppy('360K'),'B-blank.img');m.ide.mount(createIDE(8),'MY-HDD.img');
 m.fdd.writeSector(1,0,0,2,new Uint8Array(512).fill(0x92));m.ide.writeSector(66,new Uint8Array(512).fill(0x11));
 const snap=m.exportState(codec),n=PCMachine.fromState(snap,codec);
 assert.equal(n.fdd.disks[0].name,'A-blank.img');assert.equal(n.fdd.disks[1].name,'B-blank.img');
 assert.equal(n.fdd.readSector(1,0,0,2)[4],0x92);assert.equal(n.ide.readSector(66)[200],0x11);
 assert.equal(n.ide.name,'MY-HDD.img');assert.equal(n.ide.capacity,16384);
});
test('malformed, oversized media and unmounted export reject safely',()=>{
 assert.throws(()=>copyBytes(new Uint8Array(513)),/512-byte/);
 assert.throws(()=>createFloppy('2.88M'),/Unsupported/);assert.throws(()=>createIDE(81),/presets/);
 const m=new PCMachine('at');assert.throws(()=>m.fdd.exportArrayBuffer(0),/No floppy/);
 assert.throws(()=>m.ide.exportArrayBuffer(),/No IDE/);
 assert.throws(()=>m.ide.mount(new ArrayBuffer(513)),/512/);
 assert.throws(()=>m.fdd.mount(0,new ArrayBuffer(513)),/Unsupported/);
});
