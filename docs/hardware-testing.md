# Test na prawdziwym Atari 65XE

## Przygotowanie

1. Użyj release'owego `dist/dark-fighter.atr`.
2. Zamontuj obraz jako `D1:` w SIO2SD.
3. Odłącz inne urządzenia SIO na czas pierwszego testu.
4. Podłącz joystick do portu 1.
5. Włącz Atari z wciśniętym `OPTION`.

## Lista kontrolna

- obraz bootuje bez DOS-u i bez komunikatu `BOOT ERROR`;
- loader pojawia się jako pierwszy ekran i pozostaje stabilny przez pełne
  pięć sekund, czyli 250 ramek PAL;
- tytuł, profil Galactiki, `BSG`, trzy silniki i zielony podpis studia są
  czytelne;
- bitmapa 320×192 jest stabilna, bez poziomego rozdarcia przy drugim LMS po
  linii 102;
- trzy zespoły napędowe pozostają rozdzielone, kadłub jest neutralnie
  stalowoszary, a dziób zwęża się warstwami;
- granice koloru po liniach 39 i 163 nie przecinają tytułu, okrętu ani podpisu;
- przejście do main menu jest automatyczne i nie pokazuje częściowo
  przebudowanego charsetu ani ekranu;
- menu nie uruchamia gameplayu samoczynnie;
- the loader remains silent; the original four-voice POKEY score starts only
  when the main menu appears and loops without an audible gap after about 30.72 seconds;
- the menu score reads as a low drone, heavy ritual drums, a restrained military
  pulse, and a sparse minor/Dorian motif without reproducing an existing melody;
- `START GAME`, `OPTIONS`, `TOP SCORES`, `EXIT` są czytelne i występują
  w tej kolejności, a domyślny marker wskazuje `START GAME`;
- duży, czytelny `DARK FIGHTER` zajmuje górną część ekranu; kątowy hangar i
  jasny Viper z bursztynowym silnikiem są po lewej, a czytelne opcje po prawej;
- marker i cały aktywny napis mają ten sam nasycony zielony akcent `$D8`, bez
  zielonego prostokąta tła; nie wpadają w żółć ani pomarańcz;
- main menu nie zawiera `SETECH GAME STUDIO`; podpis pozostaje wyłącznie na
  loaderze, gdzie ma jasnozielone litery na rzeczywiście czarnym tle;
- biały hint `UP/DOWN MOVE  FIRE SELECT` pozostaje czytelny i nie barwi tła;
- hangar, gwiazdy i myśliwiec są stabilne bez animacji, migotania i uszkodzeń
  display listy; menu nie zawiera `BSG 75` ani skopiowanych insygniów;
- pojedyncze wychylenie UP/DOWN przesuwa marker dokładnie raz, wybór zawija się
  między pierwszą i ostatnią pozycją, a trzymanie kierunku nie autorepeatuje;
- FIRE wybiera dokładnie raz i wymaga puszczenia przed kolejną akcją;
- `OPTIONS` pozwala zmienić `SOUND: ON/OFF`, a na osobnym wierszu LEFT/RIGHT
  zawija `DIFFICULTY` przez `EASY/MEDIUM/HARD`; domyślne `MEDIUM`, oba wybory
  pozostają zachowane po wyjściu przez `BACK` i ponownym wejściu;
- myśliwiec z hangaru znika w `OPTIONS`, `TOP SCORES`, potwierdzeniu `EXIT`
  oraz ekranie końcowym i wraca dopiero po ponownym wejściu do main menu;
- przy SOUND OFF strzał, trafienie i tło silnika są niesłyszalne, kanały nie
  zostawiają zawieszonego tonu, a obraz i sterowanie zachowują timing;
- entering `OPTIONS`, `TOP SCORES`, `EXIT`, Game Over, or gameplay stops the
  menu score immediately; returning from Game Over restarts it from the intro;
- `START GAME` leaves no sustained menu tone, and joystick/FIRE response remains
  one PAL-frame poll while the score is active;
