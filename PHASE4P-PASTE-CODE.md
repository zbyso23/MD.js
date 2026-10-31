# Phase 4P — Paste Code (XT/286 PC Workbench)

The Developer Workbench contains a native HTML textarea **Paste Code**. User-supplied
ASCII source is converted into **BIOS scan/ASCII words** and fed, in bounded batches,
through the live guest machine's 40h:1Eh keyboard ring buffer. This is virtual typing,
not direct modification of DOS files, RAM, CPU registers, ROM or disk images.

## Usage

1. Open `optional/pc/index.html` directly via `file://` (offline scripts only).
2. Select XT or AT/286; make **Pracovní kopie B: (RW)** if you intend to save.
3. Open **Developer Workbench** and click **Otevřít IDE PASTE.C**. Wait for the
   actual guest `DOS SOURCE EDITOR` title on the emulated monitor.
4. Paste ASCII C/ASM into the HTML textarea and press **Vycvakat do DOS editoru**.
   Select 1/2/4 keys per animation frame, or pause/resume/stop. See live progress.
5. Press F3 to save in native DOS editor; exit using Esc/F10. Export B: as IMG.

For a new source file, open another unused filename using the DOS prompt (`B:IDE B:NEW.ASM`).
`PASTE.C` is a default example filename, not a temporary-file mechanism. If it already
exists, the guest editor opens that content and pasted text is inserted at its caret.

## Safeguards and limits

- Input is sent **only while the real DOS IDE.COM title is visible**, so code cannot
  accidentally be interpreted as shell commands. Other programs cannot receive bulk
  paste through this dedicated button; ordinary keyboard operation remains intact.
- Native editor supports ASCII and at most 16,380 bytes, counting DOS `CRLF` line
  breaks as two bytes. Unsupported Unicode and control keys are rejected with a clear
  error. Optional checkbox explicitly converts decomposable Czech accents to ASCII;
  unsupported typographic punctuation is still rejected rather than silently corrupted.
- Only 1/2/4 keys are staged per frame and only when pending user keys + BIOS ring
  buffer are empty; therefore fast paste does not overflow the 15-entry BIOS buffer.
  Manual keyboard input is blocked during active paste to prevent character mixing.
- Pause/resume changes transfer, not guest CPU. Stop prevents future characters, but
  already queued BIOS keystrokes may be processed. Reset/profile switch cancels job.
- Does not save automatically and does not bypass a read-only B: image.
- F2 Encyclopedia shortcut remains active; host textarea holds focus when typing.

## Verification

`npm run test:pc:paste`: Node key mapping and guards, plus real Chromium + FreeDOS
XT and AT/286 tests which paste C into guest IDE, save with F3 to writable FAT12,
verify exact CRLF bytes on disk, read back with DOS TYPE, and test pause/resume/stop.
This does not certify direct `file://` under every desktop browser/sandbox policy.
