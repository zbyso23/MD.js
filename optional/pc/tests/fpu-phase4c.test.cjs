'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PCMachine}=require('../PC-Machine.js'),{S,R}=require('../PC-Core.js');
const binary=fs.readFileSync(path.join(__dirname,'../phase4/MANDEL.COM'));
const setup=()=>{const m=new PCMachine('at',{videoAdapter:'vga',fpuEnabled:true});const c=m.cpu;m.ram.set(binary,0x2100);for(const s of [S.CS,S.DS,S.SS])c.loadSegment(s,0x200);c.ip=0x100;c.r[R.SP]=0xfffe;c.halted=false;return m;};
test('80287XL is AT-only, optional and shares configured CPU/FPU clock',()=>{
 assert.equal(new PCMachine('at').fpu.enabled,false);assert.equal(new PCMachine('xt').fpu.enabled,false);
 assert.throws(()=>new PCMachine('xt',{fpuEnabled:true}),/AT/);
 for(const hz of [12000000,16000000]){const m=new PCMachine('at',{fpuEnabled:true,cpuHz:hz});assert.equal(m.fpu.fpuHz,hz);}
});
test('x87 ESC FPU machine instructions, status flags, and stack reset',()=>{
 const m=setup();const f=m.fpu;const c=m.cpu;assert.equal(f.cw,0x37f);assert.equal(f.tagWord(),0xffff);
 // Program FNINIT and FLDZ; compare and FNSTSW AX verified independently.
 m.ram.set([0xdb,0xe3,0xd9,0xee,0xd9,0xe8,0xd8,0xd1,0xdf,0xe0,0xf4],0x3000);c.ip=0x1000;c.loadSegment(S.CS,0x200);m.run(12);
 assert.equal(f.get(),1);assert.equal(f.get(1),0);assert.equal(c.r[R.AX]&0x0100,0);assert.equal(f.instructions,5);
});
test('real 16bit MANDEL.COM performs x87 operations and changes VGA framebuffer deterministically',()=>{
 function run(){const m=setup();for(let j=0;j<30&&!m.waitingForKey;j++)m.run(40000);assert.ok(m.waitingForKey,'did not reach BIOS INT16 key wait');assert.equal(m.video.mode,0x13);assert.equal(m.cpu.lastOpcode,0xcd);assert.ok(m.fpu.instructions>400000);let list=Array.from({length:100},(_,i)=>m.video.getPixel((i*23)%320,(i*13)%200));let colors=new Set(list);assert.ok(colors.size>3,'missing fractal pixels');assert.equal(m.fpu.tagWord(),0xffff);assert.equal(m.fpu.get instanceof Function,true);const snapshot=crypto.createHash('sha256').update(m.video.vram).digest('hex');return {m,snapshot,colors:colors.size};}
 const a=run(),b=run();assert.equal(a.snapshot,b.snapshot);assert.ok(a.m.cpu.steps>500000);console.log('MANDEL VGA SHA256',a.snapshot,'FPU operations',a.m.fpu.instructions,'colors',a.colors);
});
test('FPU snapshot rejects malformed values and restores compatible previous snapshots',()=>{
 const m=setup(),f=m.fpu;f.push(7.5);const s=f.snapshot(),fresh=new (require('../PC-FPU287.js').PCFPU287)();fresh.restore(s);assert.equal(fresh.get(),7.5);
 assert.throws(()=>fresh.restore({...s,cells:Array(8).fill('7.5')}),/Invalid/);
 assert.throws(()=>fresh.restore({...s,cpuHz:15000000}),/Invalid/);
});
test('XT no-FPU ESC still consumes ModR/M without x87 execution',()=>{
 const m=new PCMachine('xt');const c=m.cpu;c.loadSegment(S.CS,0);c.ip=0x2000;m.ram.set([0xd9,0xee,0xf4],0x2000);m.run(3);assert.equal(m.fpu.instructions,0);assert.equal(c.halted,true);
});
