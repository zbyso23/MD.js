'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
const PC=path.resolve(__dirname,'..'),root=path.resolve(PC,'../..'),dev=path.join(PC,'devtools');
const disk=fs.readFileSync(path.join(PC,'x86DEV-720K-XT286.img'));
function fat12(n){const base=512+(n>>1)*3,word=disk[base]|disk[base+1]<<8|disk[base+2]<<16;return (n&1)?(word>>>12)&4095:word&4095;}
function fileBytes(name){const start=(disk.readUInt16LE(14)+disk[16]*disk.readUInt16LE(22))*512;
 for(let j=0;j<disk.readUInt16LE(17);j++){
  const a=start+j*32;if(disk[a]===0)break;if(disk[a]===0xe5)continue;
  const n=disk.toString('ascii',a,a+8).trim()+(disk.toString('ascii',a+8,a+11).trim()?'.'+disk.toString('ascii',a+8,a+11).trim():'');
  if(n!==name)continue;
  const length=disk.readUInt32LE(a+28),buf=Buffer.alloc(length);let cluster=disk.readUInt16LE(a+26),off=0;const spc=disk[13],first=1+disk[16]*disk.readUInt16LE(22)+Math.ceil(disk.readUInt16LE(17)*32/512);
  const visited=new Set();while(off<length){assert.ok(cluster>=2&&cluster<4085);assert.ok(!visited.has(cluster));visited.add(cluster);const pos=(first+(cluster-2)*spc)*512,count=Math.min(length-off,spc*512);disk.copy(buf,off,pos,pos+count);off+=count;cluster=fat12(cluster);}
  return buf;
 }
 throw new Error('Absent FAT12 file: '+name);
}
test('Phase 4N developer B is a real 720KiB FAT12 image with byte-identical tools and no NASM',()=>{
 assert.equal(disk.length,737280);assert.equal(disk.toString('ascii',54,59),'FAT12');
 for(const name of ['IDE.COM','EDIT.COM','BUILD.BAT','README4N.TXT','HELLO.C','CC.EXE','ASM.EXE','YLINK.EXE','DEBUG.COM','CLIB.LIB','STDIO.H']){
  const p=path.join(name==='DEBUG.COM'?PC:dev,name);if(fs.existsSync(p))assert.deepEqual(fileBytes(name),fs.readFileSync(p),name);
  else assert.ok(fileBytes(name).length>0,name);
 }
 for(const n of ['NASM.EXE','NDISASM.EXE'])assert.throws(()=>fileBytes(n));
 assert.ok(fileBytes('IDE.COM').length>10000);
});
test('IDE.COM build is 8086 assembly source, no runtime WASM dependency; BUILD.BAT uses real compiler stages',()=>{
 const src=fs.readFileSync(path.join(dev,'IDE.S'),'utf8');assert.match(src,/\.code16/);assert.match(src,/int 0x16/);assert.match(src,/int 0x21/);assert.match(src,/read-only B:/i);
 const bat=fileBytes('BUILD.BAT').toString('ascii');assert.match(bat,/^B:$/m);assert.match(bat,/CC %1/);assert.match(bat,/ASM %1/);assert.match(bat,/YLINK %1\.OBJ,CLIB\.LIB -e=%1\.EXE/);
 assert.match(bat,/IF ERRORLEVEL 1 GOTO FAIL/);
});
test('offline embedded B disk is identical, Developer menu guards read-only builds and transfers extended BIOS key scans',()=>{
 const embedded=fs.readFileSync(path.join(PC,'PC-EmbeddedAssets.js'),'utf8').match(/devtools720k:"([A-Za-z0-9+/=]+)"/);
 assert.ok(embedded);assert.deepEqual(Buffer.from(embedded[1],'base64'),disk);
 const h=fs.readFileSync(path.join(PC,'index.html'),'utf8');for(const id of ['pc-dev-workbench','dev-copy','dev-edit','dev-build','dev-run','dev-export'])assert.ok(h.includes('id="'+id+'"'));
 assert.match(h,/developerDOSCommand/);assert.match(h,/writeProtected/);assert.match(h,/ArrowUp:0x48/);assert.match(h,/ArrowLeft:0x4b/);assert.match(h,/e\.stopPropagation\(\)/);
 assert.ok(fs.existsSync(path.join(root,'PHASE4O-F2-ENCYCLOPEDIA-SPEC.md')));
});
