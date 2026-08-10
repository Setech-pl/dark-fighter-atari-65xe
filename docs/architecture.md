# Dark Fighter — architektura

Dokument rozdziela dwie warstwy:

1. **potwierdzoną bieżącą implementację**, którą można wskazać w kodzie,
   linker map, labels i testach;
2. **docelową architekturę przyrostową**, która opisuje granice przyszłych
   systemów, lecz nie twierdzi, że są już zaimplementowane.

Kanoniczne reguły gry znajdują się w `docs/game-design.md`, a kolejność prac
w `docs/roadmap.md`.

## Potwierdzona bieżąca implementacja

### Model wykonania

Program przejmuje ekran i po starcie nie korzysta z usług DOS-u. XEX i ATR
zawierają ten sam payload ładowany pod `$2000`. Pierwsze 8192 B pozostaje pod
`$2000-$3FFF`; 3749-bajtowy pakowany ogon spod `$4000` jest przed loaderem
rozwijany własnym ograniczonym dekoderem do `$5E10-$700C`. Dopiero potem
bitmapa loadera może nadpisać przejściowe źródło. XEX uruchamia etykietę `start`,
a bootowalny ATR wczytuje kolejne sektory i dochodzi do `start` przez
`DOSVEC`. Bieżący gameplay jest jednym resident programem; title loader jest
jedyną fazą ładowania.

Po loaderze program wchodzi do osobnej pętli frontendu. Gameplay nie uruchamia
się sam; wybór `START GAME` przechodzi przez jedną procedurę resetu i dopiero
wtedy wchodzi do istniejącej głównej pętli:

1. czeka na kolejną ramkę przez polling `VCOUNT`;
2. odczytuje joystick i FIRE oraz aktualizuje M0;
3. aktualizuje pojedynczego przeciwnika;
4. przechwytuje wszystkie potrzebne latch'e PMG, zachowuje kontrakt M0,
   aktualizuje trzy sloty broadside i dopiero potem zapisuje `HITCLR`;
5. niezależnie akumuluje world i hull rate; środek przewija z pełną stawką
   trudności, a kadłuby i przyczepione warningi dokładnie o połowę wolniej;
6. aktualizuje krótkie efekty POKEY.

Nie jest to jeszcze docelowy scheduler. Nie ma docelowego player hull, game over,
proceduralnych fal, encounter directora,
debris ani repair drone. Bieżący vertical slice ma finalną bazę graficzną
bocznych kadłubów i działający, deterministyczny prototyp crossfire M1–M3,
z 24-ramkowym SFX trafienia capital hull. Nadal nie ma trwałych damage decals,
zniszczenia capital ship ani przejścia po stanie `COMPLETE`. Kolizja gracza z obecnym
przeciwnikiem tylko resetuje przeciwnika, uruchamia dźwięk i krótką zmianę tła.

### Zaakceptowany loader i przejście

1. Kod wyłącza NMI, DMA, PMG i dźwięk.
2. Rozwija 3370-bajtowy PackBits do 7680-bajtowej bitmapy
   `$4010-$5E0F`.
3. Instaluje `loader_dli`, synchronizuje początek ramki i włącza DLI oraz
   mieszany playfield DMA: ANTIC F dla tytułu i statku, ANTIC E dla footera.
4. Wyświetla dokładnie 250 kompletnych ramek PAL bez odczytu joysticka i FIRE.
5. Wyłącza NMI i DMA, czyści `$3800-$3FFF`, kopiuje gameplay charset oraz
   buduje osobny frontend charset `$4800-$4BFF`.
6. Renderuje main menu i jego statyczne warstwy P0/P2/P3 przy wyłączonym DMA,
   a przed widoczną częścią świeżej ramki włącza mieszany playfield oraz
   player DMA. Jedno DLI po dolnym dividerze ustawia neutralną paletę hintu.

Loader ma 192 linie po 40 B: linie 0–163 są bitmapą ANTIC F 320 px, a linie
164–191 bitmapą ANTIC E 160 px z wartościami 0/2 mapowanymi na `COLBK/COLPF1`.
Pierwsze LMS wskazuje `$4010`; drugie, po 102 liniach, wskazuje `$5000`.
Dwa DLI zmieniają kolory po liniach 39 i 163. Udokumentowana górna granica
jednego wywołania DLI z oczekiwaniem `WSYNC` wynosi około 160 cykli. Loader
nie dodaje pracy do gameplay main loop ani gameplay VBI po przejściu.

### Frontend i przejście do gameplayu

Jawne stany to `loader`, `main menu`, `options`, `top scores`,
`exit confirmation`, `exited` i `gameplay`. Procedury wejścia ustawiają stan,
zerują wybór tam, gdzie jest to wymagane, renderują ekran przy wyłączonym DMA
i nie polegają na fall-through pomiędzy niezależnymi stanami. Frontend raz na
ramkę czeka przez `VCOUNT`, pobiera joystick portu 1 i FIRE, a następnie
wykonuje najwyżej jedno zdarzenie po pełnym neutralnym puszczeniu wejścia.

Menu, opcje, tabela wyników, potwierdzenie i ekran końcowy współdzielą
`$4000-$43FF` i osobny frontend charset `$4800-$4BFF`. Gameplay zachowuje
charset `$4400-$47FF`. Tylko main menu włącza P0/P2/P3:
P0 rysuje jasny kadłub, P3 bursztynowy silnik, a P2 dwa czerwone światła.
Warstwy są zapisane raz przy wyłączonym DMA, a pozostałe ekrany wyłączają PMG.
Main menu ma 820 B jawnie wyliczonych wierszy o szerokości 20 lub 40 B:
ANTIC 7 dla tytułu, ANTIC 6 dla opcji, ANTIC 4 dla hangaru/dekoracji oraz
ANTIC 2 dla dolnego hintu. Sub-screeny używają jednolitego ANTIC 2.
Frontend charset przechowuje 42 zwarte glify 6×7 oraz kopie 16 istniejących
glifów strukturalnych ANTIC 4. `frontend_hint_dli` działa raz na ramkę main
menu; po widocznym obszarze pętla przywraca paletę główną. Nie ma DLI per opcja.
`TOP SCORES` generuje dziesięć wierszy domyślnych przy wejściu, bez SIO,
zapisu ATR, inicjałów lub trwałego formatu.

`START GAME` jest jedyną bieżącą ścieżką wejścia do gameplayu. Wyłącza DMA
i PMG, wycisza POKEY, czyści PMG oraz ekran, inicjalizuje istniejący stan,
odtwarza ekran i obiekty, czyści latch kolizji, a następnie włącza PMG/DMA
przed świeżą ramką. Osobna bramka FIRE wymaga puszczenia przycisku przed
pierwszym strzałem. Nie ma jeszcze powrotu z gameplayu do menu.

Minimalny lethal bridge broadside wraca z gameplayu do menu po 100 ramkach.
Nie istnieje jeszcze zwykły powrót, pełny game-over ani restart poziomu.

