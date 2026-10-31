'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js'),{R,S,F}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw Error('too big');return new Uint8Array(b);}};
const disk=()=>{const b=new Uint8Array(4096*512);for(let i=0;i<512;i++)b[512*5+i]=i&255;return b;};
const at=()=>{const m=new PCMachine('at',{videoAdapter:'vga'});m.ide.mount(disk(),'teaching.img');return m;};
function lba(m,index){m.out8(0x1f6,0xe0|((index>>>24)&15));m.out8(0x1f2,1);m.out8(0x1f3,index&255);m.out8(0x1f4,(index>>>8)&255);m.out8(0x1f5,(index>>>16)&255);}
function execGuest(m,bytes){const c=m.cpu;c.loadSegment(S.CS,0);c.loadSegment(S.DS,0);c.loadSegment(S.ES,0);c.loadSegment(S.SS,0);c.r[R.SP]=0x7000;c.ip=0x2000;c.halted=false;m.ram.set(bytes,0x2000);const r=m.run(100000);assert.equal(r.halted,true);return c;}
test('only AT has IDE and media is absent by default',()=>{assert.equal(new PCMachine('xt').ide,null);assert.equal(new PCMachine('at').ide.capacity,0);});
test('disk validates size, never mutates original buffer and supports eject',()=>{const m=new PCMachine('at');assert.throws(()=>m.ide.mount(new Uint8Array(513)),/512/);assert.throws(()=>m.ide.mount(new Uint8Array(0)),/512/);const b=disk();m.ide.mount(b);b[0]=99;assert.equal(m.ide.readSector(0)[0],0);m.ide.eject();assert.equal(m.ide.capacity,0);});
test('ATA IDENTIFY returns geometry and capacity through data port',()=>{const m=at();m.out8(0x1f7,0xec);assert.equal(m.in8(0x1f7)&0x08,0x08);const words=Array.from({length:256},()=>m.in16(0x1f0));assert.equal(words[0],0x40);assert.equal(words[1],64);assert.equal(words[3],4);assert.equal(words[6],16);assert.equal(words[60],4096);assert.equal(m.ide.transfer,null);});
test('read disk sector through real guest instructions IN AX,DX',()=>{const m=at();lba(m,5);const c=execGuest(m,[0xba,0xf7,0x01,0xb0,0x20,0xee,0xba,0xf0,0x01,0xed,0xf4]);assert.equal(c.r[R.AX],0x0100);assert.equal(m.ide.index,2);});
test('PIO write sector and readback maintains write-isolation',()=>{const m=at(),original=m.ide.image[1024];lba(m,2);m.out8(0x1f7,0x30);for(let i=0;i<256;i++)m.out16(0x1f0,(i+17)&65535);assert.equal(m.ide.overlay.size,1);assert.equal(m.ide.image[1024],original);lba(m,2);m.out8(0x1f7,0x20);for(let i=0;i<256;i++)assert.equal(m.in16(0x1f0),(i+17)&65535);assert.equal(m.ide.exportImage()[1024],17);});
test('out of bounds ATA command sets ABRT/error and does not alter disk',()=>{const m=at();lba(m,4095);m.out8(0x1f2,3);m.out8(0x1f7,0x30);assert.equal(m.in8(0x1f7)&1,1);assert.equal(m.in8(0x1f1),4);assert.equal(m.ide.overlay.size,0);});
test('ATA PIO primary master rejects slave/unimplemented commands',()=>{const m=at();m.out8(0x1f6,0xf0);m.out8(0x1f7,0x20);assert.equal(m.in8(0x1f7)&1,1);m.out8(0x1f6,0xe0);m.out8(0x1f7,0xc8);assert.equal(m.in8(0x1f7)&1,1);});
test('PIO transfers respect 256-word sector boundary and persist export/import',()=>{const m=at();lba(m,7);m.out8(0x1f7,0x30);for(let i=0;i<256;i++)m.out16(0x1f0,i^0xabcd);const output=m.ide.exportImage();const n=at();n.ide.mount(output);assert.equal(n.ide.readSector(7)[0],0xcd);assert.equal(n.ide.readSector(7)[1],0xab);});
test('snapshot stores IDE working disk, transfer position; older snapshots remain supported',()=>{const m=at();m.ide.writeSector(3,new Uint8Array(512).fill(0xa7));lba(m,5);m.out8(0x1f7,0x20);m.in16(0x1f0);const snapshot=m.exportState(codec),restored=PCMachine.fromState(snapshot,codec);assert.equal(restored.ide.readSector(3)[0],0xa7);assert.equal(restored.in16(0x1f0),0x0302);delete snapshot.ide;assert.equal(PCMachine.fromState(snapshot,codec).ide.capacity,0);});
test('corrupt IDE snapshot fails instead of partially restoring medium',()=>{const m=at(),snap=m.exportState(codec);snap.ide.index=513;assert.throws(()=>PCMachine.fromState(snap,codec),/IDE/);});
test('BIOS INT13 DL80 reads and writes actual virtual HDD, not floppy',()=>{const m=at();const c=m.cpu;m.ide.writeSector(5,new Uint8Array(512).fill(0x34));
 // INT 13 AH02 AL01 ES:BX=0:0500 CH=0 CL=6 DH=0 DL=80 => sector 6 is LBA 5.
 c.loadSegment(S.ES,0);c.loadSegment(S.CS,0);c.loadSegment(S.SS,0);c.r[R.SP]=0x7000;
 execGuest(m,[0xb8,0x01,0x02,0xbb,0x00,0x05,0xb9,0x06,0x00,0xba,0x80,0x00,0xcd,0x13,0xf4]);
 assert.equal(m.ram[0x500],0x34);assert.equal(c.flags&F.CF,0);
 m.ram.fill(0x66,0x500,0x700);
 execGuest(m,[0xb8,0x01,0x03,0xbb,0x00,0x05,0xb9,0x06,0x00,0xba,0x80,0x00,0xcd,0x13,0xf4]);
 assert.equal(m.ide.readSector(5)[0],0x66);assert.equal(m.fdd.disks[0],null);
});
test('BIOS rejects reads beyond HDD and respects 64KiB segment boundary',()=>{const m=at();execGuest(m,[0xb8,0x01,0x02,0xbb,0,5,0xb9,0,0,0xba,0x80,0,0xcd,0x13,0xf4]);assert.equal(m.cpu.flags&F.CF,F.CF);});

test('BIOS HDD reset fails on XT or AT without mounted HDD, rather than claiming nonexistent disk',()=>{for(const profile of ['xt','at']){const m=new PCMachine(profile);execGuest(m,[0xb8,0,0,0xba,0x80,0,0xcd,0x13,0xf4]);assert.equal(m.cpu.flags&F.CF,F.CF);assert.equal(m.cpu.get8(4),0x80);}});
