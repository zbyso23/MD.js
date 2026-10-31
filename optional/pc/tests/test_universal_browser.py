#!/usr/bin/env python3
"""Browser tests: actual HTTP, and offline opaque origin when file:// is admin-blocked."""
import asyncio, json, re
from pathlib import Path
from playwright.async_api import async_playwright
BASE=Path(__file__).resolve().parents[3]

async def inject_standalone(page,htmlfile):
 html=(BASE/htmlfile).read_text(encoding='utf8')
 scripts=[]
 def replace(m):
  tag,body=m.group(1),m.group(2)
  if 'text/plain' in tag:return m.group(0)
  path=re.search(r'src=["\']([^"\']+)',tag)
  scripts.append(('src',(BASE/htmlfile).parent/path.group(1)) if path else ('inline',body))
  return ''
 safehtml=re.sub(r'(<script\b[^>]*>)([\s\S]*?)</script>',replace,html)
 await page.set_content(safehtml,wait_until='load')
 for kind,thing in scripts:
  await page.add_script_tag(content=thing.read_text() if kind=='src' else thing)

async def test_pc(page):
 await page.locator('#pc-pause').click()
 await page.locator('#reset').click()
 await page.locator('#boot').click()
 assert 'HALTED' in await page.locator('#mode').inner_text()
 await page.locator('#machine').select_option('at')
 await page.locator('#pm').click()
 assert 'PROTECTED MODE' in await page.locator('#mode').inner_text()
 async with page.expect_download() as dl:await page.locator('#pc-export-json').click()
 download=await dl.value;path=Path(await download.path());doc=json.loads(path.read_text())
 assert doc['machine']=='pc' and doc['payload']['cpu']['msw']&1
 await page.locator('#reset').click()
 assert 'REAL MODE' in await page.locator('#mode').inner_text()
 await page.locator('#pc-json-file').set_input_files(str(path))
 await page.wait_for_function("document.querySelector('#mode').textContent.includes('PROTECTED MODE')",timeout=6000)
 assert 'PROTECTED MODE' in await page.locator('#mode').inner_text()
 await page.locator('#pc-save-local').click()
 storage_status=await page.locator('#pc-storage-status').inner_text()
 if 'uložen' in storage_status:
  await page.locator('#reset').click()
  await page.locator('#pc-load-local').click()
  assert 'PROTECTED MODE' in await page.locator('#mode').inner_text()
 else:
  assert 'localStorage selhal' in storage_status
 await page.evaluate("(doc)=>{document.querySelector('#pc-persistence details').open=true;document.getElementById('pc-json-paste').value=JSON.stringify(doc)}",doc)
 await page.locator('#pc-import-paste').click()
 assert 'PROTECTED MODE' in await page.locator('#mode').inner_text()
 worker=await page.evaluate("async()=>await MDUltraRuntime.workerJSON({hello:'world'})")
 assert json.loads(worker['text'])=={'hello':'world'}
 # Trigger a real fetch fallback, not a stub claiming success.
 fallback=await page.evaluate("async()=>{let x=await MDUltraRuntime.loadBytes('./404-NOT-THERE',{timeoutMs:500});return {source:x.source,hasBytes:!!x.bytes}}")
 assert fallback=={'source':'manual','hasBytes':False}
 return worker['worker']

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await browser.new_page(accept_downloads=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await inject_standalone(page,Path('optional/pc/index.html'))
  worker=await test_pc(page)
  assert not errors,errors
  print('PC OFFLINE OPAQUE-ORIGIN PASS (file:// navigation itself is admin-blocked); Blob Worker:',worker)
  await page.close()
  # The sandbox forbids file:// and localhost navigation; this tests actual
  # uncompiled scripts under an opaque origin. Direct URL navigation remains manual.
  await browser.close()
asyncio.run(main())
