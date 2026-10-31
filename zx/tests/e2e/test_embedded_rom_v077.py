#!/usr/bin/env python3
"""Personal distribution smoke: start real ZX without file picker or HTTP asset loader."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[3]
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await b.new_page()
  errs=[];page.on('pageerror',lambda err:errs.append(str(err)))
  html=(ROOT/'zx-ultra.html').read_text()
  scripts=[]
  def edit(m):
   tag,content=m.group(1),m.group(2)
   if 'text/plain' in tag:return m.group(0)
   src=re.search(r'src=["\']([^"\']+)',tag)
   scripts.append((ROOT/src.group(1)).read_text() if src else content)
   return ''
  html=re.sub(r'(<script\b[^>]*>)([\s\S]*?)</script>',edit,html)
  await page.set_content(html)
  for script in scripts:await page.add_script_tag(content=script)
  assert await page.evaluate('typeof MDUltraZxEmbeddedROM=== "string" && MDUltraZxEmbeddedROM.length>20000')
  await page.locator('.mdzx-power').click()
  await page.wait_for_function("window.__zxWidget.state==='RUNNING'",timeout=18000)
  sha=await page.evaluate('window.__zxWidget.machine.mem.length')
  assert sha==65536 and not errs,(sha,errs)
  print('ZX PERSONAL ROM PASS: opaque-origin page, no file input, no successful fetch, real Z80 ROM boot')
  await b.close()
asyncio.run(main())
