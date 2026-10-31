#!/usr/bin/env python3
"""Phase 2 actual Chromium guest INT 10h, CGA/HGC VRAM and canvas end-to-end tests."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT.parents[1]
async def main():
 html=(ROOT/'index.html').read_text()
 for n in ('PC-Core.js','PC-Video.js','PC-BIOS.js','PC-Floppy.js','PC-Machine.js','PC-EmbeddedAssets.js'):
  html=html.replace(f'<script src="{n}"></script>',f'<script>{(ROOT/n).read_text()}</script>')
 html=html.replace('<script src="../../MD-Runtime.js"></script>',f'<script>{(BASE/"MD-Runtime.js").read_text()}</script>')
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(viewport={'width':1300,'height':1200},device_scale_factor=1,accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(html,wait_until='load')
  await page.locator('#pc-pause').click()
  await page.locator('#video-adapter').select_option('cga')
  await page.locator('#video-text-demo').click()
  status=await page.locator('#video-status').inner_text()
  assert 'CGA' in status,status
  assert 'PASS' in await page.locator('#trace').inner_text()
  assert await page.evaluate("window.__mdPCUniversal.machine.read8(0xb8000)")==ord('M')
  await page.locator('#video-cga-demo').click()
  assert 'CGA | GRAPHICS' in await page.locator('#video-status').inner_text()
  assert 'PASS' in await page.locator('#trace').inner_text()
  assert await page.evaluate('window.__mdPCUniversal.machine.video.getPixel(40,40)')==3
  assert await page.locator('#video-screen').evaluate('(e)=>e.width')==320
  await page.locator('#video-herc-demo').click()
  assert 'HERCULES | GRAPHICS' in await page.locator('#video-status').inner_text()
  assert 'PASS' in await page.locator('#trace').inner_text()
  assert await page.locator('#video-screen').evaluate('(e)=>e.width')==720
  assert await page.locator('#video-screen').evaluate('(e)=>e.height')==348
  async with page.expect_download() as dl:await page.locator('#pc-export-json').click()
  archive=await dl.value;path=Path(await archive.path())
  await page.locator('#video-adapter').select_option('cga')
  await page.locator('#pc-json-file').set_input_files(str(path))
  await page.wait_for_function("document.querySelector('#video-status').textContent.includes('HERCULES')",timeout=6000)
  assert await page.evaluate('window.__mdPCUniversal.machine.video.getPixel(0,0)')==1
  assert not errors,errors
  await page.screenshot(path=str(ROOT/'pc-phase2-video-browser.png'),full_page=True)
  print('PASS: real Chromium INT10 text + graphics, CGA B8000, Hercules B0000, rendered Canvas 720x348, video JSON export/import, no browser errors')
  await browser.close()
asyncio.run(main())
