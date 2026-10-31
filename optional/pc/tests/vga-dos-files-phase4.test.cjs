'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{join}=require('node:path');
const p=join(__dirname,'..');
const img=readFileSync(join(p,'x86BOOT-720K-DEBUG-DEV.img'));
const bps=img.readUInt16LE(11),spc=img[13],reserved=img.readUInt16LE(14),nfat=img[16],spf=img.readUInt16LE(22);
const start=(reserved+nfat*spf+Math.ceil(img.readUInt16LE(17)*32/bps))*bps;
const root=(reserved+nfat*spf)*bps,entries=img.readUInt16LE(17),fatStart=reserved*bps;
function entry(name){for(let i=0;i<entries;i++){const o=root+i*32;if(img.toString('latin1',o,o+11)===name)return o;}return -1;}
function fat(k){const o=fatStart+Math.floor(k*3/2);return k&1?((img[o]>>4)|(img[o+1]<<4))&4095:(img[o]|((img[o+1]&15)<<8))&4095;}
function file(name){const e=entry(name);assert.ok(e>=0,'Missing '+name);let k=img.readUInt16LE(e+26),data=[],seen=new Set();while(k>=2&&k<0xff8){assert.ok(!seen.has(k),'FAT cycle');seen.add(k);data.push(img.subarray(start+(k-2)*bps*spc,start+(k-1)*bps*spc));k=fat(k);}return Buffer.concat(data).subarray(0,img.readUInt32LE(e+28));}
test('both graphics COM demos are real FreeDOS FAT12 root files',()=>{
 for(const [name,size] of [['VGA13',75],['VGA12',96]]){
  const bytes=readFileSync(join(p,'phase4',name+'.COM'));
  assert.equal(bytes.length,size);
  assert.deepEqual(file(name.padEnd(8)+'COM'),bytes);
  assert.ok(bytes.includes(Buffer.from([0xcd,0x10])));
  assert.ok(bytes.includes(Buffer.from([0xcd,0x16])));
 }
});
test('original TUNE/DEBUG and boot assets survive VGA install, twin FATs identical',()=>{
 assert.equal(img.length,720*1024);assert.equal(img.readUInt16LE(510),0xaa55);
 assert.deepEqual(img.subarray(fatStart,fatStart+spf*bps),img.subarray(fatStart+spf*bps,fatStart+2*spf*bps));
 for(const k of ['TUNE    COM','DEBUG   COM','KERNEL  SYS','FDAUTO  BAT','FDCONFIGSYS'])assert.ok(entry(k)>=0,k);
});
test('embedded offline FreeDOS image equals on-disk 720KiB version with VGA demos',()=>{
 const js=readFileSync(join(p,'PC-EmbeddedAssets.js'),'utf8');const match=js.match(/freedos720kDebug:"([A-Za-z0-9+/=]+)"/);
 assert.ok(match);assert.deepEqual(Buffer.from(match[1],'base64'),img);
});
