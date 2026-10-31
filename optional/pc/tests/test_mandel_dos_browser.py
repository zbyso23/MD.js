#!/usr/bin/env python3
"""Real FreeDOS MANDEL.COM -> 80287XL x87 guest instructions -> VGA Mode 13h."""
from pathlib import Path
from tempfile import gettempdir
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3]; PC=ROOT/'optional/pc'
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js','PC-UX.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1400,'height':980})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=85000)
 page.select_option('#machine','at');page.wait_for_function('!__mdPCUniversal.running',timeout=85000)
 page.select_option('#video-adapter','vga');page.wait_for_function('!__mdPCUniversal.running',timeout=85000)
 # Negative control: a user must get a DOS warning, not a false green screen,
 # if the optional 80287XL has not been enabled.
 assert page.evaluate('__mdPCUniversal.machine.fpu.enabled') is False
 page.evaluate("__mdPCUniversal.queueText('MANDEL\\n')")
 page.wait_for_function("""() => {
  const m=__mdPCUniversal.machine;
  if(m.video.mode!==3 || __mdPCUniversal.running)return false;
  let out='';for(let y=0;y<25;y++)for(let x=0;x<80;x++)out+=String.fromCharCode(m.video.readCell(y,x)?.char??32);
  return out.includes('enable 80287XL');
 }""",timeout=50000)
 absence=page.evaluate("""() => {const v=__mdPCUniversal.machine.video;let out='';for(let y=0;y<25;y++)for(let x=0;x<80;x++)out+=String.fromCharCode(v.readCell(y,x)?.char??32);return out;}""")
 assert 'enable 80287XL' in absence,absence[-350:]
 print('PASS: FPU disabled: DOS displays explicit 80287XL warning, no green VGA screen',flush=True)
 page.evaluate('''() => {const checkbox=document.querySelector('#fpu-enabled');checkbox.checked=true;checkbox.dispatchEvent(new Event('change',{bubbles:true}));}''')
 page.wait_for_function('!__mdPCUniversal.running && __mdPCUniversal.machine.fpu.enabled',timeout=85000)
 page.evaluate("__mdPCUniversal.queueText('MANDEL\\n')")
 page.wait_for_function('''() => {const m=__mdPCUniversal.machine;return m.video.mode===0x13 && m.waitingForKey && m.fpu.instructions>=400000;}''',timeout=120000)
 v=page.evaluate('''() => {const m=__mdPCUniversal.machine;const colors=new Set();for(let y=0;y<200;y+=4)for(let x=0;x<320;x+=4)colors.add(m.video.getPixel(x,y));return {profile:m.profile,mode:m.video.mode,fpu:m.fpu.instructions,steps:m.cpu.steps,colors:[...colors],peak:m.fpu.cells[m.fpu.top],waiting:m.waitingForKey,dimensions:m.video.dimensions};}''')
 assert v['profile']=='at' and v['mode']==19 and v['waiting'] and v['fpu']>400000,v
 assert len(v['colors'])>5,v
 print('PASS: FreeDOS MANDEL.COM: guest FPU operations',v['fpu'],'colors',len(v['colors']),'steps',v['steps'],flush=True)
 page.evaluate('__mdPCUniversal.pauseCPU()')
 page.screenshot(path=str(Path(gettempdir())/'mdjs-mandel-browser-proof.png'),full_page=False)
 page.evaluate("__mdPCUniversal.queueText(' ')")
 page.wait_for_function('!__mdPCUniversal.running && __mdPCUniversal.machine.video.mode===3',timeout=85000)
 print('PASS: exit MANDEL -> FreeDOS text 03h',flush=True)
 assert not errors,errors
 browser.close()
