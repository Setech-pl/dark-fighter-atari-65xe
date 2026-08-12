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
| `$2000-$2F93` | resident code, 3988 B |
| `$2F94-$3FF7` | resident RODATA, 4196 B; obejmuje charset source, 31 glifów kadłubów/efektów, rekordy frontendu, pakowane mapy i dwa źródła LZ-10/5 |
| `$3741-$3F2B` | przejściowy strumień LZ-10/5 loadera, 2027 B |
| `$3F2C-$3FF5` | przejściowa display list loadera, 202 B |
| `$4000-$5269` | przy wejściu: 4714 B pakowanego LZ-10/5 broadside/frontend/enemy runtime; rozwijane przed loaderem i potem nadpisywane przez bitmapę/ekran |
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
| `$4ECC` | 1 B PAL-frame cooldownu broni aktywnego enemy slotu |
| `$4ECD` | 1 B jawnego active/inactive stanu ordinary enemy |
| `$4ECE` | 1 B HP aktywnego enemy z deskryptora |
| `$4ECF-$4ED0` | 2 B saturującego pending damage i priorytetowego damage source bieżącej ramki |
| `$4ED1-$4FFF` | obecnie nieprzydzielone po przejściu loadera |
| `$4010-$4FFF` | podczas loadera: pierwsze LMS, linie bitmapy 0–101, 4080 B; po przejściu zakres jest dzielony na ekran, charsety, mapy i wolny ogon opisane wyżej |
| `$5000-$53FF` | dedykowany gameplay HUD charset, dokładnie 1024 B, budowany po loaderze |
| `$5400-$54C9` | 202 B stałego stanu: 19 fighter projectiles, oba kontrolery burst oraz timer/X/Y dwóch wspólnych fighter explosions |
| `$54CA-$5E0F` | nieprzydzielone po przejściu loadera |
| `$5000-$5E0F` | podczas loadera: drugie LMS, ANTIC F linie 102–163 i ANTIC E linie 164–191, 3600 B; po przejściu dzielone na HUD charset i wolny ogon |
| `$5E10-$740D` | 5630 B relokowanego runtime broadside/frontend/HUD/enemy: dane, moduły sektora, profile prow, eksplozje, audio, granice kolizji, renderer, profile broni, score/damage i skompaktowane tabele archetypów |
| `$7410-$BFFF` | obecnie nieprzydzielone dla kolejnych resident systemów i assetów |
| `$C000-$FFFF` | ROM i sprzętowe rejestry I/O |

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
LZ-10/5 oraz loader display list może więc czasowo zajmować `$3800-$3FF5`.
Po 250 pełnych ramkach kod wyłącza NMI i DMA, po czym zeruje całe
`$3800-$3FFF`; dopiero wtedy zakres otrzymuje role PMG. Żaden kod ani resident
data potrzebne w gameplayu nie znajdują się w tym nadpisywanym ogonie.

Surowa bitmapa loadera zajmuje dokładnie `$4010-$5E0F`. Po przejściu kod
odbudowuje ekran `$4000-$43FF`, gameplay charset `$4400-$47FF` i frontend
charset `$4800-$4BFF`, a także dedykowany HUD charset `$5000-$53FF`.
`START GAME` przy wyłączonym DMA rozwija dwie pakowane
mapy side hulls do `$4C00-$4E3F`. Są to trwałe dane gameplayu, odzyskane z
bitmapy loadera, a nie dodatkowa pamięć masowa ATR.

Przed rozpakowaniem bitmapy `start` rozwija pakowany ogon `$4000-$5269` do
`$5E10-$740D`. Dekoder jest własnym, bounded LZ-10/5 bez wywołań OS; wynik
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
24 wierszy ANTIC 2, czyli 960 B pod `$4000-$43BF`. Gameplay używa jednego
40-bajtowego wiersza ANTIC 2 dla HUD-u i 23 wierszy ANTIC 4 dla playfieldu;
dolny scanline glifów HUD tworzy separator bez dodatkowego wiersza. Całość
nadal ma 960 B. Wszystkie warianty mieszczą się w rezerwacji 1 KB.

