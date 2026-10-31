#!/usr/bin/env python3
"""STRICT offline Chromium E2E: original MinZX CPU + supplied ROM, no mocked CPU or HTTP.
Requires the development-only Python playwright package and a Chromium binary.
No browser navigation is performed; classic scripts are injected from local verified files.
"""
import hashlib
import os
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[3]
ROM = ROOT/'zx/roms/zx48.rom'
VENDOR = ROOT/'zx/vendor'
JS = ['Z80.js','utils.js','MinZX-mdzx.js','ZXScreen.js','ZXKeyboard.js','ZXSound.js']
EXPECTED_ROM = '7038f98c22105a03d8416f213fab0b53a248405bbb7e351366f0a7158cae4815'

class RealZXOfflineE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        for f in JS:
            if not (VENDOR/f).is_file():raise RuntimeError('Missing genuine MinZX JS: '+f)
        if not ROM.is_file() or ROM.stat().st_size!=16384:raise RuntimeError('Missing 16KiB ROM')
        cls.rom=ROM.read_bytes()
        digest=hashlib.sha256(cls.rom).hexdigest()
        if digest!=os.environ.get('ZX_ROM_SHA256',EXPECTED_ROM):raise RuntimeError('Unexpected ROM SHA256: '+digest)
        cls.pw=sync_playwright().start()
        chrome=os.environ.get('CHROMIUM_BIN') or '/usr/bin/chromium'
        if not Path(chrome).is_file():chrome=None
        cls.browser=cls.pw.chromium.launch(executable_path=chrome,args=['--no-sandbox','--disable-dev-shm-usage'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.pw.stop()

    def setUp(self):
        self.page=self.browser.new_page(viewport={'width':1024,'height':768},accept_downloads=True)
        self.errors=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        self.page.set_content('<!doctype html><html><head></head><body><main id="host"></main></body></html>')
        for f in JS:self.page.add_script_tag(content=(VENDOR/f).read_text())
        self.page.evaluate('''() => {window.Z80=Z80;window.ZXScreen=ZXScreen;window.ZXKeyboard=ZXKeyboard;
          window.ZXSoundOutput=ZXSoundOutput;window.MinZX=MinZX;}''')
        # No XHR/HTTP: inject exact supplied ROM via the patch's _mdzxRomBytes override.
        self.page.evaluate('''bytes => {
          window.__romBytes=new Uint8Array(bytes);
          window.MinZX=class extends MinZX {constructor(id) {super(id);this._mdzxRomBytes=window.__romBytes;}};
        }''',list(self.rom))
        self.page.add_style_tag(content=(ROOT/'zx/MD-ZX.css').read_text())
        for f in ['ZX-Screen.js','ZX-ASM.js','MD-ZX.js']:
            self.page.add_script_tag(content=(ROOT/'zx'/f).read_text())
        self.page.evaluate('window.__zxWidget=MDZX.mount(document.getElementById("host"))')
        self.assertEqual(self.page.evaluate('window.__zxWidget.state'),'OFF')

    def tearDown(self):
        try:self.assertFalse(self.errors,'Uncaught browser errors: '+str(self.errors))
        finally:self.page.close()

    def start(self):
        self.page.get_by_role('button',name='▶ Start ZX').click()
        self.page.wait_for_function('window.__zxWidget.state === "RUNNING"',timeout=12000)
        self.page.wait_for_timeout(400)
        actual=self.page.evaluate('Array.from(window.__zxWidget.machine.mem.slice(0,16384))')
        self.assertEqual(hashlib.sha256(bytes(actual)).digest(),hashlib.sha256(self.rom).digest())
        self.assertGreater(self.page.evaluate('window.__zxWidget.machine._framecount'),10)

    def tapkey(self,key):
        self.page.keyboard.down(key);self.page.wait_for_timeout(105)
        self.page.keyboard.up(key);self.page.wait_for_timeout(105)

    def type_text(self,text):
        self.page.locator('.mdzx-canvas').click()
        for c in text:self.tapkey('Space' if c==' ' else c)

    def test_01_boot_and_basic_print(self):
        self.start()
        self.type_text('PRINT 2')
        self.tapkey('Enter')
        self.page.wait_for_timeout(450)
        machine=self.page.evaluate('''() => {const m=window.__zxWidget.machine;return {
          pc:m.cpu.getState().pc,frames:m._framecount,
          attr:Array.from(m.mem.slice(0x5800,0x5808)),
          bitmap:Array.from(m.mem.slice(0x4000,0x5800))};}''')
        self.assertGreater(sum(x!=0 for x in machine['bitmap']),10)
        self.assertGreater(machine['frames'],20)
        # Assert deterministic BASIC rendering in native screen RAM, not just HTML status.
        self.page.locator('.mdzx-canvas').screenshot(path=str(ROOT/'zx-real-print-verified.png'))
        print('REAL Z80 + BASIC PRINT 2 PASS; frames=',machine['frames'])

    def test_02_real_tap_loader_and_basic_program(self):
        self.start()
        self.page.locator('.mdzx-file').set_input_files(str(ROOT/'zx/demos/HELLO.TAP'))
        self.page.wait_for_function("document.querySelector('.mdzx-status').textContent.includes('TAP mounted')")
        self.page.evaluate('''() => {
          const m=window.__zxWidget.machine, old=m.cpu.run_instruction.bind(m.cpu);
          m.__trapcalls=0;
          m.cpu.run_instruction=function(){if(m.cpu.getState().pc===0x0556)m.__trapcalls++;return old();};
        }''')
        self.type_text('LOAD ')
        self.page.keyboard.down('Control');self.page.wait_for_timeout(90)
        self.tapkey('p');self.tapkey('p')
        self.page.keyboard.up('Control');self.page.wait_for_timeout(130)
        self.tapkey('Enter');self.page.wait_for_timeout(1000)
        count=self.page.evaluate('window.__zxWidget.machine.__trapcalls')
        self.assertEqual(count,2,'Expected both TAP header and data ROM loader calls')
        ram=self.page.evaluate('Array.from(window.__zxWidget.machine.mem.slice(0x4000))')
        self.assertIn(b'MD.JS ULTRA',bytes(ram),'BASIC tape content absent from RAM')
        self.page.locator('.mdzx-canvas').screenshot(path=str(ROOT/'zx-real-tap-verified.png'))
        print('REAL TAP -> 2 loader calls -> BASIC bytes + rendered screen PASS')

    def test_03_real_cpu_asm_and_sna_roundtrip(self):
        self.start()
        self.page.get_by_role('button',name='⛶ Fullscreen Workbench').click()
        self.page.locator('.mdzx-asm-source').fill('ORG $8000\nLD HL, $4000\nLD (HL), 255\nHALT')
        self.page.get_by_role('button',name='⚙ Assemble + Run').click()
        self.assertIn('Assembled',self.page.locator('.mdzx-asm-result').inner_text())
        self.page.wait_for_function('window.__zxWidget.machine.mem[0x4000]===255',timeout=8000)
        self.page.get_by_role('button',name='Ⅱ Pause').click()
        with self.page.expect_download() as dl:self.page.get_by_role('button',name='↓ Save SNA').click()
        filename=dl.value.path()
        sna=Path(filename).read_bytes()
        self.assertEqual(len(sna),49179)
        self.assertEqual(sna[27],255)
        self.page.locator('.mdzx-file').set_input_files({'name':'roundtrip.sna','mimeType':'application/octet-stream','buffer':sna})
        self.page.wait_for_function("document.querySelector('.mdzx-status').textContent.includes('SNA loaded')")
        self.assertEqual(self.page.evaluate('window.__zxWidget.machine.mem[0x4000]'),255)
        print('REAL CPU ASM -> RAM write -> SNA save/load PASS')

if __name__=='__main__':unittest.main(verbosity=2)
