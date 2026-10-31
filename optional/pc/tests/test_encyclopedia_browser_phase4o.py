#!/usr/bin/env python3
"""Real Chromium UI checks of Phase 4O, including offline file:// when permitted."""
import json, sys, pathlib, time, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[3]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
BASE='http://127.0.0.1:%s/'%server.server_address[1]
PAGES=['index.html','optional/pc/index.html','zx-ultra.html','examples/index.html','examples/reader.html','optional/blockly/index.html']

def check_page(page,filename):
    page.goto(BASE+filename,wait_until='domcontentloaded',timeout=30000)
    page.wait_for_selector('#md-ency-trigger',timeout=30000)
    assert page.locator('#md-ency-overlay').is_hidden(),filename
    page.locator('#md-ency-trigger').click()
    assert page.locator('#md-ency-overlay').is_visible(),filename
    assert page.evaluate('document.activeElement === document.querySelector("#md-ency-search")'),filename
    page.get_by_role('tab',name='⌨ Assembler').click()
    assert page.locator('#md-ency-overlay').get_by_role('tab',name='⌨ Assembler').get_attribute('aria-selected')=='true'
    page.locator('#md-ency-search').fill('Mandelbrot')
    assert 'článků' in page.locator('.md-ency-count').inner_text()
    assert page.locator('.md-ency-hit').count()>=2,filename
    page.locator('#md-ency-search').fill('')
    page.locator('.md-ency-hit').filter(has_text='XT + Hercules').first.click()
    assert page.locator('.md-ency-reader').locator('pre').count()>=1,filename
    assert 'HGCFRAC.s' in page.locator('.md-ency-reader-top').inner_text(),filename
    page.keyboard.press('Escape')
    assert page.locator('#md-ency-overlay').is_hidden(),filename
    page.keyboard.press('F2')
    assert page.locator('#md-ency-overlay').is_visible(),filename
    page.keyboard.press('F2')
    assert page.locator('#md-ency-overlay').is_hidden(),filename
    print('PASS',filename)

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1360,'height':900})
    page.on('pageerror',lambda err: print('JS ERROR',str(err)[:500],file=sys.stderr))
    for filename in PAGES:check_page(page,filename)
    page.goto(BASE+'optional/pc/index.html')
    page.locator('#video-shell').focus()
    page.keyboard.press('F2')
    assert page.locator('#md-ency-overlay').is_visible()
    page.keyboard.press('Escape')
    assert page.evaluate('document.activeElement === document.querySelector("#video-shell")'), 'guest keyboard focus restored'
    print('PASS guest monitor F2 / focus')
    page.locator('#pc-key-text').fill('DIR')
    page.locator('#pc-key-text').focus()
    page.keyboard.press('F2')
    assert page.locator('#md-ency-overlay').is_hidden(), 'native host input should retain F2'
    print('PASS F2 native host editor not captured')
    page.locator('#md-ency-trigger').click()
    page.locator('.md-ency-cat').filter(has_text='Velké projekty').first.click()
    page.locator('.md-ency-hit').filter(has_text='XT + Hercules').first.click()
    page.screenshot(path=str(ROOT/'optional/pc/phase4/F2-ENCYCLOPEDIA-PROOF.png'))
    print('PASS screenshot')
    browser.close()
    server.shutdown()
