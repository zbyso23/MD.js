'use strict';const test=require('node:test'),assert=require('node:assert/strict');
const {assemble}=require('../ZX-ASM.js');
test('two-pass labels and loops, gold opcode bytes',()=>{
 const p=assemble('ORG $8000\nStart: LD A, 2\nOUT (254), A\nJR Start');
 assert.equal(p.origin,0x8000);assert.equal(p.labels.START,0x8000);
 assert.deepEqual(Array.from(p.bytes),[0x3E,2,0xD3,254,0x18,0xFA]);
});
test('forward CALL + JP and address little endian',()=>{
 const p=assemble('CALL sub\nJP end\nsub: INC A\nRET\nend: HALT');
 assert.deepEqual(Array.from(p.bytes),[0xCD,6,0x80,0xC3,8,0x80,0x3C,0xC9,0x76]);
});
test('direct video RAM and DB/DW',()=>{
 const p=assemble('ORG 32768\nLD HL, 16384\nLD A, 255\nLD (16384), A\nDB $00,1,2\nDW 32768\nHALT');
 assert.deepEqual(Array.from(p.bytes),[0x21,0,0x40,0x3E,255,0x32,0,0x40,0,1,2,0,0x80,0x76]);
});
test('illegal assembly fails closed and never evaluates expressions',()=>{
 for(const src of ['ORG 100\nNOP','JP missing','JR $9000','DB 256','DB alert(1)','ORG 32768\nORG 32769\nNOP','label: NOP\nlabel: HALT','FOO BAR',''])assert.throws(()=>assemble(src));
});
test('bounded source code and no write past RAM',()=>{
 assert.throws(()=>assemble('ORG 65535\nLD A,1'),/exceeds/);
 assert.throws(()=>assemble('NOP\n'.repeat(5000)),/lines/);
});
