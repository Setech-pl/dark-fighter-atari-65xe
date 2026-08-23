# Mapa pamięci — wersja 0.1

Adresy poniżej pochodzą z bieżących `build/dark-fighter.map` i
`build/dark-fighter.lbl`. Zakresy zachodzące na siebie mają różne czasy życia;
pojemność ATR, boot payload, resident gameplay RAM i pamięć odzyskiwana po
loaderze nie są tym samym budżetem.

| Zakres | Przeznaczenie |
| --- | --- |
| `$0080-$009F` | 32 B zero-page variables; the three unread legacy bullet mirrors were removed |
| `$0100-$01FF` | stos 6502 |
| `$0200-$03FF` | obszar systemowy OS i wektory |
| `$2000-$2F0B` | resident CODE, 3852 B; includes the A2 logical-row mapper and display-list publisher |
| `$2F0C-$3FC8` | resident RODATA, 4285 B; includes charset source, hull/effect glyphs, frontend records including Game Over and the four-row options screen, packed maps, and loader LZ-10/5 source |
| `$3714-$3EFE` | transient loader LZ-10/5 stream, 2027 B |
| `$3EFF-$3FC8` | transient loader display list, 202 B |
| `$4000-$55F8` | on entry: 5625 B packed LZ-10/5 broadside/frontend/enemy/pause runtime; expanded before the loader and then overwritten by bitmap/screen data |
| `$4000-$43FF` | wspólny bufor ekranu gameplayu/frontendu, 1024 B; loader zaczyna bitmapę dopiero pod `$4010` |
| `$4400-$47FF` | gameplay charset, dokładnie 1024 B |
| `$4800-$4BFF` | frontend charset, dokładnie 1024 B, budowany po loaderze |
| `$4C00-$4D1F` | rozwinięta mapa `allied_line_hull`, 32×9 = 288 B |
| `$4D20-$4E3F` | rozwinięta mapa `enemy_void_hull`, 32×9 = 288 B |
| `$4E40-$4E6F` | 48 B stałego stanu, timerów, latch snapshots, fazy widocznych wierszy i scratch puli M1–M3 |
| `$4E70` | 1 B sesyjnego `DIFFICULTY_SETTING`, domyślnie `MEDIUM` |
| `$4E71` | 1 B osobnego akumulatora hull scroll |
| `$4E72-$4E88` | 23 B backing lewej granicznej kolumny starfield |
| `$4E89-$4E9F` | 23 B backing prawej granicznej kolumny starfield |
| `$4EA0-$4EA1` | 2 B flag użycia źródłowych baterii w bieżącym lifecycle |
| `$4EA2-$4EA4` | 3 B timerów launch flash dla M1–M3 |
| `$4EA5` | 1 B stanu sektora `ENGINES/AFT/COMBAT/FORWARD/PROW/DRAIN/COMPLETE` |
| `$4EA6` | 1 B liczby pustych wierszy wprowadzonych podczas `DRAIN` |
| `$4EA7-$4EA9` | 3 B izolowanych: licznik badanych wierszy oraz lewa/prawa granica player–hull contact |
| `$4EAA` | 1 B lifecycle gracza: `ALIVE/DYING/RESPAWN_INVULNERABLE/GAME_OVER` |
| `$4EAB` | 1 B liczby całkowitych żyć gracza |
| `$4EAC` | 1 B licznika dokładnie 250 klatek respawn invulnerability |
| `$4EAD` | 1 B fazy 8/8 blink P0/P3 |
| `$4EAE-$4EAF` | 2 B timerów niezależnych eksplozji lewej/prawej burty |
| `$4EB0-$4EB5` | 6 B pointerów wiersza i kolumn dwóch hull-attached eksplozji |
| `$4EB6-$4EC7` | 18 B backing dwóch footprintów 3×3 |
| `$4EC8` | 1 B timera POKEY channel-4 capital explosion |
| `$4EC9-$4ECA` | 2 B: timer i faza trzyfazowej animacji banków silników |
| `$4ECB` | 1 B aktywnego `ENEMY_ARCHETYPE`; normalny release ustawia `RAIDER` |
| `$4ECC` | 1 B akumulatora ruchu bocznego Raidera `7/8` |
| `$4ECD` | 1 B jawnego active/inactive stanu ordinary enemy |
| `$4ECE` | 1 B HP aktywnego enemy z deskryptora |
| `$4ECF-$4ED0` | 2 B saturującego pending damage i priorytetowego damage source bieżącej ramki |
| `$4ED1-$4ED6` | 6 B skalarnego stanu starfield: seed/RNG, fazy near `7/10` i far `7/20`, timer i indeks twinkle, dirty flag |
| `$4ED7-$4ED8` | 2 B sesyjnego TOP SCORE w packed BCD; zerowany wyłącznie przy pełnym starcie programu |
| `$4ED9-$4EDE` | 6 B menu-music state: active flag, PAL row timer, sequence/pattern indices, channel mask, and token scratch |
| `$4EDF-$4EE2` | 4 B cached gameplay-music AUDF/AUDC values for preemptible channels 1-2 |
| `$4EE3` | 1 B persistent `GAME_MUSIC_ENABLED`, default ON and preserved between games during one run |
| `$4EE4-$4EE9` | 6 B dwóch śledzonych wylotów: visible row oraz dokładny screen pointer low/high; zero high oznacza inactive |
| `$4EEA-$4FFF` | currently unassigned after the loader |
| `$4010-$4FFF` | podczas loadera: pierwsze LMS, linie bitmapy 0–101, 4080 B; po przejściu zakres jest dzielony na ekran, charsety, mapy i wolny ogon opisane wyżej |
| `$5000-$53FF` | dedykowany gameplay HUD charset, dokładnie 1024 B, budowany po loaderze |
| `$5400-$54C9` | 202 B stałego stanu: 19 fighter projectiles, oba kontrolery burst oraz timer/X/Y dwóch wspólnych fighter explosions |
| `$54CA-$5529` | 96 B czterech tablic 24 far stars: active/rendered, logical row, column and screen code |
| `$552A-$5D97` | 2158 B relocated starfield/shared damage/music runtime in a 2278 B reservation |
| `$5D98-$5E0F` | 120 B currently unassigned after the loader |
| `$5000-$5E0F` | podczas loadera: drugie LMS, ANTIC F linie 102–163 i ANTIC E linie 164–191, 3600 B; po przejściu dzielone na HUD charset i wolny ogon |
| `$5E10-$7803` | 6644 B relocated broadside/frontend/HUD/enemy/pause runtime in a 6656 B reservation |
| `$7804-$780F` | 12 B currently unassigned between resident runtime and staging |
| `$7810-$7F0F` | 1792 B starfield/music staging buffer; packed source uses 1711 B through `$7EBE`; after unpacking, `$7810-$7BCF` is reused as the 960 B PAUSED screen backup |
| `$7F10-$7F5A` | 75 B active/inactive A2 gameplay display list A: HUD LMS, fixed divider LMS, 22 gameplay LMS instructions and JVB |
| `$7F5B-$7FA5` | 75 B A2 gameplay display list B; built off-screen and published atomically through page-local `DLISTL` |
| `$7FA6-$7FBB` | 22 B low bytes logical-to-physical gameplay-row table |
| `$7FBC-$7FD1` | 22 B high bytes logical-to-physical gameplay-row table |
| `$7FD2-$7FDA` | 9 B A2 list/ring state: active/next list, event flag, three broadside logical rows, two capital-explosion logical rows and inactive-list prebuild flag |
| `$7FDB-$7FFF` | 37 B currently unassigned after the loader |
| `$8000-$8FFF` | 4096 B bezwarunkowej rezerwacji na przyszły entity/effects state; build sprawdza brak kolizji |
| `$9000-$90E1` | 226 B product-preserving A2 kernel; bootstrap kopiuje identyczne bajty w XEX i cold-boot ATR |
| `$90E2-$90FF` | 30 B wolne w jawnej 256 B rezerwacji A2 kernel |
| `$9100-$9FFF` | bezwarunkowy RAM 65XE pozostawiony nieprzydzielony |
| `$A000-$BFFF` | warunkowy RAM pod BASIC ROM; celowo niewliczony do dostępnej pamięci bez dowodu PORTB dla XEX, cold-boot ATR i realnego 65XE/SIO2SD |
| `$C000-$FFFF` | OS ROM oraz sprzętowe rejestry I/O; nie jest pulą gameplay RAM |

