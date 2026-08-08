# Mapa pamięci — wersja 0.1

| Zakres | Przeznaczenie |
| --- | --- |
| `$0080-$00FF` | zmienne zero-page gry |
| `$0100-$01FF` | stos 6502 |
| `$0200-$03FF` | obszar systemowy OS i wektory |
| `$2000-$37FF` | kod i dane tylko do odczytu; stała część załadowanego payloadu |
| `$3800-$3AFF` | tymczasowo dozwolony koniec payloadu loadera w obszarze wyrównania PMG; po loaderze zerowany |
| `$3B00-$3FFF` | aktywne dane Player/Missile Graphics gameplayu; linker i walidator chronią granicę `$3B00` |
| `$4000-$400F` | początek bufora ekranu gameplayu; poza bitmapą loadera |
| `$4010-$4FFF` | loader ANTIC F, linie 0–101 (4080 B); po przejściu `$4010-$43FF` staje się częścią ekranu gameplayu, `$4400-$47FF` charsetem |
| `$5000-$5E0F` | loader ANTIC F, linie 102–191 (3600 B); niewykorzystywane po przejściu |
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

Podczas loadera PMG i jego DMA są wyłączone. Skompresowane źródło pozostaje w
payloadzie poniżej `$3B00`, a surowa bitmapa zajmuje dokładnie
`$4010-$5E0F`. Po 250 ramkach kod wyłącza DMA i DLI, zeruje `$3800-$3FFF`,
odbudowuje ekran `$4000-$43FF` i charset `$4400-$47FF`, po czym uruchamia
gameplay. Stare bajty bitmapy powyżej `$4800` nie są już adresowane przez
display listę.
