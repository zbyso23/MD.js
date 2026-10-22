/* MD.js Reborn F4.5 — optional document controls. Vanilla JS, zero imports.
   All user-origin content goes through textContent or validated Markdown images. */
(function (root) {
  'use strict';
  let sequence = 0;
  const normalize = text => String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  const words = text => normalize(text).split(/[^a-z0-9\u00c0-\u024f\u0370-\u052f]+/).filter(word => word.length && word.length <= 64);
  function distance(a, b, limit = 2) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    let prev2 = null, prev = Array.from({length:b.length+1}, (_,j)=>j);
    for (let i=1; i<=a.length; i++) {
      const next = [i]; let rowMin = i;
      for (let j=1; j<=b.length; j++) {
        let score = Math.min(prev[j]+1, next[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
        if (prev2 && i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1]) score = Math.min(score, prev2[j-2]+1);
        next.push(score); rowMin = Math.min(rowMin,score);
      }
      if (rowMin > limit) return limit+1;
      prev2 = prev; prev = next;
    }
    return prev[b.length];
  }
  function scoreText(text, query) {
    const q = normalize(query).slice(0,100);
    if (!q) return Infinity;
    const n = normalize(text).slice(0,6000);
    if (n.includes(q)) return 0;
    const qwords = words(q).slice(0,6);
    if (!qwords.length) return Infinity;
    const tokens = Array.from(new Set(words(n)));
    let score = 0;
    for (const needle of qwords) {
      const limit = needle.length <= 2 ? 0 : needle.length <= 5 ? 1 : 2;
      let best = limit + 1;
      for (const token of tokens) {
        if (token === needle) { best=0; break; }
        if (needle.length >= 3 && token.includes(needle)) { best = Math.min(best, .3); continue; }
        if (Math.abs(token.length-needle.length) <= limit && token.length <= 48 && needle.length <= 48) {
          best = Math.min(best, distance(token,needle,limit));
        }
      }
      if (best > limit) return Infinity;
      score += best;
    }
    return score + 1;
  }
  function button(label, action, title = label) {
    const el = document.createElement('button'); el.type='button'; el.textContent=label;
    el.className='md-docux-button'; el.setAttribute('aria-label', title); el.title=title;
    el.addEventListener('click', action); return el;
  }
  function tooltip(label) { const el=document.createElement('span'); el.className='md-docux-status'; el.textContent=label; return el; }
  async function copyText(text) {
    if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
      try { await root.navigator.clipboard.writeText(text); return true; } catch (_) { /* fallback */ }
    }
    const area = document.createElement('textarea'); area.value=text; area.setAttribute('readonly','');
    area.style.position='fixed'; area.style.left='-10000px'; document.body.appendChild(area);
    area.select(); let ok=false;
    try { ok = document.execCommand('copy'); } catch (_) { /* no clipboard permission */ }
    area.remove(); return ok;
  }
  function activateTabs(pre) {
    const code = pre.querySelector('code'); if (!code) return false;
    const input=code.textContent;
    if (input.length > 120000) return false;
    const lines=input.split('\n'), tabs=[];
    let active=null;
    for (const line of lines) {
      const match=/^:::[ \t]*([a-z][a-z0-9+#_-]{0,23})(?:[ \t]*\|[ \t]*(.{1,50}))?[ \t]*$/i.exec(line);
      if (match) {
        if (tabs.length >= 12) return false;
        active={lang:match[1].toLowerCase(),label:(match[2]||match[1]).trim(),lines:[]}; tabs.push(active);
      } else if (active) active.lines.push(line);
      else if (line.trim()) return false;
    }
    if (tabs.length < 2 || tabs.some(tab=>tab.lines.join('\n').length>30000)) return false;
    const uid=`md-tabs-${++sequence}`;
    const frame=document.createElement('section'); frame.className='md-code-tabs';
    const nav=document.createElement('div'); nav.className='md-code-tablist'; nav.setAttribute('role','tablist');
    const panels=[]; const buttons=[];
    function select(index,focus=false) {
      buttons.forEach((b,j)=>{b.setAttribute('aria-selected',String(j===index)); b.tabIndex=j===index?0:-1; panels[j].hidden=j!==index;});
      if(focus) buttons[index].focus();
    }
    tabs.forEach((tab,i)=>{
      const b=button(tab.label,()=>select(i),'Zobrazit kód: '+tab.label);
      b.className='md-docux-button md-code-tab'; b.id=uid+'-tab-'+i;
      b.setAttribute('role','tab'); b.setAttribute('aria-controls',uid+'-panel-'+i);
      b.addEventListener('keydown',event=>{
        let next=null;
        if(event.key==='ArrowRight') next=(i+1)%tabs.length;
        if(event.key==='ArrowLeft') next=(i+tabs.length-1)%tabs.length;
        if(event.key==='Home') next=0;
        if(event.key==='End') next=tabs.length-1;
        if(next!==null){event.preventDefault();select(next,true);}
      });
      buttons.push(b); nav.appendChild(b);
      const panel=document.createElement('div'); panel.id=uid+'-panel-'+i;
      panel.className='md-code-tabpanel'; panel.dataset.mdLabel=tab.label; panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',b.id);
      const block=document.createElement('pre'); block.className='md-code md-code-syntax-lang-'+tab.lang;
      const content=document.createElement('code'); content.textContent=tab.lines.join('\n').replace(/\n$/,''); block.appendChild(content);
      panel.appendChild(block); panels.push(panel); frame.appendChild(panel);
    });
    frame.insertBefore(nav,frame.firstChild);
    pre.replaceWith(frame);select(0);return true;
  }
  function enhanceCodeSafe(container) {
    Array.from(container.querySelectorAll('pre[data-md-code-tabs]')).forEach(pre=>activateTabs(pre));
    Array.from(container.querySelectorAll('pre.md-code')).forEach(pre=>{
      if(pre.closest('figure.md-diagram, .md-code-frame')) return;
      const code=pre.querySelector('code'); if(!code)return;
      const parent=pre.parentNode;const next=pre.nextSibling;
      const source=code.textContent;
      const frame=document.createElement('div');frame.className='md-code-frame';
      const bar=document.createElement('div');bar.className='md-code-toolbar';
      const lang=(/md-code-syntax-lang-([a-z0-9_-]+)/.exec(pre.className)||[])[1]||'text';
      bar.appendChild(tooltip(lang.toUpperCase()));
      const status=tooltip('');status.setAttribute('role','status');
      bar.appendChild(button('Kopírovat',async()=>{status.textContent=await copyText(source)?'Zkopírováno':'Clipboard nedostupný';}));
      const rows=source.split('\n');
      let layout=null;
      if(rows.length>1&&rows.length<=2000){
        const toggle=button('# řádky',()=>{
          const on=!frame.classList.contains('md-lines-visible');frame.classList.toggle('md-lines-visible',on);
          toggle.setAttribute('aria-pressed',String(on));
        },'Čísla řádků');toggle.setAttribute('aria-pressed','false');bar.appendChild(toggle);
        layout=document.createElement('div');layout.className='md-code-layout';
        const gutter=document.createElement('div');gutter.className='md-line-gutter';gutter.setAttribute('aria-hidden','true');
        gutter.textContent=rows.map((_,i)=>String(i+1)).join('\n');layout.appendChild(gutter);
      }
      const toggle=button('Sbalit',()=>{
        const hide=!pre.hidden;pre.hidden=hide;
        if(layout) layout.classList.toggle('md-code-collapsed',hide);
        toggle.textContent=hide?'Rozbalit':'Sbalit';toggle.setAttribute('aria-expanded',String(!hide));
      });toggle.setAttribute('aria-expanded','true');bar.appendChild(toggle);bar.appendChild(status);
      if(next)parent.insertBefore(frame,next);else parent.appendChild(frame);
      frame.appendChild(bar);
      if(layout){frame.appendChild(layout);layout.appendChild(pre);}else frame.appendChild(pre);
      if(lang==='diff' && rows.length<=2000){
        code.textContent='';
        rows.forEach((line,i)=>{
          const span=document.createElement('span');span.className='md-diff-line';
          if(line.startsWith('+')&&!line.startsWith('+++'))span.classList.add('md-diff-add');
          else if(line.startsWith('-')&&!line.startsWith('---'))span.classList.add('md-diff-del');
          else if(line.startsWith('@@'))span.classList.add('md-diff-hunk');
          span.textContent=line+(i===rows.length-1?'':'\n');code.appendChild(span);
        });
      }
    });
  }
  function numeric(text) {
    const s=text.trim().replace(/\s/g,'').replace(/%$/,'').replace(',','.');
    return /^[-+]?\d+(?:\.\d+)?$/.test(s) ? Number(s):null;
  }
  function compareCells(a,b) {
    const na=numeric(a),nb=numeric(b);
    if(na!==null&&nb!==null)return na-nb;
    return a.localeCompare(b,'cs',{numeric:true,sensitivity:'base'});
  }
  function enhanceTables(container) {
    Array.from(container.querySelectorAll('table.md-table')).forEach(table=>{
      const body=table.tBodies[0], head=table.tHead;
      if(!body||!head||!head.rows[0])return;
      const headers=Array.from(head.rows[0].cells);
      const rows=Array.from(body.rows);
      if(!rows.length||rows.length>3000||headers.length>32)return;
      const data=rows.map((el,index)=>({el,index,cells:Array.from(el.cells).map(c=>c.textContent.trim()),search:normalize(el.textContent)}));
      const controls=document.createElement('div');controls.className='md-smart-table-toolbar';
      const label=document.createElement('label');label.textContent='Filtrovat tabulku ';
      const input=document.createElement('input');input.type='search';input.maxLength=100;input.setAttribute('aria-label','Filtrovat řádky tabulky');
      label.appendChild(input);controls.appendChild(label);
      const info=tooltip(`${rows.length} řádků`);info.setAttribute('role','status');controls.appendChild(info);
      const frame=document.createElement('div');frame.className='md-smart-table';
      table.parentNode.insertBefore(frame,table);frame.appendChild(controls);frame.appendChild(table);
      let sortColumn=-1, direction=0, filter='';
      function apply(){
        const sorted=data.slice();
        if(direction!==0)sorted.sort((a,b)=>direction*compareCells(a.cells[sortColumn]||'',b.cells[sortColumn]||'')||a.index-b.index);
        else sorted.sort((a,b)=>a.index-b.index);
        const fragment=document.createDocumentFragment();let shown=0;
        sorted.forEach(record=>{record.el.hidden=!!filter&&!record.search.includes(filter);if(!record.el.hidden)shown++;fragment.appendChild(record.el);});
        body.appendChild(fragment);info.textContent=`${shown} / ${rows.length} řádků`;
      }
      headers.forEach((header,column)=>{
        header.setAttribute('aria-sort','none');
        const original=header.textContent.trim();header.textContent='';
        const toggle=button(original+' ↕',()=>{
          if(sortColumn!==column){sortColumn=column;direction=1;}
          else{direction=direction===1?-1:direction===-1?0:1;}
          headers.forEach(h=>h.setAttribute('aria-sort','none'));
          if(direction)header.setAttribute('aria-sort',direction===1?'ascending':'descending');
          toggle.textContent=original+(direction===1?' ↑':direction===-1?' ↓':' ↕');apply();
        },'Seřadit podle sloupce '+original);
        header.appendChild(toggle);
      });
      let queued=null;
      input.addEventListener('input',()=>{
        if(queued!==null)clearTimeout(queued);
        queued=setTimeout(()=>{queued=null;filter=normalize(input.value);apply();},80);
      });
    });
  }
  function enhanceGallery(container) {
    const images=Array.from(container.querySelectorAll('img.md-image')).filter(img=>!img.closest('a'));
    if(!images.length)return;
    Array.from(container.querySelectorAll('p')).forEach(p=>{
      const children=Array.from(p.childNodes);
      if(children.filter(n=>n.nodeType===1&&n.tagName==='IMG'&&n.classList.contains('md-image')).length>=2 &&
        children.every(n=>n.nodeType===3?!n.textContent.trim():n.tagName==='IMG'))p.classList.add('md-gallery');
    });
    const dlg=document.createElement('dialog');dlg.className='md-lightbox';dlg.setAttribute('aria-label','Galerie obrázků');
    const bar=document.createElement('div');bar.className='md-lightbox-toolbar';
    const caption=tooltip('');const photo=document.createElement('img');photo.alt='';
    const back=button('←',()=>show((index+images.length-1)%images.length),'Předchozí obrázek');
    const forward=button('→',()=>show((index+1)%images.length),'Další obrázek');
    const close=button('Zavřít',()=>{if(dlg.close)dlg.close();else dlg.hidden=true;},'Zavřít galerii');
    bar.appendChild(back);bar.appendChild(caption);bar.appendChild(forward);bar.appendChild(close);
    dlg.appendChild(bar);dlg.appendChild(photo);dlg.hidden=true;container.appendChild(dlg);
    let index=0;
    function show(i){index=i;photo.src=images[i].getAttribute('src');photo.alt=images[i].alt||'';
      caption.textContent=`${i+1}/${images.length} · ${(images[i].alt||'Obrázek').slice(0,120)}`;
      back.hidden=forward.hidden=images.length===1;
    }
    images.forEach((img,i)=>{
      img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Zvětšit obrázek: '+(img.alt||i+1));
      const open=()=>{show(i);dlg.hidden=false;if(dlg.showModal && !dlg.open)dlg.showModal();else dlg.setAttribute('open','');close.focus();};
      img.addEventListener('click',open);
      img.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
    });
    dlg.addEventListener('close',()=>{dlg.hidden=true;images[index].focus();});
    dlg.addEventListener('keydown',e=>{
      if(e.key==='ArrowLeft'){e.preventDefault();show((index+images.length-1)%images.length);}
      if(e.key==='ArrowRight'){e.preventDefault();show((index+1)%images.length);}
      if(e.key==='Escape'&&!dlg.close){dlg.hidden=true;dlg.removeAttribute('open');images[index].focus();}
    });
    dlg.addEventListener('click',e=>{if(e.target===dlg){if(dlg.close)dlg.close();else{dlg.hidden=true;dlg.removeAttribute('open');}}});
  }
  function standaloneSVG(svg) {
    // Renderer-created DOM only. Inlined computed presentation properties make saved SVG portable.
    const clone=svg.cloneNode(true);
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    const originals=[svg,...svg.querySelectorAll('*')], clones=[clone,...clone.querySelectorAll('*')];
    const properties=['fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin',
      'opacity','fill-opacity','stroke-opacity','font-family','font-size','font-weight','font-style',
      'text-anchor','paint-order','stroke-miterlimit'];
    originals.forEach((el,i)=>{
      const computed=root.getComputedStyle?root.getComputedStyle(el):null;
      if(!computed)return;
      properties.forEach(prop=>{
        const value=computed.getPropertyValue(prop);
        if(value&&!/url\s*\(|[<>]/i.test(value))clones[i].style.setProperty(prop,value);
      });
    });
    // Keep the theme's canvas inside the exported SVG (otherwise a dark-mode
    // diagram with pale text could become unreadable on a white background).
    const parent=svg.closest('figure.md-diagram');
    const css=parent&&root.getComputedStyle?root.getComputedStyle(parent):null;
    const background=css&&css.getPropertyValue('--md-surface').trim();
    const fill=background&&/^(?:#[0-9a-f]{3,8}|rgba?\([\d.,\s%]+\))$/i.test(background)?background:'#ffffff';
    const box=(svg.getAttribute('viewBox')||'').trim().split(/\s+/).map(Number);
    if(box.length===4&&box.every(Number.isFinite)&&box[2]>0&&box[3]>0){
      const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('x',String(box[0]));rect.setAttribute('y',String(box[1]));
      rect.setAttribute('width',String(box[2]));rect.setAttribute('height',String(box[3]));rect.setAttribute('fill',fill);
      const firstGraphic=clone.querySelector('desc');
      if(firstGraphic&&firstGraphic.nextSibling)clone.insertBefore(rect,firstGraphic.nextSibling);
      else clone.appendChild(rect);
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(clone);
  }
  function saveSVG(svg, filename) {
    const xml=standaloneSVG(svg);
    const url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;document.body.appendChild(anchor);
    anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function enhanceSVG(container){
    Array.from(container.querySelectorAll('figure.md-diagram')).forEach((frame,i)=>{
      const svg=frame.querySelector('svg.md-svg');const bar=frame.querySelector('.md-diagram-toolbar');
      if(!svg||!bar||bar.querySelector('[data-save-svg]'))return;
      const save=button('↓ SVG',()=>saveSVG(svg,`md-diagram-${String(i+1).padStart(2,'0')}.svg`),'Uložit samostatné SVG');
      save.dataset.saveSvg='true';bar.appendChild(save);
    });
  }
  function searchIndex(container) {
    const selector='h1,h2,h3,h4,h5,h6,p,li,td,th,blockquote,figcaption,summary';
    const omit='.md-reader-toolbar,.md-reader-outline,.md-code-toolbar,.md-smart-table-toolbar,.md-lightbox,.md-search-results,.md-code-tabs,.md-details-body .md-code-frame';
    const index=[];let total=0;
    for(const node of container.querySelectorAll(selector)) {
      if(node.closest(omit)||index.length>=2500)continue;
      if(node.tagName==='BLOCKQUOTE'&&node.querySelector('p'))continue;
      const text=node.textContent.trim();
      if(!text||text.length>6000||total+text.length>400000)continue;
      index.push({node,text});total+=text.length;
    }
    return index;
  }
  function queryIndex(index,q,max=30) {
    if(!q.trim())return [];
    const matches=[];
    for(const entry of index){
      const score=scoreText(entry.text,q);
      if(Number.isFinite(score))matches.push({node:entry.node,text:entry.text,score});
    }
    matches.sort((a,b)=>a.score-b.score);
    return matches.slice(0,max);
  }
  function enhance(container) {
    if(!container||!container.querySelectorAll)return;
    enhanceCodeSafe(container);enhanceTables(container);enhanceGallery(container);enhanceSVG(container);
  }
  const api=Object.freeze({enhance,normalize,distance,scoreText,queryIndex,searchIndex,compareCells,standaloneSVG});
  root.MDDocUX=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:(typeof global!=='undefined'?global:this));
