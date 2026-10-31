"""Deterministic audited MinZX integration patch, fail closed on changed upstream.
This script modifies downloaded MIT vendor code only, never source in this repo.
"""

def replace_once(source, old, new):
    if source.count(old) != 1:
        raise RuntimeError(f'Unsupported MinZX revision: expected one occurrence of {old[:65]!r}, found {source.count(old)}')
    return source.replace(old, new, 1)


def patch_minzx(source):
    marker='// MDZX_VENDOR_PATCH_V2'
    if marker in source:
        return source
    source=replace_once(source,'this._start();','this._started = true;\n        this._start();')
    source=replace_once(source,'new ZXKeyboard(window)','new ZXKeyboard(document.getElementById(canvasIdForScreen))')
    source=replace_once(source,"loadRemoteBinaryFile('zx48.rom', function(data) {", "this._mdzxLoadROM(function(data) {\n            if (!data || data.length !== 16384) {\n                self._mdzxBootError = 'ZX ROM missing or invalid (expected 16384 bytes)';\n                if (typeof self._mdzxOnError === 'function') self._mdzxOnError(self._mdzxBootError);\n                return;\n            }")
    source=replace_once(source,'self._requestAnimation();', "self._mdzxReady = true;\n            if (typeof self._mdzxOnReady === 'function') self._mdzxOnReady();\n            self._requestAnimation();")
    source=replace_once(source,'    _requestAnimation()\n    {', '''    // MDZX_VENDOR_PATCH_V2: per-machine ROM, explicit readiness and disposal.
    _mdzxLoadROM(callback) {
        if (this._mdzxRomBytes) return callback(this._mdzxRomBytes);
        // Unlike the upstream convenience loader, this path reports 404,
        // network errors and timeouts instead of leaving the UI in BOOTING.
        const xhr = new XMLHttpRequest();
        let finished = false;
        const finish = data => { if (!finished) { finished = true; callback(data); } };
        xhr.open('GET', 'zx/roms/zx48.rom', true);
        xhr.responseType = 'arraybuffer';
        xhr.timeout = 10000;
        xhr.onload = () => finish(xhr.status === 200 && xhr.response ? new Uint8Array(xhr.response) : null);
        xhr.onerror = xhr.ontimeout = () => finish(null);
        try { xhr.send(); } catch (_) { finish(null); }
    }
    _requestAnimation()
    {
        if (this._mdzxDestroyed) return;''')
    source=replace_once(source,'        requestAnimationFrame(function(time) {', '        this._mdzxRAF = requestAnimationFrame(function(time) {')
    source=replace_once(source,'    _onAnimationFrame(time)\n    {', '    _onAnimationFrame(time)\n    {\n        if (this._mdzxDestroyed) return;')
    source=replace_once(source,'    _onDrawFrame(time, deltatime)\n    {', '''    _onDrawFrame(time, deltatime)
    {
        if (this._mdzxPaused || this._mdzxDestroyed) {
            this._accumtime = 0;
            this._cyclecount = 0;
            return;
        }''')
    return source


def patch_keyboard(source):
    # Native listener receiver is the focusable canvas; detached nodes do not
    # keep global listeners alive. No upstream patch needed beyond constructor.
    return source
