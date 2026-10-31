'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {checkSources,sha256}=require('./check-audio-sources.cjs');
const REV='029bd65c5dcc7cdc7f2e14e35278620d9707d969';
function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'mdjs-phase3-sourcegate-'));
 const refs=path.join(root,'refs'),reqPath=path.join(root,'req.json');fs.mkdirSync(refs);
 const req={upstream:'https://github.com/joncampbell123/dosbox-x',target_revision:REV,required:[{path:'src/hardware/pcspeaker.cpp'}],recommended:[]};
 fs.writeFileSync(reqPath,JSON.stringify(req));
 const rel='src/hardware/pcspeaker.cpp',content='// GPL-2.0-or-later test fixture\n';
 fs.mkdirSync(path.join(refs,'src','hardware'),{recursive:true});fs.writeFileSync(path.join(refs,rel),content);
 const manifest={upstream:req.upstream,revision:REV,files:[{path:rel,sha256:sha256(Buffer.from(content)),license:'GPL-2.0-or-later'}]};
 fs.writeFileSync(path.join(refs,'UPSTREAM-MANIFEST.json'),JSON.stringify(manifest));
 try{fn({root,refs,reqPath,req,manifest,rel});}finally{fs.rmSync(root,{recursive:true,force:true});}
}
test('reference fixture with matching commit, SHA, and declared license is accepted for next-stage manual review',()=>fixture(x=>{
 const r=checkSources(x.refs,x.reqPath);assert.equal(r.ok,true);assert.equal(r.present.length,1);assert.match(r.manualReview,/not evidence/);
}));
test('missing peripheral reference closes source gate',()=>fixture(x=>{
 fs.rmSync(path.join(x.refs,x.rel));const r=checkSources(x.refs,x.reqPath);assert.equal(r.ok,false);assert.deepEqual(r.missing,[x.rel]);
}));
test('changed C++ bytes after manifest generation are rejected',()=>fixture(x=>{
 fs.appendFileSync(path.join(x.refs,x.rel),'// modified');const r=checkSources(x.refs,x.reqPath);assert.equal(r.ok,false);assert.ok(r.errors.some(v=>v.includes('SHA-256 mismatch')));
}));
test('mixed commits are rejected',()=>fixture(x=>{
 x.manifest.files[0].revision='b'.repeat(40);fs.writeFileSync(path.join(x.refs,'UPSTREAM-MANIFEST.json'),JSON.stringify(x.manifest));
 const r=checkSources(x.refs,x.reqPath);assert.equal(r.ok,false);assert.ok(r.errors.some(v=>v.includes('Per-file revision mismatch')));
}));
test('GPL-2.0-only declaration is explicitly blocked',()=>fixture(x=>{
 x.manifest.files[0].license='GPL-2.0-only';fs.writeFileSync(path.join(x.refs,'UPSTREAM-MANIFEST.json'),JSON.stringify(x.manifest));
 const r=checkSources(x.refs,x.reqPath);assert.equal(r.ok,false);assert.ok(r.errors.some(v=>v.includes('GPL-2.0-only')));
}));
test('unexpected path traversal and duplicate source requirements are rejected',()=>fixture(x=>{
 x.req.required.push({path:'src/../secrets.cpp'});fs.writeFileSync(x.reqPath,JSON.stringify(x.req));
 assert.throws(()=>checkSources(x.refs,x.reqPath),/Unsafe/);
}));
test('real reference intake now has Phase 3 reference files but unknown upstream commit still blocks release provenance gate',()=>{
 const a=checkSources(undefined,undefined,'3A');
 assert.equal(a.ok,false);assert.ok(a.present.includes('src/hardware/pcspeaker.cpp'));
 assert.equal(a.missing.length,0);assert.ok(a.errors.some(x=>x.includes('revision mismatch')));
 const full=checkSources();assert.equal(full.ok,false);
 assert.equal(full.missing.length,0,'received Phase 3 hardware reference set is now complete');
 assert.ok(full.present.includes('src/hardware/dma.cpp'));
 assert.ok(full.present.includes('src/hardware/dbopl.cpp'));
 assert.ok(full.present.includes('src/hardware/parport/parport.cpp'));
 assert.ok(full.errors.some(x=>x.includes('revision mismatch')),'provenance still explicitly blocked');
});
