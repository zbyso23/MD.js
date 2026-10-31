/* MD.js Ultra — Sound Blaster 2.0 LIMITED native-JS DSP 8bit DMA/IRQ preview.
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * Consulted user-supplied DOSBox-X sblaster.cpp, dma.cpp/h; independently written.
 * Implemented: reset/read/write, E1, 40, 14, 48/1C, DA, D0/D4, D1/D3, E0,
 * 8bit mono DMA1 read from guest RAM, 64K wrapping, terminal IRQ5/7, IRQ ack.
 * NOT a complete SB2 DSP command set or cycle-accurate ISA DMA arbiter.
 */
(function(root){
'use strict';
const PIT_HZ=1193182;
class PCSoundBlaster2 {
 constructor(machine){this.machine=machine;this.irq=5;this.reset();}
 reset(){this.resetLine=false;this.response=[];this.pending=0;this.args=[];this.speakerOn=false;this.rate=10000;this.blockSize=0;this.playing=false;this.paused=false;this.auto=false;this.exitAuto=false;this.left=0;this.nextTick=0;this.held=128;this.irqRaised=false;this.unsupported=[];}
 portRead(port){
  const o=port-0x220;
  if(o===0x0a)return this.response.shift()??0xff;
  if(o===0x0c)return 0x00; // write-buffer ready (simplified)
  if(o===0x0e){const present=this.response.length?0x80:0;this.irqRaised=false;return present;} // IRQ acknowledge
  return 0xff;
 }
 portWrite(port,val,clock){
  const o=port-0x220;val&=255;
  if(o===0x06){if(val&1)this.resetLine=true;else if(this.resetLine){this.reset();this.response.push(0xaa);}return;}
  if(o!==0x0c)return;
  this.writeDSP(val,clock);
 }
 writeDSP(v,clock){
  if(this.pending){this.args.push(v);if(this.args.length>=this.pending){const args=this.args;this.args=[];this.pending=0;this.command(this.cmd,args,clock);}return;}
  const lengths={0x40:1,0x14:2,0x48:2,0xe0:1};
  if(lengths[v]){this.cmd=v;this.pending=lengths[v];this.args=[];return;}
  this.command(v,[],clock);
 }
 command(cmd,args,clock){
  switch(cmd){
   case 0xe1:this.response.push(2,1);break; // DSP 2.01 (SB 2.0)
   case 0xe0:this.response.push(args[0]^255);break;
   case 0xd1:this.speakerOn=true;break;
   case 0xd3:this.speakerOn=false;break;
   case 0xd8:this.response.push(this.speakerOn?0xff:0);break;
   case 0x40:this.rate=Math.max(4000,Math.min(23000,Math.round(1000000/(256-args[0]))));break;
   case 0x48:this.blockSize=(args[0]|(args[1]<<8))+1;break;
   case 0x14:this.start((args[0]|(args[1]<<8))+1,false,clock);break;
   case 0x1c:this.start(this.blockSize||this.machine.dma.baseCount[1]+1,true,clock);break;
   case 0xda:this.exitAuto=true;break;
   case 0xd0:this.paused=true;break;
   case 0xd4:this.paused=false;break;
   case 0xf2:this.raiseIRQ();break;
   default:if(this.unsupported.length<32)this.unsupported.push(cmd);break;
  }
 }
 start(n,auto,clock){
  if(!Number.isInteger(n)||n<1||n>65536)throw new RangeError('SB2 DMA block length invalid');
  this.left=n;this.auto=auto;this.exitAuto=false;this.playing=true;this.paused=false;
  this.nextTick=clock+PIT_HZ/this.rate;this.held=128;this.irqRaised=false;
 }
 dmaRead(){
  const d=this.machine.dma,ch=1,mode=d.mode[ch];
  if(d.mask&(1<<ch))return null;
  // 8237 transfer type: 2=read system RAM to device, never write guest RAM.
  if(((mode>>2)&3)!==2)return null;
  const address=((d.page[ch]<<16)|d.addr[ch])&0xffffff;
  const value=this.machine.read8(address);
  d.addr[ch]=(d.addr[ch]+((mode&0x20)?-1:1))&0xffff;
  if(d.count[ch]===0){d.status|=1<<ch;d.count[ch]=0xffff;
   if((mode&0x10)&&this.auto){d.addr[ch]=d.baseAddr[ch];d.count[ch]=d.baseCount[ch];}
   else d.mask|=1<<ch;
  }else d.count[ch]--;
  return value;
 }
 raiseIRQ(){this.machine.requestIRQ(this.irq);this.irqRaised=true;}
 advanceTo(clock){
  if(!this.playing||this.paused||!Number.isFinite(clock))return;
  const step=PIT_HZ/this.rate;
  let guard=0;
  while(this.playing&&this.nextTick<=clock){
   if(++guard>300000)throw new RangeError('SB2 DMA processing guard exceeded');
   const v=this.dmaRead();if(v===null){this.nextTick=clock+step;break;}
   this.held=v;this.left--;this.nextTick+=step;
   if(this.left<=0){this.raiseIRQ();if(this.auto&&!this.exitAuto){this.left=this.blockSize||this.machine.dma.baseCount[1]+1;}
    else{this.playing=false;break;}}
  }
 }
 sample(){return this.speakerOn?(this.held-128)/128*0.20:0;}
 exportState(){return {v:1,irq:this.irq,resetLine:this.resetLine,response:[...this.response],pending:this.pending,args:[...this.args],cmd:this.cmd??0,speakerOn:this.speakerOn,rate:this.rate,blockSize:this.blockSize,playing:this.playing,paused:this.paused,auto:this.auto,exitAuto:this.exitAuto,left:this.left,nextTick:this.nextTick,held:this.held,irqRaised:this.irqRaised,unsupported:[...this.unsupported]};}
 restoreState(s){
  if(!s||s.v!==1||![5,7].includes(s.irq)||!Array.isArray(s.response)||s.response.length>64||!Array.isArray(s.args)||s.args.length>2||!Array.isArray(s.unsupported)||s.unsupported.length>32)throw new Error('Invalid SB2 snapshot');
  for(const k of ['pending','cmd','rate','blockSize','left','nextTick','held'])if(!Number.isFinite(s[k])||s[k]<0)throw new Error('Invalid SB2 '+k);
  if(s.rate<4000||s.rate>23000||s.left>65536||s.held>255||s.pending>2||[...s.response,...s.args,...s.unsupported].some(x=>!Number.isInteger(x)||x<0||x>255))throw new Error('Invalid SB2 bounds');
  for(const k of ['resetLine','speakerOn','playing','paused','auto','exitAuto','irqRaised'])if(typeof s[k]!=='boolean')throw new Error('Invalid SB2 '+k);
  Object.assign(this,s);this.response=[...s.response];this.args=[...s.args];this.unsupported=[...s.unsupported];
 }
}
const api={PCSoundBlaster2};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_SB2=api;
})(typeof window!=='undefined'?window:globalThis);