- `TOP SCORES` pokazuje dziesięć wierszy `01`–`10`; po zdobyciu punktów
  pierwszy wiersz pokazuje sesyjny TOP w tej samej postaci cyfr co SCORE;
  śmierć i respawn zachowują SCORE, a dopiero ponowny `START GAME` zeruje
  SCORE bez obniżania TOP; pierwszy
  FIRE po wejściu nie wraca natychmiast, a osobne naciśnięcie wraca do menu;
- `EXIT GAME?` domyślnie wskazuje `NO`; NO wraca do menu;
- wybranie YES pokazuje `DARK FIGHTER ENDED` oraz `PRESS RESET TO RESTART`,
  wycisza audio i pozostaje stabilne bez próby powrotu do DOS-u aż do RESET;
- `START GAME` uruchamia gameplay dopiero po świadomym FIRE;
- FIRE użyty do startu nie tworzy natychmiast pocisku; po puszczeniu kolejne
  FIRE działa normalnie;
- tytuł oraz gwiazdy są stabilne;
- w gameplayu widać rzadką warstwę jasnych near stars i liczniejszą,
  stalowo-niebieską warstwę far; w długim oknie near wykonuje dokładnie 70%,
  a far 35% kroków kadłubów na każdej trudności;
- najwyżej pojedynczy far star subtelnie zmienia fazę co 16 ramek; nie ma
  pełnoekranowego flashu, regularnych siatek ani wzorów podobnych do pocisków;
- pociski Vipera i Raidera oraz capital slug chwilowo zakrywają gwiazdy, po
  zejściu przywracają aktualne tło bez czarnego prostokąta lub starej pozycji;
- wspólna fighter explosion nad gwiazdami kończy się pełnym odtworzeniem tła,
  bez glyphów w HUD i bez kolizyjnego ghosta;
- statek porusza się w czterech kierunkach i nie wychodzi poza ekran;
- przytrzymany FIRE tworzy żółty dziesięciostrzałowy burst co 3 ramki,
  a starsze strzały nie dziedziczą późniejszego ruchu Vipera;
- trafienie przeciwnika zwiększa wynik;
- czerwony skaner porusza się po kadłubie przeciwnika;
- kolizja statków daje czerwony błysk tła;
- lewy side hull jest jasny, warstwowy i modułowy, a prawy wyraźnie
  ciemniejszy, bardziej kanciasty i pełen czarnych wnęk także przy oglądaniu
  bez koloru;
- kontury obu stron zmieniają głębokość podczas scrollu, ale nie tworzą
  nagłego, nieczytelnego zwężenia ani nie zakrywają domyślnej pozycji gracza;
- lokalne cofnięcia do pięciu komórek wyglądają jak zamierzone wnęki/warstwy,
  nie jak przypadkowy brak kafla, a granica kolizji zgadza się z obrazem;
- widać kompletne, wielokomórkowe baterie z podstawą, obudową, lufą i wylotem
  po obu stronach; wyloty nie są nadpisywane przez gwiazdy;
- pełny 32-wierszowy segment ma po jednej funkcjonalnej baterii na stronę,
  strony są przesunięte w pionie, a usunięte stanowiska czytają się jako
  zwykłe płyty, wnęki i żebra, nie jako nieaktywne działa;
- pełny segment nie wygląda jak dawny ośmiowierszowy loop, strony nie są
  lustrzane, a statyczne kadłuby nie powodują migotania ani śmieci w PMG;
- górny wiersz HUD-u jest ostry i stabilny jako tekst ANTIC 2, jego biały
  dolny scanline tworzy divider bez dodatkowego wiersza, a pierwszy z 23
  wierszy ANTIC 4 używa właściwego charsetu/palety;
- score i trzy cyfry `LIFE` aktualizują się bez uszkodzenia sąsiednich znaków;
- warning pozostaje przy przewijającym się wylocie przez dokładnie 25 ramek;
  bez niewidocznej ramki rośnie kolejno jako compact 2-scanline, medium
  4-scanline i hot 6-scanline z czytelnym dwuramkowym pulsem, po czym salwa
  startuje bez skoku na zapowiedzianym torze;
- `HARD` przesuwa dokładnie 10 pełnych wierszy w 20 ramkach PAL (25 wierszy,
  200 scanlines/s) i odpowiada zaakceptowanemu szybkiemu kandydatowi;
