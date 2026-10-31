/* MD.js Ultra Phase 4A: bounded VGA/EGA-compatible controller for AT/286.
 * GPL-3.0-only. Native JavaScript; modeled with reference to the user-supplied
 * DOSBox-X vga.cpp/vga_memory.cpp/vga_dac.cpp/vga_attr.cpp/vga_gfx.cpp/vga_crtc.cpp.
 * No upstream code is compiled or imported at runtime. Not a complete VGA timing core.
 */
(function(root){'use strict';
const base=typeof module!=='undefined'&&module.exports?require('./PC-Video.js'):root.MDPC_VIDEO;
const {PCVideo,CGA_COLORS}=base;
const clamp6=x=>Math.round((x&63)*255/63);
class PCVGA extends PCVideo {
 constructor(machine){
  super(machine,'cga');this.adapter='vga';this.vram=new Uint8Array(262144);
  this.seq=new Uint8Array(8);this.seqIndex=0;
  this.gfx=new Uint8Array(16);this.gfxIndex=0;
  this.attr=new Uint8Array(32);this.attrIndex=0;this.attrExpectIndex=true;
  this.latch=new Uint8Array(4);this.miscOutput=0x63;
  this.dac=new Uint8Array(768);this.dacMask=255;this.dacReadIndex=0;this.dacWriteIndex=0;this.dacSubIndex=0;this.dacReadSubIndex=0;
  this.setMode(3);
 }
 get isGraphics(){return this.mode===0x12||this.mode===0x13;}
 get dimensions(){return this.mode===0x12?[640,480]:this.mode===0x13?[320,200]:[720,400];}
 get textCols(){return [0,1].includes(this.mode)?40:80;}
 // Exactly 64KiB mapped from A000:0 in supported graphics modes. B800 text remains available.
 map(a){
  if(this.isGraphics)return a>=0xa0000&&a<0xb0000?a-0xa0000:-1;
  return a>=0xb8000&&a<0xc0000?(a-0xb8000)&0x7fff:-1;
 }
 planeIndex(plane,offset){return plane*65536+(offset&65535);}
 loadLatch(offset){for(let p=0;p<4;p++)this.latch[p]=this.vram[this.planeIndex(p,offset)];}
 chain4(){return !!(this.seq[4]&8);}
 readByte(a){
  const off=this.map(a);if(off<0)return null;
  if(!this.isGraphics)return this.vram[off];
  const chained=this.chain4(),idx=chained?(off>>>2):off;
  this.loadLatch(idx);
  if(chained)return this.latch[off&3];
  if(!(this.gfx[5]&8))return this.latch[this.gfx[4]&3];
  // VGA graphics controller read mode 1: compare each of eight pixel positions.
  let match=255;
  for(let plane=0;plane<4;plane++)if(this.gfx[7]&(1<<plane)){
   const expect=(this.gfx[2]>>plane)&1;
   match&=expect?this.latch[plane]:~this.latch[plane];
  }
  return match&255;
 }
 writeByte(a,n){
  const off=this.map(a);if(off<0)return false;n&=255;
  if(!this.isGraphics){this.vram[off]=n;return true;}
  const chained=this.chain4(),addr=chained?(off>>>2):off;
  const mapMask=this.seq[2]&15;
  if(chained){const plane=off&3;if(mapMask&(1<<plane))this.vram[this.planeIndex(plane,addr)]=n;return true;}
  const mode=this.gfx[5]&3,rotation=this.gfx[3]&7;
  const rotated=((n>>>rotation)|(n<<(8-rotation)))&255;
  const alu=(this.gfx[3]>>>3)&3;
  for(let plane=0;plane<4;plane++){
   if(!(mapMask&(1<<plane)))continue;
   const old=this.latch[plane],index=this.planeIndex(plane,addr);
   let val,mask=this.gfx[8];
   if(mode===1){this.vram[index]=old;continue;}
   if(mode===2)val=(n&(1<<plane))?255:0;
   else if(mode===3){val=(this.gfx[0]&(1<<plane))?255:0;mask&=rotated;}
   else val=(this.gfx[1]&(1<<plane))?((this.gfx[0]&(1<<plane))?255:0):rotated;
   if(alu===1)val&=old;else if(alu===2)val|=old;else if(alu===3)val^=old;
   this.vram[index]=(val&mask)|(old&(~mask&255));
  }
  return true;
 }
 setMode(mode){
  if(![0,1,2,3,0x12,0x13].includes(mode))return false;
  this.mode=mode;this.modeControl=mode===3?0x29:0x0a;this.vram.fill(0);
  this.seq.fill(0);this.seq[2]=15;this.seq[4]=mode===0x13?0x0e:0x06;
  this.gfx.fill(0);this.gfx[8]=255;this.gfx[5]=mode===0x13?0x40:0;
  this.attr.fill(0);for(let i=0;i<16;i++)this.attr[i]=i;
  this.attrIndex=0;this.attrExpectIndex=true;this.latch.fill(0);
  this.cursor=[0,0];this.activePage=0;
  this.resetDAC();return true;
 }
 resetDAC(){
  this.dac.fill(0);this.dacMask=255;this.dacReadIndex=0;this.dacWriteIndex=0;
  this.dacSubIndex=0;this.dacReadSubIndex=0;
  for(let i=0;i<16;i++){
   const c=CGA_COLORS[i];for(let p=0;p<3;p++)this.dac[i*3+p]=Math.round(parseInt(c.slice(1+2*p,3+2*p),16)*63/255);
  }
  // Conventional mode-13h VGA palette approximation: EGA first 16, 6x6x6 cube, grayscale.
  let idx=16;
  for(let r=0;r<6;r++)for(let g=0;g<6;g++)for(let b=0;b<6;b++){
   const i=idx++*3;this.dac[i]=r*12+3;this.dac[i+1]=g*12+3;this.dac[i+2]=b*12+3;
  }
  for(let i=idx;i<256;i++){const value=Math.round((i-idx)*63/Math.max(1,255-idx));this.dac.set([value,value,value],i*3);}
 }
 portRead(port){
  switch(port){
   case 0x3c4:return this.seqIndex;
   case 0x3c5:return this.seq[this.seqIndex];
   case 0x3ce:return this.gfxIndex;
   case 0x3cf:return this.gfx[this.gfxIndex];
   case 0x3c1:return this.attr[this.attrIndex];
   case 0x3cc:return this.miscOutput;
   case 0x3c6:return this.dacMask;
   case 0x3c7:return 3; // DAC read state
   case 0x3c8:return this.dacWriteIndex;
   case 0x3c9:{const n=this.dac[this.dacReadIndex*3+this.dacReadSubIndex];if(++this.dacReadSubIndex===3){this.dacReadSubIndex=0;this.dacReadIndex=(this.dacReadIndex+1)&255;}return n;}
   case 0x3d4:return this.crtcIndex;
   case 0x3d5:return this.crtc[this.crtcIndex];
   case 0x3da:this.attrExpectIndex=true;return 0x09; // synthetic retrace
  }
  return null;
 }
 portWrite(port,n){n&=255;
  switch(port){
   case 0x3c4:this.seqIndex=n&7;return true;
   case 0x3c5:this.seq[this.seqIndex]=n;return true;
   case 0x3ce:this.gfxIndex=n&15;return true;
   case 0x3cf:this.gfx[this.gfxIndex]=n;return true;
   case 0x3c0:if(this.attrExpectIndex)this.attrIndex=n&31;else this.attr[this.attrIndex]=n;this.attrExpectIndex=!this.attrExpectIndex;return true;
   case 0x3c2:this.miscOutput=n;return true;
   case 0x3c6:this.dacMask=n;return true;
   case 0x3c7:this.dacReadIndex=n;this.dacReadSubIndex=0;return true;
   case 0x3c8:this.dacWriteIndex=n;this.dacSubIndex=0;return true;
   case 0x3c9:this.dac[this.dacWriteIndex*3+this.dacSubIndex]=n&63;if(++this.dacSubIndex===3){this.dacSubIndex=0;this.dacWriteIndex=(this.dacWriteIndex+1)&255;}return true;
   case 0x3d4:this.crtcIndex=n&31;return true;
   case 0x3d5:this.crtc[this.crtcIndex]=n;return true;
  }
  return false;
 }
 getPixel(x,y){
  if(!Number.isInteger(x)||!Number.isInteger(y))return null;
  if(this.mode===0x13){if(x<0||y<0||x>=320||y>=200)return null;
   const off=y*320+x;return this.vram[this.planeIndex(off&3,off>>>2)];}
  if(this.mode===0x12){if(x<0||y<0||x>=640||y>=480)return null;
   const off=y*80+(x>>>3),shift=7-(x&7);let value=0;
   for(let p=0;p<4;p++)value|=((this.vram[this.planeIndex(p,off)]>>>shift)&1)<<p;
   return value;
  }
  return null;
 }
 setPixel(x,y,value,xor=false){
  if(!Number.isInteger(x)||!Number.isInteger(y))return false;
  if(this.mode===0x13){if(x<0||y<0||x>=320||y>=200)return false;const off=y*320+x,i=this.planeIndex(off&3,off>>>2);
   this.vram[i]=xor?this.vram[i]^(value&255):value&255;return true;}
  if(this.mode===0x12){if(x<0||y<0||x>=640||y>=480)return false;
   const off=y*80+(x>>>3),bit=1<<(7-(x&7));for(let p=0;p<4;p++){
    const index=this.planeIndex(p,off);if(xor){if(value&(1<<p))this.vram[index]^=bit;}
    else this.vram[index]=(this.vram[index]&~bit)|((value&(1<<p))?bit:0);
   }return true;
  }return false;
 }
 palette(index){
  const raw=index&this.dacMask;
  const dacIndex=this.mode===0x12?this.attr[raw&15]&63:raw;
  const start=dacIndex*3;return '#'+[0,1,2].map(k=>clamp6(this.dac[start+k]).toString(16).padStart(2,'0')).join('');
 }
 render(ctx){
  if(!this.isGraphics){return super.render(ctx);}
  const [w,h]=this.dimensions,canvas=ctx.canvas;
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  const image=ctx.createImageData(w,h),colors=new Array(this.mode===0x13?256:16);
  for(let i=0;i<colors.length;i++){
   const pos=this.mode===0x12?(this.attr[i]&63):i;
   colors[i]=[clamp6(this.dac[pos*3]),clamp6(this.dac[pos*3+1]),clamp6(this.dac[pos*3+2])];
  }
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const c=colors[this.getPixel(x,y)&this.dacMask]||[0,0,0],p=(y*w+x)*4;
   image.data[p]=c[0];image.data[p+1]=c[1];image.data[p+2]=c[2];image.data[p+3]=255;
  }ctx.putImageData(image,0,0);
 }
 snapshot(codec){return {...super.snapshot(codec),vga:{seq:Array.from(this.seq),seqIndex:this.seqIndex,gfx:Array.from(this.gfx),gfxIndex:this.gfxIndex,attr:Array.from(this.attr),attrIndex:this.attrIndex,attrExpectIndex:this.attrExpectIndex,latch:Array.from(this.latch),miscOutput:this.miscOutput,dac:codec.bytesToBase64(this.dac),dacMask:this.dacMask,dacReadIndex:this.dacReadIndex,dacWriteIndex:this.dacWriteIndex,dacSubIndex:this.dacSubIndex,dacReadSubIndex:this.dacReadSubIndex}};}
 restore(data,codec){
  if(!data||!data.vga)throw new Error('VGA snapshot missing register state');
  const v=data.vga;
  for(const [k,len] of [['seq',8],['gfx',16],['attr',32],['latch',4]])if(!Array.isArray(v[k])||v[k].length!==len||!v[k].every(n=>Number.isInteger(n)&&n>=0&&n<256))throw new Error('Bad VGA register '+k);
  const dac=codec.base64ToBytes(v.dac,768);if(dac.length!==768||dac.some(n=>n>63))throw new Error('Bad VGA palette');
  for(const k of ['seqIndex','gfxIndex','attrIndex','miscOutput','dacMask','dacReadIndex','dacWriteIndex','dacSubIndex','dacReadSubIndex'])if(!Number.isInteger(v[k])||v[k]<0||v[k]>(['dacSubIndex','dacReadSubIndex'].includes(k)?2:255))throw new Error('Bad VGA register '+k);
  if(![0,1,2,3,0x12,0x13].includes(data.mode))throw new Error('Invalid VGA BIOS mode');
  super.restore(data,codec);
  this.seq.set(v.seq);this.seqIndex=v.seqIndex;this.gfx.set(v.gfx);this.gfxIndex=v.gfxIndex;
  this.attr.set(v.attr);this.attrIndex=v.attrIndex;this.attrExpectIndex=!!v.attrExpectIndex;
  this.latch.set(v.latch);this.miscOutput=v.miscOutput;this.dac.set(dac);
  for(const k of ['dacMask','dacReadIndex','dacWriteIndex','dacSubIndex','dacReadSubIndex'])this[k]=v[k];
 }
}
const api={PCVGA};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_VGA=api;
})(typeof window!=='undefined'?window:globalThis);
