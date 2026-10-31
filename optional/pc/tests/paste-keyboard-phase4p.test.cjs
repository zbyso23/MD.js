'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../PC-Paste.js'),'utf8'),context);
const {prepare}=context.MDPC_PASTE;
test('ASCII lines CR/LF -> INT16 BIOS scan codes and correct DOS CRLF size',()=>{
 const a=prepare('Hello\r\n# include <stdio.h>\rEND\n');
 assert.equal(a.characters,30);assert.equal(a.bytes,a.characters+3);
 assert.equal(a.keys[0],0x2348);assert.equal(a.keys[5],0x1c0d);
 assert.equal(a.keys.at(-1),0x1c0d);
 assert.equal(a.keys[6]&255,35);
});
test('C and assembly punctuation and Tab roundtrip through key code',()=>{
 const data='mov ax,0x1234; test <x> [bx+si] {if(a==b) puts("ok\\n");}\n\tret';
 const result=prepare(data);assert.equal(String.fromCharCode(...result.keys.map(x=>x&255)).replace(/\r/g,'\n'),data);
 assert.equal(result.keys.at(-4),0x0f09);
});
test('disallows accidental Unicode/control commands; explicit accent folding only',()=>{
 assert.throws(()=>prepare('á'),/U\+E1/);
 assert.throws(()=>prepare('\u001b'),/U\+1B/);
 const p=prepare('Žluťoučký',true);assert.equal(String.fromCharCode(...p.keys.map(x=>x&255)),'Zlutoucky');assert.equal(p.folded,4);
 assert.throws(()=>prepare('“curly quotes”',true),/U\+201C/);
});
test('16KiB editor bound counts DOS CRLF, empty input rejected',()=>{
 assert.throws(()=>prepare(''),/prázdné/);
 assert.equal(prepare('a\n'.repeat(5460)).bytes,16380);
 assert.throws(()=>prepare('a\n'.repeat(5461)),/limit/);
});
