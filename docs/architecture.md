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
zawierają ten sam payload ładowany pod `$2000`. XEX uruchamia etykietę `start`,
a bootowalny ATR wczytuje kolejne sektory i dochodzi do `start` przez
`DOSVEC`. Bieżący gameplay jest jednym resident programem; title loader jest
jedyną fazą ładowania.

Po loaderze program wchodzi do osobnej pętli frontendu. Gameplay nie uruchamia
się sam; wybór `START GAME` przechodzi przez jedną procedurę resetu i dopiero
wtedy wchodzi do istniejącej głównej pętli:

1. czeka na kolejną ramkę przez polling `VCOUNT`;
2. odczytuje joystick i FIRE;
3. aktualizuje pojedynczy pocisk;
4. aktualizuje pojedynczego przeciwnika;
5. odczytuje sprzętowe latch'e kolizji;
6. co czwartą ramkę przewija tło;
7. aktualizuje krótkie efekty POKEY.

Nie jest to jeszcze docelowy scheduler. Nie ma player hull, game over,
proceduralnych fal, encounter directora, sektorów capital ships, debris ani
repair drone. Kolizja gracza z obecnym przeciwnikiem tylko resetuje przeciwnika,
uruchamia dźwięk i krótką zmianę tła.

### Zaakceptowany loader i przejście

1. Kod wyłącza NMI, DMA, PMG i dźwięk.
2. Rozwija 3370-bajtowy PackBits do 7680-bajtowej bitmapy
   `$4010-$5E0F`.
3. Instaluje `loader_dli`, synchronizuje początek ramki i włącza DLI oraz
   playfield DMA ANTIC F.
4. Wyświetla dokładnie 250 kompletnych ramek PAL bez odczytu joysticka i FIRE.
5. Wyłącza NMI i DMA, czyści `$3800-$3FFF`, kopiuje wspólny charset i
   przygotowuje ekran ANTIC 4.
6. Renderuje main menu i przed widoczną częścią świeżej ramki włącza ANTIC 4
   bez PMG. DLI pozostaje wyłączone.

Loader jest prawdziwą bitmapą 320×192, 1 bit na piksel, 40 B na linię.
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
`$4000-$43FF` oraz charset `$4400-$47FF`; PMG pozostaje wyłączone. Statyczne
tabele tekstowe zajmują 233 bajty dawniej zerowego wypełnienia niewyświetlanych
slotów charsetu 59 i wyżej, więc rozmiar oraz rezerwacja 1 KB charsetu nie
zmieniły się. `TOP SCORES` generuje dziesięć wierszy domyślnych przy wejściu,
bez SIO, zapisu ATR, inicjałów lub trwałego formatu.

`START GAME` jest jedyną bieżącą ścieżką wejścia do gameplayu. Wyłącza DMA
i PMG, wycisza POKEY, czyści PMG oraz ekran, inicjalizuje istniejący stan,
odtwarza ekran i obiekty, czyści latch kolizji, a następnie włącza PMG/DMA
przed świeżą ramką. Osobna bramka FIRE wymaga puszczenia przycisku przed
pierwszym strzałem. Nie ma jeszcze powrotu z gameplayu do menu.

`SOUND` jest jednym bajtem RAM, domyślnie ON. OFF blokuje zapisy uruchamiające
SFX, wycisza cztery kanały POKEY i nie zmienia kolejności ani timingu
gameplayu. `EXIT` nie próbuje wracać do DOS-u: po potwierdzeniu wycisza audio,
wyłącza PMG, pokazuje ekran końcowy i wykonuje wyłącznie ograniczone czekanie
na kolejne ramki aż do RESET.

### Obraz i PMG

- Frontend i gameplay używają 40×24 znaków ANTIC 4, ekranu `$4000-$43FF`
  i własnego charsetu `$4400-$47FF`.
- Tło przewija 21 wierszy i generuje jeden wiersz raz na cztery ramki.
  Istniejące przybliżenie pesymistyczne tej rzadkiej ścieżki to około 19 000
  cykli wobec około 35 500 cykli ramki PAL. Pełny najgorszy koszt całej pętli
  nie został jeszcze zmierzony.
- Player 0 to korpus Vipera, Player 3 jego pomarańczowy silnik.
- Player 1 to obecny korpus przeciwnika, Player 2 czerwony skaner.
- Missile 0 to pojedynczy pocisk gracza.
- Loader nie używa PMG.

### Stan, losowość i audio

Bieżący stan zajmuje 34 bajty zero page pod `$0080-$00A1`. Obejmuje
pozycje gracza, jednego przeciwnika i pocisku, timery, score BCD, prosty
`rng_state` oraz wskaźniki używane przy scrollu i dekompresji. `random_byte`
jest małym deterministycznym generatorem używanym do pozycji przeciwnika
i gwiazd. Nie jest jeszcze API kontrolowanej losowości poziomów.

Frontend dodaje 7 bajtów ZP: 5 bajtów trwałego stanu przejść/opcji/bramek oraz
2-bajtowy wskaźnik używany podczas renderowania. POKEY generuje osobne krótkie
dźwięki strzału i trafienia oraz ciche tło silnika, o ile `SOUND` jest ON.
Nie ma jeszcze docelowego odtwarzacza ani budżetu audio.

## Aktualny obraz pamięci i nośnika

Poniższe kategorie są celowo osobne. Wolne miejsce w jednej nie może być
przedstawiane jako wolne miejsce w innej.