- `MEDIUM` przesuwa dokładnie 9 wierszy w 20 ramkach (22,5/180), a `EASY` 8
  (20/160); pełne skoki nie tworzą irytującej pauzy, flickeru ani pozoru
  błędnego fine scrollu;
- kadłuby wykonują w tych samych 20 ramkach odpowiednio 10 (`HARD`), 9
  (`MEDIUM`) i 8 (`EASY`) pełnych kroków, czyli 100% dawnego world rate;
- w pełnym oknie 20 kroków kadłubów near wykonuje 14, a far 7 kroków; obie
  warstwy dają czytelną perspektywę i żadna nie płynie razem z kadłubem;
- przy ciągłym bocznym pościgu Raider pokonuje 14 HPOS w czasie, gdy Viper
  pokonuje 16 HPOS; pojedyncza pauza w każdym oknie ośmiu ramek nie może
  wyglądać jak zacięcie ani pozwolić Raiderowi zrównać się z Viperem;
- zmiana trudności wpływa na następne wejście do gameplayu, nie zmienia ruchu
  gracza, fightera, pocisków ani logicznych 50 updates/s;
- nowe warningi rozpoczynają się wyraźnie rzadziej i pozostawiają spokojne
  odstępy; scheduler nie przyspiesza wraz z wybraną stawką scrollu,
  zachowuje kolejność allied/enemy i nie zmienia 25-ramkowego heat-upu;
- przy każdym evencie wybierana jest najstarsza bezpieczna bateria danej
  strony; warning nie rozpoczyna się, jeżeli emplacement nie zdąży zakończyć
  25 ramek i jednego wiersza marginesu przed opuszczeniem strefy ognia;
- po warningu czteroramkowy flash pozostaje przy realnym wylocie, a lecący
  slug pulsuje czytelnie w dwukomórkowym 8×6 ANTIC 4 lozenge bez fighter-colour flickeru,
  rozszerzenia poza testowany swept hitbox lub pozostawionych kodów ekranu;
- allied shell jest yellow-gold `$1E`, Cylon shell crimson `$46`, oba są
  znacznie cięższe niż żółty 1×2 Viper shot i czerwony 2×3 Raider pulse;
- allied fire niszczy hostile fighter bez score, Cylon friendly fire niszczy
  własnego fightera i daje pełne 10 punktów Raidera, a Viper projectile oraz contact
  także dają pełną wartość deskryptora;
- przy przecięciu fightera i Vipera ten sam Cylon shell zatrzymuje się na
  pierwszym celu w kierunku lotu i nie może zadać dwóch trafień;
- każdy ciężki pocisk trafia przeciwny kadłub na widocznej, zależnej od
  wiersza krawędzi i nie traktuje gwiazd jako kadłuba;
- trafienie dowolnej strony broadside odejmuje graczowi 20 punktów, a cooldown
  nie dopuszcza wielokrotnego damage z jednego zbiegu;
- Viper nie wchodzi w lewy ani prawy kadłub: nieregularne krawędzie oraz
  projekcje turretów clampują P0/P3 w jednej pozycji i odejmują 20 punktów nie
  częściej niż co 25 ramek; gwiazdy nigdy nie wywołują tego kontaktu;
- przy jednoczesnym heavy hit i kontakcie pocisk nadal przechodzi do impact,
  Viper jest clampowany, lecz zdrowie spada tylko raz;
- nieruchomy Viper przy `HPOSP0=HPOSP3=124`, `Y=184` przeżywa przejście obu
  banków engines, aft, combat, forward, prow i 22 pustych wierszy drain; sam
  wiersz kadłuba na tej samej wysokości nie jest kontaktem bez overlapu X;
- `LIFE 000` rozpoczyna jedną 24-klatkową wspólną eksplozję fightera i odejmuje tylko
  jedno z trzech całkowitych żyć; jeśli życie pozostaje, Viper pojawia się
  atomowo w `X=124/Y=184`, a przy ostatnim życiu wraca istniejącą ścieżką do
  menu z aktywną bramką puszczenia FIRE;
