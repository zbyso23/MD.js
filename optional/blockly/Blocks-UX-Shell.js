/* Blocks Lite v0.8.2 studio shell, no external Blockly dependency. */
(function(){'use strict';
const m=document.querySelector('body>main'),workspace=m?.querySelector('.workspace'),right=m?.querySelector('.right');
if(!m||!workspace||!right||!window.MDUX)return;
const nav=document.createElement('div');nav.className='ux-commandbar';nav.innerHTML='<span class="ux-kicker">Studio · Native JS</span><button class="ux-open" type="button" data-ux-target="code">{ } Kód</button><button class="ux-open" type="button" data-ux-target="board">⚡ Simulátor</button><button class="ux-open" type="button" data-ux-target="guide">? Lekce</button><button id="ux-block-toggle-tools" type="button">◧ Toolbox</button><span class="ux-spacer"></span><span class="ux-kicker">Přetahování · Undo/Redo · Snap</span>';
m.insertBefore(nav,workspace);
const drawer=(id,title,child)=>{const d=document.createElement('section');d.className='ux-drawer ux-block-drawer';d.id='ux-block-'+id;d.dataset.uxId=id;d.innerHTML='<div class="ux-drawer-header"><h2>'+title+'</h2><button class="ux-close" type="button" aria-label="Zavřít panel">×</button></div><div class="ux-drawer-body"></div>';if(child)d.querySelector('.ux-drawer-body').append(child);document.body.append(d);return d;};
const codePanel=right.querySelector('.code-panel'),boardPanel=right.querySelector('.sim-panel');
drawer('code','Generovaný kód',codePanel);drawer('board','Virtuální Arduino',boardPanel);
const guide=drawer('guide','První lekce — blikající LED');guide.querySelector('.ux-drawer-body').innerHTML='<div class="ux-help"><p>Všechny bloky jsou naše vlastní. Žádný externí editor se nenačítá.</p><ol><li>V levém toolboxu otevři <b>Hardware</b>.</li><li>Chyť blok za přetahovací úchyt ⠿ a přetáhni jej na světlý slot.</li><li>Do smyčky <b>Opakuj</b> vlož blok HIGH a Čekej.</li><li>Otevři <b>Simulátor</b> a spusť tři cykly.</li><li>V <b>Kód</b> zkontroluj generovaný JavaScript / Python / Arduino C++.</li></ol><p>Undo/Redo vrací změny v programu; Export JSON jej uchová bez serveru.</p></div>';
right.remove();
const toggle=document.getElementById('ux-block-toggle-tools');toggle.setAttribute('aria-pressed','true');toggle.addEventListener('click',()=>{
 const hide=workspace.classList.toggle('ux-block-toolbox-hidden');toggle.setAttribute('aria-pressed',String(!hide));toggle.textContent=hide?'◧ Zobraz toolbox':'◧ Toolbox';
});
const drawers=window.MDUX.install({onClose:()=>document.getElementById('blocks')?.focus?.({preventScroll:true})});
window.__mdUXBlocks={drawers};
})();