`SOUND` jest jednym bajtem RAM, domyślnie ON. OFF blokuje zapisy uruchamiające
SFX, wycisza cztery kanały POKEY i nie zmienia kolejności ani timingu
gameplayu. `EXIT` nie próbuje wracać do DOS-u: po potwierdzeniu wycisza audio,
wyłącza PMG, pokazuje ekran końcowy i wykonuje wyłącznie ograniczone czekanie
na kolejne ramki aż do RESET.

`DIFFICULTY_SETTING` jest jednym bajtem odzyskanego RAM pod `$4E70`, domyślnie
`MEDIUM`. Frontend zmienia go wyłącznie LEFT/RIGHT z zawijaniem
`EASY/MEDIUM/HARD`; wejście do gameplayu zeruje fazę akumulatora, ale nie sam
wybór. Dzięki temu ustawienie trwa przez powroty do menu w jednej sesji.

### Obraz i PMG

- Gameplay używa wspólnego ekranu `$4000-$43FF`: dwa górne wiersze to
  40-kolumnowy ANTIC 2 HUD, a 22 wiersze poniżej pozostają ANTIC 4. HUD ma
  dedykowany charset `$5000-$53FF`; playfield zachowuje charset
  `$4400-$47FF`. Frontend używa tego samego bufora z własnym charsetem
  `$4800-$4BFF`; mieszany main menu ma wiersze 20- i 40-bajtowe, a sub-screeny
  40-kolumnowy ANTIC 2.
- Tło i kadłuby mają dwa jawne akumulatory. Środkowe kolumny 9–30 oraz
  44-bajtowy backing gwiazd dla kolumn 8/31 zachowują world rate `8/9/10`
  przy mianowniku 20: `EASY` daje dokładnie 20 wierszy/160 scanlines/s,
  `MEDIUM` 22,5/180, a `HARD` 25/200. Ośmiokolumnowe masy kadłubów używają
  tych samych liczników przy mianowniku 40, czyli dokładnie 10/80,
  11,25/90 i 12,5/100. Oba strumienie wykonują najwyżej jeden pełny krok
  8 scanlines na ramkę; nie jest to ANTIC fine scrolling. Warningi i granice
  kolizji czytają wyłącznie fazę hull, natomiast po launchu M1–M3 poruszają
  się nadal o 2 HPOS/ramkę. Gameplay wykonuje 50 logicznych updates/s, a oba
  akumulatory są niezależne od schedulera broadside.
- Dwa oryginalne side hulls i efekty używają 31 glifów w istniejącym 1024-bajtowym
  gameplay charset. Osobne mapy 32×9 B są przechowywane w payloadzie w
  postaci 320 B danych pakowanych plus dwa 16-bajtowe codebooki. Dwa
  rekordy baterii po 7 B podają stronę, wiersz segmentu, kolumnę i scanline
  wylotu, kierunek, typ oraz rzeczywisty screen code wylotu. Obie mapy mają po
  siedem cyklicznych przejść inner-depth i używają głębokości 5/6/7/8; każdy
  odcinek stałej głębokości trwa 2–8 wierszy. Dwa lokalne, kilkurzędowe
  cofnięcia o jedną komórkę zwiększają profil o około 12,5% szerokości
  nominalnego ośmiokolumnowego pasa, bez poszerzania całej ściany.
  Allied glyphs używają D7=0, więc ich piksele `11` trafiają do bursztynowego
  `COLPF2`; enemy glyphs używają D7=1, więc ich główne piksele `11` trafiają do
  burgundowego `COLPF3=$44`. Piksele `10` nadal wybierają wspólny stalowy
  `COLPF1=$84`, a `00` czarne `COLBK=$00`.
- `START GAME` jednorazowo rozwija mapy do `$4C00-$4E3F` (576 B) przy
  wyłączonym DMA. Koszt jest ograniczony do około 27 000 cykli setupu i nie
  występuje w widocznej pętli. Współdzielone wskaźniki loadera są wtedy martwe,
  więc zero page nie rośnie.
- Player 0 to korpus Vipera, Player 3 jego pomarańczowy silnik.
- Player 1 to obecny korpus przeciwnika, Player 2 czerwony skaner.
- Missile 0 to pojedynczy pocisk gracza. M1–M3 tworzą stałą pulę broadside;
  wszystkie cztery missiles współdzielą bajt każdego scanline pod `$3B00`.
  Maski M1/M2/M3 to `$0C/$30/$C0`, a maski czyszczące `$F3/$CF/$3F`, dzięki
  czemu rysowanie lub kasowanie jednego slotu nie zmienia pozostałych par
  bitów. `SIZEM=$54` ustawia podwójną szerokość M1–M3, zachowując parę M0.
- Loader nie używa PMG.
- Main menu czasowo używa P0 i P3 dla powiększonego istniejącego Vipera oraz
  P2 dla światła identyfikacyjnego. `START GAME` czyści PMG, przywraca
  `SIZEP0/SIZEP3=$01`, `COLPF2=$28` i `COLPF3=$44` przed gameplayem.

### Stan, losowość i audio

Bieżący stan zajmuje 34 bajty zero page pod `$0080-$00A1`. Obejmuje
pozycje gracza, jednego przeciwnika i pocisku, timery, score BCD, prosty
`rng_state` oraz wskaźniki używane przy scrollu i dekompresji. `random_byte`
jest małym deterministycznym generatorem używanym do pozycji przeciwnika
i gwiazd. Nie jest jeszcze API kontrolowanej losowości poziomów.

Frontend dodaje 7 bajtów ZP: 5 bajtów trwałego stanu przejść/opcji/bramek oraz
2-bajtowy wskaźnik używany podczas renderowania. Trudność zajmuje poza ZP jeden
bajt pod `$4E70`; istniejący bajt `$008A` zmienił rolę z timera na akumulator.
POKEY generuje osobne krótkie
dźwięki strzału i trafienia oraz ciche tło silnika, o ile `SOUND` jest ON.
Nie ma jeszcze docelowego odtwarzacza ani budżetu audio.

### Broadside runtime, scheduling i damage

M1, M2 i M3 dziedziczą istniejące `COLPM1=$0C`, `COLPM2=$46` i
`COLPM3=$28`; żaden aktor PMG nie został przekolorowany. Każdy slot ma jawny
stan `FREE/WARNING/FLYING/IMPACT`. Każda z dokładnie 25 ramek warningu jest
widoczna: ramki 0–7 mają 2 scanlines i normalną szerokość, 8–16 mają 4
scanlines i szerokość double, a 17–24 mają 6 scanlines i pulsują grupami po
dwie ramki między double i quad. Efekt rośnie wyłącznie w stronę corridor,
pozostaje przy przewijającym się wylocie i kończy się double-width bez skoku
położenia do lecącego pocisku. Lecący slug pulsuje wyłącznie bitmapą missiles:
dwie ramki mają 3 scanlines, następne dwie 4 scanlines. Zachowuje podwójną
szerokość i dotychczasową czteroliniową obwiednię kolizji, przesuwa się poziomo
o 2 jednostki HPOS na ramkę i nie homuje. Nie ma zapisu do `COLPM`, więc
dzielone kolory P1–P3 nie migają. Impact ma 8 scanlines, miga przez 5 ramek i
wraca do `FREE` bez osobnego PMG. Na launch powstaje czteroramkowy,
niekolizyjny glif muzzle flash; do końca timera pozostaje przy źródłowym
wierszu działa i jest przywracany z właściwego modułu kadłuba.

