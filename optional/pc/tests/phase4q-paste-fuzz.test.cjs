'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../PC-Paste.js'),'utf8'),ctx);
const prepare=ctx.MDPC_PASTE.prepare;
const next=(()=>{let s=0x4f7a199c;return ()=>s=(Math.imul(s,1664525)+1013904223)>>>0;})();
test('500 reproducible arbitrary ASCII programs roundtrip BIOS keycode, CRLF storage',()=>{
 const chars='abcXYZ0123456789!@#$%^&*()_+-=[]{}|;:\\,./<>? "\'`~\t\r\n';
 for(let trial=0;trial<500;trial++){
  const n=1+(next()%240),out=[];
  for(let i=0;i<n;i++)out.push(chars[next()%chars.length]);
  const source=out.join('');const normalized=source.replace(/\r\n?/g,'\n');
  const prepared=prepare(source);
  assert.equal(prepared.keys.length,normalized.length,`trial ${trial}`);
  assert.equal(prepared.bytes,normalized.length+(normalized.match(/\n/g)||[]).length);
  assert.equal(String.fromCharCode(...prepared.keys.map(k=>k&255)).replace(/\r/g,'\n'),normalized);
  for(let i=0;i<prepared.keys.length;i++)assert.ok((prepared.keys[i]>>>8)>0,`missing scan-code ${JSON.stringify(normalized[i])}`);
 }
});
test('boundary: 16,380 DOS bytes accepted, one too many rejected; no silent character loss',()=>{
 for(const text of ['x'.repeat(16380),'x\n'.repeat(5460)])assert.equal(prepare(text).bytes,16380);
 for(const text of ['x'.repeat(16381),'x\n'.repeat(5461)])assert.throws(()=>prepare(text),/limit/);
 for(const c of ['\u0000','\u001b','\u007f','😀','“', '\u2028'])assert.throws(()=>prepare(c),/U\+/);
 assert.deepEqual(Array.from(prepare('\ufeffHello').keys.map(x=>x&255)),Array.from('Hello').map(x=>x.charCodeAt(0)));
});
