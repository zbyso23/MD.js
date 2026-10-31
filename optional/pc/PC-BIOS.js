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
  this.set16(BDA.EQUIPMENT,m.video.adapter==='hercules'?0x30:0x20); // display type; FDD absent until INT 13h phase
  this.set16(BDA.CONVENTIONAL_KB,m.conventional>>>10);
  this.set16(BDA.KB_HEAD,0x1e);this.set16(BDA.KB_TAIL,0x1e);
  this.set16(BDA.KB_START,0x1e);this.set16(BDA.KB_LIMIT,0x3e);
  this.set32(BDA.TICKS,0);m.write8(BDA.MIDNIGHT,0);
  m.write8(BDA.FDD_STATUS,1);
  this.set16(0x44a,m.video.textCols); // BIOS screen columns
  m.write8(0x449,m.video.mode); // current BIOS video mode
  this.set16(0x44c,m.video.textCols*25*2); // text page bytes
  const supported=[0x08,0x09,0x10,0x11,0x12,0x13,0x15,0x16,0x19,0x1a];
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
   case 0x10:this.videoService(cpu);break;
   case 0x13:this.diskService(cpu);break;
   case 0x19:{this.m.bootFloppy(cpu.get8(2));return true;} // nonreturning boot chain: next step fetches 0000:7C00
   case 0x09:this.failure(cpu);break; // IRQ1 implementation deferred
  }
  return true; // CPU executes guest IRET.
 }
 diskService(cpu){
  const fn=this.ah(cpu),dl=cpu.get8(2),fdd=this.m.fdd,disk=fdd.disks[dl];
  const success=()=>{this.lastDiskStatus=0;this.setAH(cpu,0);this.cf(cpu,false);this.m.write8(BDA.FDD_STATUS,0);};
  const fail=code=>{this.lastDiskStatus=code;this.setAH(cpu,code);this.cf(cpu,true);this.m.write8(BDA.FDD_STATUS,code);};
  if(fn===0){success();return;}
  if(fn===1){this.setAH(cpu,this.lastDiskStatus);this.cf(cpu,this.lastDiskStatus!==0);return;}
  if(dl>1||!disk){fail(0x80);return;}
  const g=disk.geometry;
  if(fn===8){ // AH08 = drive geometry
   cpu.put8(5,g.cylinders-1);cpu.put8(1,g.sectors);cpu.put8(6,g.heads-1);
   cpu.put8(2,fdd.disks.filter(Boolean).length);cpu.put8(3,g.type==='1.44M'?4:g.type==='1.2M'?2:1);
   success();return;
  }
  if(fn===0x15){this.setAH(cpu,1);this.cf(cpu,false);return;}
  if(fn===0x16){success();return;} // disk-change flag not modelled
  if(fn!==2&&fn!==3&&fn!==4){fail(1);return;}
  const count=cpu.get8(0),ch=cpu.get8(5),cl=cpu.get8(1),dh=cpu.get8(6),bx=cpu.r[R.BX];
  const cyl=ch|((cl&0xc0)<<2),sec=cl&0x3f;
  const start=fdd.lba(dl,cyl,dh,sec),byteCount=count*512;
  if(count===0||count>127||start<0||start+count>disk.data.length/512){fail(4);return;}
  if(bx+byteCount>65536){fail(9);return;} // 64KiB DMA boundary
  if(fn===2){for(let i=0;i<byteCount;i++)cpu.write8(S.ES,bx+i,disk.data[start*512+i]);}
  if(fn===3){for(let i=0;i<byteCount;i++)disk.data[start*512+i]=cpu.read8(S.ES,bx+i);}
  cpu.put8(0,count);success();
 }
 videoService(cpu){
  const v=this.m.video,fn=this.ah(cpu),al=cpu.get8(0),bh=cpu.get8(7),bl=cpu.get8(3),ch=cpu.get8(5),cl=cpu.get8(1),dh=cpu.get8(6),dl=cpu.get8(2);
  switch(fn){
   case 0x00:{
    if(!v.setMode(al&0x7f)){this.failure(cpu);break;}
    this.m.write8(0x449,v.mode);this.set16(0x44a,v.textCols);this.set16(0x44c,v.textCols*25*2);this.set16(0x450,0);
    this.cf(cpu,false);break;
   }
   case 0x01:v.cursorStart=ch;v.cursorEnd=cl;v.crtc[10]=ch;v.crtc[11]=cl;this.cf(cpu,false);break;
   case 0x02:{
    if(dh>=25||dl>=v.textCols){this.failure(cpu);break;}
    v.cursor=[dh,dl];this.set16(0x450+((bh&7)*2),dh<<8|dl);v.crtc[14]=(dh*v.textCols+dl)>>8;v.crtc[15]=(dh*v.textCols+dl)&255;this.cf(cpu,false);break;
   }
   case 0x03:{
    cpu.put8(5,v.cursorStart);cpu.put8(1,v.cursorEnd);cpu.put8(6,v.cursor[0]);cpu.put8(2,v.cursor[1]);this.cf(cpu,false);break;
   }
   case 0x05:v.activePage=al&7;this.cf(cpu,false);break;
   case 0x06:case 0x07:{
    if(!v.scroll(al,bh,ch,cl,dh,dl,fn===0x06)){this.failure(cpu);break;}this.cf(cpu,false);break;
   }
   case 0x08:{
    const cell=v.readCell(v.cursor[0],v.cursor[1],bh);if(!cell){this.failure(cpu);break;}cpu.put8(0,cell.char);cpu.put8(4,cell.attr);this.cf(cpu,false);break;
   }
   case 0x09:case 0x0a:{
    v.writeRepeated(al,bl,cpu.r[R.CX],bh,fn===0x09);this.cf(cpu,false);break;
   }
   case 0x0c:{
    if(!v.isGraphics||!v.setPixel(cpu.r[R.CX],cpu.r[R.DX],al,v.adapter==='cga'&&!!(al&0x80))){this.failure(cpu);break;}this.cf(cpu,false);break;
   }
   case 0x0d:{
    const color=v.getPixel(cpu.r[R.CX],cpu.r[R.DX]);if(color===null){this.failure(cpu);break;}cpu.put8(0,color);this.cf(cpu,false);break;
   }
   case 0x0e:v.teletype(al,bl||7);this.set16(0x450,v.cursor[0]<<8|v.cursor[1]);this.cf(cpu,false);break;
   case 0x0f:cpu.put8(0,v.mode);cpu.put8(4,v.textCols);cpu.put8(7,v.activePage);this.cf(cpu,false);break;
   default:this.failure(cpu);
  }
 }
}
const api={PCBios,BDA};if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.MDPC_BIOS=api;
})(typeof window!=='undefined'?window:globalThis);