Źródłowy, 8-bajtowy harmonogram wybiera kolejno stronę enemy, allied, enemy,
allied, nie konkretny rekord działa. Bazowe odstępy 2/31/2/37 ramek są mnożone w konwerterze
przez 2 i otrzymują stały 64-ramkowy calm interval; runtime zużywa gotowe
odstępy 68/126/68/138 bez mnożenia lub dzielenia w 6502. Scheduler pracuje
wyłącznie w ramkach PAL, niezależnie od obu zdarzeń scrolla i trudności. Na
każdej okazji skanuje stałe dwa rekordy i wybiera najstarszą kwalifikującą się
baterię żądanej strony, czyli tę najbliższą dolnej granicy strefy. Kandydat
musi być w pełni widoczny, niewykorzystany w bieżącym przejściu segmentu,
niezarezerwowany i mieć miejsce na 25 ramek warningu oraz jeden pełny wiersz
marginesu. Dla `EASY/MEDIUM/HARD` ostatni bezpieczny wiersz środka działa to
odpowiednio 16/15/14. Po zniknięciu realnego wylotu lifecycle może zostać
użyty ponownie przy następnym module combat. Trzy sloty i retry po
7 ramkach pozostają bez zmian; brak kandydata opóźnia ten sam event.
Odległość aktywnych torów musi wynosić co najmniej 24 scanlines, a w
jednej ramce wolno rozpocząć najwyżej jeden warning i wystartować najwyżej
jednemu pociskowi. W jednym skończonym sektorze symulacja realizuje po cztery
warningi i launchy na każdym poziomie trudności; pozostałe próby nie mają jeszcze
bezpiecznego widocznego źródła. Żaden rozpoczęty warning nie jest anulowany,
a po `PROW` scheduler nie tworzy nowego. Warning nadal trwa dokładnie 25
ramek, a prędkość pocisku nadal wynosi 2 jednostki HPOS na ramkę.

### Skończony sektor dwóch okrętów

Broadside nie zapętla już 32-wierszowej mapy bez końca. Jeden wspólny licznik
podłużny przechodzi kolejno przez `ENGINES 32`, `AFT 24`, `COMBAT 128`,
`FORWARD 24`, `PROW 32`, razem dokładnie 240 wierszy na okręt. Lewa strona
prowadzi prawą o niezmienne 8 wierszy; nie ma drugiego akumulatora ani
możliwości dryfu. Po wprowadzeniu wiersza 239 generator wpisuje 22 puste
wiersze, przechodzi przez `DRAIN` i kończy jako `COMPLETE` dopiero po zaniku
M1–M3, warningów, czteroramkowych flashów i 24-ramkowych eksplozji kadłuba.

Sektor jest złożony z ośmiowierszowych modułów, nie z surowej mapy
240×16. Każda strona ma 12 modułów opisanych 96 B indeksów źródłowych oraz
30-bajtową sekwencję; dwie maski engine overlay zajmują 16 B. Prow, forward,
aft i engines używają oddzielnych rodzin i nie tworzą funkcjonalnych dział.
Combat powtarza cztery zatwierdzone moduły, zachowując cztery baterie na stronę
w wierszach allied 64/96/128/160 i enemy 68/100/132/164. Ostatnie osiem
wierszy combat jest jawnie niekwalifikujące się do nowego warningu. Każdy bank
silników otwiera teraz sektor: dwie oddzielne apertures lewej strony mają do
dwóch komórek szerokości, a dwa regularne, kanciaste zespoły prawej do trzech.
Maski rozszerzają rdzenie, oddzielają je ciemnym spine i kończą energię przed
pełnymi oprawami przechodzącymi w aft machinery. Dwa glify energii mają po
trzy fazy (dim/bright/residual) i są kopiowane do istniejącego charsetu co
8 ramek, bez PMG, DLI i kolizji. Ostatnie 32 wiersze używają dwóch różnych
32-bajtowych masek zajętości oraz dwóch 32-bajtowych tablic granic HPOS.
Oba prows schodzą przez siedem poziomów z 8 do 1 komórki; częściowe glify
krawędzi rysują ukośny terminal tip, po którym generator wydaje wyłącznie
pusty drain.

Zwykły hostile fighter składa się z podwójnie szerokich P1/P2. Pełna
obwiednia widoczna ma 16 HPOS, więc kanoniczne położenie origin wynosi
`ENEMY_X_MIN=80` do `ENEMY_X_MAX=160` dla corridor `[80,176)`. Init, reset,
oba kierunki steering i ostateczny `draw_enemy` używają tych samych wartości;
renderer clampuje przed jednoczesnym zapisem HPOSP1/HPOSP2. Żaden zwykły
spawn ani krok AI nie może więc wystawić piksela nad side hull, a ruch nadal
odbija się naturalnie na obu granicach.

Nominalne 240 wierszy okrętu wynosi 24,0 s na `EASY`, 21,33 s na `MEDIUM` i
19,2 s na `HARD`. Wspólny stream obejmuje dodatkowe 8 wierszy stałej fazy i
22 wiersze zejścia. Bez przedłużających efektów osiąga `COMPLETE` dokładnie po
27,0/24,0/21,6 s; `DRAIN` może poczekać dłużej wyłącznie na już uruchomiony
efekt. Scheduler nie przyspiesza ani nie tworzy nowego źródła po
sekcji prow. Stan jest gotowym kontraktem dla przyszłego encounter
director, ale ten etap nie dodaje komunikatu, bonusu ani następnego sektora.

Kolejność kolizji jest stała: najpierw capture `M0PL`, `P0PL` i `M1PL-M3PL`,
potem dotychczasowe M0→fighter i P0→fighter, następnie heavy→P0/P3,
allied-heavy→P1/P2, granica przeciwnego kadłuba, offscreen expiry i na końcu
pojedynczy `HITCLR`. Następnie, po ewentualnym przewinięciu świata, osobny
detektor kontaktu gracza sprawdza źródłową geometrię kadłubów. Allied heavy
resetuje hostile fighter bez score; enemy
heavy ignoruje własny fighter. Trafienie kadłuba skanuje rzeczywisty zapisany
wiersz ekranu od wnętrza corridor do pierwszego znaku z zakresu glifów hull,
więc respektuje kontur i wyloty, a nie gwiazdy. Dwa liczniki trafień saturują
na `$FF` i nie niszczą jeszcze capital ship.

Każde zaakceptowane trafienie przeciwnego kadłuba tworzy dokładnie jeden
24-ramkowy overlay 3×3. Dwa niezależne sloty — po jednym na stronę — zapisują
18 B backing, przywracają go przed ruchem, przesuwają pointer o ten sam krok
40 B co hull i ponownie przechwytują aktualny moduł/engine/flash przed
rysowaniem. Fazy 1/5/8/7/4/2 zajętych komórek dają core, czerwone rozszerzenie,
fireball, breakup i embers. Zapis następuje tylko nad rzeczywistym glifem
kadłuba, więc efekt jest clipped do bandu, nie zmienia tablic kolizji i nie
zużywa PMG.

