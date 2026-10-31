const {PCMachine}=require('../PC-Machine.js');const {S,R}=require('../PC-Core.js');const fs=require('fs');const path=require('path');
for(const [kind,adapter] of [['CGA','cga'],['HGC','hercules']]){
 const bytes=fs.readFileSync(path.join(__dirname,'../phase4',kind+'FRAC.COM'));
 const m=new PCMachine('xt',{videoAdapter:adapter});const c=m.cpu;
 m.ram.set(bytes,0x2100);for(const s of [S.CS,S.DS,S.SS])c.loadSegment(s,0x200);c.ip=0x100;c.r[R.SP]=0xfffe;c.halted=false;
 const at=Date.now();try{for(let i=0;i<300&&!m.waitingForKey&&!c.halted;i++)m.run(25000);}catch(e){console.error(kind,e, 'ip',c.ip.toString(16),'steps',c.steps);process.exitCode=1;continue;}
 let colors=new Map();for(let y=0;y<(kind==='CGA'?200:348);y+=4)for(let x=0;x<(kind==='CGA'?320:720);x+=4){let v=m.video.getPixel(x,y);colors.set(v,(colors.get(v)||0)+1);}
 console.log(kind, 'time',Date.now()-at,'steps',c.steps,'waiting',m.waitingForKey, 'mode',m.video.mode,'graphics',m.video.isGraphics,'colors',[...colors]);
}
