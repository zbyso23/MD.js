#!/usr/bin/env python3
"""Runs REAL experimental x86 core in Chromium (never CPU mock).
No network or live server: inject source into a self-contained HTML document.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'pc-phase1-browser.png'
async def main():
    page_src=(ROOT/'index.html').read_text()
    for name in ('PC-Core.js','PC-BIOS.js','PC-Machine.js'):
        body=(ROOT/name).read_text().replace('</script','<\\/script')
        page_src=page_src.replace(f'<script src="{name}"></script>',f'<script>{body}</script>')
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        page=await browser.new_page(viewport={'width':1300,'height':950},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        await page.goto('about:blank')
        await page.set_content(page_src,wait_until='load')
        assert 'PC Lab initialized' in await page.locator('#trace').inner_text() or 'XT RESET' in await page.locator('#trace').inner_text()
        await page.locator('#boot').click()
        assert 'BOOT ROM: 17 instructions' in await page.locator('#trace').inner_text()
        assert '0280' in await page.locator('#regs').inner_text()
        await page.locator('#machine').select_option('at')
        await page.locator('#pm').click()
        assert 'PROTECTED MODE' in await page.locator('#mode').inner_text()
        assert '1234' in await page.locator('#regs').inner_text()
        await page.locator('#selftest').click()
        result=await page.locator('#testresult').inner_text()
        assert result.count('PASS')==10,result
        await page.locator('#cpu-demo').click()
        assert 'CPU ModR/M + REP AT: PASS' in await page.locator('#trace').inner_text()
        await page.locator('#alu-demo').click()
        assert 'Pure JS ALU / SHIFT AT: PASS' in await page.locator('#trace').inner_text()
        await page.locator('#idt-demo').click()
        assert '286 Protected IDT interrupt gate / IRET: PASS' in await page.locator('#trace').inner_text()
        await page.locator('#de-demo').click()
        assert '#DE INT 00h AT: PASS' in await page.locator('#trace').inner_text()
        await page.locator('#machine').select_option('xt')
        await page.locator('#de-demo').click()
        assert '#DE INT 00h XT: PASS' in await page.locator('#trace').inner_text()
        await page.locator('#br-demo').click()
        assert '286 BOUND #BR INT 05h: PASS' in await page.locator('#trace').inner_text()
        await page.locator('#bcd-demo').click()
        assert '8086 BCD DAA AT: PASS' in await page.locator('#trace').inner_text()
        await page.locator('#irq10-demo').click()
        assert '286 cascaded PIC IRQ10 → INT 72h → guest EOIs + IRET: PASS' in await page.locator('#trace').inner_text()
        await page.locator('#pit').click()
        assert 'IRQ0 REQUESTED' in await page.locator('#trace').inner_text()
        await page.screenshot(path=str(OUT),full_page=True)
        assert not errors,errors
        print('PASS: REAL Chromium XT ROM boot, AT 286 protected code, 10 selftests + CPU ModR/M/REP, ALU/SHIFT, IDT, guest #DE and #BR demos, PIT IRQ0, no page errors')
        print('Screenshot:',OUT)
        await browser.close()
asyncio.run(main())
