# ADR-003: bitmapowy ekran startowy ANTIC F/E

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

- Loader używa ANTIC F 320 px na liniach 0–163 oraz ANTIC E 160 px na liniach
  164–191; oba tryby zużywają 40 bajtów na linię.
- Deklaratywne źródło `assets/graphics/loader-bitmap.json` opisuje font
  pikselowy, wielokąty, linie paneli, powtarzalne żebra, deterministyczne
  wzory ditheringu, pozycje, strefy palety i czas ekspozycji.
- Host rasteruje źródło do dokładnie 7680 B: 1-bitowe bajty MSB-left dla
  ANTIC F i cztery 2-bitowe piksele na bajt dla ANTIC E. Następnie kompresuje
  PackBits i z tych samych bajtów tworzy include ca65 oraz preview PNG 2×.
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
  buduje osobny frontend charset i mieszane main menu, a DMA włącza dopiero
  przed widoczną częścią kolejnej ramki.

## Paleta

W ANTIC F ustawiony bit pobiera odcień z `COLPF2` i luminancję z `COLPF1`, a
wyzerowany bit pobiera `COLPF2`. Footer używa zamiast tego ANTIC E: piksel 0
wybiera `COLBK=$00`, a piksel 2 wybiera `COLPF1=$D8`. Dzięki temu zielony
odcień `COLPF2=$D0` nie barwi tła footera.

| Strefa / linie | tryb | `COLBK` | `COLPF1` | `COLPF2` | efektywny foreground |
| --- | --- | --- | --- | --- | --- |
| tytuł 0–39 | F | `$00` | `$1E` | `$10` | `$1E` jasny kremowy |
| statek 40–163 | F | `$00` | `$0A` | `$00` | `$0A` neutralna jasna stal |
| studio 164–191 | E (piksele 0/2) | `$00` | `$D8` | `$D0` | `$D8` nasycona zieleń PAL |

`$D8` jest zatwierdzonym akcentem po sprawdzeniu w Atari800 7.1.2. Analogowy
PAL, emulatory i odbiorniki mogą nadal interpretować ten rejestr nieco inaczej;
wartość rejestru nie zastępuje testu wizualnego. Monochromatyczny playfield nie zachowuje lokalnej pomarańczy dysz;
ich rozdzielenie i jasność są odwzorowane kształtem oraz ditheringiem.

## Pamięć i czas

Surowa bitmapa zajmuje 7680 B pod `$4010-$5E0F`; bieżący strumień PackBits ma
3370 B pod `$2F45-$3C6E`, a loader display list leży pod `$3C6F-$3D38`.
Może przejściowo używać części stron P0/P1, ponieważ PMG i jego DMA są wtedy
wyłączone. Build bezwzględnie odrzuca wejście w Player 2 od `$3E00`.
Rozwinięcie odbywa się przy wyłączonym DMA i kończy dokładnie pod `$5E0F`.

Po loaderze program wyłącza DMA/DLI i zeruje całe `$3800-$3FFF`, zanim
`$3B00-$3FFF` otrzyma role aktywnego PMG. Odzyskuje `$4000-$43FF` jako ekran,
`$4400-$47FF` jako gameplay charset i `$4800-$4BFF` jako frontend charset.
Gameplay display list nie wskazuje pozostałych bajtów `$4C00-$5E0F`. DLI
loadera zostaje usunięte, więc loader dodaje 0 cykli do gameplay main loop/VBI.

## Konsekwencje

Tryb jednobitowy rezygnuje z lokalnych kolorów i antyaliasingu referencji, ale
odzyskuje rzeczywistą rozdzielczość poziomą: kierunek i profil statku, trzy
osobne zespoły napędowe, długi żebrowany kadłub, czarne szczeliny, warstwowy
dziób, `BSG` i hierarchia napisów są czytelne. Build pozostaje przenośny,
deterministyczny i bez nowych zależności. Stara kafelkowa implementacja ANTIC 4
loadera nie jest utrzymywana; tryb ANTIC 4 pozostaje wykorzystywany w gameplayu
oraz dla dekoracyjnych wierszy mixed-mode main menu, nie jako loader.
