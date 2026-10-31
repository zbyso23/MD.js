/* MD.js Ultra PC Lab – Phase 1 experimental CPU core.
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * Expanded, still bounded pure JavaScript 8086/286 interpreter; C++ DOSBox-X CPU cores are
 * audited references, NOT compiled or executing in this browser build.
 * This is NOT a full 8086/80286 emulator. Unsupported opcodes fail closed.
 * Native JS only; no compilation, WASM or runtime transforms.
 */
(function (root) {
'use strict';
const R={AX:0,CX:1,DX:2,BX:3,SP:4,BP:5,SI:6,DI:7};
const S={ES:0,CS:1,SS:2,DS:3};
const F={CF:1,PF:4,AF:16,ZF:64,SF:128,TF:256,IF:512,DF:1024,OF:2048};
class CPUFault extends Error { constructor(message){super(message);this.name='CPUFault';} }
class PCProtectionFault extends CPUFault { constructor(vector,code,message){super(message);this.name='PCProtectionFault';this.vector=vector;this.code=code&0xffff;} }
class PC16CPU {
 constructor(machine,profile='xt') {this.m=machine;this.profile=profile;this.reset();}
 reset() {
  this.r=new Uint16Array(8);this.s=new Uint16Array(4);this.base=new Uint32Array(4);this.limit=new Uint32Array(4);
  this.limit.fill(0xffff);this.flags=0x0002;this.ip=0xfff0;this.s[S.CS]=0xf000;
  this.base[S.CS]=this.profile==='at' ? 0xff0000:0xf0000;
  this.r[R.SP]=0;this.msw=0;this.gdtr={base:0,limit:0};this.idtr={base:0,limit:0x3ff};
  this.halted=false;this.steps=0;this.ticks=0;this.lastOpcode=0;this.segOverride=null;
  this.ldtr={selector:0,base:0,limit:0,valid:false};this.tr={selector:0,base:0,limit:0,valid:false};
  this.lastFault=null;this.instructionStartIP=this.ip;this.segAccess=new Uint8Array(4);this.segAccess.fill(0x93);this.segAccess[S.CS]=0x9b;this.nullSegment=new Uint8Array(4);
 }
 get protected(){return !!(this.msw&1);}
 // 80286 real-mode FLAGS bits 12..15 read as zero and POPF cannot set them.
 // Without this, 8086-compatible DEBUG v2.50 misdetects a 386 and runs 66h.
 visibleFlags(){return (this.profile==='at'&&!this.protected)?(this.flags&0x0fff)|2:this.flags|2;}
 restoreFlags(value){
  this.flags=(value|2)&0xffff;
  if(this.profile==='at'&&!this.protected)this.flags&=0x0fff;
 }
 get cpl(){return this.s[S.CS]&3;}
 get iopl(){return (this.flags>>>12)&3;}
 requireSupervisor(label){if(this.protected&&this.cpl!==0)this.protectionFault(13,0,'286 privileged '+label+' requires CPL 0');}
 requireIOPrivilege(){if(this.protected&&this.cpl>this.iopl)this.protectionFault(13,0,'286 I/O privilege violation');}
 reg(name){return this.r[R[name]];}
 setReg(name,value){this.r[R[name]]=value&0xffff;}
 physical(seg,off,write=false){
  if(off<0||off>0xffff)throw new CPUFault('Offset outside 16-bit address space');
  if(this.protected){
   const access=this.segAccess[seg];
   if(this.nullSegment[seg])this.protectionFault(seg===S.SS?12:13,0,'286 null data/stack selector access');
   if(write && ((access&0x08)||!(access&0x02)))this.protectionFault(seg===S.SS?12:13,0,'286 write to non-writable segment');
   if(!write && (access&0x08) && seg!==S.CS && !(access&0x02))this.protectionFault(13,0,'286 unreadable code segment');
   const down=!(access&0x08)&&!!(access&0x04);
   if(down ? off<=this.limit[seg] : off>this.limit[seg])this.protectionFault(seg===S.SS?12:13,0,'Segment limit exceeded (286)');
  }
  return this.m.busAddress((this.base[seg]+off)>>>0);
 }
 checkWord(seg,off,write=false){
  // On 8086 a word at FFFF wraps within the segment; on 286 protected mode it faults.
  if(this.protected){this.physical(seg,off,write);this.physical(seg,off+1,write);}
 }
 read8(seg,off){return this.m.read8(this.physical(seg,off));}
 read16(seg,off){this.checkWord(seg,off);return this.read8(seg,off)|(this.read8(seg,(off+1)&0xffff)<<8);}
 write8(seg,off,val){this.m.write8(this.physical(seg,off,true),val&255);}
 write16(seg,off,val){this.checkWord(seg,off,true);this.write8(seg,off,val);this.write8(seg,(off+1)&0xffff,val>>>8);}
 fetch8(){const n=this.read8(S.CS,this.ip);this.ip=(this.ip+1)&0xffff;return n;}
 fetch16(){const lo=this.fetch8();return lo|(this.fetch8()<<8);}
 push(val){this.r[R.SP]=(this.r[R.SP]-2)&0xffff;this.write16(S.SS,this.r[R.SP],val);}
 pop(){const val=this.read16(S.SS,this.r[R.SP]);this.r[R.SP]=(this.r[R.SP]+2)&0xffff;return val;}
 flagsResult(val,bits=16){const mask=(1<<bits)-1,v=val&mask;this.flags=(this.flags&~(F.ZF|F.SF|F.PF))|(v===0?F.ZF:0)|(v&(1<<(bits-1))?F.SF:0);let p=v&255;p^=p>>4;p^=p>>2;p^=p>>1;if(!(p&1))this.flags|=F.PF;}
 add(a,b,carry=0){const sum=a+b+carry,v=sum&0xffff;this.flagsResult(v);this.flags=(this.flags&~(F.CF|F.OF|F.AF))|(sum>0xffff?F.CF:0)|((~(a^b)&(a^v)&0x8000)?F.OF:0)|(((a^b^v)&0x10)?F.AF:0);return v;}
 sub(a,b){const v=(a-b)&0xffff;this.flagsResult(v);this.flags=(this.flags&~(F.CF|F.OF|F.AF))|(a<b?F.CF:0)|(((a^b)&(a^v)&0x8000)?F.OF:0)|(((a^b^v)&0x10)?F.AF:0);return v;}
 protectionFault(vector,code,message){throw new PCProtectionFault(vector,code,message);}
 readDescriptor(sel,opts={}){
  if(!(sel&0xfffc))this.protectionFault(13,0,'286 null selector');
  const inLDT=!!(sel&4),table=inLDT?this.ldtr:this.gdtr;
  if(inLDT&&!table.valid)this.protectionFault(13,sel&0xfffc,'286 LDT is not loaded');
  const off=sel&~7;
  if(off+7>table.limit)this.protectionFault(13,sel&0xfffc,'286 selector outside '+(inLDT?'LDT':'GDT'));
  const a=table.base+off;
  const limit=this.m.read16Physical(a);
  const base=(this.m.read8(a+2)|(this.m.read8(a+3)<<8)|(this.m.read8(a+4)<<16))>>>0;
  const access=this.m.read8(a+5);
  if(!(access&0x80)&&!opts.allowAbsent)this.protectionFault(opts.stack?12:11,sel&0xfffc,'286 segment not present');
  if(!opts.system&&!(access&0x10))this.protectionFault(13,sel&0xfffc,'286 system descriptor where code/data expected');
  return {base,limit,access,location:a};
 }
 loadSystemSelector(kind,selector){
  if(!this.protected)this.protectionFault(6,0,'286 protected-mode instruction in real mode');
  this.requireSupervisor(kind==='ldtr'?'LLDT':'LTR');
  if(selector&4)this.protectionFault(13,selector&0xfffc,'286 system descriptor must be in GDT');
  if(!(selector&0xfffc)){
   if(kind==='ldtr'){this.ldtr={selector:0,base:0,limit:0,valid:false};return;}
   this.protectionFault(13,0,'286 null task register');
  }
  const d=this.readDescriptor(selector,{system:true});
  const type=d.access&0x1f;
  if(kind==='ldtr'&&type!==2)this.protectionFault(13,selector&0xfffc,'286 LLDT requires LDT descriptor');
  if(kind==='tr'&&type!==1)this.protectionFault(13,selector&0xfffc,'286 LTR requires available 16-bit TSS');
  if(kind==='tr'&&d.limit<43)this.protectionFault(10,selector&0xfffc,'286 TSS too small');
  if(kind==='tr')this.m.write8(d.location+5,d.access|2); // hardware sets busy bit
  this[kind]={selector:selector&0xffff,base:d.base,limit:d.limit,valid:true};
 }
 deliverProtectionFault(err){
  // Only dispatch through installed 286 IDT gates. Never swallow faults behind
  // an uninitialized IDT. The stack receives an error code above the IRET frame.
  if(!this.protected||this.profile!=='at')return false;
  const i=err.vector*8;
  if(i+7>this.idtr.limit)return false;
  const a=this.idtr.base+i,access=this.m.read8(a+5),type=access&31;
  if(!(access&128)||(type!==6&&type!==7))return false;
  const target=this.m.read16Physical(a+2);
  try {
   const d=this.readDescriptor(target);
   if(!(d.access&8)||((d.access>>>5)&3)!==(this.s[S.CS]&3))return false;
   if(this.r[R.SP]<8)return false;
   // An SS fault cannot push a reliable frame until a valid stack is available.
   if(err.vector===12&&this.nullSegment[S.SS])return false;
   this.interrupt(err.vector,false,this.instructionStartIP);
   this.push(err.code);
   this.lastFault={vector:err.vector,name:['','','','','','','','','','','#TS','#NP','#SS','#GP'][err.vector],reason:err.message,errorCode:err.code,returnIP:this.instructionStartIP,handlerCS:this.s[S.CS],handlerIP:this.ip};
   return true;
  }catch(e){return false;}
 }
 loadSegment(seg,selector){
  selector&=0xffff;
  if(this.protected){
   if(!(selector&0xfffc) && seg!==S.CS && seg!==S.SS){this.s[seg]=selector;this.base[seg]=0;this.limit[seg]=0;this.segAccess[seg]=0;this.nullSegment[seg]=1;return;}
   const d=this.readDescriptor(selector,{stack:seg===S.SS}),code=!!(d.access&8),cpl=this.s[S.CS]&3;
   const dpl=(d.access>>>5)&3,rpl=selector&3;
   if(seg===S.CS){
    if(!code)this.protectionFault(13,selector&0xfffc,'286 CS not executable');
    if(!(d.access&4)&&dpl!==cpl)this.protectionFault(13,selector&0xfffc,'286 nonconforming code DPL mismatch');
    if((d.access&4)&&dpl>cpl)this.protectionFault(13,selector&0xfffc,'286 conforming code privilege violation');
   } else if(seg===S.SS){
    if(code||!(d.access&2))this.protectionFault(12,selector&0xfffc,'286 SS not writable');
    if(dpl!==cpl||rpl!==cpl)this.protectionFault(12,selector&0xfffc,'286 stack selector privilege violation');
   } else {
    if(code && !(d.access&2))this.protectionFault(13,selector&0xfffc,'286 data selector is unreadable code');
    if(!code && dpl<Math.max(cpl,rpl))this.protectionFault(13,selector&0xfffc,'286 data selector privilege violation');
    if(code && !(d.access&4) && dpl<Math.max(cpl,rpl))this.protectionFault(13,selector&0xfffc,'286 code selector privilege violation');
   }
   this.s[seg]=selector;this.base[seg]=d.base;this.limit[seg]=d.limit;this.segAccess[seg]=d.access;this.nullSegment[seg]=0;
  } else {this.s[seg]=selector;this.base[seg]=selector<<4;this.limit[seg]=0xffff;this.segAccess[seg]=seg===S.CS?0x9b:0x93;this.nullSegment[seg]=0;}
 }
 farJump(cs,ip){this.loadSegment(S.CS,cs);this.ip=ip&0xffff;}
 interrupt(n,software=false,returnIP=this.ip){
  n&=255;
  let off,sel,interruptGate=true;
  if(this.protected){
   // 80286 protected-mode IDT has 8-byte descriptors, not the 4-byte real-mode IVT.
   const index=n*8;
   if(index+7>this.idtr.limit)throw new CPUFault('286 IDT vector outside IDTR limit');
   const addr=this.idtr.base+index;
   off=this.m.read16Physical(addr);
   sel=this.m.read16Physical(addr+2);
   const access=this.m.read8(addr+5),type=access&31;
   if(!(access&128))throw new CPUFault('286 IDT gate not present');
   if(type!==6&&type!==7)throw new CPUFault('286 unsupported IDT gate type');
   if(software&&((access>>5)&3)<(this.s[S.CS]&3))throw new CPUFault('286 software INT gate privilege violation');
   const target=this.readDescriptor(sel);
   if(!(target.access&8))throw new CPUFault('286 IDT target is not executable');
   // No TSS-based ring stack switching in this alpha. Fail explicitly.
   const currentCPL=this.s[S.CS]&3,targetDPL=(target.access>>5)&3;
   if(targetDPL!==currentCPL)throw new CPUFault('286 privilege-level stack switch not implemented');
   if(off>target.limit)throw new CPUFault('286 IDT target offset outside code segment');
   interruptGate=type===6;
  }else{
   const addr=n*4;
   off=this.m.read16Physical(addr);sel=this.m.read16Physical(addr+2);
  }
  this.push(this.visibleFlags());this.push(this.s[S.CS]);this.push(returnIP);
  // Trap gate preserves IF; interrupt gate clears it. Both clear TF.
  this.flags&=~F.TF;if(interruptGate)this.flags&=~F.IF;
  this.farJump(sel,off);this.halted=false;
 }
 // CPU divide error is a *guest* interrupt (vector 0), not a host JavaScript error.
 // 8086 pushes the instruction-end address on #DE. 80286 pushes the start address,
 // so an IRET can retry the instruction after the handler repairs the divisor.
 // The firmware's unsupported-vector fallback is deliberately not a real handler:
 // fail closed rather than silently treating #DE as handled or looping forever.
 raiseGuestFault(vector,name,reason){
  // 8086 DIV has an instruction-end return IP; 286 exceptions restart at start.
  const ip=(this.profile==='xt'&&vector===0)?this.ip:this.instructionStartIP;
  if(!this.protected){
   const off=this.m.read16Physical(vector*4),seg=this.m.read16Physical(vector*4+2);
   if((seg===0xf000&&off===0x400)||(seg===0&&off===0))
    throw new CPUFault(`${name==='#DE'?'Divide exception ':''}${name}: ${reason}; guest INT ${vector.toString(16).padStart(2,'0')}h handler not installed`);
  }
  this.interrupt(vector,false,ip);
  this.lastFault={vector,name,reason,returnIP:ip,handlerCS:this.s[S.CS],handlerIP:this.ip};
 }
 divideError(reason){this.raiseGuestFault(0,'#DE',reason);}

 get8(i){return i<4 ? this.r[i]&255 : (this.r[i-4]>>>8)&255;}
 put8(i,n){const j=i&3;this.r[j]=(i<4)?((this.r[j]&0xff00)|(n&255)):((this.r[j]&255)|((n&255)<<8));}
 // 8086 effective-address matrix: BX+SI, BX+DI, BP+SI, BP+DI, SI, DI, [disp16], BX.
 // The default segment is SS for BP-based addresses; an explicit override wins.
 modrm(){
  const b=this.fetch8(),mod=b>>>6,reg=(b>>>3)&7,rm=b&7;
  const r=this.r;
  let off=0,seg=S.DS;
  if(mod!==3){
   const combos=[r[R.BX]+r[R.SI],r[R.BX]+r[R.DI],r[R.BP]+r[R.SI],r[R.BP]+r[R.DI],r[R.SI],r[R.DI],r[R.BP],r[R.BX]];
   off=combos[rm];
   if(rm===2||rm===3||(rm===6&&mod!==0))seg=S.SS;
   if(mod===0&&rm===6)off=this.fetch16();
   else if(mod===1){let d=this.fetch8();if(d&0x80)d-=256;off+=d;}
   else if(mod===2){let d=this.fetch16();if(d&0x8000)d-=65536;off+=d;}
   off&=65535;
   if(this.segOverride!==null)seg=this.segOverride;
  }
  return {byte:b,mod,reg,rm,mem:mod!==3,seg,off};
 }
 rm8(m){return m.mem?this.read8(m.seg,m.off):this.get8(m.rm);}
 rm16(m){return m.mem?this.read16(m.seg,m.off):this.r[m.rm];}
 putRM8(m,v){if(m.mem)this.write8(m.seg,m.off,v);else this.put8(m.rm,v);}
 putRM16(m,v){if(m.mem)this.write16(m.seg,m.off,v);else this.r[m.rm]=v&65535;}
 setFlag(bit,on){this.flags=on?this.flags|bit:this.flags&~bit;}
 logic(a,b,op,bits=16){
  const mask=bits===8?255:65535;
  const v=(op==='and'?a&b:op==='or'?a|b:a^b)&mask;
  this.flagsResult(v,bits);this.flags&=~(F.CF|F.OF|F.AF);return v;
 }
 calc(op,a,b,bits=16){
  const mask=bits===8?255:65535,sign=bits===8?128:32768;
  a&=mask;b&=mask;
  if(op==='and'||op==='or'||op==='xor')return this.logic(a,b,op,bits);
  if(op==='add'||op==='adc'){
   const carry=op==='adc'&&!!(this.flags&F.CF)?1:0,full=a+b+carry,v=full&mask;
   this.flagsResult(v,bits);
   this.flags=(this.flags&~(F.CF|F.OF|F.AF))|(full>mask?F.CF:0)|((~(a^b)&(a^v)&sign)?F.OF:0)|(((a^b^v)&16)?F.AF:0);
   return v;
  }
  const carry=op==='sbb'&&!!(this.flags&F.CF)?1:0,full=a-b-carry,v=full&mask;
  this.flagsResult(v,bits);
  this.flags=(this.flags&~(F.CF|F.OF|F.AF))|(full<0?F.CF:0)|(((a^b)&(a^v)&sign)?F.OF:0)|(((a^b^v)&16)?F.AF:0);
  return v;
 }
  // 8086/286 rotate and shift groups (D0..D3, 286-only C0/C1).
  // Unlike 286, the original 8086 does NOT mask CL to five bits.
  shift(kind,value,count,bits){
   const mask=bits===8?0xff:0xffff,sign=1<<(bits-1);
   let v=value&mask;
   count=this.profile==='at'?(count&31):(count&255);
   if(!count)return v;  // a zero shift leaves *all* flags unchanged
   if(kind===6)throw new CPUFault('Reserved shift operation /6');
   let cf=!!(this.flags&F.CF),last=cf;
   for(let i=0;i<count;i++){
    switch(kind){
     case 0: last=!!(v&sign);v=((v<<1)|(last?1:0))&mask;break; // ROL
     case 1: last=!!(v&1);v=(v>>>1)|(last?sign:0);break;       // ROR
     case 2: {const old=cf;last=!!(v&sign);v=((v<<1)|(old?1:0))&mask;cf=last;break;} // RCL
     case 3: {const old=cf;last=!!(v&1);v=(v>>>1)|(old?sign:0);cf=last;break;}      // RCR
     case 4: last=!!(v&sign);v=(v<<1)&mask;break;               // SHL/SAL
     case 5: last=!!(v&1);v=v>>>1;break;                        // SHR
     case 7: last=!!(v&1);v=(v>>>1)|(v&sign);break;             // SAR
    }
   }
   this.setFlag(F.CF,last);
   if([4,5,7].includes(kind))this.flagsResult(v,bits);
   // OF is architecturally defined only for a one-bit shift/rotation.
   if(count===1){
    let of;
    if(kind===0||kind===2||kind===4)of=!!(v&sign)!==last;
    else if(kind===1||kind===3)of=!!(v&sign)!==!!(v&(sign>>>1));
    else if(kind===5)of=!!(value&sign);
    else of=false; // SAR clears OF for a one-bit shift
    this.setFlag(F.OF,of);
   }
   return v;
  }
  groupF6F7(op){
   const bits=op===0xf6?8:16,mask=bits===8?255:65535,m=this.modrm();
   const a=bits===8?this.rm8(m):this.rm16(m),sign=v=>bits===8?(v<<24)>>24:(v<<16)>>16;
   let result;
   if(m.reg===0){const imm=bits===8?this.fetch8():this.fetch16();this.logic(a,imm,'and',bits);return;}
   if(m.reg===1)throw new CPUFault('Reserved F6/F7 group /1');
   if(m.reg===2){result=(~a)&mask;} // NOT never changes flags
   else if(m.reg===3){result=this.calc('sub',0,a,bits);} // NEG, including CF/OF/AF
   else if(m.reg===4||m.reg===5){
    const signed=m.reg===5;
    if(bits===8){
     const x=signed?((this.get8(0)<<24)>>24):this.get8(0),y=signed?sign(a):a;
     const prod=x*y;this.r[R.AX]=prod&65535;
     this.setFlag(F.CF|F.OF,signed?(prod< -128||prod>127):prod>255);
    }else{
     const x=signed?((this.r[R.AX]<<16)>>16):this.r[R.AX],y=signed?sign(a):a;
     const prod=x*y;this.r[R.AX]=prod&65535;this.r[R.DX]=(prod>>>16)&65535;
     this.setFlag(F.CF|F.OF,signed?(prod< -32768||prod>32767):prod>65535);
    }
    return;
   }
   else if(m.reg===6||m.reg===7){
    if(a===0){this.divideError('zero divisor');return;}
    const signed=m.reg===7;
    const dividend=bits===8?this.r[R.AX]:(this.r[R.DX]*65536+this.r[R.AX]);
    const num=signed?(bits===8?(dividend<<16)>>16:(dividend|0)):dividend;
    const divisor=signed?sign(a):a;
    const quotient=Math.trunc(num/divisor),remainder=num%divisor;
    const min=signed?-(bits===8?128:32768):0,max=signed?(bits===8?127:32767):mask;
    if(quotient<min||quotient>max){this.divideError('quotient overflow');return;}
    if(bits===8)this.r[R.AX]=((remainder&255)<<8)|(quotient&255);
    else {this.r[R.AX]=quotient&65535;this.r[R.DX]=remainder&65535;}
    return;
   }else throw new CPUFault('Unknown F6/F7 group');
   bits===8?this.putRM8(m,result):this.putRM16(m,result);
  }
 // Return false for unsupported features instead of treating the guest code as a NOP.
 step(){
  if(this.halted)return 0;
  if(this.m.beforeInstruction)this.m.beforeInstruction(this);
  if(this.m.waitingForKey)return 0; // BIOS INT 16h blocks without executing IRET until host supplies a key.
  try {
  const origin={cs:this.s[S.CS],ip:this.ip};
  this.instructionStartIP=this.ip;this.segOverride=null;
  let rep=0,op,seen=0,lock=false;
  for(;;){
   if(++seen>15)throw new CPUFault('x86 instruction longer than 15 bytes');
   op=this.fetch8();
   if(op===0x26){this.segOverride=S.ES;continue;}
   if(op===0x2e){this.segOverride=S.CS;continue;}
   if(op===0x36){this.segOverride=S.SS;continue;}
   if(op===0x3e){this.segOverride=S.DS;continue;}
   if(op===0xf2||op===0xf3){rep=op;continue;}
   if(op===0xf0){lock=true;continue;}
   break;
  }
  this.lastOpcode=op;
  const stringOp=[0xa4,0xa5,0xa6,0xa7,0xaa,0xab,0xac,0xad,0xae,0xaf].includes(op)||(this.profile==='at'&&op>=0x6c&&op<=0x6f);
  if(rep&&!stringOp)throw new CPUFault('REP used with unsupported opcode');
  // LOCK is intentionally not executed until atomic memory semantics are modelled.
  if(lock)throw new CPUFault('LOCK prefix not implemented');
  let n,v,m,ip,seg,t;
  if(op>=0xb8&&op<=0xbf)this.r[op-0xb8]=this.fetch16();
  else if(op>=0xb0&&op<=0xb7)this.put8(op-0xb0,this.fetch8());
  else if(op>=0x50&&op<=0x57){
   // 8086 PUSH SP stores the SP after decrement; 286 stores its original value.
   if(op===0x54&&this.profile==='xt')this.push((this.r[R.SP]-2)&65535);
   else this.push(this.r[op-0x50]);
  }
  else if(op>=0x58&&op<=0x5f)this.r[op-0x58]=this.pop();
  else if(op>=0x40&&op<=0x47){n=op-0x40;v=this.flags&F.CF;this.r[n]=this.calc('add',this.r[n],1);this.flags=(this.flags&~F.CF)|v;}
  else if(op>=0x48&&op<=0x4f){n=op-0x48;v=this.flags&F.CF;this.r[n]=this.calc('sub',this.r[n],1);this.flags=(this.flags&~F.CF)|v;}
  else if(op>=0x70&&op<=0x7f){
   t=this.fetch8();if(t&128)t-=256;
   const z=!!(this.flags&F.ZF),c=!!(this.flags&F.CF),sf=!!(this.flags&F.SF),o=!!(this.flags&F.OF),pf=!!(this.flags&F.PF);
   const cond=[o,!o,c,!c,z,!z,c||z,!c&&!z,sf,!sf,pf,!pf,sf!==o,sf===o,z||(sf!==o),!z&&(sf===o)][op-0x70];
   if(cond)this.ip=(this.ip+t)&65535;
  }
  else if(op>=0x90&&op<=0x97){if(op!==0x90){n=op-0x90;v=this.r[R.AX];this.r[R.AX]=this.r[n];this.r[n]=v;}}
  else if((op<=0x3b)&&[0,1,2,3].includes(op&7)&&[0,8,16,24,32,40,48,56].includes(op&0xf8)){
   const mode=op&7,bits=mode&1?16:8,operation=['add','or','adc','sbb','and','sub','xor','cmp'][op>>>3];
   m=this.modrm();
   if(mode<2){const a=bits===16?this.rm16(m):this.rm8(m),b=bits===16?this.r[m.reg]:this.get8(m.reg);v=this.calc(operation==='cmp'?'sub':operation,a,b,bits);if(operation!=='cmp')bits===16?this.putRM16(m,v):this.putRM8(m,v);}
   else {const a=bits===16?this.r[m.reg]:this.get8(m.reg),b=bits===16?this.rm16(m):this.rm8(m);v=this.calc(operation==='cmp'?'sub':operation,a,b,bits);if(operation!=='cmp')bits===16?(this.r[m.reg]=v):this.put8(m.reg,v);}
  }
  else if([0x04,0x05,0x0c,0x0d,0x14,0x15,0x1c,0x1d,0x24,0x25,0x2c,0x2d,0x34,0x35,0x3c,0x3d].includes(op)){
   const bits=op&1?16:8,operation=['add','or','adc','sbb','and','sub','xor','cmp'][op>>>3],a=bits===16?this.r[R.AX]:this.get8(0),b=bits===16?this.fetch16():this.fetch8();
   v=this.calc(operation==='cmp'?'sub':operation,a,b,bits);
   if(operation!=='cmp')bits===16?(this.r[R.AX]=v):this.put8(0,v);
  }
  else if([0x80,0x81,0x82,0x83].includes(op)){
   m=this.modrm();const bits=(op===0x80||op===0x82)?8:16;
   n=(op===0x81)?this.fetch16():this.fetch8();if(op===0x83&&n>=128)n-=256;
   const operation=['add','or','adc','sbb','and','sub','xor','cmp'][m.reg];
   v=this.calc(operation==='cmp'?'sub':operation,bits===16?this.rm16(m):this.rm8(m),n,bits);
   if(operation!=='cmp')bits===16?this.putRM16(m,v):this.putRM8(m,v);
  }
  else if(stringOp){
   const bits=(op&1)?16:8,width=bits/8,sourceSeg=this.segOverride===null?S.DS:this.segOverride;
   // REP consumes exactly CX iterations; CMPS/SCAS terminate on ZF condition.
   let count=rep?this.r[R.CX]:1;
   while(count>0){
    const si=this.r[R.SI],di=this.r[R.DI];
    const usesSource=[0xa4,0xa5,0xa6,0xa7,0xac,0xad,0x6e,0x6f].includes(op);
    const src=usesSource?(bits===8?this.read8(sourceSeg,si):this.read16(sourceSeg,si)):0;
    const dst=()=>bits===8?this.read8(S.ES,di):this.read16(S.ES,di);
    const put=(val)=>bits===8?this.write8(S.ES,di,val):this.write16(S.ES,di,val);
    if(op===0xa4||op===0xa5)put(src);
    else if(op===0xa6||op===0xa7)this.calc('sub',src,dst(),bits);
    else if(op===0xaa||op===0xab)put(bits===8?this.get8(0):this.r[R.AX]);
    else if(op===0xac||op===0xad)bits===8?this.put8(0,src):(this.r[R.AX]=src);
    else if(op===0xae||op===0xaf)this.calc('sub',bits===8?this.get8(0):this.r[R.AX],dst(),bits);
    else if(op===0x6c||op===0x6d){this.requireIOPrivilege();put(bits===8?this.m.in8(this.r[R.DX]):this.m.in16(this.r[R.DX]));}
    else if(op===0x6e||op===0x6f){this.requireIOPrivilege();bits===8?this.m.out8(this.r[R.DX],src):this.m.out16(this.r[R.DX],src);}
    const delta=this.flags&F.DF?-width:width;
    if([0xa4,0xa5,0xa6,0xa7,0xac,0xad,0x6e,0x6f].includes(op))this.r[R.SI]=(si+delta)&65535;
    if([0xa4,0xa5,0xa6,0xa7,0xaa,0xab,0xae,0xaf,0x6c,0x6d].includes(op))this.r[R.DI]=(di+delta)&65535;
    count--;
    if(rep){this.r[R.CX]=(this.r[R.CX]-1)&65535;if([0xa6,0xa7,0xae,0xaf].includes(op)){
     const z=!!(this.flags&F.ZF);if((rep===0xf3&&!z)||(rep===0xf2&&z))break;
    }}
   }
  }
  else if([0xd0,0xd1,0xd2,0xd3,0xc0,0xc1].includes(op)){
   if((op===0xc0||op===0xc1)&&this.profile!=='at')throw new CPUFault('80186/286 immediate shift on 8086');
   m=this.modrm();const bits=(op===0xd0||op===0xd2||op===0xc0)?8:16;
   const count=(op===0xd0||op===0xd1)?1:(op===0xd2||op===0xd3)?this.get8(1):this.fetch8();
   v=this.shift(m.reg,bits===8?this.rm8(m):this.rm16(m),count,bits);
   // A zero-count shift must not write to read-only/ROM addresses.
   if((this.profile==='at'?(count&31):count)!==0){bits===8?this.putRM8(m,v):this.putRM16(m,v);}
  }
  else if(op===0xf6||op===0xf7)this.groupF6F7(op);
  else if(op===0xfe||op===0xff){
   m=this.modrm();const bits=op===0xfe?8:16;
   if(m.reg===0||m.reg===1){
    const carry=this.flags&F.CF;
    v=this.calc(m.reg===0?'add':'sub',bits===8?this.rm8(m):this.rm16(m),1,bits);
    this.flags=(this.flags&~F.CF)|carry;
    bits===8?this.putRM8(m,v):this.putRM16(m,v);
   }else if(op===0xff&&m.reg===2){ // CALL r/m16
    v=this.rm16(m);this.push(this.ip);this.ip=v;
   }else if(op===0xff&&m.reg===3){ // CALL FAR m16:16
    if(!m.mem)throw new CPUFault('CALL FAR requires memory pointer');
    ip=this.read16(m.seg,m.off);seg=this.read16(m.seg,(m.off+2)&65535);
    this.push(this.s[S.CS]);this.push(this.ip);this.farJump(seg,ip);
   }else if(op===0xff&&m.reg===4)this.ip=this.rm16(m); // JMP r/m16
   else if(op===0xff&&m.reg===5){ // JMP FAR m16:16
    if(!m.mem)throw new CPUFault('JMP FAR requires memory pointer');
    ip=this.read16(m.seg,m.off);seg=this.read16(m.seg,(m.off+2)&65535);this.farJump(seg,ip);
   }else if(op===0xff&&m.reg===6){
    v=this.rm16(m);if(!m.mem&&m.rm===R.SP&&this.profile==='xt')v=(v-2)&65535;
    this.push(v);
   }
   else throw new CPUFault('Invalid FE/FF group operation');
  }
  else switch(op){
   case 0x62: { // 80186/286 BOUND r16,m16&16: signed inclusive range
    if(this.profile!=='at')throw new CPUFault('BOUND is not an 8086 instruction');
    m=this.modrm();if(!m.mem)throw new CPUFault('BOUND requires memory operand');
    const lo=this.read16(m.seg,m.off),hi=this.read16(m.seg,(m.off+2)&65535);
    const signed16=x=>(x<<16)>>16;
    n=signed16(this.r[m.reg]);
    if(n<signed16(lo)||n>signed16(hi))this.raiseGuestFault(5,'#BR','BOUND value outside signed range');
    break;
   }
   case 0x66:case 0x67: { // 386 operand/address-size prefixes: invalid on a 286
    if(this.profile==='at')this.raiseGuestFault(6,'#UD','386 size prefix unsupported on 286');
    else throw new CPUFault('386 prefix unsupported on XT');
    break;
   }
   case 0x90:break;
   case 0x98:this.r[R.AX]=(this.get8(0)&0x80)?(0xff00|this.get8(0)):this.get8(0);break; // CBW
   case 0x99:this.r[R.DX]=(this.r[R.AX]&0x8000)?0xffff:0;break; // CWD
   case 0x9b:break; // FWAIT: preview FPU executes synchronously; no simulated busy latency
   case 0xd8:case 0xd9:case 0xda:case 0xdb:case 0xdc:case 0xdd:case 0xde:case 0xdf:
    // Optional 80287XL teaching subset on AT; XT/absent FPU preserve ESC consumption.
    if(this.profile==='at'&&this.m.fpu&&this.m.fpu.enabled)this.m.fpu.execute(op,this);
    else this.modrm();
    break;
   case 0xd7:{const addr=(this.r[R.BX]+this.get8(0))&0xffff;this.put8(0,this.read8(this.segOverride===null?S.DS:this.segOverride,addr));break;} // XLAT
   case 0xce:if(this.flags&F.OF)this.interrupt(4,true);break; // INTO
   case 0x9a: { // CALL FAR imm16:16
    ip=this.fetch16();seg=this.fetch16();this.push(this.s[S.CS]);this.push(this.ip);
    this.farJump(seg,ip);break;
   }
   case 0x63:{ // 286 ARPL r/m16, r16 (protection-mode only)
    if(this.profile!=='at'||!this.protected)throw new CPUFault('ARPL requires 286 Protected Mode');
    m=this.modrm();v=this.rm16(m);const rpl=this.r[m.reg]&3;
    const changed=(v&3)<rpl;this.setFlag(F.ZF,changed);
    if(changed)this.putRM16(m,(v&~3)|rpl);break;
   }
   case 0xc4:case 0xc5:{ // LES/LDS r16, m16:16
    m=this.modrm();if(!m.mem)throw new CPUFault('LES/LDS requires memory operand');
    const off=this.read16(m.seg,m.off),sel=this.read16(m.seg,(m.off+2)&0xffff);
    this.loadSegment(op===0xc4?S.ES:S.DS,sel);this.r[m.reg]=off;break;
   }
   case 0x69:case 0x6b:{ // 80186/286 IMUL r16,r/m16,imm
    if(this.profile!=='at')throw new CPUFault('80186/286 IMUL immediate not available on XT');
    m=this.modrm();const a=(this.rm16(m)<<16)>>16;
    let b=op===0x69?this.fetch16():this.fetch8();b=op===0x69?(b<<16)>>16:(b<<24)>>24;
    const prod=a*b;this.r[m.reg]=prod&0xffff;
    this.setFlag(F.CF|F.OF,prod< -32768||prod>32767);break;
   }
   case 0xd4:{ // AAM imm8, zero base raises guest divide error
    n=this.fetch8();if(n===0){this.divideError('AAM zero base');break;}
    v=this.get8(0);this.r[R.AX]=((Math.floor(v/n)&255)<<8)|(v%n);
    this.flagsResult(this.get8(0),8);break;
   }
   case 0xd5:{ // AAD imm8
    n=this.fetch8();v=(this.get8(4)*n+this.get8(0))&255;
    this.r[R.AX]=v;this.flagsResult(v,8);break;
   }
   case 0x37:case 0x3f:{ // AAA, AAS
    const al=this.get8(0),adjust=(al&15)>9||!!(this.flags&F.AF);
    if(adjust)this.r[R.AX]=(this.r[R.AX]+(op===0x37?0x106:-0x106))&0xffff;
    this.put8(0,this.get8(0)&15);this.setFlag(F.AF,adjust);this.setFlag(F.CF,adjust);break;
   }
   case 0x27:case 0x2f:{ // DAA / DAS
    const al=this.get8(0),oldCF=!!(this.flags&F.CF),lower=(al&15)>9||!!(this.flags&F.AF);
    let x=al;
    if(lower)x=(x+(op===0x27?6:-6))&255;
    const upper=op===0x27?(al>0x99||oldCF):(al>0x99||oldCF);
    if(upper)x=(x+(op===0x27?0x60:-0x60))&255;
    this.put8(0,x);this.setFlag(F.AF,lower);this.setFlag(F.CF,upper);this.flagsResult(x,8);break;
   }
   case 0xf4:this.requireSupervisor('HLT');this.halted=true;break;
   case 0xfa:this.requireIOPrivilege();this.flags&=~F.IF;break;
   case 0xfb:this.requireIOPrivilege();this.flags|=F.IF;break;
   case 0xfc:this.flags&=~F.DF;break;
   case 0xfd:this.flags|=F.DF;break;
   case 0xf8:this.flags&=~F.CF;break;
   case 0xf9:this.flags|=F.CF;break;
   case 0xf5:this.flags^=F.CF;break;
   case 0x9c:this.push(this.visibleFlags());break;
   case 0x9d:{
    const requested=this.pop();let mask=0xffff;
    if(this.protected){
     if(this.cpl!==0)mask&=~0x3000; // Only ring0 can change IOPL
     if(this.cpl>this.iopl)mask&=~F.IF;
    }
    this.restoreFlags((this.flags&~mask)|(requested&mask));
    break;
   }
   case 0x9e:this.flags=(this.flags&~(F.SF|F.ZF|F.AF|F.PF|F.CF))|((this.get8(4))&(F.SF|F.ZF|F.AF|F.PF|F.CF));break;
   case 0x9f:this.put8(4,(this.flags&255)|2);break;
   case 0x06:this.push(this.s[S.ES]);break;
   case 0x0e:this.push(this.s[S.CS]);break;
   case 0x16:this.push(this.s[S.SS]);break;
   case 0x1e:this.push(this.s[S.DS]);break;
   case 0x07:this.loadSegment(S.ES,this.pop());break;
   case 0x17:this.loadSegment(S.SS,this.pop());break;
   case 0x1f:this.loadSegment(S.DS,this.pop());break;
   case 0x60: // 80186+ PUSHA: saved SP must be original value
    if(this.profile!=='at')throw new CPUFault('PUSHA is not an 8086 instruction');
    v=this.r[R.SP];for(n of [R.AX,R.CX,R.DX,R.BX])this.push(this.r[n]);this.push(v);for(n of [R.BP,R.SI,R.DI])this.push(this.r[n]);break;
   case 0x61:
    if(this.profile!=='at')throw new CPUFault('POPA is not an 8086 instruction');
    for(n of [R.DI,R.SI,R.BP])this.r[n]=this.pop();this.pop();for(n of [R.BX,R.DX,R.CX,R.AX])this.r[n]=this.pop();break;
   case 0x68:case 0x6a:
    if(this.profile!=='at')throw new CPUFault('PUSH immediate is not an 8086 instruction');
    n=op===0x68?this.fetch16():this.fetch8();if(op===0x6a&&n&128)n|=0xff00;this.push(n);break;
   case 0xc8: { // 80186/286 ENTER imm16, imm8
    if(this.profile!=='at')throw new CPUFault('ENTER is not an 8086 instruction');
    const bytes=this.fetch16(),level=this.fetch8()&31;
    this.push(this.r[R.BP]);const frame=this.r[R.SP];
    if(level){let bp=this.r[R.BP];for(let i=1;i<level;i++){
     bp=(bp-2)&65535;this.push(this.read16(S.SS,bp));
    }this.push(frame);}
    this.r[R.BP]=frame;this.r[R.SP]=(this.r[R.SP]-bytes)&65535;break;
   }
   case 0xc9:
    if(this.profile!=='at')throw new CPUFault('LEAVE is not an 8086 instruction');
    this.r[R.SP]=this.r[R.BP];this.r[R.BP]=this.pop();break;
   case 0x8e:m=this.modrm();if(m.reg===1||m.reg>3)throw new CPUFault('MOV segment register invalid');this.loadSegment(m.reg,this.rm16(m));break;
   case 0x8c:m=this.modrm();if(m.reg>3)throw new CPUFault('MOV segment register invalid');this.putRM16(m,this.s[m.reg]);break;
   case 0x89:m=this.modrm();this.putRM16(m,this.r[m.reg]);break;
   case 0x8b:m=this.modrm();this.r[m.reg]=this.rm16(m);break;
   case 0x88:m=this.modrm();this.putRM8(m,this.get8(m.reg));break;
   case 0x8a:m=this.modrm();this.put8(m.reg,this.rm8(m));break;
   case 0x86:case 0x87:
    m=this.modrm();if(op===0x86){v=this.rm8(m);this.putRM8(m,this.get8(m.reg));this.put8(m.reg,v);}
    else {v=this.rm16(m);this.putRM16(m,this.r[m.reg]);this.r[m.reg]=v;}break;
   case 0x8d:m=this.modrm();if(!m.mem)throw new CPUFault('LEA requires memory effective address');this.r[m.reg]=m.off;break;
   case 0x8f:m=this.modrm();if(m.reg!==0)throw new CPUFault('POP r/m16 invalid');this.putRM16(m,this.pop());break;
   case 0x84:case 0x85:m=this.modrm();this.logic(op===0x84?this.rm8(m):this.rm16(m),op===0x84?this.get8(m.reg):this.r[m.reg],'and',op===0x84?8:16);break;
   case 0xa8:case 0xa9:this.logic(op===0xa8?this.get8(0):this.r[R.AX],op===0xa8?this.fetch8():this.fetch16(),'and',op===0xa8?8:16);break;
   case 0xa0:this.put8(0,this.read8(this.segOverride===null?S.DS:this.segOverride,this.fetch16()));break;
   case 0xa1:this.r[R.AX]=this.read16(this.segOverride===null?S.DS:this.segOverride,this.fetch16());break;
   case 0xa2:this.write8(this.segOverride===null?S.DS:this.segOverride,this.fetch16(),this.get8(0));break;
   case 0xa3:this.write16(this.segOverride===null?S.DS:this.segOverride,this.fetch16(),this.r[R.AX]);break;
   case 0xc6:case 0xc7:m=this.modrm();if(m.reg!==0)throw new CPUFault('MOV imm invalid');v=op===0xc6?this.fetch8():this.fetch16();op===0xc6?this.putRM8(m,v):this.putRM16(m,v);break;
   case 0xeb:t=this.fetch8();this.ip=(this.ip+(t&128?t-256:t))&65535;break;
   case 0xe9:t=this.fetch16();this.ip=(this.ip+(t&32768?t-65536:t))&65535;break;
   case 0xea:ip=this.fetch16();seg=this.fetch16();this.farJump(seg,ip);break;
   case 0xe8:t=this.fetch16();this.push(this.ip);this.ip=(this.ip+(t&32768?t-65536:t))&65535;break;
   case 0xc3:this.ip=this.pop();break;
   case 0xc2: t=this.fetch16();this.ip=this.pop();this.r[R.SP]=(this.r[R.SP]+t)&65535;break;
   case 0xcb:ip=this.pop();seg=this.pop();this.farJump(seg,ip);break;
   case 0xca:t=this.fetch16();ip=this.pop();seg=this.pop();this.farJump(seg,ip);this.r[R.SP]=(this.r[R.SP]+t)&65535;break;
   case 0xcd:n=this.fetch8();this.interrupt(n,true);break;
   case 0xcc:this.interrupt(3,true);break;
   case 0xcf:ip=this.pop();seg=this.pop();this.restoreFlags(this.pop());this.farJump(seg,ip);break;
   case 0xe0:case 0xe1:case 0xe2:case 0xe3:
    t=this.fetch8();if(t&128)t-=256;
    if(op===0xe3){v=this.r[R.CX]===0;}else{
     this.r[R.CX]=(this.r[R.CX]-1)&65535;
     v=this.r[R.CX]!==0 && (op===0xe2||(op===0xe1?!!(this.flags&F.ZF):!(this.flags&F.ZF)));
    }
    if(v)this.ip=(this.ip+t)&65535;break;
   case 0xe4:this.requireIOPrivilege();this.put8(0,this.m.in8(this.fetch8()));break;
   case 0xe5:this.requireIOPrivilege();this.r[R.AX]=this.m.in16(this.fetch8());break;
   case 0xec:this.requireIOPrivilege();this.put8(0,this.m.in8(this.r[R.DX]));break;
   case 0xed:this.requireIOPrivilege();this.r[R.AX]=this.m.in16(this.r[R.DX]);break;
   case 0xe6:this.requireIOPrivilege();this.m.out8(this.fetch8(),this.get8(0));break;
   case 0xe7:this.requireIOPrivilege();this.m.out16(this.fetch8(),this.r[R.AX]);break;
   case 0xee:this.requireIOPrivilege();this.m.out8(this.r[R.DX],this.get8(0));break;
   case 0xef:this.requireIOPrivilege();this.m.out16(this.r[R.DX],this.r[R.AX]);break;
   case 0x0f:{
    if(this.profile!=='at')throw new CPUFault('286 instruction on XT');
    const sub=this.fetch8();
    if(sub===0x00){ // 286 SLDT/STR/LLDT/LTR/VERR/VERW
     m=this.modrm();
     if(m.reg===0){this.putRM16(m,this.ldtr.selector);break;}
     if(m.reg===1){this.putRM16(m,this.tr.selector);break;}
     if(m.reg===2){this.loadSystemSelector('ldtr',this.rm16(m));break;}
     if(m.reg===3){this.loadSystemSelector('tr',this.rm16(m));break;}
     if(m.reg!==4&&m.reg!==5)throw new CPUFault('286 invalid 0F 00 subopcode');
     const selector=this.rm16(m);let valid=false;
     try {
      const d=this.readDescriptor(selector,{stack:seg===S.SS}),code=!!(d.access&8),rpl=selector&3;
      const cpl=this.s[S.CS]&3,dpl=(d.access>>>5)&3;
      const permitted=(code && (d.access&4)) || dpl>=Math.max(cpl,rpl);
      valid=!!permitted && (m.reg===4 ? (!code||!!(d.access&2)) : (!code&&!!(d.access&2)));
     } catch(err){if(!(err instanceof CPUFault))throw err;}
     this.setFlag(F.ZF,valid);break;
    }
    if(sub!==0x01)throw new CPUFault('286 0F group unsupported');
    m=this.modrm();
    if(m.reg===4){this.putRM16(m,this.msw);break;} // SMSW
    if(m.reg===6){this.requireSupervisor('LMSW');this.msw|=this.rm16(m)&15;break;} // LMSW, PE sticky
    if(!m.mem)throw new CPUFault('286 descriptor instruction needs memory operand');
    const table=m.reg===0||m.reg===2?'gdtr':m.reg===1||m.reg===3?'idtr':null;
    if(!table)throw new CPUFault('286 descriptor operation unsupported');
    if(m.reg===0||m.reg===1){
     this.write16(m.seg,m.off,this[table].limit);
     this.write16(m.seg,(m.off+2)&65535,this[table].base&65535);
     this.write8(m.seg,(m.off+4)&65535,(this[table].base>>>16)&255);
     this.write8(m.seg,(m.off+5)&65535,0);
    }else{
     this.requireSupervisor(m.reg===2?'LGDT':'LIDT');
     this[table]={limit:this.read16(m.seg,m.off),base:(this.read16(m.seg,(m.off+2)&65535)|(this.read8(m.seg,(m.off+4)&65535)<<16))>>>0};
    }break;
   }
   default:throw new CPUFault(`Unsupported ${this.profile} opcode ${op.toString(16).padStart(2,'0')} at ${origin.cs.toString(16)}:${origin.ip.toString(16)}`);
  }
  this.steps++;this.ticks+=4;return 4;
  } catch(err){
   if(err instanceof PCProtectionFault&&this.deliverProtectionFault(err)){
    this.steps++;this.ticks+=4;return 4;
   }
   throw err;
  }
 }
 run(maxSteps=10000){let n=0;while(n<maxSteps&&!this.halted){const cycles=this.step();if(cycles===0&&this.m.waitingForKey)break;n++;}return {executed:n,halted:this.halted,waitingForKey:!!this.m.waitingForKey,cs:this.s[S.CS],ip:this.ip,steps:this.steps};}
 snapshot(){return {profile:this.profile,r:Array.from(this.r),s:Array.from(this.s),base:Array.from(this.base),limit:Array.from(this.limit),flags:this.flags,ip:this.ip,msw:this.msw,gdtr:{...this.gdtr},idtr:{...this.idtr},ldtr:{...this.ldtr},tr:{...this.tr},halted:this.halted,steps:this.steps,lastFault:this.lastFault?{...this.lastFault}:null,segAccess:Array.from(this.segAccess),nullSegment:Array.from(this.nullSegment)};}
}
const api={PC16CPU,CPUFault,PCProtectionFault,R,S,F};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.MDPC_CPU=api;
})(typeof window!=='undefined'?window:globalThis);
