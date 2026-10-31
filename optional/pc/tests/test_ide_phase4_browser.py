#!/usr/bin/env python3
"""Phase 4B Chromium: user mounted IDE media, copy-on-write, preservation, AT-only."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3];PC=ROOT/'optional/pc'
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1280,'height':860});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_function('window.__mdPCUniversal&&!__mdPCUniversal.running',timeout=115000)
 page.select_option('#machine','at');page.wait_for_function('!__mdPCUniversal.running',timeout=115000)
 page.locator('#ide-file').set_input_files({'name':'study.img','mimeType':'application/octet-stream','buffer':bytes(2048*512)})
 page.wait_for_function('document.querySelector("#ide-status").textContent.includes("study.img")',timeout=10000)
 media=page.evaluate('''() => {const m=__mdPCUniversal.machine;return {profile:m.profile,sectors:m.ide.capacity,original:m.ide.image[0],status:document.querySelector('#ide-status').textContent};}''')
 assert media['sectors']==2048 and media['profile']=='at',media
 page.evaluate('''() => {const m=__mdPCUniversal.machine;m.ide.writeSector(0,new Uint8Array(512).fill(0xa5));}''')
 media=page.evaluate('''() => {const i=__mdPCUniversal.machine.ide;return {original:i.image[0],current:i.readSector(0)[0],modified:i.overlay.size};}''')
 assert media=={'original':0,'current':165,'modified':1},media
 print('PASS IDE mounted+copy-on-write browser:',media)
 page.select_option('#video-adapter','vga');page.wait_for_function('!__mdPCUniversal.running',timeout=115000)
 assert page.evaluate('__mdPCUniversal.machine.ide.readSector(0)[0]')==165
 page.select_option('#machine','xt');page.wait_for_function('!__mdPCUniversal.running',timeout=115000)
 assert page.evaluate('__mdPCUniversal.machine.ide===null') is True
 page.select_option('#machine','at');page.wait_for_function('!__mdPCUniversal.running',timeout=115000)
 assert page.evaluate('__mdPCUniversal.machine.ide.readSector(0)[0]')==165
 print('PASS IDE preserved across adapter changes and AT→XT→AT profile resets')
 page.locator('#ide-eject').click()
 assert page.evaluate('__mdPCUniversal.machine.ide.capacity')==0
 print('PASS IDE explicit eject clears medium')
 assert not errors,errors
 browser.close()
