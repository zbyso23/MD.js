#!/usr/bin/env python3
"""MD.js Ultra v0.8.2 browser UX stress: no navigation required, inject local classical scripts/styles."""
import asyncio,re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]

def inline(page_path):
    hfile=ROOT/page_path
    txt=hfile.read_text('utf-8')
    def css(m):
        return '<style>'+(hfile.parent/m.group(1)).resolve().read_text('utf-8')+'</style>'
    def script(m):
        js=(hfile.parent/m.group(1)).resolve().read_text('utf-8')
        return '<script>'+js.replace('</script','<\\/script')+'</script>'
    txt=re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>',css,txt)
    return re.sub(r'<script\s+src="([^"]+)"\s*></script>',script,txt)

async def run():
    async with async_playwright() as p:
        b=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        # PC XT boot and UI preservation
        page=await b.new_page(viewport={'width':1366,'height':900})
        errors=[];page.on('pageerror',lambda err: errors.append(str(err)))
        await page.set_content(inline(Path('optional/pc/index.html')))
        await page.wait_for_function("window.__mdPCUniversal && !window.__mdPCUniversal.running && document.querySelector('#pc-boot-progress').textContent.includes('DOS/DEBUG')", timeout=90000)
        frozen=await page.evaluate('''()=>{const m=window.__mdPCUniversal.machine;return JSON.stringify({steps:m.cpu.steps,regs:Array.from(m.cpu.r),ip:m.cpu.ip, vram:Array.from(m.video.vram.slice(0,160)),disk:Array.from(m.fdd.disks[0].data.slice(0x1800,0x1820)),ram:Array.from(m.ram.slice(0x800,0x850))});}''')
        for _ in range(30):
            await page.locator('[data-ux-target="disks"]').click()
            assert await page.locator('#ux-pc-disks').get_attribute('aria-hidden')=='false'
            await page.keyboard.press('Escape')
            assert await page.locator('#ux-pc-disks').get_attribute('aria-hidden')=='true'
        assert frozen==await page.evaluate('''()=>{const m=window.__mdPCUniversal.machine;return JSON.stringify({steps:m.cpu.steps,regs:Array.from(m.cpu.r),ip:m.cpu.ip,vram:Array.from(m.video.vram.slice(0,160)),disk:Array.from(m.fdd.disks[0].data.slice(0x1800,0x1820)),ram:Array.from(m.ram.slice(0x800,0x850))});}'''), 'Drawer changed live XT state'
        assert await page.locator('#video-screen').evaluate('e=>e.getBoundingClientRect().width')==720
        # diagnostics are isolated and moved, not destroyed
        await page.locator('[data-ux-target="tests"]').click()
        await page.locator('#alu-demo').click()
        await page.locator('#bcd-demo').click()
        await page.keyboard.press('Escape')
        assert frozen==await page.evaluate('''()=>{const m=window.__mdPCUniversal.machine;return JSON.stringify({steps:m.cpu.steps,regs:Array.from(m.cpu.r),ip:m.cpu.ip,vram:Array.from(m.video.vram.slice(0,160)),disk:Array.from(m.fdd.disks[0].data.slice(0x1800,0x1820)),ram:Array.from(m.ram.slice(0x800,0x850))});}'''), 'CPU diagnostics changed live XT'
        await page.evaluate("window.__mdUXPC.live.video.portWrite(0x3BF,3);window.__mdUXPC.live.video.portWrite(0x3B8,10);window.__mdUXPC.live.video.render(document.getElementById('video-screen').getContext('2d'));window.__mdUXPC.applyScale()")
        assert await page.locator('#video-screen').evaluate('e=>[e.width,e.height,Math.round(e.getBoundingClientRect().width)]')==[720,348,720]
        await page.locator('#video-adapter').select_option('cga')
        await page.evaluate("window.__mdUXPC.live.video.setMode(4);window.__mdUXPC.live.video.render(document.getElementById('video-screen').getContext('2d'));window.__mdUXPC.applyScale()")
        assert await page.locator('#video-screen').evaluate('e=>[e.width,e.height,Math.round(e.getBoundingClientRect().width),Math.round(e.getBoundingClientRect().height)]')==[320,200,640,400]
        await page.evaluate("window.__mdUXPC.live.video.setMode(6);window.__mdUXPC.live.video.render(document.getElementById('video-screen').getContext('2d'));window.__mdUXPC.applyScale()")
        assert await page.locator('#video-screen').evaluate('e=>[e.width,e.height,Math.round(e.getBoundingClientRect().width),Math.round(e.getBoundingClientRect().height)]')==[640,200,640,200]
        await page.locator('#ux-display-size').select_option('2')
        assert await page.locator('#video-screen').evaluate('e=>Math.round(e.getBoundingClientRect().width)')==1280
        await page.locator('#ux-display-size').select_option('fit')
        assert await page.locator('#video-screen').evaluate('e=>e.getBoundingClientRect().width<=window.innerWidth')
        assert not errors,errors
        await page.screenshot(path=str(ROOT/'UX-v082-PC-Workbench.png'))
        print('PC: FreeDOS prompt + 30 drawer toggles + isolated ALU/BCD + native HGC and CGA 2x/1x/fit PASS',flush=True)
        await page.close()
        # ZX: live controls remain reachable from panel, keyboard not shadowed
        page=await b.new_page(viewport={'width':1280,'height':900})
        errors=[];page.on('pageerror',lambda err: errors.append(str(err)))
        await page.set_content(inline(Path('zx-ultra.html')))
        await page.locator('[data-ux-target="tools"]').click()
        assert await page.locator('#ux-zx-tools').get_attribute('aria-hidden')=='false'
        assert await page.locator('#ux-zx-tools .mdzx-tools button').count()>=8
        await page.keyboard.press('Escape')
        assert await page.locator('#ux-zx-tools').get_attribute('aria-hidden')=='true'
        await page.locator('#zx-ux-keyboard').click()
        assert await page.locator('.mdzx-key').count()==40
        assert await page.locator('.mdzx-virtual-keyboard').is_visible()
        await page.locator('[data-ux-target="guide"]').click()
        assert await page.locator('#ux-zx-guide').get_attribute('aria-hidden')=='false'
        await page.keyboard.press('Escape')
        await page.locator('button.mdzx-power').click()
        await page.wait_for_function('window.__zxWidget.state==="RUNNING"',timeout=20000)
        assert not errors,errors
        await page.screenshot(path=str(ROOT/'UX-v082-ZX-Workbench.png'))
        print('ZX: overlay/tape/debug + keyboard 40 keys + live ROM boot PASS',flush=True)
        await page.close()
        # Blocks: editor never destroyed when panels open/close
        page=await b.new_page(viewport={'width':1420,'height':900})
        errors=[];page.on('pageerror',lambda err: errors.append(str(err)))
        await page.set_content(inline(Path('optional/blockly/index.html')))
        original=await page.locator('.block').count()
        for _ in range(25):
            await page.locator('[data-ux-target="code"]').click()
            assert await page.locator('#source').is_visible()
            await page.keyboard.press('Escape')
        assert await page.locator('.block').count()==original
        await page.locator('[data-ux-target="board"]').click()
        assert await page.locator('#run').is_visible()
        await page.locator('#run').click()
        await page.keyboard.press('Escape')
        await page.locator('#ux-block-toggle-tools').click()
        assert not await page.locator('#toolbox').is_visible()
        await page.locator('#ux-block-toggle-tools').click()
        assert await page.locator('#toolbox').is_visible()
        assert not errors,errors
        await page.screenshot(path=str(ROOT/'UX-v082-Blocks-Studio.png'))
        print('Blocks: 25 code panel cycles + sim + toolbox + intact program PASS',flush=True)
        await b.close()

if __name__=='__main__':asyncio.run(run())
