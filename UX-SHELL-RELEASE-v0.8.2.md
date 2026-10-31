# MD.js Ultra v0.8.2 — UX Shell & Display Gate

**23. 10. 2026 · Phase 2 UX release (osobní vydání)**

## Co je nové

### PC/XT + AT Workbench
- Monitor má přednost před dlouhými stránkami tlačítek. Technické texty jsou v kontextovém panelu.
- Čtyři vysouvací zásuvky: Diskety, Izolované diagnostiky, Snapshot, První assembler.
- Původní akce **zůstávají funkční**; přesunul se jejich DOM element, nikoli kopie bez handleru.
- Hlavní framebuffer a výpočty jsou nezávislé na otevírání/zavírání panelu.
- Ovládání displeje: Auto, 1×, 2×, Fit; CRT efekt zap/vyp; Amber / Green / White.
- **Hercules graphics 720×348 → 1×, 720×348 CSS px**. Historický textový MDA/Hercules má 720×350 při 1× (nikoli 720×348; bylo by nutné zkreslit či oříznout 2 řádky).
- **CGA 320×200 → 2×, 640×400 CSS px**. **CGA 640×200 → 1×, 640×200 CSS px**.
- Překryvné panely nezmenšují nativní plochu; na malém viewportu se preferuje Fit.
- Zachováno A: FreeDOS 720 KB + DEBUG.COM a individuální import disket; **1,44 MB image není embedovaný**.
- Historická kompatibilita XT/AT/FreeDOS/DEBUG nezměněna; známé omezení DEBUG na AT přetrvává.

### ZX Spectrum
- Nová lišta: virtuální klávesnice, kazety/vývojářský panel, první BASIC lekce.
- Virtuální ZX klávesnice sdílí stejný ULA vstup jako dříve; není to grafická imitace.
- Stávající TAP, SNA, ASM Lite, JSON a debugger přesunuty do dostupného overlay panelu.
- OpenSE BASIC podporuje volitelné Sinclair K makro zkratky: nepředstíráme originální Sinclair ROM tokenizer.
- Panel v režimu fullscreen nezastavuje emulaci.

### Blocks Lite
- Nativní JS DnD workspace nyní zabírá převážnou část okna.
- Kód a simulátor jsou ve vysouvacích panelech; toolbox lze sbalit.
- Stávající Blockly-like vlastní drag/drop, undo, redo, vnořování a JSON import/export beze změny.
- **NULA embedů, žádné Google Blockly, žádné CDN, bundlování ani transpiler**.

### Společné ovládání
- Jeden vanilla JS + CSS drawer handler, Esc pro zavření, vracení fokusu, překryv, záložková smyčka fokusu, `aria-expanded`, `aria-hidden`, `inert`, mobilní bottom sheet, `prefers-reduced-motion`.
- Hlavní rozcestník konečně informuje o fungujícím FreeDOS.

## Testy a ověřená omezení

- **239 PC + 192 Markdown/runtime + 49 Blocks + 31 ZX = 511 unit testů PASS**.
- Nový skutečný **Chromium UX stress test**: 30× diskový panel se stojícím DOS promptem beze změny CPU/VRAM/RAM/diskety; izolovaná ALU/BCD; rozlišení HGC, CGA low, CGA high, zoom/Fit. ZX overlay a 40 kláves + nativní ROM start. 25× Blocks panel, simulace, toggle toolbox a zachování bloku. PASS.
- Browser test používá v této infrastruktuře **inline classic scripts/styles** ze souborů. Přímá navigace `file://`/localhost v kontejnerovém Chromiu je zde administrátorsky blokovaná (`ERR_BLOCKED_BY_ADMINISTRATOR`); není poctivé vydávat ji za otestovanou. Kód zůstává bez serverových závislostí, ale offline reálný uživatelský smoke je ještě vhodný.
- Není to doklad univerzální kompatibility 80286, MDA 6845 cycle accuracy ani plného UX/Edu Gate 0.8.4.

## Spuštění

Otevři `optional/pc/index.html`, `zx-ultra.html` nebo `optional/blockly/index.html` v prohlížeči. Pro načtení osobní ZX ROM či FreeDOS image není potřeba stahování žádných runtime knihoven. Pokud prohlížeč blokuje `file://` prostředky, použij stávající vstupy pro soubory / File API nebo lokální HTTP server.

## Další v roadmapě

- v0.8.3 Edu: strukturované lekce s ověřováním skutečného stavu emulace.
- v0.8.4 Stress & Polish: komplexní mobile/keyboard accessibility, perf profily a širší browser testing.
- Phase 3: PC Speaker, Covox, AdLib/OPL2 a Sound Blaster 2.0.
