/* MD.js Ultra Phase 4O - F2 encyclopaedia. No external deps, no fetch/eval/storage. */
(function(root){'use strict';
 const source=root.MDEncyclopediaChapters;
 const supports=typeof document!=='undefined'&&Array.isArray(source)&&typeof root.MD==='function';
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('cs').replace(/\s+/g,' ').trim();
 function find(list,section,category,term){
   const tokens=norm(term).split(' ').filter(Boolean);
   const near=(a,b)=>{if(Math.abs(a.length-b.length)>1)return false;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}return prev[b.length]<=1;};
   return list.filter(c=>c.section===section&&(category==='Vše'||c.category===category)&&tokens.every(q=>c._search.includes(q)||(q.length>=4&&c._keywords.some(w=>Math.abs(w.length-q.length)<=1&&near(w,q)))));
 }
 function mount(){
   if(!supports||document.getElementById('md-ency-overlay'))return null;
   const lessons=source.map(c=>Object.assign({},c,{_search:norm([c.title,c.title_en,c.summary,c.summary_en,c.body,c.body_en,c.category,c.section].join(' ')),_keywords:norm([c.title,c.title_en,c.category].join(' ')).split(/[^a-z0-9]+/).filter(Boolean)}));
   let section='Markdown',category='Vše',current=null,previous=null,history=[],historyPos=-1,lang='cs';
   const L=(cs,en)=>lang==='cs'?cs:en;
   const titleOf=c=>lang==='en'?(c.title_en||c.title):c.title;
   const summaryOf=c=>lang==='en'?(c.summary_en||c.summary):c.summary;
   const bodyOf=c=>lang==='en'?(c.body_en||c.body):c.body;
   const button=(text,cls='',title='')=>{const e=document.createElement('button');e.type='button';e.textContent=text;if(cls)e.className=cls;if(title)e.title=title;return e;};
   const div=(cls,tag='div')=>{const e=document.createElement(tag);e.className=cls;return e;};
   const trigger=button('📖 Encyklopedie · F2','md-ency-trigger','Otevřít encyklopedii MD.js Ultra (F2)');
   trigger.id='md-ency-trigger';trigger.setAttribute('aria-keyshortcuts','F2');document.body.appendChild(trigger);
   const overlay=div('md-ency-overlay');overlay.id='md-ency-overlay';overlay.hidden=true;
   const dialog=div('md-ency-window');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','MD.js Ultra encyklopedie');overlay.appendChild(dialog);
   const head=div('md-ency-head');const heading=div('', 'h2');heading.textContent='📚 MD.js Ultra · Encyklopedie';head.appendChild(heading);
   const note=div('', 'p');note.textContent='Offline · Markdown + Assembler · F2 otevřít · Esc zavřít';head.appendChild(note);
   const stretch=div('spacer');head.appendChild(stretch);
   const language=button('CS / EN','md-ency-language','Switch language / Přepnout jazyk');language.setAttribute('aria-label','Language / Jazyk');head.appendChild(language);
   const back=button('←','', 'Předchozí článek'),forward=button('→','','Další článek'),close=button('✕ Zavřít');close.setAttribute('aria-label','Zavřít encyklopedii');
   head.append(back,forward,close);dialog.appendChild(head);
   const tabs=div('md-ency-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Hlavní sekce');
   const mdButton=button('📝 Markdown'),asmButton=button('⌨ Assembler');for(const b of [mdButton,asmButton]){b.setAttribute('role','tab');tabs.appendChild(b)}
   const search=document.createElement('input');search.className='md-ency-search';search.id='md-ency-search';search.type='search';search.placeholder='Hledat název, instrukci, příklad…';search.setAttribute('aria-label','Vyhledat v aktuální sekci');tabs.appendChild(search);
   const count=div('md-ency-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');tabs.appendChild(count);dialog.appendChild(tabs);
   const main=div('md-ency-main'),categories=div('md-ency-categories'),results=div('md-ency-results'),reader=div('md-ency-reader');
   categories.setAttribute('aria-label','Kategorie');results.setAttribute('aria-label','Výsledky hledání');reader.setAttribute('aria-label','Článek encyklopedie');main.append(categories,results,reader);dialog.appendChild(main);document.body.appendChild(overlay);
   const renderer=new root.MD({mode:'extended'});
   const cleanText=(v)=>document.createTextNode(v);
   let lastFocus=null;
   function isEditing(node){return !!(node&&node.closest&&node.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]'));}
   function localize(){
     heading.textContent=L('📚 MD.js Ultra · Encyklopedie','📚 MD.js Ultra · Encyclopedia');
     note.textContent=L('Offline · Markdown + Assembler · F2 otevřít · Esc zavřít','Offline · Markdown + Assembler · F2 open · Esc close');
     search.placeholder=L('Hledat v CS i EN…','Search CS and EN…');
     close.textContent=L('✕ Zavřít','✕ Close');
     language.textContent=lang.toUpperCase()+' ▾';
     language.title=L('Přepnout na English','Switch to čeština');
   }
   language.addEventListener('click',()=>{lang=lang==='cs'?'en':'cs';localize();render();});
   function categoriesRender(){
     categories.replaceChildren();const label=div('', 'h3');label.textContent=L('Kategorie','Categories');categories.appendChild(label);
     const names=['Vše',...new Set(lessons.filter(c=>c.section===section).map(c=>c.category))];
     for(const name of names){const b=button(name,'md-ency-cat');b.setAttribute('aria-pressed',String(category===name));b.addEventListener('click',()=>{category=name;render(true);search.focus();});categories.appendChild(b);}
   }
   function renderResults(){
     results.replaceChildren();const label=div('', 'h3');label.textContent=L('Články','Articles');results.appendChild(label);
     const matches=find(lessons,section,category,search.value);count.textContent=matches.length+L(' článků',' articles');
     for(const c of matches){const b=button(titleOf(c),'md-ency-hit');b.setAttribute('aria-current',String(current===c.id));const desc=div('','small');desc.textContent=c.category+' · '+summaryOf(c);b.appendChild(desc);b.addEventListener('click',()=>select(c.id));results.appendChild(b);}
     if(!matches.length){const empty=div('md-ency-empty');empty.textContent=L('Žádné výsledky. Zkus kratší výraz nebo kategorii Vše.','No results. Try fewer terms or the All category.');results.appendChild(empty);}
     return matches;
   }
   function renderReader(){
     reader.replaceChildren();const c=lessons.find(x=>x.id===current);
     if(!c){reader.textContent=L('Zvol článek ze seznamu.','Select an article.');return;}
     const top=div('md-ency-reader-top');const status=div('','strong');status.textContent=c.category+' · '+(c.level==='tested'?L('Ověřený guest příklad','Tested guest example'):L('Výuka / reference','Guide / reference'));top.appendChild(status);top.appendChild(div('spacer'));
     if(c.source&&c.filename){const download=button('↓ '+c.filename);download.addEventListener('click',()=>{
       const url=URL.createObjectURL(new Blob([c.source],{type:'text/plain;charset=utf-8'}));
       const a=document.createElement('a');a.href=url;const stamp=new Date();const ts=stamp.getFullYear()+String(stamp.getMonth()+1).padStart(2,'0')+String(stamp.getDate()).padStart(2,'0')+String(stamp.getHours()).padStart(2,'0')+String(stamp.getMinutes()).padStart(2,'0')+String(stamp.getSeconds()).padStart(2,'0');a.download=c.filename.replace(/(\.[^.]+)?$/,('_'+ts+'$1'));reader.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
     });top.appendChild(download);}
     const print=button(L('🖨 Tisk','🖨 Print'));print.addEventListener('click',()=>root.print());top.appendChild(print);reader.appendChild(top);
     const article=div('md-ency-article');reader.appendChild(article);renderer.mount(article,bodyOf(c));
     reader.scrollTop=0;
   }
   function select(id,track=true){const c=lessons.find(c=>c.id===id);if(!c)return;
     if(c.section!==section){section=c.section;category='Vše';search.value='';}
     if(track&&history[historyPos]!==id){history=history.slice(0,historyPos+1);history.push(id);historyPos=history.length-1;}
     current=id;categoriesRender();renderResults();renderReader();mdButton.setAttribute('aria-selected',String(section==='Markdown'));asmButton.setAttribute('aria-selected',String(section==='Assembler'));back.disabled=historyPos<=0;forward.disabled=historyPos>=history.length-1;
   }
   function render(choose=false){const matches=renderResults();if(choose||!matches.some(c=>c.id===current)){if(matches.length)select(matches[0].id);else{current=null;reader.replaceChildren(cleanText(L('Žádný článek ve výsledcích.','No article in results.')));}}
     categoriesRender();mdButton.setAttribute('aria-selected',String(section==='Markdown'));asmButton.setAttribute('aria-selected',String(section==='Assembler'));
   }
   function chooseSection(v){section=v;category='Vše';search.value='';current=null;render(true);search.focus();}
   mdButton.addEventListener('click',()=>chooseSection('Markdown'));asmButton.addEventListener('click',()=>chooseSection('Assembler'));
   search.addEventListener('input',()=>render());
   back.addEventListener('click',()=>{if(historyPos>0)select(history[--historyPos],false);});forward.addEventListener('click',()=>{if(historyPos<history.length-1)select(history[++historyPos],false);});
   function open(){if(!overlay.hidden)return;lastFocus=document.activeElement;overlay.hidden=false;trigger.setAttribute('aria-expanded','true');if(!current)select(lessons[0].id);render();search.focus({preventScroll:true});}
   function hide(){if(overlay.hidden)return;overlay.hidden=true;trigger.setAttribute('aria-expanded','false');if(lastFocus&&lastFocus.isConnected&&typeof lastFocus.focus==='function')lastFocus.focus({preventScroll:true});lastFocus=null;}
   close.addEventListener('click',hide);trigger.addEventListener('click',()=>overlay.hidden?open():hide());overlay.addEventListener('click',e=>{if(e.target===overlay)hide();});
   document.addEventListener('keydown',e=>{
     if(e.key==='F2'&&!e.ctrlKey&&!e.altKey&&!e.metaKey){
       // Editing a native host field should keep the user's keyboard shortcuts.
       if(overlay.hidden&&isEditing(e.target))return;
       e.preventDefault();e.stopImmediatePropagation();overlay.hidden?open():hide();return;
     }
     if(overlay.hidden)return;
     if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();hide();return;}
     if(e.key!=='Tab')return;
     const focusable=Array.from(dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]')).filter(x=>x.getClientRects().length);
     if(!focusable.length)return;
     const first=focusable[0],last=focusable[focusable.length-1];
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
   },true);
   document.addEventListener('fullscreenchange',()=>{
     // Fullscreen API hides elements outside its top layer: move our controls inside.
     const parent=document.fullscreenElement||document.body;
     parent.append(trigger,overlay);
   });
   localize();select(lessons[0].id);
   return {open,close:hide,select,get visible(){return !overlay.hidden;},get section(){return section;},get count(){return lessons.length;}};
 }
 function ready(){root.MDEncyclopedia=mount();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})(typeof window!=='undefined'?window:globalThis);
