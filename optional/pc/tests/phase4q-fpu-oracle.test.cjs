'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCFloat80,PCFPU287}=require('../PC-FPU287.js');
const next=(()=>{let x=0x1234ffaa;return ()=>x=(Math.imul(x,1664525)+1013904223)>>>0;})();
function rne(n){let fl=Math.floor(n),fr=n-fl;return fr<.5?fl:fr>.5?fl+1:fl%2===0?fl:fl+1;}
test('x87 extended80: 3200 seeded rounding-mode comparisons to integer oracle',()=>{
 for(let i=0;i<800;i++){
  const n=(next()%20000-10000)/8;
  const ref=[rne(n),Math.floor(n),Math.ceil(n),Math.trunc(n)];
  for(let mode=0;mode<4;mode++){
   const v=PCFloat80.roundInteger(PCFloat80.fromNumber(n),mode);
   assert.equal(PCFloat80.toNumber(v),ref[mode],`mode=${mode} n=${n}`);
  }
 }
});
test('x87 basic BigInt integer arithmetic (excluding signed zero) and comparisons',()=>{
 for(let i=0;i<1000;i++){
  const a=(next()%4001)-2000,b=(next()%4001)-2000;
  const aa=PCFloat80.fromNumber(a),bb=PCFloat80.fromNumber(b);
  const exp=PCFloat80.op(0,aa,bb),mul=PCFloat80.op(1,aa,bb),sub=PCFloat80.op(4,aa,bb);
  assert.equal(PCFloat80.toNumber(exp),a+b);assert.equal(PCFloat80.toNumber(mul),a*b||0);
  assert.equal(PCFloat80.toNumber(sub),a-b);
  assert.equal(PCFloat80.cmp(aa,bb),Math.sign(a-b));
 }
});
test('x87 stack overflow/underflow and snapshot invalid cases are never silently accepted',()=>{
 for(const precision of ['binary64','extended80']){
  const f=new PCFPU287(true,12000000,precision);assert.throws(()=>f.get(),/underflow/);
  for(let i=0;i<8;i++)f.push(i+1);
  assert.throws(()=>f.push(99),/overflow/);
  assert.equal(f.statusWord()&0x3800,(f.top&7)<<11);
  const s=f.snapshot(),g=new PCFPU287(true,12000000,precision);g.restore(s);
  for(let i=0;i<8;i++)assert.equal(f.get(i),g.get(i));
  for(const corrupt of [{...s,top:8},{...s,cw:-1},{...s,cells:[1]},
   {...s,precisionMode:'invalid'}, ...(precision==='extended80'?[{...s,raw80:[null,...s.raw80.slice(1)]}]:[])]){
   const previous=g.snapshot();assert.throws(()=>g.restore(corrupt));assert.deepEqual(g.snapshot(),previous);
  }
  for(let i=0;i<8;i++)g.pop();assert.throws(()=>g.pop(),/underflow/);
 }
});
