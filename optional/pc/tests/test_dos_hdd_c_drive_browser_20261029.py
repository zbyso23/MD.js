#!/usr/bin/env python3
"""AT/286 FreeDOS real filesystem on newly created FAT16 C:, saved and restored as IMG."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3];PC=ROOT/'optional'/'pc'
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-Disk-Images.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
SCRIPT='''() => {const v=__mdPCUniversal.machine.video;let lines=[];for(let r=0;r<25;r++){let line='';for(let c=0;c<80;c++){const n=v.readCell(r,c)?.char??32;line+=n>=32?String.fromCharCode(n):' ';}lines.push(line.trimEnd());}return lines.join('\\n');}'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=120000)
 page.select_option('#machine','at');page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 page.select_option('#ide-size','8');page.locator('#ide-new').click()
 page.locator('#reset').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 screen=page.evaluate(SCRIPT);assert 'C: HD1' in screen,screen
 page.evaluate('(s)=>__mdPCUniversal.queueText(s)',r'COPY A:\FDAUTO.BAT C:\TEST.BAT'+'\nDIR C:\n')
 page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let row='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char||32;row+=c>=32?String.fromCharCode(c):' ';}if(row.includes('1 file(s)'))return true;}return false;}''',timeout=30000)
 screen=page.evaluate(SCRIPT);assert 'TEST     BAT' in screen,screen
 with page.expect_download(timeout=60000) as info:page.locator('#ide-export').click()
 raw=Path(info.value.path()).read_bytes();assert len(raw)==8*1024*1024
 # A separate new guest machine after reimport proves the directory and data are persisted in IMG.
 page.locator('#ide-eject').click()
 page.locator('#ide-file').set_input_files({'name':'saved-c-drive.img','mimeType':'application/octet-stream','buffer':raw})
 page.wait_for_function('''() => __mdPCUniversal.machine.ide.capacity===16384 && document.querySelector('#ide-status').textContent.includes('saved-c-drive')''',timeout=30000)
 page.locator('#reset').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 page.evaluate('(s)=>__mdPCUniversal.queueText(s)', 'DIR C:\n')
 page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let row='';for(let x=0;x<80;x++){const c=v.readCell(y,x)?.char||32;row+=c>=32?String.fromCharCode(c):' ';}if(row.includes('TEST     BAT'))return true;}return false;}''',timeout=30000)
 assert 'TEST     BAT' in page.evaluate(SCRIPT)
 assert not errors,errors
 print('PASS REAL FreeDOS AT/286 C: created MBR/FAT16 -> COPY A: -> DIR C: -> export IMG -> eject/import -> reset -> DIR C: file persists')
 browser.close()
