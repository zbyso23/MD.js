/* MD.js Ultra PC BIOS subset (JS adapter), GPL-3.0-only.
 * Design and algorithms adapted from user-supplied DOSBox-X sources:
 *   bios.h (BDA), bios.cpp (INT 11h/12h/15h/1Ah),
 *   callback.{cpp,h} (guest IRET vectors/host callbacks),
 *   bios_keyboard.cpp (BIOS keyboard ring-buffer full/wrap logic).
 * DOSBox-X sources copyright (C) 2002-2026 DOSBox/DOSBox-X contributors;
 * those files are GPL-2.0-or-later and retained verbatim under vendor/.
 * This is a deliberately bounded adapter. It is NOT a full DOSBox BIOS,
 * real POST implementation, or disk/video driver. No unsupported service
 * should report success. Only the listed BIOS functions are implemented.
 */
(function(root){
'use strict';
const cpuAPI=typeof module!=='undefined'&&module.exports?require('./PC-Core.js'):root.MDPC_CPU;
const {R,S,F,CPUFault}=cpuAPI;
const BDA=Object.freeze({EQUIPMENT:0x410,CONVENTIONAL_KB:0x413,KB_SHIFT:0x417,KB_HEAD:0x41a,KB_TAIL:0x41c,KB_DATA:0x41e,KB_END:0x43e,FDD_STATUS:0x441,TICKS:0x46c,MIDNIGHT:0x470,KB_START:0x480,KB_LIMIT:0x482});
class PCBios {
 constructor(m){this.m=m;this.map=new Map();this.calls=[];this.lastDiskStatus=1;}
 get16(a){return this.m.read16Physical(a);}
 set16(a,n){this.m.write16Physical(a,n&0xffff);}
 get32(a){return (this.get16(a)|(this.get16(a+2)<<16))>>>0;}
 set32(a,n){this.set16(a,n&0xffff);this.set16(a+2,n>>>16);}
 init(){
  const m=this.m;
  // Just a minimal configuration block, not the results of a physical POST.
  this.set16(BDA.EQUIPMENT,0x21);
  this.set16(BDA.CONVENTIONAL_KB,m.conventional>>>10);
  this.set16(BDA.KB_HEAD,0x1e);this.set16(BDA.KB_TAIL,0x1e);
  this.set16(BDA.KB_START,0x1e);this.set16(BDA.KB_LIMIT,0x3e);
  this.set32(BDA.TICKS,0);m.write8(BDA.MIDNIGHT,0);
  m.write8(BDA.FDD_STATUS,1);
  const supported=[0x08,0x09,0x10,0x11,0x12,0x13,0x15,0x16,0x1a];
  this.map.clear();
  for(const int of supported){
   const off=0x500+int*4;m.rom[off]=0xcf; // guest executes normal IRET after callback
   this.set16(int*4,off);this.set16(int*4+2,0xf000);
   this.map.set(off,int);
  }
  m.rom[0x400]=0xcf;
  for(let int=0;int<256;int++)if(!supported.includes(int)){
   this.set16(int*4,0x400);this.set16(int*4+2,0xf000);
  }
  m.biosMap=this.map;m.biosCalls=this.calls;
 }
 savedFlag(cpu,flag,on){
  // INT pushes FLAGS,CS,IP; saved FLAGS are at SS:SP+4.
  const a=cpu.physical(S.SS,(cpu.r[R.SP]+4)&0xffff);
  let bits=this.get16(a);bits=on?bits|flag:bits&~flag;this.set16(a,bits);
 }
 cf(cpu,on){this.savedFlag(cpu,F.CF,on);}
 zf(cpu,on){this.savedFlag(cpu,F.ZF,on);}
 ah(cpu){return cpu.get8(4);}
 setAH(cpu,n){cpu.put8(4,n);}
 failure(cpu,code=0x86){this.setAH(cpu,code);this.cf(cpu,true);}
 // BDA keyboard ring indexes are offsets relative to segment 40h.
 queueKey(code){
  if(!Number.isInteger(code)||code<0||code>0xffff)throw new RangeError('BIOS key must be a 16-bit scan/ASCII word');
  const start=this.get16(BDA.KB_START),end=this.get16(BDA.KB_LIMIT);
  if(start!==0x1e||end!==0x3e)throw new Error('Unsupported BIOS keyboard buffer geometry');
  const head=this.get16(BDA.KB_HEAD),tail=this.get16(BDA.KB_TAIL);
  if(head<start||head>=end||tail<start||tail>=end||(head&1)||(tail&1))throw new Error('Corrupted BIOS keyboard pointers');
  const next=tail+2>=end?start:tail+2;
  if(next===head)return false;
  this.set16(0x400+tail,code);this.set16(BDA.KB_TAIL,next);return true;
 }
 peekKey(consume){
  const head=this.get16(BDA.KB_HEAD),tail=this.get16(BDA.KB_TAIL),end=this.get16(BDA.KB_LIMIT),start=this.get16(BDA.KB_START);
  if(head===tail)return null;
  if(head<start||head>=end)throw new Error('Corrupted BIOS keyboard head');
  const code=this.get16(0x400+head);
  if(consume)this.set16(BDA.KB_HEAD,head+2>=end?start:head+2);
  return code;
 }
 dispatch(cpu){
  if(cpu.s[S.CS]!==0xf000)return false;
  const int=this.map.get(cpu.ip);if(int===undefined)return false;
  this.calls.push(int);if(this.calls.length>2000)this.calls.shift();
  switch(int){
   case 0x08:{
    const n=this.get32(BDA.TICKS)+1;
    if(n>=0x1800b0){this.set32(BDA.TICKS,0);this.m.write8(BDA.MIDNIGHT,1);}else this.set32(BDA.TICKS,n);
    this.m.pic.writeCommand(0x20);break;
   }
   case 0x11:cpu.r[R.AX]=this.get16(BDA.EQUIPMENT);break;
   case 0x12:cpu.r[R.AX]=this.get16(BDA.CONVENTIONAL_KB);break;
   case 0x15:
    if(this.ah(cpu)===0x88){cpu.r[R.AX]=this.m.extended>>>10;this.cf(cpu,false);}
    else this.failure(cpu);
    break;
   case 0x16:{
    const fn=this.ah(cpu);
    if(fn===0x00||fn===0x10){
     const code=this.peekKey(true);
     if(code===null)throw new CPUFault('INT 16h keyboard wait: asynchronous idle callback not implemented');
     cpu.r[R.AX]=code;
    }else if(fn===0x01||fn===0x11){
     const code=this.peekKey(false);this.zf(cpu,code===null);if(code!==null)cpu.r[R.AX]=code;
    }else if(fn===0x02){cpu.put8(0,this.m.read8(BDA.KB_SHIFT));}
    else this.failure(cpu);
    break;
   }
   case 0x1a:{
    const fn=this.ah(cpu);
    if(fn===0){const ticks=this.get32(BDA.TICKS);cpu.r[R.CX]=ticks>>>16;cpu.r[R.DX]=ticks&65535;cpu.put8(0,this.m.read8(BDA.MIDNIGHT));this.m.write8(BDA.MIDNIGHT,0);this.cf(cpu,false);}
    else if(fn===1){this.set32(BDA.TICKS,((cpu.r[R.CX]<<16)|cpu.r[R.DX])>>>0);this.m.write8(BDA.MIDNIGHT,0);this.cf(cpu,false);}
    else this.failure(cpu);
    break;
   }
   case 0x13:
    // Phase 2 supplies FDD via a real sector-image adapter.
    // Fail closed; never make FreeDOS believe a disk exists.
    if(this.ah(cpu)===1)this.setAH(cpu,this.lastDiskStatus);
    else this.setAH(cpu,1);
    this.cf(cpu,true);break;
   case 0x10:case 0x09:this.failure(cpu);break; // video/IRQ1 deferred
  }
  return true; // CPU executes guest IRET.
 }
}
const api={PCBios,BDA};if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.MDPC_BIOS=api;
})(typeof window!=='undefined'?window:globalThis);
