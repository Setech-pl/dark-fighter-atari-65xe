# Mapa pamięci — wersja 0.1

Adresy poniżej pochodzą z bieżących `build/dark-fighter.map` i
`build/dark-fighter.lbl`. Zakresy zachodzące na siebie mają różne czasy życia;
pojemność ATR, boot payload, resident gameplay RAM i pamięć odzyskiwana po
loaderze nie są tym samym budżetem.

| Zakres | Przeznaczenie |
| --- | --- |
| `$0080-$00A1` | 34 B zmiennych zero-page; bez zmian dla kadłubów |
| `$0100-$01FF` | stos 6502 |
| `$0200-$03FF` | obszar systemowy OS i wektory |
| `$2000-$2B61` | resident code, 2914 B |
| `$2B62-$3FBE` | resident RODATA, 5213 B, przed strumieniem loadera; obejmuje charset source, 31 glifów kadłubów/efektów, rekordy frontendu i pakowaną mapę enemy hull |
| `$316F-$3E98` | przejściowy strumień PackBits loadera, 3370 B |
| `$3E99-$3F62` | przejściowa display list loadera, 202 B |
| `$3F63-$3FFF` | padding stałego 8192-bajtowego bloku boot payloadu |
| `$4000-$4EA4` | przy wejściu: 3749 B pakowanego LZ-10/5 broadside/frontend runtime; rozwijane przed loaderem i potem nadpisywane przez bitmapę/ekran |
| `$4000-$43FF` | wspólny bufor ekranu gameplayu/frontendu, 1024 B; loader zaczyna bitmapę dopiero pod `$4010` |
| `$4400-$47FF` | gameplay charset, dokładnie 1024 B |
| `$4800-$4BFF` | frontend charset, dokładnie 1024 B, budowany po loaderze |
| `$4C00-$4D1F` | rozwinięta mapa `allied_line_hull`, 32×9 = 288 B |
| `$4D20-$4E3F` | rozwinięta mapa `enemy_void_hull`, 32×9 = 288 B |
| `$4E40-$4E6F` | 48 B stałego stanu, timerów, latch snapshots, fazy widocznych wierszy i scratch puli M1–M3 |
| `$4E70` | 1 B sesyjnego `DIFFICULTY_SETTING`, domyślnie `MEDIUM` |
| `$4E71` | 1 B osobnego akumulatora hull scroll |
| `$4E72-$4E87` | 22 B backing lewej granicznej kolumny starfield |
| `$4E88-$4E9D` | 22 B backing prawej granicznej kolumny starfield |
| `$4E9E-$4E9F` | 2 B flag użycia źródłowych baterii w bieżącym lifecycle |
| `$4EA0-$4EA2` | 3 B timerów launch flash dla M1–M3 |
| `$4EA3` | 1 B stanu sektora `ENGINES/AFT/COMBAT/FORWARD/PROW/DRAIN/COMPLETE` |
| `$4EA4` | 1 B liczby pustych wierszy wprowadzonych podczas `DRAIN` |
| `$4EA5-$4EA7` | 3 B izolowanych: licznik badanych wierszy oraz lewa/prawa granica player–hull contact |
| `$4EA8` | 1 B lifecycle gracza: `ALIVE/DYING/RESPAWN_INVULNERABLE/GAME_OVER` |
| `$4EA9` | 1 B liczby całkowitych żyć gracza |
| `$4EAA` | 1 B licznika dokładnie 250 klatek respawn invulnerability |
| `$4EAB` | 1 B fazy 8/8 blink P0/P3 |
| `$4EAC-$4EAD` | 2 B timerów niezależnych eksplozji lewej/prawej burty |
| `$4EAE-$4EB3` | 6 B pointerów wiersza i kolumn dwóch hull-attached eksplozji |
| `$4EB4-$4EC5` | 18 B backing dwóch footprintów 3×3 |
| `$4EC6` | 1 B timera POKEY channel-4 capital explosion |
| `$4EC7-$4EC8` | 2 B: timer i faza trzyfazowej animacji banków silników |
| `$4EC9-$4FFF` | obecnie nieprzydzielone po przejściu loadera |
| `$4010-$4FFF` | podczas loadera: pierwsze LMS, linie bitmapy 0–101, 4080 B; po przejściu zakres jest dzielony na ekran, charsety, mapy i wolny ogon opisane wyżej |
| `$5000-$53FF` | dedykowany gameplay HUD charset, dokładnie 1024 B, budowany po loaderze |
| `$5400-$5E0F` | nieprzydzielone po przejściu loadera |
| `$5000-$5E0F` | podczas loadera: drugie LMS, ANTIC F linie 102–163 i ANTIC E linie 164–191, 3600 B; po przejściu dzielone na HUD charset i wolny ogon |
| `$5E10-$700C` | 4605 B relokowanego runtime broadside/frontend/HUD: dane, moduły sektora, profile prow, eksplozje, audio, granice kolizji, tabele i ograniczone procedury |
| `$700D-$700F` | niewykorzystany ogon 4608-bajtowej rezerwacji `BROADSIDE_RAM` |
| `$7010-$BFFF` | obecnie nieprzydzielone dla kolejnych resident systemów i assetów |
| `$C000-$FFFF` | ROM i sprzętowe rejestry I/O |

