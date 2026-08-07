# Kierunek artystyczny

## Rdzeń stylu

Dark Fighter ma wyglądać jak wojna prowadzona przez maszyny, które są naprawiane, łatane i ponownie wysyłane do walki. To nie jest czysta, kolorowa przyszłość. Najważniejsze skojarzenia to ciężar, funkcja, napięcie i ograniczone zasoby.

## Paleta

- czerń i bardzo ciemny granat jako przestrzeń;
- przygaszona stal oraz chłodna biel dla jednostek gracza;
- ciemne szarości dla kadłubów wroga;
- pomarańcz i bursztyn dla silników i uszkodzeń;
- pojedynczy, agresywny czerwony skaner przeciwnika.

## Zakres fan-artu BSG

Dark Fighter jest nieoficjalnym, hobbystycznym i niekomercyjnym fan-artem.
Właściciel projektu dopuścił stałe wykorzystywanie ekosystemu Battlestar
Galactica, w tym statków, nazw, frakcji, oznaczeń, elementów UI, lore oraz
motywów muzycznych. Projekt nie sugeruje oficjalnego związku ani poparcia
właścicieli marki. Dostarczonych i zaakceptowanych odniesień BSG nie należy
po cichu zastępować alternatywnym projektem.

Pierwszym bezpośrednim odniesieniem jest profil Galactiki z oznaczeniem `BSG`
na ekranie startowym. Referencja `assets/graphics/loader.png` jest wizualnym
źródłem prawdy dla proporcji, kierunku statku, hierarchii napisów i kolorystyki.

## Czytelność na Atari

Każdy obiekt musi przejść test sylwetki w rozdzielczości docelowej. Detal ma powstawać z animacji, nakładania Player/Missile i kontrastu, a nie z pikseli, których sprzęt nie potrafi wiarygodnie pokazać.

## Zaakceptowany ekran referencyjny

Plik `assets/graphics/dark-fighter-screen-concept-v1.png` jest wzorcem kompozycji pierwszego ekranu rozgrywki. Implementacja ma zachować:

- jednowierszowy HUD z wynikiem, paliwem, uzbrojeniem i liczbą statków;
- szeroki, czarny korytarz lotu oraz masywne konstrukcje przy obu krawędziach;
- stalowo-granatowe moduły z czerwonymi pasami identyfikacyjnymi;
- jasny, klinowaty statek gracza z ciemnym rdzeniem i widocznym napędem;
- blade, symetryczne myśliwce przeciwnika z czerwonym sensorem;
- oszczędne gwiazdy i dobrze widoczne pociski energetyczne.

PNG nie określa rozdzielczości ani liczby obiektów sprzętowych. Wymiary, paleta i zagęszczenie są adaptowane do ograniczeń ANTIC/GTIA, PMG oraz budżetu jednej ramki PAL.

## Zaakceptowany ekran startowy

Loader zachowuje czarne tło, kremowo-jasny tytuł, skierowany w prawo profil
Galactiki, trzy rozdzielone zespoły napędowe, oznaczenie `BSG` oraz zielony
podpis `SETECH GAME STUDIO`. Odwzorowanie Atari-native znajduje się w
`assets/graphics/loader-bitmap.json`.

Loader używa monochromatycznej bitmapy ANTIC F 320×192. Różne gęstości
uporządkowanego ditheringu, czarne szczeliny, linie paneli i powtarzalne żebra
symulują półtony stalowego kadłuba. Trzy strefy DLI osobno barwią tytuł,
okręt i podpis. Jednobitowy playfield nie może równocześnie zachować
pomarańczowych dysz z referencji; na tym etapie ich rolę przekazują trzy
wyraźne sylwetki i różne rastry. Ewentualne kolorowanie silników przez PMG jest
oddzielną, przyszłą decyzją i nie stanowi drugiego wariantu loadera.
