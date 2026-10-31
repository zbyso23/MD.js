# MD.js Ultra — Phase 4Q · Hardening, torture & reproducible tests

## Rozsah

**Žádný nový emulovaný hardware, žádné WASM, build-time závislosti ani změna limitu 1 MiB RAM.** Výchozí médium: Phase 4P PERSONAL. Vývojová B: zůstává NASM-free a read-only; pracovní RW kopie zůstává volitelná.

### Co bylo skutečně opraveno

- **ATA IDENTIFY DEVICE (`0xEC`)**: Při načtení 512 bajtů odpovědi se dříve chybně používal běžný postup pro dokončení diskového sektoru, který změnil `sector` a `count`. Nyní se IDENTIFY dokončí bez posunu diskových registrů. `optional/pc/tests/phase4q-ide-chaos.test.cjs` dokládá původní selhání a opravu.
- **F2 browserový test**: starý test používal v Python Playwright neexistující metodu `Locator.is_focused()`. Nyní používá kontrolu `document.activeElement`. (Nejde o opravu funkce aplikace; jde o opravu testu.)

### Nová automatizovaná zátěž

| Oblast | Nový soubor testů | Verifikace |
| --- | --- | --- |
| ATA PIO | `phase4q-ide-chaos.test.cjs` | IDENTIFY registry, 80 seedovaných vícesektorových zápisů/čtení, snapshot, export/import, invalidní příkazy/rozsahy |
| FDD | `phase4q-floppy-chaos.test.cjs` | 130 seedovaných CHS zápisů **na každém** XT/AT, obě jednotky, read-only, atomická obnova |
| FAT12/FAT16 | `phase4q-fat-image-chaos.test.cjs` | 36 náhodných sad souborů, nezávislé parsování FAT řetězců, dvojité FAT, byte-for-byte obsah, 8.3 kolize, limity |
| Paste Code | `phase4q-paste-fuzz.test.cjs` | 500 seedovaných ASCII zdrojáků, scancode/CRLF, 16 380 B hranice, Unicode/control fail-closed |
| 80287XL | `phase4q-fpu-oracle.test.cjs` | 3 200 kombinací zaokrouhlování, 1 000 celočíselných aritmetik/porovnání, stack/snapshot |
| SB2 + OPL2 | `phase4q-audio-dma.test.cjs` | 96 DMA bloků na XT/AT s IRQ5 a bez změny RAM, 256 sample frame snapshot determinismus |
| F2/Markdown/ASM | `test_encyclopedia_inline_phase4q.py` | skutečný Chromium renderer na 6 stránkách, F2, ikona, Markdown/Assembler, hledání, bez výsledků, náhled zdrojáku, Esc, fokus |

Testy používají pevné seedu a při selhání tisknou konkrétní iteraci/operaci. Opakovatelnost má přednost před náhodným nereprodukovatelným fuzzingem.

## Spouštění

```bash
npm run test:pc:phase4q
npm run test:encyclopedia:browser   # Chromium UI, inline classic JS/CSS, no URL navigation
npm run test:release                # celý řetězec včetně nových testů
npm run test:file:real              # bez obcházení browser policy; 0 PASS / 2 BLOCKED / 1 FAIL
npm run test:encyclopedia:browser:http # původní skutečný HTTP UI test; separátní
```

### Testovací prostředí vs distribuce

`test_encyclopedia_inline_phase4q.py` načítá beze změny lokální klasiké JS/CSS soubory do stránky (`page.set_content`) a kliká v reálném Chromium. **Není to simulace DOM a není to důkaz, že browser dovolí `file://`.** V prostředí, které zakazuje lokální URL, slouží jako oddělená kontrola funkčnosti UI. `test:file:real` zůstává nevynechatelným přejímacím testem pro běžný počítač uživatele.

### Známé limity — NEVYKAZOVAT JAKO PASS

- `file://` v tomto sandboxu vrací `ERR_BLOCKED_BY_ADMINISTRATOR` (4/4 stránky), proto certifikace konkrétního desktop browseru zůstává **BLOCKED**.
- 80287XL extended80 je experimentální podmnožina; v celém jádru nezachovává znaménko nuly (`+0` / `-0`) a nemá úplné historické x87 výjimky, přesnost transcendentálních funkcí ani přesné časování. Arithmetic oracle testy výslovně testují celočíselné výsledky **bez semantiky signed zero**.
- 286 protected mode není plný historický OS/BIOS s kompletní správou privilegovaných instrukcí; sound OPL2/SB2 nejsou cycle-accurate.
- Testy nejsou nezávislá certifikace všech DOS programů, kompilátorů nebo dlouhodobého běhu po hodinách; zmrazený hardware a dokumentované hranice zůstávají platné.

## Kritéria uzavření

Výsledky uvádět odděleně: **PASS** (provedeno), **FAIL** (provedeno a selhalo), **BLOCKED** (prostředí nedovolilo), **KNOWN LIMITATION** (zdokumentované omezení). Testovací výstupy a osobní archiv se nesmějí zaměňovat s veřejně redistribuovatelným balíkem ROM/legacy binárek.
