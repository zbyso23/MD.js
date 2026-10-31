#!/usr/bin/env python3
"""Real Chromium gate: embedded FreeDOS XT/AT boot, physical keyboard, XT DEBUG R/Q."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parents[1]
async def main():
 html=(ROOT/'index.html').read_text(encoding='utf-8')
 for name in ('PC-Core.js','PC-Video.js','PC-BIOS.js','PC-Floppy.js','PC-Machine.js','PC-EmbeddedAssets.js'):
  html=html.replace(f'<script src="{name}"></script>',f'<script>{(ROOT/name).read_text(encoding="utf-8")}</script>')
 html=html.replace('<script src="../../MD-Runtime.js"></script>',f'<script>{(BASE/"MD-Runtime.js").read_text(encoding="utf-8")}</script>')
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1260,'height':1050},accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(html,wait_until='load')
  async def ready(label,token=None,last_line=None):
   await page.wait_for_function('''({token,lastLine}) => {const m=window.__mdPCUniversal?.machine;if(!m)return false;
     const v=m.video;let lines=[];for(let row=0;row<25;row++){let s='';for(let col=0;col<80;col++){
       let c=v.readCell(row,col)?.char;s+=c>=32?String.fromCharCode(c):' ';
     }lines.push(s.trimEnd());}
     const all=lines.join('\\n');const last=lines.filter(x=>x.trim()).at(-1)?.trim()||'';
     return (token===null||all.includes(token))&&(lastLine===null||last===lastLine)&&!window.__mdPCUniversal.running;
   }''',arg={'token':token,'lastLine':last_line},timeout=90000)
   m=await page.evaluate('({profile:window.__mdPCUniversal.machine.profile,steps:window.__mdPCUniversal.machine.cpu.steps,ticks:window.__mdPCUniversal.machine.bios.get32(0x46c),running:window.__mdPCUniversal.running})')
   print('PASS:',label,m)
  await ready('XT FreeDOS prompt','FreeCom version','A:\\>')
  assert await page.locator('#video-adapter').input_value() == 'hercules'
  await page.screenshot(path=str(ROOT/'pc-phase2-freedos-xt-amber.png'))
  # Physical keyboard events go into guest BIOS keyboard queue (no fake screen writes).
  await page.locator('#video-shell').focus()
  await page.keyboard.type('DEBUG',delay=5);await page.keyboard.press('Enter')
  await ready('XT DEBUG started','A:\\>DEBUG','-')
  await page.keyboard.type('R');await page.keyboard.press('Enter')
  await ready('XT DEBUG R registers','AX=0000','-')
  await page.screenshot(path=str(ROOT/'pc-phase2-xt-debug-r-amber.png'))
  await page.keyboard.type('Q');await page.keyboard.press('Enter')
  await ready('XT DEBUG Q returns DOS','-Q','A:\\>')
  await page.locator('#machine').select_option('at')
  await page.evaluate('window.__mdPCUniversal.startFreeDOS()')
  await ready('AT FreeDOS prompt','FreeCom version','A:\\>')
  await page.evaluate("window.__mdPCUniversal.queueText('DIR\\n')")
  await ready('AT directory listing','DEBUG    COM','A:\\>')
  await page.screenshot(path=str(ROOT/'pc-phase2-freedos-at-amber.png'))
  assert not errors,errors
  print('PASS: true browser FreeDOS 1.4 on XT/AT; XT physical keyboard -> DEBUG R/Q; AT DIR, amber Hercules')
  await browser.close()
if __name__=='__main__':asyncio.run(main())
