/* v0.8.2: layout only. Never touches guest CPU/disk/VRAM to open drawers. */
(function(){'use strict';
const $=s=>document.querySelector(s),main=$('.container');if(!main||!window.MDUX)return;
const video=$('#video-shell'),canvas=$('#video-screen'),panel=video?.closest('section.panel');
if(!video||!canvas||!panel)return;
main.classList.add('ux-pc-lab');panel.classList.add('ux-monitor-panel');
// Monitor viewport is independent of the hardware's framebuffer dimensions.
const viewport=document.createElement('div');viewport.className='ux-screen-viewport';video.parentNode.insertBefore(viewport,video);viewport.append(video);
const toolbar=document.createElement('div');toolbar.className='ux-commandbar';toolbar.setAttribute('aria-label','Pracovní panel PC laboratoře');
toolbar.innerHTML='<span class="ux-kicker">PC Workbench</span><button class="ux-open" type="button" data-ux-target="disks">▣ Diskety</button><button class="ux-open" type="button" data-ux-target="tests">⌁ Diagnostika</button><button class="ux-open" type="button" data-ux-target="state">▤ Snapshot</button><button class="ux-open" type="button" data-ux-target="learn">? Výuka</button><span class="ux-spacer"></span><span class="ux-kicker" id="ux-live-mode">XT · HGC 1×</span>';
main.insertBefore(toolbar,panel);
const bar=main.querySelector(':scope > .actions');const diagnostic=document.createElement('div');diagnostic.className='ux-diagnostics-tools';
for(const id of ['video-text-demo','video-cga-demo','video-herc-demo','boot','pm','cpu-demo','alu-demo','idt-demo','de-demo','br-demo','bcd-demo','irq10-demo','pit','selftest']){
 const b=document.getElementById(id);if(b)diagnostic.append(b);
}
// No control is destroyed. The original event listeners continue to work on moved buttons.
const makeDrawer=(id,title)=>{const d=document.createElement('section');d.className='ux-drawer';d.id='ux-pc-'+id;d.dataset.uxId=id;d.setAttribute('aria-label',title);
 d.innerHTML='<div class="ux-drawer-header"><h2>'+title+'</h2><button class="ux-close" type="button" aria-label="Zavřít panel">×</button></div><div class="ux-drawer-body"></div>';
 document.body.append(d);return d.querySelector('.ux-drawer-body');};
const disks=makeDrawer('disks','Diskety A: / B:');disks.append($('#pc-floppy'));
const tests=makeDrawer('tests','CPU Test Lab');tests.append(diagnostic);
const videoDemo=document.querySelector('section[aria-label="Izolovaná video diagnostika"]');if(videoDemo)tests.append(videoDemo);
const layout=main.querySelector('.layout');if(layout)tests.append(layout);
const state=makeDrawer('state','Snapshoty a stav');state.append($('#pc-persistence'));
const learn=makeDrawer('learn','První assembler — DEBUG');const about=main.querySelector('.notice');if(about){about.classList.add('ux-about-note');learn.append(about);}learn.insertAdjacentHTML('beforeend',`<div class="ux-help"><p><strong>FreeDOS běží v hlavním monitoru.</strong> Klikni na obrazovku, napiš příkaz a stiskni Enter. Tento panel nikdy neresetuje CPU.</p><ol><li>Na <code>A:\\&gt;</code> napiš <span class="ux-kbd">DEBUG</span> a Enter.</li><li><span class="ux-kbd">R</span> vypíše registry procesoru.</li><li><span class="ux-kbd">A 100</span> otevře malý assembler.</li><li>Napiš instrukce <code>MOV AH,02</code>, <code>MOV DL,41</code>, <code>INT 21</code>, <code>INT 20</code>; prázdný Enter dokončí zápis.</li><li><span class="ux-kbd">U 100</span> rozebere instrukce, <span class="ux-kbd">G=100</span> program spustí, <span class="ux-kbd">Q</span> se vrátí do DOSu.</li></ol><p class="ux-note">DEBUG je reálný DOS program; úspěch ověřuje DOS a CPU, ne kliknutí na kartu.</p><p class="ux-note">Historicky má MDA text 720×350, HGC grafika 720×348. Monitor neprovádí škálování obsahu na jiný počet pixelů.</p></div>`);
// Display selector: pixel-perfect uses native CSS pixel counts, independent of device pixel ratio.
const controls=document.createElement('div');controls.className='ux-display-controls';controls.innerHTML='<label for="ux-display-size">Velikost monitoru</label><select id="ux-display-size"><option value="auto">Auto (podle režimu)</option><option value="1">1× pixels</option><option value="2">2× pixels</option><option value="fit">Přizpůsobit oknu</option></select><label for="ux-crt">CRT</label><select id="ux-crt"><option value="on">Jemný glow</option><option value="off">Bez efektu</option></select><label for="ux-phosphor">Fosfor</label><select id="ux-phosphor"><option value="amber">Jantarový</option><option value="green">Zelený</option><option value="white">Bílý</option></select><span id="ux-video-dimensions" class="muted"></span>';
panel.insertBefore(controls,viewport);
const preset=$('#ux-display-size'),crt=$('#ux-crt'),phosphor=$('#ux-phosphor'),displayState=$('#ux-video-dimensions');
function applyScale(){const v=window.__mdPCUniversal?.machine?.video;if(!v)return;
 const [w,h]=v.dimensions,isHerc=v.adapter==='hercules';const automatic=isHerc?1:(v.isGraphics&&v.mode!==6?2:1);
 const value=preset.value;let scale=value==='auto'?automatic:value==='fit'?Math.min(1,Math.max(.2,(viewport.clientWidth-20)/(w+12))):Number(value);
 if(value==='auto' && viewport.clientWidth<w*scale+14)scale=Math.min(scale,Math.max(.2,(viewport.clientWidth-20)/(w+12)));
 const cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));
 canvas.style.width=cw+'px';canvas.style.height=ch+'px';canvas.style.maxWidth='none';video.style.width=cw+'px';video.style.maxWidth='none';
 video.classList.toggle('ux-no-crt',crt.value==='off');video.dataset.phosphor=isHerc?phosphor.value:'cga';
 displayState.textContent=`${w}×${h} → ${cw}×${ch} CSS px · ${value==='auto'?'AUTO':value.toUpperCase()}`;
 $('#ux-live-mode').textContent=`${window.__mdPCUniversal.machine.profile.toUpperCase()} · ${isHerc?'HGC':v.mode===6?'CGA HIGH':'CGA'} ${scale.toFixed(2)}×`;
}
const scaleObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>applyScale()):null;
scaleObserver?.observe(viewport);preset.addEventListener('change',applyScale);crt.addEventListener('change',applyScale);phosphor.addEventListener('change',applyScale);
// Redraw may reset inline styles in legacy renderers. Reapply without ever updating VRAM.
const mutation=typeof MutationObserver!=='undefined'?new MutationObserver(()=>{if(preset&&canvas)applyScale();}):null;
// Poll small, cheap mode/adapter tuple. No framebuffer copy, no CPU state changes.
let previous='';setInterval(()=>{const v=window.__mdPCUniversal?.machine?.video;if(!v)return;const sig=[v.adapter,v.mode,v.modeControl&2,viewport.clientWidth,preset.value,crt.value,phosphor.value].join(':');if(previous!==sig){previous=sig;applyScale();}},220);
window.addEventListener('resize',applyScale);
const drawers=window.MDUX.install({onClose:()=>{if(!document.activeElement?.matches('input,textarea,select'))$('#video-shell')?.focus({preventScroll:true});}});
window.__mdUXPC={drawers,applyScale,get live(){return window.__mdPCUniversal?.machine;}};
applyScale();
})();
