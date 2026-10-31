#!/usr/bin/env python3
"""Genuine file:// smoke, WITHOUT replacing scripts with inline content.

Use from a real desktop with python Playwright and installed browsers.
Exit 0 only if all specified browsers and pages load, exit 2 for blocked/missing,
exit 1 for actual runtime/DOM errors. Intentionally not a CI surrogate test.
"""
import argparse, asyncio, json, shutil
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
PAGES=['index.html','optional/pc/index.html','optional/blockly/index.html','zx-ultra.html']
EXECUTABLES={'chromium':['chromium','chromium-browser'],'chrome':['google-chrome','google-chrome-stable'],'edge':['microsoft-edge','microsoft-edge-stable'],'firefox':['firefox']}
async def main():
 ap=argparse.ArgumentParser();ap.add_argument('--browsers',default='chromium,chrome,edge,firefox');ap.add_argument('--report',type=Path);opt=ap.parse_args()
 names=[x.strip() for x in opt.browsers.split(',') if x.strip()]
 records=[];bad=False;unverified=False
 async with async_playwright() as p:
  for name in names:
   if name not in EXECUTABLES: raise SystemExit('Unknown browser: '+name)
   executable=next((shutil.which(x) for x in EXECUTABLES[name] if shutil.which(x)),None)
   if not executable:
    records.append({'browser':name,'status':'NOT_INSTALLED'});unverified=True;continue
   engine=p.firefox if name=='firefox' else p.chromium
   try:
    # No file-origin bypass: test the policy and behavior users will actually get.
    browser=await engine.launch(executable_path=executable,headless=True,args=['--no-sandbox'] if name!='firefox' else [])
   except Exception as e:
    records.append({'browser':name,'status':'LAUNCH_BLOCKED','detail':str(e)[:500]});unverified=True;continue
   for path in PAGES:
    page=await browser.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    try:
     res=await page.goto((ROOT/path).resolve().as_uri(),wait_until='load',timeout=20000)
     await page.wait_for_timeout(1000)
     text=await page.locator('body').inner_text(timeout=5000)
     status='PASS' if (len(text.strip())>40 and not errors) else 'FAIL'
     records.append({'browser':name,'page':path,'status':status,'title':await page.title(),'response':res.status if res else None,'errors':errors[:3]})
     if status=='FAIL':bad=True
    except Exception as e:
     msg=str(e);blocked='ERR_BLOCKED_BY_ADMINISTRATOR' in msg or 'NS_ERROR_FILE_ACCESS_DENIED' in msg
     records.append({'browser':name,'page':path,'status':'POLICY_BLOCKED' if blocked else 'FAIL','detail':msg[:500]})
     if blocked:unverified=True
     else:bad=True
    finally:await page.close()
   await browser.close()
 print(json.dumps(records,ensure_ascii=False,indent=2))
 if opt.report: opt.report.parent.mkdir(parents=True,exist_ok=True);opt.report.write_text(json.dumps(records,indent=2,ensure_ascii=False)+'\n')
 if bad:raise SystemExit(1)
 if unverified:raise SystemExit(2)
if __name__=='__main__':asyncio.run(main())