PMG dla bazy `$3800`:

| Zakres | Rola po loaderze |
| --- | --- |
| `$3800-$3AFF` | padding single-line PMG |
| `$3B00-$3BFF` | współdzielone missiles: M0 wyłącznie zarezerwowane dla player weapon; M1–M3 warning/impact broadside |
| `$3C00-$3CFF` | Player 0 — jasny kadłub gracza, `COLPM0=$0E`; M0 dziedziczy ten kolor |
| `$3D00-$3DFF` | Player 1 — steel-blue przeciwnik, `COLPM1=$84`; M1 dziedziczy ten kolor |
| `$3E00-$3EFF` | Player 2 — czerwony skaner, `COLPM2=$46`; M2 dziedziczy kolor, ale fighter fire go nie używa |
| `$3F00-$3FFF` | Player 3 — silnik gracza, `COLPM3=$28`; M3 dziedziczy ten kolor |

Podczas loadera PMG i PMG DMA są wyłączone. Końcowa część strumienia
LZ-10/5 and the loader display list temporarily occupy `$3714-$3FC8` and cannot be
użyta jako dodatkowy bufor. Pakowany strumień loadera leży pod
`$3714-$3EFE`; the former starfield staging at `$3800-$3BBC` therefore overwrote its
końcową część przed dekodowaniem. Poprawiona sekwencja kopiuje pakowany
starfield/music tail to the separate `$7810-$7F0F` buffer; the current 1711 B
occupies `$7810-$7EBE` and expands after 250 complete frames to `$552A-$5D97`. Code
następnie wyłącza NMI i DMA oraz zeruje całe `$3800-$3FFF`; dopiero wtedy
zakres otrzymuje role PMG.

