#!/usr/bin/env python3
"""Actual Chromium JS engine with the Workbench HTML, inline scripts only as a
sandbox-specific fallback. NOT a claim of true file:// compatibility."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
PC=Path(__file__).resolve().parents[1]
BASE=PC.parents[1]
async def main():
 html=(PC/'index.html').read_text()
 for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
  html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text()}</script>')
 for name in ('MD-Runtime.js',):
  html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(BASE/name).read_text()}</script>')
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)+ '\n' + (e.stack or 'NO_STACK')))
  await page.set_content(html,wait_until='load')
  assert await page.locator('#fpu-precision').count()==1
  assert await page.locator('#fpu-precision').input_value()=='binary64'
  result=await page.evaluate('''() => {
   const {PCMachine}=window.MDPC_MACHINE, {PCFloat80}=window.MDPC_FPU287;
   const m=new PCMachine('at',{fpuEnabled:true,fpuPrecision:'extended80',videoAdapter:'vga'});
   const x=PCFloat80.op(0,PCFloat80.fromNumber(1),PCFloat80.fromNumber(2**-60));
   m.fpu.pushRaw(x);
   return {mode:m.fpu.precisionMode,clock:m.fpu.fpuHz,sample:PCFloat80.words(m.fpu.getRaw()),vga:m.video.adapter};
  }''')
  assert result['mode']=='extended80' and result['sample']==[8,0,0,32768,16383] and result['vga']=='vga',result
  assert not errors,errors
  print('PASS: Chromium native JS BigInt 80bit arithmetic and Workbench precision selector',result)
  await b.close()
if __name__=='__main__':asyncio.run(main())
