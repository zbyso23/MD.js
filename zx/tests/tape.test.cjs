'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {readTAP,trapLDBytes}=require('../MD-ZX.js');
const example=fs.readFileSync(require('node:path').join(__dirname,'../demos/HELLO.TAP'));
test('valid demo has BASIC header + data',()=>{
 const blocks=readTAP(example);assert.equal(blocks.length,2);assert.equal(blocks[0].flag,0);assert.equal(blocks[1].flag,255);
 assert.equal(String.fromCharCode(...blocks[0].payload.subarray(1,11)),'MDJS ULTRA');
});
test('empty, truncated, tiny, checksum, and oversize rejected',()=>{
 for(const data of [new Uint8Array(),Uint8Array.from([2]),Uint8Array.from([1,0,0]),Uint8Array.from([5,0,0,2]),new Uint8Array(8*1024*1024+1)])assert.throws(()=>readTAP(data));
 const corrupt=Uint8Array.from(example);corrupt[4]^=1;assert.throws(()=>readTAP(corrupt),/checksum/);
});
test('tape parser immutable from caller edits',()=>{
 const copy=Uint8Array.from(example);const blocks=readTAP(copy);const flag=blocks[0].flag;copy.fill(0);assert.equal(blocks[0].flag,flag);
});
test('ROM trap copies data, updates IX/DE, restores PC/SP, sets carry',()=>{
 const memory=new Uint8Array(65536);memory[0x8000]=0x34;memory[0x8001]=0x12;
 const state={pc:0x0556,sp:0x8000,ix:0x9000,a:255,d:0,e:3,flags:{C:1}};
 const cpu={getState:()=>state,setState:()=>{}};
 const m={mem:memory,cpu};const tape={cursor:0,blocks:[{flag:255,payload:Uint8Array.of(1,2,3)}]};
 assert.equal(trapLDBytes(m,tape),true);assert.equal(state.pc,0x1234);assert.equal(state.sp,0x8002);
 assert.equal(state.ix,0x9003);assert.equal(state.d,0);assert.equal(state.e,0);assert.equal(state.flags.C,1);
 assert.deepEqual(Array.from(memory.slice(0x9000,0x9003)),[1,2,3]);
});
test('failed verification clears carry without writing RAM',()=>{
 const memory=new Uint8Array(65536);memory[0x8000]=0x12;memory[0x8001]=0x34;
 const state={pc:0x0556,sp:0x8000,ix:0x9000,a:255,d:0,e:2,flags:{C:0}};
 const m={mem:memory,cpu:{getState:()=>state,setState:()=>{}}};
 assert.equal(trapLDBytes(m,{cursor:0,blocks:[{flag:255,payload:Uint8Array.of(1,2)}]}),true);
 assert.equal(state.flags.C,0);assert.equal(state.pc,0x3412);assert.equal(memory[0x9000],0);
});
test('no trap at non-ROM addresses',()=>{
 const s={pc:0x8000};const m={mem:new Uint8Array(65536),cpu:{getState:()=>s}};
 assert.equal(trapLDBytes(m,{cursor:0,blocks:[{flag:0,payload:Uint8Array.of(1)}]}),false);
});
