/* MD.js Ultra Phase 4B - bounded ATA-1 PIO primary master. GPL-3.0-only.
 * Source study: DOSBox-X ide.cpp, ide.h (user supplied; GPL-2.0-or-later).
 * No ATAPI, PCI, bus-master DMA, LBA48, 386, real-time spin-up or async timings.
 * Security: never mutates original IMG input; all writes update a private overlay.
 */
(function(root){'use strict';
const SECTOR=512,MAX=32*1024*1024; // 32 MiB bounded media; no guest system RAM allocation
class PCIDE {
 constructor(machine){this.machine=machine;this.image=null;this.name='';this.overlay=new Map();this.reset();}
 reset(){this.error=0;this.features=0;this.count=1;this.sector=1;this.cylinderLo=0;this.cylinderHi=0;this.drive=0xa0;this.control=0;this.status=this.image?0x50:0;this.command=0;this.transfer=null;this.index=0;this.remaining=0;this.lba=0;this.irqPending=false;}
 get capacity(){return this.image?this.image.length/SECTOR:0;}
 get geometry(){return {heads:4,sectors:16,cylinders:Math.max(1,Math.ceil(this.capacity/64))};}
 mount(bytes,name='IDE HDD'){
  if(bytes instanceof ArrayBuffer)bytes=new Uint8Array(bytes);
  if(!(bytes instanceof Uint8Array)||bytes.length===0||bytes.length%SECTOR||bytes.length>MAX)throw Error('IDE image must contain 1..65536 sectors of 512 bytes (max 32 MiB)');
  this.image=new Uint8Array(bytes);this.overlay.clear();this.name=String(name).slice(0,120);this.reset();return this.geometry;
 }
 eject(){this.image=null;this.overlay.clear();this.name='';this.reset();}
 sectorAt(lba){if(!Number.isSafeInteger(lba)||lba<0||lba>=this.capacity)throw new RangeError('IDE LBA outside mounted image');return this.overlay.get(lba)||this.image.subarray(lba*SECTOR,(lba+1)*SECTOR);}
 readSector(lba){return new Uint8Array(this.sectorAt(lba));}
 writeSector(lba,bytes){if(!(bytes instanceof Uint8Array)||bytes.length!==SECTOR)throw Error('IDE sector length must be 512');this.sectorAt(lba);this.overlay.set(lba,new Uint8Array(bytes));}
 exportArrayBuffer(){return this.exportImage().buffer;}
 exportImage(){if(!this.image)throw Error('No IDE media');const bytes=new Uint8Array(this.image);for(const [lba,sector] of this.overlay)bytes.set(sector,lba*SECTOR);return bytes;}
 irq(){this.irqPending=true;if(!(this.control&2)&&this.machine.picSlave)this.machine.requestIRQ(14);}
 currentLBA(){
  if(this.drive&0x10)throw Error('Only primary ATA master is implemented');
  if(this.drive&0x40)return (((this.drive&15)<<24)|(this.cylinderHi<<16)|(this.cylinderLo<<8)|this.sector)>>>0;
  const h=this.drive&15,c=this.cylinderLo|(this.cylinderHi<<8),s=this.sector,g=this.geometry;
  if(h>=g.heads||s<1||s>g.sectors||c>=g.cylinders)throw Error('Invalid IDE CHS address');return (c*g.heads+h)*g.sectors+s-1;
 }
 setAddress(lba){if(this.drive&0x40){this.drive=(this.drive&0xf0)|((lba>>>24)&15);this.cylinderHi=(lba>>>16)&255;this.cylinderLo=(lba>>>8)&255;this.sector=lba&255;}else {const g=this.geometry;this.sector=(lba%g.sectors)+1;this.drive=(this.drive&0xf0)|(Math.floor(lba/g.sectors)%g.heads);const cyl=Math.floor(lba/(g.sectors*g.heads));this.cylinderLo=cyl&255;this.cylinderHi=(cyl>>>8)&255;}}
 identify(){const b=new Uint8Array(SECTOR),view=new DataView(b.buffer),g=this.geometry;
  const word=(i,v)=>view.setUint16(i*2,v&65535,true);
  word(0,0x0040);word(1,g.cylinders);word(3,g.heads);word(6,g.sectors);word(47,1);word(49,0x0200);word(60,this.capacity&65535);word(61,this.capacity>>>16);
  const str=(pos,len,s)=>{s=s.padEnd(len,' ').slice(0,len);for(let i=0;i<len;i+=2){b[pos*2+i]=s.charCodeAt(i+1);b[pos*2+i+1]=s.charCodeAt(i);}};
  str(10,20,'MDJS-IDE-0001');str(23,8,'4B.1');str(27,40,'MD.JS ULTRA ATA PIO VIRTUAL HDD');return b;
 }
 fail(){this.error=0x04;this.status=0x51;this.transfer=null;this.remaining=0;this.irq();}
 execute(cmd){this.command=cmd;this.error=0;this.transfer=null;this.index=0;this.irqPending=false;
  if(!this.image){this.fail();return;}
  if(cmd===0xec){this.transfer=this.identify();this.remaining=1;this.status=0x58;this.irq();return;}
  if(cmd===0xe7){this.status=0x50;this.irq();return;}
  if(cmd!==0x20&&cmd!==0x30){this.fail();return;}
  try{const lba=this.currentLBA(),count=this.count||256;if(lba+count>this.capacity)throw Error('Transfer outside image');this.lba=lba;this.remaining=count;this.transfer=cmd===0x20?this.readSector(lba):new Uint8Array(SECTOR);this.status=0x58;this.irq();}catch{this.fail();}
 }
 nextSector(){this.remaining--;this.lba++;this.index=0;this.setAddress(this.lba);this.count=(this.count-1)&255;
  if(this.remaining>0){this.transfer=this.command===0x20?this.readSector(this.lba):new Uint8Array(SECTOR);this.status=0x58;this.irq();}
  else{this.transfer=null;this.status=0x50;this.irq();}
 }
 readData(){if(!this.transfer||this.command===0x30){this.fail();return 0xff;}const val=this.transfer[this.index++];if(this.index===SECTOR)this.nextSector();return val;}
 writeData(val){if(!this.transfer||this.command!==0x30){this.fail();return;}this.transfer[this.index++]=val&255;if(this.index===SECTOR){this.writeSector(this.lba,this.transfer);this.nextSector();}}
 read8(port){switch(port){case 0x1f0:return this.readData();case 0x1f1:return this.error;case 0x1f2:return this.count;case 0x1f3:return this.sector;case 0x1f4:return this.cylinderLo;case 0x1f5:return this.cylinderHi;case 0x1f6:return this.drive;case 0x1f7:this.irqPending=false;return this.status;case 0x3f6:return this.status;default:return null;}}
 read16(port){if(port!==0x1f0)return null;const lo=this.readData(),hi=this.readData();return lo|(hi<<8);}
 write8(port,n){n&=255;switch(port){case 0x1f0:this.writeData(n);return true;case 0x1f1:this.features=n;return true;case 0x1f2:this.count=n;return true;case 0x1f3:this.sector=n;return true;case 0x1f4:this.cylinderLo=n;return true;case 0x1f5:this.cylinderHi=n;return true;case 0x1f6:this.drive=n;return true;case 0x1f7:this.execute(n);return true;case 0x3f6:{const wasReset=this.control&4;this.control=n;if((n&4)||wasReset)this.reset();this.control=n;return true;}default:return false;}}
 write16(port,n){if(port!==0x1f0)return false;this.writeData(n);this.writeData(n>>>8);return true;}
 snapshot(codec){return {image:this.image?codec.bytesToBase64(this.exportImage()):null,name:this.name,control:this.control,drive:this.drive,count:this.count,sector:this.sector,cylinderLo:this.cylinderLo,cylinderHi:this.cylinderHi,status:this.status,error:this.error,features:this.features,command:this.command,index:this.index,remaining:this.remaining,lba:this.lba,transfer:this.transfer?codec.bytesToBase64(this.transfer):null};}
 restore(st,codec){if(!st||typeof st!=='object')throw Error('Invalid IDE snapshot');const bytes=st.image===null?null:codec.base64ToBytes(st.image,MAX);if(bytes)this.mount(bytes,st.name);else this.eject();
  for(const k of ['control','drive','count','sector','cylinderLo','cylinderHi','status','error','features','command'])if(!Number.isInteger(st[k])||st[k]<0||st[k]>255)throw Error('Invalid IDE register '+k);
  for(const k of ['index','remaining','lba'])if(!Number.isSafeInteger(st[k])||st[k]<0)throw Error('Invalid IDE '+k);
  const transfer=st.transfer===null?null:codec.base64ToBytes(st.transfer,SECTOR);
  if((transfer&&transfer.length!==SECTOR)||st.index>SECTOR||st.remaining>256||(this.image&&st.lba>this.capacity)||(!this.image&&transfer))throw Error('Invalid IDE transfer snapshot');
  Object.assign(this,{control:st.control,drive:st.drive,count:st.count,sector:st.sector,cylinderLo:st.cylinderLo,cylinderHi:st.cylinderHi,status:st.status,error:st.error,features:st.features,command:st.command,index:st.index,remaining:st.remaining,lba:st.lba,transfer});this.irqPending=false;
 }
}
const api={PCIDE};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_IDE=api;
})(typeof window!=='undefined'?window:globalThis);