| Kategoria | Potwierdzony stan bieżący | Bramka dla przyszłych zmian |
| --- | --- | --- |
| 1. Pojemność ATR | Standardowy ATR ma 92 176 B pliku: 16 B nagłówka i 92 160 B danych, czyli 720 sektorów po 128 B. Duża część obrazu jest pusta. | Wolne sektory nie zwiększają resident RAM i nie uzasadniają same w sobie modułów ładowanych podczas gry. |
| 2. Boot payload i sektory startowe | Payload ma 6880 B i zajmuje 54 sektory. Pierwsze 6 B to nagłówek boot, a liczba sektorów mieści się w jednym bajcie. Bieżący linker ma ostrzejszy limit `$2000-$3AFF`, czyli 6912 B przed aktywnym PMG. | Raportować osobno rozmiar payloadu, liczbę sektorów, padding ostatniego sektora, XEX headers i granicę linkera. |
| 3. Resident gameplay RAM | Początkowo payload leży pod `$2000-$3ADF`; ekran, charset i PMG mają osobne zakresy. Kod kończy się na `$27F8`, a trwałe dane frontendu leżą przed loader-only strumieniem; map nadal nie modeluje automatycznie czasu życia każdego zakresu. | Następny kamień milowy ma zmierzyć rzeczywiście trwałe dane i przygotować budżet, bez zakładania, że każdy nieadresowany bajt jest bezpieczny. |
| 4. Pamięć przejściowa loadera | Surowa bitmapa zajmuje `$4010-$5E0F`. Bieżący strumień PackBits ma 3370 B pod `$2CEC-$3A15`, a loader display list leży pod `$3A16-$3ADF`; jej końcowe bajty wchodzą w padding `$3800-$3AFF`. Dekompressor używa istniejących wskaźników i liczników zero page. | Koszt i zakresy loadera raportować jako transient, nie jako stały gameplay asset. |
| 5. Pamięć odzyskiwalna po przejściu | Gameplay nie adresuje pozostałości bitmapy `$4800-$5E0F`. `$5E10-$BFFF` jest obecnie nieprzydzielone. Padding `$3800-$3AFF` jest czyszczony razem z PMG i nie może przechowywać danych trwałych bez zmiany inicjalizacji. | Reuse wymaga jawnej rezerwacji, testu przejścia i aktualizacji memory map. Nie ma jeszcze allocatora ani overlayu. |
| 6. PMG | PMBASE `$3800`; aktywne dane: missiles `$3B00-$3BFF`, P0 `$3C00-$3CFF`, P1 `$3D00-$3DFF`, P2 `$3E00-$3EFF`, P3 `$3F00-$3FFF`. | Każda zmiana ról, multipleksowania lub trybu DMA wymaga limitu obiektów, kosztu i testu PAL/real hardware. |
| 7. Display memory i charset | Wspólny ekran `$4000-$43FF`, charset `$4400-$47FF`; loader bitmap `$4010-$5E0F` istnieje tylko przed przebudową. Dane frontendu używają 233 B niewyświetlanych slotów wewnątrz niezmienionego 1 KB charsetu. | Capital hulls mają najpierw zużywać char-mode data. Charset pressure i koszty kopiowania muszą być mierzone. |
| 8. Zero page | Linker raportuje 34 B pod `$0080-$00A1`; w zadeklarowanym regionie `$0080-$00FF` pozostają 94 nieprzydzielone bajty. | Każda funkcja podaje delta ZP; wolnych bajtów nie przydziela się bez audytu konfliktów i czasu życia. |
| 9. Koszt widocznej ramki | Frontend po oczekiwaniu na ramkę wykonuje około 30 cykli pracy logicznej bez inputu; zdarzenie nawigacji pozostaje poniżej około 300 cykli. Jednorazowe wejście na ekran, wraz z wyczyszczeniem 1 KB, tekstem i najcięższą tabelą wyników, ma konserwatywne przybliżenie poniżej 11 000 cykli. Znana ścieżka scrollu gameplayu to około 19 000 cykli raz na cztery ramki; pełny worst case gameplayu nadal wymaga pomiaru. | Przed zwiększeniem liczby obiektów powstaje pomiar pełnej ramki i bramka 50 FPS PAL. |
| 10. Jednorazowy setup/transition | Dekompresja, kopiowanie charsetu, renderowanie ekranów frontendu i reset gameplayu odbywają się przy wyłączonym DMA. Loader DLI działa tylko przez 250 ramek; frontend i gameplay nie dodają nowych DLI/VBI. | Nie sumować setup cost z kosztem stałej pętli; ograniczyć i mierzyć osobno przejścia sektorów, restart i inicjalizację poziomu. |

Linker map kończy bieżący payload na `$3ADF`. Zakres `$3AE0-$3AFF` ma 32 B
i jest tylko konkretną, ciągłą luką przed aktywnym PMG. Nie jest „całą wolną
pamięcią Atari”. Dokładne rezerwacje pozostają w `docs/memory-map.md`; ten
dokument nie przydziela nowych zakresów.

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
fighters i nie przyznaje im faction immunity.

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
pamięć loader-only i dopiero potem włącza ANTIC 4 z main menu, bez PMG.
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
- przed capital hulls mierzymy charset/display pressure;
- przed broadside mierzymy najgorszą macierz kolizji;
- przed audio mierzymy koszt odtwarzacza razem z najcięższą ramką gameplayu;
- przed jakąkolwiek propozycją modułów mierzymy resident RAM po reclaimie
  loadera.

Nie istnieją jeszcze zatwierdzone dokładne liczby cykli dla tych przyszłych
systemów. 50 FPS jest warunkiem akceptacji, nie założeniem wynikającym z
sukcesu emulatora.