- po respawnie Viper przez dokładnie 250 aktualizacji PAL miga 8 klatek ON / 8
  OFF, zachowuje joystick i M0 oraz ignoruje hull, fighter i heavy damage;
  po wygaśnięciu jest wymuszony jako widoczny, a pierwszy nowy realny kontakt
  działa normalnie bez śmierci ze starego latcha;
- trzy jednoczesne sloty nie tworzą nieuniknionej ściany ognia, nie zostawiają
  śmieci w missile DMA i znikają całkowicie po powrocie do menu;
- przelot nie wygląda jak nieskończona ściana: jako pierwsze widać grube,
  pulsujące banki silników i wydech, potem aft, combat, forward, a jako ostatnie
  zwężające się prows i terminal tips, z niezmiennym przesunięciem
  o osiem wierszy i bez dryfu;
- lewa rufa czyta się jako dwa masywne rdzenie z ciemnym spine, prawa jako dwa
  szersze kanciaste zespoły; fazy dim/bright/residual zmieniają się co osiem
  ramek bez checkerboardu, comb stripes i pozostawionego glow w AFT;
- lewy bow tworzy ciężki wedge, prawy odmienny spear/split shoulder; oba
  zwężają się 8→1 przez partial-edge pixels, a bezpośrednio po tip widać pusty
  drain bez niewidzialnej kolizji;
- ordinary P1/P2 fighter przy lewej granicy zajmuje `[80,96)`, przy prawej
  `[160,176)`; podczas spawnu, odbicia i pełnego ataku żaden widoczny piksel
  nie zachodzi na side hull, a ruch pionowy i zagrożenie pozostają aktywne;
- działa pojawiają się wyłącznie w combat, ostatnie osiem jego wierszy nie
  rozpoczyna nowych warningów, silniki pulsują w charsecie bez PMG, a po zejściu
  bow tips drain pozostawia stabilny HUD i pustą krawędź bez nowej broni;
- trafienie przeciwnego kadłuba przez M1–M3 uruchamia jeden 24-ramkowy,
  dominująco czerwony fireball 3×3 przyklejony do scrollu i jeden ciężki
  channel-4 crack/rumble; drugi bok może eksplodować niezależnie;
- `SOUND OFF` blokuje nowy capital impact i natychmiast zeruje aktywny
  `AUDC4/AUDCTL`; po 24 ramkach ON kanał również dochodzi do ciszy bez stuck tone;
- podczas całego broadside gwiazdy występują wyłącznie w kolumnach 9–30,
  nigdy pod hull bands; po `DRAIN/COMPLETE` pełna szerokość odtwarza się od
  nowo odsłanianego górnego wiersza bez blank pause, a świeże i trzymane FIRE
  zachowują zaakceptowany burst;
- dźwięki nie zawieszają obrazu ani sterowania;
- po pięciu minutach nie pojawiają się śmieci w grafice.

## Harness rosteru przeciwników

`npm run enemy:review` tworzy osobny
`build/enemy-review/dark-fighter.xex` i ATR z kompilacyjnym harnessiem; nie
modyfikuje release flow w `dist/`. Po wejściu do gameplayu harness cyklicznie
pokazuje Raidera, Talona i Scythe Bombera w środku oraz przy obu granicach.

- Raider czyta się jako szeroki crescent z wklęsłą krawędzią i czerwonym
  scannerem, a nie dawny schematyczny znak;
- Talon jest wyraźnie węższy, ma długi spine, krótki fin i dolny nos;
- Scythe ma największą masę, szerokie wings, centralny fuselage i pods;
- wszystkie trzy są zwrócone ku dolnej części ekranu/graczowi;
- trzy fazy P2 zmieniają rozmiar/położenie czerwonego slit co osiem ramek bez
  migania P1, M1 ani M2 kolorem;
- przy szybkim przełączeniu typu stary body/scanner znika w całości;
- Raider i Scythe mieszczą się w logical `80..160`, Talon w `80..170`; jego
  HPOSP `79..169` kompensuje pierwszy pusty bit;
- release XEX/ATR nadal pokazują wyłącznie Raidera i zachowują dotychczasowy
  movement, kolizję, score i przejście przez broadside.

Korekta palety i pierwszej broni dodaje osobne artefakty review:

