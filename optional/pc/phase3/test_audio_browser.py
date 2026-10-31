#!/usr/bin/env python3
"""Chromium isolated hardware-demo integration. No claim about actual speaker hardware or file://."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3]
def main():
    html=(ROOT/'optional/pc/index.html').read_text('utf8')
    for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js','PC-UX.js'):
        html=html.replace(f'<script src="{name}"></script>',f'<script>{(ROOT/'optional/pc'/name).read_text('utf8')}</script>')
    for name in ('MD-Runtime.js','MD-UX-Shell.js'):
        html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text('utf8')}</script>')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        page=browser.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(html,wait_until='load')
        page.wait_for_function('!!window.__mdPCUniversal',timeout=30000)
        page.wait_for_function('!window.__mdPCUniversal.running',timeout=80000)
        assert page.evaluate('__mdPCUniversal.audioOutput.ctx===null'),'WebAudio started without gesture'
        for profile in ('xt','at'):
            page.select_option('#machine',profile)
            page.wait_for_function('!window.__mdPCUniversal.running',timeout=80000)
            for btn in ('audio-covox-demo','audio-opl-demo','audio-sb-demo'):
                before=page.evaluate('JSON.stringify(__mdPCUniversal.machine.exportState(MDUltraRuntime))') if False else page.evaluate('JSON.stringify({registers:Array.from(__mdPCUniversal.machine.cpu.r),ticks:__mdPCUniversal.machine.cpu.ticks,sector:__mdPCUniversal.machine.fdd.disks[0]?.data?.[0]})')
                page.locator('#'+btn).click(timeout=10000)
                page.wait_for_function("document.querySelector('#audio-status').textContent.includes('vzorků') || document.querySelector('#audio-status').textContent.includes('Error')",timeout=80000)
                after=page.evaluate('JSON.stringify({registers:Array.from(__mdPCUniversal.machine.cpu.r),ticks:__mdPCUniversal.machine.cpu.ticks,sector:__mdPCUniversal.machine.fdd.disks[0]?.data?.[0]})')
                assert before==after,(profile,btn,'live FreeDOS changed')
                status=page.locator('#audio-status').inner_text()
                assert 'vzorků' in status,(profile,btn,status)
                assert page.evaluate('__mdPCUniversal.audioOutput.enabled')
                page.locator('#audio-mute').click()
                assert not page.evaluate('__mdPCUniversal.audioOutput.enabled')
                print('PASS',profile,btn,status)
        assert not errors,errors
        browser.close()
if __name__=='__main__':main()
