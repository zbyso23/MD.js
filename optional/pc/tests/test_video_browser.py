#!/usr/bin/env python3
"""Chromium gate: video diagnostics must not alter active FreeDOS, all demo canvases render."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parents[1]
async def main():
 html=(ROOT/'index.html').read_text()
 for n in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
  html=html.replace(f'<script src="{n}"></script>',f'<script>{(ROOT/n).read_text()}</script>')
 html=html.replace('<script src="../../MD-Runtime.js"></script>',f'<script>{(BASE/"MD-Runtime.js").read_text()}</script>')
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1300,'height':1200},device_scale_factor=1,accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(html,wait_until='load')
  await page.wait_for_function("!window.__mdPCUniversal.running && document.querySelector('#pc-boot-progress').textContent.includes('DOS/DEBUG')",timeout=90000)
  async def state():
   return await page.evaluate('''()=>{const m=window.__mdPCUniversal.machine;return {
      profile:m.profile,mode:m.video.mode,adapter:m.video.adapter,
      regs:Array.from(m.cpu.r),segments:Array.from(m.cpu.s),ip:m.cpu.ip,steps:m.cpu.steps,
      ram:Array.from(m.ram.slice(0x100,0x120)),vram:Array.from(m.video.vram.slice(0,160)),
      disk:Array.from(m.fdd.disks[0].data.slice(0x1800,0x1820))
     };}''')
  before=await state()
  for key in ('alu-demo','bcd-demo','cpu-demo','idt-demo','pm','de-demo','br-demo','irq10-demo','pit','boot'):
   await page.locator('#'+key).click()
   assert await state()==before,'Unexpected live-PC mutation: '+key
  await page.locator('#video-render').click()
  assert await state()==before,'Redraw mutated active PC state'
  await page.locator('#video-text-demo').click()
  assert 'PASS' in await page.locator('#video-demo-status').inner_text()
  assert await state()==before
  await page.locator('#video-cga-demo').click()
  assert 'CGA 320×200' in await page.locator('#video-demo-status').inner_text()
  assert 'PASS' in await page.locator('#video-demo-status').inner_text()
  assert await page.locator('#video-demo-screen').evaluate('(e)=>e.width')==320
  assert await state()==before
  await page.locator('#video-herc-demo').click()
  assert 'Hercules 720×348' in await page.locator('#video-demo-status').inner_text()
  assert 'PASS' in await page.locator('#video-demo-status').inner_text()
  assert await page.locator('#video-demo-screen').evaluate('(e)=>e.width')==720
  assert await state()==before
  assert not errors,errors
  await page.screenshot(path=str(ROOT/'pc-phase2-video-browser.png'),full_page=True)
  print('PASS: 13 isolated CPU/video diagnostics preserve running FreeDOS RAM, VRAM, registers, disk and CPU steps')
  await browser.close()
asyncio.run(main())