POKEY channel 4 jest osobnym 24-ramkowym SFX trafienia capital hull. `AUDCTL`
pozostaje `$00`; tabela `AUDF4` przechodzi od 6 do 255, a noise/volume `AUDC4`
od `$8F` do `$81`, po czym następna aktualizacja zapisuje zero. Kanały 1/2/3
zachowują shot/hit/engine bed. Bramka `sound_enabled` zapobiega startowi przy
OFF, a wspólne `silence_audio` zeruje timer, `AUDC4` i `AUDCTL` na każdym
przejściu ekranu.

Kolizja P0/P3 z capital hull nie używa `P0PF/P3PF`, ponieważ te latch'e nie
odróżniają kadłuba od gwiazdy. Konwerter generuje z tych samych 32 wierszy map
dwie 32-bajtowe tablice bezpiecznych granic HPOS, wraz z fizycznymi
projekcjami wylotów. Złączona obwiednia źródłowych warstw P0/P3 ma 8 jednostek
HPOS i 15 scanlines; procedura sprawdza najwyżej trzy aktualnie widoczne
wiersze, używając `corridor_phase` i licznika wprowadzonych wierszy. Lewa
granica to `48 + (ostatnia zajęta kolumna + 1) * 4`, a prawa to
`48 + pierwsza zajęta kolumna * 4`; zadeklarowana projection cell jest zwykłą
zajętą komórką tej konwersji. Lewy kontakt zachodzi dla
`player_x < allied_boundary`, prawy dla
`player_x+7 >= enemy_boundary`. Clamp zapisuje jedną wartość do `player_x`,
`HPOSP0` i `HPOSP3`; nie kopiuje ponownie danych PMG. Kontakt odejmuje 20,
korzysta ze wspólnego cooldownu 25 ramek, nie daje score i nie zmienia hull-hit
counters. Heavy hit ma pierwszeństwo damage w tej samej ramce i zawsze
przechodzi do `IMPACT`; późniejszy kontakt nadal clampuje, ale wspólna bramka
pozwala tylko na jedno odjęcie zdrowia.
W 32 wierszach PROW detektor wybiera zamiast bazowego konturu source-derived
profil częściowej krawędzi. Pusta komórka i dekoracyjny piksel poza profilem
nie rozszerzają pełnego bandu kolizji, natomiast ostatni rzeczywiście zajęty
fragment pozostaje solidny.

Pierwsza wersja detektora miała potwierdzony błąd aliasowania: prawa granica
i licznik wierszy leżały w `BROAD_WORK_VALUE/COUNT`, mimo że
`resolve_allied_sector_row` oraz `resolve_enemy_sector_row` używają tych samych
bajtów jako module-id/local-row scratch. Pierwszy realny wiersz kadłuba na
wysokości Vipera zastępował więc prawą granicę małym id modułu i niszczył
licznik pętli. Wyśrodkowane `player_x=$80` spełniało wtedy fałszywy test prawej
burty, a clamp przenosił statek w okolice lewej krawędzi. Runtime przechowuje
teraz liczbę wierszy oraz obie granice wyłącznie pod `$4EA5-$4EA7`; resolver
może swobodnie używać własnego scratch. Pętla nadal bada najwyżej trzy wiersze,
a pełnosektorowa symulacja sprawdza każdy section, oba offsety i puste wiersze
drain przy wyśrodkowanym graczu na wszystkich trudnościach.

Licznik `LIFE` nadal oznacza zdrowie 0–100 i przechowuje pięć jednostek po 20
punktów; nie został przemianowany na licznik statków. Osobny `PLAYER_LIVES`
zaczyna od trzech całkowitych żyć. Każdy heavy shot obu stron jest groźny dla
P0/P3, ale jedna ramka może zastosować tylko jeden damage, a cooldown trwa 25
ramek. Po zejściu do zera sterowanie i FIRE gracza są blokowane tylko przez
100-klatkową fazę `PLAYER_DYING`; świat, enemy, scheduler i istniejące M1–M3
nadal pracują. Lethal gate zmienia stan i odejmuje jedno życie tylko raz.

Jeśli życie pozostaje, atomowy respawn zapisuje
`player_x=HPOSP0=HPOSP3=124` oraz `player_y=184`, przywraca 100 zdrowia i
wchodzi w `PLAYER_RESPAWN_INVULNERABLE`. Wspólna bramka ignoruje wtedy każdy
damage przez dokładnie 250 aktualizacji PAL, ale joystick i M0 pozostają
aktywne. P0/P3 są rysowane przez 8 klatek i czyszczone przez 8 klatek bez
ruszania współrzędnych, kolorów ani pozostałych PMG. Przed ustawieniem
`PLAYER_ALIVE` runtime czyści snapshoty `M0PL/P0PL/M1PL-M3PL` oraz `HITCLR` i
wymusza widoczny sprite. Ostatnie życie używa dotychczasowego powrotu do menu
jako terminalnego `PLAYER_GAME_OVER`; nie dodano osobnego ekranu.

