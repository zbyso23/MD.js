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
 page.select_option('#machine','at');page.wait_for_function('!__mdPCUniversal.running',timeout=65000)
 page.select_option('#video-adapter','vga');page.wait_for_function('!__mdPCUniversal.running',timeout=65000)
 for binary,mode in [('VGA13',19),('VGA12',18)]:
  page.evaluate(f"__mdPCUniversal.queueText('{binary}\\n')")
  page.wait_for_function('(mode) => __mdPCUniversal.machine.waitingForKey && __mdPCUniversal.machine.video.mode===mode',arg=mode,timeout=65000)
  vals=page.evaluate('''() => {const m=__mdPCUniversal.machine;return {profile:m.profile,mode:m.video.mode,pixel0:m.video.getPixel(0,0),pixel1:m.video.getPixel(64,0),center:m.video.getPixel(120,80),corner:m.video.getPixel(448,256),waiting:m.waitingForKey};}''')
  assert vals['profile']=='at' and vals['mode']==mode and vals['waiting'],vals
  assert vals['pixel0']==0,vals
  if mode==19: assert vals['center']==0xe0 and vals['pixel1']==16,vals
  else: assert vals['pixel1']==1 and vals['corner']==15,vals
  print('PASS FreeDOS '+binary+'.COM graph mode and guest VRAM:',vals,flush=True)
  page.evaluate("__mdPCUniversal.queueText(' ')")
  page.wait_for_function('!__mdPCUniversal.running && __mdPCUniversal.machine.video.mode===3',timeout=65000)
  print('PASS return to FreeDOS text mode 03h:',binary,flush=True)
 assert not errors,errors
 browser.close()
