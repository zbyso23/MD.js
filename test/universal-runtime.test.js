'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const rt=require('../MD-Runtime.js');
const {PCMachine}=require('../optional/pc/PC-Machine.js');
const {R,S}=require('../optional/pc/PC-Core.js');
test('Base64 round-trip including 1 MiB boundary and zero bytes',()=>{
 const input=new Uint8Array(1048576);for(let i=0;i<input.length;i++)input[i]=(i*17+i>>>8)&255;
 assert.deepEqual(rt.base64ToBytes(rt.bytesToBase64(input),1048576),input);
 assert.deepEqual(rt.base64ToBytes(''),new Uint8Array(0));
});
test('Base64 rejects oversized/invalid data',()=>{
 for(const s of ['xxxx!!!!','abc','YQ===','***='])assert.throws(()=>rt.base64ToBytes(s),/Invalid/);
 assert.throws(()=>rt.base64ToBytes(rt.bytesToBase64(new Uint8Array(33)),32),/oversized|exceeds/);
});
test('fetch success and failure keep manual fallback, never fabricate bytes',async()=>{
 const yes=await rt.loadBytes('any',{fetchImpl:async()=>({ok:true,headers:{get:()=>null},arrayBuffer:async()=>new Uint8Array([7,8]).buffer})});
 assert.equal(yes.source,'fetch');assert.deepEqual(Array.from(yes.bytes),[7,8]);
 const no=await rt.loadBytes('missing',{fetchImpl:async()=>{throw Error('CORS/file blocked')}});
 assert.equal(no.source,'manual');assert.equal(no.bytes,null);assert.match(no.error,/CORS/);
 const denied=await rt.loadBytes('denied',{maxBytes:1,fetchImpl:async()=>({ok:true,headers:{get:()=>null},arrayBuffer:async()=>new Uint8Array([7,8]).buffer})});
 assert.equal(denied.source,'manual');
});
test('File API modern arrayBuffer reads local file',async()=>{
 assert.deepEqual(Array.from(await rt.readFile({size:2,arrayBuffer:async()=>new Uint8Array([6,9]).buffer})),[6,9]);
 await assert.rejects(()=>rt.readFile({size:33,arrayBuffer:async()=>new ArrayBuffer(33)},32),/too large/);
});
test('JSON snapshots are versioned, machine-specific and reject malformed input',()=>{
 const doc=rt.wrapState('pc',{hello:'world'});assert.deepEqual(rt.parseState(JSON.stringify(doc),'pc'),{hello:'world'});
 assert.throws(()=>rt.parseState(doc,'zx'),/Wrong/);assert.throws(()=>rt.parseState('{broken','pc'),SyntaxError);
});
test('localStorage failure returns error while independent JSON remains available',()=>{
 const old=globalThis.localStorage;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('security exception');}});
 try{assert.equal(rt.saveLocal('k',rt.wrapState('pc',{})).ok,false);assert.equal(rt.loadLocal('k','pc').ok,false);}finally{
  if(old===undefined)delete globalThis.localStorage;else Object.defineProperty(globalThis,'localStorage',{configurable:true,value:old});
 }
});
for(const profile of ['xt','at']){
 test(profile+': PC snapshot round-trip retains ROM, RAM, CPU and board',()=>{
  const m=new PCMachine(profile);m.run(100);m.write8(0x5000,0x7a);m.pic.mask=0xf0;m.pit.reload[0]=312;m.pit.value[0]=127;m.queueBIOSKey(0x1e61);
  if(profile==='at'){m.a20=true;m.write8(0x100000,99);m.picSlave.mask=0xee;}
  const doc=rt.wrapState('pc',m.exportState(rt));let restored=PCMachine.fromState(rt.parseState(JSON.stringify(doc),'pc'),rt);
  assert.equal(restored.cpu.ip,m.cpu.ip);assert.equal(restored.cpu.steps,m.cpu.steps);
  assert.equal(restored.read8(0x5000),0x7a);assert.equal(restored.pic.mask,0xf0);
  assert.equal(restored.read8(0xf0100),m.read8(0xf0100));
  assert.deepEqual(restored.bios.peekKey(false),m.bios.peekKey(false));
  if(profile==='at'){assert.equal(restored.read8(0x100000),99);assert.equal(restored.picSlave.mask,0xee);}
  assert.throws(()=>PCMachine.fromState({...doc.payload,ram:'AAAA'},rt),/dimensions/);
 });
}
test('286 snapshot preserves protected-mode hidden segment base after guest execution',()=>{
 const m=new PCMachine('at'),cpu=m.cpu;
 cpu.loadSegment(S.CS,0);cpu.ip=0x2000;cpu.loadSegment(S.DS,0);cpu.loadSegment(S.SS,0);cpu.r[R.SP]=0x7000;
 m.ram.set([0x0f,0x01,0x16,0,7,0xb8,1,0,0x0f,0x01,0xf0,0xea,0,0,8,0],0x2000);
 m.ram.set([23,0,0,8,0,0],0x700);m.ram.set([255,255,0,0x30,0,0x9a,0,0],0x808);m.ram.set([0xb8,0x34,0x12,0xf4],0x3000);m.run(50);
 const n=PCMachine.fromState(m.exportState(rt),rt);
 assert.ok(n.cpu.protected);assert.equal(n.cpu.base[S.CS],0x3000);assert.equal(n.cpu.reg('AX'),0x1234);
});
test('286 LDTR and TR descriptor cache persists across independent JSON export/import',()=>{
 const m=new PCMachine('at'),c=m.cpu;c.msw=1;c.gdtr={base:0x500,limit:0x100};
 const writeDesc=(sel,base,limit,access)=>m.ram.set([limit&255,limit>>>8,base&255,(base>>>8)&255,(base>>>16)&255,access,0,0],0x500+sel);
 writeDesc(0x10,0x1200,0x1f,0x82);writeDesc(0x18,0x1400,43,0x81);
 c.loadSystemSelector('ldtr',0x10);c.loadSystemSelector('tr',0x18);
 const result=PCMachine.fromState(m.exportState(rt),rt);
 assert.deepEqual(result.cpu.ldtr,c.ldtr);assert.deepEqual(result.cpu.tr,c.tr);
 assert.equal(result.ram[0x500+0x18+5],0x83);
});
