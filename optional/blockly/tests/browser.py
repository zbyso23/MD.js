from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).resolve().parents[1] / 'index.html'
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1450,'height':1000})
    errors=[]
    page.on('pageerror', lambda error:errors.append(str(error)))
    html=p.read_text(encoding='utf8').replace('<link rel="stylesheet" href="MD-Blocks.css">','').replace('<script src="MD-Blocks.js"></script>','').replace('<script src="MD-Blocks-UI.js"></script>','').replace('<script src="Blocks-Playback.js"></script>','')
    page.set_content(html, wait_until='domcontentloaded')
    page.add_style_tag(content=(p.parent/'MD-Blocks.css').read_text(encoding='utf8'))
    page.add_script_tag(content=(p.parent/'MD-Blocks.js').read_text(encoding='utf8'))
    page.add_script_tag(content=(p.parent/'Blocks-Playback.js').read_text(encoding='utf8'))
    page.add_script_tag(content=(p.parent/'MD-Blocks-UI.js').read_text(encoding='utf8'))
    assert 'Blocks Lite Arduino Playground' in page.title()
    assert 'function setup()' in page.locator('#source').inner_text()
    assert page.locator('.scope .block').count() >= 12
    page.get_by_role('tab',name='Python').click()
    assert 'def setup():' in page.locator('#source').inner_text()
    page.get_by_role('tab',name='Arduino C++').click()
    assert '#include <Servo.h>' in page.locator('#source').inner_text()
    assert 'stepperMove(' in page.locator('#source').inner_text()
    page.get_by_role('tab',name='JavaScript').click()
    page.locator('#run').click()
    assert 'Virtuální čas: 0 ms' in page.locator('#simtime').inner_text()
    assert 'krok 1/' in page.locator('#simtime').inner_text()
    assert 'Dokončeno' not in page.locator('#playback-status').inner_text()
    # Interactive sensor inputs visibly affect actuators, without running generated code.
    page.locator('#pot-in').fill('1023')
    page.locator('#mic-in').fill('1023')
    page.locator('#switch-in').check()
    page.locator('#btn-in').click()
    # All input changes restart the animated three-cycle playback, but do not teleport to final state.
    assert 'krok 1/' in page.locator('#simtime').inner_text()
    assert 'PWM 255/255' in page.locator('#pwm-value').inner_text()
    assert '180°' in page.locator('#servo-value').inner_text()
    assert '8 kroků' in page.locator('#stepper-value').inner_text()
    assert page.locator('#led').evaluate('(n)=>n.classList.contains("on")')
    page.locator('#btn-in').click()
    assert not page.locator('#led').evaluate('(n)=>n.classList.contains("on")')
    page.screenshot(path=str(p.parent/'arduino-playground-preview.png'),full_page=True)
    page.locator('#stop').click()
    assert 'Pozastaveno' in page.locator('#playback-status').inner_text()
    # Existing 0.1 Blink remains intact and editable.
    page.locator('#preset').select_option('blink')
    page.locator('#run').click()
    assert 'Virtuální čas: 0 ms' in page.locator('#simtime').inner_text()
    assert page.locator('#led').evaluate('(n)=>n.classList.contains("on")')
    page.locator('#stop').click()
    page.locator('#single-step').click()
    assert '1000 ms' in page.locator('#simtime').inner_text()
    assert not page.locator('#led').evaluate('(n)=>n.classList.contains("on")')
    page.locator('.scope').first.locator('.block.hardware select[aria-label=pin]').first.select_option('13')
    assert 'pinMode(13,' in page.locator('#source').inner_text()
    page.locator('.toolbox-item').filter(has_text='Opakuj').click()
    assert page.locator('.scope').nth(1).locator('.block.logic').count()>=1
    assert 'for (let _block_i1' in page.locator('#source').inner_text()
    page.locator('#theme').click()
    assert page.locator('body').get_attribute('class')=='dark'
    assert len(errors)==0, errors
    print('BROWSER PASS: workspace, JS/Python/Arduino, 4 sensors + LED/PWM/servo/stepper, Blink regression, theme; JS exceptions: 0')
    browser.close()
