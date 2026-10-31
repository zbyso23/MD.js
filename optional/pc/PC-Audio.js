/* MD.js Ultra PC Lab — Phase 3A PC Speaker and passive Covox (3B limited).
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * Design references (not compiled or copied into runtime): DOSBox-X timer.cpp,
 * pcspeaker.cpp, 8255.cpp, iohandler.cpp, mixer.cpp (user-supplied sources).
 * Deterministic PIT2 mode 2/3 and held 8-bit LPT DAC, not cycle-accurate analog hardware.
 */
(function(root){
'use strict';
const PIT_HZ=1193182;
const MAX_PCM=65536;
class PCSpeakerAudio {
 constructor(machine,opts={}){
  this.machine=machine;
  this.cpuHz=machine.profile==='at'?(machine.cpuHz||12000000):4770000;
  this.sampleRate=opts.sampleRate||22050;
  if(!Number.isInteger(this.sampleRate)||this.sampleRate<8000||this.sampleRate>48000)throw new RangeError('Unsupported PCM sample rate');
  this.capture=false;this.samples=[];this.clock=0;this.lastCpuTicks=machine.cpu?.ticks||0;this.cpuRemainder=0;
  this.nextSample=1;this.mode=3;this.reload=65536;this.phaseStart=0;
  this.gate=false;this.enabled=false;this.programmed=false;
  this.covoxData=128;this.covoxWritten=false;
 }
 setCapture(on){this.sync();this.capture=!!on;this.samples.length=0;}
 clear(){this.samples.length=0;}
 sync(){
  const now=this.machine.cpu.ticks;
  if(now<this.lastCpuTicks){this.lastCpuTicks=now;this.cpuRemainder=0;this.clear();return;}
  const delta=now-this.lastCpuTicks;this.lastCpuTicks=now;
  if(!delta)return;
  const num=delta*PIT_HZ+this.cpuRemainder;
  const ticks=Math.floor(num/this.cpuHz);
  this.cpuRemainder=num-ticks*this.cpuHz;
  if(ticks)this.advanceTicks(ticks);
 }
 advanceTicks(ticks){
  if(!Number.isSafeInteger(ticks)||ticks<0||ticks>10*PIT_HZ)throw new RangeError('PIT audio advance outside 0..10 seconds');
  const end=this.clock+ticks;
  // In silent mode, maintain the phase clock but never accumulate audio or allocate memory.
  if(this.capture){
   while(Math.floor(this.nextSample*PIT_HZ/this.sampleRate)<end){
    const t=Math.floor(this.nextSample*PIT_HZ/this.sampleRate);
    if(this.sb2)this.sb2.advanceTo(t);
    if(this.samples.length>=MAX_PCM)this.samples.length=0; // Drop stale output, never O(n²) shift on overload.
    this.samples.push(this.valueAt(t));
    this.nextSample++;
   }
  }else{
   if(this.sb2)this.sb2.advanceTo(end);
   this.nextSample=Math.max(this.nextSample,Math.ceil(end*this.sampleRate/PIT_HZ));
  }
  if(this.sb2)this.sb2.advanceTo(end);
  this.clock=end;
 }
 valueAt(t){
  const covox=this.covoxWritten?(this.covoxData-128)/128*0.23:0;
  const fm=this.opl?this.opl.sampleAt(t):0;
  const sb=this.sb2?this.sb2.sample():0;
  if(!this.enabled||!this.gate||!this.programmed)return covox+fm+sb;
  const n=this.reload||65536;
  if(n<2)return covox+fm+sb;
  const elapsed=Math.max(0,t-this.phaseStart);
  if(this.mode===3)return covox+fm+sb+((elapsed%n)<Math.ceil(n/2)?0.20:-0.20);
  if(this.mode===2)return covox+fm+sb+((elapsed%n)<n-1?0.20:-0.20);
  return covox+fm+sb; // Modes 0/1/4/5: deliberately unsupported in 3A subset.
 }
 onCovoxWrite(n){
  this.sync(); // Emit old held DAC level before accepting a new guest OUT 378h.
  this.covoxData=n&255;this.covoxWritten=true;
 }
 onPort61(n){
  this.sync();
  const gate=!!(n&1);
  if(gate&&!this.gate)this.phaseStart=this.clock;
  this.gate=gate;this.enabled=!!(n&2);
 }
 counterAt(t){
  if(!this.programmed)return this.reload;
  if(!this.gate)return this.reload;
  const n=this.reload||65536;
  return n-((Math.max(0,t-this.phaseStart))%n);
 }
 onPITControl(n,pit){
  if(((n>>>6)&3)!==2||((n>>>4)&3)===0)return;
  this.sync();
  const mode=(n>>>1)&7;
  this.mode=mode>=6?mode-4:mode;
  this.programmed=false;
  this.phaseStart=this.clock;
 }
 onPITWrite(pit,wasLow,access){
  this.sync();
  // Mode 3 LSB/MSB programming only takes effect after the second byte.
  if(access===3&&wasLow)return;
  this.reload=pit.reload[2]||65536;
  this.programmed=true;this.phaseStart=this.clock;
 }
 takePCM(){this.sync();const pcm=Float32Array.from(this.samples);this.clear();return pcm;}
 exportState(){this.sync();return {v:2,covoxData:this.covoxData,covoxWritten:this.covoxWritten,clock:this.clock,lastCpuTicks:this.lastCpuTicks,cpuRemainder:this.cpuRemainder,nextSample:this.nextSample,mode:this.mode,reload:this.reload,phaseStart:this.phaseStart,gate:this.gate,enabled:this.enabled,programmed:this.programmed};}
 restoreState(s){
  if(!s||![1,2].includes(s.v))throw new Error('Invalid PC speaker snapshot');
  if(s.v===2&&(!Number.isInteger(s.covoxData)||s.covoxData<0||s.covoxData>255||typeof s.covoxWritten!=='boolean'))throw new Error('Invalid Covox snapshot');
  for(const k of ['clock','lastCpuTicks','cpuRemainder','nextSample','mode','reload','phaseStart'])if(!Number.isSafeInteger(s[k])||s[k]<0)throw new Error('Invalid audio '+k);
  if(s.clock>Number.MAX_SAFE_INTEGER/2||s.nextSample>Number.MAX_SAFE_INTEGER/2||s.mode>5||s.reload>65536||s.phaseStart>s.clock||s.lastCpuTicks>this.machine.cpu.ticks||s.cpuRemainder>=this.cpuHz)throw new Error('Invalid audio state range');
  this.clock=s.clock;this.lastCpuTicks=s.lastCpuTicks;this.cpuRemainder=s.cpuRemainder;this.nextSample=s.nextSample;
  this.mode=s.mode;this.reload=s.reload;this.phaseStart=s.phaseStart;
  this.gate=!!s.gate;this.enabled=!!s.enabled;this.programmed=!!s.programmed;
  this.covoxData=s.v===2?s.covoxData:128;this.covoxWritten=s.v===2?s.covoxWritten:false;
  this.capture=false;this.clear(); // Never resurrect queued audio on restore.
 }
}
const api={PCSpeakerAudio,PIT_HZ};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.MDPC_AUDIO=api;
})(typeof window!=='undefined'?window:globalThis);
