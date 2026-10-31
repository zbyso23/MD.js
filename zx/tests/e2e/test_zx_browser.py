#!/usr/bin/env python3
"""Real-browser UI tests with a deterministic fake CPU (NOT an emulation correctness test).
Optional real-core smoke (--real) requires locally fetched MinZX and ROM assets.
Developer dependency: pip install playwright ; playwright install chromium
The MD.js application itself requires zero packages/imports.
"""
import argparse
import hashlib
import contextlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import sys
import threading
import unittest

ROOT = Path(__file__).resolve().parents[3]
JS = (ROOT / 'zx/MD-ZX.js').read_text()
CSS = (ROOT / 'zx/MD-ZX.css').read_text()
SCREEN = (ROOT / 'zx/ZX-Screen.js').read_text()
ASM = (ROOT / 'zx/ZX-ASM.js').read_text()
SCR = ROOT / 'zx/demos/CHECKER.SCR'
DEMO = ROOT / 'zx/demos/HELLO.TAP'

FAKE_CORE = r'''
window.__fake={started:0,steps:0,reset:0,loaded:0,saved:0,screen:0};
class MinZXFake {
 constructor(id) {
  this.id=id;
  this.mem=new Uint8Array(65536);
  this.mem[0x8000]=0x34;this.mem[0x8001]=0x12;
  this._screen={update:()=>window.__fake.screen++};
  this.state={pc:0x100,sp:0x8000,ix:0x9000,iy:0x5c3a,a:255,b:0,c:0,d:0,e:0,h:0,l:0,imode:1,i:0,r:0,
   flags:{S:0,Z:0,H:0,P:0,N:0,C:1}};
  this.cpu={getState:()=>this.state,setState:s=>{this.state=s},
   is_halted:()=>false,run_instruction:()=>{this.state.pc++;window.__fake.steps++;return 4;}};
 }
 start(){window.__fake.started++;if(this._mdzxOnReady)this._mdzxOnReady();}
 reset(){window.__fake.reset++;this.state.pc=0}
 loadSNA(bytes){window.__fake.loaded++;if(bytes.length!==49179)throw Error('SNA length'); this.mem.set(bytes.subarray(27),0x4000); this.state.sp=bytes[23]|(bytes[24]<<8); this.state.iff2=bytes[19]&4 ? 1 : 0}
 saveSNA(){window.__fake.saved++;return new Uint8Array(49179)}
}
window.MinZX=MinZXFake;
window.Z80=function(){};
window.ZXScreen=function(){};
window.ZXKeyboard=function(){};
window.ZXSoundOutput=function(){};
'''


