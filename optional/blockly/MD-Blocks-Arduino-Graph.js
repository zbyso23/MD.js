/* Arduino Graph for MD.js Ultra — a compact adaptation of the graph/pins/loose-chain
 * concepts from the supplied R-Type MD-Blocks Graph. Single source of truth:
 * existing MDBlocks program version 1. No eval, dependencies, WASM or modules. */
(function(root){'use strict';
 const specs={
 print:{text:'text'},set:{name:'text',value:'number'},change:{name:'text',delta:'number'},
 repeat:{count:'number'},if:{name:'text',op:['==','!=','<','<=','>','>='],value:'number'},
 pinMode:{pin:'pin',mode:['OUTPUT','INPUT','INPUT_PULLUP']},write:{pin:'pin',state:['HIGH','LOW']},
 delay:{ms:'number'},readDigital:{name:'text',pin:[2,3]},readAnalog:{name:'text',pin:['A0','A1']},
 map:{name:'text',source:'text',outMax:'number'},writeVar:{pin:'pin',name:'text'},
 pwm:{value:'variable'},servo:{value:'variable'},stepper:{steps:'number'}
 };
 const producers=new Set(['set','change','readDigital','readAnalog','map']);
 const consumers={map:['source'],if:['name'],writeVar:['name'],pwm:['value'],servo:['value']};
 const clone=x=>JSON.parse(JSON.stringify(x));
 function location(p,path){if(!Array.isArray(path)||!path.length)return null;
   let arr,part;if(path[0]==='loose'){arr=p.loose?.[path[1]];part=path.slice(2);}else{arr=p[path[0]];part=path.slice(1);}
   if(!Array.isArray(arr)||part.length<1)return null;
   for(let i=0;i<part.length;i+=2){const idx=part[i];if(!Number.isInteger(idx)||!arr[idx])return null;
     if(i===part.length-1)return {arr,index:idx,node:arr[idx]};
     if(part[i+1]!=='body')return null;arr=arr[idx].body;if(!Array.isArray(arr))return null;
   }return null;
 }
 function check(p){const valid=root.MDBlocks.validate(p);let count=valid.count;
   if(p.loose!==undefined){if(!Array.isArray(p.loose)||p.loose.length>256)throw Error('Invalid detached chains');
    for(const chain of p.loose){if(!Array.isArray(chain))throw Error('Invalid detached chain');
      const res=root.MDBlocks.validate({version:1,setup:chain,loop:[]});count+=res.count;if(count>256)throw Error('Graph exceeds block limit');
    }
   }
   function walk(nodes){for(const n of nodes){if(n.pos!==undefined&&(!Array.isArray(n.pos)||n.pos.length!==2||!n.pos.every(v=>Number.isFinite(v)&&Math.abs(v)<10000)))throw Error('Invalid graph coordinate');if(n.body)walk(n.body);}}
   walk(p.setup);walk(p.loop);for(const a of p.loose||[])walk(a);return p;
 }
 function transaction(p,fn){const q=clone(p);fn(q);return check(q);}
 function add(p,node,where){return transaction(p,q=>{if(!specs[node.type])throw Error('Unknown node type');
    if(where==='loose')(q.loose||(q.loose=[])).push([node]);else if(where==='setup'||where==='loop')q[where].push(node);else throw Error('Unknown scope');
 });}
 function connect(p,from,target){return transaction(p,q=>{
   const dst=location(q,target);if(!dst)throw Error('Missing target');
   const src=from.root?null:location(q,from.path);if(!from.root&&!src)throw Error('Missing source');
   const chain=dst.arr.slice(dst.index);
   function contains(n,v){return n===v||(n.body||[]).some(x=>contains(x,v));}
   if(src&&chain.some(n=>contains(n,src.node)))throw Error('Cycle is not allowed');
   const outlet=from.root?q[from.root]:from.port==='body'?src.node.body:src.arr;
   if(!Array.isArray(outlet))throw Error('Invalid execution pin');
   const at=from.root||from.port==='body'?0:src.index+1;
   if(dst.arr===outlet&&dst.index===at)return;
   dst.arr.splice(dst.index);
   const actual=src&&locationByRef(q,src.node);
   if(src&&!actual)throw Error('Disconnected source');
   const dest=from.root?q[from.root]:from.port==='body'?src.node.body:actual.arr;
   const pos=from.root||from.port==='body'?0:actual.index+1;
   const old=dest.splice(pos);
   if(old.length)(q.loose||(q.loose=[])).push(old);
   delete chain[0].pos;dest.push(...chain);if(q.loose)q.loose=q.loose.filter(x=>x.length);
 });}
 function locationByRef(p,node){let result=null;function scan(a){for(let i=0;i<a.length;i++){if(a[i]===node){result={arr:a,index:i};return;}if(a[i].body)scan(a[i].body);if(result)return;}}
   scan(p.setup);if(!result)scan(p.loop);for(const a of p.loose||[]){if(result)break;scan(a);}return result;
 }
 function detach(p,path){return transaction(p,q=>{if(path[0]==='loose')throw Error('Already detached');const l=location(q,path);if(!l)throw Error('Missing node');(q.loose||(q.loose=[])).push(l.arr.splice(l.index));});}
 function remove(p,path){return transaction(p,q=>{const l=location(q,path);if(!l)throw Error('Missing node');const [old]=l.arr.splice(l.index,1);
   if(old.body?.length)(q.loose||(q.loose=[])).push(old.body);if(q.loose)q.loose=q.loose.filter(x=>x.length);
 });}
 function edit(p,path,key,value){return transaction(p,q=>{const l=location(q,path);if(!l||!Object.hasOwn(specs[l.node.type],key))throw Error('Invalid parameter');
   const spec=specs[l.node.type][key];if(spec==='number')value=Number(value);
   if(spec==='pin'&&value!=='LED_BUILTIN'&&/^\d+$/.test(String(value)))value=Number(value);
   if(spec==='variable'&&/^-?\d+$/.test(String(value)))value=Number(value);
   if(Array.isArray(spec)){if(!spec.some(v=>String(v)===String(value)))throw Error('Invalid enum');if(typeof spec[0]==='number')value=Number(value);}
   l.node[key]=value;
 });}
 function linkData(p,srcPath,dstPath,key){return transaction(p,q=>{const a=location(q,srcPath)?.node,b=location(q,dstPath)?.node;
   if(!a||!b||!producers.has(a.type)||!(consumers[b.type]||[]).includes(key))throw Error('Incompatible data pins');
   b[key]=a.name; // Arduino's variable name is the typed connector: allows fan-out
 });}
 function reposition(p,path,x,y){return transaction(p,q=>{const l=location(q,path);if(!l)throw Error('Missing node');l.node.pos=[Math.max(-9500,Math.min(9500,Math.round(x))),Math.max(-9500,Math.min(9500,Math.round(y)))];});}
 function layout(p){const nodes=[],links=[],outVars=new Map();let height=0,width=0;
  function section(name,arr,prefix,x,y){const r={kind:'root',name,x,y,w:174,h:50};nodes.push(r);
    function branch(a,base,x,y,previous){let first=null,cursor=y;
      for(let i=0;i<a.length;i++){const n=a[i],path=base.concat(i),it={kind:'node',path,node:n,x:n.pos?.[0]??x,y:n.pos?.[1]??cursor,w:224,h:Math.max(90,42+Object.keys(specs[n.type]||{}).length*29),scope:name};
        nodes.push(it);if(!first)first=it;if(previous)links.push({kind:'exec',from:previous,to:it});previous=it;
        if(producers.has(n.type)){if(!outVars.has(n.name))outVars.set(n.name,[]);outVars.get(n.name).push(it);}
        cursor+=it.h+28;
        if(n.body){const inner=branch(n.body,path.concat('body'),x+280,cursor,null);if(inner.first)links.push({kind:'body',from:it,to:inner.first});cursor=Math.max(cursor,inner.bottom+14);}
        width=Math.max(width,it.x+it.w);height=Math.max(height,it.y+it.h);
      }return {first,bottom:cursor};
    }
    const result=branch(arr,prefix,x,y+75,null);if(result.first)links.push({kind:'root',from:r,to:result.first});width=Math.max(width,x+r.w);height=Math.max(height,result.bottom);
  }
  section('setup',p.setup,['setup'],55,32);section('loop',p.loop,['loop'],720,32);
  const looseX=Math.max(width+70,1260);
  (p.loose||[]).forEach((arr,i)=>section('loose:'+i,arr,['loose',i],looseX,i*195+32));
  for(const it of nodes){if(it.kind==='root')continue;for(const f of consumers[it.node.type]||[]){const v=it.node[f];if(typeof v==='string')for(const src of outVars.get(v)||[])if(src!==it)links.push({kind:'data',from:src,to:it,field:f});}}
  return {nodes,links,width:width+100,height:height+100};
 }
 const model=Object.freeze({specs,producers,consumers,clone,check,add,connect,detach,remove,edit,linkData,reposition,layout,location});
 function planTrace(trace,pace){const groups=[];let g=null;for(const e of trace){if(e.kind==='node'){g={time:e.time,events:[e],dwellMs:pace,path:e.path};groups.push(g);}
   else if(g)g.events.push(e);else {g={time:e.time,events:[e],dwellMs:pace,path:null};groups.push(g);}}
   if(groups.length)groups[groups.length-1].dwellMs=0;return groups;
 }
 function mount(host,api){const create=(tag,cl,txt)=>{const n=document.createElement(tag);if(cl)n.className=cl;if(txt!==undefined)n.textContent=txt;return n;};
   const bar=create('div','ag-bar'),vp=create('div','ag-vp'),world=create('div','ag-world'),wires=document.createElementNS('http://www.w3.org/2000/svg','svg'),cards=create('div','ag-cards'),msg=create('div','ag-msg','Klikni na výstup ▶ a poté na vstup ◀.'),
    where=create('select'),kind=create('select');wires.classList.add('ag-wires');world.append(wires,cards);vp.append(world);host.append(bar,vp,msg);vp.tabIndex=0;
   let zoom=.82,px=12,py=12,graph=null,pending=null,active=null;
   function option(sel,value,title){const o=create('option',null,title);o.value=value;sel.append(o);}
   for(const [v,t] of [['loop','LOOP'],['setup','SETUP'],['loose','Volně']])option(where,v,t);
   for(const [v,t] of Object.entries(api.labels))option(kind,v,t);kind.value='write';
   const button=(title,fn,cls='')=>{const b=create('button',cls,title);b.type='button';b.addEventListener('click',fn);return b;};
   function notice(s,err){msg.textContent=s;msg.classList.toggle('bad',!!err);}
   function commit(fn){try{api.commit(fn());pending=null;notice('✓ Aktualizováno v Blocks, simulátoru i exportu.');}catch(e){notice('✕ '+e.message,true);}}
   function translate(){world.style.transform=`translate(${px}px,${py}px) scale(${zoom})`;}
   function zoomBy(f){zoom=Math.max(.30,Math.min(1.35,zoom*f));translate();}
   function fit(){if(!graph)return;const r=vp.getBoundingClientRect();zoom=Math.max(.3,Math.min(1,(r.width-35)/graph.width,(r.height-35)/graph.height));px=15;py=15;translate();}
   bar.append(create('strong',null,'◆ Graph'),where,kind,button('▢ Nový',()=>commit(()=>({version:1,setup:[],loop:[]}))),button('＋ Uzel',()=>commit(()=>model.add(api.get(),api.defaults[kind.value](),where.value))),button('−',()=>zoomBy(1/1.2)),button('+',()=>zoomBy(1.2)),button('⤢ Fit',fit),button('× Spojení',()=>{pending=null;notice('Napojování zrušeno.');}));
   function linkOutput(src,port,label){const b=button(label,()=>{pending=src;notice('Vyber vstupní pin ◀ cílového uzlu.');},'ag-pin ag-exec');if(port==='body')b.classList.add('ag-body');return b;}
   function fields(it,box){const n=it.node;for(const [key,spec] of Object.entries(model.specs[n.type])){
      const row=create('label','ag-field'),label=create('span',null,key),ctl=Array.isArray(spec)||spec==='pin'?create('select'):create('input');
      if(ctl.tagName==='SELECT'){for(const v of spec==='pin'?['LED_BUILTIN',2,3,4,5,6,7,8,9,10,11,12,13]:spec)option(ctl,v,String(v));ctl.value=String(n[key]);}
      else{ctl.type=spec==='number'?'number':'text';ctl.maxLength=500;ctl.value=String(n[key]);}
      ctl.setAttribute('aria-label',n.type+' '+key);ctl.addEventListener('change',()=>commit(()=>model.edit(api.get(),it.path,key,ctl.value)));
      ctl.addEventListener('pointerdown',e=>e.stopPropagation());ctl.addEventListener('keydown',e=>e.stopPropagation());
      if((model.consumers[n.type]||[]).includes(key)){const input=button('◀',()=>{if(pending?.kind!=='data')return notice('Nejprve vyber datový výstup ●.',true);
         commit(()=>model.linkData(api.get(),pending.path,it.path,key));},'ag-pin ag-data');input.title='Datový vstup '+key;row.append(input);}
      row.append(label,ctl);box.append(row);
    }}
   function drawNode(it){const isRoot=it.kind==='root',n=it.node,box=create('div','ag-node '+(isRoot?'ag-root':it.scope.startsWith('loose')?'ag-loose':n.type==='if'||n.type==='repeat'?'ag-logic':'ag-stmt'));
     box.style.left=it.x+'px';box.style.top=it.y+'px';box.style.width=it.w+'px';box.style.minHeight=it.h+'px';if(!isRoot)box.dataset.path=JSON.stringify(it.path);
     const head=create('div','ag-head');if(isRoot){head.append(create('b',null,it.name==='setup'?'▶ SETUP':it.name==='loop'?'↻ LOOP':'⎋ VOLNÉ UZLY'));
       if(it.name==='setup'||it.name==='loop')head.append(linkOutput({kind:'exec',root:it.name},null,'▶'));box.append(head);return box;}
     const inPin=button('◀',()=>{if(pending?.kind!=='exec')return notice('Nejprve vyber řídicí výstup ▶.',true);commit(()=>model.connect(api.get(),pending,it.path));},'ag-pin ag-exec');head.append(inPin);
     head.append(create('strong','ag-name',api.labels[n.type]||n.type));head.append(linkOutput({kind:'exec',path:it.path,port:'next'},null,'▶'));
     if(Array.isArray(n.body))head.append(linkOutput({kind:'exec',path:it.path,port:'body'},'body','⤷'));
     if(model.producers.has(n.type))head.append(button('●',()=>{pending={kind:'data',path:it.path};notice('Propoj proměnnou '+n.name+' na barevný vstup ◀. Lze použít více příjemců.');},'ag-pin ag-data'));
     const more=button('⋯',()=>{const a=box.querySelector('.ag-actions');a.hidden=!a.hidden;},'ag-more');head.append(more);box.append(head);
     const content=create('div','ag-fields');fields(it,content);box.append(content);
     const actions=create('div','ag-actions');actions.hidden=true;actions.append(button('Odpojit',()=>commit(()=>model.detach(api.get(),it.path))),button('Smazat',()=>commit(()=>model.remove(api.get(),it.path))));box.append(actions);
     head.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;e.preventDefault();let startX=e.clientX,startY=e.clientY;head.setPointerCapture(e.pointerId);
       const mv=v=>{box.style.left=(it.x+(v.clientX-startX)/zoom)+'px';box.style.top=(it.y+(v.clientY-startY)/zoom)+'px';};
       const done=v=>{head.removeEventListener('pointermove',mv);head.removeEventListener('pointerup',done);head.removeEventListener('pointercancel',done);
         if(v.type==='pointercancel')return;const dx=(v.clientX-startX)/zoom,dy=(v.clientY-startY)/zoom;if(Math.hypot(dx,dy)>5)commit(()=>model.reposition(api.get(),it.path,it.x+dx,it.y+dy));};
       head.addEventListener('pointermove',mv);head.addEventListener('pointerup',done);head.addEventListener('pointercancel',done);
     });return box;
   }
   function point(it,out,k){return it.kind==='root'?[it.x+it.w,it.y+25]:k==='data'?(out?[it.x+it.w,it.y+25]:[it.x,it.y+67]):[out?it.x+it.w:it.x,it.y+23];}
   function draw(){graph=model.layout(api.get());cards.replaceChildren();wires.replaceChildren();const w=Math.max(1300,graph.width),h=Math.max(680,graph.height);world.style.width=w+'px';world.style.height=h+'px';wires.setAttribute('viewBox',`0 0 ${w} ${h}`);wires.setAttribute('width',w);wires.setAttribute('height',h);
      for(const l of graph.links){const a=point(l.from,true,l.kind),b=point(l.to,false,l.kind),line=document.createElementNS('http://www.w3.org/2000/svg','path'),bend=Math.max(40,Math.abs(a[0]-b[0])*.42);
        line.setAttribute('d',`M${a[0]},${a[1]} C${a[0]+bend},${a[1]} ${b[0]-bend},${b[1]} ${b[0]},${b[1]}`);line.setAttribute('class','ag-wire '+(l.kind==='data'?'ag-dwire':'ag-ewire'));wires.append(line);}
      for(const it of graph.nodes)cards.append(drawNode(it));highlight(active);translate();
   }
   function highlight(path){active=path;cards.querySelectorAll('.ag-active').forEach(el=>el.classList.remove('ag-active'));if(path){const e=[...cards.querySelectorAll('[data-path]')].find(x=>x.dataset.path===JSON.stringify(path));if(e)e.classList.add('ag-active');}}
   vp.addEventListener('wheel',e=>{e.preventDefault();const b=vp.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top,wx=(x-px)/zoom,wy=(y-py)/zoom;zoomBy(e.deltaY>0?.9:1.1);px=x-wx*zoom;py=y-wy*zoom;translate();},{passive:false});
   vp.addEventListener('pointerdown',e=>{if(e.button!==0||![vp,world,cards,wires].includes(e.target))return;const sx=e.clientX,sy=e.clientY,x=px,y=py;vp.setPointerCapture(e.pointerId);
      const move=v=>{px=x+v.clientX-sx;py=y+v.clientY-sy;translate();},end=()=>{vp.removeEventListener('pointermove',move);vp.removeEventListener('pointerup',end);vp.removeEventListener('pointercancel',end);};vp.addEventListener('pointermove',move);vp.addEventListener('pointerup',end);vp.addEventListener('pointercancel',end);
   });
   vp.addEventListener('keydown',e=>{if(e.key==='Escape'){pending=null;notice('Spojení zrušeno.');}if(e.key==='0'){fit();e.preventDefault();}});
   draw();return Object.freeze({refresh:draw,highlight,fit});
 }
 root.MDBlocksArduinoGraph=Object.freeze({model,mount,planTrace});
})(typeof globalThis!=='undefined'?globalThis:this);
