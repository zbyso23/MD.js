'use strict';
/* Build a real 720K FAT12 developer floppy, optionally adding verified DOS tools.
 * Run from optional/pc/devtools: node build_devdisk.js [--tool FILENAME=PATH]...
 * Does not download anything or claim unsupported binaries as installed.
 */
const fs=require('fs'),path=require('path');
const PC=path.resolve(__dirname,'..');
const {packFiles}=require(path.join(PC,'PC-Disk-Images.js'));
const required=['EDIT.COM','DEBUG.COM','HELLO.ASM','HELLO.C','DEVHELP.TXT'];
const files=required.map(name=>({name,data:fs.readFileSync(name==='DEBUG.COM'?path.join(PC,'DEBUG.COM'):path.join(__dirname,name))}));
for(let i=2;i<process.argv.length;i++){
 if(process.argv[i]!=='--tool'||!process.argv[i+1])throw Error('Use --tool DOSNAME.COM=/path/to/verified/binary');
 const [name,...rest]=process.argv[++i].split('=');const src=rest.join('=');
 if(!/^[A-Z0-9_]{1,8}\.(COM|EXE|OBJ|LIB|H|TXT)$/i.test(name)||!src)throw Error('Invalid 8.3 tool filename/path');
 const bytes=fs.readFileSync(src);if(!bytes.length||bytes.length>700000)throw RangeError('Tool empty/too large for floppy');
 if(files.some(x=>x.name.toUpperCase()===name.toUpperCase()))throw Error('Duplicate DOS name');
 files.push({name:name.toUpperCase(),data:bytes});
}
const packed=packFiles(files,'floppy');
if(packed.format!=='720K')throw Error('Development tools must fit in a 720K image');
const img=Buffer.from(packed.buffer);const target=path.join(PC,'x86DEV-720K-XT286.img');fs.writeFileSync(target,img);
const assets=path.join(PC,'PC-EmbeddedAssets.js');const content=fs.readFileSync(assets,'utf8');
const payload=img.toString('base64');
let updated;
if(/devtools720k:"[A-Za-z0-9+/=]*"/.test(content))updated=content.replace(/devtools720k:"[A-Za-z0-9+/=]*"/,`devtools720k:"${payload}"`);
else updated=content.replace(/(freedos720kDebug:"[A-Za-z0-9+/=]*")/,`$1,devtools720k:"${payload}"`);
if(updated===content||!updated.includes(`devtools720k:"${payload}"`))throw Error('Failed updating embedded image');
fs.writeFileSync(assets,updated);
console.log(JSON.stringify({image:target,bytes:img.length,files:packed.mapping,usedPayload:files.reduce((a,f)=>a+f.data.length,0)},null,2));
