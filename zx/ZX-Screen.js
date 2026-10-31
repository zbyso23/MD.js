/* MD.js Ultra: native ZX Spectrum 48K SCR screen decoder and preview.
 * Original implementation, ES6, no imports, no auto-run, no HTML injection.
 */
(function(root){
'use strict';
const SCR_BYTES=6912;
const WIDTH=256,HEIGHT=192;
const PALETTE=[
 [0,0,0],[0,0,192],[192,0,0],[192,0,192],
 [0,192,0],[0,192,192],[192,192,0],[192,192,192],
 [0,0,0],[0,0,255],[255,0,0],[255,0,255],
 [0,255,0],[0,255,255],[255,255,0],[255,255,255]
];
function assertSCR(value){
 const bytes=value instanceof Uint8Array?value:new Uint8Array(value);
 if(bytes.byteLength!==SCR_BYTES)throw new RangeError('ZX SCR must be exactly 6912 bytes');
 return bytes;
}
function rgba(scr,flash){
 const data=assertSCR(scr),out=new Uint8ClampedArray(WIDTH*HEIGHT*4);
 for(let y=0;y<HEIGHT;y++){
   // Original ZX ULA interleaved bitmap addressing (NOT row-major).
   const bitmapBase=((y&0xC0)<<5)|((y&7)<<8)|((y&0x38)<<2);
   const attrBase=6144+(y>>3)*32;
   for(let xByte=0;xByte<32;xByte++){
     const bits=data[bitmapBase+xByte],attr=data[attrBase+xByte];
     const bright=(attr&64)?8:0,ink=PALETTE[bright+(attr&7)],paper=PALETTE[bright+((attr>>3)&7)];
     const invert=!!(flash&&(attr&128));
     for(let bit=0;bit<8;bit++){
       const selected=!!(bits&(0x80>>bit));
       const c=(selected!==invert)?ink:paper;
       const i=(y*WIDTH+xByte*8+bit)*4;
       out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];out[i+3]=255;
     }
   }
 }
 return out;
}
function draw(canvas,bytes,options){
 if(!canvas||typeof canvas.getContext!=='function')throw new TypeError('Canvas required');
 const scale=options&&options.scale||2;
 if(scale!==2&&scale!==4&&scale!=='fit')throw new RangeError('Allowed SCR scales: 2, 4, fit');
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('2D context unavailable');
 const out=rgba(bytes,!!(options&&options.flash));
 // Render exact native pixels at native resolution; CSS handles enlargement.
 canvas.width=WIDTH;canvas.height=HEIGHT;
 ctx.putImageData(new ImageData(out,WIDTH,HEIGHT),0,0);
 canvas.style.imageRendering='pixelated';
 canvas.style.width=scale==='fit'?'100%':(WIDTH*scale)+'px';
 canvas.style.maxWidth='100%';canvas.style.height='auto';
 return canvas;
}
function download(name,bytes,type){
 const blob=new Blob([bytes],{type:type||'application/octet-stream'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function mount(host,source,options){
 const bytes=Uint8Array.from(assertSCR(source));
 const section=document.createElement('section');section.className='mdzx-scr';
 const title=document.createElement('strong');title.textContent=(options&&options.name)||'ZX screen (.SCR)';
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','ZX Spectrum screen preview');
 const bar=document.createElement('div');bar.className='mdzx-scr-controls';
 let scale=2,flash=false;
 function repaint(){draw(canvas,bytes,{scale,flash});}
 function button(text,callback){const b=document.createElement('button');b.textContent=text;b.type='button';b.addEventListener('click',callback);bar.appendChild(b);return b;}
 button('2×',()=>{scale=2;repaint();});button('4×',()=>{scale=4;repaint();});
 button('Fit',()=>{scale='fit';repaint();});button('FLASH',()=>{flash=!flash;repaint();});
 button('Save SCR',()=>download('screen.scr',bytes));
 button('Save PNG',()=>canvas.toBlob(blob=>{if(blob)download('screen.png',blob,'image/png');},'image/png'));
 section.append(title,canvas,bar);host.appendChild(section);repaint();
 return {node:section,canvas,bytes,setFlash:v=>{flash=!!v;repaint();},destroy:()=>section.remove()};
}
const api=Object.freeze({WIDTH,HEIGHT,SCR_BYTES,assertSCR,rgba,draw,mount});
root.ZXScreenPreview=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
