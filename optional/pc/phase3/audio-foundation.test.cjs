'use strict';
/* Phase 3 legacy I/O acceptance vectors; supported devices have dedicated
 * functional and browser tests. GPL-3.0-only. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {R,S}=require('../PC-Core.js');
function guest(profile,bytes){const m=new PCMachine(profile);m.cpu.loadSegment(S.CS,0);m.cpu.ip=0x2000;m.cpu.loadSegment(S.DS,0);m.cpu.loadSegment(S.SS,0);m.cpu.r[R.SP]=0x7000;m.ram.set(bytes,0x2000);return m;}
for(const profile of ['xt','at']){
 test(`${profile}: guest x86 OUT/IN to port 61h preserves existing latch (speaker transport)`,()=>{
  const m=guest(profile,[0xb0,0x03,0xe6,0x61,0xe4,0x61,0xf4]);
  m.run(20);assert.equal(m.in8(0x61),3);assert.equal(m.cpu.r[R.AX]&255,3);
 });
 test(`${profile}: guest x86 programs existing PIT2 reload via 43h/42h (speaker timing)`,()=>{
  const m=guest(profile,[0xb0,0xb6,0xe6,0x43,0xb0,0x10,0xe6,0x42,0xb0,0x00,0xe6,0x42,0xf4]);
  m.run(30);assert.equal(m.pit.reload[2],16);assert.equal(m.pit.mode[2],3);
 });
 test(`${profile}: guest x86 programs existing DMA1 address register (DMA registers)`,()=>{
  const m=guest(profile,[0xb0,0x00,0xe6,0x0c,0xb0,0x34,0xe6,0x02,0xb0,0x12,0xe6,0x02,0xf4]);
  m.run(30);assert.equal(m.dma.addr[1],0x1234);
 });
}
test.todo('OPEN HARDWARE FIDELITY: PIT mode 0/1/4/5, port 61h bit5 output, analog filtering and cycle-accurate 8253 speaker (not part of functional Phase 3 acceptance)');
