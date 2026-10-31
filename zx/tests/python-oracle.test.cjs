'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');const path=require('node:path');
const {readTAP}=require('../MD-ZX.js');
let seed=0xBEEFCAFE;const rand=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)&255;};
const makeBlock=(length)=>{
 const flag=rand();const b=Buffer.alloc(length+4);b[0]=(length+2)&255;b[1]=(length+2)>>8;b[2]=flag;
 let crc=flag;for(let i=0;i<length;i++){b[i+3]=rand();crc^=b[i+3];}b[length+3]=crc;return b;
};
test('independent Python oracle agrees with JS on deterministic TAP corpus',()=>{
 const corpus=[Buffer.alloc(0),Buffer.from([0]),Buffer.from([1,0,0]),Buffer.from([0,0]),makeBlock(0),makeBlock(257)];
 for(let i=0;i<180;i++){
   const n=rand()%3+1;
   let entry=Buffer.concat(Array.from({length:n},()=>makeBlock(rand()%32)));
   if(i%5===0){entry=Buffer.from(entry);entry[rand()%entry.length]^=1;}
   if(i%11===0)entry=entry.subarray(0,Math.max(0,entry.length-1));
   corpus.push(entry);
 }
 const python=spawnSync('python3',[path.join(__dirname,'reference_tap.py')],{
  encoding:'utf8',input:JSON.stringify(corpus.map(x=>x.toString('base64'))),timeout:8000
 });
 if(python.error && python.error.code==='ENOENT'){ return test.skip('Python 3 not installed'); }
 assert.equal(python.status,0,python.stderr);
 const out=JSON.parse(python.stdout);assert.equal(out.length,corpus.length);
 for(let i=0;i<corpus.length;i++){
  let js;try{js=readTAP(corpus[i]);}catch(e){assert.equal(out[i].ok,false,'case '+i);continue;}
  assert.equal(out[i].ok,true,'case '+i);
  assert.deepEqual(js.map(b=>({flag:b.flag,payload_hex:Buffer.from(b.payload).toString('hex')})),out[i].blocks,'case '+i);
 }
});
