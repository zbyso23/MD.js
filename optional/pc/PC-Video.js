/* MD.js Ultra PC Video: CGA and Hercules, native JavaScript, GPL-3.0-only.
 * Educational register/VRAM-level models, not cycle-accurate Motorola 6845 timing.
 * Graphics pixels, real B8000/B0000 memory mapping and BIOS text operations.
 * No generated binary, WebAssembly, build tool, font ROM or image dependency.
 */
(function(root){'use strict';
const CGA_COLORS=['#000000','#0000aa','#00aa00','#00aaaa','#aa0000','#aa00aa','#aa5500','#aaaaaa','#555555','#5555ff','#55ff55','#55ffff','#ff5555','#ff55ff','#ffff55','#ffffff'];
const CGA_PALETTES=[[0,3,5,7],[0,2,4,6],[0,3,4,7],[0,3,5,7]];
class PCVideo {
 constructor(machine,adapter='cga'){
  if(adapter!=='cga'&&adapter!=='hercules')throw new Error('Video adapter must be CGA or Hercules');
  this.m=machine;this.adapter=adapter;this.vram=new Uint8Array(adapter==='cga'?16384:65536);
  this.crtc=new Uint8Array(32);this.crtcIndex=0;this.colorSelect=0;
  this.mode=adapter==='cga'?3:7;this.modeControl=adapter==='cga'?0x29:0x08;
  this.hercConfig=0;this.cursorStart=6;this.cursorEnd=7;this.cursor=[0,0];this.activePage=0;this.border=0;
  this.crtc[1]=80;this.crtc[6]=25;this.crtc[10]=6;this.crtc[11]=7;
 }
 get isGraphics(){return this.adapter==='cga'?(this.mode===4||this.mode===5||this.mode===6):!!(this.modeControl&2);}
 get dimensions(){return this.adapter==='hercules'?(this.isGraphics?[720,348]:[720,350]):(this.isGraphics?[this.mode===6?640:320,200]:[this.mode===0||this.mode===1?320:640,200]);}
 get textCols(){return this.mode===0||this.mode===1?40:80;}
 get textRows(){return 25;}
 // Hercules page 1 shares B8000-BFFFF (when enabled), CGA mirrors 16KiB across B8000-BFFFF.
 map(address){
  if(this.adapter==='cga'&&address>=0xb8000&&address<0xc0000)return address&0x3fff;
  if(this.adapter==='hercules'&&address>=0xb0000&&address<0xc0000)return address-0xb0000;
  return -1;
 }
 readByte(address){const i=this.map(address);return i<0?null:this.vram[i];}
 writeByte(address,n){const i=this.map(address);if(i<0)return false;this.vram[i]=n&255;return true;}
 portRead(port){
  if(this.adapter==='cga'){
   if(port===0x3d4)return this.crtcIndex;
   if(port===0x3d5)return this.crtc[this.crtcIndex];
   if(port===0x3d8)return this.modeControl;
   if(port===0x3d9)return this.colorSelect;
   if(port===0x3da)return 0x09; // synthetic retrace/not timing accurate
  }else{
   if(port===0x3b4)return this.crtcIndex;
   if(port===0x3b5)return this.crtc[this.crtcIndex];
   if(port===0x3b8)return this.modeControl;
   if(port===0x3bf)return this.hercConfig;
   if(port===0x3ba)return 0x80; // synthetic status, not scanline timing
  }
  return null;
 }
 portWrite(port,n){
  n&=255;
  if(this.adapter==='cga'){
   if(port===0x3d4){this.crtcIndex=n&31;return true;}
   if(port===0x3d5){this.crtc[this.crtcIndex]=n;return true;}
   if(port===0x3d8){this.modeControl=n;return true;}
   if(port===0x3d9){this.colorSelect=n;return true;}
  }else{
   if(port===0x3b4){this.crtcIndex=n&31;return true;}
   if(port===0x3b5){this.crtc[this.crtcIndex]=n;return true;}
   if(port===0x3b8){this.modeControl=n;return true;}
   if(port===0x3bf){this.hercConfig=n;return true;}
  }
  return false;
 }
 setMode(mode){
  if(this.adapter==='cga'){
   if(![0,1,2,3,4,5,6].includes(mode))return false;
   this.mode=mode;
   this.modeControl=({0:0x28,1:0x28,2:0x29,3:0x29,4:0x0a,5:0x0e,6:0x1a})[mode];
  }else{
   if(mode!==7)return false;
   this.mode=7;this.modeControl=0x08;
  }
  this.vram.fill(0);this.cursor=[0,0];this.activePage=0;return true;
 }
 // BIOS text page for CGA; Hercules defaults to page 0.
 offsetForCell(row,col,page=this.activePage){
  const cols=this.textCols;
  if(row<0||row>=25||col<0||col>=cols)return -1;
  const pageSize=cols*25*2;
  return ((this.adapter==='cga'?page*pageSize:0)+(row*cols+col)*2)%this.vram.length;
 }
 readCell(row,col,page=this.activePage){const o=this.offsetForCell(row,col,page);return o<0?null:{char:this.vram[o],attr:this.vram[o+1]};}
 writeCell(row,col,char,attr=7,page=this.activePage){const o=this.offsetForCell(row,col,page);if(o<0)return false;this.vram[o]=char&255;this.vram[o+1]=attr&255;return true;}
 writeRepeated(char,attr,count,page=this.activePage,changeAttr=true){
  const [row,col]=this.cursor;const cols=this.textCols;
  for(let i=0;i<count;i++){
   const pos=row*cols+col+i;if(pos>=cols*25)break;
   const r=Math.floor(pos/cols),c=pos%cols,old=this.readCell(r,c,page);
   this.writeCell(r,c,char,changeAttr?attr:(old?old.attr:7),page);
  }
 }
 scroll(lines,attr=7,top=0,left=0,bottom=24,right=this.textCols-1,up=true){
  if(top>bottom||left>right||bottom>=25||right>=this.textCols)return false;
  const height=bottom-top+1,n=lines===0?height:Math.min(lines,height),rows=[];
  for(let r=top;r<=bottom;r++){const a=[];for(let c=left;c<=right;c++)a.push(this.readCell(r,c));rows.push(a);}
  for(let r=0;r<height;r++)for(let c=0;c<=right-left;c++){
   const src=r+(up?n:-n),cell=src>=0&&src<height?rows[src][c]:{char:32,attr};
   this.writeCell(top+r,left+c,cell.char,cell.attr);
  }
  return true;
 }
 teletype(char,attr=7){
  let [row,col]=this.cursor;const cols=this.textCols;
  if(char===13)col=0;
  else if(char===10)row++;
  else if(char===8)col=Math.max(0,col-1);
  else if(char===9)col=Math.min(cols-1,(col+8)&~7);
  else {this.writeCell(row,col,char,attr);col++;if(col>=cols){col=0;row++;}}
  if(row>=25){this.scroll(1,7);row=24;}
  this.cursor=[row,col];
 }
 // Actual CGA graphics data layout: even/odd lines occupy separate 8KiB banks.
 pixelOffset(x,y){
  if(this.adapter==='cga'){
   if(![4,5,6].includes(this.mode)||y<0||y>=200||x<0||x>=(this.mode===6?640:320))return null;
   return {offset:((y&1)*0x2000+(y>>>1)*80+(this.mode===6?(x>>>3):(x>>>2)))&0x3fff,
           shift:this.mode===6?7-(x&7):(3-(x&3))*2,mask:this.mode===6?1:3};
  }
  if(!this.isGraphics||x<0||x>=720||y<0||y>=348)return null;
  const page=(this.modeControl&0x80)?1:0;
  return {offset:page*0x8000+(y&3)*0x2000+(y>>>2)*90+(x>>>3),shift:7-(x&7),mask:1};
 }
 getPixel(x,y){const p=this.pixelOffset(x,y);return p?(this.vram[p.offset]>>>p.shift)&p.mask:null;}
 setPixel(x,y,value,xor=false){const p=this.pixelOffset(x,y);if(!p)return false;const bitmask=p.mask<<p.shift,v=(value&p.mask)<<p.shift;this.vram[p.offset]=xor?this.vram[p.offset]^v:(this.vram[p.offset]&~bitmask)|v;return true;}
 palette(index){
  if(this.adapter==='hercules')return index?'#FFBF66':'#140B02';
  if(this.mode===6)return index?'#f2f2f2':'#000000';
  if(this.mode===4||this.mode===5){
   const p=(this.colorSelect&0x20)?1:0,bright=(this.colorSelect&0x10)?8:0;
   const pal=this.mode===5?[0,3,4,7]:(p?[0,3,5,7]:[0,2,4,6]);
   if(index===0)return CGA_COLORS[this.colorSelect&15];return CGA_COLORS[(pal[index]+bright)&15];
  }
  return CGA_COLORS[index&15];
 }
 render(ctx){
  const [w,h]=this.dimensions;const canvas=ctx.canvas;
  if(canvas.width!==w)canvas.width=w;if(canvas.height!==h)canvas.height=h;
  ctx.fillStyle=this.adapter==='hercules'?'#140B02':'#000000';ctx.fillRect(0,0,w,h);
  if(this.isGraphics){
   const image=ctx.createImageData(w,h),colors=[];
   for(let i=0;i<4;i++){const col=this.palette(i),r=parseInt(col.slice(1,3),16),g=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);colors.push([r,g,b]);}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const c=colors[this.getPixel(x,y)||0],o=(y*w+x)*4;image.data[o]=c[0];image.data[o+1]=c[1];image.data[o+2]=c[2];image.data[o+3]=255;
   }
   ctx.putImageData(image,0,0);return;
  }
  // Browser text drawing is an approximation; later video ROM font could improve glyph fidelity.
  const cols=this.textCols,cw=w/cols,ch=h/25;ctx.textBaseline='top';ctx.font=`${Math.max(9,Math.floor(ch*.87))}px monospace`;
  for(let row=0;row<25;row++)for(let col=0;col<cols;col++){
   const cell=this.readCell(row,col);if(!cell)continue;
   const fg=this.adapter==='hercules'?'#FFBF66':CGA_COLORS[cell.attr&15];
   const bg=this.adapter==='hercules'?'#140B02':CGA_COLORS[(cell.attr>>>4)&7];
   ctx.fillStyle=bg;ctx.fillRect(col*cw,row*ch,Math.ceil(cw),Math.ceil(ch));
   if(cell.char&&cell.char!==32){ctx.fillStyle=fg;ctx.fillText(String.fromCharCode(cell.char>=32?cell.char:32),col*cw,row*ch);}
  }
 }
 snapshot(codec){return {adapter:this.adapter,mode:this.mode,modeControl:this.modeControl,crtcIndex:this.crtcIndex,crtc:Array.from(this.crtc),colorSelect:this.colorSelect,hercConfig:this.hercConfig,cursor:[...this.cursor],activePage:this.activePage,border:this.border,vram:codec.bytesToBase64(this.vram)};}
 restore(data,codec){
  if(!data||data.adapter!==this.adapter||!Number.isInteger(data.mode)||!Array.isArray(data.crtc)||data.crtc.length!==32||!Array.isArray(data.cursor)||data.cursor.length!==2)throw new Error('Video snapshot metadata invalid');
  const bytes=codec.base64ToBytes(data.vram,this.vram.length);if(bytes.length!==this.vram.length)throw new Error('Video snapshot VRAM size mismatch');
  this.mode=data.mode;this.modeControl=data.modeControl&255;this.crtc.set(data.crtc);this.crtcIndex=data.crtcIndex&31;this.colorSelect=data.colorSelect&255;this.hercConfig=data.hercConfig&255;this.cursor=[data.cursor[0]|0,data.cursor[1]|0];this.activePage=data.activePage|0;this.border=data.border|0;this.vram.set(bytes);
 }
}
const api={PCVideo,CGA_COLORS};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_VIDEO=api;
})(typeof window!=='undefined'?window:globalThis);
