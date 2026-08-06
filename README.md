# Dark Fighter

`Dark Fighter` to pionowa strzelanka kosmiczna dla Atari 65XE PAL z 64 KB RAM. Dynamika rozgrywki nawiązuje do `River Raid`: gracz stale przemieszcza się przez niebezpieczny sektor, omija przeszkody i atakuje cele. Kierunek wizualny czerpie z surowego, militarnego science-fiction w duchu `Battlestar Galactica` (2004), ale gra ma własne statki, nazwy i uniwersum.

Aktualny build `0.1.1` jest pierwszym technicznym vertical slice'em z zaakceptowanym kierunkiem ekranu. Zawiera:

- sterowanie statkiem joystickiem w porcie 1;
- strzelanie przyciskiem FIRE;
- przeciwnika z animowanym czerwonym skanerem;
- sprzętową grafikę Player/Missile;
- przewijane w dół pole gwiazd;
- przewijane moduły korytarza, własny charset ANTIC 4 i HUD zgodny z zaakceptowaną kompozycją;
- kolizje, wynik i efekty dźwiękowe POKEY;
- plik `XEX` dla emulatora;
- bootowalny obraz `ATR` dla emulatora i SIO2SD.

## Wymagania

- Node.js 24 lub nowszy;
- npm;
- opcjonalnie emulator Altirra (Windows) albo Atari800/Atari800MacX;
- do prawdziwego Atari: SIO2SD oraz karta SD.

Nie trzeba instalować natywnego `cc65`. Projekt używa przypiętej wersji `ca65/ld65` skompilowanej do WebAssembly, dzięki czemu ten sam build działa na macOS Intel i Windows.

## Pierwszy build

```bash
npm install
npm run build
npm test
npm run preview
npm run package
```

Wyniki pojawią się w `dist/`:

- `dark-fighter.xex` — uruchamianie bezpośrednio w emulatorze jako `dist/dark-fighter.xex`;
- `dark-fighter.atr` — obraz dyskietki bootujący bez DOS-u;
- `dark-fighter-boot.bin` — surowy ładunek sektorów startowych.
- `dark-fighter-0.1.1.zip` — kompletne wydanie: źródła, dokumentacja i binaria.

## Podgląd ekranu

Polecenie `npm run preview` tworzy `build/previews/gameplay-screen.png`.
Jest to deterministyczny, powiększony metodą nearest-neighbour podgląd
kanonicznej klatki ANTIC 4 z HUD-em, konstrukcjami bocznymi oraz statkami PMG.
Generator czyta bezpośrednio dane i wartości rejestrów z `src/main.s`; nie
utrzymuje osobnej kopii grafiki gry. Kolory RGB są stabilnym przybliżeniem
sygnału Atari PAL, dlatego mogą nieznacznie różnić się od palety konkretnego
emulatora albo fizycznego odbiornika.

Plik `dist/dark-fighter.xex` należy wskazać emulatorowi jako program wykonywalny
Atari. W Atari800 trzeba dodatkowo przypisać joystick hosta do portu 1 w
konfiguracji wejścia; sam wybór pliku XEX nie wykonuje tego mapowania.

## Uruchamianie na Atari 65XE przez SIO2SD

1. Skopiuj `dist/dark-fighter.atr` na kartę SD.
2. Zamontuj obraz jako `D1:` w SIO2SD.
3. Włóż joystick do portu 1.
4. Włącz Atari, trzymając `OPTION`, aby wyłączyć BASIC.
5. Statek porusza się we wszystkich kierunkach, FIRE strzela.

Pierwsze uruchomienie na fizycznym sprzęcie należy traktować jako test sprzętowy. Procedura raportowania wyniku znajduje się w `docs/hardware-testing.md`.

## Struktura

```text
src/                    kod 6502
cfg/                    mapa pamięci dla ld65
assets/                 źródła grafiki, muzyki i SFX
levels/                 definicje sektorów
scripts/                przenośny build i walidacja obrazów
tests/                  testy formatów i kontraktów builda
docs/                   architektura, decyzje i testy sprzętowe
dist/                   gotowe pliki do uruchomienia
```

## Status projektu

Wersja `0.1.1` dowodzi pełnego łańcucha: źródło 6502 → asembler → binarny program → XEX → bootowalny ATR, a także wprowadza pierwszy ekran oparty na zaakceptowanym koncepcie. Następny etap to test wizualny w emulatorze, korekta sprite'ów i pewne mapowanie joysticka przed rozbudową rozgrywki.