PMG dla bazy `$3800`:

| Zakres | Rola po loaderze |
| --- | --- |
| `$3800-$3AFF` | padding single-line PMG |
| `$3B00-$3BFF` | współdzielone missiles: M0 player weapon, M1–M3 heavy broadside pool |
| `$3C00-$3CFF` | Player 0 — jasny kadłub gracza, `COLPM0=$0E`; M0 dziedziczy ten kolor |
| `$3D00-$3DFF` | Player 1 — przeciwnik, `COLPM1=$0C`; M1 dziedziczy ten kolor |
| `$3E00-$3EFF` | Player 2 — skaner, `COLPM2=$46`; M2 dziedziczy ten kolor |
| `$3F00-$3FFF` | Player 3 — silnik gracza, `COLPM3=$28`; M3 dziedziczy ten kolor |

Podczas loadera PMG i PMG DMA są wyłączone. Końcowa część strumienia
PackBits oraz loader display list może więc czasowo zajmować `$3800-$3FF3`.
Po 250 pełnych ramkach kod wyłącza NMI i DMA, po czym zeruje całe
`$3800-$3FFF`; dopiero wtedy zakres otrzymuje role PMG. Żaden kod ani resident
data potrzebne w gameplayu nie znajdują się w tym nadpisywanym ogonie.

Surowa bitmapa loadera zajmuje dokładnie `$4010-$5E0F`. Po przejściu kod
odbudowuje ekran `$4000-$43FF`, gameplay charset `$4400-$47FF` i frontend
charset `$4800-$4BFF`, a także dedykowany HUD charset `$5000-$53FF`.
`START GAME` przy wyłączonym DMA rozwija dwie pakowane
mapy side hulls do `$4C00-$4E3F`. Są to trwałe dane gameplayu, odzyskane z
bitmapy loadera, a nie dodatkowa pamięć masowa ATR.

Przed rozpakowaniem bitmapy `start` rozwija pakowany ogon `$4000-$4EA4` do
`$5E10-$700C`. Dekoder jest własnym, bounded LZ-10/5 bez wywołań OS; wynik
pozostaje resident przez frontend i gameplay. Nakładanie zakresu źródłowego z
późniejszą bitmapą loadera jest celowe i bezpieczne, ponieważ dekoder kończy
się przed pierwszym zapisem bitmapy.

Gameplay charset pozostaje obrazem 1024 B. Glify bazowe używają indeksów
0–58, a 31 glifów kadłubów/efektów indeksów 59–89. Każda strona ma jeden glif wylotu
i jeden siedmiobajtowy rekord funkcjonalnej baterii. Zwarty 294-bajtowy source glifów
frontendu leży dalej w niewyświetlanej części tego samego obrazu i jest
rozwijany do osobnego charsetu przed pokazaniem menu. Pakowane dane kadłubów
to 320 B map, 32 B codebooków, 14 B metadanych dwóch baterii, 8 B
harmonogramu stron, po 3 B stawek world i hull scroll, 3 B ostatnich
bezpiecznych wierszy, 64 B granic kolizji, 192 B indeksów źródłowych modułów,
60 B sekwencji modułów, 16 B masek engine overlay, 64 B profili prow,
64 B granic prow, 54 B faz eksplozji i 48 B obwiedni POKEY, łącznie 945 B.
Dziewięć glifów efektów/profili zajmuje 72 B charsetu, a trzyfazowe bitmapy
dwóch silników dalsze 48 B
w relokowanym runtime. Maski zapisu/kasowania M1–M3 zajmują 6 B, tabele
szerokości double/quad 6 B, a tabela offsetów 2 B.

