/* MD.js Ultra - small, audited two-pass Z80 teaching assembler.
 * No eval, no imports, no ROM writes, no macro language. ES6.
 * Supports a deliberately limited mnemonic subset; see ZX/README.
 */
(function(root){'use strict';
const MAX_LINES=4096, MAX_BYTES=32768;
const REG8={B:0x06,C:0x0E,D:0x16,E:0x1E,H:0x26,L:0x2E,A:0x3E};
const REG16={BC:0x01,DE:0x11,HL:0x21,SP:0x31};
const SINGLE={NOP:0x00,HALT:0x76,RET:0xC9,DI:0xF3,EI:0xFB,SCF:0x37,'XOR A':0xAF,'INC A':0x3C,'DEC A':0x3D,'LD (HL),A':0x77,'LD A,(HL)':0x7E};
const JRC={NZ:0x20,Z:0x28,NC:0x30,C:0x38};
function assemble(source){
 if(typeof source!=='string'||source.length>131072)throw new Error('ASM source invalid or too large');
 const lines=source.replace(/\r\n?/g,'\n').split('\n');
 if(lines.length>MAX_LINES)throw new Error('ASM too many lines');
 const labels=Object.create(null),records=[];
 let origin=0x8000,pc=origin,usedORG=false,emitted=false;
 function number(token,at,allowUndefined){
   const t=token.trim();let value;
   if(/^\$[0-9A-F]+$/i.test(t))value=parseInt(t.slice(1),16);
   else if(/^0x[0-9A-F]+$/i.test(t))value=parseInt(t.slice(2),16);
   else if(/^\d+$/.test(t))value=Number(t);
   else if(/^[A-Za-z_][\w]*$/.test(t)){
     if(Object.prototype.hasOwnProperty.call(labels,t.toUpperCase()))value=labels[t.toUpperCase()];
     else if(allowUndefined)value=0;
     else throw new Error('Line '+at+': undefined label '+t);
   }else throw new Error('Line '+at+': invalid expression '+t);
   if(!Number.isInteger(value)||value<0||value>65535)throw new Error('Line '+at+': number out of range');
   return value;
 }
 function enc(statement,address,line,forward){
   const s=statement.toUpperCase().replace(/\s+/g,' ').replace(/,\s+/g,',').trim();
   const imm=t=>number(t,line,forward);
   const byte=t=>{const n=imm(t);if(n>255)throw new Error('Line '+line+': byte overflow');return n;};
   const word=t=>{const n=imm(t);return [n&255,n>>8];};
   const single=SINGLE[s];if(single!==undefined)return [single];
   let m;
   if((m=/^DB\s+(.+)$/i.exec(s)))return m[1].split(',').map(byte);
   if((m=/^DW\s+(.+)$/i.exec(s)))return m[1].split(',').flatMap(word);
   if((m=/^LD\s+([A-Z]{1,2}),\s*(.+)$/.exec(s))){
     const reg=m[1],arg=m[2];
     if(reg==='A'&&/^\(.+\)$/.test(arg))return [0x3A,...word(arg.slice(1,-1))];
     if(Object.prototype.hasOwnProperty.call(REG16,reg))return [REG16[reg],...word(arg)];
     if(Object.prototype.hasOwnProperty.call(REG8,reg))return [REG8[reg],byte(arg)];
   }
   if((m=/^LD\s+\((.+)\),\s*A$/.exec(s)))return [0x32,...word(m[1])];
   if((m=/^LD\s+\(HL\),\s*(.+)$/.exec(s)))return [0x36,byte(m[1])];
   if((m=/^(JP|CALL)\s+(.+)$/.exec(s)))return [m[1]==='JP'?0xC3:0xCD,...word(m[2])];
   if((m=/^JR\s+(?:(NZ|Z|NC|C),\s*)?(.+)$/.exec(s))){
     const target=imm(m[2]);let offset=target-(address+2);
     if(forward)offset=0;
     if(offset< -128||offset>127)throw new Error('Line '+line+': JR target out of range');
     return [m[1]?JRC[m[1]]:0x18,offset&255];
   }
   if((m=/^(ADD A,|SUB |CP )\s*(.+)$/.exec(s)))return [({'ADD A,':0xC6,'SUB ':0xD6,'CP ':0xFE})[m[1]],byte(m[2])];
   if((m=/^OUT\s+\((.+)\),\s*A$/.exec(s)))return [0xD3,byte(m[1])];
   if((m=/^IN\s+A,\s*\((.+)\)$/.exec(s)))return [0xDB,byte(m[1])];
   throw new Error('Line '+line+': unsupported instruction: '+statement);
 }
 for(let i=0;i<lines.length;i++){
   let s=lines[i].split(';',1)[0].trim();if(!s)continue;
   const label=/^([A-Za-z_][\w]*):\s*(.*)$/.exec(s);
   if(label){const name=label[1].toUpperCase();if(Object.prototype.hasOwnProperty.call(labels,name))throw new Error('Line '+(i+1)+': duplicate label');labels[name]=pc;s=label[2].trim();if(!s)continue;}
   let m=/^ORG\s+(.+)$/i.exec(s);
   if(m){if(emitted||usedORG)throw new Error('Line '+(i+1)+': ORG must appear once before code');origin=number(m[1],i+1,true);if(origin<0x4000)throw new Error('Line '+(i+1)+': cannot assemble into ROM');pc=origin;usedORG=true;continue;}
   const data=enc(s,pc,i+1,true);
   if(!data.length||data.length>MAX_BYTES)throw new Error('Line '+(i+1)+': invalid data size');
   if(pc+data.length>65536||pc+data.length-origin>MAX_BYTES)throw new Error('Line '+(i+1)+': program exceeds RAM / 32 KiB');
   records.push({text:s,address:pc,line:i+1,len:data.length});pc+=data.length;emitted=true;
 }
 if(!records.length)throw new Error('ASM has no instructions');
 const bytes=new Uint8Array(pc-origin);
 for(const r of records){const data=enc(r.text,r.address,r.line,false);if(data.length!==r.len)throw new Error('ASM second pass length differs');bytes.set(data,r.address-origin);}
 return {origin,entry:origin,bytes,labels:Object.freeze({...labels})};
}
const api=Object.freeze({assemble});root.ZXASM=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
