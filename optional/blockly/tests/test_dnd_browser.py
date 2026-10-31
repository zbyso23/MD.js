import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[3]
async def run():
 async with async_playwright() as p:
  b=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
  page=await b.new_page(viewport={'width':1560,'height':1100})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  # Blocks UI
  content=(ROOT/'optional/blockly/index.html').read_text()
  content=content.replace('<link rel="stylesheet" href="MD-Blocks.css">', '<style>'+(ROOT/'optional/blockly/MD-Blocks.css').read_text()+'</style>')
  for name in ['MD-Blocks.js','MD-Blocks-UI.js']:
   content=content.replace('<script src="'+name+'"></script>','<script>'+(ROOT/'optional/blockly'/name).read_text()+'</script>')
  await page.set_content(content)
  print('BLOCKS boot errors',errors)
  print('toolbox',await page.locator('.toolbox-item').count(), 'slots',await page.locator('.drop-slot').count(),'blocks',await page.locator('.block').count())
  assert not errors
  before=await page.locator('.block').count()
  item=page.locator('.toolbox-item').filter(has_text='Zobraz text')
  target=page.locator('.scope').first.locator('.drop-slot').first
  b1=await item.bounding_box();b2=await target.bounding_box()
  print('bbox',b1,b2)
  await page.mouse.move(b1['x']+30,b1['y']+12)
  await page.mouse.down()
  await page.mouse.move(b1['x']+35,b1['y']+40,steps=5)
  await page.mouse.move(b2['x']+b2['width']/2,b2['y']+b2['height']/2,steps=10)
  await page.mouse.up()
  print('after blocks',await page.locator('.block').count(), 'console',await page.locator('#console').inner_text())
  assert await page.locator('.block').count()==before+1
  await page.locator('#undo').click()
  assert await page.locator('.block').count()==before
  await page.locator('#redo').click()
  assert await page.locator('.block').count()==before+1
  await page.locator('#zoom-in').click()
  assert await page.locator('#zoom-level').inner_text()=='110 %'
  # Real nested drop: insert a hardware block into the first repeat/if body.
  nested=page.locator('.block.logic .nested .drop-slot').first
  await nested.scroll_into_view_if_needed()
  src=page.locator('.toolbox-item').filter(has_text='Čekej')
  b1=await src.bounding_box();b2=await nested.bounding_box()
  print('nested bboxes',b1,b2)
  assert b1 is not None and b2 is not None
  count=await page.locator('.block').count()
  await page.mouse.move(b1['x']+40,b1['y']+12);await page.mouse.down()
  await page.mouse.move(b1['x']+48,b1['y']+42,steps=4)
  await page.mouse.move(b2['x']+b2['width']/2,b2['y']+b2['height']/2,steps=10)
  await page.mouse.up()
  print('nested after count',await page.locator('.block').count())
  assert await page.locator('.block').count()==count+1
  await page.locator('#undo').click()
  assert await page.locator('.block').count()==count
  await page.locator('#redo').click()
  assert await page.locator('.block').count()==count+1
  await page.screenshot(path=str(ROOT/'optional/blockly/blocks-v081-dnd-preview.png'),full_page=True)
  print('BLOCKS PASS')

  # ZX key matrix independent: load script as classic and inject DOM fake
  await page.set_content('<html><body><canvas id="emu" tabindex="0"></canvas></body></html>')
  await page.add_script_tag(content=(ROOT/'zx/vendor/ZXKeyboard.js').read_text())
  await page.evaluate('window.kb = new ZXKeyboard(document.getElementById("emu"))')
  await page.locator('#emu').focus()
  # basic key 0 row bits; synthetic combos
  await page.keyboard.down('Backspace')
  val=await page.evaluate('({shift:kb.kbbits[0xFEFE],zero:kb.kbbits[0xEFFE]})')
  print('backspace matrices',val)
  assert val['shift']&1==0 and val['zero']&1==0
  await page.keyboard.up('Backspace')
  val=await page.evaluate('({shift:kb.kbbits[0xFEFE],zero:kb.kbbits[0xEFFE]})')
  assert val['shift']&1 and val['zero']&1
  await page.keyboard.down('ArrowLeft')
  assert await page.evaluate('kb.kbbits[0xF7FE]&(1<<4)')==0
  await page.keyboard.up('ArrowLeft')
  await page.keyboard.down('j')
  assert await page.evaluate('kb.kbbits[0xBFFE]&(1<<3)')==0
  await page.keyboard.up('j')
  await page.evaluate('kb.pressVirtual(74,true,"test")')
  assert await page.evaluate('kb.kbbits[0xBFFE]&(1<<3)')==0
  await page.evaluate('kb.pressVirtual(74,false,"test")')
  print('ZX MATRIX PASS')

  await b.close()
asyncio.run(run())
