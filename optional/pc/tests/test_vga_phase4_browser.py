#!/usr/bin/env python3
"""Chromium VGA Phase 4A — guest-written VRAM, palette, snapshot and CRT geometry."""
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
 page=browser.new_page(viewport={'width':1300,'height':920})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 page.wait_for_function('window.__mdPCUniversal && !window.__mdPCUniversal.running',timeout=110000)
 page.select_option('#machine','at')
 page.wait_for_function('!__mdPCUniversal.running',timeout=110000)
 page.select_option('#video-adapter','vga')
 page.wait_for_function('!__mdPCUniversal.running',timeout=110000)
 snap=page.evaluate('''() => {const m=__mdPCUniversal.machine;return {profile:m.profile,adapter:m.video.adapter,mode:m.video.mode,ram:m.conventional+m.extended,prompt:document.querySelector('#pc-boot-progress')?.textContent};}''')
 assert snap['profile']=='at' and snap['adapter']=='vga' and snap['mode']==3 and snap['ram']==1048576,snap
 print('PASS AT VGA FreeDOS text profile:',snap)
 page.locator('.ux-open[data-ux-target="tests"]').click()
 page.locator('#video-vga13-demo').click(timeout=10000)
 data=page.evaluate('''() => {const d=document.querySelector('#video-demo-screen');const s=document.querySelector('#video-demo-status').textContent;const px=d.getContext('2d').getImageData(0,0,1,1).data;return {width:d.width,height:d.height,status:s,pixel:Array.from(px)};}''')
 assert (data['width'],data['height'])==(320,200) and 'PASS' in data['status'] and data['pixel'][3]==255,data
 print('PASS VGA mode 13h guest CPU framebuffer:',data)
 page.locator('#video-vga12-demo').click(timeout=10000)
 data=page.evaluate('''() => {const d=document.querySelector('#video-demo-screen');return {width:d.width,height:d.height,status:document.querySelector('#video-demo-status').textContent};}''')
 assert (data['width'],data['height'])==(640,480) and 'PASS' in data['status'],data
 print('PASS VGA mode 12h guest CPU planar framebuffer:',data)
 # Switch current AT VGA to graphical output without losing machine state on CRT view adjustments.
 before=page.evaluate('''() => {const m=__mdPCUniversal.machine;m.video.setMode(0x13);m.video.setPixel(0,0,42);return {hash:m.video.getPixel(0,0),steps:m.cpu.steps,floppy:m.fdd.disks[0].data[0]};}''')
 page.select_option('#ux-aspect','crt');page.wait_for_timeout(350)
 display=page.evaluate('''() => ({w:document.querySelector('#video-screen').style.width,h:document.querySelector('#video-screen').style.height,desc:document.querySelector('#ux-video-dimensions').textContent})''')
 after=page.evaluate('''() => {const m=__mdPCUniversal.machine;return {hash:m.video.getPixel(0,0),steps:m.cpu.steps,floppy:m.fdd.disks[0].data[0]};}''')
 assert before==after,(before,after)
 assert 'CRT 4:3' in display['desc'] and abs(int(display['w'][:-2])/int(display['h'][:-2])-4/3)<0.03,display
 print('PASS CRT 4:3 CSS only, no guest mutation:',display)
 page.select_option('#ux-aspect','raw');page.wait_for_timeout(350)
 display=page.evaluate('''() => ({w:document.querySelector('#video-screen').style.width,h:document.querySelector('#video-screen').style.height})''')
 assert abs(int(display['w'][:-2])/int(display['h'][:-2])-320/200)<0.03,display
 print('PASS raw square pixels retained:',display)
 assert not errors,errors
 browser.close()
