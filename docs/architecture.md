# Architektura pierwszego vertical slice'a

Gra przejmuje ekran i pracuje bez usług DOS-u. Po starcie wyświetla loader przez
250 pełnych ramek PAL, przebudowuje współdzielony ekran przy wyłączonym DMA, a
następnie uruchamia dotychczasowy gameplay. Główna pętla synchronizuje się z
ramką PAL, odczytuje joystick, aktualizuje obiekty, obsługuje kolizje i dźwięk,
po czym czeka na następną ramkę.

## Sekwencja startowa

1. Kod wyłącza NMI, DMA, PMG i dźwięk.
2. Rozwija bitmapę PackBits do `$4010-$5E0F`. Źródło skompresowane pozostaje
   wtedy bezpieczne w załadowanym payloadzie, także w tymczasowo użytej części
   obszaru wyrównania PMG.
3. Instaluje `loader_dli` w `VDSLST`, synchronizuje się z początkiem ramki,
   włącza wyłącznie DLI i ANTIC F playfield DMA.
4. Odlicza 250 pełnych ramek, bez obsługi joysticka i FIRE.
5. Wyłącza NMI i DMA, czyści całe PMG `$3800-$3FFF` (odzyskując również
   tymczasowy koniec payloadu), kopiuje charset gameplayu i buduje jego ekran.
6. Ponownie synchronizuje się przed widoczną częścią ramki i włącza gameplay
   PMG/DMA. DLI pozostaje wyłączone przez całą główną pętlę.

Loader używa dwóch DLI na klatkę, na liniach bitmapy 39 i 163. Zapis do
`WSYNC` ustawia zmianę koloru na początku kolejnej strefy. Każde wywołanie ma
pesymistycznie ograniczony koszt 160 cykli 6502 razem z najdłuższym oczekiwaniem
`WSYNC`. Handler używa tylko akumulatora i zachowuje go przez `PHA`/`PLA`; X i
Y nie są modyfikowane.

## Obraz

- ANTIC mode 4 zapewnia czterokolorowe tło znakowe 40×24 o efektywnej szerokości 160 color clocks.
- Własny zestaw znaków w RAM buduje HUD, pole gwiazd i moduły konstrukcji po bokach korytarza.
- Tło przesuwa pole gwiazd oraz konstrukcje w dół, tworząc wrażenie stałego lotu naprzód.
- Player 0: korpus statku gracza.
- Player 3: pomarańczowy ślad silnika gracza.
- Player 1: korpus przeciwnika.
- Player 2: animowany czerwony skaner przeciwnika.
- Missile 0: pocisk gracza.

Loader używa ANTIC mode F: 320×192, 1 bit na piksel i 40 bajtów na linię. PMG
pozostaje wyłączone. Hostowy kompilator rasteryzujący
`assets/graphics/loader-bitmap.json` tworzy tę samą surową bitmapę 7680 B dla
PackBits, include ca65 oraz podglądu PNG. Pierwsze LMS wskazuje `$4010`; po 102
liniach drugie LMS wskazuje `$5000`, dzięki czemu żadna linia 40-bajtowa nie
przecina granicy 4 KB ANTIC-a.

Kopiowanie 21 wierszy tła i wygenerowanie nowego wiersza odbywa się raz na cztery ramki. Przybliżony pesymistyczny koszt tej ścieżki to 19 000 cykli 6502, wobec około 35 500 cykli dostępnych w ramce PAL. W pozostałych trzech ramkach procedura kończy się po kilkunastu cyklach. Koszt jest ograniczony stałą liczbą 840 kopiowanych bajtów, 12 znaków konstrukcji i 28 komórek pola gwiazd.

## Sterowanie i logika

Joystick jest aktywny stanem niskim. Pozycja gracza jest ograniczona do widocznego obszaru. FIRE tworzy jeden sprzętowy pocisk; przytrzymanie przycisku daje kontrolowany autofire po zniknięciu poprzedniego pocisku.

## Dźwięk

POKEY generuje osobne krótkie efekty strzału i trafienia oraz cichy dźwięk pracy silnika. To rozwiązanie tymczasowe przed integracją właściwego odtwarzacza muzyki.

## Dystrybucja

Linker tworzy jeden surowy blok ładowany pod `$2000`. Może on wykorzystać
tymczasowy zakres do `$3AFF`, ale walidacja nie dopuszcza wejścia w aktywne dane
PMG od `$3B00`. Skrypt builda:

1. uzupełnia liczbę sektorów w sześciobajtowym nagłówku boot;
2. opakowuje ten sam blok jako plik XEX z wektorem RUNAD;
3. umieszcza blok w pierwszych sektorach standardowego obrazu ATR 90 KB;
4. waliduje zakresy, rekordy i sumy kontrolne.
