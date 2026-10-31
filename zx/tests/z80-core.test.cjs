'use strict';
/* Real MinZX Z80 tests: run after zx/fetch-assets.py. No fake CPU here. */
const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const vendor=path.join(__dirname,'../vendor/Z80.js');
const available=fs.existsSync(vendor);
function cpuFor(program){
 const memory=new Uint8Array(65536);memory.set(program,0x8000);
 const ctx=vm.createContext({window:{},console,Uint8Array});
 vm.runInContext(fs.readFileSync(vendor,'utf8'),ctx,{filename:vendor,timeout:2000});
 const Z80Class=vm.runInContext('Z80',ctx);assert.equal(typeof Z80Class,'function');
 const bus={mem_read:a=>memory[a&0xffff],mem_write:(a,v)=>memory[a&0xffff]=v&255,
            io_read:()=>255,io_write:()=>{}};
 const cpu=new Z80Class(bus);
 const initial=cpu.getState();initial.pc=0x8000;initial.sp=0xC000;cpu.setState(initial);
 return {cpu,memory};
}
const coreTest=available?test:test.skip;
coreTest('Z80: LD A,n, INC A, LD (nn),A, HALT',()=>{
 const {cpu,memory}=cpuFor([0x3E,0x41,0x3C,0x32,0x00,0x90,0x76]);
 for(let k=0;k<4;k++)cpu.run_instruction();
 assert.equal(cpu.getState().a,0x42);assert.equal(memory[0x9000],0x42);
 assert.ok(cpu.is_halted());
});
coreTest('Z80: CALL subroutine, XOR A, RET, JP, HALT',()=>{
 const prog=Uint8Array.from([0xCD,0x09,0x80, 0xC3,0x0D,0x80, 0,0,0,
    0x3E,0x55,0xAF,0xC9, 0x76]);
 const {cpu}=cpuFor(prog);
 for(let k=0;k<6;k++)cpu.run_instruction();
 const st=cpu.getState();assert.equal(st.a,0);assert.equal(st.sp,0xC000);assert.equal(st.flags.Z,1);
 assert.ok(cpu.is_halted());
});
coreTest('Z80: DEC, carry, zero, PC wrap, independent state',()=>{
 const {cpu}=cpuFor([0x3E,0x00,0x3D,0x3C,0x76]);
 for(let k=0;k<4;k++)cpu.run_instruction();
 const s=cpu.getState();assert.equal(s.a,0);assert.equal(s.flags.Z,1);
});
