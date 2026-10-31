/* MD.js ZX Ultra optional browser module: no imports, no eval, no external CDN. ROM fetch uses manual File API fallback. */
(function(root){
'use strict';
const LIMIT=8*1024*1024;
const HEX=n=>(n>>>0).toString(16).toUpperCase().padStart(4,'0');
function readTAP(input){
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(bytes.length>LIMIT)throw new Error('TAP exceeds 8 MiB limit');
  if(!bytes.length)throw new Error('TAP is empty');
  const blocks=[];let i=0;
  while(i<bytes.length){
    if(i+2>bytes.length)throw new Error('Truncated TAP block length');
    const n=bytes[i]|(bytes[i+1]<<8);i+=2;
    if(n<2||i+n>bytes.length)throw new Error('Invalid TAP block length');
    const data=Uint8Array.from(bytes.subarray(i,i+n));i+=n;
    let xor=0;for(const b of data)xor^=b;
    if(xor!==0)throw new Error('TAP checksum mismatch at block '+blocks.length);
    blocks.push(Object.freeze({flag:data[0], payload:data.slice(1,-1)}));
    if(blocks.length>32768)throw new Error('Too many tape blocks');
  }
  return blocks;
}
function trapLDBytes(machine,tape){
  if(!machine||!machine.cpu||!machine.mem||!tape||!tape.blocks.length)return false;
  const state=machine.cpu.getState();
  if(state.pc!==0x0556)return false; // Sinclair 48K LD_BYTES entry (nonstandard ROM compatibility is experimental)
  const length=((state.d<<8)|state.e)>>>0;
  const want=state.a&255;
  let found=null;
  while(tape.cursor<tape.blocks.length){
    const block=tape.blocks[tape.cursor++];
    if(block.flag===want){found=block;break;}
  }
  const load=!!state.flags.C;
  let ok=!!found&&found.payload.length>=length&&state.ix+length<=65536;
  if(ok){
    for(let i=0;i<length;i++){
      const p=state.ix+i;
      if(p<0x4000){ok=false;break;}
      if(!load&&machine.mem[p]!==found.payload[i]){ok=false;break;}
    }
  }
  if(ok&&load)machine.mem.set(found.payload.subarray(0,length),state.ix);
  if(ok){state.ix=(state.ix+length)&0xFFFF;state.d=0;state.e=0;}
  state.flags.C=ok?1:0;
  // Simulate RET from CALL 0556. ROM placed the return address on stack.
  const sp=state.sp&0xFFFF;
  state.pc=(machine.mem[sp]|(machine.mem[(sp+1)&0xFFFF]<<8))&0xFFFF;
  state.sp=(sp+2)&0xFFFF;
  machine.cpu.setState(state);
  return true;
}
function element(tag,cls,text){
  const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;
}
function button(label,title,fn){
  const b=element('button','mdzx-button',label);b.type='button';b.title=title||label;b.addEventListener('click',fn);return b;
}
function makeDownload(filename,bytes){
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/octet-stream'}));
  const a=document.createElement('a');a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function mount(host){
  if(!host||!host.appendChild)throw new TypeError('Need DOM container');
  if(host.dataset.mdzxMounted==='true')return null;
  host.dataset.mdzxMounted='true';host.textContent='';
  const shell=element('section','mdzx-shell');shell.setAttribute('aria-label','ZX Spectrum 48K');
  const top=element('div','mdzx-embedded');
  const frame=element('div','mdzx-screen-frame');
  const canvas=element('canvas','mdzx-canvas');canvas.id='mdzx-canvas-'+Math.random().toString(36).slice(2);
  canvas.width=320;canvas.height=240;canvas.tabIndex=0;canvas.setAttribute('aria-label','ZX Spectrum keyboard focus');
  frame.appendChild(canvas);top.appendChild(frame);
  const overlay=element('button','mdzx-power','▶ Start ZX');overlay.type='button';frame.appendChild(overlay);
  const foot=element('div','mdzx-foot');const status=element('span','mdzx-status','OFF · ZX Spectrum 48K');
  foot.appendChild(status);top.appendChild(foot);
  const kbToggle=button('⌨ ZX klávesnice','Zobrazit nebo skrýt virtuální klávesnici',()=>{
    keyboardPanel.hidden=!keyboardPanel.hidden;
    kbToggle.setAttribute('aria-expanded',String(!keyboardPanel.hidden));
  });
  kbToggle.setAttribute('aria-expanded','false');foot.appendChild(kbToggle);
  const keyboardPanel=element('div','mdzx-virtual-keyboard');keyboardPanel.hidden=true;
  const shortcutLabel=element('label','mdzx-key-mode');
  const classicShortcuts=element('input');classicShortcuts.type='checkbox';classicShortcuts.checked=true;
  shortcutLabel.append(classicShortcuts,document.createTextNode(' Sinclair K zkratky v OpenSE BASIC: J→LOAD, P→PRINT, R→RUN, K→LIST, G→GO TO (na prázdném řádku)'));
  keyboardPanel.append(shortcutLabel);
  const shortcutMap={74:'LOAD ',80:'PRINT ',82:'RUN',75:'LIST',71:'GO TO '};
  let keyMacroBusy=false;
  const pauseKey=(ms)=>new Promise(ok=>setTimeout(ok,ms));
  function atEmptyBasicLine(){if(!ready||!machine||!classicShortcuts.checked)return false;
    const mem=machine.mem,ptr=mem[0x5c59]|(mem[0x5c5a]<<8);
    return ptr>=0x5c00&&ptr<0xfffe&&mem[ptr]===13;
  }
  async function typeKeywordByMatrix(word){if(!ready||!machine||keyMacroBusy)return false;
    keyMacroBusy=true;const kb=machine._keyb;
    try{for(const c of word){if(disposed||!ready)break;
       const code=c===' '?32:c.toUpperCase().charCodeAt(0);
       if(!kb.kctable[code])continue;
       // Use guest ULA matrix for each key, never write to BASIC RAM directly.
       kb.setSource('keyword-macro',[code],true);await pauseKey(90);
       kb.setSource('keyword-macro',[code],false);await pauseKey(75);
    }}finally{kb.setSource('keyword-macro',[],false);keyMacroBusy=false;}
    return true;
  }
  // Browser accelerator capture is best effort only: tabs/OS may reserve them.
  canvas.addEventListener('keydown',e=>{
    const reserved=e.key==='F5'||(e.ctrlKey&&['r','w'].includes(e.key.toLowerCase()));
    if(reserved){if(e.cancelable)e.preventDefault();e.stopPropagation();}
  },true);
  canvas.addEventListener('keydown',e=>{
    if(e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||!e.code?.startsWith('Key'))return;
    const code=e.code.charCodeAt(3);const keyword=shortcutMap[code];
    if(keyword&&atEmptyBasicLine()){
      if(e.cancelable)e.preventDefault();e.stopImmediatePropagation();
      typeKeywordByMatrix(keyword);
    }
  },true);
  canvas.addEventListener('keyup',e=>{
    if(classicShortcuts.checked&&shortcutMap[e.code?.charCodeAt(3)]&&keyMacroBusy){
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);
  keyboardPanel.setAttribute('aria-label','Virtuální klávesnice ZX Spectrum 48K');
  const rows=[
    [['1',49,''],['2',50,''],['3',51,''],['4',52,''],['5',53,'←'],['6',54,'↓'],['7',55,'↑'],['8',56,'→'],['9',57,''],['0',48,'DELETE']],
    [['Q',81,''],['W',87,''],['E',69,''],['R',82,'RUN'],['T',84,''],['Y',89,''],['U',85,''],['I',73,''],['O',79,''],['P',80,'PRINT']],
    [['A',65,''],['S',83,''],['D',68,''],['F',70,''],['G',71,'GO TO'],['H',72,''],['J',74,'LOAD'],['K',75,'LIST'],['L',76,''],['ENTER',13,'']],
    [['CAPS SHIFT',16,''],['Z',90,''],['X',88,''],['C',67,''],['V',86,''],['B',66,''],['N',78,''],['M',77,''],['SYM SHIFT',17,''],['SPACE',32,'']]
  ];
  const virtualButtons=[];
  for(const row of rows){const line=element('div','mdzx-key-row');
    for(const [name,code,keyword] of row){const key=element('button','mdzx-key');key.type='button';
      key.dataset.keyCode=String(code);key.setAttribute('aria-label',name+(keyword?' '+keyword:''));
      key.append(element('span','mdzx-key-name',name));if(keyword)key.append(element('small','mdzx-key-word',keyword));
      let pointer=null;
      key.addEventListener('pointerdown',e=>{if(!ready||!machine)return;
        pointer=e.pointerId;key.setPointerCapture(pointer);
        if(shortcutMap[code]&&atEmptyBasicLine()){typeKeywordByMatrix(shortcutMap[code]);}
        else machine._keyb.pressVirtual(code,true,pointer);
        key.classList.add('down');e.preventDefault();});
      const release=e=>{if(pointer===null)return;
        if(machine&&machine._keyb)machine._keyb.pressVirtual(code,false,pointer);
        pointer=null;key.classList.remove('down');e.preventDefault();};
      key.addEventListener('pointerup',release);key.addEventListener('pointercancel',release);
      key.addEventListener('lostpointercapture',release);
      virtualButtons.push(key);line.appendChild(key);
    }keyboardPanel.appendChild(line);
  }
  const quick=element('div','mdzx-quick-keys');
  for(const [label,codes] of [['DELETE',[16,48]],['←',[16,53]],['↓',[16,54]],['↑',[16,55]],['→',[16,56]],['BREAK',[16,32]]]){
    const key=button(label,'ZX CAPS SHIFT combination',()=>{});
    let source=null;
    key.addEventListener('pointerdown',e=>{if(!ready||!machine)return;
      source='quick:'+label+':'+e.pointerId;
      machine._keyb.setSource(source,codes,true);
      key.classList.add('down');key.setPointerCapture(e.pointerId);e.preventDefault();});
    const release=()=>{if(!source)return;const token=source;source=null;
      // Keep keys registered long enough for the 50 Hz ZX guest scanner to see a tap.
      setTimeout(()=>{machine?._keyb?.setSource(token,codes,false);key.classList.remove('down');},85);
    };
    key.addEventListener('pointerup',release);key.addEventListener('pointercancel',release);
    quick.append(key);
  }
  keyboardPanel.append(quick);
  top.appendChild(keyboardPanel);shell.appendChild(top);
  const work=element('div','mdzx-workbench');
  const tools=element('div','mdzx-tools');
  const info=element('p','mdzx-info','48K · locally installed ROM · MIT Z80 core · user media stays local');
  const regs=element('pre','mdzx-regs','CPU not started');
  const mem=element('pre','mdzx-memory','Memory 4000–407F');
  const readme=element('p','mdzx-readme','OpenSE BASIC používá textový tokenizer; volitelné Sinclair K zkratky umožňují jedním J napsat LOAD přes virtuální ZX matici. Klikni na obrazovku pro aktivaci klávesnice. Backspace → CAPS SHIFT + 0, šipky → CAPS SHIFT + 5–8. SHIFT → CAPS SHIFT, CTRL → SYMBOL SHIFT. Na původní ROM J v režimu K znamená LOAD. Standardní TAP loader experimentálně přes ROM trap 0556.');
  const input=element('input','mdzx-file');input.type='file';input.accept='.sna,.tap,.rom,.scr';input.hidden=true;
  shell.appendChild(input);
  const log=element('div','mdzx-log','');log.setAttribute('role','status');
  let machine=null,ready=false,booting=false,paused=false,tape=null,disposed=false;
  let bootTimer=null;
  let pendingSNA=null,scrPreview=null;
  let romOverride=null,pendingJSON=null;
  const rt=root.MDUltraRuntime;
  const ZX_KEY='mdjs-ultra:zx:48k';
  let fullFallback=false;
  function say(message){status.textContent=message;log.textContent=message;}
  function inspect(){
    if(!machine)return;
    const s=machine.cpu.getState();
    regs.textContent=`PC ${HEX(s.pc)}    SP ${HEX(s.sp)}    IX ${HEX(s.ix)}    IY ${HEX(s.iy)}\n`+
      `AF ${HEX((s.a<<8)|((s.flags.S<<7)|(s.flags.Z<<6)|(s.flags.H<<4)|(s.flags.P<<2)|(s.flags.N<<1)|s.flags.C))} `+
      `BC ${HEX((s.b<<8)|s.c)}  DE ${HEX((s.d<<8)|s.e)}  HL ${HEX((s.h<<8)|s.l)}\n`+
      `IM ${s.imode}   I ${s.i}  R ${s.r}   HALT ${machine.cpu.is_halted()?'yes':'no'}`;
    const parts=[];
    for(let a=0x4000;a<0x4080;a+=16){let line=HEX(a)+': ';
      for(let j=0;j<16;j++)line+=machine.mem[a+j].toString(16).toUpperCase().padStart(2,'0')+' ';
      parts.push(line);
    }
    mem.textContent=parts.join('\n');
  }
  function ensureCore(){
    if(!root.MinZX||!root.Z80||!root.ZXScreen||!root.ZXKeyboard||!root.ZXSoundOutput)
      throw new Error('Missing MinZX vendor assets. Run python3 zx/fetch-assets.py first.');
  }
  function romIdentity(bytes){let n=2166136261;for(let i=0;i<bytes.length;i++){n^=bytes[i];n=Math.imul(n,16777619);}return (n>>>0).toString(16).padStart(8,'0');}
  function exportJSONState(){
    if(!ready||!machine)throw new Error('Start ZX before saving state');
    if(!rt)throw new Error('MD-Runtime.js missing');
    const snapshot={profile:'zx48',ram:rt.bytesToBase64(machine.mem.subarray(0x4000)),
      romFingerprint:romIdentity(machine.mem.subarray(0,0x4000)),cpu:machine.cpu.getState(),
      border:machine._screen.border,paused:!!machine._mdzxPaused,
      tape:tape?{cursor:tape.cursor,blocks:tape.blocks.map(b=>({flag:b.flag,payload:rt.bytesToBase64(b.payload)}))}:null};
    return rt.wrapState('zx',snapshot);
  }
  function applyJSONState(doc){
    if(!ready||!machine)throw new Error('ZX ROM must be started before restoring');
    const data=rt.parseState(doc,'zx');
    if(data.profile!=='zx48')throw new Error('This is not a 48K ZX state');
    const bytes=rt.base64ToBytes(data.ram,49152);
    if(bytes.length!==49152)throw new Error('ZX RAM must have exactly 48 KiB');
    if(data.romFingerprint!==romIdentity(machine.mem.subarray(0,0x4000)))throw new Error('ZX ROM mismatch: load the original 16 KiB ROM first');
    if(!data.cpu||!Number.isInteger(data.cpu.pc)||data.cpu.pc<0||data.cpu.pc>65535||!Number.isInteger(data.cpu.sp)||data.cpu.sp<0||data.cpu.sp>65535)throw new Error('Invalid Z80 CPU state');
    if(!Number.isInteger(data.border)||data.border<0||data.border>7)throw new Error('Invalid ZX border');
    let loadedTape=null;
    if(data.tape!==null){
      if(!data.tape||!Array.isArray(data.tape.blocks)||!Number.isInteger(data.tape.cursor)||data.tape.cursor<0||data.tape.cursor>data.tape.blocks.length||data.tape.blocks.length>32768)throw new Error('Invalid ZX tape metadata');
      let total=0;const blocks=data.tape.blocks.map(b=>{if(!Number.isInteger(b.flag)||b.flag<0||b.flag>255)throw new Error('Invalid tape flag');const payload=rt.base64ToBytes(b.payload,8*1024*1024);total+=payload.length;if(total>8*1024*1024)throw new Error('ZX tape exceeds 8 MiB');return Object.freeze({flag:b.flag,payload});});
      loadedTape={cursor:data.tape.cursor,blocks};
    }
    // Validate first, commit atomically for normal state files.
    const state=machine.cpu.getState();
    machine.cpu.setState(data.cpu);machine.mem.set(bytes,0x4000);machine._screen.border=data.border;
    machine._mdzxPaused=!!data.paused;paused=!!data.paused;tape=loadedTape;
    machine._screen.update(machine.mem,false);inspect();
    return state;
  }
  function readSNA(bytes){
    if(bytes.length!==49179)throw new Error('Only 48K SNA (49179 bytes) supported');
    const sp=bytes[0x17]|(bytes[0x18]<<8);
    if(sp<0x4000||sp>0xFFFE)throw new Error('SNA contains invalid PC stack pointer');
    machine.loadSNA(bytes);
    // SNA stores the actual PC on the stack. Restore directly instead of
    // executing RETN at ROM $0072 (which assumes the original Sinclair ROM).
    const state=machine.cpu.getState();
    state.pc=machine.mem[sp]|(machine.mem[sp+1]<<8);
    state.sp=(sp+2)&65535;
    // Canonical SNA recovery runs a RETN instruction. As we restore PC
    // directly (to work with OpenSE), reproduce RETN's IFF1 <- IFF2.
    state.iff1=state.iff2?1:0;
    state.iff2=state.iff1;
    state.halted=false;
    state.do_delayed_di=false;
    state.do_delayed_ei=false;
    machine.cpu.setState(state);
    machine._screen.update(machine.mem,false);
    inspect();
  }
  function stopMachine(){
    if(!machine)return;
    machine._mdzxDestroyed=true;
    machine._mdzxOnReady=null;
    machine._mdzxOnError=null;
    if(machine._mdzxRAF!=null)cancelAnimationFrame(machine._mdzxRAF);
    if(machine._sound){for(const name of ['sproc','hpfilter','lpfilter']){
      const part=machine._sound[name];
      if(part&&typeof part.disconnect==='function')try{part.disconnect();}catch(_){}
    }}
    machine=null;
  }
  function clearBootTimer(){if(bootTimer!==null){clearTimeout(bootTimer);bootTimer=null;}}
  function failBoot(message){
    clearBootTimer();booting=false;ready=false;paused=false;
    stopMachine();overlay.hidden=false;
    if(!disposed)say('ERROR: '+message);
  }
  function start(){
    if(disposed)return;
    if(ready){machine._mdzxPaused=false;paused=false;say('RUNNING · 48K');canvas.focus();return;}
    if(booting)return;
    booting=true;say('BOOTING · loading 16 KiB ROM');
    try{
      ensureCore();machine=new root.MinZX(canvas.id);
      if(romOverride)machine._mdzxRomBytes=romOverride.slice();
      // Trap standard ROM loader calls only (compatibility still unverified).
      const run=machine.cpu.run_instruction.bind(machine.cpu);
      machine.cpu.run_instruction=function(){
        if(tape&&trapLDBytes(machine,tape))return 10;
        return run();
      };
      const currentMachine=machine;
      machine._mdzxOnReady=()=>{
        if(disposed||!booting||machine!==currentMachine)return;
        clearBootTimer();booting=false;ready=true;paused=false;machine._mdzxPaused=false;
        overlay.hidden=true;
        try{
          if(pendingSNA){readSNA(pendingSNA);pendingSNA=null;}
          if(pendingJSON){applyJSONState(pendingJSON);pendingJSON=null;}
          say(paused?'PAUSED · JSON state restored':'RUNNING · ROM loaded · 48K');canvas.focus();
        }catch(e){say('ERROR: '+e.message);}
      };
      machine._mdzxOnError=(msg)=>{
        if(disposed||machine!==currentMachine)return;
        failBoot(String(msg));
      };
      bootTimer=setTimeout(()=>{if(booting&&machine===currentMachine)failBoot('ROM boot timed out after 15 s');},15000);
      machine.start();
    }catch(e){failBoot(e.message);}
  }
  // Accessible without fullscreen: recover ZX ROM loading when file:// blocks fetch.
  foot.appendChild(button('↑ ROM','Select a 16 KiB ROM locally',()=>input.click()));
  overlay.addEventListener('click',start);
  tools.appendChild(button('▶ Run','Resume emulator',start));
  tools.appendChild(button('Ⅱ Pause','Pause CPU',()=>{if(!ready)return;paused=true;machine._mdzxPaused=true;say('PAUSED · 48K');inspect();}));
  tools.appendChild(button('↳ Step','Single Z80 instruction',()=>{
    if(!ready)return;paused=true;machine._mdzxPaused=true;
    // Paused frame loop never executes CPU; only this deliberate step does.
    machine.cpu.run_instruction();
    machine._screen.update(machine.mem,false);inspect();say('STEP');
  }));
  tools.appendChild(button('↻ Reset','Reset CPU',()=>{if(ready){machine._keyb?.releaseAll();machine.reset();tape&&(tape.cursor=0);say('SOFT RESET');inspect();}}));
  tools.appendChild(button('↑ Load file','Open .sna/.tap/.rom/.scr file',()=>input.click()));
  tools.appendChild(button('↓ Save SNA','Download 48K snapshot',()=>{
    if(!ready)return say('START first');
    const bytes=machine.saveSNA();
    if(!bytes)return say('Cannot save SNA: stack pointer out of RAM');
    makeDownload('mdjs-48k.sna',Uint8Array.from(bytes));say('SNA saved');
  }));
  const pastePanel=element('details','mdzx-paste');
  const pasteSummary=element('summary','','Ruční vložení ROM Base64 nebo snapshotu JSON');pastePanel.appendChild(pasteSummary);
  const pasteInput=element('textarea','mdzx-paste-area');pasteInput.rows=4;pasteInput.placeholder='ROM Base64 nebo celý JSON snapshot';pastePanel.appendChild(pasteInput);
  pastePanel.appendChild(button('Načíst ROM Base64','Alternative when File API is unavailable',()=>{
    try{if(ready||booting)throw new Error('ROM can only be set before Start');
      const bytes=rt.base64ToBytes(pasteInput.value.replace(/\s/g,''),16384);
      if(bytes.length!==16384)throw new Error('ROM must be 16 KiB');romOverride=bytes;say('ROM loaded from Base64; press Start');}
    catch(e){say('ERROR: '+e.message);}
  }));
  pastePanel.appendChild(button('Načíst JSON text','Alternative when File API is unavailable',()=>{
    try{const doc=JSON.parse(pasteInput.value);rt.parseState(doc,'zx');
      if(ready){applyJSONState(doc);say('ZX JSON restored from pasted text');}
      else{pendingJSON=doc;say('ZX state queued; start with matching ROM');}}
    catch(e){say('ERROR: '+e.message);}
  }));work.appendChild(pastePanel);
  const jsonInput=element('input','mdzx-json-file');jsonInput.type='file';jsonInput.accept='.json,application/json';jsonInput.hidden=true;shell.appendChild(jsonInput);
  tools.appendChild(button('↓ Export JSON','Portable ZX CPU/RAM/tape state; ROM not included',async()=>{
    try{const json=exportJSONState(),res=await rt.workerJSON(json);rt.download('mdjs-zx48-v1.json',res.text);say('JSON exported ('+(res.worker?'Blob Worker':'JS fallback')+')');}
    catch(e){say('ERROR: '+e.message);}
  }));
  tools.appendChild(button('↑ Import JSON','Load a portable ZX snapshot',()=>jsonInput.click()));
  jsonInput.addEventListener('change',async()=>{
    const file=jsonInput.files&&jsonInput.files[0];jsonInput.value='';if(!file)return;
    try{const bytes=await rt.readFile(file,14*1024*1024),json=JSON.parse(new TextDecoder().decode(bytes));
      rt.parseState(json,'zx');if(ready){applyJSONState(json);say('ZX JSON state restored');}
      else{pendingJSON=json;say('ZX JSON queued; start ZX with matching ROM');}}
    catch(e){say('ERROR: '+e.message);}
  });
  tools.appendChild(button('Save browser','Save ZX to localStorage if allowed',()=>{
    try{const result=rt.saveLocal(ZX_KEY,exportJSONState());say(result.ok?'ZX state stored locally':'Storage denied: '+result.error+' · use Export JSON');}
    catch(e){say('ERROR: '+e.message);}
  }));
  tools.appendChild(button('Load browser','Restore optional localStorage state',()=>{
    try{const result=rt.loadLocal(ZX_KEY,'zx');if(!result.ok)throw new Error(result.error);
      const doc=rt.wrapState('zx',result.payload);if(ready){applyJSONState(doc);say('ZX browser state restored');}
      else{pendingJSON=doc;say('Saved ZX state queued; start ZX with matching ROM');}}
    catch(e){say('ERROR: '+e.message);}
  }));
  tools.appendChild(button('↓ Save SCR','Download ZX screen memory (6912 bytes)',()=>{
    if(!ready)return say('START first');
    makeDownload('mdjs-screen.scr',machine.mem.slice(0x4000,0x5B00));
    say('SCR saved');
  }));
  const scrHost=element('div','mdzx-scr-preview');work.appendChild(scrHost);
  function showSCR(bytes,label){
    if(!root.ZXScreenPreview)throw new Error('ZX-Screen.js missing');
    if(scrPreview)scrPreview.destroy();
    scrPreview=root.ZXScreenPreview.mount(scrHost,bytes,{name:label});
  }
  input.addEventListener('change',async()=>{
    const file=input.files&&input.files[0];input.value='';if(!file)return;
    if(file.size>LIMIT)return say('ERROR: file exceeds 8 MiB');
    const ext=file.name.split('.').pop().toLowerCase();
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(ext==='tap'){
        const blocks=readTAP(bytes);tape={blocks,cursor:0};
        say(`TAP mounted: ${blocks.length} blocks · type LOAD "" in BASIC`);
      }else if(ext==='sna'){
        if(bytes.length!==49179)throw new Error('Only 48K SNA (49179 bytes) supported');
        const sp=bytes[0x17]|(bytes[0x18]<<8);
        if(sp<0x4000||sp>0xFFFE)throw new Error('Invalid SNA stack pointer');
        if(ready){readSNA(bytes);say('SNA loaded: '+file.name);}
        else{pendingSNA=bytes;say('SNA queued until ROM ready');start();}
      }else if(ext==='rom'){
        if(bytes.length!==16384)throw new Error('ROM must be exactly 16 KiB');
        if(booting||ready)throw new Error('Select custom ROM before Start (reload page)');
        romOverride=bytes;say('Custom ROM selected · press Start');
      }else if(ext==='scr'){
        if(bytes.length!==6912)throw new Error('SCR must be exactly 6912 bytes');
        showSCR(bytes,file.name);
        if(ready){machine.mem.set(bytes,0x4000);machine._screen.update(machine.mem,false);}
        say('SCR displayed'+(ready?' and copied into ZX screen RAM':''));
      }else throw new Error('Unsupported format: '+ext);
    }catch(e){say('ERROR: '+e.message);}
  });
  const fullscreenBtn=button('⛶ Fullscreen Workbench','Fullscreen shows controls and debugger',async()=>{
    if(document.fullscreenElement===shell){try{await document.exitFullscreen();}catch(_){}}
    else if(fullFallback){fullFallback=false;shell.classList.remove('mdzx-full-fallback');}
    else if(shell.requestFullscreen){try{await shell.requestFullscreen();}catch(_){fullFallback=true;shell.classList.add('mdzx-full-fallback');}}
    else{fullFallback=true;shell.classList.add('mdzx-full-fallback');}
    canvas.focus();inspect();
  });
  // Only screen and subtle full-screen affordance appear in embedded state.
  foot.appendChild(fullscreenBtn);
  // Tiny native ASM editor, available only in fullscreen workbench.
  const ide=element('section','mdzx-ide');
  const ideTitle=element('h3','','Micro IDE · Z80 ASM Lite');
  const ideInfo=element('p','', 'Two-pass assembler. 32 KiB max, RAM $4000–FFFF, limited opcodes; no macros/imports.');
  const ideText=element('textarea','mdzx-asm-source');
  ideText.setAttribute('aria-label','Z80 assembler source');
  ideText.spellcheck=false;ideText.value='ORG $8000\nLD A, 2\nOUT (254), A\nLD HL, $4000\nLD A, 255\nLD (HL), A\nHALT';
  const ideResult=element('pre','mdzx-asm-result','Assemble code to RAM, then execute from ORG.');
  const compileBtn=button('⚙ Assemble + Run','Compile and execute Z80 assembly',()=>{
    if(!ready){ideResult.textContent='Start ZX and load ROM first';return;}
    if(!root.ZXASM){ideResult.textContent='ZX-ASM.js missing';return;}
    try{
      const out=root.ZXASM.assemble(ideText.value);
      machine._mdzxPaused=true;paused=true;
      machine.mem.set(out.bytes,out.origin);
      const s=machine.cpu.getState();s.pc=out.entry;machine.cpu.setState(s);
      machine._screen.update(machine.mem,false);
      ideResult.textContent='Assembled '+out.bytes.length+' bytes at $'+HEX(out.origin)+' · '+Object.keys(out.labels).length+' labels';
      machine._mdzxPaused=false;paused=false;say('RUNNING · ASM at $'+HEX(out.entry));canvas.focus();
    }catch(e){ideResult.textContent='ASM ERROR: '+e.message;}
  });
  ide.append(ideTitle,ideInfo,ideText,compileBtn,ideResult);
  tools.appendChild(info);work.appendChild(tools);work.appendChild(ide);
  const details=element('div','mdzx-details');details.appendChild(regs);details.appendChild(mem);work.appendChild(details);
  work.appendChild(readme);work.appendChild(log);shell.appendChild(work);
  host.appendChild(shell);
  shell.addEventListener('dragover',e=>e.preventDefault());
  shell.addEventListener('drop',async e=>{
    e.preventDefault();const file=e.dataTransfer&&e.dataTransfer.files[0];if(!file)return;
    // file input .files assignment unsupported in some browsers, so reuse File path manually.
    if(file.size>LIMIT)return say('ERROR: file exceeds 8 MiB');
    try{
      const bytes=new Uint8Array(await file.arrayBuffer());
      if(/\.tap$/i.test(file.name)){tape={blocks:readTAP(bytes),cursor:0};say('TAP mounted · LOAD ""');}
      else if(/\.sna$/i.test(file.name)&&bytes.length===49179){
        const sp=bytes[0x17]|(bytes[0x18]<<8);
        if(sp<0x4000||sp>0xFFFE)throw new Error('Invalid SNA stack pointer');
        if(ready){readSNA(bytes);say('SNA loaded');}
        else{pendingSNA=bytes;say('SNA queued until ROM ready');start();}
      }else if(/\.scr$/i.test(file.name)&&bytes.length===6912){
        showSCR(bytes,file.name);if(ready){machine.mem.set(bytes,0x4000);machine._screen.update(machine.mem,false);}
        say('SCR displayed');
      }else say('Unsupported media (.tap, .sna, .scr)');
    }catch(e){say('ERROR: '+e.message);}
  });
  const inspectTimer=setInterval(()=>{if(shell.isConnected&&document.fullscreenElement===shell&&machine)inspect();},500);
  return {shell,keyboardPanel,exportJSONState,applyJSONState,get machine(){return machine;},get state(){return disposed?'DESTROYED':(ready?(paused?'PAUSED':'RUNNING'):(booting?'BOOTING':'OFF'));},start,readTAP,
    unmount(){
      if(disposed)return;disposed=true;clearInterval(inspectTimer);
      if(scrPreview)scrPreview.destroy();
      clearBootTimer();stopMachine();
      shell.remove();host.dataset.mdzxMounted='false';
    }};
}
function enhance(container){
  const matches=Array.from(container.querySelectorAll('pre.md-code-syntax-lang-zx')).slice(0,8);
  matches.forEach(pre=>{const div=element('div','mdzx-document');pre.replaceWith(div);mount(div);});
  return matches.length;
}
const api=Object.freeze({readTAP,trapLDBytes,mount,enhance});
root.MDZX=api;
if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
