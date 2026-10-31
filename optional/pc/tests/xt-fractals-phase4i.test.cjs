'use strict';
/* XT hardware-only Mandelbrot: independent Q6 reference and CGA/HGC VRAM checks.
 * The guest computes pixels through integer IMUL/SHIFT/ADD/SUB/CMP and writes
 * real 8086 video memory. This is NOT a cached host-side rendered image.
 */
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {PCMachine}=require('../PC-Machine.js'),{S,R}=require('../PC-Core.js');
function ref(col,row,cga){
 const cre=-128+col*2,cim=-75+row*3;let zx=0,zy=0,rem=12;
 while(rem>0){
  const xx=Math.floor(zx*zx/64),yy=Math.floor(zy*zy/64);
  if(xx+yy>256)break;
  const nextY=Math.floor(zx*zy/32)+cim;
  zx=xx-yy+cre;zy=nextY;rem--;
 }
 const color=rem?(rem&3)||3:0;
 return cga?color:(color?1:0);
}
function execute(kind){
 const cga=kind==='CGA',binary=fs.readFileSync(path.join(__dirname,'../phase4',kind+'FRAC.COM'));
 const m=new PCMachine('xt',{videoAdapter:cga?'cga':'hercules'}),cpu=m.cpu;
 m.ram.set(binary,0x2100);for(const s of [S.CS,S.DS,S.SS])cpu.loadSegment(s,0x200);
 cpu.ip=0x100;cpu.r[R.SP]=0xfffe;cpu.halted=false;
 for(let n=0;n<300&&!m.waitingForKey&&!cpu.halted;n++)m.run(25000);
 assert.equal(m.waitingForKey,true,kind+' did not finish and wait for key');
 assert.equal(m.video.isGraphics,true);assert.ok(cpu.steps>600000,'guest CPU not exercised');
 return {m,binary};
}
for(const kind of ['CGA','HGC'])test('XT '+kind+' fixed-point Mandelbrot matches independent cells and video memory',()=>{
 const {m,binary}=execute(kind),cga=kind==='CGA';
 assert.ok(binary.length<1200,'minuscule 8086 COM');
 assert.ok(!binary.includes(Buffer.from([0x0f,0x82])),'no 386 near conditional jump');
 const width=cga?80:90,height=cga?50:58,scale=cga?4:6;
 const points=[[0,0],[3,3],[15,8],[20,15],[35,24],[40,29],[55,17],[65,35],[79,49]];
 if(!cga)points.push([89,57]);
 for(const [x,y] of points){const got=m.video.getPixel(x*(cga?4:8),y*scale);
  assert.equal(got,ref(x,y,cga),kind+' Q6 coordinate '+x+','+y);}
 const pixels=new Set();for(let y=0;y<height;y++)for(let x=0;x<width;x++)pixels.add(m.video.getPixel(x*(cga?4:8),y*scale));
 assert.ok(pixels.size>= (cga?4:2),'unicolor or incomplete fractal');
 // DOS return is separately exercised in FreeDOS browser tests: isolated CPU has no COMMAND.COM to return to.

});