class ZXBrowserUI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise unittest.SkipTest('Missing test-only playwright: pip install playwright') from exc
        cls.pw = sync_playwright().start()
        executable = os.environ.get('CHROMIUM_BIN') or '/usr/bin/chromium'
        if not Path(executable).exists():
            executable = None
        cls.browser = cls.pw.chromium.launch(executable_path=executable,
                                             args=['--no-sandbox', '--disable-dev-shm-usage'], timeout=15000)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.page = self.browser.new_page(viewport={'width':1200,'height':900}, accept_downloads=True)
        # set_content works without allowing potentially disallowed external navigation.
        self.page.set_content('<!doctype html><html><head></head><body><main id="host"></main></body></html>')
        self.page.add_style_tag(content=CSS)
        self.page.add_script_tag(content=FAKE_CORE)
        self.page.add_script_tag(content=SCREEN)
        self.page.add_script_tag(content=ASM)
        self.page.add_script_tag(content=JS)
        self.page.evaluate("window.__widget=MDZX.mount(document.getElementById('host'))")

    def tearDown(self):
        self.page.close()

    def enter_workbench(self):
        self.page.get_by_role('button', name='⛶ Fullscreen Workbench').click()
        self.page.wait_for_function("document.fullscreenElement || document.querySelector('.mdzx-full-fallback')")

    def test_embedded_no_auto_run_and_no_workbench(self):
        self.assertEqual(self.page.evaluate('window.__fake.started'), 0)
        self.assertTrue(self.page.locator('canvas.mdzx-canvas').is_visible())
        self.assertTrue(self.page.get_by_role('button', name='▶ Start ZX').is_visible())
        self.assertFalse(self.page.locator('.mdzx-workbench').is_visible())
        self.assertFalse(self.page.locator('.mdzx-regs').is_visible())

    def test_start_pause_step_reset_and_registers(self):
        self.page.get_by_role('button', name='▶ Start ZX').click()
        self.assertEqual(self.page.evaluate('window.__fake.started'),1)
        self.assertIn('RUNNING',self.page.locator('.mdzx-status').inner_text())
        self.enter_workbench()
        self.assertTrue(self.page.locator('.mdzx-regs').is_visible())
        self.page.get_by_role('button', name='Ⅱ Pause').click()
        self.assertIn('PAUSED',self.page.locator('.mdzx-status').inner_text())
        self.assertIn('0100',self.page.locator('.mdzx-regs').inner_text())
        self.page.get_by_role('button', name='↳ Step').click()
        self.assertEqual(self.page.evaluate('window.__fake.steps'),1)
        self.assertIn('0101',self.page.locator('.mdzx-regs').inner_text())
        self.page.get_by_role('button', name='↻ Reset').click()
        self.assertEqual(self.page.evaluate('window.__fake.reset'),1)
        self.assertIn('RESET',self.page.locator('.mdzx-status').inner_text())

    def test_import_tap_then_invalid_tap(self):
        self.page.locator('.mdzx-file').set_input_files(str(DEMO))
        self.page.wait_for_function("document.querySelector('.mdzx-status').textContent.includes('TAP mounted:')")
        self.assertIn('TAP mounted:',self.page.locator('.mdzx-status').inner_text())
        self.page.locator('.mdzx-file').set_input_files({'name':'wrong.tap','mimeType':'application/octet-stream','buffer':bytes([5,0,0,1,2])})
        self.page.wait_for_function("document.querySelector('.mdzx-status').textContent.includes('ERROR')")
        self.assertIn('ERROR',self.page.locator('.mdzx-status').inner_text())

    def test_import_sna_then_save(self):
        data=bytearray(49179);data[23:25]=(0x9000).to_bytes(2,'little');data[19]=4
        data[27+0x9000-0x4000:27+0x9000-0x4000+2]=(0x8200).to_bytes(2,'little')
        self.page.locator('.mdzx-file').set_input_files({'name':'test.sna','mimeType':'application/octet-stream','buffer':data})
        self.assertIn('RUNNING',self.page.locator('.mdzx-status').inner_text())
        self.assertEqual(self.page.evaluate('window.__widget.machine.cpu.getState().pc'),0x8200)
        self.assertEqual(self.page.evaluate('window.__widget.machine.cpu.getState().iff1'),1)
        self.assertEqual(self.page.evaluate('window.__widget.machine.cpu.getState().sp'),0x9002)
        self.assertEqual(self.page.evaluate('window.__fake.loaded'),1)
        self.enter_workbench()
        with self.page.expect_download(timeout=5000) as download:
            self.page.get_by_role('button',name='↓ Save SNA').click()
        self.assertEqual(download.value.suggested_filename,'mdjs-48k.sna')
        self.assertEqual(self.page.evaluate('window.__fake.saved'),1)

    def test_rom_selection_requires_16k_and_before_start(self):
        self.page.locator('.mdzx-file').set_input_files({'name':'test.rom','mimeType':'application/octet-stream','buffer':bytes(100)})
        self.assertIn('ERROR',self.page.locator('.mdzx-status').inner_text())
        self.page.locator('.mdzx-file').set_input_files({'name':'test.rom','mimeType':'application/octet-stream','buffer':bytes(16384)})
        self.assertIn('Custom ROM selected',self.page.locator('.mdzx-status').inner_text())
        # A custom ROM start must be checked with real MinZX (mock has no loader).

    def test_unmount_then_mount_is_idempotent(self):
        self.page.evaluate('window.__widget.unmount()')
        self.assertEqual(self.page.locator('.mdzx-shell').count(),0)
        self.page.evaluate('window.__widget=MDZX.mount(document.getElementById("host"))')
        self.assertEqual(self.page.locator('.mdzx-shell').count(),1)
        self.assertEqual(self.page.evaluate('MDZX.mount(document.getElementById("host"))'),None)

    def test_enhance_embedded_code_does_not_autorun(self):
        self.page.evaluate("""() => {
          const container=document.createElement('article'); container.id='doc';
          const pre=document.createElement('pre');pre.className='md-code-syntax-lang-zx';
          pre.textContent='model: 48k';container.appendChild(pre);document.body.appendChild(container);
          window.__enhanced=MDZX.enhance(container);
        }""")
        self.assertEqual(self.page.evaluate('window.__enhanced'),1)
        self.assertEqual(self.page.locator('#doc canvas').count(),1)
        self.assertEqual(self.page.evaluate('window.__fake.started'),0)

    def test_actual_mdjs_markdown_to_zx_widget_integration(self):
        self.page.add_script_tag(content=(ROOT / 'MD.js').read_text())
        self.page.evaluate("""() => {
          const article=document.createElement('article');article.id='from-markdown';
          document.body.appendChild(article);
          const md=['# Before','~~~zx','model: 48k','~~~','## After'].join('\\n');
          new MD({mode:'extended'}).mount(article,md);
          window.__mdMounted=MDZX.enhance(article);
        }""")
        self.assertEqual(self.page.evaluate('window.__mdMounted'),1)
        self.assertEqual(self.page.locator('#from-markdown canvas').count(),1)
        self.assertEqual(self.page.locator('#from-markdown h1').inner_text(),'Before')
        self.assertEqual(self.page.locator('#from-markdown h2').inner_text(),'After')
        self.assertEqual(self.page.evaluate('window.__fake.started'),0)

    def test_asm_editor_golden_and_injects_ram(self):
        self.page.get_by_role('button',name='▶ Start ZX').click()
        self.enter_workbench()
        self.page.get_by_role('button',name='⚙ Assemble + Run').click()
        self.assertIn('Assembled',self.page.locator('.mdzx-asm-result').inner_text())
        self.assertEqual(self.page.evaluate('window.__widget.machine.mem[0x8000]'),0x3E)
        self.assertEqual(self.page.evaluate('window.__widget.machine.mem[0x8001]'),2)
        self.assertEqual(self.page.evaluate('window.__widget.machine.cpu.getState().pc'),0x8000)
        self.page.locator('.mdzx-asm-source').fill('ORG 100\nNOP')
        self.page.get_by_role('button',name='⚙ Assemble + Run').click()
        self.assertIn('ASM ERROR:',self.page.locator('.mdzx-asm-result').inner_text())

    def test_scr_import_pixels_scale_and_save(self):
        self.page.locator('.mdzx-file').set_input_files(str(SCR))
        self.page.wait_for_function("document.querySelector('.mdzx-status').textContent.includes('SCR displayed')")
        self.assertIn('SCR displayed',self.page.locator('.mdzx-status').inner_text())
        self.enter_workbench()
        preview=self.page.locator('.mdzx-scr canvas')
        self.assertEqual(preview.get_attribute('width'),'256')
        self.assertEqual(preview.get_attribute('height'),'192')
        self.assertEqual(preview.evaluate('(e)=>e.style.width'),'512px')
        self.page.get_by_role('button',name='4×').click()
        self.assertEqual(preview.evaluate('(e)=>e.style.width'),'1024px')
        self.page.get_by_role('button',name='Fit').click()
        self.assertEqual(preview.evaluate('(e)=>e.style.width'),'100%')
        with self.page.expect_download(timeout=5000) as dl:
            self.page.get_by_role('button',name='Save SCR',exact=True).click()
        self.assertEqual(dl.value.suggested_filename,'screen.scr')

    def test_scr_memory_roundtrip(self):
        self.page.get_by_role('button',name='▶ Start ZX').click()
        self.page.locator('.mdzx-file').set_input_files(str(SCR))
        self.assertEqual(self.page.evaluate('window.__widget.machine.mem[0x4000]'),0)
        self.enter_workbench()
        with self.page.expect_download(timeout=5000) as dl:
            self.page.get_by_role('button',name='↓ Save SCR').click()
        self.assertEqual(dl.value.suggested_filename,'mdjs-screen.scr')
        path=dl.value.path();self.assertEqual(Path(path).stat().st_size,6912)

    def test_boot_state_waits_for_async_ready(self):
        self.page.evaluate("""() => {
          const old=window.MinZX;
          window.MinZX=class extends old {start(){window.__fake.started++;setTimeout(()=>this._mdzxOnReady(),300);}};
        }""")
        self.page.get_by_role('button',name='▶ Start ZX').click()
        self.assertIn('BOOTING',self.page.locator('.mdzx-status').inner_text())
        self.assertEqual(self.page.evaluate('window.__widget.state'),'BOOTING')
        self.page.wait_for_function("window.__widget.state==='RUNNING'", timeout=2000)
        self.assertIn('RUNNING',self.page.locator('.mdzx-status').inner_text())

    def test_rom_error_cleans_up_and_retry_succeeds(self):
        self.page.evaluate("""() => {
          window.__originalMinZX=window.MinZX;
          window.MinZX=class extends window.MinZX {
            start(){window.__fake.started++; this._mdzxOnError('ROM unavailable');}
          };
        }""")
        self.page.get_by_role('button', name='▶ Start ZX').click()
        self.assertIn('ERROR: ROM unavailable',self.page.locator('.mdzx-status').inner_text())
        self.assertEqual(self.page.evaluate('window.__widget.state'),'OFF')
        self.assertIsNone(self.page.evaluate('window.__widget.machine'))
        self.page.evaluate('() => { window.MinZX=window.__originalMinZX; return true; }')
        self.page.get_by_role('button', name='▶ Start ZX').click()
        self.assertEqual(self.page.evaluate('window.__widget.state'),'RUNNING')

    def test_unmount_during_boot_prevents_late_ready(self):
        self.page.evaluate("""() => {
          const old=window.MinZX;
          window.MinZX=class extends old { start(){ window.__lateReady=this._mdzxOnReady; } };
        }""")
        self.page.get_by_role('button', name='▶ Start ZX').click()
        self.assertEqual(self.page.evaluate('window.__widget.state'),'BOOTING')
        self.page.evaluate('window.__widget.unmount(); window.__lateReady()')
        self.assertEqual(self.page.evaluate('window.__widget.state'),'DESTROYED')
        self.assertEqual(self.page.locator('.mdzx-shell').count(),0)

    def test_without_upstream_assets_fails_closed(self):
        self.page.evaluate('delete window.MinZX')
        self.page.get_by_role('button',name='▶ Start ZX').click()
        self.assertIn('Missing MinZX',self.page.locator('.mdzx-status').inner_text())
        self.assertEqual(self.page.evaluate('window.__fake.started'),0)


