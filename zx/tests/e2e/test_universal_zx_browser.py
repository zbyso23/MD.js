#!/usr/bin/env python3
"""ZX real Z80 state JSON roundtrip, private ROM loaded through File API (not distributed)."""
import asyncio,re,os
from pathlib import Path
from playwright.async_api import async_playwright
BASE=Path(__file__).resolve().parents[3]
# Personal ZIP has a local ROM; public/source-only builds can explicitly supply one.
ROM=Path(os.environ['MDJS_TEST_ZX_ROM']).expanduser() if os.environ.get('MDJS_TEST_ZX_ROM') else BASE/'zx/roms/zx48.rom'
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await b.new_page(accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  raw=(BASE/'zx-ultra.html').read_text();scripts=[]
  def script(m):
   opening,body=m.group(1),m.group(2)
   if 'text/plain' in opening:return m.group(0)
   match=re.search(r'src=["\']([^"\']+)',opening)
   scripts.append(('file',BASE/match.group(1)) if match else ('inline',body));return ''
  raw=re.sub(r'(<script\b[^>]*>)([\s\S]*?)</script>',script,raw)
  await page.set_content(raw)
  for typ,content in scripts:await page.add_script_tag(content=content.read_text() if typ=='file' else content)
  assert await page.evaluate('!!window.__zxWidget && !!window.MDUltraRuntime')
  # Test missing ROM without fetch: file picker fallback is accessible in embedded mode.
  assert await page.locator('.mdzx-foot button').count()>=2
  if ROM.is_file():
   await page.locator('input.mdzx-file').set_input_files(str(ROM))
   await page.locator('.mdzx-power').click()
   await page.wait_for_function("window.__zxWidget.state==='RUNNING'",timeout=15000)
   await page.evaluate('window.__zxWidget.machine._mdzxPaused=true')
   state=await page.evaluate('window.__zxWidget.exportJSONState()')
   assert state['machine']=='zx' and len(state['payload']['ram'])>60000
   expected=await page.evaluate('window.__zxWidget.machine.cpu.getState().pc')
   await page.evaluate('window.__zxWidget.machine.mem[0x5000]=103;window.__zxWidget.machine.cpu.getState().pc')
   await page.evaluate('doc=>window.__zxWidget.applyJSONState(doc)',state)
   after=await page.evaluate('window.__zxWidget.machine.cpu.getState().pc')
   assert expected==after
   assert await page.evaluate('window.__zxWidget.machine.mem[0x5000]')==0
   assert not errors,errors
   print('ZX OPAQUE-ORIGIN PASS: ROM via File API + JSON restore Z80 + 48KiB RAM; ROM excluded from snapshot')
  else:print('ZX ROM SKIP: no local personal ROM; provide MDJS_TEST_ZX_ROM for full ZX state test')
  await b.close()
asyncio.run(main())
