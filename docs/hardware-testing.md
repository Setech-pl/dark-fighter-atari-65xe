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
- `OPTIONS` pozwala zmienić `SOUND: ON/OFF` przez LEFT/RIGHT lub FIRE, `BACK`
  wraca do menu, a wybór pozostaje zachowany po ponownym wejściu;
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
