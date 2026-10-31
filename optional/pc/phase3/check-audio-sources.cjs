/* Phase 3 reference intake validator. Node development tool ONLY, no browser runtime dependencies.
 * Copyright (c) 2026 MD.js Ultra contributors. GPL-3.0-only.
 * IMPORTANT: hashes check integrity against locally supplied manifest, NOT upstream Git authenticity.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const defaultRequirements=path.join(__dirname,'source-requirements.json');
const defaultTarget=path.join(__dirname,'..','vendor','dosbox-x-audio');
const sha256=b=>crypto.createHash('sha256').update(b).digest('hex');
const validPath=p=>typeof p==='string'&&/^src\/|^include\//.test(p)&&!p.split('/').some(x=>x==='..'||x===''||x==='.')&&!path.isAbsolute(p);
function checkSources(folder=defaultTarget,requirementsFile=defaultRequirements,stage="ALL"){
 const req=JSON.parse(fs.readFileSync(requirementsFile,'utf8'));
 stage=stage.toUpperCase();
 if(!["3A","3B","3C","3D","ALL"].includes(stage))throw new Error("Unsupported phase 3 gate stage");
 const phaseNumber={"3A":1,"3B":2,"3C":3,"3D":4,"ALL":4};
 const errors=[],warnings=[],present=[],missing=[];
 if(!/^[0-9a-f]{40}$/.test(req.target_revision||''))throw new Error('Bad pinned upstream revision');
 const names=new Set();
 for(const entry of [...req.required,...req.recommended]){
  if(!validPath(entry.path)||names.has(entry.path))throw new Error('Unsafe or duplicate requirement '+entry.path);
  names.add(entry.path);
 }
 let mf=null;
 try{mf=JSON.parse(fs.readFileSync(path.join(folder,'UPSTREAM-MANIFEST.json'),'utf8'));}
 catch(e){errors.push('Manifest missing or invalid: '+path.join(folder,'UPSTREAM-MANIFEST.json'));}
 if(mf){
  if(mf.upstream!==req.upstream)errors.push('Wrong upstream repository');
  if(mf.revision!==req.target_revision)errors.push('Upstream revision mismatch (must be single pinned commit)');
  if(!Array.isArray(mf.files))errors.push('Manifest files must be an array');
 }
 const byPath=new Map();
 for(const f of mf?.files||[]){
  if(!validPath(f.path)||byPath.has(f.path)){errors.push('Invalid or duplicate manifest path');continue;}
  byPath.set(f.path,f);
 }
 for(const requirement of [...req.required.filter(x=>!x.phase||phaseNumber[x.phase]<=phaseNumber[stage]),...(stage==="ALL"?req.recommended:[])]){
  const required=req.required.includes(requirement);
  const p=path.join(folder,...requirement.path.split('/'));
  if(!fs.existsSync(p)){
   (required?missing:warnings).push(required?requirement.path:'Optional source missing: '+requirement.path);
   continue;
  }
  let data;
  try{data=fs.readFileSync(p);}catch(e){errors.push('Unreadable source: '+requirement.path);continue;}
  if(!data.length){errors.push('Empty source: '+requirement.path);continue;}
  const entry=byPath.get(requirement.path);
  if(!entry){errors.push('No manifest provenance entry: '+requirement.path);continue;}
  if(entry.revision&&entry.revision!==req.target_revision)errors.push('Per-file revision mismatch: '+requirement.path);
  if(!/^[a-f0-9]{64}$/.test(entry.sha256||''))errors.push('Invalid SHA-256: '+requirement.path);
  else if(sha256(data)!==entry.sha256)errors.push('SHA-256 mismatch: '+requirement.path);
  if(typeof entry.license!=='string'||!entry.license.trim())errors.push('Missing stated license: '+requirement.path);
  else if(entry.license==='GPL-2.0-only')errors.push('GPL-2.0-only: manual compatibility block: '+requirement.path);
  present.push(requirement.path);
 }
 if(mf&&(!mf.revision||!mf.upstream))errors.push('Manifest must specify upstream and revision');
 return {ok:missing.length===0&&errors.length===0,revision:req.target_revision,stage,present,missing,errors,warnings,manualReview:'Required: inspect each upstream copyright/license and independently compare the files against the pinned Git commit; a manifest hash alone is not evidence of upstream identity or license compatibility.'};
}
if(require.main===module){
 const argStage=process.argv.find(x=>x.startsWith("--stage="));
 const stage=argStage?argStage.slice(8):"3A";
 const result=checkSources(defaultTarget,defaultRequirements,stage);
 console.log('MD.js Ultra Phase 3 OSS Source Gate');
 console.log('Pinned DOSBox-X revision:',result.revision,'target gate:',result.stage);
 console.log('Required present:',result.present.length,'missing:',result.missing.length,'errors:',result.errors.length);
 result.missing.forEach(s=>console.log('MISSING:',s));
 result.errors.forEach(s=>console.log('ERROR:',s));
 result.warnings.forEach(s=>console.log('OPTIONAL:',s));
 console.log(result.manualReview);
 console.log('STATUS:',result.ok?'FILES VERIFIED LOCALLY — LICENSING/UPSTREAM AUDIT STILL REQUIRED':'RELEASE GATE BLOCKED — reference provenance or required sources need review');
 process.exitCode=result.ok?0:1;
}
module.exports={checkSources,sha256};