Stan i scratch puli zajmują 48 B pod `$4E40-$4E6F`, ustawienie trudności 1 B
pod `$4E70`, a stan fazy hull, backing dwóch granicznych kolumn gwiazd i dwie
flagi lifecycle zajmują 47 B pod `$4E71-$4E9F`. Trzy timery flash, stan sektora
i licznik drain dodają 5 B pod `$4EA0-$4EA4`. Trzy izolowane bajty kontaktu
oraz cztery bajty lifecycle/lives/invulnerability/blink zajmują `$4EA5-$4EAB`,
bez delta zero page. Dwa timery/pointery/kolumny eksplozji, 18 B backing i
timer audio dodają 27 B pod `$4EAC-$4EC6`. Timer i faza trzyfazowej animacji
silników dodają 2 B pod `$4EC7-$4EC8`.
Kod, tabele i relokowane dane zajmują 4605 B pod `$5E10-$700C`; blok linkera
rezerwuje `$5E10-$700F` (4608 B). Obejmuje to 64 B granic kolizji oraz
64 B profili occupancy i 64 B prow boundaries, a także procedury budowy fontu
i przełączania HUD-u. Ogon jest zapisany w payloadzie jako 3749 B
deterministycznego LZ-10/5. Sam bounded
detektor z clampem kosztuje konserwatywnie do około 333 cykli; nie wykonuje
pełnego skanu ekranu. Łączny koszt systemu po korekcie szacuje się na około
495 cykli bez aktywnego slotu, około 745 dla jednego warningu, około 775 dla
jednego lecącego pocisku bez kolizji i około 1795 w dotychczasowym worst case
trzech aktywnych slotów. Jednoczesny heavy impact i clamp pozostaje poniżej
około 1820 cykli. Zmiana tabeli schedulera nie zwiększa żadnej z tych ścieżek.
Nowy dispatch akumulatora kosztuje około 26 cykli bez scrolla i 23 przed
ścieżką scrolla, czyli konserwatywnie do 12 cykli więcej niż poprzedni timer.
Po rozdzieleniu kopii world event przenosi 462 komórki środka, przesuwa 44 B
backingu, generuje gwiazdy i ponownie nakłada dwa źródłowe wyloty; hull event
przenosi 336 komórek mas kadłubów, aktualizuje fazę, warningi oraz flagi
lifecycle. Konserwatywnie kosztują odpowiednio około 15 300 i 11 600 cykli
przed generatorem sektorowym. Dwa bounded lookupy modułu, obsługa trzech
flashów i okresowa 16-bajtowa animacja silników podnoszą najcięższą wspólną
ścieżkę z trzema slotami, kolizją i clampem do około 29 850 cykli po dodaniu
dwóch krótkich dispatchy lifecycle i wspólnej damage gate. Pozostaje około
5650 cykli zapasu bez dużego impactu. Jedna aktywna eksplozja dodaje
konserwatywnie około 1250 cykli restore/recapture/render, dwie około 2450, a
obsługa POKEY mniej niż 50. Najcięższa wspólna ścieżka z dwiema eksplozjami
pozostaje poniżej około 32 950 cykli po doliczeniu profilu prow, trzyfazowej
kopii glifów i końcowego fighter clampu, czyli zachowuje ponad 2550 cykli zapasu
do ramki PAL ~35 500. Średnia częstość kosztownego hull eventu jest dokładnie
połową częstości world eventu; VBI pozostaje bez zmian.
VBI pozostaje bez zmian. Gameplay wykonuje dwa DLI na ramkę: pierwszy po
drugim wierszu HUD-u przełącza `CHBASE=$44` i przywraca paletę ANTIC 4, drugi
po ostatnim wierszu playfieldu przywraca `CHBASE=$50` oraz neutralne
`COLPF1=$0E/COLPF2=$00` dla następnej ramki. Ciała mają odpowiednio około
66 i 55 cykli wraz z wejściem NMI, bez czasu oczekiwania `WSYNC`; z dwoma
konserwatywnymi pełnymi oczekiwaniami górna granica wynosi około 349 cykli na
ramkę. Pełny pomiar na 65XE PAL pozostaje bramką hardware acceptance ownera.

### Gameplay HUD ANTIC 2

Gameplay display list zachowuje 24 blank scanlines, po czym pobiera dwa
40-bajtowe wiersze spod `$4000`: `$42` to ANTIC 2 z LMS, a `$82` to ANTIC 2 z
DLI. Następne 21 opcodes `$04` i końcowy `$84` dają 22 wiersze ANTIC 4 oraz
drugi DLI. Ekran nadal zużywa 24×40 = 960 B; zmiana trybu nie przesuwa żadnego
wiersza playfieldu ani pól dynamicznych score/LIFE.

`start` po zakończeniu loadera i przy wyłączonym DMA zeruje dedykowany
1-kilobajtowy charset `$5000-$53FF`, a następnie rozwija do standardowych
indeksów screen-code cyfry 0–9 i litery A–Z z edytowalnego źródła 6×7.
Ósmy scanline pozostaje pusty, zaś separator ma własny pełny dolny scanline.
HUD przechowuje normalne kody znaków w screen RAM: wynik jest aktualizowany
pod `$4006-$400A`, a trzy cyfry zdrowia pod `$4021-$4023`. Wartość pięciu
jednostek damage skaluje się do `100/080/060/040/020/000` bez zmiany
wewnętrznej mechaniki damage.

Przed włączeniem DMA `start_gameplay` instaluje `$50` w `CHBASE`, neutralne
`COLPF1=$0E`, `COLPF2=$00` i fazę DLI równą zero. DLI po dividerze instaluje
`CHBASE=$44` oraz kompletną paletę gameplayu przed pierwszym scanline ANTIC 4;
DLI po ostatnim wierszu `$84` przywraca `$50/$0E/$00` w następującym blanku.
Obie ścieżki zachowują A przez `PHA/PLA`, nie modyfikują X/Y i synchronizują
zapisy przez `WSYNC`. Frontend przy wejściu nadal wyłącza NMI i wybiera własną
display list, więc gameplay HUD ani menu PMG nie przeciekają do sub-screenów.

## Aktualny obraz pamięci i nośnika

Poniższe kategorie są celowo osobne. Wolne miejsce w jednej nie może być
przedstawiane jako wolne miejsce w innej.

