/* MD.js Ultra Universal Runtime v1: classic browser script, zero build, no imports.
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * Auto-fetch when allowed; user-supplied File fallback; independent JSON backup.
 */
(function(root){'use strict';
const FORMAT='mdjs-ultra-machine-state', VERSION=1;
function bytesToBase64(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 // Chunking avoids argument count limits on large PC snapshots.
 const parts=[];for(let i=0;i<bytes.length;i+=0x4000)parts.push(String.fromCharCode.apply(null,bytes.subarray(i,i+0x4000)));
 if(typeof btoa==='function')return btoa(parts.join(''));
 if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');
 throw new Error('Base64 encoder unavailable');
}
function base64ToBytes(input,maxBytes=16*1024*1024){
 if(typeof input!=='string'||input.length>Math.ceil(maxBytes/3)*4+4||input.length%4!==0||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input))throw new Error('Invalid or oversized Base64 payload');
 const bin=typeof atob==='function'?atob(input):typeof Buffer!=='undefined'?Buffer.from(input,'base64').toString('latin1'):null;
 if(bin===null||bin.length>maxBytes)throw new Error('Decoded binary exceeds limit');
 const result=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)result[i]=bin.charCodeAt(i);return result;
}
function textToBytes(str){if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(str);return Uint8Array.from(str,c=>c.charCodeAt(0));}
async function readFile(file,maxBytes=16*1024*1024){
 if(!file||!Number.isFinite(file.size)||file.size>maxBytes||file.size<0)throw new Error('File missing or too large');
 if(typeof file.arrayBuffer==='function')return new Uint8Array(await file.arrayBuffer());
 if(typeof FileReader!=='undefined')return await new Promise((resolve,reject)=>{const rd=new FileReader();rd.onload=()=>resolve(new Uint8Array(rd.result));rd.onerror=()=>reject(rd.error||Error('FileReader failed'));rd.readAsArrayBuffer(file);});
 throw new Error('This browser cannot read files: paste Base64 data manually');
}
async function fetchBytes(url,{maxBytes=16*1024*1024,timeoutMs=5000,fetchImpl}={}){
 const f=fetchImpl||(typeof root.fetch==='function'?root.fetch.bind(root):null);
 if(!f)throw new Error('Fetch unavailable');
 const ctrl=typeof AbortController!=='undefined'?new AbortController():null;
 let timeout;
 try{
  if(ctrl&&timeoutMs>0)timeout=setTimeout(()=>ctrl.abort(),timeoutMs);
  const response=await f(url,ctrl?{signal:ctrl.signal}:{ });
  if(!response.ok)throw new Error('HTTP '+response.status);
  const declared=Number(response.headers&&response.headers.get('content-length'));
  if(declared>maxBytes)throw new Error('Remote resource exceeds file limit');
  const out=new Uint8Array(await response.arrayBuffer());if(out.length>maxBytes)throw new Error('Remote resource exceeds file limit');return out;
 }finally{if(timeout)clearTimeout(timeout);}
}
// `onManual` deliberately requires an explicit user action; no synthetic file-picker clicks.
async function loadBytes(url,options={}){try{return {bytes:await fetchBytes(url,options),source:'fetch'};}catch(error){return {bytes:null,source:'manual',error:String(error.message||error)};}}
function createPicker({accept='',onFile,maxBytes=16*1024*1024}={}){
 if(typeof document==='undefined'||!document.createElement)throw new Error('File picker unavailable');
 const input=document.createElement('input');input.type='file';input.accept=accept;input.hidden=true;
 input.addEventListener('change',async()=>{const file=input.files&&input.files[0];input.value='';if(!file)return;try{await onFile(await readFile(file,maxBytes),file);}catch(e){if(onFile)await onFile(null,file,e);}});
 return input;
}
function download(name,content,type='application/json'){
 if(typeof document==='undefined')throw new Error('Download unavailable');
 const b=content instanceof Uint8Array?content:typeof content==='string'?content:JSON.stringify(content);
 const url=URL.createObjectURL(new Blob([b],{type}));
 try{const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();}
 finally{setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
function wrapState(machine,payload){if(!['pc','zx'].includes(machine))throw new Error('Unknown machine');return {format:FORMAT,version:VERSION,machine,created:new Date().toISOString(),payload};}
function parseState(source,machine){
 const doc=typeof source==='string'?JSON.parse(source):source;
 if(!doc||doc.format!==FORMAT||doc.version!==VERSION||doc.machine!==machine||!doc.payload||typeof doc.payload!=='object')throw new Error('Wrong machine or unsupported snapshot format');
 return doc.payload;
}
function saveLocal(key,doc){try{if(!root.localStorage)throw new Error('Storage denied');root.localStorage.setItem(key,JSON.stringify(doc));return {ok:true};}catch(error){return {ok:false,error:String(error.message||error)};}}
function loadLocal(key,machine){try{if(!root.localStorage)throw new Error('Storage denied');const value=root.localStorage.getItem(key);if(value===null)return {ok:false,error:'No saved state'};return {ok:true,payload:parseState(value,machine)};}catch(error){return {ok:false,error:String(error.message||error)};}}
function embeddedWorker(id){
 if(typeof document==='undefined'||typeof Worker==='undefined'||typeof Blob==='undefined'||!root.URL||!root.URL.createObjectURL)return null;
 const script=document.getElementById(id);if(!script)return null;
 let url;
 try{url=root.URL.createObjectURL(new Blob([script.textContent],{type:'text/javascript'}));return new Worker(url);}
 catch(_){return null;}
 finally{if(url)root.URL.revokeObjectURL(url);}
}
// The worker may be forbidden by file:// security policy. Never make it mandatory.
function workerJSON(doc,scriptId='mdjs-state-worker',timeoutMs=2000){return new Promise(resolve=>{
 let worker=embeddedWorker(scriptId),settled=false; if(!worker){resolve({text:JSON.stringify(doc),worker:false});return;}
 let timer;
 const finish=(str,used)=>{if(settled)return;settled=true;clearTimeout(timer);worker.terminate();resolve({text:str,worker:used});};
 worker.onmessage=e=>{if(e.data&&e.data.type==='json'&&typeof e.data.text==='string')finish(e.data.text,true);else finish(JSON.stringify(doc),false);};
 worker.onerror=()=>finish(JSON.stringify(doc),false);
 timer=setTimeout(()=>finish(JSON.stringify(doc),false),timeoutMs);
 try{worker.postMessage({type:'stringify',payload:doc});}catch(_){finish(JSON.stringify(doc),false);}
 });}
const api={FORMAT,VERSION,bytesToBase64,base64ToBytes,readFile,fetchBytes,loadBytes,createPicker,download,wrapState,parseState,saveLocal,loadLocal,embeddedWorker,workerJSON};
root.MDUltraRuntime=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
