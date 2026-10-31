/* MD.js Ultra — 80287XL teaching subset (Phase 4C preview).
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * DECODER + deterministic binary64 arithmetic from a subset of DOSBox-X x87 references.
 * Default binary64 preview + optional BigInt extended80 finite-arithmetic subset.
 * Neither mode is a complete hardware-accurate 80287XL (exceptions/timing/ISA).
 * Deliberately fail closed
 * on unsupported commands; no compiler, WASM, native dependencies, or 386 instructions.
 */
(function(root){
'use strict';
// Exact finite IEEE-754 x87 extended significand engine (64-bit mantissa,
// 15-bit exponent). Intentional subset: RNE rounding; exception delivery,
// transcendental functions, and all x87 ESC instructions are not implemented.
// BigInt is built into browsers/Node and requires no compilation or WASM.
class PCFloat80 {
 static norm(m,e,sticky=false){
  if(m===0n)return {m:0n,e:0};
  let neg=m<0n;if(neg)m=-m;
  let n=m.toString(2).length;
  if(n>64){let k=BigInt(n-64),low=m&((1n<<k)-1n),hi=m>>k,half=1n<<(k-1n);
   if(low>half||(low===half&&(sticky||(hi&1n)!==0n)))hi++;
   m=hi;e+=Number(k);if(m===(1n<<64n)){m>>=1n;e++;}
  }else if(n<64){m<<=BigInt(64-n);e-=64-n;}
  // Extended exponent: max 16383, min normal -16382, min subnormal -16445.
  const exp=e+63;
  if(exp>16383)return {sp:neg?'-Infinity':'Infinity'};
  if(exp< -16382){const shift=-16445-e;
   if(shift>0){const k=BigInt(shift),q=m>>k,r=m&((1n<<k)-1n),h=1n<<(k-1n);
    m=q+(r>h||(r===h&&(q&1n))?1n:0n);e=-16445;
   }
   if(!m)return {m:0n,e:0};
  }
  return {m:neg?-m:m,e};
 }
 static fromNumber(v){
  if(Number.isNaN(v))return {sp:'NaN'};
  if(!Number.isFinite(v))return {sp:v<0?'-Infinity':'Infinity'};
  if(v===0)return {m:0n,e:0};
  const d=new DataView(new ArrayBuffer(8));d.setFloat64(0,v,true);
  const bits=d.getBigUint64(0,true),neg=!!(bits>>63n),exp=Number((bits>>52n)&0x7ffn),fraction=bits&((1n<<52n)-1n);
  const mant=exp===0?fraction:((1n<<52n)|fraction);
  return PCFloat80.norm(neg?-mant:mant,(exp===0?1:exp)-1023-52);
 }
 static toNumber(v){
  if(v.sp)return v.sp==='NaN'?NaN:v.sp==='Infinity'?Infinity:-Infinity;
  return Number(v.m)*Math.pow(2,v.e);
 }
 static op(group,a,b){
  if(a.sp||b.sp){const av=PCFloat80.toNumber(a),bv=PCFloat80.toNumber(b);
   const x=group===0?av+bv:group===1?av*bv:group===4?av-bv:group===5?bv-av:group===6?av/bv:bv/av;
   return PCFloat80.fromNumber(x);
  }
  if(group===5||group===7)return PCFloat80.op(group===5?4:6,b,a);
  if(group===0||group===4){
   if(group===4)b={m:-b.m,e:b.e};
   if(a.m===0n)return b;if(b.m===0n)return a;
   // Huge exponent gaps do not affect a 64-bit rounded significand.
   if(Math.abs(a.e-b.e)>256)return a.e>b.e?a:b;
   const e=Math.min(a.e,b.e);
   return PCFloat80.norm((a.m<<BigInt(a.e-e))+(b.m<<BigInt(b.e-e)),e);
  }
  if(group===1)return PCFloat80.norm(a.m*b.m,a.e+b.e);
  if(group===6){
   if(b.m===0n)return {sp:a.m===0n?'NaN':a.m<0n?'-Infinity':'Infinity'};
   if(a.m===0n)return {m:0n,e:0};
   const bits=160n,scaled=(a.m<<bits)/b.m,rem=(a.m<<bits)%b.m;
   return PCFloat80.norm(scaled,a.e-b.e-Number(bits),rem!==0n);
  }
  throw new Error('Unsupported 80287XL arithmetic '+group);
 }
 static cmp(a,b){
  if(a.sp==='NaN'||b.sp==='NaN')return NaN;
  if(a.sp||b.sp){const av=PCFloat80.toNumber(a),bv=PCFloat80.toNumber(b);return av===bv?0:av<bv?-1:1;}
  if(a.m===0n&&b.m===0n)return 0;if(a.m===0n)return b.m>0n?-1:1;if(b.m===0n)return a.m<0n?-1:1;
  if(a.m<0n&&b.m>=0n)return -1;if(a.m>=0n&&b.m<0n)return 1;
  if(Math.abs(a.e-b.e)>256)return a.m<0n?(a.e>b.e?-1:1):(a.e>b.e?1:-1);
  const e=Math.min(a.e,b.e),x=a.m<<BigInt(a.e-e),y=b.m<<BigInt(b.e-e);return x===y?0:x<y?-1:1;
 }
 static fromWords(words){
  let mant=0n;for(let i=3;i>=0;i--)mant=(mant<<16n)|BigInt(words[i]);
  const h=words[4],neg=!!(h&0x8000),exp=h&0x7fff;
  if(exp===0x7fff)return {sp:mant===0x8000000000000000n?(neg?'-Infinity':'Infinity'):'NaN'};
  if(!mant)return {m:0n,e:0};
  return {m:neg?-mant:mant,e:(exp?exp-16383:-16382)-63};
 }
 static words(v){
  let mant=0n,h=0;
  if(v.sp){mant=v.sp==='NaN'?0xc000000000000000n:0x8000000000000000n;h=0x7fff|(v.sp==='-Infinity'?0x8000:0);}
  else if(v.m!==0n){const neg=v.m<0n;mant=neg?-v.m:v.m;const ex=v.e+63+16383;h=(ex<1?0:Math.min(0x7ffe,ex))|(neg?0x8000:0);}
  return [0,16,32,48].map(n=>Number((mant>>BigInt(n))&0xffffn)).concat(h);
 }
 static roundInteger(v,mode=0){
  if(v.sp||v.m===0n)return v;
  if(v.e>=0)return v;
  const neg=v.m<0n,mag=neg?-v.m:v.m,shift=BigInt(-v.e);
  const q=mag>>shift,rest=mag&((1n<<shift)-1n),half=1n<<(shift-1n);
  let inc=false;
  if(mode===0)inc=rest>half||(rest===half&&(q&1n)!==0n); // RNE ties-even
  else if(mode===1)inc=neg&&rest!==0n; // round toward -Infinity
  else if(mode===2)inc=!neg&&rest!==0n; // round toward +Infinity
  // mode 3: truncate toward zero
  const result=q+(inc?1n:0n);
  return PCFloat80.norm(neg?-result:result,0);
 }
 static encoded(v){return PCFloat80.words(v).map(w=>w.toString(16).padStart(4,'0')).join('');}
}

class PCFPU287 {
 constructor(enabled=false,cpuHz=12000000,precisionMode='binary64'){if(![12000000,16000000].includes(cpuHz))throw new RangeError('80287XL CPU/FPU clock must be 12 or 16 MHz');if(!['binary64','extended80'].includes(precisionMode))throw new RangeError('Invalid x87 precision mode');this.precisionMode=precisionMode;this.enabled=!!enabled;this.cpuHz=cpuHz;this.fpuHz=cpuHz;this.reset();}
 reset(){this.cells=Array(8).fill(null);this.raw80=Array(8).fill(null);this.top=0;this.cw=0x037f;this.status=0;this.instructions=0;}
 statusWord(){return (this.status&~0x3800)|((this.top&7)<<11);}
 tagWord(){let w=0;for(let i=0;i<8;i++){const v=this.cells[i];const tag=v===null?3:v===0?1:!Number.isFinite(v)?2:0;w|=tag<<(i*2);}return w;}
 get(i=0){const v=this.cells[(this.top+i)&7];if(v===null)throw new Error('80287XL stack underflow');return v;}
 put(i,v){if(typeof v!=='number')throw new Error('80287XL nonnumeric value');const j=(this.top+i)&7;this.cells[j]=v;this.raw80[j]=this.precisionMode==='extended80'?PCFloat80.fromNumber(v):null;}
 getRaw(i=0){const j=(this.top+i)&7;if(this.cells[j]===null)throw new Error('80287XL stack underflow');return this.raw80[j]||PCFloat80.fromNumber(this.cells[j]);}
 putRaw(i,v){const j=(this.top+i)&7;this.raw80[j]=v;this.cells[j]=PCFloat80.toNumber(v);}
 pushRaw(v){this.push(PCFloat80.toNumber(v));this.raw80[this.top]=v;}
 push(v){const p=(this.top+7)&7;if(this.cells[p]!==null)throw new Error('80287XL stack overflow');this.top=p;this.cells[p]=v;this.raw80[p]=this.precisionMode==='extended80'?PCFloat80.fromNumber(v):null;}
 pop(){const v=this.get();this.cells[this.top]=null;this.raw80[this.top]=null;this.top=(this.top+1)&7;return v;}
 compareRaw(a,b){const cmp=PCFloat80.cmp(a,b);this.status&=~0x4700;if(Number.isNaN(cmp))this.status|=0x4500;else if(cmp<0)this.status|=0x0100;else if(cmp===0)this.status|=0x4000;}
 compare(a,b){this.status&=~0x4700;if(Number.isNaN(a)||Number.isNaN(b))this.status|=0x4500;else if(a<b)this.status|=0x0100;else if(a===b)this.status|=0x4000;}
 roundToInteger(v){const mode=(this.cw>>>10)&3;
  if(this.precisionMode==='extended80')return PCFloat80.toNumber(PCFloat80.roundInteger(this.getRaw(),mode));
  const floor=Math.floor(v),frac=v-floor;
  if(mode===1)return Math.floor(v);if(mode===2)return Math.ceil(v);if(mode===3)return Math.trunc(v);
  return frac<0.5?floor:frac>0.5?floor+1:floor%2===0?floor:floor+1;
 }
 fpuSign(abs){
  if(this.precisionMode==='extended80'){
   const v=this.getRaw();if(v.sp){if(v.sp==='NaN')return;this.putRaw(0,{sp:abs?'Infinity':v.sp==='Infinity'?'-Infinity':'Infinity'});return;}
   this.putRaw(0,{m:abs?(v.m<0n?-v.m:v.m):-v.m,e:v.e});
  }else this.put(0,abs?Math.abs(this.get()):-this.get());
 }
 readF32(cpu,seg,off){const data=new DataView(new ArrayBuffer(4));data.setUint16(0,cpu.read16(seg,off),true);data.setUint16(2,cpu.read16(seg,(off+2)&65535),true);return data.getFloat32(0,true);}
 writeF32(cpu,seg,off,value){const data=new DataView(new ArrayBuffer(4));data.setFloat32(0,value,true);cpu.write16(seg,off,data.getUint16(0,true));cpu.write16(seg,(off+2)&65535,data.getUint16(2,true));}
 arithmetic(group,a,b){switch(group){case 0:return a+b;case 1:return a*b;case 4:return a-b;case 5:return b-a;case 6:return a/b;case 7:return b/a;default:throw new Error('Unsupported 80287XL arithmetic operation '+group);}}
 execute(op,cpu){
  // CPU has already recognized D8..DF. Decode the same 16-bit ModR/M as x86.
  const m=cpu.modrm();const b=m.byte;
  if(!this.enabled)return; // explicit no-FPU configuration retains previous ESC behavior
  if(m.mem){
   if(op===0xd9&&(m.reg===5||m.reg===7)){
    if(m.reg===5)this.cw=cpu.read16(m.seg,m.off); // FLDCW m16
    else cpu.write16(m.seg,m.off,this.cw); // FNSTCW m16
   }else if(op===0xdd&&m.reg===7)cpu.write16(m.seg,m.off,this.statusWord()); // FNSTSW m16
   else if((op===0xdf||op===0xdb)&&(m.reg===0||m.reg===3)){
    const bits=op===0xdf?16:32;
    if(m.reg===0){ // FILD signed integer
     const low=cpu.read16(m.seg,m.off);
     const raw=bits===16?(low<<16)>>16:((cpu.read16(m.seg,(m.off+2)&65535)<<16)|low);
     if(this.precisionMode==='extended80')this.pushRaw(PCFloat80.norm(BigInt(raw),0));else this.push(raw);
    }else{ // FISTP with control-word rounding, indefinite on invalid overflow
     const value=this.roundToInteger(this.get());
     const limit=bits===16?32768:2147483648;
     const invalid=!Number.isFinite(value)||value< -limit||value>=limit;
     if(invalid)this.status|=1;
     const out=invalid?-limit:value;
     cpu.write16(m.seg,m.off,out&65535);
     if(bits===32)cpu.write16(m.seg,(m.off+2)&65535,(out>>16)&65535);
     this.pop();
    }
   }else if(op===0xd9&&(m.reg===0||m.reg===2||m.reg===3)){
    if(m.reg===0)this.push(this.readF32(cpu,m.seg,m.off));
    else {this.writeF32(cpu,m.seg,m.off,this.get());if(m.reg===3)this.pop();}
   }else if(op===0xd8){
    const bval=this.readF32(cpu,m.seg,m.off);
    if(m.reg===2||m.reg===3){if(this.precisionMode==='extended80')this.compareRaw(this.getRaw(),PCFloat80.fromNumber(bval));else this.compare(this.get(),bval);if(m.reg===3)this.pop();}
    else if(this.precisionMode==='extended80')this.putRaw(0,PCFloat80.op(m.reg,this.getRaw(),PCFloat80.fromNumber(bval)));
    else this.put(0,this.arithmetic(m.reg,this.get(),bval));
   }else if(op===0xdb&&(m.reg===5||m.reg===7)){
    if(m.reg===5)this.pushRaw(PCFloat80.fromWords(Array.from({length:5},(_,i)=>cpu.read16(m.seg,(m.off+2*i)&65535))));
    else{const out=PCFloat80.words(this.getRaw());for(let i=0;i<5;i++)cpu.write16(m.seg,(m.off+2*i)&65535,out[i]);this.pop();}
   }else throw new Error('Unsupported 80287XL memory opcode '+op.toString(16)+' /'+m.reg);
  }else if(op===0xdb&&b===0xe3)this.reset(); // FNINIT
  else if(op===0xd9&&b===0xe0)this.fpuSign(false); // FCHS
  else if(op===0xd9&&b===0xe1)this.fpuSign(true); // FABS
  else if(op===0xd9&&b===0xd0){} // FNOP
  else if(op===0xd9&&b>=0xc8&&b<=0xcf){ // FXCH ST(i)
   const i=this.top,j=(this.top+(b&7))&7;
   [this.cells[i],this.cells[j]]=[this.cells[j],this.cells[i]];
   [this.raw80[i],this.raw80[j]]=[this.raw80[j],this.raw80[i]];
  }
  else if(op===0xd9&&b===0xe4){ // FTST against zero
   if(this.precisionMode==='extended80')this.compareRaw(this.getRaw(),PCFloat80.fromNumber(0));
   else this.compare(this.get(),0);
  }
  else if(op===0xd9&&b===0xfc){ // FRNDINT, preserve exact 80-bit integer
   if(this.precisionMode==='extended80')this.putRaw(0,PCFloat80.roundInteger(this.getRaw(),(this.cw>>>10)&3));
   else this.put(0,this.roundToInteger(this.get()));
  }
  else if(op===0xd9&&b===0xfa){ // FSQRT binary64 teaching mode only
   if(this.precisionMode==='extended80')throw Error('FSQRT requires unimplemented extended80 correctly rounded result');
   const val=this.get();if(val<0){this.status|=1;this.put(0,NaN);}else this.put(0,Math.sqrt(val));
  }
  else if(op===0xd9&&b===0xee)this.push(0); // FLDZ
  else if(op===0xd9&&b===0xe8)this.push(1); // FLD1
  else if(op===0xdf&&b===0xe0)cpu.r[0]=this.statusWord(); // FNSTSW AX
  else if(op===0xd8&&b>=0xc0&&b<=0xff){
   const group=(b>>>3)&7,operand=this.get(b&7);
   if(group===2||group===3){if(this.precisionMode==='extended80')this.compareRaw(this.getRaw(),this.getRaw(b&7));else this.compare(this.get(),operand);if(group===3)this.pop();}
   else if(this.precisionMode==='extended80')this.putRaw(0,PCFloat80.op(group,this.getRaw(),this.getRaw(b&7)));
   else this.put(0,this.arithmetic(group,this.get(),operand));
  }else if(op===0xde&&b>=0xc0&&b<=0xff){
   const group=(b>>>3)&7;
   if(![0,1,4,5,6,7].includes(group)||(b&7)!==1)throw new Error('Unsupported 80287XL pop arithmetic');
   // x87 DE pop variants are encoded with reverse operation names:
   // /4 FSUBRP => ST0-ST1, /5 FSUBP => ST1-ST0,
   // /6 FDIVRP => ST0/ST1, /7 FDIVP => ST1/ST0.
   const mapped={4:5,5:4,6:7,7:6}[group]??group;
   if(this.precisionMode==='extended80')this.putRaw(1,PCFloat80.op(mapped,this.getRaw(1),this.getRaw(0)));
   else this.put(1,this.arithmetic(mapped,this.get(1),this.get(0)));this.pop();
  }else if(op===0xd9&&b>=0xc0&&b<=0xc7){if(this.precisionMode==='extended80')this.pushRaw(this.getRaw(b&7));else this.push(this.get(b&7));} // FLD ST(i)
  else if(op===0xdd&&b>=0xd8&&b<=0xdf){if(this.precisionMode==='extended80')this.putRaw(b&7,this.getRaw());else this.put(b&7,this.get());this.pop();} // FSTP ST(i)
  else throw new Error('Unsupported 80287XL opcode '+op.toString(16)+' '+b.toString(16));
  this.instructions++;
 }
 snapshot(){return {enabled:this.enabled,cpuHz:this.cpuHz,fpuHz:this.fpuHz,cells:this.cells.map(v=>v===null?null:Number.isNaN(v)?'NaN':v===Infinity?'Infinity':v===-Infinity?'-Infinity':v),top:this.top,cw:this.cw,status:this.status,instructions:this.instructions,precision:'binary64-educational-preview',precisionMode:this.precisionMode,raw80:this.precisionMode==='extended80'?this.raw80.map(v=>v?PCFloat80.words(v):null):undefined};}
 restore(s){
  if(!s||typeof s.enabled!=='boolean'||!Number.isInteger(s.cpuHz)||![12000000,16000000].includes(s.cpuHz)||s.fpuHz!==s.cpuHz||!Array.isArray(s.cells)||s.cells.length!==8||!s.cells.every(v=>v===null||(typeof v==='number'&&Number.isFinite(v))||['NaN','Infinity','-Infinity'].includes(v))||!Number.isInteger(s.top)||s.top<0||s.top>7||!Number.isInteger(s.cw)||s.cw<0||s.cw>65535||!Number.isInteger(s.status)||s.status<0||s.status>65535||!Number.isSafeInteger(s.instructions)||s.instructions<0||s.precision!=='binary64-educational-preview')throw new Error('Invalid 80287XL preview snapshot');
  if(s.precisionMode!==undefined&&!['binary64','extended80'].includes(s.precisionMode))throw new Error('Invalid FPU precision mode');
  if(s.precisionMode==='extended80'&&(!Array.isArray(s.raw80)||s.raw80.length!==8||s.raw80.some(v=>v!==null&&(!Array.isArray(v)||v.length!==5||v.some(x=>!Number.isInteger(x)||x<0||x>65535)))))throw new Error('Invalid extended80 snapshot');
  if(s.precisionMode==='extended80'&&s.raw80.some((v,i)=>(v===null)!==(s.cells[i]===null)))throw new Error('Invalid extended80 stack validity');
  this.precisionMode=s.precisionMode||'binary64';this.raw80=this.precisionMode==='extended80'?s.raw80.map(v=>v===null?null:PCFloat80.fromWords(v)):Array(8).fill(null);
  this.enabled=s.enabled;this.cpuHz=s.cpuHz;this.fpuHz=s.fpuHz;this.cells=s.cells.map(v=>v==='NaN'?NaN:v==='Infinity'?Infinity:v==='-Infinity'?-Infinity:v);this.top=s.top;this.cw=s.cw;this.status=s.status;this.instructions=s.instructions;
 }
}
const api={PCFPU287,PCFloat80};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.MDPC_FPU287=api;
})(typeof window!=='undefined'?window:globalThis);
