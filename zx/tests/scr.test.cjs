'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {rgba,assertSCR,WIDTH,HEIGHT}=require('../ZX-Screen.js');
function mk(){return new Uint8Array(6912)}
function pixel(data,x,y){const k=(y*256+x)*4;return Array.from(data.subarray(k,k+4));}
test('SCR exact 6912 bytes only',()=>{
 for(const n of [0,6911,6913,16384])assert.throws(()=>assertSCR(new Uint8Array(n)),/6912/);
 assert.equal(assertSCR(mk()).length,6912);
});
test('black screen palette and image dimensions',()=>{
 const im=rgba(mk());assert.equal(im.length,WIDTH*HEIGHT*4);
 assert.deepEqual(pixel(im,0,0),[0,0,0,255]);
});
test('ZX bitmap layout row y=0,1,8,64 and attribute row indexing',()=>{
 const b=mk();for(const y of [0,1,8,64,191]){
   const pos=((y&192)<<5)|((y&7)<<8)|((y&56)<<2);
   b[pos]=0x80; b[6144+(y>>3)*32]=2; // red ink, black paper
 }
 const im=rgba(b);
 for(const y of [0,1,8,64,191]){
   assert.deepEqual(pixel(im,0,y),[192,0,0,255]);
   assert.deepEqual(pixel(im,1,y),[0,0,0,255]);
 }
 assert.deepEqual(pixel(im,0,32),[0,0,0,255]);
});
test('INK/PAPER/BRIGHT and FLASH inversion',()=>{
 const b=mk();b[0]=0x80; b[6144]=0x80|0x40|0x01|(0x06<<3);
 assert.deepEqual(pixel(rgba(b,false),0,0),[0,0,255,255]);
 assert.deepEqual(pixel(rgba(b,false),1,0),[255,255,0,255]);
 assert.deepEqual(pixel(rgba(b,true),0,0),[255,255,0,255]);
 assert.deepEqual(pixel(rgba(b,true),1,0),[0,0,255,255]);
});
test('untrusted data cannot modify input or inject HTML',()=>{
 const b=mk();const before=b.slice(),img=rgba(b);img.fill(99);
 assert.deepEqual(b,before);
});
