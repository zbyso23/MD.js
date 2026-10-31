# MD.js Ultra — Fáze 3 (Audio): Source Gate & Test Foundation

**Datum:** 24. 10. 2026  
**Vstup:** `MDjs-Ultra-v0.8.2-STABILIZATION-2-UX-PERSONAL_20261023231958.zip`  
**Základ Gitu:** `eea40ba` (původní HEAD, existující rozpracované změny Stabilization 1+2 zachovány)  
**Stav:** **3A BLOCKED — zvuková periferie zatím NENÍ implementovaná.**

## Co bylo v této dodávce skutečně uděláno

1. Ověřena struktura PERSONAL ZIP, existující DOSBox-X referenční materiály CPU/BIOS/PIC a aktuální `PC-Machine.js`.
2. Ověřen stav: `PIT8253.advance()` postupuje jen kanál 0, ne PIT2; port 61h je pouze latch; DMA8237 pouze registry, bez DMA přenosů; port 83h pro DMA page ch1 není implementován; chybí LPT, OPL2 i SB2 DSP. `PCMachine.run()` má přibližné časování BIOS ticků podle vykonaných instrukcí; jednotný hodinový zdroj pro audio ještě není.
3. Připraven `optional/pc/phase3/source-requirements.json`: 14 povinných + 5 doplňujících zdrojových souborů, rozdělených do fází 3A/3B/3C/3D. Požadovaná revize: DOSBox-X `029bd65c5dcc7cdc7f2e14e35278620d9707d969` (odpovídá záznamu v dříve dodaných podkladech; nezávislá remote byte-verifikace neproběhla).
4. Připraven vývojový Node skript `optional/pc/phase3/check-audio-sources.cjs`: kontrola přítomnosti, jedné revize, SHA-256 dodaných souborů vůči lokálnímu manifestu, deklarací licencí a základního zabezpečení cest. Jde o kontrolu lokální integrity, nikoli náhradu ověření upstreamu a právního auditu.
5. Přidány testy `source-gate.test.cjs` a `audio-foundation.test.cjs`, včetně skutečných **guest x86 OUT/IN** na XT i AT. Pět nezrealizovaných zvukových scénářů je výslovně označeno jako TODO, nikoliv jako PASS.
6. Doplněny skripty v `package.json`: `npm run test:pc:phase3:preflight`, `npm run phase3:source-gate [-- --stage=3A|3B|3C|3D|ALL]`. Žádná runtime dependency, změna CPU/BIOS nebo emulovaná zvuková karta nebyla přidána.

## Čerstvé testy

| Test | Výsledek |
| --- | --- |
| Markdown/runtime Node | **192 PASS** |
| Blocks/Arduino Node | **54 PASS** |
| ZX Node | **31 PASS** |
| PC XT/AT Node | **241 PASS** |
| Phase 3 preflight | **13 PASS, 5 TODO, 0 FAIL** |
| Celkem nově ověřené úspěšné testy | **531 PASS** (518 starších + 13 nových; různá testovací volání) |
| Phase 3 source gate 3A | **BLOCKED:** chybí 5 zdrojáků a manifest |
| Phase 3 source gate ALL | **BLOCKED:** chybí 14 zdrojáků a manifest |
| Browser audio E2E / WebAudio | **NEPROVEDENO**, zvuk ještě není implementován |

Číslo 531 není dokladem fungujícího zvuku ani kompletního 80286. Ani jeden zvukový Gate 3A/3B/3C/3D není označen za PASS.

## Co nyní potřebuji dodat jako první: 3A / PC Speaker

Prosím dodat **pět nezměněných referenčních souborů DOSBox-X z jedné revize** `029bd65c5dcc7cdc7f2e14e35278620d9707d969`:

1. `src/hardware/pcspeaker.cpp`
2. `src/hardware/8255.cpp`
3. `src/hardware/timer.cpp`
4. `src/hardware/iohandler.cpp`
5. `src/hardware/mixer.cpp`

Ideálně v ZIPu se zachováním relativních cest a upstream licenčních hlaviček; přidat relevantní `include/timer.h`, `include/mixer.h` a další hlavičky potřebné k výkladu rozhraní, pokud existují v této revizi. `pic.cpp` a `pic.h` už v osobním projektu máme, ale verifikace vůči upstreamu nebyla dokončena.

Další zdroje teprve při příslušných dílčích krocích: 3B `src/hardware/parport/parport.cpp` (a volitelně `disney.cpp` pro odlišení jiného zařízení); 3C `adlib.cpp/.h`, `opl.cpp/.h`, `dbopl.cpp/.h`; 3D `sblaster.cpp`, `dma.cpp` a příslušná rozhraní. Plný seznam je v `source-requirements.json`.

**Důležité:** podle schválené zásady „source-first“ neimplementuji chybějící hardwarové protokoly z odhadu. Po převzetí souborů: ověřím hash/provenienci/licence, připravím deterministic PCM clock, implementuji PC Speaker skrze guest PIT2/61h a doplním testy tak, aby jeden dosavadní TODO po druhém přecházel na skutečný PASS.

## Co zůstává neměnné

Čistý browser JavaScript ES6, spouštění bez serveru s fallbackem pro `file://`, žádné WASM/build/transpile/CDN, XT a AT/286, nanejvýš 1 MiB systémové RAM, žádné 386/SB16/OPL3. Stávající PERSONAL ROM/FreeDOS/DEBUG a Git historie zůstávají uvnitř ZIPu; nepovažovat za PUBLIC OSS release.

## Reference (orientační mapa, nikoli licence k přebírání)

- DOSBox-X mapa zdrojů: https://github.com/joncampbell123/dosbox-x/blob/master/README.source-code-description
- DOSBox-X seznam souborů: https://dosbox-x.com/doxygen/html/files.html
- Původní handover MD.js Ultra (přiložený v předchozím chatu), kapitoly 7 a 9.