| Kategoria | Potwierdzony stan bieżący | Bramka dla przyszłych zmian |
| --- | --- | --- |
| 1. Pojemność ATR | Standardowy ATR ma 92 176 B pliku: 16 B nagłówka i 92 160 B danych, czyli 720 sektorów po 128 B. Duża część obrazu jest pusta. | Wolne sektory nie zwiększają resident RAM i nie uzasadniają same w sobie modułów ładowanych podczas gry. |
| 2. Boot payload i sektory startowe | Payload ma 11 941 B i zajmuje 94 sektory. Pierwsze 8192 B trafia pod `$2000-$3FFF`, a pakowany ogon 3749 B pod `$4000-$4EA4`; ostatni sektor ma 91 B paddingu. XEX ma 11 953 B wraz z headers/RUNAD. | Raportować osobno rozmiar payloadu, liczbę sektorów, padding ostatniego sektora, XEX headers i granice czasowe relokacji. |
| 3. Resident gameplay RAM | CODE ma 2914 B pod `$2000-$2B61`, RODATA 5213 B pod `$2B62-$3FBE`, mapy kadłubów 576 B pod `$4C00-$4E3F`, broadside state 48 B pod `$4E40-$4E6F`, difficulty 1 B pod `$4E70`, 47 B stanu rozdzielonego scrollu pod `$4E71-$4E9F`, 12 B flash/sector/contact/player lifecycle pod `$4EA0-$4EAB`, 27 B eksplozji/audio pod `$4EAC-$4EC6`, 2 B animacji silników pod `$4EC7-$4EC8`, HUD charset 1024 B pod `$5000-$53FF`, a relokowany runtime 4605 B pod `$5E10-$700C`. | Każda dalsza funkcja ma mierzyć rzeczywiście trwałe dane, bez zakładania, że każdy nieadresowany bajt jest bezpieczny. |
| 4. Pamięć przejściowa loadera | Przed loaderem `$4000-$4EA4` zawiera pakowany broadside ogon; start rozwija go do `$5E10`. Potem surowa bitmapa zajmuje `$4010-$5E0F`. Strumień PackBits i display list mieszczą się w końcu głównego bloku `$2000-$3FFF`; PMG/DMA są wtedy wyłączone. | Koszt i zakresy obu rozpakowań raportować jako setup/transient, nie jako stały gameplay asset. |
| 5. Pamięć odzyskiwalna po przejściu | `$3800-$3FFF` zostaje wyzerowane i przechodzi z loader-only payloadu na PMG. Frontend zajmuje `$4800-$4BFF`, mapy `$4C00-$4E3F`, state i scroll backing `$4E40-$4EC8`, HUD charset `$5000-$53FF`, `$5400-$5E0F` pozostaje wolne, a runtime broadside zajmuje `$5E10-$700C`. | Reuse wymaga jawnej rezerwacji, testu przejścia i aktualizacji memory map. Nie ma allocatora ani overlayu. |
| 6. PMG | PMBASE `$3800`; missiles `$3B00-$3BFF`: M0 player shot, M1–M3 heavy pool. P0/P3 to Viper hull/engine, P1/P2 hostile hull/scanner. M1–M3 dziedziczą `$0C/$46/$28`; masked compositor zachowuje pozostałe pary bitów. | Każda zmiana ról, multipleksowania lub trybu DMA wymaga limitu obiektów, kosztu i testu PAL/real hardware. |
| 7. Display memory i charset | Wspólny ekran `$4000-$43FF`; gameplay charset `$4400-$47FF`; frontend charset `$4800-$4BFF`; HUD charset `$5000-$53FF`. Kadłuby i efekty zajmują 31 indeksów gameplay charset od 59 do 89; zwarty frontend source zasila jednorazowo dedykowany font HUD. Main menu używa 820 B ekranu, sub-screeny i gameplay 960 B. | Kolejne glify wymagają ponownego audytu indeksów i niewyświetlanych danych źródłowych; każdy runtime charset nadal ma dokładnie 1024 B. |
| 8. Zero page | Linker raportuje 34 B pod `$0080-$00A1`; w zadeklarowanym regionie `$0080-$00FF` pozostają 94 nieprzydzielone bajty. | Każda funkcja podaje delta ZP; wolnych bajtów nie przydziela się bez audytu konfliktów i czasu życia. |
| 9. Koszt widocznej ramki | World event kosztuje konserwatywnie około 15 300 cykli, hull event z generatorem modułu około 12 050, a ich zbieg z trzema slotami, flashami, kolizją, clampem i lifecycle dispatch około 29 850 wobec ~35 500 cykli PAL. Dwie równoczesne eksplozje, profile prow, trzyfazowa kopia i channel-4 SFX podnoszą konserwatywny combined bound do około 32 950. Dwa gameplay DLI dodają 121 cykli ciał rutyn na ramkę (konserwatywnie do 349 z pełnym `WSYNC`), VBI bez zmian. | Pełny pomiar emulator trace i real 65XE PAL pozostaje bramką akceptacji razem z najcięższą ramką wspólnego eventu. |
| 10. Jednorazowy setup/transition | `start` rozwija 3749 B ogona do 4605 B przed loaderem oraz buduje 1024-bajtowy HUD charset w około 11,8 tys. cykli przy wyłączonym DMA. `START GAME` rozwija dwie mapy do 576 B w około 27 000 cykli, zeruje pulę i inicjalizuje state scroll/lifecycle/sector/contact/explosion oraz oba akumulatory, zachowując 1 B wybranej trudności. Loader DLI działa tylko przez 250 ramek; frontend i gameplay instalują własne ograniczone DLI. | Nie sumować setup cost z kosztem stałej pętli; ograniczyć i mierzyć osobno przejścia sektorów, restart i inicjalizację poziomu. |

Główny blok linkera kończy RODATA pod `$3FFF`, ale payload nie kończy się w
tym miejscu: 3749-bajtowy, przejściowy ogon zajmuje `$4000-$4EA4` do chwili
rozpakowania. Nie jest to resident obraz ekranu ani „cała wolna pamięć Atari”.
Dokładne role czasowe pozostają w `docs/memory-map.md`.

## Odrzucony spike architektoniczny: osobny playfield broadside ANTIC 2

Owner porównał oba rendery i podjął wiążącą decyzję: produkcyjny broadside
pozostaje ANTIC 4. ANTIC 2 poprawiał cienkie linie, lecz odbierał scenie kolor,
głębię i atmosferę. Ta sekcja zachowuje **niezintegrowany, odrzucony prototyp
jako evidence**; nie jest roadmapą implementacji. Bieżący XEX i ATR zachowują
ANTIC 4 dla całego playfieldu pod HUD-em; wyłącznie dwa górne wiersze HUD-u
używają ANTIC 2.
Edytowalne źródło `assets/graphics/capital-hulls-antic2-prototype.json` oraz
renderer preview sprawdzają, czy chwilowa scena broadside zyskuje dostatecznie
dużo czytelności przy przejściu na monochromatyczne 320 px.

### Potwierdzone ograniczenie i proponowana organizacja

Opcode display list ustala tryb ANTIC dla całej poziomej mode line. Nie można
więc zbudować w jednym scanline układu `ANTIC 2 | ANTIC 4 | ANTIC 2`, a zmiana
kolorów w połowie linii nie zmienia interpretacji bitów. Cycle-exact kernel
poziomy nie jest proponowany: nie ma pomiaru potwierdzającego stabilne 50 FPS
PAL ani real hardware.

Proponowana osobna display list zachowuje 24 blank scanlines, potem HUD pod
`$4000` jako `$44` (ANTIC 4 + LMS), divider pod `$4028` jako `$84` (ANTIC 4 +
DLI), 22 wiersze `$02` (ANTIC 2) pod `$4050-$43BF` oraz JVB. Ma 32 B. ANTIC 2
i ANTIC 4 pobierają tu po 40 screen bytes na wiersz i po osiem scanlines, więc
całe obecne `$4000-$43FF`, 840-bajtowa kopia scrolla i faza 32-wierszowej mapy
pozostałyby geometrycznie zgodne. Historyczny spike poprzedzał wybór trudności;
produkcyjny ANTIC 4 używa teraz akumulatora 8/9/10 zdarzeń na 20 ramek PAL.

`CHBASE` obowiązuje globalnie. Historyczny spike zakładał charset
`$5000-$53FF`, który kopiowałby wszystkie 1024 B zaakceptowanego charsetu
`$4400-$47FF`, a następnie
podmieniałby 176 B indeksów 59–80 i 16 B indeksów gwiazdy/kropki. HUD zachowuje
te same indeksy i bytes. Mapy 32×9 B i rekordy czterech wylotów pozostają
źródłem prawdy; przy zapisie prawego kadłuba generator musi maskować
`screenCode & $7F`, ponieważ bit 7 oznacza w ANTIC 2 inverse, a nie bank PF3.
Ten historyczny adres jest obecnie zajęty przez produkcyjny font HUD i nie
jest rezerwacją dla prototypu; ewentualny powrót do spike'u wymagałby nowego
audytu wyrównanego zakresu.

Playfield broadside jest uczciwie monochromatyczny: po dividerze pojedynczy
DLI ustawia `COLPF1=$0A`, `COLPF2=$00`, `COLBK=$00`. Bit 0 daje prawdziwą
czerń, a bit 1 neutralną stalową luminancję. Allied/enemy różnią się gęstością,
konturem, płytami i wnękami, nie fałszywym kolorem. P0 pozostaje jasnym
myśliwcem gracza, P3 bursztynowym silnikiem, P1 przeciwnikiem, P2 czerwonym
skanerem, a M0 pociskiem gracza. Historyczny preview spike nie przydzielał
M1–M3; bieżący runtime ANTIC 4 wykorzystuje je już w osobnym systemie opisanym
powyżej.

### Przygotowanie i atomowe przejścia

