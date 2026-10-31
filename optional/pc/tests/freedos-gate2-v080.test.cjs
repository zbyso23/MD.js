/* Gate2: run real supplied FreeDOS 720 KiB FAT12 floppy and DEBUG.COM on pure JS x86 core. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {PCMachine}=require('../PC-Machine.js');
const floppy=new Uint8Array(fs.readFileSync(path.join(__dirname,'../x86BOOT-720K-DEBUG-DEV.img')));
const debugCOM=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../DEBUG.COM'))).digest('hex');
function screen(m){let rows=[];for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let v=m.video.readCell(y,x)?.char;s+=v>=32?String.fromCharCode(v):' ';}rows.push(s.trimEnd());}return rows.join('\n');}
function run(m,budget=5000000){let executed=0;while(executed<budget){const x=m.run(Math.min(50000,budget-executed));if(x.executed===0||x.halted)break;executed+=x.executed;}return executed;}
function boot(profile){const m=new PCMachine(profile,{videoAdapter:'hercules'});m.mountDisk(0,floppy,'x86BOOT-720K-DEBUG-DEV.img');m.bootFloppy();run(m,5500000);assert.match(screen(m),/FreeCom version 0\.86/);assert.match(screen(m),/A:\\>/);return m;}
function command(m,txt){for(const c of txt+'\n'){const key=(c==='\n'?(0x1c<<8)|13:c.charCodeAt(0));if(!m.queueBIOSKey(key)){run(m,100000);assert.ok(m.queueBIOSKey(key));}}run(m,750000);return screen(m);}
function readRootFile(name){const b=floppy,bps=b[11]|(b[12]<<8),spc=b[13],reserved=b[14]|b[15]<<8,fats=b[16],entries=b[17]|b[18]<<8,spf=b[22]|b[23]<<8;
 const root=(reserved+fats*spf)*bps, data=(reserved+fats*spf+Math.ceil(entries*32/bps))*bps, fat=b.subarray(reserved*bps,(reserved+spf)*bps);let start,len;
 for(let i=0;i<entries;i++){const off=root+i*32;if(b.subarray(off,off+11).every((v,i)=>v===name.charCodeAt(i))){start=b[off+26]|(b[off+27]<<8);len=(b[off+28]|(b[off+29]<<8)|(b[off+30]<<16)|(b[off+31]<<24))>>>0;break;}}
 if(start===undefined)return null;
 const chunks=[];let c=start;while(c>=2&&c<0xff8){chunks.push(b.slice(data+(c-2)*spc*bps,data+(c-1)*spc*bps));const p=c*3>>1;c=(c&1)?((fat[p]>>4)|(fat[p+1]<<4))&0xfff:(fat[p]|((fat[p+1]&15)<<8))&0xfff;}
 return Buffer.concat(chunks).subarray(0,len);
}
test('embedded FAT12 disk includes exact user DEBUG.COM bytes in a valid file chain',()=>{
 assert.equal(floppy.length,737280);assert.equal(floppy[510],0x55);assert.equal(floppy[511],0xaa);
 const got=readRootFile('DEBUG   COM');assert.ok(got);assert.equal(require('node:crypto').createHash('sha256').update(got).digest('hex'),debugCOM);
});
test('XT: actual FreeDOS A:> + DIR + DEBUG prompt and registers',()=>{
 const m=boot('xt');assert.match(command(m,'DIR'),/DEBUG\s+COM\s+22,324/);
 assert.match(command(m,'DEBUG'),/A:\\>DEBUG/);
 assert.match(command(m,'R'),/AX=0000 BX=0000/);
 assert.match(command(m,'Q'),/A:\\>/);
});
test('XT: real DEBUG A/U/G executes DOS INT21 to print letter A and exits back',()=>{
 const m=boot('xt');command(m,'DEBUG');command(m,'A 100');
 for(const c of ['MOV AH,02','MOV DL,41','INT 21','INT 20',''])command(m,c);
 const d=command(m,'U 100');assert.match(d,/MOV\s+AH,02/);assert.match(d,/INT\s+21/);
 const t=command(m,'G');assert.match(t,/Program terminated normally \(0000\)/);assert.match(t,/\nA\n/);
 assert.match(command(m,'Q'),/A:\\>/);
});
test('XT and AT: FreeDOS writes and removes FAT12 files via real DOS commands',()=>{
 for(const profile of ['xt','at']){const m=boot(profile);
 assert.match(command(m,'COPY FDAUTO.BAT TEST.BAT'),/TEST\.BAT/);
 assert.match(command(m,'DIR TEST.BAT'),/TEST\s+BAT\s+135/);
 assert.match(command(m,'DEL TEST.BAT'),/one file removed/);
 assert.match(command(m,'DIR TEST.BAT'),/File not found|File Not Found|0 file\(s\)/i);
 }
});
