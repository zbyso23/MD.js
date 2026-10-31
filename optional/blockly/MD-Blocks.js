/* MD.js Ultra / Blocks Lite v0.2 | independent optional environment | MIT */
(function (root) {
  'use strict';
  const TYPE = new Set(['print','set','change','repeat','if','pinMode','write','delay','readDigital','readAnalog','map','writeVar','pwm','servo','stepper']);
  const OPERATORS = new Set(['==','!=','<','<=','>','>=']);
  const MODES = new Set(['OUTPUT','INPUT','INPUT_PULLUP']);
  const STATES = new Set(['HIGH','LOW']);
  const RESERVED = new Set(['analogRead','digitalRead','analogWrite','servoWrite','stepperMove','mapValue','servoMotor','Serial1','A0','A1','constructor','prototype','__proto__','setup','loop','pinMode','digitalWrite','delay','Serial','console','board','millis','print','println','HIGH','LOW','INPUT','OUTPUT','INPUT_PULLUP','true','false','null','undefined']);
  const LIMITS = Object.freeze({nodes:256, depth:12, steps:15000, iterations:10, text:500, virtualMs:600000});
  function fail(s) {throw new Error(s);}
  function num(v, low, high, label) {if (!Number.isInteger(v) || v < low || v > high) fail(label + ': out of range'); return v;}
  function str(v, max, label) {if (typeof v !== 'string' || v.length > max) fail(label + ': invalid text');return v;}
  function variable(v) {str(v,40,'variable');if(!/^[A-Za-z_][A-Za-z_0-9]*$/.test(v) || RESERVED.has(v))fail('Invalid variable name: '+v);return v;}
  function pin(v) {if(v === 'LED_BUILTIN') return v; return num(v,0,19,'pin');}
  function literalOrVar(v,low,high,label){ return typeof v === 'string' ? variable(v) : num(v,low,high,label); }
  function plain(o) { if (!o || typeof o !== 'object' || Array.isArray(o)) return false; const proto = Object.getPrototypeOf(o); return proto === null || Object.getPrototypeOf(proto) === null; }
  function validate(program) {
    if (!plain(program) || program.version !== 1) fail('Invalid program/version');
    let count = 0; const variables = new Set();
    function visit(nodes, depth) {
      if(!Array.isArray(nodes) || depth > LIMITS.depth) fail('Invalid block nesting');
      for(const n of nodes) {
        if(!plain(n) || !TYPE.has(n.type))fail('Unsupported block type');
        count++;if(count>LIMITS.nodes) fail('Too many blocks');
        switch(n.type) {
          case 'print': str(n.text,LIMITS.text,'print');break;
          case 'set': variable(n.name);variables.add(n.name);num(n.value,-1000000,1000000,'value');break;
          case 'change': variable(n.name);variables.add(n.name);num(n.delta,-1000000,1000000,'delta');break;
          case 'repeat': num(n.count,0,1000,'repeat count');visit(n.body,depth+1);break;
          case 'if': variable(n.name);variables.add(n.name);if(!OPERATORS.has(n.op))fail('Invalid comparison');num(n.value,-1000000,1000000,'if value');visit(n.body,depth+1);break;
          case 'pinMode': pin(n.pin);if(!MODES.has(n.mode))fail('Invalid pin mode');break;
          case 'write': pin(n.pin);if(!STATES.has(n.state))fail('Invalid pin state');break;
          case 'delay': num(n.ms,0,60000,'delay');break;
          case 'readDigital': if(n.pin!==2 && n.pin!==3)fail('Read digital: D2 or D3 only');variable(n.name);variables.add(n.name);break;
          case 'readAnalog': if(n.pin!=='A0' && n.pin!=='A1')fail('Read analog: A0 or A1 only');variable(n.name);variables.add(n.name);break;
          case 'map': variable(n.name);variables.add(n.name);variable(n.source);variables.add(n.source);num(n.outMax,1,1023,'map upper bound');break;
          case 'writeVar': pin(n.pin);variable(n.name);variables.add(n.name);break;
          case 'pwm': if(n.pin!==9)fail('PWM output must be D9');literalOrVar(n.value,0,255,'PWM value');if(typeof n.value==='string')variables.add(n.value);break;
          case 'servo': if(n.pin!==10)fail('Servo output must be D10');literalOrVar(n.value,0,180,'Servo angle');if(typeof n.value==='string')variables.add(n.value);break;
          case 'stepper': num(n.steps,-200,200,'Stepper steps');break;
        }
      }
    }
    visit(program.setup,0);visit(program.loop,0);
    return { count, variables:Array.from(variables).sort() };
  }
  const pstr = p => p === 'LED_BUILTIN' ? p : String(p);
  const expr = v => typeof v === 'string' ? v : String(v);
  function statements(nodes, dialect, depth) {
    const isPy = dialect === 'python';
    const i = (isPy ? '    ' : '  ').repeat(depth), out = [];
    function send(v){out.push(i + v);}
    for(const n of nodes){
      switch(n.type){
        case 'print':send(isPy ? `print(${JSON.stringify(n.text)})` : dialect === 'arduino' ? `Serial.println(${JSON.stringify(n.text)});` : `console.log(${JSON.stringify(n.text)});`);break;
        case 'set':send(isPy ? `${n.name} = ${n.value}` : `${n.name} = ${n.value};`);break;
        case 'change':send(isPy ? `${n.name} += ${n.delta}` : `${n.name} += ${n.delta};`);break;
        case 'delay':send(isPy ? `delay(${n.ms})` : `delay(${n.ms});`);break;
        case 'readDigital':send(`${n.name} = digitalRead(${n.pin})${isPy?'':';'}`);break;
        case 'readAnalog':send(`${n.name} = analogRead(${n.pin})${isPy?'':';'}`);break;
        case 'map':send(`${n.name} = ${dialect==='arduino'?'map': 'mapValue'}(${n.source}, 0, 1023, 0, ${n.outMax})${isPy?'':';'}`);break;
        case 'writeVar':send(isPy ? `digitalWrite(${pstr(n.pin)}, 'HIGH' if ${n.name} else 'LOW')` : `digitalWrite(${pstr(n.pin)}, ${n.name} ? ${dialect==='arduino'?'HIGH':'"HIGH"'} : ${dialect==='arduino'?'LOW':'"LOW"'});`);break;
        case 'pwm':send(isPy ? `analogWrite(9, ${expr(n.value)})` : `analogWrite(9, ${expr(n.value)});`);break;
        case 'servo':send(isPy ? `servoWrite(10, ${expr(n.value)})` : dialect==='arduino' ? `servoMotor.write(${expr(n.value)});` : `servoWrite(10, ${expr(n.value)});`);break;
        case 'stepper':send(isPy ? `stepperMove(${n.steps})` : `stepperMove(${n.steps});`);break;
        case 'pinMode':send(isPy ? `pinMode(${pstr(n.pin)}, ${JSON.stringify(n.mode)})` : `pinMode(${pstr(n.pin)}, ${dialect==='arduino'?n.mode:JSON.stringify(n.mode)});`);break;
        case 'write':send(isPy ? `digitalWrite(${pstr(n.pin)}, ${JSON.stringify(n.state)})` : `digitalWrite(${pstr(n.pin)}, ${dialect==='arduino'?n.state:JSON.stringify(n.state)});`);break;
        case 'repeat':{
          const h=isPy ? `for _block_i${depth} in range(${n.count}):` : `for (let _block_i${depth} = 0; _block_i${depth} < ${n.count}; _block_i${depth}++) {`;
          send(h);const body=statements(n.body,dialect,depth+1);out.push(body||((isPy ? '    ' : '  ').repeat(depth+1)+(isPy?'pass':'// empty')));if(!isPy)send('}');break;}
        case 'if':{
          send(isPy ? `if ${n.name} ${n.op} ${n.value}:` : `if (${n.name} ${dialect==='arduino'&&n.op==='=='?'==':n.op} ${n.value}) {`);
          out.push(statements(n.body,dialect,depth+1)||((isPy ? '    ' : '  ').repeat(depth+1)+(isPy?'pass':'// empty')));if(!isPy)send('}');break;}
      }
    }
    return out.join('\n');
  }
  function generate(program,dialect) {
    const {variables} = validate(program);
    if(!['javascript','python','arduino'].includes(dialect)) fail('Unknown generator');
    if(dialect === 'arduino'){
      const vars=variables.map(v=>`long ${v} = 0;`).join('\n');
      const json=JSON.stringify(program);
      const prints=json.includes('"type":"print"');
      const usesServo=json.includes('"type":"servo"');
      const usesStepper=json.includes('"type":"stepper"');
      const servoHeader=usesServo?'#include <Servo.h>\nServo servoMotor;\n':'';
      const stepperHelper=usesStepper?`// Four-wire unipolar motor via a proper driver (e.g. ULN2003), never direct from GPIO.\nconst int motorPins[4] = {4,5,6,7};\nlong motorPosition = 0;\nvoid stepperMove(int steps) {\n  const byte phase[4][4] = {{1,0,0,0},{0,1,0,0},{0,0,1,0},{0,0,0,1}};\n  for (int s = 0; s < abs(steps); s++) {\n    motorPosition += steps > 0 ? 1 : -1;\n    int idx = ((motorPosition % 4) + 4) % 4;\n    for (int c = 0; c < 4; c++) digitalWrite(motorPins[c], phase[idx][c] ? HIGH : LOW);\n    delay(10);\n  }\n}\n`:'';
      return `// Arduino sketch — export only; compile with Arduino toolchain\n${servoHeader}${vars}\n${stepperHelper}void setup() {\n${prints?'  Serial.begin(9600);\n':''}${usesServo?'  servoMotor.attach(10);\n':''}${usesStepper?'  for (int p = 4; p <= 7; p++) pinMode(p, OUTPUT);\n':''}${statements(program.setup,'arduino',1)}\n}\n\nvoid loop() {\n${statements(program.loop,'arduino',1)}\n}\n`;
    }
    if(dialect === 'javascript'){
      const vars=variables.map(v=>`let ${v} = 0;`).join('\n');
      return `// JS simulation — this source is NOT executed by the Blocks Lite preview\nconst board = { pins: Object.create(null), timeMs: 0 };\nconst LED_BUILTIN = 13;\nconst A0 = 'A0', A1 = 'A1';\nfunction pinMode(pin, mode) { if (!board.pins[pin]) board.pins[pin] = {mode: 'INPUT', state:'LOW'}; board.pins[pin].mode = mode; }\nfunction digitalWrite(pin, state) { if (!board.pins[pin]) board.pins[pin] = {mode:'OUTPUT', state:'LOW'}; board.pins[pin].state = state; console.log('PIN', pin, state); }\nfunction delay(ms) { board.timeMs += ms; }
function digitalRead(pin) { return Number((board.pins[pin] || {}).input || 0); }
function analogRead(pin) { return Number((board.pins[pin] || {}).analog || 0); }
function mapValue(x,a,b,c,d) { return Math.trunc((x-a)*(d-c)/(b-a)+c); }
function analogWrite(pin, value) { board.pins[pin] = {pwm:value}; }
function servoWrite(pin, angle) { board.pins[pin] = {servo:angle}; }
function stepperMove(steps) { board.stepperPosition = (board.stepperPosition || 0) + steps; }
${vars}\nfunction setup() {\n${statements(program.setup,'javascript',1)}\n}\nfunction loop() {\n${statements(program.loop,'javascript',1)}\n}\nsetup();\nfor (let cycle = 0; cycle < 3; cycle++) loop();\n`;
    }
    const vars=variables.map(v=>`${v} = 0`).join('\n');
    const globals=variables.length?'    global '+variables.join(', ')+'\n':'';
    return `# Python 3 simulation — export only, not run inside the browser\nLED_BUILTIN = 13\npins = {}\nvirtual_time_ms = 0\ndef pinMode(pin, mode):\n    pins.setdefault(pin, {})['mode'] = mode\ndef digitalWrite(pin, state):\n    pins.setdefault(pin, {})['state'] = state\n    print('PIN', pin, state)\ndef delay(ms):
    global virtual_time_ms
    virtual_time_ms += ms
def digitalRead(pin):
    return int(pins.get(pin, {}).get('input', 0))
def analogRead(pin):
    return int(pins.get(pin, {}).get('analog', 0))
def mapValue(x,a,b,c,d):
    return int((x-a)*(d-c)/(b-a)+c)
def analogWrite(pin,value):
    pins.setdefault(pin,{})['pwm'] = value
def servoWrite(pin,angle):
    pins.setdefault(pin,{})['servo'] = angle
def stepperMove(steps):
    global stepper_position
    stepper_position += steps
stepper_position = 0
A0 = 'A0'
A1 = 'A1'
${vars}\ndef setup():\n${globals}${statements(program.setup,'python',1)||'    pass'}\ndef loop():\n${globals}${statements(program.loop,'python',1)||'    pass'}\nsetup()\nfor cycle in range(3):\n    loop()\n`;
  }
  function simulate(program, cycles, environment = {}) {
    validate(program);num(cycles,0,LIMITS.iterations,'simulation cycles');
    const vars=Object.create(null), pinStates=Object.create(null), trace=[];
    if(!plain(environment))fail('Invalid environment');
    const digital=environment.digital || {},analog=environment.analog || {};
    if(!plain(digital)||!plain(analog))fail('Invalid sensor input');
    const d2=num(digital[2]===undefined?0:digital[2],0,1,'button'), d3=num(digital[3]===undefined?0:digital[3],0,1,'switch');
    const a0=num(analog.A0===undefined?512:analog.A0,0,1023,'potentiometer');
    const a1=num(analog.A1===undefined?0:analog.A1,0,1023,'microphone');
    const actuators={pwm:0,servo:90,stepper:0};
    let now=0, steps=0;
    function step(){if(++steps>LIMITS.steps)fail('Step budget exceeded');}
    function val(v){return vars[v]||0;}
    function resolve(v){return typeof v === 'string' ? val(v) : v;}
    function event(e){trace.push({time:now,...e});}
    function visit(nodes){for(const n of nodes){step();switch(n.type){
      case 'print':trace.push({time:now,kind:'print',text:n.text});break;
      case 'set':vars[n.name]=n.value;trace.push({time:now,kind:'var',name:n.name,value:vars[n.name]});break;
      case 'change':vars[n.name]=val(n.name)+n.delta;if(!Number.isSafeInteger(vars[n.name]))fail('Integer overflow');trace.push({time:now,kind:'var',name:n.name,value:vars[n.name]});break;
      case 'readDigital':vars[n.name]=n.pin===2?d2:d3;event({kind:'sensor',name:n.name,value:vars[n.name],source:'D'+n.pin});break;
      case 'readAnalog':vars[n.name]=n.pin==='A0'?a0:a1;event({kind:'sensor',name:n.name,value:vars[n.name],source:n.pin});break;
      case 'map':vars[n.name]=Math.trunc(val(n.source)*n.outMax/1023);event({kind:'var',name:n.name,value:vars[n.name]});break;
      case 'writeVar':{const state=val(n.name)?'HIGH':'LOW';pinStates[String(n.pin)]=state;event({kind:'write',pin:String(n.pin),state});break;}
      case 'pwm':actuators.pwm=num(Math.max(0,Math.min(255,resolve(n.value))),0,255,'PWM');event({kind:'pwm',pin:9,value:actuators.pwm});break;
      case 'servo':actuators.servo=num(Math.max(0,Math.min(180,resolve(n.value))),0,180,'servo');event({kind:'servo',pin:10,value:actuators.servo});break;
      case 'stepper':actuators.stepper+=n.steps;event({kind:'stepper',steps:n.steps,position:actuators.stepper});break;
      case 'pinMode':trace.push({time:now,kind:'mode',pin:String(n.pin),mode:n.mode});break;
      case 'write':pinStates[String(n.pin)]=n.state;trace.push({time:now,kind:'write',pin:String(n.pin),state:n.state});break;
      case 'delay':now+=n.ms;if(now>LIMITS.virtualMs)fail('Virtual time budget exceeded');break;
      case 'repeat':for(let t=0;t<n.count;t++){step();visit(n.body);}break;
      case 'if':{const a=val(n.name),b=n.value;const ok=n.op==='=='?a===b:n.op==='!='?a!==b:n.op==='<'?a<b:n.op==='<='?a<=b:n.op==='>'?a>b:a>=b;if(ok)visit(n.body);break;}
    }}}
    visit(program.setup);for(let j=0;j<cycles;j++){step();visit(program.loop);}
    return {trace, pins:{...pinStates}, variables:{...vars}, actuators:{...actuators}, inputs:{button:d2,switch:d3,pot:a0,mic:a1}, virtualTimeMs:now, steps};
  }
  function demo(){return {version:1,setup:[{type:'pinMode',pin:'LED_BUILTIN',mode:'OUTPUT'},{type:'print',text:'MD.js Blocks Lite ready'}],loop:[{type:'write',pin:'LED_BUILTIN',state:'HIGH'},{type:'delay',ms:1000},{type:'write',pin:'LED_BUILTIN',state:'LOW'},{type:'delay',ms:1000}]};}
  function playground(){return {version:1,setup:[
     {type:'pinMode',pin:13,mode:'OUTPUT'},{type:'pinMode',pin:9,mode:'OUTPUT'},
     {type:'print',text:'Arduino Playground ready'}],loop:[
     {type:'readDigital',name:'button',pin:2},{type:'writeVar',pin:13,name:'button'},
     {type:'readAnalog',name:'pot',pin:'A0'},{type:'map',name:'brightness',source:'pot',outMax:255},{type:'pwm',pin:9,value:'brightness'},
     {type:'readAnalog',name:'mic',pin:'A1'},{type:'map',name:'angle',source:'mic',outMax:180},{type:'servo',pin:10,value:'angle'},
     {type:'readDigital',name:'sw',pin:3},{type:'if',name:'sw',op:'==',value:1,body:[{type:'stepper',steps:8}]},
     {type:'delay',ms:250}]};}
  root.MDBlocks = Object.freeze({validate,generate,simulate,demo,playground,LIMITS});
})(typeof globalThis !== 'undefined' ? globalThis : this);
