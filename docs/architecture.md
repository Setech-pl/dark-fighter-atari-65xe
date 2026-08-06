# Architektura pierwszego vertical slice'a

Gra przejmuje ekran i pracuje bez usług DOS-u. Główna pętla synchronizuje się z ramką PAL, odczytuje joystick, aktualizuje obiekty, obsługuje kolizje i dźwięk, po czym czeka na następną ramkę.

## Obraz

- ANTIC mode 2 zapewnia znakowe tło 40×24.
- Tło przesuwa pole gwiazd w dół, tworząc wrażenie stałego lotu naprzód.
- Player 0: korpus statku gracza.
- Player 3: pomarańczowy ślad silnika gracza.
- Player 1: korpus przeciwnika.
- Player 2: animowany czerwony skaner przeciwnika.
- Missile 0: pocisk gracza.

## Sterowanie i logika

Joystick jest aktywny stanem niskim. Pozycja gracza jest ograniczona do widocznego obszaru. FIRE tworzy jeden sprzętowy pocisk; przytrzymanie przycisku daje kontrolowany autofire po zniknięciu poprzedniego pocisku.

## Dźwięk

POKEY generuje osobne krótkie efekty strzału i trafienia oraz cichy dźwięk pracy silnika. To rozwiązanie tymczasowe przed integracją właściwego odtwarzacza muzyki.

## Dystrybucja

Linker tworzy jeden surowy blok ładowany pod `$2000`. Skrypt builda:

1. uzupełnia liczbę sektorów w sześciobajtowym nagłówku boot;
2. opakowuje ten sam blok jako plik XEX z wektorem RUNAD;
3. umieszcza blok w pierwszych sektorach standardowego obrazu ATR 90 KB;
4. waliduje zakresy, rekordy i sumy kontrolne.

