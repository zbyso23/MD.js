'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {readTAP, trapLDBytes} = require('../MD-ZX.js');

const demo = fs.readFileSync(path.join(__dirname, '../demos/HELLO.TAP'));
const block = (flag, payload) => {
  const bytes = Buffer.from([flag, ...payload]);
  let checksum = 0;
  for (const value of bytes) checksum ^= value;
  const length = bytes.length + 1;
  return Buffer.concat([Buffer.from([length & 255, length >> 8]), bytes, Buffer.from([checksum])]);
};
const machine = (state) => {
  const mem = new Uint8Array(65536);
  mem[state.sp] = 0x78;
  mem[(state.sp + 1) & 0xffff] = 0x56;
  const cpu = {getState: () => state, setState(next) { Object.assign(state, next); }};
  return {cpu, mem};
};
function state(overrides={}) {
 return {pc:0x0556,sp:0x9000,ix:0xA000,a:0xff,d:0,e:3,flags:{C:1},...overrides};
}

test('all demo TAP blocks are checksummed and payloads independent', () => {
 const blocks = readTAP(demo);
 assert.equal(blocks.length,2);
 assert.equal(blocks[0].payload.length,17);
 assert.equal(blocks[1].flag,255);
 const ref = blocks[0].payload[0];
 blocks[0].payload[0] ^= 255;
 assert.equal(blocks[1].flag,255);
 assert.notEqual(blocks[0].payload[0],ref);
});

test('multiple blocks, zero payload and high byte length encoding', () => {
 const t = Buffer.concat([block(0,[]),block(255,Array(257).fill(123))]);
 const blocks=readTAP(t);
 assert.deepEqual(blocks.map(x=>x.payload.length),[0,257]);
});

test('invalid zero length, one length, truncated header, truncated payload, mutated checksum', () => {
 for(const b of [Buffer.from([0,0]), Buffer.from([1,0,255]),Buffer.from([3]),Buffer.from([5,0,0,1,2])])
  assert.throws(()=>readTAP(b));
 const corrupt=Buffer.from(block(255,[1,2,3]));corrupt[3] ^= 7;
 assert.throws(()=>readTAP(corrupt),/checksum/);
});

test('two consecutive blocks and input mutation do not modify decoded data', () => {
 const bytes=Buffer.concat([block(0,[1]),block(255,[2])]);
 const items=readTAP(bytes); bytes.fill(0);
 assert.deepEqual([...items[0].payload],[1]);assert.deepEqual([...items[1].payload],[2]);
});

test('ROM trap skips header block, copies payload, records next cursor',()=>{
 const s=state();const m=machine(s);
 const tape={cursor:0,blocks:[{flag:0,payload:Uint8Array.of(0)}, {flag:255,payload:Uint8Array.of(1,2,3)}]};
 assert.equal(trapLDBytes(m,tape),true);
 assert.equal(tape.cursor,2);assert.deepEqual([...m.mem.slice(0xA000,0xA003)],[1,2,3]);
});

test('ROM trap enforces ROM read-only, even if request straddles ROM/RAM boundary',()=>{
 const s=state({ix:0x3fff});const m=machine(s);const before=m.mem.slice(0x3ffe,0x4004);
 const tape={cursor:0,blocks:[{flag:255,payload:Uint8Array.of(1,2,3)}]};
 trapLDBytes(m,tape);
 assert.equal(s.flags.C,0);assert.deepEqual(m.mem.slice(0x3ffe,0x4004),before);
});

test('ROM trap does not write on missing or insufficient tape blocks',()=>{
 for(const blocks of [[],[{flag:255,payload:Uint8Array.of(1)}]]) {
  const s=state(),m=machine(s);const before=m.mem.slice(0xA000,0xA003);
  assert.equal(trapLDBytes(m,{cursor:0,blocks}),blocks.length>0);
  assert.deepEqual(m.mem.slice(0xA000,0xA003),before);
 }
});

test('ROM trap returns from wrapped SP=FFFF correctly',()=>{
 const s=state({sp:0xffff});const m=machine(s);
 m.mem[0xffff]=0x56; m.mem[0]=0x34;
 assert.equal(trapLDBytes(m,{cursor:0,blocks:[{flag:255,payload:Uint8Array.of(1,2,3)}]}),true);
 assert.equal(s.pc,0x3456);assert.equal(s.sp,1);
});

test('ROM trap verify mode preserves RAM, succeeds when equal',()=>{
 const s=state({flags:{C:0}});const m=machine(s);
 m.mem.set([1,2,3],s.ix);
 trapLDBytes(m,{cursor:0,blocks:[{flag:255,payload:Uint8Array.of(1,2,3)}]});
 assert.equal(s.flags.C,1);assert.deepEqual([...m.mem.slice(s.ix-3,s.ix)],[1,2,3]);
});

test('ROM trap handles RAM end at 0xFFFF without index overflow',()=>{
 const s=state({ix:0xfffe,d:0,e:2});const m=machine(s);
 trapLDBytes(m,{cursor:0,blocks:[{flag:255,payload:Uint8Array.of(21,22)}]});
 assert.equal(s.flags.C,1);assert.equal(s.ix,0);assert.deepEqual([...m.mem.slice(0xfffe)],[21,22]);
});

test('ROM trap rejects crossing 0xFFFF without wrap',()=>{
 const s=state({ix:0xffff,d:0,e:2});const m=machine(s);
 trapLDBytes(m,{cursor:0,blocks:[{flag:255,payload:Uint8Array.of(21,22)}]});
 assert.equal(s.flags.C,0);assert.equal(m.mem[0xffff],0);
});
