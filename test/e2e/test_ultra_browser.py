#!/usr/bin/env python3
"""Real browser regression: chart rendering, short GFM tables, sorting/filtering, optional labs."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright
BASE=Path(__file__).resolve().parents[2]
def load_local(page,relative,scripts):
  html=(BASE/relative).read_text()
  inline=re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>',html)
  html=re.sub(r'<script(?:\s[^>]*)?>[\s\S]*?</script>','',html)
  page.set_content(html,wait_until='load')
  if relative.startswith('examples/'): page.add_style_tag(content=(BASE/'MD.css').read_text())
  if relative.startswith('optional/blockly/'): page.add_style_tag(content=(BASE/'optional/blockly/MD-Blocks.css').read_text())
  for script in scripts: page.add_script_tag(content=(BASE/script).read_text())
  for body in inline:
    if body.strip(): page.add_script_tag(content=body)


def run():
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1300,'height':850},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    load_local(page,'examples/charts.html',['MD.js','MD-diagrams.js','MD-Charts.js','MD-docux.js','MD-UX.js'])
    page.wait_for_selector('figure.md-chart svg.md-chart-svg',timeout=10000)
    assert page.locator('figure.md-chart svg.md-chart-svg').count()==4,'four distinct charts'
    assert page.locator('figure.md-chart svg.md-chart-svg').nth(0).locator('rect.md-chart-bar').count()==4
    assert page.locator('figure.md-chart svg.md-chart-svg').nth(2).locator('polyline.md-chart-line').count()==1
    assert page.locator('figure.md-chart svg.md-chart-svg').nth(3).locator('path,circle').count()>=1
    table=page.locator('table.md-table')
    assert table.count()==1,'short separator recognized'
    assert page.locator('.md-smart-table-toolbar input[type=search]').count()==1
    def first():return table.locator('tbody tr').first.locator('td').first.inner_text()
    assert first()=='ZX',f'initial order: {first()}'
    table.locator('thead button').nth(1).click()
    assert first()=='Grafy',f'ascending numeric: {first()}'
    table.locator('thead button').nth(1).click()
    assert first()=='Core',f'descending numeric: {first()}'
    table.locator('thead button').nth(1).click()
    assert first()=='ZX',f'original order restored: {first()}'
    inp=page.locator('.md-smart-table-toolbar input')
    inp.fill('blockly')
    page.wait_for_timeout(170)
    assert table.locator('tbody tr:visible').count()==1,'filter makes rows actually invisible'
    assert table.locator('tbody tr:visible').first.locator('td').first.inner_text()=='Blockly'
    inp.fill('')
    page.wait_for_timeout(150)
    assert table.locator('tbody tr:visible').count()==4
    assert page.locator('pre.md-chart-fallback').count()==1,'invalid chart remains harmless source'
    assert page.locator('figure.md-chart .md-diagram-toolbar [data-save-svg]').count()==4,'SVG exports attached'
    page.locator('figure.md-chart .md-diagram-toolbar button').first.click()
    with page.expect_download(timeout=10000) as d:
      page.locator('figure.md-chart [data-save-svg]').first.click()
    assert d.value.suggested_filename.endswith('.svg')
    page.screenshot(path=str(BASE/'charts-tables-preview.png'),full_page=True)
    assert not errors,errors
    # dashboard links resolve, no optional module scripts on overview
    load_local(page,'index.html',[])
    assert page.locator('a[href="zx-ultra.html"]').count()==1
    assert page.locator('a[href*="preset=blink"]').count()==1
    assert page.locator('a[href*="preset=playground"]').count()==1
    assert page.locator('script[src*="MinZX"]').count()==0
    load_local(page,'optional/blockly/index.html',['optional/blockly/MD-Blocks.js','optional/blockly/MD-Blocks-UI.js'])
    page.locator('#preset').select_option('blink')
    assert page.locator('#preset').input_value()=='blink'
    assert page.locator('#blocks .block').count()>0
    page.locator('#preset').select_option('playground')
    assert page.locator('#preset').input_value()=='playground'
    page.locator('#run').click()
    assert 'Hotovo' in page.locator('#console').inner_text()
    assert not errors,errors
    browser.close()
    print('BROWSER PASS: 4 charts + short GFM table + 3-way sort + filter + SVG export + optional routes + Arduino/Blockly')
if __name__=='__main__':run()