Kopiowanie i patchowanie charsetu (około 10 495 cykli dla kopii 1 KB oraz
około 2 700 cykli dla 192 B podmian) musi być wykonane wcześniej, poza VBI,
przy wyłączonym DMA albo w rozłożonej fazie setupu. Widoczna zmiana może potem
zmieścić się w jednym vertical blank bez wyłączania DMA, o ile scheduler
gwarantuje wejście przed pierwszą widoczną linią i wszystkie dane są gotowe.

Sekwencja wejścia do broadside:

1. ustaw sector state na przygotowany broadside i `NMIEN=$00`;
2. ustaw `DLISTL/H` na broadside display list i `CHBASE=$50`;
3. ustaw `VDSLST` na ograniczony DLI palety;
4. ustaw dla HUD zaakceptowane `COLPF0=$0E`, `COLPF1=$84`, `COLPF2=$28`,
   `COLPF3=$44`, `COLBK=$00` oraz `PRIOR=$00`;
5. zapisz `HITCLR`, następnie włącz tylko DLI przez `NMIEN=$80`.

Sekwencja wyjścia do zwykłego lotu:

1. ustaw `NMIEN=$00`;
2. przywróć normalne `DLISTL/H`, `CHBASE=$44` i pełną paletę
   `$0E/$84/$28/$44/$00`;
3. potwierdź `PMBASE=$38`, `SIZEP0..3=$01`, `SIZEM=$54`, `PRIOR=$00` i
   `GRACTL=$03`;
4. przywróć normalny generator tła/interpretację kolizji, zapisz `HITCLR` i
   pozostaw gameplay DLI wyłączone.

Nie jest potrzebny OS call. Sam zestaw zapisów wejścia szacuje się na około
82–90 cykli 6502, a restore na około 100–120 cykli; oba mieszczą się w VBI.
DLI playfieldu używa tylko A, `WSYNC`, trzech zapisów koloru i RTI; jego
konserwatywny worst case wraz z oczekiwaniem pozostaje poniżej około 160 cykli
na ramkę broadside. Jeśli przyszły scheduler nie zagwarantuje wejścia w VBI,
bezpiecznym fallbackiem jest jedna kompletna czarna ramka z `DMACTL=$00`, nie
częściowo przełączona ramka.

### Pamięć, CPU i kolizje

Historycznie szacowany dodatkowy resident asset to 1024 B wyrównanego
charsetu kadłubów. Screen,
mapy, metadata, PMG i zero page mają delta 0 B. Linkowane źródło glifów miałoby
192 B; osobna display list 32 B. Kod kopiowania, DLI i dwóch przejść nie jest
jeszcze zaimplementowany, więc jego uczciwy próg planistyczny wynosi około
225–275 B, dając przewidywany payload delta około 449–499 B. Rzeczywisty delta
musiałby pochodzić z linker map ewentualnej przyszłej integracji. Spike ma
payload delta 0 B i nie rezerwuje RAM; `$5000-$53FF` należy teraz wyłącznie do
produkcyjnego HUD-u.

Spike nie zmienia produkcyjnych, rozdzielonych kopii world/hull ani PMG.
Historyczny szacunek pełnej wspólnej kopii 840 B został zastąpiony bounded
ścieżkami 462 komórek środka i 336 komórek kadłubów. ANTIC 2
i 4 pobierają tę samą liczbę bytes ekranu i glifów; dokładny
rozkład DMA steals nadal wymaga pomiaru Atari 65XE PAL.

Bieżąca logika odczytuje latch'e PMG–PMG dla pocisków i fighterów, natomiast
kontakt gracza i trafienia capital hull rozstrzyga z wierszowej geometrii
źródłowej; nie zależy od `P0PF/P3PF` ani od gwiazd. Pozostałaby więc bez zmiany.
Sprzętowe latch'e PMG–playfield miałyby w ANTIC 2 inną semantykę pojedynczej
płaszczyzny niż cztery role ANTIC 4. Przyszłe trafienia side hulls muszą użyć
wierszowych bounds/masek i istniejących metadanych muzzle jako źródła prawdy,
z `HITCLR` na obu przejściach, zamiast polegać na kolorowym banku znaku.

Pełny ANTIC F 320×192 został odrzucony dla tego kierunku: wymaga 7680 B
bitmapy zamiast 1024 B charsetu, nie współdzieli tanio obecnych map znakowych i
komplikuje przewijanie. ANTIC 2 nie będzie integrowany. Jego source-derived
previews pozostają tymczasowo w worktree wyłącznie do chwili akceptacji
następnego kandydata ANTIC 4.

## Docelowa architektura przyrostowa

### Jeden resident gameplay program

Zgodnie z ADR-004 normalne poziomy działają bez dostępu do dysku. Title loader
pozostaje jedyną obecną fazą ładowania, a XEX i ATR są samowystarczalne.
Treść ma być organizowana jako małe tabele i współdzielone procedury, ale nie
powstaje spekulacyjny overlay manager, format mission packages, relokacja,
save state ani level-loader API. Opcję podziału wolno ponownie rozważyć dopiero
po zmierzeniu presji resident RAM.

### Granice podsystemów

Poniższe granice są **planowane**. Dokładne struktury bajtowe i adresy zostaną
zatwierdzone dopiero w odpowiednim kamieniu milowym.

#### Frame scheduler

Jeden właściciel kolejności ramki i przejść game state. Odpowiada za
synchronizację PAL, wywołanie ograniczonych faz oraz wykrycie przekroczenia
budżetu. Praca rzadsza niż co ramkę musi mieć jawny harmonogram i znany
pesymistyczny koszt.

#### Frontend controller

Istniejąca jawna maszyna frontendu pozostaje właścicielem main menu, options,
top scores, exit confirmation i exited state. Udostępnia pojedynczą ścieżkę
start/reset gameplayu oraz zachowuje opcje sesji. Przyszłe game over i score
insertion mają dołączyć przez jawne przejścia, bez uruchamiania logiki
gameplayu pod ekranami frontendu i bez tworzenia drugiej niezależnej maszyny.

#### Input

Raz na ramkę próbuje joystick port 1 i FIRE, a następnie udostępnia stabilny
snapshot. Interpretacja inputu zależy od stanu frontend/active/destruction/game
over, ale sprzęt nie jest odczytywany niezależnie przez wiele systemów.
Frontend zachowuje neutral-release gating; gameplay zachowuje osobną bramkę
pierwszego FIRE po `START GAME`.

#### Player state

Przechowuje pozycję, ograniczenia ruchu, stan kadłuba 0–100%, stan
zniszczenia i cooldown FIRE. Nie jest właścicielem wyniku, encounterów ani
bezpośrednich zapisów do cudzych slotów.

#### Entity slots

Mała pula o stałym limicie przechowuje aktywne fighters, hazards, repair
objects i efekty, jeśli pomiar wykaże sens wspólnego formatu. Aktywacja,
dezaktywacja i przepełnienie są jawne. Nie przewiduje się dynamicznej alokacji.

#### Enemy descriptors

Read-only dane łączą identyfikator sylwetki, movement behaviour, prędkość,
firing pattern, hull strength, collision policy, score, akcenty, formation
role i flags. Instancja przechowuje tylko stan zmienny wymagany przez wybrane
zachowanie.

