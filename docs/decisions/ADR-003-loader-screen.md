# ADR-003: bitmapowy ekran startowy ANTIC F 320×192

Status: zaakceptowane

## Kontekst

Autorska referencja `assets/graphics/loader.png` zawiera duży tytuł, boczny
profil Galactiki z oznaczeniem `BSG`, trzy zespoły silników oraz zielony podpis
studia. Pierwsza adaptacja ANTIC 4 mieściła ekran w kaflach 4×8, lecz jej
rozdzielczość pozioma i liczba unikatowych detali były niewystarczające:
Galactica wyglądała jak schematyczna bryła zamiast długiego, segmentowego
okrętu. Loader ma działać tak samo z XEX, ATR, w emulatorze i na stockowym
Atari 65XE PAL.

Dark Fighter pozostaje finalnie nieoficjalnym, niekomercyjnym fan projectem
BSG. Galactica i oznaczenie `BSG` są świadomymi elementami ekranu, a projekt
nie sugeruje oficjalnej afiliacji ani poparcia właścicieli marki.

## Decyzja

- Loader używa ANTIC mode F: 320×192, 1 bit na piksel i 40 bajtów na linię.
- Deklaratywne źródło `assets/graphics/loader-bitmap.json` opisuje font
  pikselowy, wielokąty, linie paneli, powtarzalne żebra, deterministyczne
  wzory ditheringu, pozycje, strefy palety i czas ekspozycji.
- Host rasteruje źródło do dokładnie 7680 B w kolejności MSB-left, kompresuje
  PackBits i z tych samych bajtów tworzy include ca65 oraz deterministyczny
  preview PNG 2×.
- Bitmapa zaczyna się pod `$4010`. Pierwsze 102 linie kończą się dokładnie pod
  `$4FFF`; drugie LMS wskazuje `$5000`, a linie 102–191 kończą się pod
  `$5E0F`. Dzięki temu żadna 40-bajtowa linia nie przecina granicy 4 KB.
- Dwa DLI na liniach bitmapy 39 i 163 przełączają rejestry `COLPF1/COLPF2`
  między strefami tytułu, statku i podpisu. Najgorszy koszt wywołania,
  uwzględniający oczekiwanie `WSYNC`, jest ograniczony do około 160 cykli;
  są dokładnie dwa wywołania na ramkę.
- PMG oraz jego DMA pozostają wyłączone przez cały loader.
- Po pełnym skonfigurowaniu ekranu kod odlicza 250 kompletnych ramek PAL,
  czyli 5 sekund przy 50 Hz. Joystick i FIRE nie są wtedy odczytywane.
- Po 250 ramkach kod wyłącza NMI i DMA, czyści PMG, kopiuje gameplay charset,
  buduje ekran rozgrywki, a DMA włącza dopiero przed widoczną częścią kolejnej
  ramki.

## Paleta

W ANTIC F ustawiony bit pobiera odcień z `COLPF2` i luminancję z `COLPF1`;
wyzerowany bit pobiera `COLPF2`. Dlatego każda strefa używa luminancji zero w
`COLPF2`, aby tło pozostało wizualnie czarne, oraz wymaganej luminancji w
`COLPF1`.

| Strefa / linie | `COLBK` | `COLPF1` | `COLPF2` | efektywny foreground |
| --- | --- | --- | --- | --- |
| tytuł 0–39 | `$00` | `$1E` | `$10` | `$1E` jasny kremowy |
| statek 40–163 | `$00` | `$0A` | `$00` | `$0A` neutralna jasna stal |
| studio 164–191 | `$00` | `$EC` | `$E0` | `$EC` zieleń Kawasaki |

Analogowy PAL, emulatory i odbiorniki mogą interpretować te wartości nieco
inaczej. Monochromatyczny playfield nie zachowuje lokalnej pomarańczy dysz;
ich rozdzielenie i jasność są odwzorowane kształtem oraz ditheringiem.

## Pamięć i czas

Surowa bitmapa zajmuje 7680 B pod `$4010-$5E0F`; bieżący strumień PackBits ma
3370 B. Linker może użyć tymczasowej części `$3800-$3AFF`, która należy do
wyrównania PMG i jest zerowana dopiero po loaderze, ale build bezwzględnie
odrzuca wejście w aktywne dane PMG od `$3B00`. Rozwinięcie odbywa się przy
wyłączonym DMA i kończy dokładnie pod `$5E0F`.

Po loaderze gameplay odzyskuje `$4000-$43FF` jako ekran znakowy,
`$4400-$47FF` jako charset i `$3B00-$3FFF` jako aktywne PMG. Jego display list
nie wskazuje pozostałych bajtów `$4800-$5E0F`. Jednorazowe przejście wykonuje
dotychczasową inicjalizację gameplayu; po nim DLI jest wyłączone, więc loader
dodaje 0 cykli do głównej pętli i gameplay VBI.

## Konsekwencje

Tryb jednobitowy rezygnuje z lokalnych kolorów i antyaliasingu referencji, ale
odzyskuje rzeczywistą rozdzielczość poziomą: kierunek i profil statku, trzy
osobne zespoły napędowe, długi żebrowany kadłub, czarne szczeliny, warstwowy
dziób, `BSG` i hierarchia napisów są czytelne. Build pozostaje przenośny,
deterministyczny i bez nowych zależności. Stara kafelkowa implementacja ANTIC 4
loadera nie jest utrzymywana; ANTIC 4 nadal służy wyłącznie gameplayowi.
