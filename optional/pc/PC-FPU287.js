/* MD.js Ultra — 80287XL teaching subset (Phase 4C preview).
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * DECODER + deterministic binary64 arithmetic from a subset of DOSBox-X x87 references.
 * NOT precision-compatible with the 80-bit x87 extended format. Deliberately fail closed
 * on unsupported commands; no compiler, WASM, native dependencies, or 386 instructions.
 */
(function(root){
'use strict';
class PCFPU287 {
 constructor(enabled=false,cpuHz=12000000){if(![12000000,16000000].includes(cpuHz))throw new RangeError('80287XL CPU/FPU clock must be 12 or 16 MHz');this.enabled=!!enabled;this.cpuHz=cpuHz;this.fpuHz=cpuHz;this.reset();}
 reset(){this.cells=Array(8).fill(null);this.top=0;this.cw=0x037f;this.status=0;this.instructions=0;}
 statusWord(){return (this.status&~0x3800)|((this.top&7)<<11);}
 tagWord(){let w=0;for(let i=0;i<8;i++){const v=this.cells[i];const tag=v===null?3:v===0?1:!Number.isFinite(v)?2:0;w|=tag<<(i*2);}return w;}
 get(i=0){const v=this.cells[(this.top+i)&7];if(v===null)throw new Error('80287XL stack underflow');return v;}
 put(i,v){if(typeof v!=='number')throw new Error('80287XL nonnumeric value');this.cells[(this.top+i)&7]=v;}
 push(v){const p=(this.top+7)&7;if(this.cells[p]!==null)throw new Error('80287XL stack overflow');this.top=p;this.cells[p]=v;}
 pop(){const v=this.get();this.cells[this.top]=null;this.top=(this.top+1)&7;return v;}
 compare(a,b){this.status&=~0x4700;if(Number.isNaN(a)||Number.isNaN(b))this.status|=0x4500;else if(a<b)this.status|=0x0100;else if(a===b)this.status|=0x4000;}
 readF32(cpu,seg,off){const data=new DataView(new ArrayBuffer(4));data.setUint16(0,cpu.read16(seg,off),true);data.setUint16(2,cpu.read16(seg,(off+2)&65535),true);return data.getFloat32(0,true);}
 writeF32(cpu,seg,off,value){const data=new DataView(new ArrayBuffer(4));data.setFloat32(0,value,true);cpu.write16(seg,off,data.getUint16(0,true));cpu.write16(seg,(off+2)&65535,data.getUint16(2,true));}
 arithmetic(group,a,b){switch(group){case 0:return a+b;case 1:return a*b;case 4:return a-b;case 5:return b-a;case 6:return a/b;case 7:return b/a;default:throw new Error('Unsupported 80287XL arithmetic operation '+group);}}
 execute(op,cpu){
  // CPU has already recognized D8..DF. Decode the same 16-bit ModR/M as x86.
  const m=cpu.modrm();const b=m.byte;
  if(!this.enabled)return; // explicit no-FPU configuration retains previous ESC behavior
  if(m.mem){
   if(op===0xd9&&(m.reg===0||m.reg===2||m.reg===3)){
    if(m.reg===0)this.push(this.readF32(cpu,m.seg,m.off));
    else {this.writeF32(cpu,m.seg,m.off,this.get());if(m.reg===3)this.pop();}
   }else if(op===0xd8){
    const bval=this.readF32(cpu,m.seg,m.off);
    if(m.reg===2||m.reg===3){this.compare(this.get(),bval);if(m.reg===3)this.pop();}
    else this.put(0,this.arithmetic(m.reg,this.get(),bval));
   }else throw new Error('Unsupported 80287XL memory opcode '+op.toString(16)+' /'+m.reg);
  }else if(op===0xdb&&b===0xe3)this.reset(); // FNINIT
  else if(op===0xd9&&b===0xee)this.push(0); // FLDZ
  else if(op===0xd9&&b===0xe8)this.push(1); // FLD1
  else if(op===0xdf&&b===0xe0)cpu.r[0]=this.statusWord(); // FNSTSW AX
  else if(op===0xd8&&b>=0xc0&&b<=0xff){
   const group=(b>>>3)&7,operand=this.get(b&7);
   if(group===2||group===3){this.compare(this.get(),operand);if(group===3)this.pop();}
   else this.put(0,this.arithmetic(group,this.get(),operand));
  }else if(op===0xde&&b>=0xc0&&b<=0xff){
   const group=(b>>>3)&7;
   if(![0,1,4,5,6,7].includes(group)||(b&7)!==1)throw new Error('Unsupported 80287XL pop arithmetic');
   // x87 DE pop variants are encoded with reverse operation names:
   // /4 FSUBRP => ST0-ST1, /5 FSUBP => ST1-ST0,
   // /6 FDIVRP => ST0/ST1, /7 FDIVP => ST1/ST0.
   const mapped={4:5,5:4,6:7,7:6}[group]??group;
   this.put(1,this.arithmetic(mapped,this.get(1),this.get(0)));this.pop();
  }else if(op===0xd9&&b>=0xc0&&b<=0xc7)this.push(this.get(b&7)); // FLD ST(i)
  else if(op===0xdd&&b>=0xd8&&b<=0xdf){this.put(b&7,this.get());this.pop();} // FSTP ST(i)
  else throw new Error('Unsupported 80287XL opcode '+op.toString(16)+' '+b.toString(16));
  this.instructions++;
 }
 snapshot(){return {enabled:this.enabled,cpuHz:this.cpuHz,fpuHz:this.fpuHz,cells:this.cells.map(v=>v===null?null:Number.isNaN(v)?'NaN':v===Infinity?'Infinity':v===-Infinity?'-Infinity':v),top:this.top,cw:this.cw,status:this.status,instructions:this.instructions,precision:'binary64-educational-preview'};}
 restore(s){
  if(!s||typeof s.enabled!=='boolean'||!Number.isInteger(s.cpuHz)||![12000000,16000000].includes(s.cpuHz)||s.fpuHz!==s.cpuHz||!Array.isArray(s.cells)||s.cells.length!==8||!s.cells.every(v=>v===null||(typeof v==='number'&&Number.isFinite(v))||['NaN','Infinity','-Infinity'].includes(v))||!Number.isInteger(s.top)||s.top<0||s.top>7||!Number.isInteger(s.cw)||s.cw<0||s.cw>65535||!Number.isInteger(s.status)||s.status<0||s.status>65535||!Number.isSafeInteger(s.instructions)||s.instructions<0||s.precision!=='binary64-educational-preview')throw new Error('Invalid 80287XL preview snapshot');
  this.enabled=s.enabled;this.cpuHz=s.cpuHz;this.fpuHz=s.fpuHz;this.cells=s.cells.map(v=>v==='NaN'?NaN:v==='Infinity'?Infinity:v==='-Infinity'?-Infinity:v);this.top=s.top;this.cw=s.cw;this.status=s.status;this.instructions=s.instructions;
 }
}
const api={PCFPU287};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.MDPC_FPU287=api;
})(typeof window!=='undefined'?window:globalThis);
