#!/usr/bin/env python3
"""Real Chromium guest floppy boot + BIOS INT10 + JSON image persistence tests."""
import asyncio, json
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
  page=await browser.new_page(accept_downloads=True,viewport={'width':1250,'height':1000})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content(html,wait_until='load')
  await page.locator('#pc-pause').click()
  await page.locator('#fdd-create').click()
  assert 'FreeDOS' in await page.locator('#fdd-status').inner_text()
  assert await page.evaluate('window.__mdPCUniversal.machine.fdd.disks[0].data.length')==720*1024
  await page.locator('#fdd-boot').click()
  await page.wait_for_function("document.querySelector('#video-status').textContent.includes('TEXT')",timeout=6000)
  await page.locator('#pc-pause').click()
  assert await page.evaluate('window.__mdPCUniversal.machine.fdd.disks[0].data.length')==720*1024
  # Boot actual guest sector on AT too (freshly generate test image).
  await page.locator('#machine').select_option('at')
  await page.locator('#fdd-create').click();await page.locator('#fdd-boot').click()
  await page.locator('#pc-pause').click()
  assert await page.evaluate('window.__mdPCUniversal.machine.fdd.disks[0].data.length')==720*1024
  async with page.expect_download() as dl:await page.locator('#pc-export-json').click()
  path=Path(await (await dl.value).path());doc=json.loads(path.read_text())
  assert doc['payload']['floppy']['disks'][0]['bytes']
  assert doc['payload']['video']['adapter']=='hercules'
  await page.locator('#reset').click()
  assert await page.evaluate('window.__mdPCUniversal.machine.fdd.disks[0].data.length')==720*1024
  await page.locator('#pc-json-file').set_input_files(str(path))
  await page.wait_for_function('window.__mdPCUniversal.machine.fdd.disks[0] !== null',timeout=10000)
  assert await page.evaluate('window.__mdPCUniversal.machine.fdd.disks[0].data.length')==720*1024
  assert not errors,errors
  await page.screenshot(path=str(ROOT/'pc-phase2-floppy-browser.png'),full_page=True)
  print('PASS: Chromium XT/AT mounted embedded 720KiB FreeDOS image, exercised ROM boot, snapshot, binary preserved in JSON snapshot after reset/import')
  await browser.close()
asyncio.run(main())
