/* MD.js Reborn Reader F4.5 — vanilla ES6 document toolbar and typo-tolerant search. */
(function(root){
  'use strict';
  const previous=new WeakMap();
  function control(label,title,fn){
    const b=document.createElement('button');b.type='button';b.className='md-reader-button';
    b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.addEventListener('click',fn);return b;
  }
  function enhance(container){
    if(!container||!container.insertBefore||!container.classList)return;
    if(previous.has(container))previous.get(container)();
    container.classList.add('md-root');
    let theme=container.dataset.mdTheme==='dark'?'dark':'light';
    let scale=Number(container.dataset.mdScale);
    if(!Number.isFinite(scale)||scale<.8||scale>1.6)scale=1;
    let wide=container.dataset.mdWide==='true';
    const bar=document.createElement('div');bar.className='md-reader-toolbar';
    bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Ovládání dokumentu');
    const name=document.createElement('span');name.className='md-reader-brand';name.textContent='MD.js · Reader';bar.appendChild(name);
    const controls=document.createElement('div');controls.className='md-reader-controls';
    const themeButton=control('','Přepnout tmavý / světlý vzhled',()=>{theme=theme==='light'?'dark':'light';apply();});
    controls.appendChild(themeButton);
    controls.appendChild(control('A−','Zmenšit text',()=>{scale=Math.max(.8,Math.round((scale-.1)*10)/10);apply();}));
    const scaleLabel=document.createElement('span');scaleLabel.className='md-reader-scale';scaleLabel.setAttribute('aria-live','polite');
    controls.appendChild(scaleLabel);
    controls.appendChild(control('A+','Zvětšit text',()=>{scale=Math.min(1.6,Math.round((scale+.1)*10)/10);apply();}));
    controls.appendChild(control('↺','Výchozí velikost',()=>{scale=1;apply();}));
    const wideButton=control('','Přepnout šířku článku',()=>{wide=!wide;apply();});controls.appendChild(wideButton);
    let fallbackFull=false;
    const fullButton=control('⛶ Celá obrazovka','Celá obrazovka',async()=>{
      if(document.fullscreenElement===container){
        if(document.exitFullscreen)await document.exitFullscreen().catch(()=>{});
      }else if(fallbackFull){fallbackFull=false;container.dataset.mdFullscreen='false';}
      else if(container.requestFullscreen){
        try{await container.requestFullscreen();}catch(_){fallbackFull=true;container.dataset.mdFullscreen='fallback';}
      }else{fallbackFull=true;container.dataset.mdFullscreen='fallback';}
      fullState();
    });controls.appendChild(fullButton);
    controls.appendChild(control('⎙ Tisk','Tisknout dokument',()=>{
      if(root.print)root.print();
    }));
    function fullState(){
      const full=document.fullscreenElement===container||fallbackFull;
      fullButton.textContent=full?'⛶ Zavřít fullscreen':'⛶ Celá obrazovka';
      fullButton.setAttribute('aria-pressed',String(full));
    }
    function apply(){
      container.dataset.mdTheme=theme;container.dataset.mdScale=String(scale);container.dataset.mdWide=String(wide);
      container.style.setProperty('--md-font-scale',String(scale));
      themeButton.textContent=theme==='dark'?'☀ Světlý':'☾ Tmavý';
      themeButton.setAttribute('aria-pressed',String(theme==='dark'));
      scaleLabel.textContent=`${Math.round(scale*100)} %`;
      wideButton.textContent=wide?'Úzký text':'Široký text';
    }
    bar.appendChild(controls);container.insertBefore(bar,container.firstChild);
    const heads=Array.from(container.querySelectorAll('h1, h2, h3')).slice(0,100);
    if(heads.length>1){
      const outline=document.createElement('details');outline.className='md-reader-outline';
      const summary=document.createElement('summary');summary.textContent=`Obsah dokumentu (${heads.length})`;outline.appendChild(summary);
      const list=document.createElement('ol');
      heads.forEach(h=>{
        const li=document.createElement('li');li.className=`md-reader-level-${h.tagName.toLowerCase()}`;
        li.appendChild(control(h.textContent.slice(0,100),'Přejít na '+h.textContent.slice(0,100),()=>{
          h.scrollIntoView({behavior:'auto',block:'start'});h.tabIndex=-1;h.focus({preventScroll:true});
        }));list.appendChild(li);
      });outline.appendChild(list);container.insertBefore(outline,bar.nextSibling);
    }
    let focusSearchHandler=null, cancelPendingSearch=null;
    const docux=root.MDDocUX;
    if(docux&&docux.searchIndex&&docux.queryIndex){
      const index=docux.searchIndex(container); // once per mount, never rewrites document text
      const group=document.createElement('div');group.className='md-reader-search';
      const field=document.createElement('input');field.type='search';field.maxLength=100;
      field.placeholder='Hledat (toleruje 1–2 překlepy)';field.setAttribute('aria-label','Hledat v dokumentu');
      const stat=document.createElement('span');stat.className='md-search-status';stat.setAttribute('role','status');
      const prev=control('↑','Předchozí výsledek',()=>navigate(-1));
      const next=control('↓','Další výsledek',()=>navigate(1));
      group.appendChild(field);group.appendChild(prev);group.appendChild(next);group.appendChild(stat);
      controls.appendChild(group);
      const results=document.createElement('ol');results.className='md-search-results';results.hidden=true;
      bar.insertAdjacentElement('afterend',results);
      let matched=[],pos=-1,timer=null,highlight=null;
      cancelPendingSearch=()=>{if(timer!==null)clearTimeout(timer);};
      function clearHighlight(){if(highlight){highlight.classList.remove('md-search-active');highlight=null;}}
      function jump(at){if(!matched.length)return;clearHighlight();pos=(at+matched.length)%matched.length;
        highlight=matched[pos].node;highlight.classList.add('md-search-active');
        let ancestor=highlight.closest('details');
        while(ancestor&&container.contains(ancestor)){
          ancestor.open=true;ancestor=ancestor.parentElement&&ancestor.parentElement.closest('details');
        }
        // Clicking the result navigates but never modifies or injects document text.
        highlight.scrollIntoView({behavior:'auto',block:'center'});
        stat.textContent=`${pos+1}/${matched.length} výsledků`;
      }
      function navigate(delta){if(matched.length)jump(pos+delta);}
      function run(){
        clearHighlight();matched=docux.queryIndex(index,field.value,30);pos=-1;
        results.replaceChildren();results.hidden=!matched.length;
        if(!field.value.trim()){stat.textContent='';return;}
        stat.textContent=matched.length?`${matched.length}${matched.length===30?'+':''} shod`:'Nenalezeno';
        matched.forEach((hit,i)=>{
          const li=document.createElement('li');const b=document.createElement('button');b.type='button';
          b.textContent=hit.text.replace(/\s+/g,' ').slice(0,125);b.title='Přejít na výsledek';
          b.addEventListener('click',()=>jump(i));li.appendChild(b);results.appendChild(li);
        });
      }
      field.addEventListener('input',()=>{if(timer!==null)clearTimeout(timer);timer=setTimeout(()=>{timer=null;run();},110);});
      field.addEventListener('keydown',e=>{
        if(e.key==='Enter'){e.preventDefault();navigate(e.shiftKey?-1:1);}
        if(e.key==='Escape'){field.value='';run();results.hidden=true;}
      });
      const focusSearch=e=>{
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
          if(e.target.closest('textarea,[contenteditable=true]'))return;
          e.preventDefault();field.focus();field.select();
        }
      };
      container.addEventListener('keydown',focusSearch);focusSearchHandler=focusSearch;
    }
    let opened=[];
    const beforePrint=()=>{
      opened=Array.from(container.querySelectorAll('details')).map(el=>[el,el.open]);
      opened.forEach(pair=>{pair[0].open=true;});
    };
    const afterPrint=()=>{opened.forEach(pair=>{pair[0].open=pair[1];});opened=[];};
    const fullChange=()=>fullState();
    const esc=e=>{if(e.key==='Escape'&&fallbackFull){fallbackFull=false;container.dataset.mdFullscreen='false';fullState();}};
    if(root.addEventListener){root.addEventListener('beforeprint',beforePrint);root.addEventListener('afterprint',afterPrint);}
    document.addEventListener('fullscreenchange',fullChange);
    container.addEventListener('keydown',esc);
    previous.set(container,()=>{
      if(root.removeEventListener){root.removeEventListener('beforeprint',beforePrint);root.removeEventListener('afterprint',afterPrint);}
      document.removeEventListener('fullscreenchange',fullChange);
      container.removeEventListener('keydown',esc);
      if(focusSearchHandler)container.removeEventListener('keydown',focusSearchHandler);
      if(cancelPendingSearch)cancelPendingSearch();
    });
    apply();fullState();
  }
  root.MDReader=Object.freeze({enhance});
  if(typeof module==='object'&&module.exports)module.exports=root.MDReader;
})(typeof window!=='undefined'?window:(typeof global!=='undefined'?global:this));
