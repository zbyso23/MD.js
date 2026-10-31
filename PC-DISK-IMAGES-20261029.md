# MD.js Ultra — PC Disk Images: ArrayBuffer + FDD / IDE

Stav 29. 10. 2026. Diskový milník navazuje na **Phase 4F**. Původní, osobní ROM/FreeDOS assets, Git historie, čistý nezabalený JS a hardwarový scope zůstávají zachovány.

## Rozsah

- **XT (8086 ISA / 8088 cíl):** CGA nebo Hercules, FDD A:/B: (160, 180, 320, 360, 720 KiB, 1,2/1,44 MiB). Žádné IDE ani VGA.
- **AT / 80286:** volitelně VGA i CGA/HGC, FDD A:/B:, a primární ATA IDE (PIO, BIOS INT 13h) až 32 MiB. Žádný 386, žádná extra systémová RAM.
- **In-memory storage:** `PC-Disk-Images.js` poskytuje `createFloppy(format)`, `createIDE(sizeMiB)`, `copyBytes()` — výsledky `create*` jsou skutečné `ArrayBuffer` s kompletním sektorovým RAW obrazem.
- Disketa má FAT12 se základním BPB, dvěma FAT tabulkami a prázdným kořenovým adresářem; 8/16/32MiB HDD má MBR, jeden FAT16 oddíl se shodnými CHS/LBA položkami a dvě FAT tabulky. Vytvořené médium **nemá bootovací DOS systémové soubory**.
- FDD používá izolovanou kopii média v `Uint8Array`, IDEA ukládá změněné sektory do soukromé copy-on-write vrstvy. Původní importovaná data se nikdy nepřepíší.
- Oba řadiče podporují připojení z `ArrayBuffer` i `Uint8Array`; `exportImage()` vrací kopii RAW dat, `exportArrayBuffer()` samostatný buffer.
- **Reset, změna CPU profilu, výměna adaptéru:** zachovají A:/B: (včetně editovaných sektorů a úmyslně prázdných pozic) i IDE médium při návratu do AT. Jediný výslovný příkaz „Obnovit vestavěnou A:“ přepíše pracovní disketu, proto před ním exportuj změny.
- **Přenositelnost:** „Uložit disketu IMG“ a „Export změněného IMG“ stahují aktuální stav jako běžný sektorový `.img`; ten lze kdykoli znovu připojit přes File API. Všechny nově stahované soubory mají ISO timestamp v názvu.
- Celkový JSON snapshot PC obsahuje také média, ale u velkých HDD může být značně rozměrný a localStorage často nebude stačit. Importní limit souboru JSON zvýšen na 64 MiB. Pro dlouhodobý archiv je vhodnější explicitní RAW `.img` export.

## Ovládání

1. Otevři `optional/pc/index.html`. Stávající FreeDOS na A: je připraven automaticky.
2. FDD: zvol A:/B:, formát FAT12 a **+ Nová disketa**. Nově vytvořená A: není bootovatelná; pro boot ponech vestavěnou A:, novou médium vytvoř nejlépe v B:. Tlačítko **↓ Uložit disketu IMG** uloží právě namountovaný a případně pozměněný obraz.
3. IDE: zvol **AT / 80286**, velikost 8/16/32 MiB, **+ Nový FAT16 HDD** a resetuj AT, aby FreeDOS detekoval oddíl. Ověř `DIR C:`. `COPY A:\FDAUTO.BAT C:\TEST.BAT` a následné `DIR C:` proběhly v browserovém integračním testu.
4. **↓ Export změněného IMG** uloží sektorově přesnou aktuální kopii. Vysuň IDE, nahraj stažený RAW obraz a po resetu je DOS soubor znovu přístupný.

## Regresní testy

- `npm run test:pc:disk-images` — nové FAT12/FAT16 generování, kontrola BPB/MBR, sedm formátů diskety, tři kapacity IDE, bezpečná kopie, snapshoty, návrat dat po exportu/importu, reálný browser `download` a restart XT↔AT.
- `test_dos_hdd_c_drive_browser_20261029.py` — skutečné FreeDOS `COPY` z A: na C:, `DIR C:`, HDD download/export IMG, import, restart, `DIR C:` a existence souboru.
- V `npm run test:release` jsou nové testy přidány na konec dosavadního gate; původní CPU/BIOS/FreeDOS/VGA/FPU/audio/ZX/Blocks testy zůstávají.

## Omezení

Není implementován formát VHD/VHDX/QCOW2, adresářový mount host systému ani sdílení souborů s PC. Nové FAT16 HDD není samo o sobě systémový bootovací disk. ATA řadič je pouze ohraničený subset ATA-1 PIO (bez ATAPI, LBA48, bus-master DMA). FDC nepodporuje úplnou fyzikální věrnost ani flux obrazy. Testy v Chromium používají offline vložené skripty (nepředstavují potvrzenou certifikaci přímo `file://` v každém browseru). Pro distribuci mimo PERSONAL build zůstává nutná právní kontrola binárních ROM/DEBUG/FreeDOS assets.
