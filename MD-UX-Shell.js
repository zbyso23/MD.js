/* MD.js Ultra UX drawers - native DOM, no dependencies, no bundling. */
(function(root){'use strict';
function install(opts){
 const triggers=Array.from((opts.container||document).querySelectorAll('[data-ux-target]'));
 const drawers=Array.from((opts.container||document).querySelectorAll('.ux-drawer[data-ux-id]'));
 if(!drawers.length)return {open(){},close(){},active:null};
 const shade=document.createElement('div');shade.className='ux-shade';shade.setAttribute('aria-hidden','true');(opts.mountShade||document.body).append(shade);
 let active=null,returnFocus=null;
 function close(restore=true){if(!active)return;const prior=active;active=null;prior.classList.remove('ux-active');prior.setAttribute('aria-hidden','true');prior.inert=true;shade.classList.remove('ux-active');
   for(const btn of triggers)btn.setAttribute('aria-expanded','false');if(restore&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;
   if(typeof opts.onClose==='function')opts.onClose(prior.dataset.uxId);
 }
 function open(id,source){const target=drawers.find(d=>d.dataset.uxId===id);if(!target)return false;
   if(active===target){close();return false;}if(active)close(false);active=target;returnFocus=source||document.activeElement;
   target.inert=false;target.setAttribute('aria-hidden','false');target.classList.add('ux-active');shade.classList.add('ux-active');
   for(const btn of triggers)btn.setAttribute('aria-expanded',String(btn.dataset.uxTarget===id));
   target.querySelector('.ux-close')?.focus({preventScroll:true});if(typeof opts.onOpen==='function')opts.onOpen(id);return true;
 }
 for(const d of drawers){d.setAttribute('aria-hidden','true');d.inert=true;
   let closeBtn=d.querySelector('.ux-close');if(!closeBtn){closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.className='ux-close';closeBtn.textContent='×';closeBtn.setAttribute('aria-label','Zavřít panel');d.querySelector('.ux-drawer-header')?.append(closeBtn);}
   closeBtn.addEventListener('click',()=>close());
 }
 for(const btn of triggers){btn.setAttribute('aria-controls',drawers.find(d=>d.dataset.uxId===btn.dataset.uxTarget)?.id||'');btn.setAttribute('aria-expanded','false');btn.addEventListener('click',()=>open(btn.dataset.uxTarget,btn));}
 shade.addEventListener('click',()=>close());
 document.addEventListener('keydown',e=>{if(!active)return;
   if(e.key==='Escape'){e.preventDefault();close();return;}
   if(e.key!=='Tab')return;
   const items=Array.from(active.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(x=>x.getClientRects().length);
   if(!items.length)return;const first=items[0],last=items[items.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 },true);
 return {open,close,get active(){return active?.dataset.uxId||null;}};
}
root.MDUX={install};
})(typeof window!=='undefined'?window:globalThis);