class _Silent(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run_real():
    """Hard fail if real emulator + real ROM are not present; no mocks here."""
    vendor=ROOT/'zx/vendor'
    rom=ROOT/'zx/roms/zx48.rom'
    required=['Z80.js','MinZX.js','MinZX-mdzx.js','ZXScreen.js','ZXKeyboard.js','ZXSound.js','utils.js']
    missing=[str(vendor/n) for n in required if not (vendor/n).exists()]
    if not rom.exists() or rom.stat().st_size != 16384:
        missing.append(str(rom))
    if missing:
        print('REAL-E2E BLOCKED: Run python3 zx/fetch-assets.py first. Missing:\n'+'\n'.join(missing),file=sys.stderr)
        return 2
    from functools import partial
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(_Silent,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None,
                        args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                page=browser.new_page()
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto(f'http://127.0.0.1:{server.server_port}/zx-ultra.html',timeout=15000)
                page.get_by_role('button',name='▶ Start ZX').click()
                page.wait_for_function("window.MDZX && document.querySelector('.mdzx-status').textContent.includes('RUNNING')", timeout=12000)
                page.wait_for_timeout(2500)
                result=page.evaluate("""() => {
                  const m=window.MDZX; const widget=document.querySelector('.mdzx-canvas');
                  const canvas=widget.getContext('2d');
                  const pixels=canvas.getImageData(0,0,widget.width,widget.height).data;
                  const distinct=new Set();for(let i=0;i<pixels.length;i+=4*101)distinct.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);
                  return { colors:distinct.size, status:document.querySelector('.mdzx-status').textContent };
                }""")
                if errors:raise AssertionError('Browser exception: '+' | '.join(errors))
                # Prove the bytes injected into the emulated 16KiB ROM mapping
                # are exactly the user-supplied/local ROM, not another boot image.
                mapped=page.evaluate('Array.from(window.__zxWidget.machine.mem.slice(0,16384))')
                expected_hash=hashlib.sha256(rom.read_bytes()).hexdigest()
                actual_hash=hashlib.sha256(bytes(mapped)).hexdigest()
                if actual_hash!=expected_hash:
                    raise AssertionError(f'ROM mapping differs: {actual_hash} vs {expected_hash}')
                # This checks presence of screen output, not BASIC command readiness.
                if result['colors']<2:raise AssertionError('No non-flat screen rendered: '+str(result))
                # Real Z80 execution: assemble a tiny program and wait for
                # the CPU to write to the actual ZX bitmap RAM.
                page.get_by_role('button',name='⛶ Fullscreen Workbench').click()
                page.locator('.mdzx-asm-source').fill('ORG $8000\nLD HL, $4000\nLD (HL), 255\nHALT')
                page.get_by_role('button',name='⚙ Assemble + Run').click()
                assert 'Assembled' in page.locator('.mdzx-asm-result').inner_text()
                page.wait_for_function('window.MDZX && document.querySelector("canvas") && window.__zxWidget && window.__zxWidget.machine && window.__zxWidget.machine.mem[0x4000]===255',timeout=8000)
                print('REAL-E2E ROM mapping + actual CPU + ASM + screen PASS',result,'sha256='+expected_hash)
            finally:browser.close()
    except Exception as e:
        print('REAL-E2E FAIL:',str(e),file=sys.stderr)
        return 1
    finally:
        server.shutdown();server.server_close()
    return 0

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--real',action='store_true');args=parser.parse_args()
    if args.real:sys.exit(run_real())
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(ZXBrowserUI)
    sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1)
