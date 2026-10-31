#!/usr/bin/env python3
"""Phase 4M: authentic DOS guest compiler -> assembler -> linker -> EXE on XT/AT;
No NASM; only verified Small-C -> ASM -> OBJ -> EXE on XT and AT.
"""
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright
PC=Path(__file__).resolve().parents[1];ROOT=PC.parents[1]
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-Disk-Images.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
def snapshot(page):
 return page.evaluate('''() => {const v=__mdPCUniversal.machine.video;let lines=[];for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){const c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}lines.push(s.trimEnd());}return lines.join('\\n');}''')
def root_files(page):
 return page.evaluate('''() => {const d=__mdPCUniversal.machine.fdd.disks[1].data;let start=(d[14]+(d[15]<<8)+d[16]*(d[22]+(d[23]<<8)))*512,files={};for(let i=0;i<112;i++){let n=start+32*i;if(d[n]===0)break;if(d[n]===0xe5)continue;const str=(a,b)=>String.fromCharCode(...d.subarray(a,b)).trim();files[str(n,n+8)+(str(n+8,n+11)?'.'+str(n+8,n+11):'')]=(d[n+28]|(d[n+29]<<8)|(d[n+30]<<16)|(d[n+31]<<24))>>>0;}return files;}''')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 errors=[]
 def cmd(command,expected=None):
  page.evaluate('c=>__mdPCUniversal.queueText(c+"\\n")',command)
  page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  state=page.locator('#pc-boot-progress').inner_text()
  assert 'DOS/DEBUG' in state,(command,state)
  text=snapshot(page)
  if expected: assert expected in text,(command,expected,text)
  return text
 for profile in [sys.argv[1] if len(sys.argv)>1 else 'xt']:
  page=browser.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=120000)
  if profile=='at':page.locator('#machine').select_option('at');page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  assert [bool(x['ro']) for x in page.evaluate('''() => __mdPCUniversal.machine.fdd.disks.map(d=>({ro:d.writeProtected}))''')]==[True,True]
  # Do not mutate the embedded source, switch to a temporary writable working copy.
  page.locator('#fdd-devwork').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
  assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1].writeProtected') is False
  cmd('B:')
  assert 'B:\\>' in snapshot(page)
  assert 'NASM.EXE' not in root_files(page), 'NASM must not be mounted'
  cmd('CC HELLO','Small C, Version 2.5')
  assert root_files(page).get('HELLO.ASM',0)>300,root_files(page)
  cmd('ASM HELLO','Pass 2')
  assert root_files(page).get('HELLO.OBJ',0)>100,root_files(page)
  cmd('YLINK HELLO.OBJ,CLIB.LIB -e=HELLOC.EXE','Linked.')
  assert root_files(page).get('HELLOC.EXE')==4896,root_files(page)
  cmd('HELLOC','Hello from 16-bit DOS C!')
  print('PASS',profile.upper(),'Small-C -> ASM -> YLINK -> 4896-byte DOS EXE, run HELLOC; NASM excluded',flush=True)
  # Each profile uses a fresh browser page; original built-in B: is tested in unit gate.
  page.close()
 assert not errors,errors
 print('PASS browser guest toolchain with working-copy B:, no WASM or external resources',flush=True)
 browser.close()
