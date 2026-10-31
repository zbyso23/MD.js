#!/usr/bin/env python3
"""Phase 3A PC Speaker WebAudio smoke. Uses an HTTP server for deterministic CI origin.
Does not claim to certify file:// or actual sound-card/audio hardware output."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
def main():
    html=(ROOT/'optional/pc/index.html').read_text(encoding='utf8')
    for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js','PC-UX.js'):
        html=html.replace(f'<script src="{name}"></script>',f'<script>{(ROOT/'optional/pc'/name).read_text(encoding="utf8")}</script>')
    for name in ('MD-Runtime.js','MD-UX-Shell.js'):
        html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text(encoding="utf8")}</script>')
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
            page=browser.new_page()
            errors=[]
            page.on('pageerror',lambda e: errors.append(str(e)))
            page.set_content(html,wait_until='load')
            page.wait_for_function('!!window.__mdPCUniversal',timeout=30000)
            page.wait_for_function('!window.__mdPCUniversal.running',timeout=60000)
            assert page.evaluate('__mdPCUniversal.audioOutput.ctx===null'), 'AudioContext started without a click'
            for profile in ('xt','at'):
                page.select_option('#machine',profile)
                page.wait_for_function('!window.__mdPCUniversal.running',timeout=60000)
                before=page.evaluate("JSON.stringify({p:__mdPCUniversal.machine.profile,r:[...__mdPCUniversal.machine.cpu.r],steps:__mdPCUniversal.machine.cpu.steps,sector:__mdPCUniversal.machine.fdd.disks[0]?.data?.[0]})")
                page.locator('#audio-speaker-demo').click()
                page.wait_for_function("document.querySelector('#audio-status').textContent.includes('PCM vzorků')",timeout=25000)
                after=page.evaluate("JSON.stringify({p:__mdPCUniversal.machine.profile,r:[...__mdPCUniversal.machine.cpu.r],steps:__mdPCUniversal.machine.cpu.steps,sector:__mdPCUniversal.machine.fdd.disks[0]?.data?.[0]})")
                assert before==after,f'guest state changed during speaker demo: {profile}'
                assert page.evaluate('__mdPCUniversal.audioOutput.enabled'), 'audio not enabled from click'
                page.locator('#audio-mute').click()
                assert not page.evaluate('__mdPCUniversal.audioOutput.enabled'), 'mute failed'
                print(f'PASS {profile} browser guest PIT2 speaker test, live DOS unchanged, mute works')
            assert not errors,errors
            browser.close()
    finally:
        pass

if __name__=='__main__': main()
