import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
root=Path(__file__).resolve().parents[3]
async def run():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await b.new_page(viewport={'width':1150,'height':1150})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content('<html><body style="background:#0b1420"><main id="host"></main></body></html>')
  for f in ['Z80.js','utils.js','MinZX-mdzx.js','ZXScreen.js','ZXKeyboard.js','ZXSound.js']:
   await page.add_script_tag(content=(root/'zx/vendor'/f).read_text())
  await page.evaluate('''() => {window.Z80=Z80;window.ZXScreen=ZXScreen;window.ZXKeyboard=ZXKeyboard;window.ZXSoundOutput=ZXSoundOutput;window.MinZX=MinZX;}''')
  await page.evaluate('''bytes=>{window.MinZX=class extends MinZX{constructor(id){super(id);this._mdzxRomBytes=new Uint8Array(bytes);}}}''', list((root/'zx/roms/zx48.rom').read_bytes()))
  await page.add_style_tag(content=(root/'zx/MD-ZX.css').read_text())
  for f in ['ZX-Screen.js','ZX-ASM.js','MD-ZX.js']:await page.add_script_tag(content=(root/'zx'/f).read_text())
  await page.evaluate('window.__widget=MDZX.mount(document.getElementById("host"))')
  await page.get_by_role('button',name='▶ Start ZX').click()
  await page.wait_for_function('window.__widget.state==="RUNNING"')
  await page.wait_for_timeout(600)
  await page.get_by_role('button',name='⌨ ZX klávesnice').click()
  assert await page.locator('.mdzx-key').count()==40
  await page.locator('.mdzx-key').filter(has=page.locator('.mdzx-key-name',has_text='J')).click()
  await page.wait_for_timeout(1150)
  raw=await page.evaluate('''()=>{const m=window.__widget.machine,ptr=m.mem[0x5c59]|(m.mem[0x5c5a]<<8);return Array.from(m.mem.slice(ptr,ptr+6));}''')
  print('Virtual J creates',raw)
  assert raw[:5]==[108,111,97,100,32]
  await page.locator('.mdzx-quick-keys').get_by_role('button',name='DELETE').click()
  await page.wait_for_timeout(450)
  raw=await page.evaluate('''()=>{const m=window.__widget.machine,ptr=m.mem[0x5c59]|(m.mem[0x5c5a]<<8);return Array.from(m.mem.slice(ptr,ptr+6));}''')
  print('Virtual DELETE leaves',raw)
  assert raw[:5]==[108,111,97,100,13]
  await page.screenshot(path=str(root/'zx/zx-v081-virtual-keyboard.png'),full_page=True)
  assert not errors,errors
  print('ZX VIRTUAL 40 KEYS PASS')
  await b.close()
asyncio.run(run())
