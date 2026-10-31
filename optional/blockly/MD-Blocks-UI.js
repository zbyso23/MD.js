/* MD.js Ultra Blocks Lite: original no-dependency, no-embed drag-and-drop UI.
 * Deliberately NOT Google Blockly. No bundle, transpiler, CDN or eval.
 */
(function(){'use strict';
  let program=MDBlocks.playground(), language='javascript', cancel=0, active=false, buttonHeld=false;
  let undoStack=[],redoStack=[],zoom=1,drag=null,dragGhost=null,dropTarget=null;
  const by=id=>document.getElementById(id);
  const types=['print','set','change','repeat','if','pinMode','write','delay','readDigital','readAnalog','map','writeVar','pwm','servo','stepper'];
  const defaults={print:()=>({type:'print',text:'Ahoj!'}),set:()=>({type:'set',name:'counter',value:0}),change:()=>({type:'change',name:'counter',delta:1}),repeat:()=>({type:'repeat',count:3,body:[]}),if:()=>({type:'if',name:'counter',op:'>=',value:3,body:[]}),pinMode:()=>({type:'pinMode',pin:'LED_BUILTIN',mode:'OUTPUT'}),write:()=>({type:'write',pin:'LED_BUILTIN',state:'HIGH'}),delay:()=>({type:'delay',ms:1000}),readDigital:()=>({type:'readDigital',name:'button',pin:2}),readAnalog:()=>({type:'readAnalog',name:'pot',pin:'A0'}),map:()=>({type:'map',name:'brightness',source:'pot',outMax:255}),writeVar:()=>({type:'writeVar',name:'button',pin:13}),pwm:()=>({type:'pwm',pin:9,value:128}),servo:()=>({type:'servo',pin:10,value:90}),stepper:()=>({type:'stepper',steps:8})};
  const labels={print:'🗨 Zobraz text',set:'📦 Nastav proměnnou',change:'➕ Přičti k proměnné',repeat:'↻ Opakuj',if:'◇ Podmínka',pinMode:'⚙ Režim pinu',write:'💡 Výstup HIGH/LOW',delay:'⏱ Čekej (ms)',readDigital:'🔘 Čti tlačítko/switch',readAnalog:'🎚 Čti analog',map:'⇄ Přepočítej 0–1023',writeVar:'💡 LED podle proměnné',pwm:'🌗 PWM D9',servo:'⚙ Servo D10',stepper:'⟳ Stepper D4–D7'};
  const groups={logic:['repeat','if'],variables:['set','change','map'],text:['print'],hardware:['pinMode','write','delay','readDigital','readAnalog','writeVar','pwm','servo','stepper']};
  const deepCopy=o=>JSON.parse(JSON.stringify(o));
  function el(tag,cls,txt){const o=document.createElement(tag);if(cls)o.className=cls;if(txt!==undefined)o.textContent=txt;return o;}
  function arrayAt(path,base=program){let a=base[path[0]];for(let i=1;i<path.length;i+=2){if(path[i+1]!=='body')throw new Error('Bad array path');const node=a[path[i]];if(!node||!Array.isArray(node.body))throw new Error('Nested block not found');a=node.body;}return a;}
  function saveUndo(){undoStack.push(deepCopy(program));if(undoStack.length>70)undoStack.shift();redoStack=[];}
  function updateUndoButtons(){by('undo').disabled=!undoStack.length;by('redo').disabled=!redoStack.length;}
  function moveBlock(fromArray,fromIndex,toArray,toIndex){
    if(fromArray.length>toArray.length && false)return false;
    // Block may never be moved into its own nested body, nor into any child.
    if(toArray.length>fromArray.length&&fromArray.every((v,i)=>v===toArray[i])&&toArray[fromArray.length]===fromIndex)return false;
    const source=arrayAt(fromArray),target=arrayAt(toArray);
    if(!source[fromIndex]||toIndex<0||toIndex>target.length)return false;
    if(source===target&&toIndex===fromIndex)return false;
    if(source===target&&toIndex===fromIndex+1)return false;
    saveUndo();const [item]=source.splice(fromIndex,1);
    const adjusted=source===target&&fromIndex<toIndex?toIndex-1:toIndex;
    target.splice(adjusted,0,item);refresh();return true;
  }
  function insertBlock(type,toArray,toIndex){if(!defaults[type])return false;const a=arrayAt(toArray);if(toIndex<0||toIndex>a.length)return false;
    saveUndo();a.splice(toIndex,0,defaults[type]());refresh();return true;}
  function removeBlock(path,index){const a=arrayAt(path);if(!a[index])return;saveUndo();a.splice(index,1);refresh();}
  function cloneBlock(path,index){const a=arrayAt(path);if(!a[index])return;saveUndo();a.splice(index+1,0,deepCopy(a[index]));refresh();}
  function field(node,key,options,container){let control;
    if(options){control=el('select');for(const v of options){const x=el('option',null,String(v));x.value=String(v);control.append(x);}control.value=String(node[key]);}
    else{control=el('input');control.type=typeof node[key]==='number'?'number':'text';control.value=String(node[key]);if(control.type==='text')control.maxLength=500;}
    control.setAttribute('aria-label',key);
    control.addEventListener('change',()=>{let value=control.value;
      if(control.type==='number'){value=Number(value);if(!Number.isInteger(value)){control.value=node[key];return;}}
      else if(key==='pin'&&value!=='LED_BUILTIN'&&/^\d+$/.test(value))value=Number(value);
      else if(key==='value'&&['pwm','servo'].includes(node.type)&&/^\d+$/.test(value))value=Number(value);
      saveUndo();node[key]=value;refresh();
    });container.append(control);
  }
  function dropSlot(path,index){const slot=el('div','drop-slot','Pusť blok sem');
    slot.dataset.path=JSON.stringify(path);slot.dataset.index=String(index);
    slot.setAttribute('role','button');slot.tabIndex=0;slot.setAttribute('aria-label',`Vložit blok na pozici ${index+1}`);
    slot.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();insertBlock('print',path,index);}});
    return slot;
  }
  function makeEditor(arr,path){const host=el('div','block-stack');
    arr.forEach((node,index)=>{host.append(dropSlot(path,index));
      const typeClass=['repeat','if'].includes(node.type)?'logic':groups.hardware.includes(node.type)?'hardware':'data';
      const block=el('div','block '+typeClass);block.dataset.nodePath=JSON.stringify(path.concat(index));
      const head=el('div','block-body');const handle=el('button','drag-handle','⠿');handle.type='button';handle.title='Táhni blok';
      handle.setAttribute('aria-label','Přetáhnout '+labels[node.type]);
      handle.addEventListener('pointerdown',e=>startPointerDrag(e,{kind:'existing',path,index},labels[node.type]));
      head.append(handle,el('span','block-title',labels[node.type]||node.type));
      function f(key,options){const label=el('label','block-field');label.append(el('span',null,key+':'));field(node,key,options,label);head.append(label);}
      switch(node.type){case 'print':f('text');break;case 'set':f('name');f('value');break;case 'change':f('name');f('delta');break;case 'repeat':f('count');break;case 'if':f('name');f('op',['==','!=','<','<=','>','>=']);f('value');break;case 'pinMode':f('pin',['LED_BUILTIN',2,3,4,5,6,7,8,9,10,11,12,13]);f('mode',['OUTPUT','INPUT','INPUT_PULLUP']);break;case 'write':f('pin',['LED_BUILTIN',2,3,4,5,6,7,8,9,10,11,12,13]);f('state',['HIGH','LOW']);break;case 'delay':f('ms');break;
        case 'readDigital':f('name');f('pin',[2,3]);break;case 'readAnalog':f('name');f('pin',['A0','A1']);break;
        case 'map':f('name');f('source');f('outMax');break;case 'writeVar':f('pin',['LED_BUILTIN',9,13]);f('name');break;
        case 'pwm':f('value');break;case 'servo':f('value');break;case 'stepper':f('steps');break;}
      const ctl=el('span','ctl');function action(icon,label,fn){const b=el('button',null,icon);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.addEventListener('click',fn);ctl.append(b);return b;}
      action('⧉','Duplikovat blok',()=>cloneBlock(path,index));action('×','Smazat blok',()=>removeBlock(path,index));head.append(ctl);block.append(head);
      if(node.body){const nested=el('div','nested');nested.append(el('div','nest-label','↳ Vlož sem bloky'));nested.append(makeEditor(node.body,path.concat(index,'body')));block.append(nested);}
      host.append(block);
    });
    host.append(dropSlot(path,arr.length));return host;
  }
  function renderToolbox(){const host=by('toolbox');host.replaceChildren();
    for(const [kind,ts] of Object.entries(groups)){
      const group=el('details','toolbox-group');group.open=true;group.append(el('summary',null,({logic:'Řízení',variables:'Proměnné',text:'Výpis',hardware:'Arduino / zařízení'})[kind]));
      for(const type of ts){const item=el('button','toolbox-item '+kind,labels[type]);item.type='button';
        item.title='Přetáhni na pracovní plochu, nebo klikni pro přidání do LOOP';
        item.addEventListener('pointerdown',e=>startPointerDrag(e,{kind:'new',type},labels[type]));
        item.addEventListener('click',()=>{if(blockDragged)return;insertBlock(type,['loop'],program.loop.length);});
        group.append(item);
      }host.append(group);
    }
  }
  let blockDragged=false;
  function startPointerDrag(e,source,label){if(e.button!==0 && e.pointerType==='mouse')return;
    if(drag)return;drag={source,label,id:e.pointerId,startX:e.clientX,startY:e.clientY,moving:false,origin:e.currentTarget};
    // No native HTML5 drag required: Pointer Events support mouse, stylus and touch.
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.addEventListener('pointermove',pointerMove);
    e.currentTarget.addEventListener('pointerup',pointerEnd,{once:true});
    e.currentTarget.addEventListener('pointercancel',pointerCancel,{once:true});
  }
  function autoScrollWorkspace(){
    if(!drag||!drag.moving)return;
    const ws=by('blocks'),rect=ws.getBoundingClientRect();
    const x=drag.lastX,y=drag.lastY;
    if(x>rect.left&&x<rect.right){
      if(y>rect.bottom-42&&y<rect.bottom+8)ws.scrollTop+=17;
      else if(y<rect.top+42&&y>rect.top-8)ws.scrollTop-=17;
    }
    const below=document.elementFromPoint(x,y);
    const slot=below&&below.closest('.drop-slot');
    if(dropTarget!==slot){if(dropTarget)dropTarget.classList.remove('drop-active');dropTarget=slot;if(slot)slot.classList.add('drop-active');}
    drag.scrollFrame=requestAnimationFrame(autoScrollWorkspace);
  }
  function pointerMove(e){if(!drag||drag.id!==e.pointerId)return;
    drag.lastX=e.clientX;drag.lastY=e.clientY;
    if(!drag.moving&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<7)return;
    if(!drag.moving){drag.moving=true;blockDragged=true;dragGhost=el('div','drag-ghost',drag.label);document.body.append(dragGhost);drag.scrollFrame=requestAnimationFrame(autoScrollWorkspace);}
    dragGhost.style.transform=`translate(${e.clientX+12}px,${e.clientY+12}px)`;
    const under=document.elementFromPoint(e.clientX,e.clientY),slot=under&&under.closest('.drop-slot');
    if(dropTarget)dropTarget.classList.remove('drop-active');dropTarget=slot;
    if(dropTarget)dropTarget.classList.add('drop-active');e.preventDefault();
  }
  function finishDrag(){if(!drag)return;
    if(drag.scrollFrame)cancelAnimationFrame(drag.scrollFrame);
    drag.origin.removeEventListener('pointermove',pointerMove);
    if(dropTarget)dropTarget.classList.remove('drop-active');if(dragGhost)dragGhost.remove();
    dragGhost=null;dropTarget=null;drag=null;
    // Clear after click event, so drag doesn't accidentally invoke toolbox click.
    setTimeout(()=>{blockDragged=false;},0);
  }
  function pointerEnd(e){if(!drag||drag.id!==e.pointerId)return;
    const slot=dropTarget;const src=drag.source,moving=drag.moving;
    finishDrag();if(moving&&slot){const path=JSON.parse(slot.dataset.path),index=Number(slot.dataset.index);
      if(src.kind==='new')insertBlock(src.type,path,index);
      else moveBlock(src.path,src.index,path,index);
    }e.preventDefault();
  }
  function pointerCancel(){finishDrag();}
  function refresh(){const host=by('blocks');host.replaceChildren();
    for(const [key,title,desc] of [['setup','SETUP','Spouští se jednou'],['loop','LOOP','Běží opakovaně']]){
      const scope=el('div','scope');scope.append(el('div','scope-header',title+' · '+desc));scope.append(makeEditor(program[key],[key]));host.append(scope);
    }
    renderToolbox();by('blocks').style.zoom=String(zoom);by('zoom-level').textContent=Math.round(zoom*100)+' %';updateUndoButtons();
    try{const src=MDBlocks.generate(program,language);by('source').textContent=src;if(active)renderResult();else by('console').textContent='Připraveno · '+MDBlocks.validate(program).count+' bloků.';}
    catch(e){by('source').textContent='CHYBA: '+e.message;by('console').textContent='Oprav blok: '+e.message;}
  }
  by('undo').addEventListener('click',()=>{if(!undoStack.length)return;redoStack.push(deepCopy(program));program=undoStack.pop();refresh();});
  by('redo').addEventListener('click',()=>{if(!redoStack.length)return;undoStack.push(deepCopy(program));program=redoStack.pop();refresh();});
  by('zoom-in').addEventListener('click',()=>{zoom=Math.min(1.6,Math.round((zoom+.1)*10)/10);refresh();});
  by('zoom-out').addEventListener('click',()=>{zoom=Math.max(.7,Math.round((zoom-.1)*10)/10);refresh();});
  by('zoom-reset').addEventListener('click',()=>{zoom=1;refresh();});
  function inputs(){return {digital:{2:buttonHeld?1:0,3:by('switch-in').checked?1:0},analog:{A0:Number(by('pot-in').value),A1:Number(by('mic-in').value)}};}
  function renderResult(){
    let result;
    try{result=MDBlocks.simulate(program,3,inputs());}
    catch(e){by('console').textContent='STOP: '+e.message;return;}
    const pwm=result.actuators.pwm,servo=result.actuators.servo,stepper=result.actuators.stepper;
    by('led').classList.toggle('on',result.pins['13']==='HIGH'||result.pins.LED_BUILTIN==='HIGH');
    by('pwm-led').style.opacity=String(0.25+0.75*pwm/255);
    by('pwm-value').textContent='PWM '+pwm+'/255';
    by('servo-needle').style.transform='rotate('+(-90+servo)+'deg)';
    by('servo-value').textContent=servo+'°';
    by('stepper-rotor').style.transform='rotate('+(stepper*1.8)+'deg)';
    by('stepper-value').textContent=stepper+' kroků';
    by('simtime').textContent='Virtuální čas: '+result.virtualTimeMs+' ms · '+result.steps+' kroků simulace';
    const msg=result.trace.slice(-25).map(e=>'['+e.time+' ms] '+(e.kind==='print'?e.text:e.kind==='write'?'D'+e.pin+' = '+e.state:e.kind==='sensor'?e.source+' → '+e.name+' = '+e.value:e.kind==='pwm'?'PWM D9 = '+e.value:e.kind==='servo'?'Servo = '+e.value+'°':e.kind==='stepper'?'Stepper '+e.steps+' → '+e.position:e.kind==='var'?e.name+' = '+e.value:e.kind==='mode'?'pin '+e.pin+' mode '+e.mode:e.kind));
    by('console').textContent=msg.join('\n')+'\n✓ Hotovo (bezpečná simulace)';
  }
  by('run').addEventListener('click',()=>{cancel++;active=true;renderResult();});
  by('stop').addEventListener('click',()=>{cancel++;active=false;by('console').textContent+='\n■ Simulace pozastavena';});
  function inputChanged(){by('pot-value').textContent=by('pot-in').value;by('mic-value').textContent=by('mic-in').value;if(active)renderResult();}
  by('btn-in').addEventListener('click',()=>{buttonHeld=!buttonHeld;by('btn-in').setAttribute('aria-pressed',String(buttonHeld));by('btn-in').textContent=buttonHeld?'● D2 tlačítko DRŽENO':'○ D2 tlačítko';inputChanged();});
  by('switch-in').addEventListener('change',inputChanged);
  by('pot-in').addEventListener('input',inputChanged);
  by('mic-in').addEventListener('input',inputChanged);
  by('preset').addEventListener('change',()=>{active=false;cancel++;saveUndo();program=by('preset').value==='blink'?MDBlocks.demo():MDBlocks.playground();refresh();});
  by('theme').addEventListener('click',()=>document.body.classList.toggle('dark'));
  by('reset').addEventListener('click',()=>{cancel++;saveUndo();program=by('preset').value==='blink'?MDBlocks.demo():MDBlocks.playground();refresh();});
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{language=b.dataset.lang;document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));refresh();}));
  function download(name,content,mime){const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  by('save').addEventListener('click',()=>{try{MDBlocks.validate(program);download('blocks-lite.json',JSON.stringify(program,null,2),'application/json');}catch(e){alert(e.message);}});
  by('load').addEventListener('click',()=>by('file').click());
  by('file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;if(f.size>100000){alert('Max 100 KiB');return;}try{const obj=JSON.parse(await f.text());MDBlocks.validate(obj);cancel++;saveUndo();program=obj;refresh();}catch(err){alert('Invalid workspace: '+err.message);}e.target.value='';});
  by('copy').addEventListener('click',()=>navigator.clipboard.writeText(by('source').textContent).catch(()=>alert('Clipboard není dostupný (potřebuje HTTPS nebo localhost).')));
  if (new URLSearchParams(location.search).get('preset') === 'blink') { by('preset').value = 'blink'; program = MDBlocks.demo(); }
  refresh();
})();
