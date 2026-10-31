/* ZX user-facing layout (emulated keyboard/ULA unchanged). */
(function(){'use strict';
const host=document.getElementById('zx-here'),core=window.__zxWidget;if(!host||!core||!window.MDUX)return;
const shell=core.shell,work=shell.querySelector('.mdzx-workbench');if(!shell||!work)return;
const nav=document.createElement('div');nav.className='ux-commandbar';nav.innerHTML='<span class="ux-kicker">ZX 48K · OpenSE BASIC</span><button type="button" class="ux-open" id="zx-ux-keyboard">⌨ Klávesnice</button><button type="button" class="ux-open" data-ux-target="tools">▣ Kazety / Vývoj</button><button type="button" class="ux-open" data-ux-target="guide">? Návod</button><span class="ux-spacer"></span><span class="ux-kicker">BASIC · TAP · ASM</span>';
host.prepend(nav);
work.classList.add('ux-drawer');work.id='ux-zx-tools';work.dataset.uxId='tools';work.setAttribute('aria-label','Kazety, debugger a editor Z80');
const head=document.createElement('div');head.className='ux-drawer-header';head.innerHTML='<h2>Kazety, debugger a Z80</h2><button type="button" class="ux-close" aria-label="Zavřít panel">×</button>';
const body=document.createElement('div');body.className='ux-drawer-body';while(work.firstChild)body.append(work.firstChild);work.append(head,body);
const guide=document.createElement('section');guide.className='ux-drawer';guide.id='ux-zx-guide';guide.dataset.uxId='guide';guide.innerHTML='<div class="ux-drawer-header"><h2>ZX — první BASIC program</h2><button type="button" class="ux-close" aria-label="Zavřít panel">×</button></div><div class="ux-drawer-body ux-help"><p>Stiskni <b>Start ZX</b>, pak klikni na obrazovku. Virtuální klávesnice použije stejnou ZX matici jako fyzická.</p><ol><li>Na prázdném řádku s volitelnými Sinclair K zkratkami <b>J</b> zadá <code>LOAD</code> přes stisky kláves.</li><li>Napiš <code>PRINT "HELLO"</code> a Enter.</li><li><b>Backspace</b> odpovídá CAPS SHIFT + 0 (DELETE).</li><li>Pro TAP otevři Kazety, vlož <code>.tap</code> a na ZX napiš <code>LOAD ""</code>.</li><li>Pro uložení vyber Export JSON nebo SNA ve vývojovém panelu.</li></ol><p class="ux-note">OpenSE BASIC není původní Sinclair ROM: tradiční K-tokenové zkratky jsou volitelné makro stisky. Browser si některé klávesové zkratky může vyhradit.</p></div>';
shell.append(guide);
const kbButton=document.getElementById('zx-ux-keyboard');kbButton.addEventListener('click',()=>{
 const toggle=Array.from(shell.querySelectorAll('.mdzx-foot button')).find(b=>b.textContent.includes('ZX klávesnice'));if(toggle)toggle.click();
 kbButton.setAttribute('aria-expanded',String(!core.keyboardPanel.hidden));
});kbButton.setAttribute('aria-expanded','false');
const controller=window.MDUX.install({container:document,onClose:()=>shell.querySelector('.mdzx-canvas')?.focus({preventScroll:true}),mountShade:shell});
window.__mdUXZX={controller};
})();
