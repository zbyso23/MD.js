'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js'),{R,F,S}=require('../PC-Core.js');
const names=[['ADD',0x04],['ADC',0x14],['SUB',0x2c],['SBB',0x1c],['CMP',0x3c]];
function parity(n){n&=255;n^=n>>>4;n^=n>>>2;n^=n>>>1;return !(n&1);}
function oracle(kind,a,b,carry){
 const sub=['SUB','SBB','CMP'].includes(kind),c=(kind==='ADC'||kind==='SBB')?carry:0;
 const full=sub?a-b-c:a+b+c,low=full&255;
 return {low,cf:sub?full<0:full>255,of:sub?!!(((a^b)&(a^low))&0x80):!!(((~(a^b))&(a^low))&0x80),af:!!((a^b^low)&0x10),zf:low===0,sf:!!(low&128),pf:parity(low)};
}
for(const profile of ['xt','at'])test(profile+' 8-bit ALU 6000+ randomized deterministic oracle assertions including flags',()=>{
 const m=new PCMachine(profile),c=m.cpu;for(const s of [S.CS,S.DS,S.SS,S.ES])c.loadSegment(s,0);let seed=0x873afd21;
 const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let i=0;i<720;i++)for(const [kind,opcode] of names){
  const a=next()&255,b=next()>>>16&255,carry=next()&1;
  const code=[0xb0,a,carry?0xf9:0xf8,opcode,b,0xf4];
  m.ram.set(code,0x2000);c.ip=0x2000;c.halted=false;c.flags=2;c.r[R.AX]=0;
  m.run(8);const exp=oracle(kind,a,b,carry),got=c.flags;
  const label=profile+' '+kind+' a='+a+' b='+b+' carry='+carry;
  if(kind!=='CMP')assert.equal(c.r[R.AX]&255,exp.low,label+' AL');
  else assert.equal(c.r[R.AX]&255,a,label+' CMP preserves AL');
  for(const [name,mask] of [['cf',F.CF],['of',F.OF],['af',F.AF],['zf',F.ZF],['sf',F.SF],['pf',F.PF]])
   assert.equal(!!(got&mask),exp[name],label+' '+name);
 }
});

for(const profile of ['xt','at'])test(profile+' 16-bit ALU deterministic independent oracle over 3600 operations',()=>{
 const m=new PCMachine(profile),c=m.cpu;for(const s of [S.CS,S.DS,S.SS,S.ES])c.loadSegment(s,0);
 let seed=0x123abc98;const next=()=>{seed=(Math.imul(seed,1103515245)+12345)>>>0;return seed;};
 for(let i=0;i<720;i++)for(const [kind,opcode8] of names){
  const opcode=opcode8+1,a=next()&65535,b=next()&65535,carry=next()&1;
  m.ram.set([0xb8,a&255,a>>>8,carry?0xf9:0xf8,opcode,b&255,b>>>8,0xf4],0x2000);
  c.ip=0x2000;c.halted=false;c.flags=2;c.r[R.AX]=0;m.run(8);
  const sub=['SUB','SBB','CMP'].includes(kind),carryIn=['ADC','SBB'].includes(kind)?carry:0;
  const full=sub?a-b-carryIn:a+b+carryIn,lo=full&65535;
  const expected={
   cf:sub?full<0:full>65535,of:sub?!!(((a^b)&(a^lo))&0x8000):!!(((~(a^b))&(a^lo))&0x8000),
   af:!!((a^b^lo)&0x10),sf:!!(lo&0x8000),zf:lo===0,pf:parity(lo)
  };
  const label=`${profile} ${kind} AX=${a.toString(16)} imm=${b.toString(16)} carry=${carry}`;
  assert.equal(c.r[R.AX],kind==='CMP'?a:lo,label+' AX');
  for(const [n,mask] of [['cf',F.CF],['of',F.OF],['af',F.AF],['zf',F.ZF],['sf',F.SF],['pf',F.PF]])
   assert.equal(!!(c.flags&mask),expected[n],label+' '+n);
 }
});
