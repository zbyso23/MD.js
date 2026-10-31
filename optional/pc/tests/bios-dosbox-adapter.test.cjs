/* BIOS adaptation conformance tests: DOSBox-X BDA/callback/keyboard-ring patterns. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PCMachine}=require('../PC-Machine.js');
const {BDA}=require('../PC-BIOS.js');
const {R,S,F,CPUFault}=require('../PC-Core.js');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
function program(bytes,profile='xt',opts={}){
 const m=new PCMachine(profile,opts);m.cpu.loadSegment(S.CS,0);m.cpu.ip=0x2000;m.cpu.loadSegment(S.DS,0);m.cpu.loadSegment(S.SS,0);m.cpu.r[R.SP]=0x7000;
 m.ram.set(bytes,0x2000);return m;
}
function command(fn,int=0x16,other=[]){return [...other,0xb8,0,fn,0xcd,int,0xf4];}
test('BIOS BDA initialized and adapted memory size is reported, no fixed 640 KiB stub',()=>{
 for(const [profile,kb] of [['xt',512],['xt',640],['at',384],['at',640]]){
  const m=new PCMachine(profile,{conventional:kb*1024,extended:profile==='at'?(1024-kb)*1024:0});
  assert.equal(m.read16Physical(BDA.CONVENTIONAL_KB),kb);
  assert.equal(m.run(100).halted,true);assert.equal(m.cpu.r[R.AX],kb);
  assert.equal(m.read16Physical(BDA.CONVENTIONAL_KB),kb);
 }
});
test('BIOS INT 11h reads equipment word from BDA',()=>{
 const m=program([0xcd,0x11,0xf4]);m.write16Physical(BDA.EQUIPMENT,0x1234);m.run();assert.equal(m.cpu.r[R.AX],0x1234);
});
test('INT 16h AH=01 reports empty buffer via saved ZF and does not consume keys',()=>{
 const m=program(command(1));m.run();assert.ok(m.cpu.flags&F.ZF);
 assert.equal(m.read16Physical(BDA.KB_HEAD),m.read16Physical(BDA.KB_TAIL));
});
test('INT 16h keyboard peek, read, then empty checks',()=>{
 const m=program([0xb8,0,1,0xcd,0x16,0xb8,0,0,0xcd,0x16,0xf4]);
 assert.equal(m.queueBIOSKey(0x1e61),true);
 // peek returns 0x1e61, then consume returns same
 m.cpu.step();m.cpu.step();m.cpu.step();assert.equal(m.cpu.r[R.AX],0x1e61);assert.equal(!!(m.cpu.flags&F.ZF),false);
 m.run();assert.equal(m.cpu.r[R.AX],0x1e61);assert.equal(m.read16Physical(BDA.KB_HEAD),m.read16Physical(BDA.KB_TAIL));
});
test('INT 16h AH=00 with empty queue does not claim fabricated key',()=>{
 const m=program(command(0));assert.throws(()=>m.run(),/keyboard wait/);
});
test('keyboard ring buffer wraps at BIOS 0x40:3e and preserves ordering',()=>{
 const m=new PCMachine('xt');
 for(let i=1;i<=15;i++)assert.equal(m.queueBIOSKey(i),true);
 assert.equal(m.queueBIOSKey(0xffff),false);assert.equal(m.read16Physical(BDA.KB_TAIL),0x3c);
 for(let i=1;i<=8;i++)assert.equal(m.bios.peekKey(true),i);
 for(let i=16;i<=23;i++)assert.equal(m.queueBIOSKey(i),true);
 for(let i=9;i<=23;i++)assert.equal(m.bios.peekKey(true),i);
 assert.equal(m.bios.peekKey(false),null);
 assert.equal(m.read16Physical(BDA.KB_HEAD),m.read16Physical(BDA.KB_TAIL));
});
test('INT 16h AH=02 returns BDA shift flags',()=>{
 const m=program(command(2));m.write8(BDA.KB_SHIFT,0x55);m.run();assert.equal(m.cpu.get8(0),0x55);
});
test('INT 1Ah AH=00 returns BIOS ticks and clears midnight flag',()=>{
 const m=program(command(0,0x1a));m.bios.set32(BDA.TICKS,0x12345678);m.write8(BDA.MIDNIGHT,1);
 m.run();assert.equal(m.cpu.r[R.CX],0x1234);assert.equal(m.cpu.r[R.DX],0x5678);assert.equal(m.cpu.get8(0),1);
 assert.equal(m.read8(BDA.MIDNIGHT),0);assert.equal(m.cpu.flags&F.CF,0);
});
test('INT 1Ah AH=01 sets ticks from CX:DX, clears midnight',()=>{
 const m=program([0xb9,0x34,0x12,0xba,0x78,0x56,0xb8,0,1,0xcd,0x1a,0xf4]);
 m.run();assert.equal(m.bios.get32(BDA.TICKS),0x12345678);assert.equal(m.cpu.flags&F.CF,0);
});
test('IRQ0 BIOS handler increments time and acknowledges PIC',()=>{
 const m=new PCMachine('xt');m.pic.mask=0xfe;m.run(100);m.tickPIT(65536); // may be one ISR
 assert.equal(m.pic.isr,1);m.run(10);
 assert.equal(m.bios.get32(BDA.TICKS),1);assert.equal(m.pic.isr,0);
});
test('INT 13h fails closed while FDD is unimplemented; returns AH error and CF',()=>{
 const m=program(command(2,0x13));m.run();assert.equal(m.cpu.get8(4),1);assert.ok(m.cpu.flags&F.CF);
});
test('INT 15h AH=88 reports bounded extended RAM and clears saved CF',()=>{
 const m=program(command(0x88,0x15),'at',{conventional:640*1024,extended:384*1024});m.run();assert.equal(m.cpu.r[R.AX],384);assert.equal(m.cpu.flags&F.CF,0);
});
test('Unsupported INT 15h service uses conventional unsupported status / CF',()=>{
 const m=program(command(0x99,0x15));m.run();assert.equal(m.cpu.get8(4),0x86);assert.ok(m.cpu.flags&F.CF);
});
test('No device memory mapping or disk emulation added by BIOS adapter',()=>{
 for(const p of ['xt','at']){const m=new PCMachine(p);assert.equal(m.read8(0xa0000),255);assert.equal(m.read8(0xb8000),255);assert.equal(typeof m.mountDisk,'undefined');assert.equal(m.conventional+m.extended, p==='xt'?640*1024:1024*1024);}
});
test('13 DOSBox-X source snapshots are intact and listed with SHA-256',()=>{
 const dir=path.join(__dirname,'../vendor/dosbox-x-reference');
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'UPSTREAM-MANIFEST.json'),'utf8'));
 assert.equal(manifest.length,13);
 for(const r of manifest){const buf=fs.readFileSync(path.join(dir,r.file));assert.equal(buf.byteLength,r.bytes);assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),r.sha256);}
});
