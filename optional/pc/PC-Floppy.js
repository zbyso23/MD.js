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
 mount(drive,bytes,name='floppy.img'){
  if(![0,1].includes(drive))throw new RangeError('Only floppy A: and B:');
  if(!(bytes instanceof Uint8Array))throw new TypeError('Floppy image must be Uint8Array');
  const g=GEOMETRIES.find(x=>x.bytes===bytes.length);if(!g)throw new RangeError('Unsupported 160K/180K/320K/360K/720K/1.2M/1.44M floppy image size');
  this.disks[drive]={data:new Uint8Array(bytes),geometry:{...g},name:String(name).slice(0,128)};
  this.updateEquipment();
  return g;
 }
 eject(drive){if(![0,1].includes(drive))throw RangeError('Drive');this.disks[drive]=null;this.updateEquipment();}
 updateEquipment(){const count=this.disks.filter(Boolean).length;this.m.cmos[0x10]=((this.disks[0]?4:0)<<4)|(this.disks[1]?4:0);if(this.m.bios){const a=0x410,old=this.m.read16Physical(a),updated=(old&~0xc1)|(count?1|((count-1)<<6):0);this.m.write16Physical(a,updated);}}
 lba(drive,cyl,head,sec){
  const disk=this.disks[drive];if(!disk)return -1;
  const g=disk.geometry;
  if(!Number.isInteger(cyl)||!Number.isInteger(head)||!Number.isInteger(sec)||cyl<0||cyl>=g.cylinders||head<0||head>=g.heads||sec<1||sec>g.sectors)return -1;
  return (cyl*g.heads*g.sectors+head*g.sectors+sec-1);
 }
 readSector(drive,cyl,head,sec){const lba=this.lba(drive,cyl,head,sec);return lba<0?null:this.disks[drive].data.slice(lba*512,(lba+1)*512);}
 writeSector(drive,cyl,head,sec,bytes){const lba=this.lba(drive,cyl,head,sec);if(lba<0||!(bytes instanceof Uint8Array)||bytes.length!==512)return false;this.disks[drive].data.set(bytes,lba*512);return true;}
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
 snapshot(codec){return {dor:this.dor,cyl:[...this.cyl],status:this.status,cmd:[...this.cmd],expected:this.expected,result:[...this.result],lastInterrupt:{...this.lastInterrupt},disks:this.disks.map(d=>d?{name:d.name,bytes:codec.bytesToBase64(d.data)}:null)};}
 restore(data,codec){if(!data||!Array.isArray(data.disks)||data.disks.length!==2)throw Error('Invalid FDD snapshot');
  for(let i=0;i<2;i++){const d=data.disks[i];if(d){const bytes=codec.base64ToBytes(d.bytes,1474560);this.mount(i,bytes,d.name);} }
  this.dor=data.dor&255;this.cyl=data.cyl.slice(0,2);this.cmd=Array.isArray(data.cmd)?data.cmd.slice(0,9):[];this.result=Array.isArray(data.result)?data.result.slice(0,7):[];this.expected=Number.isInteger(data.expected)?data.expected:0;this.lastInterrupt=data.lastInterrupt&&typeof data.lastInterrupt==='object'?{...data.lastInterrupt}:{st0:0x80,cyl:0};
 }
}
const api={FDD765,GEOMETRIES};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_FLOPPY=api;
})(typeof window!=='undefined'?window:globalThis);
