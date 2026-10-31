#!/usr/bin/env python3
"""Actual FreeDOS execution of VGA13.COM and VGA12.COM in AT VGA, restoring text."""
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
 page.select_option('#machine','at');page.wait_for_function('!__mdPCUniversal.running',timeout=90000)
 for enabled in [False,True]:
  if enabled:
   page.locator('#fpu-enabled').check();page.wait_for_function('!__mdPCUniversal.running && __mdPCUniversal.machine.fpu.enabled',timeout=90000)
  page.evaluate("__mdPCUniversal.queueText('FPUCHECK\\n')")
  page.wait_for_function('!__mdPCUniversal.running',timeout=90000)
  text=page.evaluate("""() => {const v=__mdPCUniversal.machine.video;let all='';for(let y=0;y<25;y++){let line='';for(let x=0;x<80;x++){const c=v.readCell(y,x);line+=c&&c.char>=32?String.fromCharCode(c.char):' ';}all+=line+'|';}return all;}""")
  expected='80287XL FPU OK' if enabled else '80287XL FPU NOT ENABLED'
  assert expected in text,(enabled,text[-1300:])
  print('PASS real FreeDOS FPUCHECK.COM:',expected,flush=True)
 assert not errors,errors
 browser.close()
