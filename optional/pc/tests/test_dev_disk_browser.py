#!/usr/bin/env python3
"""Real offline Chromium + FreeDOS dev disk B: XT and AT, read-only and reset."""
from pathlib import Path
from playwright.sync_api import sync_playwright
PC=Path(__file__).resolve().parents[1];ROOT=PC.parents[1]
html=(PC/'index.html').read_text('utf8')
for name in ('PC-Core.js','PC-Video.js','PC-VGA.js','PC-BIOS.js','PC-Floppy.js','PC-IDE.js','PC-Disk-Images.js','PC-FPU287.js','PC-Audio.js','PC-OPL2.js','PC-SB2.js','PC-Machine.js','PC-Audio-Output.js','PC-EmbeddedAssets.js'):
    html=html.replace(f'<script src="{name}"></script>',f'<script>{(PC/name).read_text("utf8")}</script>')
for name in ('MD-Runtime.js','MD-UX-Shell.js'):
    html=html.replace(f'<script src="../../{name}"></script>',f'<script>{(ROOT/name).read_text("utf8")}</script>')
text='''() => {const v=__mdPCUniversal.machine.video;let lines=[];for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){const c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}lines.push(s.trimEnd());}return lines.join('\\n');}'''
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page();err=[];page.on('pageerror',lambda x:err.append(str(x)))
    page.set_content(html,wait_until='load');page.wait_for_function('window.__mdPCUniversal && !__mdPCUniversal.running',timeout=120000)
    for profile in ('xt','at'):
        if profile=='at':
            page.locator('#machine').select_option('at');page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
        disks=page.evaluate('''() => __mdPCUniversal.machine.fdd.disks.map(d=>d?({size:d.data.length,ro:d.writeProtected}):null)''')
        assert disks==[{'size':737280,'ro':True},{'size':737280,'ro':True}],disks
        assert page.evaluate("__mdPCUniversal.machine.fdd.writeSector(1,0,0,2,new Uint8Array(512).fill(0x55))") is False
        page.evaluate("__mdPCUniversal.queueText('DIR B:\\n')")
        page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video; for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';} if(s.includes('DEVHELP')&&s.includes('TXT'))return true;}return false;}''',timeout=90000)
        page.evaluate("__mdPCUniversal.queueText('B:EDIT B:HELLO.C\\n')")
        page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}if(s.includes('edit>'))return true;}return false;}''',timeout=90000)
        page.evaluate("__mdPCUniversal.queueText(':L\\n')")
        page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}if(s.includes('Hello from 16-bit DOS C!'))return true;}return false;}''',timeout=90000)
        page.evaluate("__mdPCUniversal.queueText(':Q\\n')")
        page.wait_for_function('!__mdPCUniversal.running',timeout=90000)
        page.evaluate("__mdPCUniversal.queueText('B:DEBUG\\n')")
        page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}if(s.includes('B:DEBUG'))return true;}return false;}''',timeout=90000)
        page.evaluate("__mdPCUniversal.queueText('Q\\n')")
        page.wait_for_function('!__mdPCUniversal.running',timeout=90000)
        print('PASS',profile.upper(),'FreeDOS DIR B:, EDIT B:HELLO.C :L/:Q, B:DEBUG Q, A/B RO')
        page.locator('#reset').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
        assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1].writeProtected') is True
    # Default developer B: refuses writes from a REAL DOS program.
    page.evaluate("__mdPCUniversal.queueText('B:EDIT B:NEW.TXT\\n')")
    page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}if(s.includes('edit>'))return true;}return false;}''',timeout=90000)
    page.evaluate("__mdPCUniversal.queueText('HELLO DISK\\n:W\\n')")
    # FreeDOS critical error asks (A)bort/(I)gnore/(R)etry/(F)ail on a protected drive.
    page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}if(s.includes('write-protection violation'))return true;}return false;}''',timeout=90000)
    # FreeDOS reports write protection and displays a critical-error prompt;
    # reset rather than interpreting the prompt as a successful file save.
    page.locator('#reset').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
    assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1].writeProtected') is True
    # Explicit work-copy action must allow save without damaging embedded image.
    page.locator('#fdd-devwork').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
    assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1].writeProtected') is False
    page.evaluate("__mdPCUniversal.queueText('B:EDIT B:NEW.TXT\\n')")
    page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}if(s.includes('edit>'))return true;}return false;}''',timeout=90000)
    page.evaluate("__mdPCUniversal.queueText('HELLO DISK\\n:W\\n')")
    page.wait_for_function('''() => {const v=__mdPCUniversal.machine.video;for(let y=0;y<25;y++){let s='';for(let x=0;x<80;x++){let c=v.readCell(y,x)?.char??32;s+=c>=32?String.fromCharCode(c):' ';}if(s.includes('Saved.'))return true;}return false;}''',timeout=90000)
    page.evaluate("__mdPCUniversal.queueText(':Q\\n')")
    page.wait_for_function('!__mdPCUniversal.running',timeout=90000)
    assert page.evaluate('''() => {const d=__mdPCUniversal.machine.fdd.disks[1];return Array.from(d.data).some((v,i,a)=>v===72&&a[i+1]===69&&a[i+2]===76&&a[i+3]===76&&a[i+4]===79&&a[i+5]===32);}''')
    print('PASS DOS EDIT: write denied on default RO B:, successful on explicit writable work copy')
    page.select_option('#fdd-drive','1');page.locator('#fdd-eject').click()
    page.locator('#reset').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
    assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1]===null')
    page.locator('#fdd-devrestore').click();page.wait_for_function('!__mdPCUniversal.running',timeout=120000)
    assert page.evaluate('__mdPCUniversal.machine.fdd.disks[1].writeProtected') is True
    assert not err,err
    print('PASS eject B:, reset preserves empty drive; restore B: returns default RO image')
    browser.close()
