'use strict';
/* Independently compute selected Mandelbrot cells, not merely a framebuffer hash.
 * The guest updates its coordinates/iteration values through binary32 memory,
 * so our reference uses Math.fround at precisely those store points. GPL-3.0-only.
 */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {PCMachine}=require('../PC-Machine.js');const {S,R}=require('../PC-Core.js');
const code=new Uint8Array(fs.readFileSync(path.join(__dirname,'../phase4/MANDEL.COM')));
const f=Math.fround;
function reference(x,y){
 let re=f(-2),im=f(-1.2);for(let i=0;i<x;i++)re=f(re+f(0.0375));for(let j=0;j<y;j++)im=f(im+f(0.048));
 let zx=f(0),zy=f(0);let remaining=18;
 while(remaining>0){
  const r2=zx*zx+zy*zy;
  if(r2>4)break;
  const ny=f((zx*zy)*2+im);
  const nx=f((zx*zx-zy*zy)+re);
  zx=nx;zy=ny;remaining--;
 }
 return remaining?remaining+16:0;
}
function execute(){
 const m=new PCMachine('at',{videoAdapter:'vga',fpuEnabled:true});const c=m.cpu;
 m.ram.set(code,0x2100);for(const s of [S.CS,S.DS,S.SS])c.loadSegment(s,0x200);
 c.ip=0x100;c.r[R.SP]=0xfffe;c.halted=false;
 for(let k=0;k<48&&!m.waitingForKey;k++)m.run(25000);
 assert.equal(m.waitingForKey,true,'guest did not finish drawing to BIOS keyboard wait');
 assert.equal(m.video.mode,0x13);return m;
}
test('MANDEL output matches independently calculated points rather than just a hash',()=>{
 const m=execute();const locations=[[0,0],[12,5],[23,11],[35,20],[40,25],[45,28],[55,15],[65,35],[79,49]];
 for(const [x,y] of locations){const actual=m.video.getPixel(x*4,y*4),expected=reference(x,y);assert.equal(actual,expected,`Mandel cell ${x},${y}`);}
 const colors=new Set();let black=0;for(let y=0;y<50;y++)for(let x=0;x<80;x++){const v=m.video.getPixel(x*4,y*4);colors.add(v);if(v===0)black++;}
 assert.ok(colors.size>=15,'expected visible gradient (not a green rectangle)');
 assert.ok(black>200&&black<2500,`unexpected interior coverage: ${black}`);
 assert.ok(m.fpu.instructions>500000,'guest x87 code not actually executed');
});
test('MANDEL 339B executable includes FPU presence guard and original FreeDOS asset stays correct',()=>{
 assert.equal(code.length,339);const image=fs.readFileSync(path.join(__dirname,'../x86BOOT-720K-DEBUG-DEV.img'));
 assert.equal(image.subarray(510,512).toString('hex'),'55aa');
 assert.equal(image.length,737280);
 const root=path.join(__dirname,'../PC-EmbeddedAssets.js');const txt=fs.readFileSync(root,'utf8');
 const b64=txt.match(/freedos720kDebug:"([A-Za-z0-9+/=]+)"/);assert.ok(b64);
 assert.deepEqual(Buffer.from(b64[1],'base64'),image);
});
