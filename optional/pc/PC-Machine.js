/* MD.js Ultra PC Lab: memory/IO board, preliminary PIC/PIT/DMA/keyboard/CMOS + Phase 3A speaker.
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * NO floppy, graphics, DOS boot, complete chipset timing, or bus-accurate DMA yet.
 */
(function(root){
'use strict';
const cpuAPI=typeof module!=='undefined'&&module.exports?require('./PC-Core.js'):root.MDPC_CPU;
const {PC16CPU,CPUFault,R,S,F}=cpuAPI;
const biosAPI=typeof module!=='undefined'&&module.exports?require('./PC-BIOS.js'):root.MDPC_BIOS;
const {PCBios}=biosAPI;
const videoAPI=typeof module!=='undefined'&&module.exports?require('./PC-Video.js'):root.MDPC_VIDEO;
const {PCVideo}=videoAPI;
const vgaAPI=typeof module!=='undefined'&&module.exports?require('./PC-VGA.js'):root.MDPC_VGA;
const {PCVGA}=vgaAPI;
const ideAPI=typeof module!=='undefined'&&module.exports?require('./PC-IDE.js'):root.MDPC_IDE;
const {PCIDE}=ideAPI;
const fpuAPI=typeof module!=='undefined'&&module.exports?require('./PC-FPU287.js'):root.MDPC_FPU287;
const {PCFPU287}=fpuAPI;
const floppyAPI=typeof module!=='undefined'&&module.exports?require('./PC-Floppy.js'):root.MDPC_FLOPPY;
const {FDD765}=floppyAPI;
const audioAPI=typeof module!=='undefined'&&module.exports?require('./PC-Audio.js'):root.MDPC_AUDIO;
const {PCSpeakerAudio}=audioAPI;
const oplAPI=typeof module!=='undefined'&&module.exports?require('./PC-OPL2.js'):root.MDPC_OPL2;
const {PCOPL2}=oplAPI;
const sbAPI=typeof module!=='undefined'&&module.exports?require('./PC-SB2.js'):root.MDPC_SB2;
const {PCSoundBlaster2}=sbAPI;
class PIC8259 {
 constructor(vector=8){this.initialVector=vector;this.reset();}
 reset(){this.mask=0xff;this.irr=0;this.isr=0;this.vector=this.initialVector;
  this.icw=0;this.expectICW4=false;this.single=false;this.readISR=false;this.autoEOI=false;}
 writeCommand(n){
  if(n&0x10){ // ICW1: begin 8259 initialization
   this.icw=2;this.expectICW4=!!(n&1);this.single=!!(n&2);
   this.isr=0;this.irr=0;this.mask=0;this.autoEOI=false;return;
  }
  if(n&0x08){ // OCW3: choose IRR or ISR on command-port reads
   if(n&0x02)this.readISR=!!(n&0x01);return;
  }
  if(n&0x20){ // OCW2: nonspecific/specific EOI
   if(n&0x40)this.isr&=~(1<<(n&7));
   else for(let b=0;b<8;b++)if(this.isr&(1<<b)){this.isr&=~(1<<b);break;}
  }
 }
 writeData(n){
  n&=255;
  if(this.icw===2){this.vector=n&0xf8;this.icw=this.single?(this.expectICW4?4:0):3;}
  else if(this.icw===3){this.icw=this.expectICW4?4:0;} // ICW3 cascade wiring
  else if(this.icw===4){this.autoEOI=!!(n&2);this.icw=0;}
  else this.mask=n;
 }
 request(irq){if(irq<0||irq>7)throw new RangeError('PIC IRQ outside 0..7');this.irr|=1<<irq;}
 pending(){
  for(let i=0;i<8;i++){
   if(this.isr && this.isr&((1<<(i+1))-1))return -1; // in-service equal or higher priority
   if((this.irr&(1<<i))&&!(this.mask&(1<<i)))return i;
  }
  return -1;
 }
 acknowledge(){const i=this.pending();if(i<0)return -1;this.irr&=~(1<<i);if(!this.autoEOI)this.isr|=1<<i;return this.vector+i;}
 readCommand(){return this.readISR?this.isr:this.irr;}
}
class PIT8253 {
 constructor(pic){this.pic=pic;this.reload=new Uint16Array(3);this.value=new Uint32Array(3);this.mode=[3,3,3];this.access=[3,3,3];this.writeLow=[true,true,true];this.readLow=[true,true,true];this.temp=new Uint8Array(3);this.reload.fill(0);this.value.fill(65536);this.latched=[null,null,null];this.latchedReadLow=[true,true,true];}
 control(n){const c=(n>>>6)&3;if(c===3)return;
  const access=(n>>>4)&3;
  if(access===0){ // 8253 counter latch; do not change programming mode
   if(this.latched[c]===null){this.latched[c]=this.value[c]&65535;this.latchedReadLow[c]=true;}return;
  }
  this.latched[c]=null;this.access[c]=access;this.mode[c]=(n>>>1)&7;
  this.writeLow[c]=true;this.readLow[c]=true;
 }
 write(c,n){const acc=this.access[c];if(acc===1)this.reload[c]=(this.reload[c]&0xff00)|n;else if(acc===2)this.reload[c]=(this.reload[c]&255)|(n<<8);else if(acc===3){if(this.writeLow[c])this.temp[c]=n;else this.reload[c]=(n<<8)|this.temp[c];this.writeLow[c]=!this.writeLow[c];}this.value[c]=this.reload[c]||65536;}
 read(c){const held=this.latched[c]!==null,n=(held?this.latched[c]:this.value[c])&65535,a=this.access[c];
  if(a===1||a===2){if(held)this.latched[c]=null;return a===1?n&255:n>>>8;}
  const low=held?this.latchedReadLow[c]:this.readLow[c];const v=low?n&255:n>>>8;
  if(held){this.latchedReadLow[c]=!low;if(!this.latchedReadLow[c])return v;this.latched[c]=null;}
  else this.readLow[c]=!low;
  return v;
 }
 advance(ticks){
  if(!Number.isSafeInteger(ticks)||ticks<0)throw new Error('PIT ticks must be a nonnegative safe integer');
  if(!ticks)return;
  const untilNext=this.value[0]||65536;
  if(ticks<untilNext){this.value[0]=untilNext-ticks;return;}
  // IRQ0 is latched by the PIC: multiple elapsed periods cannot queue unlimited IRQs.
  const period=this.reload[0]||65536;
  this.value[0]=period-((ticks-untilNext)%period);
  this.pic.request(0);
 }
}
class DMA8237 {
 constructor(){this.addr=new Uint16Array(4);this.count=new Uint16Array(4);this.baseAddr=new Uint16Array(4);this.baseCount=new Uint16Array(4);this.page=new Uint8Array(4);this.mode=new Uint8Array(4);this.mask=15;this.flip=0;this.status=0;}
 read(port){if(port===0x08){const value=this.status;this.status&=0xf0;return value;}if(port===0x0f)return this.mask;const c=(port>>>1)&3,v=(port&1)?this.count[c]:this.addr[c],byte=this.flip?(v>>>8)&255:v&255;this.flip^=1;return byte;}
 write(port,n){n&=255;if(port<8){const c=(port>>>1)&3,arr=(port&1)?this.count:this.addr,base=(port&1)?this.baseCount:this.baseAddr;arr[c]=this.flip?((arr[c]&255)|(n<<8)):((arr[c]&0xff00)|n);base[c]=arr[c];this.flip^=1;}
 else if(port===0x0c)this.flip=0;
 else if(port===0x0a){const c=n&3;this.mask=n&4?(this.mask|(1<<c)):(this.mask&~(1<<c));}
 else if(port===0x0b)this.mode[n&3]=n;
 else if(port===0x0e)this.mask=0;
 else if(port===0x0f)this.mask=n&15;
 else if(port===0x0d){this.mask=15;this.flip=0;}
 }
 // No peripheral DMA transfers yet. Phase 3 will implement request/ack cycles.
}
class PCMachine {
 constructor(profile='xt',opts={}){
  if(!['xt','at'].includes(profile))throw new Error('profile must be xt or at');
  this.profile=profile;
  if(opts.videoAdapter==='vga'&&profile!=='at')throw new Error('VGA is available on AT/286 only');
  this.video=opts.videoAdapter==='vga'?new PCVGA(this):new PCVideo(this,opts.videoAdapter||'cga');
  this.fdd=new FDD765(this);this.ide=profile==='at'?new PCIDE(this):null;
  if(profile==='xt'&&opts.fpuEnabled)throw new Error('80287XL requires AT/286');
  this.cpuHz=profile==='at'?(opts.cpuHz||12000000):4770000;
  this.fpu=new PCFPU287(profile==='at'&&!!opts.fpuEnabled,profile==='at'?this.cpuHz:12000000,opts.fpuPrecision||'binary64');
  this.conventional=opts.conventional??640*1024;
  this.extended=opts.extended??(profile==='at'?384*1024:0);
  if(!Number.isSafeInteger(this.conventional)||this.conventional<64*1024||this.conventional>640*1024||this.conventional%1024||!Number.isSafeInteger(this.extended)||this.extended<0||this.extended%1024||this.conventional+this.extended>1024*1024||(profile==='xt'&&this.extended))throw new RangeError('Installed system RAM maximum is 1 MiB; XT conventional only');
  this.ram=new Uint8Array(this.conventional);
  this.extRam=new Uint8Array(this.extended);
  this.rom=new Uint8Array(65536);this.rom.fill(0xf4);
  this.pic=new PIC8259(8);this.picSlave=profile==='at'?new PIC8259(0x70):null;this.pit=new PIT8253(this.pic);this.dma=new DMA8237();
  this.cmos=new Uint8Array(128);this.cmosIndex=0;this.a20=false;this.kbcOutput=0;this.kbcInputCommand=0;this.kbdQueue=[];
  this.lptData=128;this.lptControl=0x0c;this.lptStatus=0x90;
  this.xtKeyboard=0;this.waitingForKey=false;this.biosTickAccumulator=0;this.log=[];this.biosCalls=[];this.cpu=new PC16CPU(this,profile);
  this.audio=new PCSpeakerAudio(this);this.opl=new PCOPL2(this.audio.sampleRate);this.audio.opl=this.opl;this.sb2=new PCSoundBlaster2(this);this.audio.sb2=this.sb2;
  this.bios=new PCBios(this);
  this.installFirmware();
 }
 busAddress(n){n>>>0;if(this.profile==='xt')return n&0xfffff;if(!this.a20)n&=~0x100000;return n&0xffffff;}
 romOffset(a){if(a>=0xf0000&&a<=0xfffff)return a-0xf0000;
  // 286 reset CS has hidden base FF0000; with gate A20 disabled it aliases EF0000.
  if(this.profile==='at'&&((a>=0xff0000&&a<=0xffffff)||(a>=0xef0000&&a<=0xefffff)))return a&0xffff;
  return -1;
 }
 read8(a){a=this.busAddress(a);const v=this.video.readByte(a);if(v!==null)return v;if(a<this.conventional)return this.ram[a];if(a>=0x100000&&a<0x100000+this.extended)return this.extRam[a-0x100000];const o=this.romOffset(a);return o>=0?this.rom[o]:0xff;}
 write8(a,n){a=this.busAddress(a);n&=255;if(this.video.writeByte(a,n))return;if(a<this.conventional)this.ram[a]=n;else if(a>=0x100000&&a<0x100000+this.extended)this.extRam[a-0x100000]=n;}
 read16Physical(a){return this.read8(a)|(this.read8(a+1)<<8);}
 write16Physical(a,n){this.write8(a,n);this.write8(a+1,n>>>8);}
 in8(port){port&=0xffff;if(this.ide){const idePort=this.ide.read8(port);if(idePort!==null)return idePort;}const fddPort=this.fdd.portRead(port);if(fddPort!==null)return fddPort;const videoPort=this.video.portRead(port);if(videoPort!==null)return videoPort;
  if(port>=0x220&&port<=0x22f)return this.sb2.portRead(port);
  if(port===0x388)return this.opl.readStatus(this.audio.clock/1193182);
  if(port===0x389)return 0xff;
  if(port===0x378)return this.lptData;
  if(port===0x379)return this.lptStatus;
  if(port===0x37a)return this.lptControl;
  if(port===0x20)return this.pic.readCommand();if(port===0x21)return this.pic.mask;
  if(port===0xa0&&this.picSlave)return this.picSlave.readCommand();if(port===0xa1&&this.picSlave)return this.picSlave.mask;
  if(port<=0x0f)return this.dma.read(port);
  if(port>=0x40&&port<=0x42){if(port===0x42){this.audio.sync();this.pit.value[2]=this.audio.counterAt(this.audio.clock);}return this.pit.read(port-0x40);}
  if(port===0x60)return this.kbdQueue.shift()??(this.profile==='at'?0:0xff);
  if(port===0x64)return this.profile==='at'?(this.kbdQueue.length?1:0):0xff;
  if(port===0x61)return this.kbcOutput; // Bit 5 PIT feedback not yet modelled (3A limited gate).
  if(port===0x70)return this.cmosIndex;
  if(port===0x71&&this.profile==='at')return this.cmos[this.cmosIndex];
  if(port===0x92&&this.profile==='at')return this.a20?2:0;
  return 0xff;
 }
 in16(port){if(this.ide){const n=this.ide.read16(port&0xffff);if(n!==null)return n;}return this.in8(port)|(this.in8((port+1)&0xffff)<<8);}
 out8(port,n){port&=0xffff;n&=255;if(this.ide&&this.ide.write8(port,n))return;if(this.fdd.portWrite(port,n))return;if(this.video.portWrite(port,n))return;
  if(port===0x83){this.dma.page[1]=n;return;}
  if(port>=0x220&&port<=0x22f){this.audio.sync();this.sb2.portWrite(port,n,this.audio.clock);return;}
  if(port===0x388||port===0x389){this.audio.sync();if(port===0x388)this.opl.writeAddress(n);else this.opl.writeData(n,this.audio.clock/1193182);return;}
  if(port===0x378){this.audio.onCovoxWrite(n);this.lptData=n;return;}
  if(port===0x37a){this.lptControl=n;return;}
  if(port===0x81){this.dma.page[2]=n;return;} // DMA page register ch2
  if(port===0x20)this.pic.writeCommand(n);
  else if(port===0x21)this.pic.writeData(n);
  else if(port===0xa0&&this.picSlave)this.picSlave.writeCommand(n);
  else if(port===0xa1&&this.picSlave)this.picSlave.writeData(n);
  else if(port<=0x0f)this.dma.write(port,n);
  else if(port===0x43){this.audio.onPITControl(n,this.pit);this.pit.control(n);}
  else if(port>=0x40&&port<=0x42){const ch=port-0x40,wasLow=this.pit.writeLow[ch],acc=this.pit.access[ch];this.pit.write(ch,n);if(ch===2)this.audio.onPITWrite(this.pit,wasLow,acc);}
  else if(port===0x61){this.audio.onPort61(n);this.kbcOutput=n;}
  else if(port===0x64&&this.profile==='at')this.kbcInputCommand=n;
  else if(port===0x60&&this.profile==='at'){
   if(this.kbcInputCommand===0xd1){this.a20=!!(n&2);this.kbcInputCommand=0;}
  }
  else if(port===0x70&&this.profile==='at')this.cmosIndex=n&127;
  else if(port===0x71&&this.profile==='at')this.cmos[this.cmosIndex]=n;
  else if(port===0x92&&this.profile==='at')this.a20=!!(n&2);
 }
 out16(port,n){if(this.ide&&this.ide.write16(port&0xffff,n))return;this.out8(port,n&255);this.out8((port+1)&0xffff,n>>>8);}
 injectScancode(code){this.kbdQueue.push(code&255);this.pic.request(1);}
 installFirmware(){
  // Self-authored minimal guest firmware; NOT imported DOSBox code or historical POST.
  // reset vector: FAR JMP F000:0100
  this.rom.set([0xea,0x00,0x01,0x00,0xf0],0xfff0);
  // CLI; SS=0000; SP=7000; DS=0040; BDA equipment 0021; mem KB 0280;
  // INT 11h; INT 12h; STI; HLT; JMP back to HLT
  const boot=[0xfa,0xb8,0,0,0x8e,0xd0,0xbc,0,0x70,0xb8,0x40,0,0x8e,0xd8,0xb8,this.video.adapter==='hercules'?0x30:0x20,0,0xa3,0x10,0,0xb8,(this.conventional>>>10)&255,(this.conventional>>>18)&255,0xa3,0x13,0,0xcd,0x11,0xcd,0x12,0xfb,0xf4,0xeb,0xfd];
  this.rom.set(boot,0x100);
  this.bios.init();
  this.cpu.reset();
 }
 beforeInstruction(cpu){return this.bios.dispatch(cpu);}
 queueBIOSKey(code){const ok=this.bios.queueKey(code);if(ok)this.waitingForKey=false;return ok;}
 mountDisk(drive,bytes,name){return this.fdd.mount(drive,bytes,name);}
 bootFloppy(drive=0){
  this.waitingForKey=false;
  const sector=this.fdd.readSector(drive,0,0,1);if(!sector)throw new Error('Boot drive absent or invalid CHS');
  if(sector[510]!==0x55||sector[511]!==0xaa)throw new Error('Boot sector signature 55 AA missing');
  this.ram.set(sector,0x7c00);
  const c=this.cpu;c.loadSegment(S.CS,0);c.loadSegment(S.DS,0);c.loadSegment(S.ES,0);c.loadSegment(S.SS,0);
  c.ip=0x7c00;c.r[R.SP]=0x7c00;c.put8(2,drive);c.halted=false;return {cs:0,ip:0x7c00,drive};
 }
 tickPIT(ticks){this.pit.advance(ticks);this.processIRQ();}
 requestIRQ(irq){
  if(!Number.isInteger(irq)||irq<0||irq>(this.picSlave?15:7))throw new RangeError('IRQ not supported by this PC profile');
  if(irq>=8)this.picSlave.request(irq-8);else this.pic.request(irq);
 }
 processIRQ(){
  if(!(this.cpu.flags&F.IF))return false;
  // AT slave IRQs cascade through master IRQ2, provided it is unmasked.
  if(this.picSlave && this.picSlave.pending()>=0)this.pic.request(2);
  const n=this.pic.acknowledge();if(n<0)return false;
  if(this.picSlave&&n===this.pic.vector+2){
   const sn=this.picSlave.acknowledge();if(sn<0)return false;
   this.cpu.interrupt(sn);
  }else this.cpu.interrupt(n);
  return true;
 }
 run(n=10000){const result=this.cpu.run(n);this.audio.sync();
  // Emulated BIOS timer ticks (~18.2 Hz) based on guest instruction progress.
  // Clock is deterministic and doesn't depend on host refresh rate.
  this.biosTickAccumulator+=result.executed;
  while(this.biosTickAccumulator>=50000){
   this.biosTickAccumulator-=50000;
   const value=this.bios.get32(0x46c)+1;
   if(value>=0x1800b0){this.bios.set32(0x46c,0);this.write8(0x470,1);}
   else this.bios.set32(0x46c,value);
  }
  return result;}
 // Portable checkpoint for the exact Phase-1 chipset. ROM stays rebuilt from open firmware.
 exportState(codec){
  if(!codec||!codec.bytesToBase64)throw new Error('Missing MD.js runtime codec');
  const packPIC=x=>x?{mask:x.mask,irr:x.irr,isr:x.isr,vector:x.vector,icw:x.icw,expectICW4:x.expectICW4,single:x.single,readISR:x.readISR,autoEOI:x.autoEOI}:null;
  const p=this.pit,d=this.dma,c=this.cpu;
  return {fpu:this.fpu.snapshot(),ide:this.ide?this.ide.snapshot(codec):null,audio:this.audio.exportState(),opl:this.opl.exportState(),sb2:this.sb2.exportState(),floppy:this.fdd.snapshot(codec),video:this.video.snapshot(codec),profile:this.profile,conventional:this.conventional,extended:this.extended,ram:codec.bytesToBase64(this.ram),extRam:codec.bytesToBase64(this.extRam),a20:this.a20,cmos:codec.bytesToBase64(this.cmos),cmosIndex:this.cmosIndex,kbcOutput:this.kbcOutput,kbcInputCommand:this.kbcInputCommand,lptData:this.lptData,lptControl:this.lptControl,lptStatus:this.lptStatus,kbdQueue:[...this.kbdQueue],xtKeyboard:this.xtKeyboard,waitingForKey:this.waitingForKey,biosTickAccumulator:this.biosTickAccumulator,pic:packPIC(this.pic),picSlave:packPIC(this.picSlave),pit:{reload:Array.from(p.reload),value:Array.from(p.value),mode:[...p.mode],access:[...p.access],writeLow:[...p.writeLow],readLow:[...p.readLow],temp:Array.from(p.temp),latched:[...p.latched],latchedReadLow:[...p.latchedReadLow]},dma:{addr:Array.from(d.addr),count:Array.from(d.count),baseAddr:Array.from(d.baseAddr),baseCount:Array.from(d.baseCount),page:Array.from(d.page),mode:Array.from(d.mode),mask:d.mask,flip:d.flip,status:d.status},cpu:{...c.snapshot(),ticks:c.ticks,lastOpcode:c.lastOpcode,instructionStartIP:c.instructionStartIP,segOverride:c.segOverride},bios:{calls:[...this.bios.calls],lastDiskStatus:this.bios.lastDiskStatus}};
 }
 static fromState(data,codec){
  if(!data||!['xt','at'].includes(data.profile)||!codec||!codec.base64ToBytes)throw new Error('Invalid PC snapshot');
  const m=new PCMachine(data.profile,{conventional:data.conventional,extended:data.extended,videoAdapter:data.video?.adapter||'cga',fpuEnabled:data.fpu?.enabled||false,cpuHz:data.fpu?.cpuHz||12000000});
  // Validate every variable-size binary field BEFORE committing machine state.
  const ram=codec.base64ToBytes(data.ram,640*1024),ext=codec.base64ToBytes(data.extRam,384*1024),cmos=codec.base64ToBytes(data.cmos,128);
  if(ram.length!==m.ram.length||ext.length!==m.extRam.length||cmos.length!==128)throw new Error('PC snapshot RAM/CMOS dimensions mismatch');
  const src=data.cpu,c=m.cpu;
  const check=(list,len,label)=>{if(!Array.isArray(list)||list.length!==len||!list.every(x=>Number.isSafeInteger(x)&&x>=0))throw new Error('Invalid PC '+label);return list;};
  check(src.r,8,'registers');check(src.s,4,'segments');check(src.base,4,'bases');check(src.limit,4,'limits');check(src.segAccess,4,'access');check(src.nullSegment,4,'null flags');
  for(const [key,max] of [['ip',65535],['flags',65535],['msw',65535],['steps',2**53-1],['ticks',2**53-1]])if(!Number.isSafeInteger(src[key])||src[key]<0||src[key]>max)throw new Error('Invalid PC '+key);
  if(!data.pic||!data.pit||!data.dma||!data.bios)throw new Error('Incomplete PC chipset snapshot');
  m.ram.set(ram);m.extRam.set(ext);m.cmos.set(cmos);if(data.video)m.video.restore(data.video,codec);if(data.floppy)m.fdd.restore(data.floppy,codec);
  const copyPIC=(dst,st)=>{
   if(!dst||!st)throw new Error('PIC profile mismatch');
   for(const k of ['mask','irr','isr','vector']){
    if(!Number.isInteger(st[k])||st[k]<0||st[k]>255)throw new Error('Invalid PIC '+k);
    dst[k]=st[k];
   }
   if(!Number.isInteger(st.icw)||st.icw<0||st.icw>4)throw new Error('Invalid PIC icw');
   dst.icw=st.icw;
   for(const k of ['expectICW4','single','readISR','autoEOI']){
    if(typeof st[k]!=='boolean')throw new Error('Invalid PIC '+k);
    dst[k]=st[k];
   }
  };
  copyPIC(m.pic,data.pic);if(m.picSlave)copyPIC(m.picSlave,data.picSlave);else if(data.picSlave)throw new Error('XT has no secondary PIC');
  const restoreArr=(dest,list,label)=>{check(list,dest.length,label);dest.set(list);};
  for(const k of ['reload','value','temp'])restoreArr(m.pit[k],data.pit[k],'PIT '+k);
  for(const k of ['mode','access','writeLow','readLow']){
   if(!Array.isArray(data.pit[k])||data.pit[k].length!==3)throw new Error('Bad PIT '+k);
   m.pit[k]=[...data.pit[k]];
  }
  // Old snapshots predate the 8253 latch state; treat those as no pending latch.
  if(data.pit.latched!==undefined){
   if(!Array.isArray(data.pit.latched)||data.pit.latched.length!==3||
      !data.pit.latched.every(v=>v===null||(Number.isInteger(v)&&v>=0&&v<=65535))||
      !Array.isArray(data.pit.latchedReadLow)||data.pit.latchedReadLow.length!==3||
      !data.pit.latchedReadLow.every(v=>typeof v==='boolean'))throw new Error('Bad PIT latch state');
   m.pit.latched=[...data.pit.latched];m.pit.latchedReadLow=[...data.pit.latchedReadLow];
  }
  for(const k of ['addr','count','baseAddr','baseCount','page','mode'])restoreArr(m.dma[k],data.dma[k],'DMA '+k);
  for(const k of ['mask','flip','status']){if(!Number.isSafeInteger(data.dma[k]))throw new Error('Bad DMA '+k);m.dma[k]=data.dma[k];}
  if(data.lptData!==undefined){for(const k of ['lptData','lptControl','lptStatus'])if(!Number.isInteger(data[k])||data[k]<0||data[k]>255)throw new Error('Invalid LPT snapshot '+k);m.lptData=data.lptData;m.lptControl=data.lptControl;m.lptStatus=data.lptStatus;}
  m.a20=!!data.a20;m.cmosIndex=data.cmosIndex|0;m.kbcOutput=data.kbcOutput|0;m.kbcInputCommand=data.kbcInputCommand|0;
  m.kbdQueue=check(data.kbdQueue||[],(data.kbdQueue||[]).length,'keyboard queue').slice();m.xtKeyboard=data.xtKeyboard|0;m.waitingForKey=!!data.waitingForKey;m.biosTickAccumulator=Number.isSafeInteger(data.biosTickAccumulator)&&data.biosTickAccumulator>=0?data.biosTickAccumulator:0;
  c.r.set(src.r);c.s.set(src.s);c.base.set(src.base);c.limit.set(src.limit);c.segAccess.set(src.segAccess);c.nullSegment.set(src.nullSegment);
  c.flags=src.flags;c.ip=src.ip;c.msw=src.msw;c.gdtr={...src.gdtr};c.idtr={...src.idtr};c.ldtr=src.ldtr?{...src.ldtr}:{selector:0,base:0,limit:0,valid:false};c.tr=src.tr?{...src.tr}:{selector:0,base:0,limit:0,valid:false};c.halted=!!src.halted;c.steps=src.steps;c.ticks=src.ticks;c.lastOpcode=src.lastOpcode|0;c.instructionStartIP=src.instructionStartIP|0;c.segOverride=src.segOverride??null;c.lastFault=src.lastFault?{...src.lastFault}:null;
  // v0.8.2 state files had no audio block: keep imports backward compatible.
  if(data.fpu)m.fpu.restore(data.fpu);
  if(data.ide&&m.ide)m.ide.restore(data.ide,codec);else if(data.ide)throw new Error('XT cannot restore AT IDE');
  if(data.audio)m.audio.restoreState(data.audio);
  else {m.audio.lastCpuTicks=c.ticks;m.audio.onPort61(m.kbcOutput);}
  if(data.opl)m.opl.restoreState(data.opl);
  if(data.sb2)m.sb2.restoreState(data.sb2);
  if(!Array.isArray(data.bios.calls))throw new Error('Bad BIOS call history');m.bios.calls.splice(0,m.bios.calls.length,...data.bios.calls);m.bios.lastDiskStatus=data.bios.lastDiskStatus|0;
  return m;
 }
 info(){return {fpu:this.fpu.snapshot(),ide:this.ide?{capacity:this.ide.capacity,modifiedSectors:this.ide.overlay.size}:null,floppy:this.fdd.disks.map(d=>d?d.geometry.type:null),video:{adapter:this.video.adapter,mode:this.video.mode,graphics:this.video.isGraphics},profile:this.profile,installedRAM:this.conventional+this.extended,extended:this.extended,a20:this.a20,cpu:this.cpu.snapshot(),pic:{mask:this.pic.mask,irr:this.pic.irr,isr:this.pic.isr,slave:this.picSlave?{mask:this.picSlave.mask,irr:this.picSlave.irr,isr:this.picSlave.isr}:null},biosCalls:[...this.biosCalls]};}
}
const api={PCMachine,PIC8259,PIT8253,DMA8237};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.MDPC_MACHINE=api;
})(typeof window!=='undefined'?window:globalThis);
