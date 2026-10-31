# MD.js Ultra — Phase 4D: DEBUG / VGA / AdLib opravy

## Výchozí podklad
Phase 4C PERSONAL s FreeDOS 720 KiB, MANDEL.COM, TUNE.COM a VGA12/13.COM.
Tato větev zachovává čistý nekompilovaný JavaScript, `file://` fallback, XT 8086-ISA,
AT 80286 bez podpory 386, max. 1 MiB systémové RAM, originální Git historii.

## 1. DEBUG.COM na AT/80286 — potvrzeno a opraveno
Příčina: `DEBUG.COM` v2.50 testuje CPU přes `PUSHF`/`POPF` a bity 12–15.
Na skutečném 80286 v real mode jsou horní čtyři bity při `PUSHF` nulové
a `POPF` je nedokáže nastavit. Stará emulace je chybně zachovávala,
takže DEBUG přešel do větve 386, vykonal prefix 66h a došlo k #UD.
Oprava v `PC-Core.js`: `visibleFlags()` a `restoreFlags()`; reálný
režim 286 maskuje horní nibble při PUSHF/POPF/IRET a při přerušení.
Protected mode zůstává oddělený. Žádná instrukce 386 nebyla přidána.
Browser skutečně otestoval `DEBUG` → `R` (výpis AX=) → `Q` → `A:\>`.

## 2. VGA demo nebylo vadné jádro: chybně očekávaný výsledek testovacích programů
Původní `VGA13.COM` psal jednu barvu na řádek → úzké horizontální pruhy.
Původní `VGA12.COM` zapisoval bitový vzor 0xAA do všech plánů → bílé/černé
svislé proužky. Nahradily je skutečné 16bitové DOS programy:
- VGA13.COM (75 B): dvourozměrný barevný přechod a kontrastní obdélník.
- VGA12.COM (96 B): 16barevná mozaika přes VGA Sequencer `3C4h/3C5h`,
  čtyři planární mapy a přímý zápis do A000h.
Oba soubory byly v původním FAT12 obrazu přepsány na svých clusterech,
bez poškození dalších souborů a se zachováním shody obou FAT a Base64 offline embedu.
Nové browser E2E ověřuje skutečná data pixelů a návrat do textového režimu.
Auto scale VGA 13h nyní 2× (Raw 1×/2×/Fit a CRT korekce zachovány).

## 3. TUNE.COM generoval FM PCM, ale WebAudio ho nedohrávalo
Příčina v browseru: `PC-Audio-Output.js` zahazoval nadbytečné
PCM bloky už nad 0,25s fronty a `pauseCPU()` při autodetekci DOS promptu
zavolal `flush()`, který zastavil i naplánované BufferSource uzly.
Oprava: maximálně ~350 ms audio náskok pro guest emulaci (backpressure),
nouzová hranice 3 s; normální návrat DOSu zachová naplánované vzorky.
Explicitní Pauza/Reset/Ztlumit nadále záměrně zastaví zvuk.
Status informuje o nutnosti uživatelského kliknutí na „Zapnout PC zvuk“;
prohlížečový autoplay bypass se neprovádí.

## Čerstvé testy
- 274 PC unit testů PASS, včetně tří nových testů FLAGS/286.
- 192 Markdown/runtime PASS; 54 Blocks/Arduino PASS; 31 ZX PASS.
- 51 audio/preflight PASS a 5 dosavadních TODO (nikoli PASS).
**Celkem 602 PASS, 0 FAIL, 5 TODO (unit/preflight).**
- Chromium AT DEBUG R/Q → FreeDOS PASS.
- Chromium VGA13 a VGA12 DOS programy → grafika + konkrétní pixely + návrat PASS.
- Chromium TUNE.COM na XT i AT PASS: 7 key-on, 8 key-off,
  38 635 / 61 676 nenulových PCM vzorků, 0 zahazovaných bloků,
  0 flush při návratu na prompt.
- FreeDOS XT+AT, XT DEBUG, MANDEL.COM (501 955 x87 instrukcí),
  IDE copy-on-write, šest audio ukázek a PC/ZX/Blocks UX stress PASS.

## Limity
- Není provedeno fyzické poslechové ověření v uživatelově prohlížeči/zvukovce;
  headless Chromium prokázal WebAudio plánování a nenulové PCM.
- Bez uživatelského kliknutí nelze v běžném browseru automaticky spustit zvuk.
- OPL2/SB2 i FPU 80287XL (binary64) jsou stále historicky neúplná preview.
- Neověřeno kompletní `file://` v Chrome/Firefox/Edge; žádné skryté build závislosti.
- Pět dřívějších audio TODO a neověřené upstream commity referencí jsou otevřené.
- Nespoléhat na kompletní monolitický `npm run test:release` — uvedené gate byly ověřeny jednotlivě.
- Osobní FreeDOS, ROM a debugger nejsou bez licenčního auditu veřejný OSS balík.

## Jak vyzkoušet
1. `optional/pc/index.html`, `AT / 80286`; na FreeDOS `DEBUG`, `R`, `Q`.
2. Přepnout grafickou kartu na VGA, po rebootu spustit `VGA13`, klávesa, `VGA12`, klávesa.
3. Kliknout na **🔊 Zapnout PC zvuk**, teprve pak `TUNE`; počkat na dohrání.
4. `80287XL (preview)` + VGA + `MANDEL` pro náročnější grafický test.

## Regresní příkazy
`npm run test:pc:phase1`, `npm run test:pc:phase4d`,
`npm run test:pc:phase3:preflight`, `npm test`, `npm run test:blocks`,
`npm run test:zx:unit`.

## Historický podklad
Intel Application Note AP-485, Processor Identification: pro 286 real mode
jsou FLAGS bity 12–15 vždy nulové. Reference:
https://kib.kiev.ua/x86docs/Intel/AppNote485/241618-006.pdf
