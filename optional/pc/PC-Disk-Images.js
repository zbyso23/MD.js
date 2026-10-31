/* MD.js Ultra — in-memory raw disk image creation (no filesystem dependencies).
 * GPL-3.0-only. Buffer allocations represent removable media, NOT guest RAM.
 * FAT12 floppies and MBR/FAT16 ATA images are formatted but NOT system-bootable.
 */
(function(root){'use strict';
const SECTOR=512,MB=1024*1024;
const FLOPPY={
 '160K':{size:163840,c:40,h:1,s:8,spc:1,root:64,media:0xfe},
 '180K':{size:184320,c:40,h:1,s:9,spc:1,root:64,media:0xfc},
 '320K':{size:327680,c:40,h:2,s:8,spc:2,root:112,media:0xff},
 '360K':{size:368640,c:40,h:2,s:9,spc:2,root:112,media:0xfd},
 '720K':{size:737280,c:80,h:2,s:9,spc:2,root:112,media:0xf9},
 '1.2M':{size:1228800,c:80,h:2,s:15,spc:1,root:224,media:0xf9},
 '1.44M':{size:1474560,c:80,h:2,s:18,spc:1,root:224,media:0xf0}
};
function copyBytes(input,max=80*1000*1000){
 let src;
 if(input instanceof ArrayBuffer)src=new Uint8Array(input);
 else if(ArrayBuffer.isView(input))src=new Uint8Array(input.buffer,input.byteOffset,input.byteLength);
 else throw new TypeError('Disk image requires ArrayBuffer or Uint8Array');
 if(!src.byteLength||src.byteLength>max||src.byteLength%SECTOR)throw new RangeError('Disk image must contain complete 512-byte sectors within size limit');
 return new Uint8Array(src);
}
function label(text){return String(text||'NO NAME').toUpperCase().replace(/[^A-Z0-9 _-]/g,'_').slice(0,11).padEnd(11,' ');}
function ascii(bytes,at,text){for(let i=0;i<text.length;i++)bytes[at+i]=text.charCodeAt(i);}
function le16(b,i,n){b[i]=n&255;b[i+1]=(n>>>8)&255;}
function le32(b,i,n){le16(b,i,n);le16(b,i+2,n>>>16);}
function fatSectors(total,spc,root,kind){const rootSectors=Math.ceil(root*32/SECTOR);let fats=1;
 for(let i=0;i<32;i++){const clusters=Math.floor((total-1-rootSectors-2*fats)/spc);const next=Math.ceil(((clusters+2)*(kind===12?1.5:2))/SECTOR);if(next===fats)return {fats,clusters,rootSectors};fats=next;}
 throw Error('FAT geometry failed to converge');
}
function boot(b,start,{total,spc,root,fats,media,spt,heads,hidden,kind,name,serial}){
 const offset=start*SECTOR;b.set([0xeb,0x3c,0x90],offset);ascii(b,offset+3,'MDJSULTR');
 le16(b,offset+11,SECTOR);b[offset+13]=spc;le16(b,offset+14,1);b[offset+16]=2;le16(b,offset+17,root);
 le16(b,offset+19,total<65536?total:0);b[offset+21]=media;le16(b,offset+22,fats);
 le16(b,offset+24,spt);le16(b,offset+26,heads);le32(b,offset+28,hidden);le32(b,offset+32,total>=65536?total:0);
 b[offset+36]=kind===12?0:0x80;b[offset+38]=0x29;le32(b,offset+39,serial);ascii(b,offset+43,label(name));ascii(b,offset+54,kind===12?'FAT12   ':'FAT16   ');
 b.set([0xfa,0xf4,0xeb,0xfd],offset+62);b[offset+510]=0x55;b[offset+511]=0xaa;
 for(let k=0;k<2;k++){const fat=(start+1+k*fats)*SECTOR;b[fat]=media;b[fat+1]=255;b[fat+2]=255;if(kind===16)b[fat+3]=255;}
}
function createFloppy(type='720K',volume='MDJS FLOPPY'){
 const g=FLOPPY[type];if(!g)throw new RangeError('Unsupported floppy format: '+type);
 const total=g.size/SECTOR,p=fatSectors(total,g.spc,g.root,12);
 if(p.clusters>=4085)throw Error('FAT12 cluster count out of bounds');
 const b=new Uint8Array(new ArrayBuffer(g.size));boot(b,0,{total,spc:g.spc,root:g.root,fats:p.fats,media:g.media,spt:g.s,heads:g.h,hidden:0,kind:12,name:volume,serial:0x4d444a53});
 return b.buffer;
}
function createIDE(mebibytes=8,volume='MDJS HDD'){
 if(![8,16,32,64,80].includes(mebibytes))throw new RangeError('IDE presets: 8, 16, 32, 64 or 80 MiB');
 const b=new Uint8Array(new ArrayBuffer(mebibytes===80?80*1000*1000:mebibytes*MB)),start=63,total=b.length/SECTOR-start,spc=mebibytes>32?4:2,root=512;
 const heads=mebibytes>32?8:4,spt=mebibytes>32?32:16;
 const p=fatSectors(total,spc,root,16);
 if(p.clusters<4085||p.clusters>=65525)throw Error('FAT16 cluster count out of range');
 // Primary MBR partition. This is a formatted DATA drive, not a bootable DOS installation.
 const off=446;b[off]=0;
 const chs=(lba,pos)=>{const c=Math.floor(lba/(heads*spt)),h=Math.floor(lba/spt)%heads,sec=(lba%spt)+1;b[pos]=h;b[pos+1]=sec|((c>>>2)&0xc0);b[pos+2]=c&255;};
 chs(start,off+1);b[off+4]=0x06;chs(b.length/SECTOR-1,off+5);le32(b,off+8,start);le32(b,off+12,total);
 b[510]=0x55;b[511]=0xaa;
 boot(b,start,{total,spc,root,fats:p.fats,media:0xf8,spt,heads,hidden:start,kind:16,name:volume,serial:0x4d444853});
 return b.buffer;
}
// Package ordinary host files as root-directory 8.3 FAT entries. A ZIP is copied as a
// normal ZIP file, NOT extracted or executed. No filesystem library and no host access.
const MAX_PAYLOAD=5*MB,MAX_DISK=80*1000*1000;
function dosName(name,used){
 const original=String(name||'');const basename=original.replace(/\\/g,'/').split('/').pop();
 if(!basename||basename==='.'||basename==='..')throw new Error('Invalid file name');
 const dot=basename.lastIndexOf('.');const rawBase=dot>0?basename.slice(0,dot):basename;
 const rawExt=dot>0?basename.slice(dot+1):'';
 // Canonical FAT short-name restrictions; strip path segments, disallow reserved DOS devices.
 const clean=v=>v.toUpperCase().normalize('NFKD').replace(/[^A-Z0-9!#$%&'()@^_`{}~-]/g,'_');
 const base=clean(rawBase)||'FILE',ext=clean(rawExt).slice(0,3);
 const reserved=/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/;
 const add=(b)=>b.padEnd(8,' ')+ext.padEnd(3,' ');
 let short=base.slice(0,8);let key=add(short);
 if(reserved.test(short)||used.has(key)){
  for(let n=1;n<=999999;n++){
   const suffix='~'+n;short=base.slice(0,8-suffix.length)+suffix;key=add(short);
   if(!reserved.test(short)&&!used.has(key))break;
  }
  if(used.has(key))throw Error('No available DOS 8.3 name');
 }
 used.add(key);return {name:short+(ext?'.'+ext:''),raw:key,original};
}
function prepareFiles(files){
 if(!Array.isArray(files)||!files.length)throw new Error('Select at least one file');
 let total=0;const used=new Set();const out=[];
 for(const f of files){
  if(!f||typeof f.name!=='string')throw new TypeError('File must have a name');
  let bytes;
  if(f.data instanceof ArrayBuffer)bytes=new Uint8Array(f.data);
  else if(ArrayBuffer.isView(f.data))bytes=new Uint8Array(f.data.buffer,f.data.byteOffset,f.data.byteLength);
  else throw new TypeError('File must contain Uint8Array/ArrayBuffer data');
  total+=bytes.byteLength;
  if(total>MAX_PAYLOAD)throw new RangeError('Payload exceeds 5 MiB limit');
  out.push({...dosName(f.name,used),bytes});
 }
 return {items:out,total};
}
function putFatEntry(b,fatOffset,kind,cluster,value){
 const pos=fatOffset+(kind===12?Math.floor(cluster*3/2):cluster*2);
 if(kind===16)le16(b,pos,value);
 else if(cluster&1){b[pos]=(b[pos]&15)|((value&15)<<4);b[pos+1]=(value>>>4)&255;}
 else {b[pos]=value&255;b[pos+1]=(b[pos+1]&240)|((value>>>8)&15);}
}
function populateFAT(buffer,files,partStart=0){
 const b=new Uint8Array(buffer),start=partStart*SECTOR,v=pos=>b[start+pos]|(b[start+pos+1]<<8);
 const spc=b[start+13],reserved=v(14),fats=b[start+16],rootEntries=v(17),fatSize=v(22);
 const total=v(19)||((b[start+32]|b[start+33]<<8|b[start+34]<<16|b[start+35]<<24)>>>0);
 const kind=rootEntries<=224?12:16,rootSectors=Math.ceil(rootEntries*32/SECTOR);
 const rootPos=start+(reserved+fats*fatSize)*SECTOR,dataPos=rootPos+rootSectors*SECTOR;
 const available=Math.floor((total-reserved-fats*fatSize-rootSectors)/spc),clusterBytes=spc*SECTOR;
 if(files.length>rootEntries)throw new RangeError('Too many files for FAT root directory');
 let next=2;const results=[];
 for(let i=0;i<files.length;i++){
  const f=files[i],count=Math.ceil(f.bytes.length/clusterBytes);
  if(next-2+count>available)throw new RangeError('Files do not fit in selected disk');
  const dir=rootPos+i*32;
  ascii(b,dir,f.raw);b[dir+11]=0x20; // DOS archive bit, deterministic timestamps = 1980-01-01
  le16(b,dir+24,0x21);le16(b,dir+26,count?next:0);le32(b,dir+28,f.bytes.length);
  for(let j=0;j<count;j++){
   const cluster=next+j,value=j===count-1?(kind===12?0xfff:0xffff):cluster+1;
   for(let k=0;k<fats;k++)putFatEntry(b,start+(reserved+k*fatSize)*SECTOR,kind,cluster,value);
   b.set(f.bytes.subarray(j*clusterBytes,(j+1)*clusterBytes),dataPos+(cluster-2)*clusterBytes);
  }
  next+=count;results.push({original:f.original,dosName:f.name,size:f.bytes.length});
 }
 return results;
}
function packFiles(files,choice='auto'){
 const {items,total}=prepareFiles(files);
 if(!['auto','floppy','ide'].includes(choice))throw Error('Unknown target');
 // Use a DOS-friendly 720K floppy first, then 1.44M; larger payloads need AT IDE.
 const options=choice==='ide'?[]:['720K','1.44M'];
 for(const type of options){
  let buffer=createFloppy(type);
  try{const mapping=populateFAT(buffer,items);return {buffer,kind:'floppy',format:type,mapping,total};}
  catch(e){if(!/do not fit|Too many files/.test(e.message))throw e;}
 }
 if(choice==='floppy')throw new RangeError('Files do not fit in supported FAT12 floppy');
 for(const size of [8,16,32,64,80]){
  let buffer=createIDE(size);
  try{const mapping=populateFAT(buffer,items,63);return {buffer,kind:'ide',format:size+'MiB',mapping,total};}
  catch(e){if(!/do not fit|Too many files/.test(e.message))throw e;}
 }
 throw new RangeError('Files do not fit in 80 MiB FAT16 HDD');
}
const api={copyBytes,createFloppy,createIDE,packFiles,prepareFiles,FLOPPY,MAX_PAYLOAD,MAX_DISK};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_DISK_IMAGES=api;
})(typeof window!=='undefined'?window:globalThis);