#### Movement behaviours

Współdzielone, ograniczone procedury realizują zygzak, ustawienie i dive,
lot formacyjny, tracking oraz późniejsze zachowania. Używają małych lookup
tables lub parametrów; nie odtwarzają długich ścieżek per-frame.

#### Formation/wave controller

Czyta level wave tables i tworzy encje z deskryptorów formacji. Odpowiada za
initial positions, timing, małe offsety i respektowanie limitu slotów, ale nie
omija encounter directora.

#### Encounter director

Jeden punkt wyboru zdarzeń fighter wave, debris, repair, mine, broadside,
elite i miniboss. Używa cooldownów, exclusions, stanu sektora, poziomu oraz
stałego seed testowego. Nie dopuszcza kombinacji bez osiągalnej trasy.

#### Sector controller

Zarządza open space, zapowiedzią przejścia, wejściem, capital-ship corridor
i wyjściem. Każdy aktywny sektor ma licznik nie większy niż 2250 ramek.
Minimalny czas i rozkład pozostają danymi balansującymi.

#### Capital-ship controller

Zarządza pozycją i stanami segmentów lewej/prawej strony, timingiem broadside,
muzzle/impact states oraz późniejszym celem capital ship. Nie posiada
fighters i nie przyznaje im faction immunity. Istniejąca baza danych udostępnia
dwa siedmiobajtowe rekordy: side, segment row, muzzle column, scanline offset,
barrel direction, turret type i screen code wylotu. Harmonogram wskazuje
stronę, a bounded selector wybiera najstarszy bezpieczny widoczny rekord bez
duplikowania współrzędnych w kodzie pocisków.

#### Projectile system

Stałe pule rozróżniają co najmniej zwykłe player/enemy shots i heavy
broadside shots. Ruch, właściciel, damage, collision mask oraz zakończenie
życia wynikają z danych. Maksymalna liczba pocisków jest częścią kontraktu
wydajności.

#### Collision and damage resolution

Po zakończeniu ruchu wszystkich obiektów system zbiera zdarzenia kolizji dla
jednego spójnego stanu ramki, a potem aplikuje je w jawnej kolejności. Dzięki
temu wynik broadside, hull damage i score nie zależą od przypadkowej kolejności
procedur. Duży debris ma osobną semantykę natychmiastowego zniszczenia;
zwykłe i ciężkie pociski przekazują data-driven damage. Szczegółowa reguła
wyboru pierwszego celu na drodze heavy shot musi zostać zatwierdzona i
przetestowana przed kamieniem broadside.

#### Debris i repair objects

Generator debris zachowuje osiągalną trasę przy rzeczywistych limitach ruchu.
Repair object rozróżnia zebranie (+20 punktów procentowych, cap 100%) od
zestrzelenia (score, bez naprawy). Oba systemy podlegają exclusions directora.

#### HUD

HUD jest osobną, ograniczoną fazą zapisu display memory. Pokazuje co najmniej
score i numeryczny `HULL nn%`; aktualizuje tylko pola, które się zmieniły.
Obecne `FUEL` i `ARM` nie definiują docelowych mechanik.

#### Scoring

Jeden system przyjmuje jawne zdarzenia punktowe za enemies, zestrzelony repair
object oraz późniejsze wybrane cele. Wartości są danymi balansującymi. System
nie ustala sam, czy kolizja była trafieniem.

#### Audio

Ograniczona faza na końcu ramki aktualizuje POKEY na podstawie kolejki lub
priorytetów zdarzeń. Liczba kanałów, koszt playera i konflikty SFX/muzyki muszą
być zmierzone przed integracją. Bieżąca opcja SOUND pozostaje nadrzędną bramką:
OFF nie może zmieniać symulacji i musi pozostawiać wszystkie kanały wyciszone.

#### PRNG

Jedno jawne API generatora przyjmuje seed testowy i rozdziela decyzje poziomu
od nieistotnych efektów wizualnych, jeśli pomiar pozwoli. Liczba wywołań nie
może przypadkowo zmieniać profilu poziomu po dodaniu efektu graficznego.

#### Loader-to-frontend i frontend-to-gameplay

Przejście zachowuje zaakceptowane 250 ramek, wyłącza DLI/DMA, odzyskuje
pamięć loader-only i dopiero potem włącza mieszany ANTIC 7/6/4/2 z main menu,
jednym dolnym DLI oraz statycznymi player PMG.
`START GAME` osobno inicjalizuje wszystkie trwałe pule i włącza PMG. Przyszły
reset gameplayu nie uruchamia ponownie loadera i nie zakłada dostępu do dysku.

## Stabilna kolejność jednej ramki

Docelowa logiczna kolejność aktywnego gameplayu jest kontraktem architektury:

1. czekaj na granicę ramki PAL;
2. pobierz jeden snapshot inputu;
3. przesuń timery sektora i encounter directora;
4. zaktualizuj gracza;
5. zaktualizuj enemies, hazards, repair objects i projectiles;
6. rozwiąż kolizje oraz damage dla post-update snapshotu;
7. zaktualizuj score i game state;
8. zapisz stan PMG oraz display;
9. zaktualizuj ograniczony stan audio.

System może rozłożyć rzadkie zadania na kilka ramek wyłącznie wtedy, gdy
zachowuje tę semantykę i jawny limit. VBI/DLI mogą wykonywać tylko wcześniej
przygotowane, ograniczone transfery; nie mogą wprowadzać drugiej, przypadkowej
kolejności symulacji.

Stany frontendu używają krótszej, osobnej kolejności: czekaj na granicę PAL,
pobierz joystick i FIRE, sprawdź neutral-release gate, wykonaj najwyżej jedno
zdarzenie stanu i w razie przejścia wyrenderuj cały nowy ekran przy wyłączonym
DMA. Nie wywołują faz sektorów, encji, kolizji, score ani gameplay audio.

## Bramy pomiarowe

Przed akceptacją każdej funkcji raport zawiera pełną kartę dowodów z roadmapy.
W szczególności:

- przed zwiększeniem liczby obiektów mierzymy pełny skan pustych i pełnych
  slotów;
- przed multipleksowaniem PMG mierzymy VBI/DLI i stabilność na real hardware;
- obecny audyt capital hulls potwierdza 31 glifów, 1024 B charsetu,
  945 B map/metadanych/modułów/harmonogramu/granic/rates/profili/eksplozji/SFX i
  576 B map runtime;
- broadside używa faktycznego wiersza ekranu, a player contact dwóch
  32-bajtowych granic wygenerowanych z tego samego źródła; pełny trace kosztu
  trzech kolizji oraz real-hardware PAL pozostają bramkami akceptacji;
- przed audio mierzymy koszt odtwarzacza razem z najcięższą ramką gameplayu;
- przed jakąkolwiek propozycją modułów mierzymy resident RAM po reclaimie
  loadera.

Podane liczby cykli broadside są konserwatywną analizą ścieżek, nie trace'em z
fizycznego 65XE. 50 FPS jest warunkiem akceptacji, nie założeniem wynikającym
z sukcesu emulatora.
