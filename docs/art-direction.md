# Kierunek artystyczny

## Rdzeń stylu

Dark Fighter ma wyglądać jak wojna prowadzona przez maszyny, które są naprawiane, łatane i ponownie wysyłane do walki. To nie jest czysta, kolorowa przyszłość. Najważniejsze skojarzenia to ciężar, funkcja, napięcie i ograniczone zasoby.

## Paleta

- czerń i bardzo ciemny granat jako przestrzeń;
- przygaszona stal oraz chłodna biel dla jednostek gracza;
- ciemne szarości dla kadłubów wroga;
- pomarańcz i bursztyn dla silników i uszkodzeń;
- pojedynczy, agresywny czerwony skaner przeciwnika.

## Zasady oryginalności

- nie kopiujemy Vipera, Raidera, Cylona, DRADIS-u ani emblematów frakcji;
- czerwony skaner jest ogólnym motywem sensorycznym i otrzyma własny kształt oraz rytm animacji;
- interfejs będzie własnym wojskowym systemem telemetrycznym;
- muzyka może być perkusyjna i napięta, ale nie może naśladować melodii ani aranżacji serialu.

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
