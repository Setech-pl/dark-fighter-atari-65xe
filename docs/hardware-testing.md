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
- przejście do gameplayu jest automatyczne i nie pokazuje częściowo
  przebudowanego charsetu ani ekranu;
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
