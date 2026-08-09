# Mapa pamięci — wersja 0.1

| Zakres | Przeznaczenie |
| --- | --- |
| `$0080-$00FF` | zmienne zero-page gry |
| `$0100-$01FF` | stos 6502 |
| `$0200-$03FF` | obszar systemowy OS i wektory |
| `$2000-$2F44` | kod oraz dane potrzebne po przejściu loadera; bieżący kod kończy się pod `$2A12` |
| `$2F45-$3C6E` | przejściowy strumień PackBits loadera, 3370 B |
| `$3C6F-$3D38` | przejściowa display list loadera w adresach późniejszych stron Player 0/1 |
| `$3D39-$3D7F` | poza payloadem XEX; 71 B zerowego paddingu ostatniego, 59. sektora ATR |
| `$3D80-$3DFF` | obecnie niezaładowane; po przejściu część aktywnej strony Player 1 |
| `$3E00-$3FFF` | granica chroniona linkera: aktywne Player 2 i Player 3 po przejściu loadera |
| `$4000-$400F` | początek bufora ekranu gameplayu; poza bitmapą loadera |
| `$4010-$4FFF` | loader ANTIC F, linie 0–101 (4080 B); po przejściu `$4010-$43FF` staje się częścią ekranu gameplayu, `$4400-$47FF` charsetem |
| `$5000-$5E0F` | loader: ANTIC F linie 102–163 i ANTIC E linie 164–191 (łącznie 3600 B); niewykorzystywane po przejściu |
| `$5E10-$BFFF` | wolne dla kolejnych systemów i assetów |
| `$C000-$FFFF` | ROM i sprzętowe rejestry I/O |

PMG dla bazy `$3800`:

| Zakres | Obiekt |
| --- | --- |
| `$3B00-$3BFF` | missiles |
| `$3C00-$3CFF` | Player 0 — gracz |
| `$3D00-$3DFF` | Player 1 — przeciwnik |
| `$3E00-$3EFF` | Player 2 — skaner |
| `$3F00-$3FFF` | Player 3 — silnik gracza |

Podczas loadera PMG i jego DMA są wyłączone, dlatego strumień i display list
mogą tymczasowo zajmować części przyszłych stron P0/P1 do `$3D38`. Surowa bitmapa zajmuje dokładnie
`$4010-$5E0F`. Po 250 ramkach kod najpierw wyłącza DMA i DLI, następnie zeruje
całe `$3800-$3FFF`, odbudowuje ekran `$4000-$43FF`, gameplay charset
`$4400-$47FF` i frontend charset `$4800-$4BFF`.
Main menu używa z już zarezerwowanych stron P0 `$3C68-$3C87`, P2
`$3E78-$3E79` i P3 `$3F68-$3F87`; sub-screeny wyłączają PMG. `START GAME`
ponownie czyści całe PMG przed inicjalizacją gameplayu. Stare bajty bitmapy
powyżej `$4C00` nie są już adresowane przez display listę.

Bieżący payload kończy się pod `$3D38`. Luka `$3D39-$3D7F` ma 71 B i jest
jedynie paddingiem ostatniego sektora w stronie późniejszego Player 1,
nie całkowitą wolną pamięcią Atari ani nową rezerwacją resident gameplayu.

Main menu używa 820 B pod `$4000-$4333`; jego display list jawnie przechodzi
między wierszami 20 B (ANTIC 7/6) i 40 B (ANTIC 4/2). Pozostałe ekrany używają
24 wierszy ANTIC 2, czyli 960 B pod `$4000-$43BF`. Oba zakresy mieszczą się w
istniejącym buforze 1 KB i nie przekraczają granicy strony.
