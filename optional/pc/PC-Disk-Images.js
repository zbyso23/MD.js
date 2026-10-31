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
function copyBytes(input,max=32*MB){
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
 if(![8,16,32].includes(mebibytes))throw new RangeError('IDE presets: 8, 16 or 32 MiB');
 const b=new Uint8Array(new ArrayBuffer(mebibytes*MB)),start=63,total=b.length/SECTOR-start,spc=2,root=512;
 const p=fatSectors(total,spc,root,16);
 if(p.clusters<4085||p.clusters>=65525)throw Error('FAT16 cluster count out of range');
 // Primary MBR partition. This is a formatted DATA drive, not a bootable DOS installation.
 const off=446;b[off]=0;
 const chs=(lba,pos)=>{const c=Math.floor(lba/(4*16)),h=Math.floor(lba/16)%4,sec=(lba%16)+1;b[pos]=h;b[pos+1]=sec|((c>>>2)&0xc0);b[pos+2]=c&255;};
 chs(start,off+1);b[off+4]=0x06;chs(b.length/SECTOR-1,off+5);le32(b,off+8,start);le32(b,off+12,total);
 b[510]=0x55;b[511]=0xaa;
 boot(b,start,{total,spc,root,fats:p.fats,media:0xf8,spt:16,heads:4,hidden:start,kind:16,name:volume,serial:0x4d444853});
 return b.buffer;
}
const api={copyBytes,createFloppy,createIDE,FLOPPY};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MDPC_DISK_IMAGES=api;
})(typeof window!=='undefined'?window:globalThis);
