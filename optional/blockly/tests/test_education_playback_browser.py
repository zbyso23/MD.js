#!/usr/bin/env python3
"""Chromium UX gate: visible slow LED transitions, pause, stepping, stale timer cancellation."""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    html=(ROOT/'index.html').read_text('utf8')
    for name in ('MD-Blocks.js','Blocks-Playback.js','MD-Blocks-UI.js','Blocks-UX-Shell.js'):
        html=html.replace(f'<script src="{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
    # UX Shell remains optional and unrelated to playback; no network dependencies.
    html=html.replace('<script src="../../MD-UX-Shell.js"></script>','<script></script>')
    page.set_content(html,wait_until='load')
    page.locator('#preset').select_option('blink')
    page.locator('#run').click()
    assert page.locator('#led').evaluate('e=>e.classList.contains("on")'), 'LED HIGH must be visible immediately'
    assert '0 ms' in page.locator('#simtime').inner_text()
    page.wait_for_timeout(450)
    assert page.locator('#led').evaluate('e=>e.classList.contains("on")'), 'LED must not blink too quickly'
    page.wait_for_function('document.querySelector("#simtime").textContent.includes("1000 ms")',timeout=6000)
    assert not page.locator('#led').evaluate('e=>e.classList.contains("on")'), 'LED LOW must become visible'
    page.locator('#stop').click()
    paused=page.locator('#simtime').inner_text()
    page.wait_for_timeout(2400)
    assert page.locator('#simtime').inner_text()==paused, 'Stop must cancel pending tick'
    page.locator('#single-step').click()
    assert '2000 ms' in page.locator('#simtime').inner_text()
    assert page.locator('#led').evaluate('e=>e.classList.contains("on")')
    page.locator('#preset').select_option('playground')
    assert not page.locator('#led').evaluate('e=>e.classList.contains("on")'), 'Preset clears stale LED output'
    page.wait_for_timeout(300)
    assert 'Připraveno' in page.locator('#console').inner_text()
    assert not errors,errors
    print('PASS: slow Blink HIGH(0ms) → LOW(1000ms), pause freezes time, manual step HIGH(2000ms), preset cancels stale playback')
    browser.close()
