#!/usr/bin/env python3
"""Phase 4D: actual 286 FreeDOS DEBUG.com R/Q with no false 386 detection."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3];PC=ROOT/'optional/pc'
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js','PC-UX.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text('utf8')}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text('utf8')}</script>')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1280,'height':960});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.wait_for_function('window.__mdPCUniversal && !window.__mdPCUniversal.running',timeout=90000)
 page.select_option('#machine','at')
 page.wait_for_function('!__mdPCUniversal.running',timeout=90000)
 page.evaluate("__mdPCUniversal.queueText('DEBUG\\n')")
 page.wait_for_function('!__mdPCUniversal.running && document.querySelector("#pc-boot-progress").textContent.includes("· - ·")',timeout=90000)
 assert page.evaluate('__mdPCUniversal.machine.cpu.lastFault?.vector??-1')!=6
 print('PASS AT/286 FreeDOS DEBUG.COM ready (-)',flush=True)
 page.evaluate("__mdPCUniversal.queueText('R\\n')")
 page.wait_for_function('!__mdPCUniversal.running && document.querySelector("#pc-boot-progress").textContent.includes("· - ·")',timeout=90000)
 screen=page.evaluate('''() => {const v=__mdPCUniversal.machine.video;let s='';for(let y=0;y<25;y++)for(let x=0;x<80;x++){const c=v.readCell(y,x);s+=String.fromCharCode(c?.char??32);}return s;}''')
 assert 'AX=' in screen,(screen[-500:])
 print('PASS AT/286 DEBUG registers R',flush=True)
 page.evaluate("__mdPCUniversal.queueText('Q\\n')")
 page.wait_for_function('!__mdPCUniversal.running && document.querySelector("#pc-boot-progress").textContent.includes("A:\\\\>")',timeout=90000)
 print('PASS AT/286 DEBUG Q returns FreeDOS',flush=True)
 assert not errors,errors
 browser.close()