Bieżący payload ma 12 906 B: stały blok 8192 B pod `$2000-$3FFF` oraz 4714 B
pakowanego ogona. Zajmuje 101 sektorów po 128 B, z 22 B paddingu ostatniego
sektora. XEX ma 12 918 B wraz z nagłówkami i RUNAD, a ATR pozostaje
standardowym obrazem 92 176 B.

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
silników. Runtime sektora używa 5 B trwałego stanu pod `$4EA2-$4EA6`;
poprawiony kontakt i lifecycle gracza dodają 7 B pod `$4EA7-$4EAD`.
Dwie hull-attached eksplozje wraz z backingiem i timerem channel 4 dodają
27 B pod `$4EAE-$4EC8`, a animacja silników 2 B pod `$4EC9-$4ECA`, bez
zmiany zero page. Fighter corridor clamp używa istniejących `enemy_x` i
`enemy_direction`, więc jego resident-state delta wynosi 0 B.

Roster pass 1 dodaje 1 B trwałego `ENEMY_ARCHETYPE` pod `$4ECB`. Korekta ognia
dodaje 2 B pod `$4ECC-$4ECD`: cooldown i active flag, bez nowego zero page.
Trzy maski body zajmują 48 B, a dziewięć zwartych bajtów skanera (trzy fazy ×
trzy typy) 9 B. Skompaktowane tablice runtime zajmują 84 B w BROADSIDE,
a HP/score dalsze 6 B w CODE; build-side raport deskryptora ma 33 B. Tabela
polityki burst są stałymi i trzybajtową tabelą pauz. Manifest i dziesięć PNG pozostają wyłącznie
build-side.

Wspólna fighter explosion dodaje 54 B danych graficznych: sześć masek 8×8
oraz sześć masek jasnego core. Dwa równoczesne sloty wykorzystują 6 B pod
`$54C4-$54C9` (timer/X/Y na Viper i ordinary enemy); nie dodają zero page,
PMG ani dynamicznej alokacji.

Finalny payload wraz z kompaktowym HUD-em ma 12 906 B. XEX ma 12 918 B, boot
zajmuje 101 sektorów z 20 B paddingu, a ATR pozostaje 92 176 B.
Pula pod `$5400-$54C9` ma 202 B: dotychczasowe 196 B oraz po timerze, X i Y
dla dwóch współdzielonych fighter explosions. Zero page pozostaje 34 B. Cztery tablice X/Y/
lifetime i backing/pointery są stałe, bez alokacji dynamicznej.
Skompaktowane resident tabele archetypów zajmują 84 B w końcu BROADSIDE plus
6 B HP/score w głównym bloku; build-side descriptor report ma 33 B. Trzy nowe
bajty stanu pod `$4ECE-$4ED0` nie zwiększają zero page. Zakres `$7410-$BFFF`
pozostaje nietkniętym, chronionym obszarem przyszłego finale/BOSS.

Obie pule burst wykonują trzy ograniczone przebiegi po 19 slotach
(erase/update/render), bez skanu ekranu i bez alokacji dynamicznej.
Konserwatywna granica źródłowa wspólnej ramki scroll/slot/collision wynosi
około 33 420 cykli przed fighter explosion. Stacjonarny efekt zapisuje PMG
tylko co cztery ramki i czyści go raz przy expiry. Surowa aktualizacja obu
slotów kosztuje poniżej około 1100 cykli, lecz równoczesne `DYING/EXPLODING`
pomija co najmniej około 640 cykli normalnego input/movement/render/fire/
collision. Dla wspólnej ramki world+hull finalizacja granicznych gwiazd i
widocznych wylotów wykonuje się raz po obu kopiach, nie dwa razy; nawet licząc
wyłącznie zaoszczędzony restore daje to konserwatywny bound około 33 380 i
około 2120 cykli do PAL ~35 500.
Pomiar realnego 65XE pozostaje bramką sprzętową.

Capital `FLYING` nie zapisuje już dziedziczonego koloru M1–M3: jeden logiczny
slot zachowuje w istniejących `BROAD_PREV_Y/H` pierwszy kod i pozycję, a
nieużywany po software-collision `BROAD_COLLISION` drugi kod dwóch sąsiednich
komórek ANTIC 4. Dwa już istniejące glify (`base+18/+19`) dają 8×6 slug; D7 wybiera
`COLPF2=$1E` dla Colonial albo `COLPF3=$46` dla Cylon. Relokowany runtime
zajmuje 5630/5632 B. `WARNING` i `IMPACT`
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
