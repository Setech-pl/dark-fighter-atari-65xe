# ADR-002: hybrydowy ekran ANTIC 4 i Player/Missile Graphics

Status: zaakceptowane

## Kontekst

Zaakceptowany koncept ekranu łączy nieruchomy HUD, przewijane konstrukcje boczne, pole gwiazd, kilka statków oraz pociski. Bezpośrednia bitmapa byłaby kosztowna pamięciowo i utrudniałaby płynne przewijanie na Atari 65XE.

## Decyzja

- HUD, gwiazdy i konstrukcje korytarza używają ANTIC mode 4 z własnym zestawem znaków w RAM.
- Tło ma efektywną szerokość 160 color clocks i paletę: czerń, chłodna biel, stalowy granat, bursztyn oraz przełączany czerwony akcent.
- Player 0 i Player 3 składają się na statek gracza.
- Player 1 i Player 2 składają się na przeciwnika oraz jego ruchomy czerwony sensor.
- Missile 0 pozostaje wyłącznie zarezerwowane dla broni gracza. Bieżący
  żółty burst korzysta z przywracanych glifów ANTIC 4, aby nie dziedziczyć
  białego `COLPM0` Vipera i nie ograniczać go do jednego strzału.
- Kolejne statki przeciwnika będą multipleksowane albo realizowane znakami dopiero po pomiarze czasu i testach kolizji na sprzęcie.

## Konsekwencje

Ekran zachowuje język wizualny konceptu bez przechowywania pełnej bitmapy. Ograniczona liczba PMG oznacza, że liczba niezależnych, wielokolorowych obiektów nie może być przeniesiona z konceptu dosłownie. W zamian otrzymujemy sprzętowe kolizje, stabilne sylwetki i realny budżet na 50 FPS PAL.
