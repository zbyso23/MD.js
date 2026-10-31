/* MD.js Ultra — Phase 3C OPL2 preview in native, unbundled JavaScript.
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * Reimplemented from register-level documentation with the user-supplied
 * DOSBox-X adlib.cpp / opl.cpp / dbopl.cpp as design references (not a port).
 * LIMITED: no rhythm mode, precise DBOPL envelope tables or full YM3812 analog timing.
 * Does implement 9 two-operator FM channels, register writes, key-on/off,
 * ADSR, feedback/additive, OPL2 four wave shapes, and timer/status semantics.
 */
(function(root){
'use strict';
const BASE=49716;
const CH_OFF=[0,1,2,8,9,10,16,17,18];
const MULT=[0.5,1,2,3,4,5,6,7,8,9,10,10,12,12,15,15];
const TAU=2*Math.PI;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const emptyOp=()=>({phase:0,env:0,state:0,last:0,prev:0});
class PCOPL2 {
 constructor(sampleRate=22050){
  this.sampleRate=sampleRate;this.reg=new Uint8Array(256);this.ops=Array.from({length:18},emptyOp);
  this.addr=0;this.status=0;this.t1=0;this.t2=0;this.control=0;
  this.timerStart=[0,0];this.lastTime=0;this.rhythmUnsupported=false;
 }
 reset(){this.reg.fill(0);this.ops=Array.from({length:18},emptyOp);this.addr=0;this.status=0;this.t1=0;this.t2=0;this.control=0;this.timerStart=[0,0];this.lastTime=0;this.rhythmUnsupported=false;}
 writeAddress(v){this.addr=v&255;}
 updateTimers(sec){
  if(!Number.isFinite(sec)||sec<0)return;
  sec=Math.max(this.lastTime,sec);this.lastTime=sec;
  for(let i=0;i<2;i++){
   if(!(this.control&(1<<i)))continue;
   const period=(256-(i?this.t2:this.t1))*(i?0.000320:0.000080);
   if(sec-this.timerStart[i]>=period){this.status|=i?0x20:0x40;this.timerStart[i]=sec-((sec-this.timerStart[i])%period);}
  }
  const irq1=(this.status&0x40)&&!(this.control&0x40);
  const irq2=(this.status&0x20)&&!(this.control&0x20);
  this.status=(this.status&0x7f)|((irq1||irq2)?0x80:0);
 }
 readStatus(sec){this.updateTimers(sec);return this.status;}
 writeData(v,sec){
  this.updateTimers(sec);v&=255;const r=this.addr,old=this.reg[r];this.reg[r]=v;
  if(r===0x02)this.t1=v;
  else if(r===0x03)this.t2=v;
  else if(r===0x04){
   if(v&0x80)this.status=0;
   for(let i=0;i<2;i++)if((v&(1<<i))&&!(this.control&(1<<i)))this.timerStart[i]=sec;
   this.control=v&0x63;
  }
  if(r===0xbd&&v&0x20)this.rhythmUnsupported=true;
  if(r>=0xb0&&r<=0xb8){const ch=r-0xb0;if((old^v)&0x20){for(let o=0;o<2;o++){const op=this.ops[ch*2+o];if(v&0x20){op.state=1;op.env=0;op.phase=0;op.last=0;op.prev=0;}else if(op.state)op.state=4;}}}
 }
 wave(phase,n){phase=((phase%TAU)+TAU)%TAU;const s=Math.sin(phase);
  switch(n){case 1:return s<0?0:s;case 2:return Math.abs(s);case 3:return phase<Math.PI?s:0;default:return s;}
 }
 level(op,offset,dt){
  const a=this.reg[0x60+offset],d=a&15,att=a>>>4,s=this.reg[0x80+offset],sus=s>>>4,rel=s&15;
  // Approximate OPL envelope rates; exact YM3812 rate/KS tables are NOT modelled.
  const rate=v=>v===0?0:0.8*Math.pow(2,v*0.58);
  if(op.state===1){op.env=clamp(op.env+rate(att)*dt,0,1);if(op.env>=1)op.state=2;}
  else if(op.state===2){op.env=clamp(op.env-rate(d)*dt,0,1);if(op.env<=Math.pow(10,-sus*3/20))op.state=3;}
  else if(op.state===3){if(!(this.reg[0x20+offset]&0x20))op.env=Math.max(0,op.env-rate(rel)*dt);}
  else if(op.state===4){op.env=Math.max(0,op.env-rate(rel)*dt);if(!op.env)op.state=0;}
  return op.env * Math.pow(10,-(this.reg[0x40+offset]&63)*0.75/20);
 }
 sampleAt(_t){
  const dt=1/this.sampleRate;let mix=0;
  for(let ch=0;ch<9;ch++){
   if((this.reg[0xbd]&0x20)&&ch>=6)continue; // Rhythm mode deliberately not synthesized.
   const b=this.reg[0xb0+ch],fnum=this.reg[0xa0+ch]|((b&3)<<8);
   if(!fnum)continue;
   const block=(b>>2)&7,freq=fnum*Math.pow(2,block-1)*BASE/524288;
   const base=CH_OFF[ch],mod=this.ops[2*ch],car=this.ops[2*ch+1],offM=base,offC=base+3;
   const feedback=(this.reg[0xc0+ch]>>>1)&7;
   const evalOp=(o,offset,modulation)=>{
    const mul=MULT[this.reg[0x20+offset]&15];o.phase=(o.phase+TAU*freq*mul*dt)%TAU;
    const amp=this.level(o,offset,dt),enabled=!!(this.reg[0x01]&0x20);
    return this.wave(o.phase+modulation,enabled?(this.reg[0xe0+offset]&3):0)*amp;
   };
   const fb=feedback?((mod.last+mod.prev)/2)*Math.pow(2,feedback-1)*0.16:0;
   const mv=evalOp(mod,offM,fb);mod.prev=mod.last;mod.last=mv;
   const additive=!!(this.reg[0xc0+ch]&1);
   const cv=evalOp(car,offC,additive?0:mv*3.2);
   mix+=additive?0.5*(mv+cv):cv;
  }
  return clamp(mix*0.045,-0.45,0.45);
 }
 exportState(){return {v:1,reg:Array.from(this.reg),ops:this.ops.map(x=>({...x})),addr:this.addr,status:this.status,t1:this.t1,t2:this.t2,control:this.control,timerStart:[...this.timerStart],lastTime:this.lastTime,rhythmUnsupported:this.rhythmUnsupported};}
 restoreState(s){
  if(!s||s.v!==1||!Array.isArray(s.reg)||s.reg.length!==256||s.reg.some(x=>!Number.isInteger(x)||x<0||x>255)||!Array.isArray(s.ops)||s.ops.length!==18)throw new Error('Invalid OPL2 snapshot');
  for(const o of s.ops){if(!o||!['phase','env','state','last','prev'].every(k=>Number.isFinite(o[k]))||o.state<0||o.state>4||o.env<0||o.env>1)throw new Error('Invalid OPL2 operator');}
  if(!Number.isInteger(s.addr)||s.addr<0||s.addr>255||!Number.isInteger(s.status)||s.status<0||s.status>255||!Number.isFinite(s.lastTime)||s.lastTime<0||!Array.isArray(s.timerStart)||s.timerStart.length!==2||s.timerStart.some(x=>!Number.isFinite(x)||x<0))throw new Error('Invalid OPL2 timer state');
  this.reg.set(s.reg);this.ops=s.ops.map(o=>({...o}));this.addr=s.addr;this.status=s.status;this.t1=s.t1;this.t2=s.t2;this.control=s.control;this.timerStart=[...s.timerStart];this.lastTime=s.lastTime;this.rhythmUnsupported=!!s.rhythmUnsupported;
 }
}
const api={PCOPL2};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_OPL2=api;
})(typeof window!=='undefined'?window:globalThis);
