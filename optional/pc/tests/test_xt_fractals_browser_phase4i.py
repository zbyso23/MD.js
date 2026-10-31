#!/usr/bin/env python3
"""Actual FreeDOS execution of CGAFRAC.COM/HGCFRAC.COM in XT, restoring text."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3]
PC=ROOT/'optional/pc'
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js','PC-UX.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1300,'height':900})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=65000)
 for adapter,binary in [('cga','CGAFRAC'),('hercules','HGCFRAC')]:
  page.select_option('#machine','xt');page.wait_for_function('!__mdPCUniversal.running',timeout=90000)
  page.select_option('#video-adapter',adapter);page.wait_for_function('!__mdPCUniversal.running',timeout=90000)
  page.evaluate(f"__mdPCUniversal.queueText('{binary}\\n')")
  page.wait_for_function("() => __mdPCUniversal.machine.waitingForKey && __mdPCUniversal.machine.video.isGraphics && __mdPCUniversal.machine.cpu.steps > 600000",timeout=120000)
  values=page.evaluate("""() => {const m=__mdPCUniversal.machine,c=new Set();const [w,h]=m.video.dimensions;for(let y=0;y<h;y+=4)for(let x=0;x<w;x+=4)c.add(m.video.getPixel(x,y));return {adapter:m.video.adapter,mode:m.video.mode,steps:m.cpu.steps,colors:[...c],waiting:m.waitingForKey};}""")
  assert values['adapter']==adapter and values['waiting'] and len(values['colors'])>=2,values
  page.screenshot(path=str(PC/'phase4'/('XT-'+adapter.upper()+'-FRACTAL-PROOF.png')),full_page=False)
  print('PASS FreeDOS XT '+binary+'.COM graphic result:',values,flush=True)
  page.evaluate("__mdPCUniversal.queueText(' ')")
  page.wait_for_function('!__mdPCUniversal.running && !__mdPCUniversal.machine.video.isGraphics',timeout=90000)
  print('PASS return to XT FreeDOS text mode:',binary,flush=True)
 assert not errors,errors
 browser.close()
