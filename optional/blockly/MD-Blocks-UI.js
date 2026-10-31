/* Blocks Lite UI — no imports, user text written through textContent only. */
(function(){'use strict';
  let program=MDBlocks.playground(), language='javascript', cancel=0, active=false, buttonHeld=false;
  const by=id=>document.getElementById(id), types=['print','set','change','repeat','if','pinMode','write','delay','readDigital','readAnalog','map','writeVar','pwm','servo','stepper'];
  const defaults={print:()=>({type:'print',text:'Ahoj!'}),set:()=>({type:'set',name:'counter',value:0}),change:()=>({type:'change',name:'counter',delta:1}),repeat:()=>({type:'repeat',count:3,body:[]}),if:()=>({type:'if',name:'counter',op:'>=',value:3,body:[]}),pinMode:()=>({type:'pinMode',pin:'LED_BUILTIN',mode:'OUTPUT'}),write:()=>({type:'write',pin:'LED_BUILTIN',state:'HIGH'}),delay:()=>({type:'delay',ms:1000}),readDigital:()=>({type:'readDigital',name:'button',pin:2}),readAnalog:()=>({type:'readAnalog',name:'pot',pin:'A0'}),map:()=>({type:'map',name:'brightness',source:'pot',outMax:255}),writeVar:()=>({type:'writeVar',name:'button',pin:13}),pwm:()=>({type:'pwm',pin:9,value:128}),servo:()=>({type:'servo',pin:10,value:90}),stepper:()=>({type:'stepper',steps:8})};
  const labels={print:'🗨 Zobraz text',set:'📦 Nastav proměnnou',change:'➕ Přičti k proměnné',repeat:'↻ Opakuj',if:'◇ Podmínka',pinMode:'⚙ Režim pinu',write:'💡 Výstup HIGH/LOW',delay:'⏱ Čekej (ms)',readDigital:'🔘 Čti tlačítko/switch',readAnalog:'🎚 Čti analog',map:'⇄ Přepočítej 0–1023',writeVar:'💡 LED podle proměnné',pwm:'🌗 PWM D9',servo:'⚙ Servo D10',stepper:'⟳ Stepper D4–D7'};
  function el(tag,cls,txt){const o=document.createElement(tag);if(cls)o.className=cls;if(txt!==undefined)o.textContent=txt;return o;}
  function field(node,key,opts,container){let control;
    if(opts){control=el('select');for(const v of opts){const x=el('option',null,String(v));x.value=String(v);control.append(x);}control.value=String(node[key]);}
    else{control=el('input');control.type=(typeof node[key]==='number' && !(key==='value'&&(node.type==='pwm'||node.type==='servo')))?'number':'text';control.value=String(node[key]);if(control.type==='text')control.maxLength=500;}
    control.setAttribute('aria-label',key);control.addEventListener('change',()=>{if(control.type==='number'){const n=Number(control.value);if(!Number.isInteger(n)){control.value=node[key];return;}node[key]=n;}else if(key==='pin'&&control.value!=='LED_BUILTIN'&&/^\d+$/.test(control.value)){node[key]=Number(control.value);}else if(key==='value'&&(node.type==='pwm'||node.type==='servo')&&/^\d+$/.test(control.value)){node[key]=Number(control.value);}else node[key]=control.value;refresh();});container.append(control);
  }
  function makeEditor(arr){const host=el('div');arr.forEach((node,index)=>{
    const block=el('div','block '+(['if','repeat'].includes(node.type)?'logic':['pinMode','write','delay','readDigital','readAnalog','map','writeVar','pwm','servo','stepper'].includes(node.type)?'hardware':''));
    const body=el('div','block-body'),title=el('span','block-title',labels[node.type]);body.append(title);
    function f(key,options){body.append(el('span',null,key+':'));field(node,key,options,body);}
    switch(node.type){case 'print':f('text');break;case 'set':f('name');f('value');break;case 'change':f('name');f('delta');break;case 'repeat':f('count');break;case 'if':f('name');f('op',['==','!=','<','<=','>','>=']);f('value');break;case 'pinMode':f('pin',['LED_BUILTIN',2,3,4,5,6,7,8,9,10,11,12,13]);f('mode',['OUTPUT','INPUT','INPUT_PULLUP']);break;case 'write':f('pin',['LED_BUILTIN',2,3,4,5,6,7,8,9,10,11,12,13]);f('state',['HIGH','LOW']);break;case 'delay':f('ms');break;
      case 'readDigital':f('name');f('pin',[2,3]);break;
      case 'readAnalog':f('name');f('pin',['A0','A1']);break;
      case 'map':f('name');f('source');f('outMax');break;
      case 'writeVar':f('pin',['LED_BUILTIN',9,13]);f('name');break;
      case 'pwm':f('value');break;
      case 'servo':f('value');break;
      case 'stepper':f('steps');break;}

    const ctl=el('span','ctl');function action(symbol,label,fn){const b=el('button',null,symbol);b.title=label;b.setAttribute('aria-label',label);b.addEventListener('click',fn);ctl.append(b);return b;}
    action('↑','Přesunout nahoru',()=>{if(index>0){[arr[index-1],arr[index]]=[arr[index],arr[index-1]];refresh();}}).disabled=index===0;
    action('↓','Přesunout dolů',()=>{if(index<arr.length-1){[arr[index+1],arr[index]]=[arr[index],arr[index+1]];refresh();}}).disabled=index===arr.length-1;
    action('×','Smazat blok',()=>{arr.splice(index,1);refresh();});body.append(ctl);block.append(body);
    if(node.body){const nested=el('div','nested');nested.append(addToolbar(node.body,'Vnořené bloky'),makeEditor(node.body));block.append(nested);}
    host.append(block);
  });return host;}
  function addToolbar(arr,label){const wrap=el('div','add-tools'),sel=el('select');sel.setAttribute('aria-label',label);for(const t of types){const opt=el('option',null,labels[t]);opt.value=t;sel.append(opt);}wrap.append(sel);const button=el('button',null,'+ Přidat blok');button.addEventListener('click',()=>{arr.push(defaults[sel.value]());refresh();});wrap.append(button);return wrap;}
  function refresh(){const parent=by('blocks');parent.replaceChildren();for(const [key,title,desc] of [['setup','SETUP — jednou','Inicializace periferie a proměnných'],['loop','LOOP — opakovaně','V simulátoru opakujeme 3×']]){const box=el('div','scope'),head=el('div','scope-header'),name=el('div');name.append(el('h3',null,title),el('small',null,desc));head.append(name,addToolbar(program[key],'Přidat '+key));box.append(head,makeEditor(program[key]));parent.append(box);}try{const src=MDBlocks.generate(program,language);by('source').textContent=src;if(active)renderResult();else by('console').textContent='Připraveno · '+MDBlocks.validate(program).count+' bloků.';}catch(e){by('source').textContent='CHYBA: '+e.message;by('console').textContent='Oprav blok: '+e.message;}}
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
  by('preset').addEventListener('change',()=>{active=false;cancel++;program=by('preset').value==='blink'?MDBlocks.demo():MDBlocks.playground();refresh();});
  by('theme').addEventListener('click',()=>document.body.classList.toggle('dark'));
  by('reset').addEventListener('click',()=>{cancel++;program=by('preset').value==='blink'?MDBlocks.demo():MDBlocks.playground();refresh();});
  document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{language=b.dataset.lang;document.querySelectorAll('[data-lang]').forEach(x=>x.setAttribute('aria-selected',String(x===b)));refresh();}));
  function download(name,content,mime){const url=URL.createObjectURL(new Blob([content],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  by('save').addEventListener('click',()=>{try{MDBlocks.validate(program);download('blocks-lite.json',JSON.stringify(program,null,2),'application/json');}catch(e){alert(e.message);}});
  by('load').addEventListener('click',()=>by('file').click());
  by('file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;if(f.size>100000){alert('Max 100 KiB');return;}try{const obj=JSON.parse(await f.text());MDBlocks.validate(obj);cancel++;program=obj;refresh();}catch(err){alert('Invalid workspace: '+err.message);}e.target.value='';});
  by('copy').addEventListener('click',()=>navigator.clipboard.writeText(by('source').textContent).catch(()=>alert('Clipboard není dostupný (potřebuje HTTPS nebo localhost).')));
  if (new URLSearchParams(location.search).get('preset') === 'blink') { by('preset').value = 'blink'; program = MDBlocks.demo(); }
  refresh();
})();