- `npm run enemy:palette:dark-navy` — `COLPM1=$82`;
- `npm run enemy:palette:medium-steel-blue` — `COLPM1=$84`, release default;
- `npm run enemy:palette:graphite-blue` — `COLPM1=$04`;
- `npm run enemy:combat-review` — direct gameplay z rzeczywistym Raiderem,
  profilem `WEAPON_SINGLE_PULSE` i pulą ANTIC 4.

Każdy wariant trafia pod `build/enemy-*` i nie nadpisuje release `dist/`.
Sprawdź na PAL: P1 body pozostaje czytelny na czerni i przy obu side hulls,
P2 scanner jest czerwony, playfield pulse powstaje pod aktualną obwiednią
Raidera, porusza się o 5 scanlines, odejmuje dokładnie 10, a podczas 250 ramek
invulnerability jest zużywany bez damage. W broadside pule fighterów nie mogą
zmienić właściciela M1–M3 ani nadpisać capital slotu.

Test release musi czekać na naturalne pełne wejście bez ustawiania active flag:
Raider startuje pod `enemy_y=GAMEPLAY_TOP-14`, pierwsze piksele są przycinane
do Y=16, a następnie emituje 10 zaakceptowanych strzałów co 4 ramki. Pauza po
burst wynosi 60/50/40. Zajęte M1–M3 nie blokują dziewięcioslotowej puli.
`build/previews/raider-natural-fire-trace.csv` zapisuje burst state, shot index,
timer, occupancy, wynik alokacji, X/Y i aktywne overlaye playfield.
`build/previews/fighter-burst-runtime-trace.csv` zestawia oba kontrolery od
`WAITING`, przez accepted allocation i niezależne poprzednie/bieżące Y, po
dziesięciopunktowy Viper hit oraz źródła kolorów `$1E/$46`.

Artefakty `projectile-visual-language.png` i
`projectile-collision-scoring-sequence.png` muszą odpowiadać bieżącym runtime
bytes. Pierwszy pokazuje cztery klasy na tej samej skali i osobny widok
monochromatyczny, drugi: M0/contact score, colonial zero-score, Cylon
friendly-fire score, spatial first-target oraz zero double score. Literalnie
żółte Viper fire musi pochodzić z `COLPF2=$1E` w aktualnym framebufferze;
P0 `$0E` i P3 `$28` nie mogą się zmienić. Przy trzymanym FIRE powinno być
widoczne 10 strzałów co 3 ramki, z prędkością 6 i 12-ramkową pauzą.
Capital slugs muszą w runtime zajmować dwa sąsiednie znaki ANTIC 4, czyli
8 HPOS × 6 scanlines. W native capture ich długość pozioma musi być co najmniej
dwukrotnością 2-HPOS Raider pulse; metadata bez obu zapisów screen RAM nie jest
dowodem.

`DRAIN` i `COMPLETE` nie są blokadą broni Vipera: oba backing-aware fighter
pools zachowują własne lifecycle aż do kolizji, expiry, śmierci lub rzeczywistego
teardown gameplayu. Sprawdź osobno świeże naciśnięcie w `DRAIN`/`COMPLETE`
oraz FIRE trzymany przez całą granicę sektora: oba mają zachować niezmieniony
dziesięciostrzałowy burst Vipera, bez ghost glyphs.

Każde zniszczenie fightera ma pokazać te same sześć faz PMG 8×8 po cztery
ramki. Raider podczas `EXPLODING` nie może się poruszać, strzelać ani ponownie
punktować; inny enemy pozostaje aktywny. Śmierć Vipera najpierw pokazuje pełne
24 ramki tej samej animacji, a dopiero potem centrum corridor i dokładnie 250
ramek invulnerability. Zweryfikuj jednoczesną eksplozję Vipera i Raidera oraz
brak zapisu w HUD scanlines.

## Raport błędu

Zapisz:

- wersję z `build/manifest.json`;
- model Atari i wersję systemu, jeśli jest znana;
- model/firmware SIO2SD;
- etap, na którym wystąpił błąd;
- zdjęcie lub krótki film ekranu;
- informację, czy ten sam ATR działa w emulatorze.
