from pathlib import Path
from playwright.sync_api import sync_playwright
PC=Path('/mnt/data/mdjs-phase4m-work/optional/pc'); ROOT=PC.parents[1]
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-Disk-Images.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
 html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
 html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
screen="""() => {const v=__mdPCUniversal.machine.video;let lines=[];for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){const c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}lines.push(s.trimEnd());}return lines.join('\\n');}"""
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page();err=[];page.on('pageerror',lambda e:err.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=120000)
 page.locator('#fdd-devwork').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
 print('BOOTED',page.evaluate('''() => __mdPCUniversal.machine.fdd.disks.map(d=>({ro:d.writeProtected,len:d.data.length}))'''),flush=True)
 def run(cmd,wait=80000):
  print('\nCMD',cmd,flush=True)
  page.evaluate('c=>__mdPCUniversal.queueText(c+"\\n")',cmd)
  try:page.wait_for_function('!__mdPCUniversal.running',timeout=wait)
  except Exception as e: print('TIMEOUT',str(e)[:120])
  print('SCREEN\n'+page.evaluate(screen)[-1550:],flush=True)
  return page.evaluate(screen)
 run('B:')
 run('DIR')
 run('NASM -v')
 run('NASM -f bin HELLO.ASM -o HELLO.COM')
 run('DIR')
 run('HELLO')
 run('CC HELLO')
 run('DIR')
 run('ASM HELLO')
 run('DIR')
 run('YLINK HELLO.OBJ,CLIB.LIB -e=HELLOC.EXE')
 run('HELLOC')
 print('ERRORS',err,flush=True)
 browser.close()
