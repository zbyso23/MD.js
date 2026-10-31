const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};ctx.globalThis=ctx;vm.createContext(ctx);
for(const name of ['MD-Blocks.js','MD-Blocks-Arduino-Graph.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx,{filename:name});
const B=ctx.MDBlocks,G=ctx.MDBlocksArduinoGraph.model,V=ctx.MDBlocksArduinoGraph,plain=x=>JSON.parse(JSON.stringify(x));
const empty=()=>({version:1,setup:[],loop:[]});
test('empty graph -> valid Arduino SETUP/LOOP and same JS/Py/C++',()=>{
 let p=empty();p=G.add(p,{type:'pinMode',pin:13,mode:'OUTPUT'},'setup');p=G.add(p,{type:'write',pin:13,state:'HIGH'},'loop');p=G.add(p,{type:'delay',ms:1000},'loop');
 assert.equal(B.validate(p).count,3);assert.match(B.generate(p,'arduino'),/digitalWrite\(13, HIGH\)/);assert.match(B.generate(p,'python'),/digitalWrite\(13, "HIGH"\)/);
 assert.equal(B.simulate(p,1).virtualTimeMs,1000);assert.equal(G.layout(p).nodes.filter(n=>n.kind==='node').length,3);
});
test('free nodes ignored until connected to root/flow; preserve AST',()=>{
 let p=G.add(empty(),{type:'readAnalog',name:'pot',pin:'A0'},'loose');p=G.add(p,{type:'map',name:'level',source:'pot',outMax:255},'loose');
 assert.equal(B.simulate(p,1).trace.length,0);
 p=G.connect(p,{root:'loop'},['loose',0,0]);p=G.connect(p,{path:['loop',0],port:'next'},['loose',0,0]);
 assert.equal(p.loop.length,2);assert.equal(p.loose.length,0);assert.equal(B.simulate(p,1,{analog:{A0:1023}}).variables.level,255);
});
test('graph fanout one variable to PWM + servo; real runtime and C++ exporter',()=>{
 let p={version:1,setup:[],loop:[{type:'readAnalog',name:'pot',pin:'A0'},{type:'map',name:'level',source:'pot',outMax:180},{type:'servo',pin:10,value:90},{type:'pwm',pin:9,value:128}]};
 p=G.linkData(p,['loop',1],['loop',2],'value');p=G.linkData(p,['loop',1],['loop',3],'value');
 const r=B.simulate(p,1,{analog:{A0:1023}});assert.equal(r.actuators.servo,180);assert.equal(r.actuators.pwm,180);
 assert.match(B.generate(p,'arduino'),/servoMotor.write\(level\)/);assert.match(B.generate(p,'javascript'),/analogWrite\(9, level\)/);
});
test('nest repeat body, reject cycle and invalid node edits atomically',()=>{
 let p={version:1,setup:[],loop:[{type:'repeat',count:2,body:[]}]};p=G.add(p,{type:'write',pin:13,state:'LOW'},'loose');
 p=G.connect(p,{path:['loop',0],port:'body'},['loose',0,0]);assert.equal(p.loop[0].body.length,1);
 const snapshot=JSON.stringify(p);assert.throws(()=>G.connect(p,{path:['loop',0,'body',0],port:'next'},['loop',0]),/Cycle/);
 assert.throws(()=>G.edit(p,['loop',0],'count',1001),/range/);
 assert.equal(JSON.stringify(p),snapshot);
});
test('connecting root parks displaced branch; detach preserves unexecuted nodes',()=>{
 let p={version:1,setup:[{type:'print',text:'old'}],loop:[]};p=G.add(p,{type:'print',text:'new'},'loose');
 p=G.connect(p,{root:'setup'},['loose',0,0]);assert.equal(p.setup[0].text,'new');assert.equal(p.loose[0][0].text,'old');
 p=G.detach(p,['setup',0]);assert.equal(p.setup.length,0);assert.equal(p.loose.length,2);
});
test('graph coordinate is layout-only, imports invalid detached branches rejected',()=>{
 let p={version:1,setup:[],loop:[{type:'write',pin:13,state:'HIGH'}]};const source=B.generate(p,'arduino');
 const next=G.reposition(p,['loop',0],500,200);assert.equal(B.generate(next,'arduino'),source);assert.equal(p.loop[0].pos,undefined);
 let broken=empty();broken.loose=[[{type:'write',pin:20,state:'LOW'}]];assert.throws(()=>G.check(broken));
 broken=empty();broken.loose=Array.from({length:257},()=>[]);assert.throws(()=>G.check(broken));
});
test('live execution follows individual graph nodes even at same virtual timestamp',()=>{
 const p={version:1,setup:[],loop:[{type:'write',pin:13,state:'HIGH'},{type:'write',pin:13,state:'LOW'}]};
 assert.equal(B.simulate(p,1).trace.some(e=>e.kind==='node'),false);
 const trace=B.simulate(p,1,{traceNodes:true}).trace,groups=V.planTrace(trace,1200);
 assert.equal(groups.length,2);assert.deepEqual(plain(groups[0].path),['loop',0]);assert.deepEqual(plain(groups[1].path),['loop',1]);
 assert.equal(groups[0].events[1].state,'HIGH');assert.equal(groups[1].events[1].state,'LOW');
});

test('detached print/servo/stepper never add Arduino dependencies or code',()=>{
 let p={version:1,setup:[],loop:[]};const baseline=B.generate(p,'arduino');
 for(const n of [{type:'print',text:'UNEXECUTED'},{type:'servo',pin:10,value:90},{type:'stepper',steps:5}])p=G.add(p,n,'loose');
 assert.equal(B.generate(p,'arduino'),baseline);assert.equal(B.simulate(p,1).trace.length,0);
});
