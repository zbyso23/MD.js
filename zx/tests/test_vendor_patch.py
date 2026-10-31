"""Pure Python smoke for deterministic MinZX vendor adapter patching."""
import pathlib, sys, unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]))
from vendor_patch import patch_minzx

SAMPLE='''
class MinZX {
 constructor(canvasIdForScreen) {
    this._keyb = new ZXKeyboard(window);
 }
 start() {
    this._start();
 }
 _start() {
    const self=this;
    loadRemoteBinaryFile('zx48.rom', function(data) {
      for (let i=0;i<0x4000;i++) self.mem[i]=data[i];
      self._requestAnimation();
    });
 }
    _requestAnimation()
    {
    const self=this;
        requestAnimationFrame(function(time) {self._onAnimationFrame(time);});
 }
    _onAnimationFrame(time)
    {
    this._requestAnimation();
 }
    _onDrawFrame(time, deltatime)
    {
    this.cpu.run_instruction();
 }
}
'''

class PatchTests(unittest.TestCase):
 def test_idempotent_and_contains_guardrails(self):
  out=patch_minzx(SAMPLE)
  self.assertEqual(out,patch_minzx(out))
  self.assertIn('self._mdzxReady = true',out)
  self.assertIn('16384',out)
  self.assertIn('this._mdzxRAF',out)
  self.assertIn('this._mdzxDestroyed',out)
  self.assertIn('xhr.timeout = 10000',out)
  self.assertIn('xhr.onerror = xhr.ontimeout',out)
  self.assertIn('document.getElementById(canvasIdForScreen)',out)
  self.assertNotIn("loadRemoteBinaryFile('zx48.rom'",out)
 def test_upstream_changes_fail_closed(self):
  with self.assertRaises(RuntimeError):patch_minzx(SAMPLE.replace('new ZXKeyboard(window)','new ZXKeyboard(document)'))

if __name__=='__main__': unittest.main()
