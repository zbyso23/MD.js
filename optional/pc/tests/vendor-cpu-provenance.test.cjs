'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../vendor/dosbox-x-cpu');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'UPSTREAM-MANIFEST.json'),'utf8'));
test('DOSBox-X CPU source provenance pinned to supplied commit',()=>{
 assert.equal(manifest.commit,'029bd65c5dcc7cdc7f2e14e35278620d9707d969');
 assert.equal(manifest.license,'GPL-2.0-or-later, per upstream source headers; not a blanket relicensing grant');
 assert.match(manifest.runtime,/REFERENCE_ONLY/);
 for(const src of ['cpu/core_normal_8086.cpp','cpu/core_normal_286.cpp','cpu/core_normal/table_ea_8086.h','cpu/flags.cpp','include/cpu.h','include/regs.h']){
  assert.ok(Object.hasOwn(manifest.sha256,src),src);
 }
});
test('DOSBox-X CPU references retain exact recorded SHA-256 bytes',()=>{
 for(const [rel,hash] of Object.entries(manifest.sha256)){
  const bytes=fs.readFileSync(path.join(root,rel));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,rel);
 }
});
test('No 386/full/dynamic CPU cores imported into active reference folder',()=>{
 for(const rel of Object.keys(manifest.sha256)){
  assert.ok(!/core_full|core_dyn|core_simple|paging\.cpp|mmx\.cpp/.test(rel),rel);
 }
});
