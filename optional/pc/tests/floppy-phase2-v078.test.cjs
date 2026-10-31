const {test}=require('node:test');const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');const {R,S,F}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(b,max)=>{const x=new Uint8Array(Buffer.from(b,'base64'));if(x.length>max)throw Error('oversize');return x;}};
function makeDisk(){const d=new Uint8Array(720*1024);for(let i=0;i<512;i++)d[i]=(i*3+1)&255;d[510]=0x55;d[511]=0xaa;return d;}
function callDisk(m,ah,al,cx=1,dx=0,bx=0x1000){const c=m.cpu;c.loadSegment(S.CS,0);c.ip=0x2000;c.loadSegment(S.DS,0);c.loadSegment(S.SS,0);c.loadSegment(S.ES,0);c.r[R.SP]=0x7000;c.halted=false;
 c.r[R.CX]=cx;c.r[R.DX]=dx;c.r[R.BX]=bx;
 m.ram.set([0xb8,al,ah,0xcd,0x13,0xf4],0x2000);const r=m.run(70);assert.equal(r.halted,true);return c;}
for(const p of ['xt','at']){
 test(`${p}: floppy mount validates geometry & keeps installed RAM < 1MiB`,()=>{
  const m=new PCMachine(p);const g=m.mountDisk(0,makeDisk(),'A.IMA');
  assert.equal(g.sectors,9);assert.equal(g.heads,2);assert.equal(g.cylinders,80);
  assert.equal(m.fdd.disks[0].data.length,737280);
  assert.throws(()=>m.mountDisk(1,new Uint8Array(513)),/Unsupported/);
  assert.equal(m.conventional+m.extended,p==='xt'?640*1024:1024*1024);
 });
 test(`${p}: BIOS INT13 reads, writes, verifies and reports CHS geometry`,()=>{
  const m=new PCMachine(p);m.mountDisk(0,makeDisk());
  let c=callDisk(m,2,1);assert.equal(c.flags&F.CF,0);assert.equal(c.get8(4),0);
  assert.equal(m.read8(0x1000),1);assert.equal(m.read8(0x1000+510),0x55);
  m.write8(0x1000,0x67);c=callDisk(m,3,1);assert.equal(c.flags&F.CF,0);
  assert.equal(m.fdd.readSector(0,0,0,1)[0],0x67);
  c=callDisk(m,4,1);assert.equal(c.flags&F.CF,0);
  c=callDisk(m,8,0);assert.equal(c.get8(4),0);assert.equal(c.get8(1)&63,9);assert.equal(c.get8(6),1);
 });
 test(`${p}: BIOS INT13 fails on absent drive, invalid CHS, DMA boundary`,()=>{
  const m=new PCMachine(p);m.mountDisk(0,makeDisk());
  let c=callDisk(m,2,1,1,1);assert.ok(c.flags&F.CF);assert.equal(c.get8(4),0x80);
  c=callDisk(m,2,1,0,0);assert.ok(c.flags&F.CF);assert.equal(c.get8(4),4);
  c=callDisk(m,2,2,1,0,0xff00);assert.ok(c.flags&F.CF);assert.equal(c.get8(4),9);
 });
 test(`${p}: real 765 floppy I/O port + DMA2 transfers and asserts IRQ6`,()=>{
  const m=new PCMachine(p);m.mountDisk(0,makeDisk());m.pic.mask=~(1<<6)&255;
  m.dma.addr[2]=0x1200;m.dma.count[2]=511;m.dma.page[2]=0;m.dma.mask&=~4;m.out8(0x0b,0x46);
  m.out8(0x3f2,0x1c);m.out8(0x81,0);
  for(const b of [0x46,0,0,0,1,2,9,0x1b,0xff])m.out8(0x3f5,b);
  assert.equal(m.read8(0x1200),1);assert.equal(m.read8(0x1200+510),0x55);
  assert.equal(m.pic.pending(),6);
  assert.equal(m.in8(0x3f4),0xd0);assert.deepEqual(Array.from({length:7},()=>m.in8(0x3f5)),[0,0,0,0,0,1,2]);
 });
 test(`${p}: guest boot sector at 0000:7C00 runs real INT10 then HLT`,()=>{
  const m=new PCMachine(p);const disk=makeDisk();disk.fill(0,0,512);
  const prog=[0xfa,0xb8,0,0,0x8e,0xd0,0xbc,0,0x7c,0xfb,0xb8,0x42,0x0e,0xcd,0x10,0xf4];
  disk.set(prog);disk[510]=0x55;disk[511]=0xaa;m.mountDisk(0,disk);
  assert.deepEqual(m.bootFloppy(0),{cs:0,ip:0x7c00,drive:0});
  assert.equal(m.run(100).halted,true);assert.equal(m.video.readCell(0,0).char,0x42);
 });
 test(`${p}: guest INT19 bootstraps A: through BIOS callback`,()=>{
  const m=new PCMachine(p),disk=new Uint8Array(720*1024);
  disk.set([0xb8,0x51,0x0e,0xcd,0x10,0xf4]);disk[510]=0x55;disk[511]=0xaa;
  m.mountDisk(0,disk);const c=m.cpu;
  c.loadSegment(S.CS,0);c.ip=0x2200;c.loadSegment(S.SS,0);c.r[R.SP]=0x7000;
  m.ram.set([0xcd,0x19,0xf4],0x2200);
  assert.equal(m.run(150).halted,true);
  assert.equal(m.video.readCell(0,0).char,0x51);
  assert.ok(m.biosCalls.includes(0x19));
 });
 test(`${p}: JSON snapshot includes mounted floppy bytes`,()=>{
  const m=new PCMachine(p);m.mountDisk(0,makeDisk());m.fdd.writeSector(0,0,0,2,new Uint8Array(512).fill(0x5b));
  const after=PCMachine.fromState(m.exportState(codec),codec);
  assert.equal(after.fdd.readSector(0,0,0,2)[500],0x5b);
  assert.equal(after.fdd.disks[1],null);
 });
}
