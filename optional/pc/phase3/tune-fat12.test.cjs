'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const base=join(__dirname,'..');
const image=readFileSync(join(base,'x86BOOT-720K-DEBUG-DEV.img'));
const tune=readFileSync(join(__dirname,'TUNE.COM'));
const bps=image.readUInt16LE(11),spc=image[13],reserved=image.readUInt16LE(14),fats=image[16],spf=image.readUInt16LE(22);
const root=(reserved+fats*spf)*bps;
const entries=image.readUInt16LE(17);
const rootSectors=Math.ceil(entries*32/bps),data=(reserved+fats*spf+rootSectors)*bps;
function entry(name){for(let i=0;i<entries;i++){const e=root+i*32;if(image.toString('latin1',e,e+11)===name)return e;}return -1;}
function fat(k){const p=reserved*bps+Math.floor(k*3/2);return k&1? ((image[p]>>>4)|(image[p+1]<<4))&4095 : ((image[p])|((image[p+1]&15)<<8))&4095;}
function diskFile(e){let k=image.readUInt16LE(e+26),bytes=[],seen=new Set();while(k>=2&&k<0xff8){assert.ok(!seen.has(k),'FAT cycle');seen.add(k);const p=data+(k-2)*spc*bps;bytes.push(image.subarray(p,p+spc*bps));k=fat(k);}return Buffer.concat(bytes).subarray(0,image.readUInt32LE(e+28));}
test('TUNE.COM is a tiny, actual 16-bit DOS program',()=>{
 assert.equal(tune.length,137);
 assert.equal(tune[0],0x0e);assert.equal(tune[1],0x1f);
 assert.ok(tune.includes(Buffer.from([0xba,0x88,0x03,0xee])),'program writes to OPL2 388h');
 assert.ok(tune.includes(Buffer.from([0xcd,0x1a])),'program delays using BIOS clock');
 assert.ok(tune.includes(Buffer.from([0xcd,0x21])),'program returns through DOS');
});
test('Two identical FAT12 copies and bootable 720KiB personal image',()=>{
 assert.equal(image.length,720*1024);assert.equal(image.readUInt16LE(510),0xaa55);
 assert.deepEqual(image.subarray(reserved*bps,(reserved+spf)*bps),image.subarray((reserved+spf)*bps,(reserved+2*spf)*bps));
});
test('TUNE.COM is genuinely on DOS A: and byte-identical to delivered binary',()=>{
 const e=entry('TUNE    COM');assert.ok(e>=0);assert.equal(image.readUInt32LE(e+28),tune.length);
 assert.deepEqual(diskFile(e),tune);
});
test('DEBUG.COM remains on disk and original boot/startup files remain present',()=>{
 for(const name of ['DEBUG   COM','KERNEL  SYS','FDAUTO  BAT','FDCONFIGSYS'])assert.ok(entry(name)>=0,name);
 assert.ok(image.readUInt32LE(entry('DEBUG   COM')+28)>20000);
});
test('Inlined browser image is bit-identical to FAT12 image with TUNE.COM',()=>{
 const js=readFileSync(join(base,'PC-EmbeddedAssets.js'),'utf8');
 const payload=js.match(/freedos720kDebug:"([A-Za-z0-9+/=]+)"/);
 assert.ok(payload,'missing built-in disk');assert.deepEqual(Buffer.from(payload[1],'base64'),image);
});
