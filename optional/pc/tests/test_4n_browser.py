#!/usr/bin/env python3
"""Phase 4N offline Chromium DOS guest editor and one-command build regression."""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
PC=Path(__file__).resolve().parents[1]; ROOT=PC.parents[1]
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-Disk-Images.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
 html=html.replace(f'<script src="{name}"></script>', f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>', f'<script>{(ROOT/name).read_text("utf8")}</script>')
def snap(page):
 return page.evaluate('''() => {const v=__mdPCUniversal.machine.video;let a=[];for(let r=0;r<25;r++){let s='';for(let c=0;c<80;c++){const k=v.readCell(r,c)?.char??32;s+=k>=32?String.fromCharCode(k):' ';}a.push(s.trimEnd())}return a.join('\\n')}''')
def cmd(page,command,needle=None,limit=120000):
 page.evaluate('(s)=>__mdPCUniversal.queueText(s+"\\n")',command)
 page.wait_for_function('!__mdPCUniversal.running',timeout=limit)
 s=snap(page)
 if needle: assert needle in s,(command,needle,s)
 return s
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for profile in ([sys.argv[1]] if len(sys.argv)>1 else ['xt','at']):
  page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=120000)
  if profile=='at':page.locator('#machine').select_option('at');page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  print(profile,'boot',flush=True)
  assert page.locator('#pc-dev-workbench').count()==1
  assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1].writeProtected')
  page.locator('#pc-dev-workbench').evaluate('(e)=>e.open=true');page.locator('#dev-copy').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  assert not page.evaluate('__mdPCUniversal.machine.fdd.disks[1].writeProtected')
  print(profile,'work copy',flush=True)
  # DOS editor: direct launch from A:; no compiled JS/editor pretending to be DOS guest.
  page.locator('#dev-edit').click()
  try: page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;return v.readCell(0,1)?.char===77 && v.readCell(0,2)?.char===68 && v.readCell(2,0)?.char!==0}''',timeout=20000)
  except Exception as e:
   print('EDITOR FAILED',repr(e),flush=True)
   print('STATUS',page.locator('#pc-boot-progress').inner_text(),flush=True)
   print('CPU',page.evaluate('''() => ({running:__mdPCUniversal.running,steps:__mdPCUniversal.machine.cpu.steps,ip:__mdPCUniversal.machine.cpu.ip,cs:__mdPCUniversal.machine.cpu.s[1],wait:__mdPCUniversal.machine.waitingForKey,mode:__mdPCUniversal.machine.video.mode,adapter:__mdPCUniversal.machine.video.adapter})'''),flush=True)
   print('SCREEN',snap(page),flush=True)
   raise
  page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;let t='';for(let c=0;c<30;c++)t+=String.fromCharCode(v.readCell(4,c)?.char??32);return t.includes('stdio.h')}''',timeout=120000)
  s=snap(page);print('EDITOR snapshot',profile,repr(s[:320]),flush=True)
  assert 'SOURCE EDITOR' in s
  assert '#include <stdio.h>' in s, s
  assert 'Hello from 16-bit DOS C!' in s,s
  # Use keyboard scan word, genuine BIOS input. First use F3 to save and exit via ESC.
  page.evaluate('''() => {__mdPCUniversal.machine.queueBIOSKey(0x3d00);__mdPCUniversal.startCPU(true)}''')
  page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;let s='';for(let c=0;c<80;c++)s+=String.fromCharCode(v.readCell(23,c)?.char??32);return s.includes('Saved to disk')}''',timeout=120000)
  page.evaluate('''() => {__mdPCUniversal.machine.queueBIOSKey(0x011b);__mdPCUniversal.startCPU(true)}''')
  page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  assert 'DOS/DEBUG' in page.locator('#pc-boot-progress').inner_text(),snap(page)
  print(profile,'editor F3 save / ESC exit',flush=True)
  print(profile,'starting build',flush=True)
  s=cmd(page,'B:BUILD HELLO','BUILD OK:',180000)
  print(profile,'BUILD output',s[-800:],flush=True)
  s=cmd(page,'B:HELLO.EXE','Hello from 16-bit DOS C!')
  print(profile,'EXE run',flush=True)
  # Genuine editing + arrow-key insert + save new text file on B: work image.
  page.evaluate('__mdPCUniversal.queueText("IDE B:NOTE.TXT\\n")')
  page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;return v.readCell(0,1)?.char===77 && v.readCell(1,0)?.char===66}''',timeout=120000)
  page.evaluate('__mdPCUniversal.queueText("ABC")')
  page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;return v.readCell(2,0)?.char===65 && v.readCell(2,2)?.char===67}''',timeout=120000)
  page.locator('#video-shell').focus()
  page.locator('#video-shell').press('ArrowLeft')
  page.evaluate('__mdPCUniversal.queueText("Z")')
  page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;return v.readCell(2,2)?.char===90 && v.readCell(2,3)?.char===67}''',timeout=120000)
  page.evaluate('''() => {__mdPCUniversal.machine.queueBIOSKey(0x3d00);__mdPCUniversal.startCPU(true)}''')
  page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;let s='';for(let c=0;c<80;c++)s+=String.fromCharCode(v.readCell(23,c)?.char??32);return s.includes('Saved to disk')}''',timeout=120000)
  page.evaluate('''() => {__mdPCUniversal.machine.queueBIOSKey(0x011b);__mdPCUniversal.startCPU(true)}''')
  page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  cmd(page,'TYPE B:NOTE.TXT','ABZC')
  print(profile,'editor arrow insert, save B:NOTE.TXT, TYPE match',flush=True)
  assert not errors,errors
  page.close()
 browser.close()
 print('PASS Phase 4N offline native BIOS editor + BUILD.BAT XT/AT',flush=True)