Surowa bitmapa loadera zajmuje dokładnie `$4010-$5E0F`. Po przejściu kod
odbudowuje ekran `$4000-$43FF`, gameplay charset `$4400-$47FF` i frontend
charset `$4800-$4BFF`, a także dedykowany HUD charset `$5000-$53FF`.
`START GAME` przy wyłączonym DMA rozwija dwie pakowane
mapy side hulls do `$4C00-$4E3F`. Są to trwałe dane gameplayu, odzyskane z
bitmapy loadera, a nie dodatkowa pamięć masowa ATR.

Before unpacking the bitmap, `start` expands the packed `$4000-$55F8` tail to
`$5E10-$7803`, preserves the second packed starfield tail at `$7810`, and
copies the bounded A2 kernel to `$9000-$90E1`.
Dekoder jest własnym, bounded LZ-10/5 bez wywołań OS; oba wyniki
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
24 wierszy ANTIC 2, czyli 960 B pod `$4000-$43BF`. Gameplay używa stałego
40-bajtowego HUD-u ANTIC 2 pod `$4000`, stałego dividera ANTIC 4 pod `$4028`
i dokładnie 22 obrotowych wierszy gameplayu ANTIC 4 pod `$4050-$43BF`.
Historyczne „23 gameplay rows” oznaczało divider + 22 właściwe wiersze.
Dwie 75-bajtowe listy A2 pozostawiają HUD i divider nieruchome, a każdy z 22
wierszy ringu ma własny LMS. Common world+hull scroll zmienia logiczną
kolejność wyłącznie ringu i przełącza wcześniej przygotowaną listę jednym
zapisem `DLISTL`; hull-only scroll kopiuje wyłącznie dwa ośmiokolumnowe pasy.
Wszystkie warianty mieszczą się w rezerwacji 1 KB.

The current payload is 15,754 B: the fixed 8192 B block at `$2000-$3FFF`, a
5625 B packed broadside/pause tail, a 1711 B packed starfield/music tail and a
226 B A2 kernel source. It occupies 124 128-byte sectors with 118 B of
final-sector padding. The XEX is 15,766 B
including headers and RUNAD; the ATR remains the standard 92,176-byte image.

