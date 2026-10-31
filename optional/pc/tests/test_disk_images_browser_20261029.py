#!/usr/bin/env python3
"""Chromium UI: ArrayBuffer disk creation, real binary export/import, reset persistence.

Uses inline classic scripts to remain offline; NOT a certification of file:// navigation.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3]
PC=ROOT/'optional'/'pc'
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-Disk-Images.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
    html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
    html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1280,'height':900},accept_downloads=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_function('window.__mdPCUniversal && !window.__mdPCUniversal.running',timeout=120000)
 # Preserve guest edits to the embedded FreeDOS A: while resetting XT and switching into AT.
 page.evaluate('''() => {const m=__mdPCUniversal.machine; m.fdd.writeSector(0,79,1,9,new Uint8Array(512).fill(0x4b));}''')
 page.locator('#reset').click()
 page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 assert page.evaluate('__mdPCUniversal.machine.fdd.readSector(0,79,1,9)[0]')==0x4b
 page.select_option('#fdd-drive','1');page.select_option('#fdd-format','720K')
 page.locator('#fdd-new').click()
 assert page.evaluate('''() => {const d=__mdPCUniversal.machine.fdd.disks[1];return d && d.data.byteLength===737280 && d.data[510]===0x55;}''')
 page.evaluate('''() => __mdPCUniversal.machine.fdd.writeSector(1,0,0,3,new Uint8Array(512).fill(0x6c))''')
 with page.expect_download(timeout=30000) as info:
  page.locator('#fdd-export').click()
 fd=info.value
 fdb=Path(fd.path()).read_bytes()
 assert len(fdb)==737280 and fdb[1024]==0x6c and fdb[510]==0x55,(len(fdb),fdb[1024])
 assert fd.suggested_filename.endswith('.img')
 page.locator('#fdd-eject').click()
 assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1]===null')
 page.locator('#fdd-file').set_input_files({'name':'roundtrip.img','mimeType':'application/octet-stream','buffer':fdb})
 assert page.evaluate('__mdPCUniversal.machine.fdd.readSector(1,0,0,3)[0]')==0x6c
 print('PASS FDD B: in-memory FAT12 -> writes -> .img download -> eject/reimport')
 page.select_option('#machine','at')
 page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 assert page.evaluate('__mdPCUniversal.machine.fdd.readSector(1,0,0,3)[0]')==0x6c
 assert page.evaluate('__mdPCUniversal.machine.fdd.readSector(0,79,1,9)[0]')==0x4b
 page.select_option('#ide-size','8');page.locator('#ide-new').click()
 assert page.evaluate('__mdPCUniversal.machine.ide.capacity')==16384
 assert page.evaluate('__mdPCUniversal.machine.ide.readSector(0)[450]')==6
 page.evaluate('''() => __mdPCUniversal.machine.ide.writeSector(200,new Uint8Array(512).fill(0x9d))''')
 with page.expect_download(timeout=30000) as info:page.locator('#ide-export').click()
 hb=Path(info.value.path()).read_bytes()
 assert len(hb)==8*1024*1024 and hb[200*512]==0x9d and hb[510]==0x55
 page.locator('#ide-eject').click()
 page.locator('#ide-file').set_input_files({'name':'roundtrip-hdd.img','mimeType':'application/octet-stream','buffer':hb})
 page.wait_for_function('''() => __mdPCUniversal.machine.ide.capacity === 16384 && document.querySelector('#ide-status').textContent.includes('roundtrip-hdd.img')''',timeout=30000)
 assert page.evaluate('__mdPCUniversal.machine.ide.readSector(200)[0]')==0x9d
 page.select_option('#machine','xt');page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 assert page.evaluate('__mdPCUniversal.machine.ide===null')
 assert page.evaluate('__mdPCUniversal.machine.fdd.readSector(1,0,0,3)[0]')==0x6c
 page.select_option('#machine','at');page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 assert page.evaluate('__mdPCUniversal.machine.ide.readSector(200)[0]')==0x9d
 assert page.evaluate('__mdPCUniversal.machine.fdd.readSector(0,79,1,9)[0]')==0x4b
 print('PASS AT IDE MBR/FAT16 -> write overlay -> .img download -> import -> XT/AT switches')
 # Ejecting A: must NOT silently replace it on reset.
 page.select_option('#fdd-drive','0');page.locator('#fdd-eject').click()
 page.locator('#reset').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 assert page.evaluate('__mdPCUniversal.machine.fdd.disks[0]===null')
 assert not errors,errors
 print('PASS explicit FDD A: eject remains ejected through reset; browser page errors: 0')
 browser.close()