Main menu używa 820 B pod `$4000-$4333`; jego display list jawnie przechodzi
między wierszami 20 B (ANTIC 7/6) i 40 B (ANTIC 4/2). Pozostałe ekrany używają
24 wierszy ANTIC 2, czyli 960 B pod `$4000-$43BF`. Gameplay używa dwóch
40-bajtowych wierszy ANTIC 2 dla HUD-u i 22 wierszy ANTIC 4 dla playfieldu,
również 960 B. Wszystkie warianty mieszczą się w rezerwacji 1 KB.

Bieżący payload ma 11 941 B: stały blok 8192 B pod `$2000-$3FFF` oraz 3749 B
pakowanego ogona. Zajmuje 94 sektory po 128 B, z 91 B paddingu ostatniego
sektora. XEX ma 11 953 B wraz z nagłówkami i RUNAD, a ATR pozostaje
standardowym obrazem 92 176 B. Rozdzielenie faz world/hull zwiększyło payload
i XEX o 560 B względem zaakceptowanego kandydata HUD/kadłubów 9834/9846 B.
Skończony sektor, launch flash, silniki i puls sluga dodają dalsze 683 B
payloadu i XEX względem bezpośredniego kandydata 10 394/10 406 B; rozmiar ATR
nie zmienił się. Bieżący final-art pass dodaje 248 B payloadu/XEX względem
bezpośrednio poprzedniego 11 693/11 705 B: obejmuje dwa glify krawędzi, 128 B
profili prow, ich bounded runtime oraz kanoniczny clamp fightera.

Trudności nie dodają zero page: linker nadal raportuje 34 B `$0080-$00A1`.
Dotychczasowy `$008A` pozostaje world akumulatorem, hull akumulator leży pod
`$4E71`, a sesyjny wybór pod `$4E70`.
Bezpośredni stan puli to dziewięć tablic po trzy bajty, sześć bajtów pointerów
wierszy i piętnaście bajtów globalnego stanu/scratch, razem 48 B. `SIZEM=$54`
ustawia podwójną szerokość M1–M3 i zachowuje parę szerokości M0. Każdy zapis
scanline używa maski `$0C/$30/$C0`, a kasowanie `$F3/$CF/$3F`, więc inne
missiles w tym samym bajcie pozostają nietknięte.

Skończony sektor w kolejności `ENGINES/AFT/COMBAT/FORWARD/PROW` nie rezerwuje
surowej mapy 240×16 = 3840 B. Dwie
30-bajtowe sekwencje wybierają ośmiowierszowe moduły; 192 B tablic źródłowych
wskazuje wiersze zatwierdzonych map 32×9, a 16 B masek nakłada energię banków
silników. Runtime sektora używa 5 B trwałego stanu pod `$4EA0-$4EA4`;
poprawiony kontakt i lifecycle gracza dodają 7 B pod `$4EA5-$4EAB`.
Dwie hull-attached eksplozje wraz z backingiem i timerem channel 4 dodają
27 B pod `$4EAC-$4EC6`, a animacja silników 2 B pod `$4EC7-$4EC8`, bez
zmiany zero page. Fighter corridor clamp używa istniejących `enemy_x` i
`enemy_direction`, więc jego resident-state delta wynosi 0 B.

Dwie 32-bajtowe tablice bazowych granic HPOS oraz dwie dodatkowe 32-bajtowe
tablice profili PROW są deterministycznie generowane z tych
samych map, depth i projekcji turretów co ekran. Detektor kontaktu P0/P3 nie
alokuje osobnej collision map i nie czyta `P0PF/P3PF`; gwiazdy mogą ustawić
playfield latch, ale nigdy nie trafiają do tablic granic kadłubów.
