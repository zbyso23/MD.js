const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine,PIC8259,PIT8253,DMA8237}=require('../PC-Machine.js');
const {R,S,F,CPUFault}=require('../PC-Core.js');
function program(p,bytes,addr=0x2000){const m=new PCMachine(p);m.cpu.loadSegment(S.CS,0);m.cpu.ip=addr;m.cpu.loadSegment(S.DS,0);m.cpu.loadSegment(S.SS,0);m.cpu.r[R.SP]=0x7000;m.ram.set(bytes,addr);return m;}
function pmSetup(){
 const m=program('at',[0x0f,0x01,0x16,0,7,0xb8,1,0,0x0f,0x01,0xf0,0xea,0,0,8,0]);
 // GDTR limit=23 base=0x800; descriptor #1 protected executable at phys 0x3000
 m.ram.set([23,0,0,8,0,0],0x700);
 m.ram.set([0xff,0xff,0,0x30,0,0x9a,0,0],0x808);
 m.ram.set([0xb8,0x34,0x12,0xf4],0x3000);
 return m;
}
for(const p of ['xt','at']){
 test(`${p}: reset ROM has far jump and boots BIOS stubs`,()=>{
  const m=new PCMachine(p),first=m.cpu.physical(S.CS,m.cpu.ip);
  assert.equal(m.read8(first),0xea);
  assert.equal(m.run(100).halted,true);assert.equal(m.cpu.r[R.AX],640);
  assert.deepEqual(m.biosCalls,[0x11,0x12]);assert.equal(m.read16Physical(0x413),640);
  assert.equal(m.cpu.s[S.CS],0xf000);
 });
 test(`${p}: arithmetic, flags and conditional branch execute`,()=>{
  const m=program(p,[0xb8,5,0,0x05,3,0,0x3d,8,0,0x75,4,0xbb,0x34,0x12,0xf4]);
  m.run();assert.equal(m.cpu.reg('AX'),8);assert.equal(m.cpu.reg('BX'),0x1234);assert.ok(m.cpu.flags&F.ZF);
 });
 test(`${p}: memory store/load and ROM write protection`,()=>{
  const m=program(p,[0xb8,0x88,0x77,0xa3,0,4,0xb8,0,0,0xa1,0,4,0xf4]);
  m.run();assert.equal(m.cpu.reg('AX'),0x7788);assert.equal(m.read16Physical(0x400),0x7788);
  const x=m.read8(0xf0100);m.write8(0xf0100,7);assert.equal(m.read8(0xf0100),x);
 });
 test(`${p}: INT pushes frame and executes BIOS IRET`,()=>{
  const m=program(p,[0xb8,0,0,0xcd,0x12,0xbb,0x55,0x44,0xf4]);
  m.write16Physical(0x413,640); // BDA initialized by firmware during normal reset boot
  m.run();assert.equal(m.cpu.reg('AX'),640);assert.equal(m.cpu.reg('BX'),0x4455);assert.equal(m.cpu.reg('SP'),0x7000);
 });
 test(`${p}: instructions for port IO reach physical PIC`,()=>{
  const m=program(p,[0xb0,0xfe,0xe6,0x21,0xe4,0x21,0xf4]);
  m.run();assert.equal(m.pic.mask,254);assert.equal(m.cpu.get8(0),254);
 });
 test(`${p}: unsupported instruction traps, no fake success`,()=>{
  const m=program(p,[0xf1]);assert.throws(()=>m.run(),CPUFault);
 });
}
test('XT cannot execute 286 opcodes',()=>assert.throws(()=>program('xt',[0x0f,0x01,0xf0]).run(),/286 instruction/));
test('AT 286 executes LGDT, LMSW and far JMP through GDT',()=>{
 const m=pmSetup(),res=m.run(100);
 assert.equal(res.halted,true);assert.equal(m.cpu.protected,true);
 assert.deepEqual(m.cpu.gdtr,{base:0x800,limit:23});
 assert.equal(m.cpu.s[S.CS],8);assert.equal(m.cpu.base[S.CS],0x3000);
 assert.equal(m.cpu.reg('AX'),0x1234);
});
test('AT 286 rejects absent executable segment',()=>{
 const m=pmSetup();m.ram[0x80d]=0x12;
 assert.throws(()=>m.run(100),/not present/);
});
test('AT 286 enforces segment limit',()=>{
 const m=pmSetup();m.ram[0x808]=1;m.ram[0x809]=0;
 assert.throws(()=>m.run(100),/Segment limit exceeded/);
});
test('AT 286 reset hidden CS base differs from XT',()=>{
 const x=new PCMachine('xt'),a=new PCMachine('at');
 assert.equal(x.cpu.base[S.CS],0xf0000);assert.equal(a.cpu.base[S.CS],0xff0000);
 assert.equal(x.cpu.ip,0xfff0);assert.equal(a.cpu.ip,0xfff0);
 assert.equal(x.read8(x.cpu.physical(S.CS,x.cpu.ip)),0xea);
 assert.equal(a.read8(a.cpu.physical(S.CS,a.cpu.ip)),0xea);
});
test('AT A20 routes 1 MiB address either to low RAM or installed extended RAM',()=>{
 const m=new PCMachine('at');m.write8(0,0x12);m.write8(0x100000,0x23);
 assert.equal(m.read8(0),0x23);
 m.out8(0x92,2);assert.equal(m.a20,true);
 m.write8(0x100000,0x34);assert.equal(m.read8(0),0x23);assert.equal(m.read8(0x100000),0x34);
 m.out8(0x64,0xd1);m.out8(0x60,0);assert.equal(m.a20,false);
});
test('AT BIOS INT 15 AH=88 reports 384 KiB extended',()=>{
 const m=program('at',[0xb8,0,0x88,0xcd,0x15,0xf4]);
 m.run();assert.equal(m.cpu.reg('AX'),384);
});
test('hard cap: neither XT nor AT may allocate >1 MiB installed RAM',()=>{
 assert.throws(()=>new PCMachine('at',{conventional:640*1024,extended:385*1024}),/maximum/);
 assert.throws(()=>new PCMachine('xt',{conventional:640*1024,extended:1024}),/maximum/);
 assert.throws(()=>new PCMachine('at',{conventional:641*1024,extended:0}),/maximum/);
 assert.equal(new PCMachine('at').conventional+new PCMachine('at').extended,1024*1024);
});
test('AT memory hole does not silently become RAM',()=>{
 const m=new PCMachine('at');m.write8(0xb0000,0x98);assert.equal(m.read8(0xb0000),0xff);
 m.a20=true;m.write8(0x160000,0xab);assert.equal(m.read8(0x160000),0xff);
});
test('PIC masking, request, ack and EOI',()=>{
 const p=new PIC8259();p.mask=0xfc;p.request(1);assert.equal(p.pending(),1);
 assert.equal(p.acknowledge(),9);assert.equal(p.isr,2);p.writeCommand(0x20);assert.equal(p.isr,0);
 p.mask=0xff;p.request(0);assert.equal(p.pending(),-1);
});
test('PIT channel 0 asserts IRQ0 after reload count',()=>{
 const m=new PCMachine('xt');m.pic.mask=0xfe;
 m.out8(0x43,0x34);m.out8(0x40,10);m.out8(0x40,0);
 m.pit.advance(9);assert.equal(m.pic.pending(),-1);
 m.pit.advance(1);assert.equal(m.pic.pending(),0);
});
test('DMA channel registers and flip-flop',()=>{
 const d=new DMA8237();d.write(0x0c,0);d.write(2,0x34);d.write(2,0x12);
 d.write(3,0x78);d.write(3,0x56);assert.equal(d.addr[1],0x1234);assert.equal(d.count[1],0x5678);
 d.write(0x0a,1);assert.equal(d.mask&2,0);d.write(0x0a,5);assert.equal(d.mask&2,2);
});
test('AT CMOS port select/data, XT no CMOS',()=>{
 const a=new PCMachine('at');a.out8(0x70,0x10);a.out8(0x71,0x55);
 assert.equal(a.in8(0x71),0x55);assert.equal(new PCMachine('xt').in8(0x71),0xff);
});
test('keyboard scancode injection requests PIC IRQ1',()=>{
 const m=new PCMachine('at');m.pic.mask=0xfd;m.injectScancode(0x1e);
 assert.equal(m.in8(0x64)&1,1);assert.equal(m.in8(0x60),0x1e);assert.equal(m.pic.pending(),1);
});
test('multiple simultaneous PCs have isolated RAM, chipset and CPU state',()=>{
 const a=new PCMachine('at'),b=new PCMachine('at');a.ram[0x500]=0x66;a.out8(0x21,7);
 assert.equal(b.ram[0x500],0);assert.equal(b.in8(0x21),0xff);
});
