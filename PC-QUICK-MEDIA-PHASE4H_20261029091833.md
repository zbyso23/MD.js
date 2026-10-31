# MD.js Ultra — Phase 4H: rychlý import souborů do FAT12/FAT16

## Základ a rozsah

Vychází z kompletního Phase 4G PERSONAL ZIP. Hardwarová konfigurace se nemění:
XT/8088 cíl s CGA/HGC a FDD; AT/286 s CGA/HGC/VGA, FDD a IDE. Žádná nová
periferie, 386, WASM, bundler nebo runtime npm závislost. Emulovaná systémová RAM
zůstává maximálně 1 MiB. Virtuální disková data existují odděleně jako ArrayBuffer.

## Rychlý import

V PC Workbenchi otevři **▣ Diskety → 📦 Soubor(y) → virtuální disk**.
Nahrát lze jeden nebo více běžných souborů (COM/EXE/JPG/ZIP/TXT a další),
**celkem nejvýše 5 MiB (5 242 880 bajtů)**. ZIP se **nerozbaluje**; je vložen
jako jediný doslovný soubor ZIP. Nikdy se automaticky nespouští kód z média.

- AUTO: FAT12 720 KiB na B:, pokud se soubory vejdou; následně FAT12 1,44 MiB
  na B:; jinak 8 MiB FAT16 IDE C: na AT/286. Převod z XT na AT proběhne
  automaticky pouze je-li pro obsah potřeba IDE; FreeDOS se poté restartuje.
- Ruční cíl: `Disketa B:` nebo `IDE C:`. Při nemožnosti umístění se vypíše chyba.
- Název souboru se převede na DOS 8.3 (uppercase, zkrácení, bezpečný suffix
  `~n` při kolizi), bez podadresářů a dlouhých jmen.
- Soubor je skutečně uložen do root directory a datových clusterů s oběma
  kopiemi FAT. Nejde o pouhý seznam názvů v UI.
- Po importu lze běžný disk uložit jako RAW `.img`, znovu připojit a dále
  do něj z DOSu zapisovat. A: s FreeDOS zůstává zachována.

## Maximální HDD disk

IDE now accepts 8/16/32/64 MiB and **80 000 000 B (80 MB decimal)**.
Limit 80 MB je produktový limit této laboratoře, **nikoliv historické tvrzení o
univerzálním limitu pevného disku**. Disk 80 MB má MBR, jeden FAT16 oddíl a
emulovanou geometrii 611/8/32 (CHS), spc=4. V reálném FreeDOS Chromium testu byl
disk rozpoznán jako C: a příkaz COPY na něj úspěšně uložil soubor.

## Ochrany a omezení

- Vstup přes File API je ověřen na velikost před načtením; nadlimitní
  import nepoškozuje existující média.
- FDD i IDE při mountu kopírují zdrojový buffer; IDE zachovává copy-on-write.
- Obrazy IMG jsou datové, samy o sobě neobsahují bootovací systém.
- FAT12/FAT16 jsou kořenové adresáře s 8.3 názvy; LFN, adresářové stromy a
  rozbalování ZIP zatím nejsou podporovány.
- Maximální 80MB RAW obraz může spotřebovat značnou paměť prohlížeče;
  používej export/import IMG. Velký HDD je záměrně mimo vhodný rozsah JSON
  snapshotů (současný importní limit JSON je 64 MiB).
- Neznámý host EXE/COM se sám nikdy nespouští. Hostitelské soubory nejsou
  automaticky uploadovány ani odesílány do sítě.
- Úplná 286/80287XL, přesnost zvuku, reálné file:// v ostatních
  prohlížečích a historická věrnost IDE/FDD nadále nejsou certifikované.

## Ověření

- `npm run test:pc:phase1` — PC regrese včetně testů nových souborů.
- `npm run test:pc:quick-media` — FAT12/FAT16 unit + browser import.
- `npm run test:pc:disk-images` — celý diskový gate.
- `npm run test:release` — dosavadní celkový gate včetně rozšířených disků.

Browser scénáře prokázaly: upload ZIP a TXT na XT B:, `DIR B:` + skutečné
`TYPE B:HELLO_WO.TXT`, export IMG; EXE o 1,7 MB přepnul AUTO na AT FAT16 C:,
`DIR C:`, export, vysunutí, import a opakované `DIR C:`; 5MiB+1 odmítnuto.
U 80MB disku FreeDOS rozpoznal MBR/FAT16 oddíl a `COPY A:FDAUTO.BAT C:TEST.BAT`
uspěl. Testy prohlížeče používají inline klasické skripty a nenahrazují
nezávislé ověření `file://` v Chrome/Firefox/Edge.