Menu music and difficulty do not add zero page. The physical OPTION edge latch
remains present, while removal of three unread bullet mirrors leaves 32 B at
`$0080-$009F`.
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
silników. Runtime sektora używa 5 B trwałego stanu pod `$4EA2-$4EA6`;
poprawiony kontakt i lifecycle gracza dodają 7 B pod `$4EA7-$4EAD`.
Dwie hull-attached eksplozje wraz z backingiem i timerem channel 4 dodają
27 B pod `$4EAE-$4EC8`, a animacja silników 2 B pod `$4EC9-$4ECA`, bez
zmiany zero page. Fighter corridor clamp używa istniejących `enemy_x` i
`enemy_direction`, więc jego resident-state delta wynosi 0 B.

Roster pass 1 dodaje 1 B trwałego `ENEMY_ARCHETYPE` pod `$4ECB`. Bajty
`$4ECC-$4ECD` przechowują akumulator ruchu Raidera `7/8` i active flag, bez
nowego zero page.
Trzy maski body zajmują 48 B, a dziewięć zwartych bajtów skanera (trzy fazy ×
trzy typy) 9 B. Skompaktowane tablice runtime zajmują 84 B w BROADSIDE,
a HP/score dalsze 6 B w CODE; build-side raport deskryptora ma 33 B. Tabela
polityki burst są stałymi i trzybajtową tabelą pauz. Manifest i dziesięć PNG pozostają wyłącznie
build-side.

Wspólna fighter explosion dodaje 54 B danych graficznych: sześć masek 8×8
oraz sześć masek jasnego core. Dwa równoczesne sloty wykorzystują 6 B pod
`$54C4-$54C9` (timer/X/Y na Viper i ordinary enemy); nie dodają zero page,
PMG ani dynamicznej alokacji.

The accepted compact-HUD checkpoint had a 12,906 B payload and 12,918 B XEX.
The current candidate is 15,754 B and 15,766 B respectively; boot uses 124
sectors with 118 B padding, while the ATR remains 92,176 B.
Pula pod `$5400-$54C9` ma 202 B: dotychczasowe 196 B oraz po timerze, X i Y
dla dwóch współdzielonych fighter explosions. Zero page now totals 32 B. Cztery tablice X/Y/
lifetime i backing/pointery są stałe, bez alokacji dynamicznej.
Skompaktowane resident tabele archetypów zajmują 84 B w końcu BROADSIDE plus
6 B HP/score w głównym bloku; build-side descriptor report ma 33 B. Trzy nowe
bajty stanu pod `$4ECE-$4ED0` oraz 2 B TOP SCORE pod `$4ED7-$4ED8` nie
zwiększają zero page. Po jednorazowym
rozpakowaniu `$7810-$7BCF` becomes a bounded PAUSED screen backup. The future
entity/effects reservation is explicitly limited to `$8000-$8FFF`; the BASIC
ROM window `$A000-$BFFF` is not counted as available.

Obie pule burst wykonują trzy ograniczone przebiegi po 19 slotach
(erase/update/render), bez skanu ekranu i bez alokacji dynamicznej.
Stacjonarny efekt zapisuje PMG tylko co cztery ramki i czyści go raz przy
expiry. Dla wspólnej ramki world+hull finalizacja granicznych backingów i
widocznych wylotów wykonuje się raz po obu kopiach, nie dwa razy. Starfield
zastępuje dawny skan 24 komórek jednym wyborem near, a bounded far pass skanuje
24 rekordy tylko przy zdarzeniu warstwy. Near wykonuje dokładnie 7/10, a far
7/20 kroków hull. Akumulator Raidera dodaje bounded ścieżkę `7/8`.

