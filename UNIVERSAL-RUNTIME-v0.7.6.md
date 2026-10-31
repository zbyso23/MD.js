# MD.js Ultra v0.7.6 — Universal Runtime (within PC Phase 1)

**State:** implemented and tested as a browser-neutral, classic JS runtime; NOT closing Phase-1 CPU/chipset Gate 1.

## Frozen decisions

- Automatic `fetch('./file')` is preferred when available; on failure user picks a file. **Do not remove fetch.**
- Worker code is **plain JS embedded as an inline text string in the lab HTML**, instantiated as `Blob` and `URL.createObjectURL()`. Worker is optional and can fail. Currently used for JSON snapshot serialization, **not CPU execution**.
- Use File API (`File.arrayBuffer`, fallback `FileReader`) if permitted; user can paste ZX ROM Base64 or snapshot JSON if picking files is unavailable.
- Use localStorage if permitted; **JSON export and import are always available** regardless of localStorage status. Snapshots are independent files, with version and machine type.
- Pure classic JavaScript, HTML and CSS without WASM, modules, runtime bundling, compiling, CDN or npm dependencies. 80286 and 1 MiB installed system RAM remain HARD FROZEN.

## Implementation files

| Path | Role |
|---|---|
| `MD-Runtime.js` | Async fetch/manual fallback, File API, Blob Worker, Base64 and JSON versioning, download and localStorage guards |
| `optional/pc/PC-Machine.js` | Versioned export/restore of whole implemented Phase-1 guest state and chipset |
| `optional/pc/index.html` | Embedded worker source + PC local-storage/JSON actions + text paste fallback |
| `zx/MD-ZX.js` | ZX JSON checkpoint roundtrip, tape cursor/blocks, ROM matching, browser/file/manual paste controls |
| `zx/vendor/MinZX-mdzx.js` | Prefer shared runtime's fetch attempt for 16KiB ROM; legacy XHR fallback if shared runtime absent |
| `zx-ultra.html`, `zx-in-markdown.html` | Include shared runtime + worker source as classic scripts |
| `zx-screen-demo.html` | Try automatic `fetch`, show manual 6912-byte SCR picker if unavailable |

## Checkpoints and limitations

**PC:** captures profile, RAM and extended RAM, CPU general and segment registers, hidden segment base/limits, MSW and GDT/IDT, flags, PIT counters, PIC state, DMA registers, CMOS, BIOS callback state and keyboard queue. It rebuilds the *original project test firmware* from source; no foreign BIOS/ROM is packed. A snapshot uses the **Phase-1 chipset model**, not a future FDD/VGA/SB implementation. Later phases will extend the versioned schema.

**ZX:** captures CPU state, 48KiB RAM, border, pause state and an optional embedded TAP payload. It intentionally **does not embed copyrighted ROM bytes**. The FNV-1a 32bit fingerprint detects typical mismatches; it is not a cryptographic identity proof. To restore, supply the matching 16KiB ROM and start ZX first (or queue the JSON then start). Other internal transient sound/frame timings are not yet serialized. `.sna` export remains available alongside JSON.

**Size:** PC JSON includes approx. 0.9–1.4 MiB of encoded binary data and may exceed localStorage quotas in constrained browsers. The UI reports storage denial and always allows downloading the JSON. Large tapes add encoded data, up to the ZIP-independent 8MiB TAP limit.

**Worker:** the currently embedded worker serializes a JSON object via `JSON.stringify` using worker message transfer. No worker CPU execution has been implemented or claimed. The worker is never required for snapshot success.

**Browser tests:** actual direct `file://` and `localhost` navigation are blocked by the sandbox's Chromium administrator policy (`ERR_BLOCKED_BY_ADMINISTRATOR`). Tested opaque-origin classic-script execution, Blob Worker and its fallback, File API, ROM manual loading, snapshot round-trips, and fetch errors instead. Direct URL smoke tests remain to be run on ordinary user hardware.

## Manual checks for direct file mode (normal desktop browser)

1. Unzip the public package, open `index.html` by double-click, then open the PC Lab. Boot XT and AT; click **Export JSON**, reset, and **Import JSON**. Verify memory/registers persist.
2. Block or clear site storage, then repeat JSON export/import; verify it still succeeds. Try **Save browser** optionally.
3. Open ZX Ultra, click **Start**; if the ROM cannot auto-load, choose a 16KiB ROM via **↑ ROM**, then **Start** again. Export and import a JSON snapshot (and optionally `.sna`).
4. Open `zx-screen-demo.html`; when local `fetch` fails, use the `.SCR` picker.
5. Optionally run over HTTP(S), and confirm the same UX plus automatic fetch of assets that exist. Network loading is never required for manual ROM handling.
6. Observe that absence of Worker never prevents import/export; the action reports main-thread fallback.

## Verified tests

- `node --test test/universal-runtime.test.js`: Base64 1MiB roundtrip, malformed payloads, fetch success/fail, optional storage rejection, XT/AT snapshots and hidden 286 segment-state preservation.
- `python3 optional/pc/tests/test_universal_browser.py`: real Chromium opaque-origin PC state roundtrip and embedded Blob Worker; manual fallback when fetch fails.
- `python3 zx/tests/e2e/test_universal_zx_browser.py`: real Chromium opaque-origin ZX ROM File API, Z80 state JSON restore; optional external test ROM supplied by `MDJS_TEST_ZX_ROM` (ROM must not be redistributed).
- Existing `npm run test:release` covers PC, ZX, Markdown, Blockly, DocUX and their Chromium regressions.
