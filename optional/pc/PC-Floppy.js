/* MD.js Ultra PC Floppy: bounded FAT12-era raw sector image and subset of NEC 765 I/O.
 * GPL-3.0-only; JavaScript only. Does NOT provide full timing/motor/flux modeling.
 * Actual 8237 DMA2 transfers are provided for 765 READ/WRITE DATA commands.
 */
(function(root){'use strict';
const GEOMETRIES=[
 {bytes:163840,cylinders:40,heads:1,sectors:8,type:'160K'},
 {bytes:184320,cylinders:40,heads:1,sectors:9,type:'180K'},
 {bytes:327680,cylinders:40,heads:2,sectors:8,type:'320K'},
 {bytes:368640,cylinders:40,heads:2,sectors:9,type:'360K'},
 {bytes:737280,cylinders:80,heads:2,sectors:9,type:'720K'},
 {bytes:1228800,cylinders:80,heads:2,sectors:15,type:'1.2M'},
 {bytes:1474560,cylinders:80,heads:2,sectors:18,type:'1.44M'}
];
class FDD765 {
 constructor(m){this.m=m;this.disks=[null,null];this.dor=0x0c;this.status=0;this.cmd=[];this.expected=0;this.result=[];this.cyl=[0,0];this.lastInterrupt={st0:0x80,cyl:0};}
 mount(drive,bytes,name='floppy.img',writeProtected=false){
  if(![0,1].includes(drive))throw new RangeError('Only floppy A: and B:');
  if(bytes instanceof ArrayBuffer)bytes=new Uint8Array(bytes);
  if(!(bytes instanceof Uint8Array))throw new TypeError('Floppy image must be Uint8Array or ArrayBuffer');
  if(typeof writeProtected!=='boolean')throw TypeError('FDD write protection must be boolean');
  const g=GEOMETRIES.find(x=>x.bytes===bytes.length);if(!g)throw new RangeError('Unsupported 160K/180K/320K/360K/720K/1.2M/1.44M floppy image size');
  this.disks[drive]={data:new Uint8Array(bytes),geometry:{...g},name:String(name).slice(0,128),writeProtected};
  this.updateEquipment();
  return g;
 }
 setWriteProtected(drive,on){if(![0,1].includes(drive)||!this.disks[drive])throw Error('No floppy media in selected drive');if(typeof on!=='boolean')throw TypeError('Write protect expects boolean');this.disks[drive].writeProtected=on;}
 exportImage(drive){if(![0,1].includes(drive)||!this.disks[drive])throw new Error('No floppy media in selected drive');return new Uint8Array(this.disks[drive].data);}
 exportArrayBuffer(drive){return this.exportImage(drive).buffer;}
 eject(drive){if(![0,1].includes(drive))throw RangeError('Drive');this.disks[drive]=null;this.updateEquipment();}
 updateEquipment(){const count=this.disks.filter(Boolean).length;this.m.cmos[0x10]=((this.disks[0]?4:0)<<4)|(this.disks[1]?4:0);if(this.m.bios){const a=0x410,old=this.m.read16Physical(a),updated=(old&~0xc1)|(count?1|((count-1)<<6):0);this.m.write16Physical(a,updated);}}
 lba(drive,cyl,head,sec){
  const disk=this.disks[drive];if(!disk)return -1;
  const g=disk.geometry;
  if(!Number.isInteger(cyl)||!Number.isInteger(head)||!Number.isInteger(sec)||cyl<0||cyl>=g.cylinders||head<0||head>=g.heads||sec<1||sec>g.sectors)return -1;
  return (cyl*g.heads*g.sectors+head*g.sectors+sec-1);
 }
 readSector(drive,cyl,head,sec){const lba=this.lba(drive,cyl,head,sec);return lba<0?null:this.disks[drive].data.slice(lba*512,(lba+1)*512);}
 writeSector(drive,cyl,head,sec,bytes){const lba=this.lba(drive,cyl,head,sec);if(lba<0||this.disks[drive].writeProtected||!(bytes instanceof Uint8Array)||bytes.length!==512)return false;this.disks[drive].data.set(bytes,lba*512);return true;}
 portRead(port){
  if(port===0x3f2)return this.dor;
  if(port===0x3f4)return this.result.length?0xd0:0x80; // RQM + direction for queued replies
  if(port===0x3f5)return this.result.length?this.result.shift():0xff;
  if(port===0x3f7)return 0; // no disk-change signal modelled
  return null;
 }
 portWrite(port,n){
  if(port===0x3f2){const old=this.dor;this.dor=n&255;if(!(n&4)){this.cmd=[];this.result=[];}else if(!(old&4)&&(n&4))this.interrupt(0xc0,this.cyl[n&1]);return true;}
  if(port===0x3f5){this.feed(n&255);return true;}
  if(port===0x3f7)return true; // data-rate select ignored for now
  return false;
 }
 interrupt(st0,cyl){this.lastInterrupt={st0,cyl};this.m.requestIRQ(6);}
 feed(byte){
  if(!this.cmd.length){this.cmd=[byte];const kind=byte&31;
   this.expected=([0x03,0x0f].includes(kind)?(kind===3?3:3):([0x07].includes(kind)?2:([0x06,0x05].includes(kind)?9:([0x08,0x0a].includes(kind)?(kind===8?1:2):1))));
  }else this.cmd.push(byte);
  if(this.cmd.length===this.expected){const bytes=this.cmd;this.cmd=[];this.execute(bytes);}
 }
 execute(bytes){
  const type=bytes[0]&31,drive=bytes[1]&3;
  if(type===0x03)return; // SPECIFY
  if(type===0x08){this.result=[this.lastInterrupt.st0,this.lastInterrupt.cyl];return;}
  if(type===0x07){this.cyl[drive&1]=0;this.interrupt(0x20|(drive&1),0);return;}
  if(type===0x0f){this.cyl[drive&1]=bytes[2];this.interrupt(0x20|(drive&1),bytes[2]);return;}
  if(type===0x0a){const d=this.disks[drive];if(!d){this.result=[0x40|drive,4,0,0,0,1,2];return;}
   this.result=[drive,0,0,this.cyl[drive],0,1,2];this.interrupt(drive,this.cyl[drive]);return;}
  if(type!==0x06&&type!==0x05){this.result=[0x80];return;}
  const cyl=bytes[2],head=bytes[3],sec=bytes[4],n=bytes[5],eot=bytes[6],d=this.disks[drive];
  let st0=drive,st1=0,st2=0;
  const dma=this.m.dma,chan=2,requested=dma.count[chan]+1;
  const direction=(dma.mode[chan]>>>2)&3,expectedDirection=type===0x06?1:2;
  const lba=this.lba(drive,cyl,head,sec);
  if(!d||lba<0||n!==2||sec>eot){st0=0x40|drive;st1=4;}
  else if(type===0x05&&d.writeProtected){st0=0x40|drive;st1=2;}
  else if((dma.mask&(1<<chan))||!(this.dor&4)||direction!==expectedDirection){st0=0x40|drive;st1=0x10;}
  else if(requested<512||requested%512!==0||requested>(eot-sec+1)*512||lba+requested/512>d.data.length/512){st0=0x40|drive;st1=0x10;}
  else{
   const addr=dma.addr[chan],page=dma.page[chan],blocks=requested/512;
   let valid=true;
   // Fail instead of silently DMA-ing into a ROM/video/unmapped hole.
   for(let i=0;i<requested;i++){
    const phys=this.m.busAddress((page<<16)|((addr+i)&0xffff));
    if(!(phys<this.m.conventional||(phys>=0x100000&&phys<0x100000+this.m.extended))){valid=false;break;}
   }
   if(!valid){st0=0x40|drive;st1=0x10;}
   else{
    for(let i=0;i<requested;i++){
     const phys=(page<<16)|((addr+i)&0xffff);
     if(type===0x06)this.m.write8(phys,d.data[lba*512+i]);
     else d.data[lba*512+i]=this.m.read8(phys);
    }
    dma.addr[chan]=(addr+requested)&0xffff;dma.count[chan]=(dma.count[chan]-requested)&0xffff;dma.status|=4;
   }
  }
  this.result=[st0,st1,st2,cyl,head,sec,n];this.interrupt(st0,cyl);
 }
 snapshot(codec){return {dor:this.dor,cyl:[...this.cyl],status:this.status,cmd:[...this.cmd],expected:this.expected,result:[...this.result],lastInterrupt:{...this.lastInterrupt},disks:this.disks.map(d=>d?{name:d.name,bytes:codec.bytesToBase64(d.data),writeProtected:!!d.writeProtected}:null)};}
 restore(data,codec){
  if(!data||!Array.isArray(data.disks)||data.disks.length!==2)throw Error('Invalid FDD snapshot');
  // Decode and validate ALL incoming media before mutating the live controller.
  // An invalid B: must never silently replace a valid A: or lose an ejected drive.
  const drives=data.disks.map(d=>{
   if(d===null)return null;
   if(!d||typeof d!=='object'||(d.writeProtected!==undefined&&typeof d.writeProtected!=='boolean'))throw Error('Invalid FDD drive metadata');
   const bytes=codec.base64ToBytes(d.bytes,1474560);
   const g=GEOMETRIES.find(x=>x.bytes===bytes.length);
   if(!g)throw RangeError('Unsupported floppy geometry in snapshot');
   return {data:new Uint8Array(bytes),geometry:{...g},name:String(d.name||'floppy.img').slice(0,128),writeProtected:!!d.writeProtected};
  });
  const validBytes=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>Number.isInteger(x)&&x>=0&&x<=255);
  if(!validBytes(data.cyl,2)||!validBytes(data.cmd,Array.isArray(data.cmd)?data.cmd.length:-1)||data.cmd.length>9||
     !validBytes(data.result,Array.isArray(data.result)?data.result.length:-1)||data.result.length>7||
     !Number.isInteger(data.dor)||data.dor<0||data.dor>255||
     !Number.isInteger(data.expected)||data.expected<0||data.expected>9)throw Error('Invalid FDD controller state');
  const last=data.lastInterrupt;
  if(!last||!Number.isInteger(last.st0)||!Number.isInteger(last.cyl))throw Error('Invalid FDD interrupt state');
  const status=Number.isInteger(data.status)&&data.status>=0&&data.status<=255?data.status:0;
  this.disks=drives;this.updateEquipment();
  this.dor=data.dor;this.status=status;this.cyl=[...data.cyl];this.cmd=[...data.cmd];
  this.result=[...data.result];this.expected=data.expected;this.lastInterrupt={st0:last.st0,cyl:last.cyl};
 }
}
const api={FDD765,GEOMETRIES};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_FLOPPY=api;
})(typeof window!=='undefined'?window:globalThis);
