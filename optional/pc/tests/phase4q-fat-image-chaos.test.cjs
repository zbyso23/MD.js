'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {packFiles}=require('../PC-Disk-Images.js');
const rd16=(b,o)=>b[o]|b[o+1]<<8,rd32=(b,o)=>(b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0;
const rand=(()=>{let x=0x4f123abc;return ()=>x=(Math.imul(x,1664525)+1013904223)>>>0;})();
function inspect(pkg){
 const b=new Uint8Array(pkg.buffer),part=pkg.kind==='ide'?rd32(b,454):0,off=part*512;
 const spc=b[off+13],reserved=rd16(b,off+14),fats=b[off+16],entries=rd16(b,off+17),fatSize=rd16(b,off+22);
 const rootSectors=Math.ceil(entries*32/512),root=(part+reserved+fatSize*fats)*512,data=root+rootSectors*512;
 const fat1=(part+reserved)*512,fat2=fat1+fatSize*512,kind=pkg.kind==='ide'?16:12;
 assert.deepEqual(b.subarray(fat1,fat1+fatSize*512),b.subarray(fat2,fat2+fatSize*512),'FAT mirrors');
 const seenGlobal=new Set(),files=[];
 function fat(cluster){const o=fat1+(kind===16?cluster*2:(cluster*3>>1));return kind===16?rd16(b,o):cluster&1?((b[o]>>4)|(b[o+1]<<4)):((b[o]|((b[o+1]&15)<<8)));}
 for(let idx=0;idx<entries;idx++){
  const p=root+32*idx;if(b[p]===0)break;
  const name=String.fromCharCode(...b.subarray(p,p+8)).trimEnd(),ext=String.fromCharCode(...b.subarray(p+8,p+11)).trimEnd(),size=rd32(b,p+28),initial=rd16(b,p+26);
  assert.equal(b[p+11],0x20);const received=new Uint8Array(size);let cluster=initial,count=0;
  if(size){assert.ok(cluster>=2);const visited=new Set();
   for(let offset=0;offset<size;offset+=spc*512){
    assert.ok(cluster>=2&&cluster<0xff8,'FAT12/FAT16 chain valid');assert.ok(!visited.has(cluster),'no chain loop');assert.ok(!seenGlobal.has(cluster),'no overlapping chains');
    visited.add(cluster);seenGlobal.add(cluster);const start=data+(cluster-2)*spc*512;
    received.set(b.subarray(start,start+Math.min(spc*512,size-offset)),offset);
    const next=fat(cluster);count++;
    if(offset+spc*512>=size)assert.ok(next>= (kind===12?0xff8:0xfff8),'last cluster marked end-of-chain');
    else cluster=next;
   }
  }else assert.equal(cluster,0);
  files.push({name:name+(ext?'.'+ext:''),bytes:received});
 }
 return files;
}
test('FAT12/16 deterministic random file sets roundtrip byte-perfect and mirror FATs',()=>{
 for(const round of Array.from({length:36},(_,i)=>i)){
  const files=[];let budget=round%3===0?610*1024:round%3===1?1024*1024:4*1024*1024;
  const number=1+(rand()%55);
  for(let i=0;i<number;i++){
   const n=Math.min(budget,rand()%Math.max(1,Math.floor(budget/Math.max(1,number-i))+10));budget-=n;
   const bytes=new Uint8Array(n);for(let j=0;j<n;j++)bytes[j]=rand()&255;
   files.push({name:i%4===0?'Some Very Long Name.TXT':i%5===0?'CON.COM':`TEST${i}.BIN`,data:bytes});
  }
  const source=files.map(f=>new Uint8Array(f.data));
  const packed=packFiles(files,'auto');const result=inspect(packed);
  assert.equal(result.length,files.length);
  assert.equal(new Set(result.map(x=>x.name)).size,files.length,'unique 8.3 short names');
  for(let i=0;i<files.length;i++){assert.deepEqual(result[i].bytes,source[i],`payload ${round} / ${i}`);assert.deepEqual(files[i].data,source[i],'host input untouched');}
 }
});
test('reject root overflow and >5MiB inputs without silently truncating content',()=>{
 assert.throws(()=>packFiles(Array.from({length:513},(_,i)=>({name:'A'+i+'.TXT',data:new Uint8Array(1)})),'floppy'),/Too many files|do not fit/);
 assert.throws(()=>packFiles([{name:'FIVE_PLUS_ONE.BIN',data:new Uint8Array(5*1024*1024+1)}]),/5 MiB/);
});
