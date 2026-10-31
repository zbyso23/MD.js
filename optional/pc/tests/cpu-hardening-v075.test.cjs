'use strict';
// Direct execution in unbundled browser-compatible JS. No mocks of CPU instructions.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PCMachine}=require('../PC-Machine.js');
const {R,S,F,CPUFault}=require('../PC-Core.js');
function boot(profile,code){const m=new PCMachine(profile),c=m.cpu;c.loadSegment(S.CS,0);c.ip=0x2000;for(const x of [S.SS,S.ES,S.DS])c.loadSegment(x,0);c.r[R.SP]=0x8000;m.ram.set(code,0x2000);return m;}
function exec(profile,code,max=100){const m=boot(profile,code);m.run(max);assert.equal(m.cpu.halted,true,`Program didn't halt: ${profile}`);return m;}
function desc(m,sel,base,limit,access){const a=0x500+(sel&~7);m.ram.set([limit&255,limit>>>8,base&255,(base>>>8)&255,(base>>>16)&255,access,0,0],a);}
function pm(profile='at'){const m=boot(profile,[0xf4]);m.cpu.gdtr={base:0x500,limit:0x80};m.cpu.msw=1;return m;}
for(const profile of ['xt','at']){
 test(`${profile} CBW sign extends AL without touching flags`,()=>{const m=exec(profile,[0xb0,0x81,0x98,0xf4]);assert.equal(m.cpu.r[R.AX],0xff81);});
 test(`${profile} CWD sign extends AX into DX`,()=>{const m=exec(profile,[0xb8,0,0x80,0x99,0xf4]);assert.equal(m.cpu.r[R.DX],0xffff);});
 test(`${profile} AAM and AAD support explicit decimal base`,()=>{const m=exec(profile,[0xb0,45,0xd4,10,0xd5,10,0xf4]);assert.equal(m.cpu.r[R.AX],45);});
 test(`${profile} AAM zero base raises guest #DE`,()=>{const m=boot(profile,[0xb0,55,0xd4,0,0xf4]);m.write16Physical(0,0x2400);m.write16Physical(2,0);m.ram[0x2400]=0xf4;m.run(6);assert.equal(m.cpu.lastFault.vector,0);assert.equal(m.cpu.halted,true);});
 test(`${profile} XLAT loads table at DS:BX+AL`,()=>{const m=boot(profile,[0xbb,0,3,0xb0,3,0xd7,0xf4]);m.ram[0x303]=0xc5;m.run(10);assert.equal(m.cpu.get8(0),0xc5);});
 test(`${profile} XLAT honours CS override`,()=>{const m=boot(profile,[0xbb,0,3,0xb0,1,0x2e,0xd7,0xf4]);m.ram[0x301]=0x43;m.run(10);assert.equal(m.cpu.get8(0),0x43);});
 test(`${profile} AAA adjusts decimal digit and AF/CF`,()=>{const m=exec(profile,[0xb8,0x0b,0,0x37,0xf4]);assert.equal(m.cpu.r[R.AX],0x0101);assert.ok(m.cpu.flags&F.AF);assert.ok(m.cpu.flags&F.CF);});
 test(`${profile} AAS adjusts decimal digit and AF/CF`,()=>{const m=exec(profile,[0xb8,0x0b,2,0x3f,0xf4]);assert.equal(m.cpu.r[R.AX],0x0105);assert.ok(m.cpu.flags&F.AF);assert.ok(m.cpu.flags&F.CF);});
 test(`${profile} DAA corrects packed BCD 09+09 = 18`,()=>{const m=exec(profile,[0xb0,9,0x04,9,0x27,0xf4]);assert.equal(m.cpu.get8(0),0x18);});
 test(`${profile} DAS corrects packed BCD 20-01 = 19`,()=>{const m=exec(profile,[0xb0,0x20,0x2c,1,0x2f,0xf4]);assert.equal(m.cpu.get8(0),0x19);});
 test(`${profile} WAIT without FPU proceeds; INTO with clear OF proceeds`,()=>{const m=exec(profile,[0x9b,0xce,0xf4]);assert.equal(m.cpu.lastFault,null);});
 test(`${profile} INTO with OF vectors guest INT 4`,()=>{const m=boot(profile,[0xb8,0xff,0x7f,0x05,1,0,0xce,0xf4]);m.write16Physical(16,0x2400);m.write16Physical(18,0);m.ram[0x2400]=0xcf;m.run(20);assert.equal(m.cpu.halted,true);assert.ok(m.cpu.flags&F.OF);});
 test(`${profile} LES loads far pointer and ES segment`,()=>{const m=boot(profile,[0xc4,0x06,0x00,0x03,0xf4]);m.ram.set([0x34,0x12,0x60,0x00],0x300);m.run(10);assert.equal(m.cpu.r[R.AX],0x1234);assert.equal(m.cpu.s[S.ES],0x60);});
 test(`${profile} LDS loads far pointer and DS segment`,()=>{const m=boot(profile,[0xc5,0x1e,0x00,0x03,0xf4]);m.ram.set([0x78,0x56,0x70,0x00],0x300);m.run(10);assert.equal(m.cpu.r[R.BX],0x5678);assert.equal(m.cpu.s[S.DS],0x70);});
 test(`${profile} LES register form rejected`,()=>{const m=boot(profile,[0xc4,0xc0]);assert.throws(()=>m.cpu.step(),/memory operand/);});
}
test('286 IMUL immediate forms calculate signed product and flags',()=>{
 const m=exec('at',[0xbb,0xfe,0xff,0x6b,0xc3,3,0x69,0xd3,0x00,0x40,0xf4]);
 assert.equal(m.cpu.r[R.AX],0xfffa);assert.equal(m.cpu.r[R.DX],0x8000);assert.ok(!(m.cpu.flags&F.CF));
});
test('286 IMUL overflow sets CF and OF',()=>{const m=exec('at',[0xbb,0x00,0x40,0x6b,0xc3,4,0xf4]);assert.equal(m.cpu.r[R.AX],0);assert.ok(m.cpu.flags&F.CF);assert.ok(m.cpu.flags&F.OF);});
test('8086 rejects later immediate IMUL',()=>{const m=boot('xt',[0x6b,0xc3,3]);assert.throws(()=>m.cpu.step(),/not available on XT/);});
test('286 REP OUTSB calls actual machine port with DS:SI bytes',()=>{
 const m=boot('at',[0xb9,3,0,0xbe,0x00,0x03,0xba,0x61,0,0xf3,0x6e,0xf4]);m.ram.set([2,3,4],0x300);m.run(20);
 assert.equal(m.kbcOutput,4);assert.equal(m.cpu.r[R.CX],0);assert.equal(m.cpu.r[R.SI],0x303);
});
test('286 REP INSB calls actual machine port and writes ES:DI',()=>{
 const m=boot('at',[0xb9,3,0,0xbf,0x00,0x03,0xba,0x92,0,0xf3,0x6c,0xf4]);m.run(20);
 assert.deepEqual([...m.ram.slice(0x300,0x303)],[0,0,0]);assert.equal(m.cpu.r[R.DI],0x303);
});
test('8086 rejects INS/OUTS opcodes (introduced in 80186)',()=>{const m=boot('xt',[0x6c]);assert.throws(()=>m.cpu.step(),/Unsupported xt opcode/);});
test('286 entering protected mode retains real-mode SS hidden descriptor cache',()=>{
 const m=boot('at',[0xf4]);m.cpu.msw=1;m.cpu.push(0x1234);assert.equal(m.cpu.pop(),0x1234);
});
test('286 loading a null selector allows DS load but rejects subsequent memory read',()=>{
 const m=pm();m.cpu.loadSegment(S.DS,0);assert.throws(()=>m.cpu.read8(S.DS,0),/null data/);
});
test('286 rejects null SS selector',()=>{const m=pm();assert.throws(()=>m.cpu.loadSegment(S.SS,0),/null selector/);});
test('286 read-only data descriptor allows reads, denies writes',()=>{
 const m=pm();desc(m,8,0x300,0xff,0x90);m.ram[0x300]=0x42;
 m.cpu.loadSegment(S.DS,8);assert.equal(m.cpu.read8(S.DS,0),0x42);
 assert.throws(()=>m.cpu.write8(S.DS,0,0xaa),/non-writable/);assert.equal(m.ram[0x300],0x42);
});
test('286 expand-down data segment rejects <=limit and allows higher offsets',()=>{
 const m=pm();desc(m,8,0,0x200,0x96);m.cpu.loadSegment(S.DS,8);
 assert.throws(()=>m.cpu.read8(S.DS,0x200),/Segment limit exceeded/);m.ram[0x201]=0x98;
 assert.equal(m.cpu.read8(S.DS,0x201),0x98);
});
test('286 DPL data access rejects selector RPL greater than DPL',()=>{
 const m=pm();desc(m,8,0,0xffff,0x92);
 assert.throws(()=>m.cpu.loadSegment(S.DS,11),/privilege violation/);
});
test('286 ring0 cannot load ring3 SS descriptor',()=>{
 const m=pm();desc(m,8,0,0xffff,0xf2);
 assert.throws(()=>m.cpu.loadSegment(S.SS,8),/stack selector privilege/);
});
test('286 CS must be executable, not a data descriptor',()=>{
 const m=pm();desc(m,8,0,0xffff,0x92);
 assert.throws(()=>m.cpu.loadSegment(S.CS,8),/not executable/);
});
test('286 protected word write crossing descriptor limit is atomic (no partial store)',()=>{
 const m=pm();desc(m,8,0x300,0x10,0x92);m.cpu.loadSegment(S.DS,8);m.ram[0x310]=0x44;
 assert.throws(()=>m.cpu.write16(S.DS,0x10,0xbeef),/Segment limit exceeded/);assert.equal(m.ram[0x310],0x44);
});
test('286 cannot write to readable code segment via DS',()=>{
 const m=pm();desc(m,8,0x300,0xffff,0x9a);m.cpu.loadSegment(S.DS,8);
 assert.throws(()=>m.cpu.write8(S.DS,1,7),/non-writable/);
});
test('RAM cap remains exactly 1 MiB max and runtime has no WASM',()=>{
 const m=new PCMachine('at');assert.equal(m.conventional+m.extended,1024*1024);
 const src=fs.readFileSync(require.resolve('../PC-Core.js'),'utf8');assert.doesNotMatch(src,/WebAssembly|\.wasm|emscripten|eval\s*\(/);
});
const {PIC8259}=require('../PC-Machine.js');
test('PIC ICW1/2/3/4 sequence correctly initializes vector, mask and auto-EOI',()=>{
 const pic=new PIC8259();pic.writeCommand(0x11);pic.writeData(0x20);pic.writeData(0x04);pic.writeData(0x03);
 assert.equal(pic.vector,0x20);assert.equal(pic.autoEOI,true);pic.writeData(0);pic.request(5);
 assert.equal(pic.acknowledge(),0x25);assert.equal(pic.isr,0);
});
test('PIC single-chip initialization skips ICW3 and accepts ICW4',()=>{
 const pic=new PIC8259();pic.writeCommand(0x13);pic.writeData(0x08);pic.writeData(0x01);pic.writeData(0xfe);
 pic.request(0);assert.equal(pic.acknowledge(),8);assert.equal(pic.isr,1);
 pic.writeCommand(0x0b);assert.equal(pic.readCommand(),1);pic.writeCommand(0x20);assert.equal(pic.isr,0);
});
test('PIC in-service IRQ blocks lower priority until EOI',()=>{
 const pic=new PIC8259();pic.mask=0;pic.request(1);assert.equal(pic.acknowledge(),9);
 pic.request(4);assert.equal(pic.pending(),-1);pic.writeCommand(0x20);assert.equal(pic.pending(),4);
});
test('AT has cascade PIC ports while XT does not',()=>{
 const at=new PCMachine('at'),xt=new PCMachine('xt');
 at.out8(0xa1,0xfb);assert.equal(at.in8(0xa1),0xfb);
 assert.equal(xt.in8(0xa1),0xff);assert.equal(xt.picSlave,null);
});
test('AT cascaded IRQ10 delivers vector 72h through master IRQ2',()=>{
 const m=boot('at',[0xf4]);m.cpu.flags|=F.IF;m.pic.mask=0xfb;m.picSlave.mask=0xfb;
 // Install real-mode guest ISR for slave vector 72h.
 m.write16Physical(0x72*4,0x2400);m.write16Physical(0x72*4+2,0);m.ram[0x2400]=0xcf;
 m.requestIRQ(10);assert.equal(m.processIRQ(),true);assert.equal(m.cpu.ip,0x2400);
 assert.equal(m.pic.isr,4);assert.equal(m.picSlave.isr,4);
 m.cpu.step();assert.equal(m.cpu.ip,0x2000);
 m.out8(0xa0,0x20);m.out8(0x20,0x20);
 assert.equal(m.pic.isr,0);assert.equal(m.picSlave.isr,0);
});
test('AT slave IRQ does not bypass masked master cascade IRQ2',()=>{
 const m=boot('at',[0xf4]);m.cpu.flags|=F.IF;m.pic.mask=0xff;m.picSlave.mask=0xfe;
 m.requestIRQ(8);assert.equal(m.processIRQ(),false);assert.equal(m.picSlave.irr,1);
});
test('XT rejects IRQ8 without an AT slave PIC',()=>{
 assert.throws(()=>new PCMachine('xt').requestIRQ(8),/not supported/);
});
for(const profile of ['xt','at']){
 test(`${profile} CALL FAR immediate transfers CS:IP and RETF restores caller`,()=>{
  const m=boot(profile,[0x9a,0,0,0x10,0x01,0xf4]);
  m.ram[0x1010]=0xcb; // far function at 0110:0000 = 0x1100 (not 0x1010)
  m.ram[0x1100]=0xcb;m.run(10);
  assert.equal(m.cpu.halted,true);assert.equal(m.cpu.s[S.CS],0);assert.equal(m.cpu.r[R.SP],0x8000);
 });
}
test('286 ARPL raises operand RPL and sets ZF without changing upper selector bits',()=>{
 const m=boot('at',[0xb8,0x08,0,0xbb,0x0b,0,0x63,0xd8,0xf4]);m.cpu.msw=1;
 m.run(20);assert.equal(m.cpu.r[R.AX],0xb);assert.ok(m.cpu.flags&F.ZF);
});
test('286 ARPL leaves selector unchanged and ZF=0 when destination RPL is high enough',()=>{
 const m=boot('at',[0xb8,0xb,0,0xbb,8,0,0x63,0xd8,0xf4]);m.cpu.msw=1;
 m.run(20);assert.equal(m.cpu.r[R.AX],0xb);assert.equal(m.cpu.flags&F.ZF,0);
});
test('286 ARPL in real mode is not silently accepted',()=>{
 const m=boot('at',[0x63,0xd8]);assert.throws(()=>m.cpu.step(),/requires 286 Protected Mode/);
});
test('286 VERR and VERW inspect selector access rights without modifying GDT',()=>{
 const m=boot('at',[0xb8,8,0,0x0f,0x00,0xe0,0x0f,0x00,0xe8,0xf4]);
 m.cpu.gdtr={base:0x500,limit:0x40};desc(m,8,0x300,0xffff,0x92);m.cpu.msw=1;
 m.cpu.step();m.cpu.step();assert.ok(m.cpu.flags&F.ZF);
 m.cpu.step();assert.ok(m.cpu.flags&F.ZF);
});
test('286 VERW returns ZF=0 for a read-only data segment',()=>{
 const m=boot('at',[0xb8,8,0,0x0f,0x00,0xe8,0xf4]);m.cpu.gdtr={base:0x500,limit:0x40};desc(m,8,0x300,0xffff,0x90);m.cpu.msw=1;
 m.run(10);assert.equal(m.cpu.flags&F.ZF,0);
});
test('286 VERR rejects null selector by ZF=0 without host exception',()=>{
 const m=boot('at',[0xb8,0,0,0x0f,0x00,0xe0,0xf4]);m.cpu.msw=1;
 m.run(10);assert.equal(m.cpu.flags&F.ZF,0);
});
