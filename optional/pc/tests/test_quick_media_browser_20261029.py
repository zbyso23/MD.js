#!/usr/bin/env python3
"""Offline Chromium: real File API -> FAT12/16 -> attached drives -> FreeDOS DIR -> .img export."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3]; PC=ROOT/'optional'/'pc'
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-Disk-Images.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
SCRIPT='''() => {const v=__mdPCUniversal.machine.video;let lines=[];for(let y=0;y<25;y++){let row='';for(let x=0;x<80;x++){const n=v.readCell(y,x)?.char??32;row+=n>=32?String.fromCharCode(n):' ';}lines.push(row.trimEnd());}return lines.join('\\n');}'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(accept_downloads=True); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=120000)
 # A small multi-file input must become a real 720K floppy B: with DOS short names.
 page.locator('#quick-media-file').set_input_files([
  {'name':'Hello World.txt','mimeType':'text/plain','buffer':b'SALUT 286'},
  {'name':'song.zip','mimeType':'application/zip','buffer':b'PK\x03\x04opaque archive'}])
 page.wait_for_function('!__mdPCUniversal.running && document.querySelector("#quick-media-status").textContent.includes("HELLO_WO.TXT")',timeout=120000)
 assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1].data.length')==737280
 assert page.evaluate('__mdPCUniversal.machine.profile')=='xt'
 page.evaluate('(s)=>__mdPCUniversal.queueText(s)','DIR B:\n')
 page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let row='';for(let x=0;x<80;x++){const n=v.readCell(y,x)?.char??32;row+=n>=32?String.fromCharCode(n):' ';}if(row.includes('SONG')&&row.includes('ZIP'))return true;}return false;}''',timeout=30000)
 screen=page.evaluate(SCRIPT)
 assert 'HELLO_WO' in screen and 'SONG' in screen,screen
 page.evaluate('(s)=>__mdPCUniversal.queueText(s)','TYPE B:HELLO_WO.TXT\n')
 page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let row='';for(let x=0;x<80;x++){const n=v.readCell(y,x)?.char??32;row+=n>=32?String.fromCharCode(n):' ';}if(row.includes('SALUT 286'))return true;}return false;}''',timeout=30000)
 page.locator('#pc-quick-media').evaluate('(e)=>e.open=true')
 with page.expect_download(timeout=30000) as info:page.locator('#quick-media-export').click()
 raw=Path(info.value.path()).read_bytes();assert len(raw)==737280
 assert b'SALUT 286' in raw and b'opaque archive' in raw
 print('PASS XT: upload TXT/ZIP -> B: 720K FAT12 -> real FreeDOS DIR -> export IMG')
 # For input > 1.44 MiB, auto upgrade the machine to AT and create FAT16 C:.
 blob=b'Q'*1_700_000
 page.locator('#quick-media-file').set_input_files({'name':'GAME.EXE','mimeType':'application/octet-stream','buffer':blob})
 page.wait_for_function('!__mdPCUniversal.running && __mdPCUniversal.machine.profile === "at" && __mdPCUniversal.machine.ide && __mdPCUniversal.machine.ide.capacity===16384',timeout=120000)
 page.evaluate('(s)=>__mdPCUniversal.queueText(s)','DIR C:\n')
 page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let row='';for(let x=0;x<80;x++){const n=v.readCell(y,x)?.char??32;row+=n>=32?String.fromCharCode(n):' ';}if(row.includes('GAME')&&row.includes('EXE'))return true;}return false;}''',timeout=30000)
 assert 'GAME' in page.evaluate(SCRIPT)
 with page.expect_download(timeout=60000) as info:page.locator('#quick-media-export').click()
 exported=Path(info.value.path()).read_bytes();assert len(exported)==8*1024*1024 and b'Q'*512 in exported
 page.locator('#ide-eject').click()
 page.locator('#ide-file').set_input_files({'name':'reimport.img','mimeType':'application/octet-stream','buffer':exported})
 page.locator('#reset').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 page.evaluate('(s)=>__mdPCUniversal.queueText(s)','DIR C:\n')
 page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let row='';for(let x=0;x<80;x++){const n=v.readCell(y,x)?.char??32;row+=n>=32?String.fromCharCode(n):' ';}if(row.includes('GAME')&&row.includes('EXE'))return true;}return false;}''',timeout=30000)
 print('PASS auto XT -> AT: upload EXE -> FAT16 C: -> DIR -> IMG -> reimport -> DIR persists')
 # Beyond 5 MiB must reject without touching existing media.
 before=page.evaluate('__mdPCUniversal.machine.ide.capacity')
 page.locator('#quick-media-file').set_input_files({'name':'OVER.DAT','mimeType':'application/octet-stream','buffer':b'x'*(5*1024*1024+1)})
 page.wait_for_function('document.querySelector("#quick-media-status").textContent.includes("přesahuje")')
 assert page.evaluate('__mdPCUniversal.machine.ide.capacity')==before
 assert not errors,errors
 print('PASS over-limit rejects without changing media; page errors: 0')
 browser.close()
