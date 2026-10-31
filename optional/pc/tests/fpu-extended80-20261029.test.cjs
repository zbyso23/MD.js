'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCFloat80,PCFPU287}=require('../PC-FPU287.js');
const {PCMachine}=require('../PC-Machine.js');const {S,R}=require('../PC-Core.js');
const codec={bytesToBase64:b=>Buffer.from(b).toString('base64'),base64ToBytes:(s,max)=>{const b=Buffer.from(s,'base64');if(b.length>max)throw Error('oversized');return new Uint8Array(b);}};
function wordsAt(m,addr){return Array.from({length:5},(_,i)=>m.cpu.read16(S.DS,addr+i*2));}
test('80bit mantissa preserves 1+2^-60 that binary64 rounds to 1',()=>{
 const one=PCFloat80.fromNumber(1),small=PCFloat80.fromNumber(2**-60);
 const exact=PCFloat80.op(0,one,small);
 assert.equal(PCFloat80.toNumber(exact),1);
 assert.notDeepEqual(PCFloat80.words(exact),PCFloat80.words(one));
 assert.deepEqual(PCFloat80.words(exact),[8,0,0,0x8000,0x3fff]);
});
test('80bit arithmetic plus minus multiply divide and correct sign',()=>{
 const f=x=>PCFloat80.fromNumber(x),n=PCFloat80.toNumber;
 for(const [g,a,b,expected] of [[0,2,3,5],[4,2,3,-1],[5,2,3,1],[1,3,4,12],[6,9,3,3],[7,9,3,1/3]]){
  assert.ok(Math.abs(n(PCFloat80.op(g,f(a),f(b)))-expected)<1e-14,`${g}: ${a} ${b}`);
 }
 assert.equal(PCFloat80.words(f(Infinity))[4],0x7fff);
 assert.equal(PCFloat80.words(f(-Infinity))[4],0xffff);
});
test('ten-byte x87 representation serializes and reimports exact mantissa',()=>{
 const a=PCFloat80.op(0,PCFloat80.fromNumber(1),PCFloat80.fromNumber(2**-60));
 assert.deepEqual(PCFloat80.words(PCFloat80.fromWords(PCFloat80.words(a))),PCFloat80.words(a));
});
test('guest 286 x87 FLD DWORD + FADD + FSTP TBYTE executes extended80, not host float64',()=>{
 const m=new PCMachine('at',{fpuEnabled:true,fpuPrecision:'extended80'}),c=m.cpu;
 for(const seg of [S.CS,S.DS,S.SS])c.loadSegment(seg,0);c.ip=0x2000;c.r[R.SP]=0x7000;
 const p=[0xd9,0x06,0x00,0x30,0xd9,0x06,0x04,0x30,0xd8,0xc1,0xdb,0x3e,0x08,0x30,0xf4];
 m.ram.set(p,0x2000);const dv=new DataView(m.ram.buffer);dv.setFloat32(0x3000,2**-60,true);dv.setFloat32(0x3004,1,true);
 m.run(100);assert.equal(c.halted,true);assert.equal(m.fpu.instructions,4);
 assert.deepEqual(wordsAt(m,0x3008),[8,0,0,0x8000,0x3fff]);
});
test('extended80 snapshot keeps sub-binary64 bits; old binary64 snapshot remains importable',()=>{
 const m=new PCMachine('at',{fpuEnabled:true,fpuPrecision:'extended80'});
 m.fpu.pushRaw(PCFloat80.op(0,PCFloat80.fromNumber(1),PCFloat80.fromNumber(2**-60)));
 const s=JSON.parse(JSON.stringify(m.exportState(codec))),r=PCMachine.fromState(s,codec);
 assert.equal(r.fpu.precisionMode,'extended80');assert.deepEqual(PCFloat80.words(r.fpu.getRaw()),[8,0,0,0x8000,0x3fff]);
 s.fpu.raw80[7][2]=999999;assert.throws(()=>PCMachine.fromState(s,codec),/Invalid extended80/);
 const old=new PCFPU287(true);old.push(3.25);const o=old.snapshot();delete o.raw80;delete o.precisionMode;
 const b=new PCFPU287();b.restore(o);assert.equal(b.get(),3.25);
});
test('extended80 compare distinguishes values that binary64 sees as equal',()=>{
 const f=new PCFPU287(true,12000000,'extended80');
 const one=PCFloat80.fromNumber(1),fine=PCFloat80.op(0,one,PCFloat80.fromNumber(2**-60));
 f.compareRaw(one,fine);assert.equal(f.statusWord()&0x4500,0x0100);
 f.compareRaw(fine,one);assert.equal(f.statusWord()&0x4500,0);
 f.compareRaw(fine,fine);assert.equal(f.statusWord()&0x4500,0x4000);
});

test('golden x87 extended80 1/3 mantissa 0xAAAAAAAAAAAAAAAB (nearest even)',()=>{
 const rep=PCFloat80.op(6,PCFloat80.fromNumber(1),PCFloat80.fromNumber(3));
 assert.deepEqual(PCFloat80.words(rep),[0xaaab,0xaaaa,0xaaaa,0xaaaa,0x3ffd]);
});
