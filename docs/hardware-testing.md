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
- `TOP SCORES` pokazuje dziesięć wierszy `01`–`10`; pierwszy FIRE po wejściu
  nie wraca natychmiast, a osobne naciśnięcie wraca do menu;
- `EXIT GAME?` domyślnie wskazuje `NO`; NO wraca do menu;
- wybranie YES pokazuje `DARK FIGHTER ENDED` oraz `PRESS RESET TO RESTART`,
  wycisza audio i pozostaje stabilne bez próby powrotu do DOS-u aż do RESET;
- `START GAME` uruchamia gameplay dopiero po świadomym FIRE;
- FIRE użyty do startu nie tworzy natychmiast pocisku; po puszczeniu kolejne
  FIRE działa normalnie;
- tytuł oraz gwiazdy są stabilne;
- statek porusza się w czterech kierunkach i nie wychodzi poza ekran;
- FIRE tworzy jasny pocisk;
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
- oba górne wiersze HUD-u są ostre i stabilne jako tekst ANTIC 2, divider nie
  ma color leak, a pierwszy wiersz ANTIC 4 używa właściwego charsetu/palety;
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
- kadłuby wykonują w tych samych 20 ramkach odpowiednio 5 (`HARD`) oraz po
  4 (`MEDIUM` i `EASY`) pełne kroki; w długim oknie zachowują dokładnie połowę
  world rate, a gwiazdy, fightery i pociski nie zostają spowolnione;
- zmiana trudności wpływa na następne wejście do gameplayu, nie zmienia ruchu
  gracza, fightera, pocisków ani logicznych 50 updates/s;
- nowe warningi rozpoczynają się wyraźnie rzadziej i pozostawiają spokojne
  odstępy; scheduler nie przyspiesza wraz z wybraną stawką scrollu,
  zachowuje kolejność allied/enemy i nie zmienia 25-ramkowego heat-upu;
- przy każdym evencie wybierana jest najstarsza bezpieczna bateria danej
  strony; warning nie rozpoczyna się, jeżeli emplacement nie zdąży zakończyć
  25 ramek i jednego wiersza marginesu przed opuszczeniem strefy ognia;
- po warningu czteroramkowy flash pozostaje przy realnym wylocie, a lecący
  slug pulsuje czytelnie między 3 i 4 scanlines bez poszerzenia hitboxu,
  fighter-colour flickeru lub pozostawionych pikseli;
- M1–M3 są rozróżnialne w swoich rzeczywistych kolorach, lecą poziomo po
  zapowiedzianym torze i nie uszkadzają ani nie wymazują M0;
- allied fire może zresetować hostile fighter bez dodania score, enemy fire
  nie niszczy własnego fightera, a M0 nadal daje dotychczasowy wynik;
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
- `LIFE 000` rozpoczyna jedną 100-klatkową fazę zniszczenia i odejmuje tylko
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
- dźwięki nie zawieszają obrazu ani sterowania;
- po pięciu minutach nie pojawiają się śmieci w grafice.

## Raport błędu

Zapisz:

- wersję z `build/manifest.json`;
- model Atari i wersję systemu, jeśli jest znana;
- model/firmware SIO2SD;
- etap, na którym wystąpił błąd;
- zdjęcie lub krótki film ekranu;
- informację, czy ten sam ATR działa w emulatorze.
