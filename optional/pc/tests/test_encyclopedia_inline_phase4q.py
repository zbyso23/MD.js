#!/usr/bin/env python3
"""Real Chromium UI test, with original classic JS/CSS resources inlined.

This tests functionality when local URL navigation is administratively blocked.
It is NOT certification of file:// loading or CSP on a user's desktop.
"""
from pathlib import Path
import re, sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[3]
PAGES=['index.html','optional/pc/index.html','zx-ultra.html','examples/index.html','examples/reader.html','optional/blockly/index.html']

def bundle(path):
    path=ROOT/path
    text=path.read_text('utf-8')
    def script(match):
        rel=match.group(2)
        if rel.startswith(('http:','https:','data:')):
            raise ValueError('Unsupported network script: '+rel)
        js=(path.parent/rel).resolve()
        if not js.is_relative_to(ROOT):raise ValueError(js)
        return '<script>'+js.read_text('utf-8').replace('</script>','<\\/script>')+'</script>'
    # Keep original order; only classic scripts with src are used.
    text=re.sub(r'<script\b([^>]*?)\s+src="([^"]+)"[^>]*>\s*</script>',script,text,flags=re.I)
    def css(match):
        rel=match.group(1)
        csspath=(path.parent/rel).resolve()
        if not csspath.is_relative_to(ROOT):raise ValueError(csspath)
        return '<style>'+csspath.read_text('utf-8')+'</style>'
    text=re.sub(r'<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="([^"]+)"[^>]*>',css,text,flags=re.I)
    return text

def check(page,path):
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(bundle(path),wait_until='load',timeout=120000)
    page.wait_for_selector('#md-ency-trigger',timeout=60000)
    assert page.locator('#md-ency-overlay').is_hidden(),path
    page.locator('#md-ency-trigger').click()
    assert page.locator('#md-ency-overlay').is_visible(),path
    assert page.evaluate('document.activeElement === document.querySelector("#md-ency-search")'),path
    page.get_by_role('tab',name='⌨ Assembler').click()
    page.locator('#md-ency-search').fill('Mandelbrot')
    assert page.locator('.md-ency-hit').count()>=2,path
    page.locator('#md-ency-search').fill('')
    page.locator('.md-ency-hit').filter(has_text='XT + Hercules').first.click()
    assert page.locator('.md-ency-reader pre').count()>=1,path
    assert 'HGCFRAC.s' in page.locator('.md-ency-reader-top').inner_text(),path
    # Markdown is a distinct searchable section, not just an extra category in ASM.
    page.get_by_role('tab',name='📝 Markdown').click()
    assert page.get_by_role('tab',name='📝 Markdown').get_attribute('aria-selected')=='true'
    assert page.locator('.md-ency-hit').count()>=8
    page.locator('#md-ency-search').fill('not_a_real_encyclopedia_topic_4q')
    assert page.locator('.md-ency-hit').count()==0
    assert 'Žádný článek' in page.locator('.md-ency-reader').inner_text()
    page.locator('#md-ency-search').fill('')
    assert page.locator('.md-ency-hit').count()>=8
    page.keyboard.press('Escape');assert page.locator('#md-ency-overlay').is_hidden()
    page.keyboard.press('F2');assert page.locator('#md-ency-overlay').is_visible()
    page.keyboard.press('F2');assert page.locator('#md-ency-overlay').is_hidden()
    assert not errors,(path,errors[:3])
    print('PASS',path,'F2, icon, categories, search, source, Esc (inline Chromium)',flush=True)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    for path in PAGES:
        page=browser.new_page(viewport={'width':1360,'height':900})
        check(page,path)
        if path=='optional/pc/index.html':
            page.locator('#video-shell').focus();page.keyboard.press('F2')
            assert page.locator('#md-ency-overlay').is_visible()
            page.keyboard.press('Escape')
            assert page.evaluate('document.activeElement === document.querySelector("#video-shell")')
            page.locator('#pc-key-text').fill('DIR');page.locator('#pc-key-text').focus()
            page.keyboard.press('F2')
            assert page.locator('#md-ency-overlay').is_hidden(),'F2 must not intercept an active host input'
            print('PASS PC monitor F2/focus & host-input isolation',flush=True)
        page.close()
    browser.close()
