#!/usr/bin/env python3
"""Arduino Graph UI, tested through actual Chromium interactions, server-free inline fixture."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re
BASE=Path(__file__).resolve().parents[1]
html=(BASE/'index.html').read_text()
for file in ('MD-Blocks.css','MD-Blocks-Arduino-Graph.css'):
 html=html.replace(f'<link rel="stylesheet" href="{file}">',f'<style>{(BASE/file).read_text()}</style>')
for file in ('MD-Blocks.js','MD-Blocks-Arduino-Graph.js','Blocks-Playback.js','MD-Blocks-UI.js'):
 html=html.replace(f'<script src="{file}"></script>',f'<script>{(BASE/file).read_text()}</script>')
html=re.sub(r'<(?:script|link)\b[^>]*(?:src|href)="\.\./\.\./[^"]+"[^>]*>(?:</script>)?', '',html)
html=html.replace('<script src="Blocks-UX-Shell.js"></script>','')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1550,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='load')
 assert 'function setup()' in page.locator('#source').inner_text()
 page.locator('#view-graph').click()
 assert page.locator('#arduino-graph-host').is_visible()
 assert page.locator('.ag-node').count()>12
 assert page.locator('.ag-wire').count()>8
 page.locator('#arduino-graph-host').screenshot(path=str(BASE/'arduino-graph-CHROMIUM-PROOF.png'))
 # Native Pointer Events move a node without changing generated semantics.
 item=page.locator('.ag-node[data-path=\'["loop",0]\']')
 before_left=float(item.evaluate('e=>parseFloat(e.style.left)'))
 h=item.locator('.ag-head');rect=h.bounding_box()
 x=rect['x']+85;y=rect['y']+15
 page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+38,y+24,steps=5);page.mouse.up()
 item=page.locator('.ag-node[data-path=\'["loop",0]\']')
 after_left=float(item.evaluate('e=>parseFloat(e.style.left)'))
 assert after_left>before_left+30,(before_left,after_left)
 # Add node from Graph -> Blocks -> exporter -> undo/redo
 page.locator('.ag-bar select').first.select_option('loop')
 page.locator('.ag-bar select').nth(1).select_option('print')
 page.get_by_role('button',name='＋ Uzel').click()
 assert 'Ahoj!' in page.locator('#source').inner_text()
 page.locator('#undo').click();assert 'Ahoj!' not in page.locator('#source').inner_text()
 page.locator('#redo').click();assert 'Ahoj!' in page.locator('#source').inner_text()
 page.locator('#view-blocks').click()
 assert page.locator('.scope .block').count()>=15
 page.locator('#view-graph').click()
 # Graph pin connection: one producer drives PWM and servo using one variable.
 page.locator('.ag-node[data-path=\'["loop",3]\'] .ag-pin.ag-data').first.click()
 page.locator('.ag-node[data-path=\'["loop",7]\'] .ag-field .ag-pin.ag-data').first.click()
 page.get_by_role('tab',name='Arduino C++').click()
 code=page.locator('#source').inner_text()
 assert 'servoMotor.write(brightness);' in code and 'analogWrite(9, brightness);' in code
 # A loose node appears on graph, not in generated source.
 page.locator('.ag-bar select').first.select_option('loose')
 page.locator('.ag-bar select').nth(1).select_option('print')
 page.get_by_role('button',name='＋ Uzel').click()
 assert page.locator('.ag-loose').count()>=1
 assert page.locator('#source').inner_text().count('Ahoj!')==1
 # Step-by-step highlight of actual AST node.
 page.locator('#single-step').click()
 assert page.locator('.ag-active').count()==1
 page.locator('#single-step').click()
 assert page.locator('.ag-active').count()==1
 page.locator('#view-blocks').click();before=page.locator('#source').inner_text()
 page.locator('#view-graph').click();assert page.locator('#source').inner_text()==before
 # GUI can build an entirely new AST, not only rearrange the demo.
 page.get_by_role('button',name='▢ Nový').click()
 assert page.locator('.ag-node:not(.ag-root)').count()==0
 page.locator('.ag-bar select').first.select_option('setup')
 page.locator('.ag-bar select').nth(1).select_option('pinMode')
 page.get_by_role('button',name='＋ Uzel').click()
 page.locator('.ag-bar select').first.select_option('loop')
 page.locator('.ag-bar select').nth(1).select_option('write')
 page.get_by_role('button',name='＋ Uzel').click()
 page.locator('.ag-bar select').nth(1).select_option('delay')
 page.get_by_role('button',name='＋ Uzel').click()
 assert page.locator('.ag-node:not(.ag-root)').count()==3
 page.get_by_role('tab',name='Arduino C++').click()
 code=page.locator('#source').inner_text()
 assert 'pinMode(LED_BUILTIN, OUTPUT);' in code and 'digitalWrite(LED_BUILTIN, HIGH);' in code
 page.locator('#single-step').click()
 assert page.locator('.ag-active').count()==1
 assert not errors,errors
 print('BROWSER PASS: Graph nodes/wires, palette, shared AST+undo/redo, fan-out, loose chains, step highlight, exporters; no JS errors')
 browser.close()
