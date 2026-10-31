/* Stable snapshot contract for stateful FDD controller. No hardware expansion. */
const test=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const codec=require('../../../MD-Runtime.js');
test('FDD restore preserves mounted/empty drives and controller status',()=>{
  const m=new PCMachine('xt');
  const a=new Uint8Array(163840),b=new Uint8Array(184320);
  b[100]=0x7c;
  m.fdd.mount(1,b,'B.img');m.fdd.status=0x9a;
  m.fdd.dor=0x1c;m.fdd.cyl=[3,7];m.fdd.expected=2;
  m.fdd.cmd=[0x07];m.fdd.result=[0x20,7];
  const state=m.fdd.snapshot(codec);
  m.fdd.mount(0,a,'stale-A.img');m.fdd.status=0;
  m.fdd.cyl=[0,0];m.fdd.expected=0;m.fdd.cmd=[];m.fdd.result=[];
  m.fdd.restore(state,codec);
  assert.ok(m.fdd.disks[0]===null,'A must remain empty after restore');
  assert.equal(m.fdd.disks[1].data[100],0x7c);
  assert.equal(m.fdd.status,0x9a);
  assert.deepEqual(m.fdd.cyl,[3,7]);
  assert.equal(m.fdd.expected,2);
  assert.deepEqual(m.fdd.cmd,[0x07]);
  assert.deepEqual(m.fdd.result,[0x20,7]);
});
test('invalid B disk in snapshot never partially replaces existing A disk',()=>{
  const m=new PCMachine('xt');
  m.fdd.mount(0,new Uint8Array(163840),'A.img');
  const before=m.fdd.disks[0].data;
  const state=m.fdd.snapshot(codec);
  state.disks[0]={name:'replacement.img',bytes:codec.bytesToBase64(new Uint8Array(184320))};
  state.disks[1]={name:'invalid.img',bytes:codec.bytesToBase64(new Uint8Array(23))};
  assert.throws(()=>m.fdd.restore(state,codec));
  assert.ok(m.fdd.disks[0].data===before,'no partial mutation on validation failure');
});
