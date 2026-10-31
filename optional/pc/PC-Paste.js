/* MD.js Ultra PC Workbench — paced ASCII BIOS keyboard paste (Phase 4P).
 * Pure browser JS; no WASM, fetch, storage or clipboard permission required.
 * Never writes guest RAM / disk: the caller sends 16-bit BIOS keyboard words.
 * Copyright 2026 MD.js Ultra contributors. GPL-3.0-only.
 */
(function(root){'use strict';
 const SCANS={
  ' ':0x39,'\t':0x0f,'\n':0x1c,
  '1':0x02,'2':0x03,'3':0x04,'4':0x05,'5':0x06,
  '6':0x07,'7':0x08,'8':0x09,'9':0x0a,'0':0x0b,
  '-':0x0c,'_':0x0c,'=':0x0d,'+':0x0d,
  '[':0x1a,'{':0x1a,']':0x1b,'}':0x1b,
  '\\':0x2b,'|':0x2b,';':0x27,':':0x27,
  "'":0x28,'"':0x28,'`':0x29,'~':0x29,
  ',':0x33,'<':0x33,'.':0x34,'>':0x34,'/':0x35,'?':0x35,
  '!':0x02,'@':0x03,'#':0x04,'$':0x05,'%':0x06,'^':0x07,'&':0x08,'*':0x09,'(':0x0a,')':0x0b
 };
 for(const [row,scan] of [['QWERTYUIOP',0x10],['ASDFGHJKL',0x1e],['ZXCVBNM',0x2c]])
  for(let i=0;i<row.length;i++){SCANS[row[i]]=scan+i;SCANS[row[i].toLowerCase()]=scan+i;}
 const asciiFromCodePoint=(ch,fold)=>{
  if(ch==='\n'||ch==='\t')return ch;
  if(ch.length===1&&ch.charCodeAt(0)>=32&&ch.charCodeAt(0)<=126)return ch;
  if(!fold)return null;
  // Strip combining diacritics only when explicitly permitted by user.
  const candidate=ch.normalize('NFKD').replace(/[\u0300-\u036f]/g,'');
  return candidate.length===1&&candidate.charCodeAt(0)>=32&&candidate.charCodeAt(0)<=126?candidate:null;
 };
 function prepare(text,fold=false,maxBytes=16380){
  if(typeof text!=='string')throw new TypeError('Vlož zdrojový text.');
  const normalized=text.replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
  const keys=[];let folded=0,bytes=0,index=0;
  for(const ch of normalized){
   const ascii=asciiFromCodePoint(ch,fold);
   if(ascii===null){const point=ch.codePointAt(0).toString(16).toUpperCase();
    throw new Error(`Znak U+${point} na pozici ${index+1} není DOS ASCII. ${fold?'Odstraň jej ze zdrojáku.':'Zapni převod diakritiky nebo uprav text.'}`);}
   if(ascii!==ch)folded++;
   bytes+=ascii==='\n'?2:1; // IDE.COM stores Enter as DOS CRLF.
   if(bytes>maxBytes)throw new Error(`Text překračuje limit editoru (${maxBytes} bajtů včetně CRLF). Rozděl jej na menší soubory.`);
   const code=ascii==='\n'?13:ascii.charCodeAt(0);
   keys.push(((SCANS[ascii]||0)<<8)|code);index++;
  }
  if(!keys.length)throw new Error('Textové pole je prázdné.');
  return {keys,folded,bytes,characters:keys.length};
 }
 root.MDPC_PASTE={prepare};
})(typeof window!=='undefined'?window:globalThis);
