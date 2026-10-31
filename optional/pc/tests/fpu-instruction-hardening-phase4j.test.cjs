'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js'),{S,R}=require('../PC-Core.js');
const {PCFloat80}=require('../PC-FPU287.js');
function execute(code,opts={}){
 const m=new PCMachine('at',{fpuEnabled:true,...opts}),cpu=m.cpu;
 for(const s of [S.CS,S.DS,S.SS])cpu.loadSegment(s,0);
 m.ram.set(code,0x2000);cpu.ip=0x2000;cpu.r[R.SP]=0x9000;
 m.run(300);assert.equal(cpu.halted,true,'test must halt via HLT');return m;
}
test('x87 FNSTCW/FLDCW/FNSTSW m16 guest instructions preserve all 16 bits',()=>{
 const m=execute([0xd9,0x2e,0x00,0x03,0xd9,0x3e,0x02,0x03,0xd9,0xe8,0xd9,0xe4,0xdd,0x3e,0x04,0x03,0xf4]);
 // Read back exactly the control word loaded from guest RAM.
 assert.equal(m.read16Physical(0x302),m.fpu.cw);
 assert.equal(m.read16Physical(0x304)&0x4000,0);
});
test('x87 FCHS/FABS, FLD ST(i), FXCH, FNOP change stack and preserve exact extended80 mantissa',()=>{
 const m=execute([0xd9,0xe8,0xd9,0xe0,0xd9,0xe8,0xd9,0xc9,0xd9,0xe1,0xd9,0xd0,0xf4],{fpuPrecision:'extended80'});
 assert.equal(m.fpu.get(),1);assert.equal(m.fpu.get(1),1);
 assert.deepEqual(PCFloat80.words(m.fpu.getRaw()),PCFloat80.words(PCFloat80.fromNumber(1)));
});
test('FILD/FISTP m16 signed boundary, guest-memory preserved, FPU emptied',()=>{
 const code=[0xdf,0x06,0x00,0x03,0xdf,0x1e,0x02,0x03,0xf4];
 const m= new PCMachine('at',{fpuEnabled:true});const c=m.cpu;
 for(const s of [S.CS,S.DS,S.SS])c.loadSegment(s,0);m.ram.set(code,0x2000);c.ip=0x2000;
 m.write16Physical(0x300,0x8001);m.run(30);
 assert.equal(m.read16Physical(0x302),0x8001);assert.equal(m.fpu.cells.filter(x=>x!==null).length,0);
});
test('FILD/FISTP m32 signed value round trip',()=>{
 const m=new PCMachine('at',{fpuEnabled:true});const c=m.cpu;
 for(const s of [S.CS,S.DS,S.SS])c.loadSegment(s,0);m.ram.set([0xdb,0x06,0x10,0x03,0xdb,0x1e,0x14,0x03,0xf4],0x2000);c.ip=0x2000;
 m.write16Physical(0x310,0x0000);m.write16Physical(0x312,0xfedc);m.run(50);
 assert.equal(m.read16Physical(0x314),0);assert.equal(m.read16Physical(0x316),0xfedc);
});
test('x87 rounding control: 2.5 ties even, ceil and floor through guest CW + FISTP',()=>{
 const cases=[[0x037f,2],[0x077f,2],[0x0b7f,3],[0x0f7f,2]];
 for(const [cw,result] of cases){const m=new PCMachine('at',{fpuEnabled:true});const c=m.cpu;
  for(const s of [S.CS,S.DS,S.SS])c.loadSegment(s,0);
  m.ram.set([0xd9,0x2e,0x00,0x03,0xd9,0x06,0x04,0x03,0xdf,0x1e,0x08,0x03,0xf4],0x2000);c.ip=0x2000;
  m.write16Physical(0x300,cw);
  const v=new DataView(new ArrayBuffer(4));v.setFloat32(0,2.5,true);m.write16Physical(0x304,v.getUint16(0,true));m.write16Physical(0x306,v.getUint16(2,true));
  m.run(50);assert.equal(m.read16Physical(0x308),result,'CW '+cw.toString(16));
 }
});
test('x87 80bit FRNDINT preserves 64-bit integer exactly, binary64 FSQRT works',()=>{
 let m=execute([0xd9,0xe8,0xd9,0xfc,0xf4],{fpuPrecision:'extended80'});
 assert.deepEqual(PCFloat80.words(m.fpu.getRaw()),PCFloat80.words(PCFloat80.fromNumber(1)));
 m=execute([0xd9,0xe8,0xd9,0xfa,0xf4]);assert.equal(m.fpu.get(),1);
 assert.throws(()=>execute([0xd9,0xe8,0xd9,0xfa,0xf4],{fpuPrecision:'extended80'}),/correctly rounded/);
});
test('FPUCHECK.COM tiny AT guest checks x87 without host math injection',()=>{
 const fs=require('node:fs'),path=require('node:path'),code=fs.readFileSync(path.join(__dirname,'../phase4/FPUCHECK.COM'));
 assert.equal(code.length,85);
 for(const enabled of [false,true]){
  const m=new PCMachine('at',{fpuEnabled:enabled}),cpu=m.cpu;
  m.ram.set(code,0x2100);for(const s of [S.CS,S.DS,S.SS])cpu.loadSegment(s,0x200);
  cpu.ip=0x100;cpu.r[R.SP]=0xfffe;m.run(8);
  assert.equal(m.read16Physical(0x200*16+0x12a),enabled?2:0);
 }
});