Ręczny source bound został usunięty. Wykonywalny raport z linkowanych bajtów
mierzy main loop A2 jako 19 761 cykli CPU DMA-off i 15 807 cykli zapasu
wyłącznie w metryce porównawczej. Dokładny trace zegara ANTIC w Atari800 z DMA
`$3E` i DLI NMI `$80` mierzy 31 440 cykli wall oraz 4 128 cykli fizycznego
headroom. Pełne 9 040 ramek i osobny przebieg celowany mają po zero opuszczonych
synchronizacji i zero deadline overruns; fizyczny gate 31 568/4 000 jest
spełniony. Addytywne 32 641 pozostaje tylko estymacją diagnostyczną. Metoda i ograniczenia są opisane w
`docs/runtime-headroom.md`. `update_top_score` runs only on a scoring frame.
Death, respawn, and Game Over do not write SCORE or TOP. Game Over leaves the
steady main loop and formats both values once while DMA is disabled. Active
SFX or player death skip music register restores and are cheaper;
`GAME MUSIC: OFF` leaves `MUSIC_ACTIVE` clear, so the main loop performs no
player call and no music POKEY write. The active-frame OPTION poll costs 13
cycles; a held OPTION after resume returns to the frame wait without advancing
the simulation.
The packed gameplay score is fixed-width: one byte contains both channel
events for one row. `GAME_MUSIC_EVENTS_PER_TICK_LIMIT=1` is asserted by the
assembler and generated-data tests, so a row boundary performs exactly one
event read and cannot enter an unbounded command-parser loop. This hard bound
is already included in the 256-cycle worst-row estimate.
Pomiar realnego 65XE pozostaje bramką sprzętową.

Capital `FLYING` nie zapisuje już dziedziczonego koloru M1–M3: jeden logiczny
slot zachowuje w istniejących `BROAD_PREV_Y/H` pierwszy kod i pozycję, a
nieużywany po software-collision `BROAD_COLLISION` drugi kod dwóch sąsiednich
komórek ANTIC 4. Dwa już istniejące glify (`base+18/+19`) dają 8×6 slug; D7 wybiera
`COLPF2=$1E` dla Colonial albo `COLPF3=$46` dla Cylon. Relokowany runtime
broadside/pause runtime occupies 6644/6656 B; relocated shared procedures,
frontend option helpers, and both music players share the 2158/2278 B
starfield block. The packed tails are 5625 B and 1711 B; the separate A2
kernel occupies 226/256 B at `$9000`.
`WARNING` i `IMPACT`
korzystają z maskowych par M1–M3; M0 pozostaje wyłącznie zarezerwowane dla
player weapon. Fighter fire używa 56 glifów fazowych: 36 dla Vipera jest
kopiowanych, a 20 dla Raidera budowanych jednorazowo z kompaktowych masek.
Trafiają do niekolidujących indeksów 11–46 i 90–109 gameplay charsetu, dzięki
czemu aktywne strzały nie zapisują fontu.

Dwie 32-bajtowe tablice bazowych granic HPOS oraz dwie dodatkowe 32-bajtowe
tablice profili PROW są deterministycznie generowane z tych
samych map, depth i projekcji turretów co ekran. Detektor kontaktu P0/P3 nie
alokuje osobnej collision map i nie czyta `P0PF/P3PF`; gwiazdy mogą ustawić
playfield latch, ale nigdy nie trafiają do tablic granic kadłubów.

## Odrzucony kandydat pełnego playfieldu ANTIC 2

Owner wybrał ANTIC 4 dla playfieldu i pełnoekranowy ANTIC 2 nie będzie
integrowany. Spike nie zmienia powyższej mapy playfieldu. Zakres
`$5000-$53FF`, rozważany historycznie dla
monochromatycznych kadłubów, jest teraz używany wyłącznie przez dedykowany
font tekstowego HUD-u ANTIC 2. Nie powstaje drugi charset kadłubów ani
transition całego playfieldu.

Proponowany charset ma dokładnie 1024 B. Ekran `$4000-$43FF`, rozwinięte mapy
`$4C00-$4E3F`, metadata baterii i PMG `$3800-$3FFF` mogą być współdzielone bez
dodatkowych bajtów. Źródło prototypu zawiera 192 B glifów kadłubów i 16 B
gwiazd, lecz nie jest linkowane. Hipotetyczna integracja potrzebowałaby
jeszcze osobnej 32-bajtowej display list oraz krótkich procedur przygotowania,
przejścia i jednego DLI palety. Bieżące 40 B fill przed `$4000` nie wystarczy na ten
kod. Liczby pozostają evidence odrzuconego wariantu, a nie przyszłą rezerwacją
lub planem przepakowania.
