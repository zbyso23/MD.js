#!/usr/bin/env python3
"""Real Chromium / FreeDOS XT+AT source-paste by paced INT16 keyboard injection."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys
PC=Path(__file__).resolve().parents[1];ROOT=PC.parents[1]
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-Disk-Images.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js','PC-Paste.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
def screen(page):
 return page.evaluate('''() => {const v=__mdPCUniversal.machine.video;let a=[];for(let r=0;r<25;r++){let s='';for(let c=0;c<80;c++){const k=v.readCell(r,c)?.char??32;s+=k>=32?String.fromCharCode(k):' ';}a.push(s.trimEnd())}return a.join('\\n')}''')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for profile in ([sys.argv[1]] if len(sys.argv)>1 else ['xt','at']):
  page=browser.new_page();err=[];page.on('pageerror',lambda x:err.append(str(x)))
  page.set_content(html,wait_until='load')
  page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=120000)
  if profile=='at':page.locator('#machine').select_option('at');page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  page.locator('#pc-dev-workbench').evaluate('(e)=>e.open=true')
  # Do not inject source into command.com when IDE isn't running.
  page.locator('#pc-paste-code').fill('NOT DOS COMMAND\n')
  page.locator('#pc-paste-start').click()
  assert not page.evaluate('__mdPCUniversal.pasteJob')
  assert 'Nejprve otevři IDE' in page.locator('#pc-paste-status').inner_text()
  assert not page.evaluate('__mdPCUniversal.running')
  page.locator('#dev-copy').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  assert not page.evaluate('__mdPCUniversal.machine.fdd.disks[1].writeProtected')
  page.locator('#pc-paste-open').click()
  page.wait_for_function('__mdPCUniversal.editorVisible()',timeout=120000)
  print('open editor',profile,flush=True)
  # Real multiline C source; has punctuation, tab and blank line.
  source='#include <stdio.h>\n\nint main(void) {\n\tputs("PASTE DONE!");\n\treturn 0;\n}\n'
  page.locator('#pc-paste-code').fill(source)
  page.locator('#pc-paste-speed').select_option('2')
  page.locator('#pc-paste-start').click()
  page.wait_for_function('__mdPCUniversal.pasteJob !== null',timeout=10000)
  page.wait_for_function('!__mdPCUniversal.pasteJob',timeout=120000)
  assert 'Hotovo:' in page.locator('#pc-paste-status').inner_text(),(page.locator('#pc-paste-status').inner_text(),screen(page))
  print('typed',profile,repr(screen(page)[0:250]),flush=True)
  # F3 (genuine BIOS scan word) and Esc to DOS.
  page.evaluate('''() => {__mdPCUniversal.machine.queueBIOSKey(0x3d00);__mdPCUniversal.startCPU(true)}''')
  page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;let s='';for(let c=0;c<80;c++)s+=String.fromCharCode(v.readCell(23,c)?.char??32);return s.includes('Saved to disk')}''',timeout=120000)
  # Verify the complete byte sequence really landed on the FAT12 work copy.
  saved=page.evaluate(r'''() => {
   const disk=__mdPCUniversal.machine.fdd.disks[1].data;
   const probe='#include <stdio.h>\r\n\r\nint main(void) {\r\n\tputs("PASTE DONE!");\r\n\treturn 0;\r\n}\r\n';
   const expected=Array.from(probe).map(x=>x.charCodeAt(0));
   outer: for(let off=0;off<=disk.length-expected.length;off++){
    for(let j=0;j<expected.length;j++)if(disk[off+j]!==expected[j])continue outer;
    return true;
   }
   return false;
  }''')
  assert saved,('FAT12 does not contain exact CRLF code bytes',profile,screen(page))
  page.evaluate('''() => {__mdPCUniversal.machine.queueBIOSKey(0x011b);__mdPCUniversal.startCPU(true)}''')
  page.wait_for_function('!__mdPCUniversal.running',timeout=120000)

  page.evaluate('__mdPCUniversal.queueText("TYPE B:PASTE.C\\n")')
  page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  text=screen(page)
  assert '#include <stdio.h>' in text,text
  assert 'PASTE DONE!' in text,text
  print('PASS',profile,'paste via BIOS keyboard into IDE.COM, exact CRLF bytes saved on B:, TYPE matches')
  page.evaluate('__mdPCUniversal.queueText("B:BUILD PASTE\\n")')
  page.wait_for_function('!__mdPCUniversal.running',timeout=180000)
  assert 'BUILD OK:' in screen(page),('BUILD PASTE failed',profile,screen(page))
  page.evaluate('__mdPCUniversal.queueText("B:PASTE.EXE\\n")')
  page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  assert 'PASTE DONE!' in screen(page),('EXE failed',profile,screen(page))
  print('PASS',profile,'pasted source compiles/links/runs under Small-C')
  # Pause/resume/stop semantics should never lose or inject the remaining source.
  page.evaluate('__mdPCUniversal.queueText("B:IDE B:CANCEL.C\\n")')
  page.wait_for_function('__mdPCUniversal.editorVisible()',timeout=120000)
  page.locator('#pc-paste-code').fill('A'*1024)
  page.locator('#pc-paste-speed').select_option('1')
  page.locator('#pc-paste-start').click()
  page.wait_for_function('''() => __mdPCUniversal.pasteJob && __mdPCUniversal.pasteJob.pos>=4''',timeout=10000)
  page.locator('#pc-paste-pause').click()
  assert page.evaluate('__mdPCUniversal.pasteJob.paused')
  old=page.evaluate('__mdPCUniversal.pasteJob.pos')
  page.wait_for_timeout(220)
  assert page.evaluate('__mdPCUniversal.pasteJob.pos')==old
  page.locator('#pc-paste-pause').click()
  page.wait_for_function('''() => __mdPCUniversal.pasteJob && __mdPCUniversal.pasteJob.pos>10''',timeout=15000)
  page.locator('#pc-paste-stop').click()
  assert not page.evaluate('__mdPCUniversal.pasteJob')
  assert page.locator('#pc-paste-progress').evaluate('(e)=>e.value<e.max')
  print('PASS',profile,'pause/resume/stop and zero DOS shell injection')
  assert not err,err
  page.close()
 browser.close()
