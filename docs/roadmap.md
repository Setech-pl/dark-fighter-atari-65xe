# Dark Fighter — roadmap implementacji

Roadmap prowadzi od zaakceptowanego vertical slice do kompletnej gry opisanej
w `docs/game-design.md`. Każdy kamień milowy ma pozostać mały, reviewable,
budowalny i możliwy do sprawdzenia na stockowym Atari 65XE PAL. Nie ma tu
terminów kalendarzowych.

## Obowiązkowa karta dowodów

Raport implementacyjny dla **każdego** kamienia milowego musi podać, względem
poprzedniego zaakceptowanego builda:

- delta rozmiaru kodu;
- delta rozmiaru danych;
- delta użycia zero page;
- zmiany alokacji PMG;
- trwałe użycie RAM;
- przejściowe użycie RAM;
- przybliżony pesymistyczny koszt głównej pętli;
- przybliżony pesymistyczny koszt VBI i DLI;
- maksymalną liczbę jednocześnie aktywnych obiektów;
- zmianę rozmiaru XEX i ATR;
- potwierdzenie, że praca dla 50 FPS PAL pozostaje deterministyczna
  i ograniczona.

Nieznanego kosztu nie wolno zastępować wymyśloną liczbą. Najpierw powstaje
bramka pomiarowa, a dopiero potem akceptacja. Zmiana zarezerwowanego zakresu
pamięci wymaga w tym samym change'u aktualizacji `docs/memory-map.md`.
Pojemność ATR, limit boot payloadu, resident RAM, pamięć przejściowa loadera,
PMG, pamięć obrazu, charset i zero page mają być raportowane osobno.

## 1. Zaakceptowany vertical slice i loader ANTIC F — ukończone

### Zakres

- przenośny build ca65/ld65;
- samowystarczalne XEX i bootowalny ATR;
- techniczny gameplay ANTIC 4 z joystickiem, FIRE, jednym przeciwnikiem,
  kolizją, wynikiem, przewijaniem i POKEY;
- zaakceptowany loader ANTIC F 320×192, PackBits, dwa LMS, dwa DLI i dokładnie
  250 pełnych ramek PAL;
- czyste przejście z loadera do gameplayu bez kosztu loadera w gameplayowej
  pętli lub VBI.

### Zależności

Brak; to istniejąca podstawa.

### Kryteria akceptacji

- build i 23 testy przechodzą;
- preview gameplayu i loadera jest deterministyczny;
- XEX/ATR przechodzą walidację;
- zachowane są decyzje ADR-001, ADR-002 i ADR-003;
- loader nie jest utrzymywany w alternatywnym wariancie ANTIC 4.

### Dowody pamięci i wydajności

Pełna karta dowodów obowiązuje także dla każdej przyszłej korekty tego
kamienia. Zaakceptowany build ma payload 6193 B, 49 boot sectors, 27 B zero
page, aktywne PMG od `$3B00`, bitmapę przejściową 7680 B i strumień PackBits
3370 B. Przewijanie tła ma już udokumentowane przybliżenie około 19 000 cykli
raz na cztery ramki; pozostałe ścieżki gameplayu nadal wymagają pełnego
pomiaru przed rozbudową.

### Wykluczenia

Nie są jeszcze zaimplementowane: hull percentage, zniszczenie gracza, game
over, fale, sektory capital ships, debris, repair drone, broadside i boss.

## 2. Audyt budżetu gameplayu i data-driven entity foundations — następne

### Zakres

- zmierzenie rzeczywistego resident i reclaimable RAM po przejściu loadera;
- rozdzielenie budżetów kodu, danych, obrazu, charsetu, PMG, zero page
  i przejściowych buforów;
- stała, mała pula slotów encji z jawnym typem, stanem aktywności, pozycją,
  prędkością i flagami;
- format deskryptora zachowania oraz małych tabel danych bez wdrażania nowej
  rozgrywki;
- narzędziowy lub testowy sposób raportowania limitów i przepełnienia slotów.

To jest **następna funkcja do implementacji** po zatwierdzeniu bieżącej
dokumentacji.

### Zależności

Kamień 1 oraz aktualne map, labels i memory map.

### Kryteria akceptacji

- dokumentowany audyt nie nazywa 719-bajtowego gapu przed `$3B00` całkowitą
  wolną pamięcią maszyny;
- sloty mają stały, wymuszony limit i deterministyczną inicjalizację;
- brak aktywnej encji zachowuje się identycznie jak zaakceptowany vertical
  slice albo testowana ścieżka compatibility jest jawna;
- przepełnienie puli jest bezpieczne i testowalne;
- stały seed daje powtarzalny stan testowy;
- build, test, preview, verify i ścieżka real-hardware pozostają aktywne.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz: bajty na slot, liczba slotów, koszt pełnego skanu
wszystkich slotów, koszt aktywacji/dezaktywacji, wielkość deskryptorów i
oddzielne zestawienie pamięci odzyskiwanej po loaderze. Raport ma wskazać
niezmierzone koszty jako bramki, nie szacunki udające pomiar.

### Wykluczenia

Bez nowych enemies, health, debris, repair drone, capital ships, broadside,
nowych grafik, nowych pocisków, level loadera i overlayów.

## 3. Hull percentage, obrażenia, zniszczenie, game over i restart

### Zakres

- stan kadłuba 0–100% i liczbowy `HULL nn%` w HUD;
- data-driven damage dla istniejących i testowych źródeł trafień;
- stan zniszczenia gracza, game over i deterministyczny restart;
- rozdzielenie aktywnej gry od animacji/odliczania zniszczenia;
- zachowanie startu oraz przejść maszyny stanów.

### Zależności

Kamienie 1–2 i zaakceptowany format player/entity state.

### Kryteria akceptacji

- zwykłe trafienie obniża hull, 0% niszczy Vipera;
- HUD nie używa obowiązkowego paska graficznego;
- po zniszczeniu input i kolizje nie działają jak podczas active play;
- restart zeruje cały wymagany stan, score i latch'e sprzętowe;
- wielokrotny restart nie degraduje pamięci ani timingu.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz koszt najgorszej ścieżki trafienia, przejścia stanów,
przerysowania HUD-u i jednorazowego restartu. Koszt setup/restart ma być
oddzielony od visible-frame cost.

### Wykluczenia

Bez debris instant-kill, repair drone, nowych archetypów, fal, sektorów capital
ships, broadside, bossa i pauzy.

## 4. Deskryptory przeciwników i pierwsze cztery zachowania

### Zakres

- data-driven enemy descriptors;
- Scout, Interceptor, Line fighter i Hunter jako pierwsze cztery zachowania;
- współdzielone sylwetki oraz parametry prędkości, ognia, odporności, kolizji
  i punktów;
- ograniczona pula enemy/projectile slots;
- spójne przekazanie obrażeń i score do systemów z kamienia 3.

### Zależności

Kamienie 2–3.

### Kryteria akceptacji

- cztery zachowania wybierane są deskryptorem, a nie kopiami całej logiki;
- stały seed odtwarza ruch i strzały;
- każdy typ ma czytelne telegraphing i granice pozycji;
- limit aktywnych wrogów i pocisków nie może zostać przekroczony;
- dzielenie bazowych sylwetek nie zmniejsza czytelności ról.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz bajty na descriptor i instancję, rozmiar tablic ruchu,
koszt każdego zachowania, pesymistyczny koszt wszystkich aktywnych enemies
i projectiles oraz koszt software'owych i sprzętowych testów kolizji.

### Wykluczenia

Bez Minelayera, Rammera, Heavy fightera, Ace'a, pełnych formacji, debris,
repair drone, capital ships i broadside. Nie powstaje osiem osobnych zestawów
sprite'ów.

## 5. Proceduralne formacje i level wave tables

### Zakres

- kompaktowe deskryptory formacji;
- formacje początkowe: column, wedge, paired split i co najmniej jeden wariant
  ruchu wykorzystujący istniejące zachowania;
- level wave tables określające zestaw przeciwników, intensywność, ogień
  i dozwolone warianty;
- odtwarzalne testy całych fal ze stałym seedem;
- kontroler fal centralizujący spawn zamiast rozproszonej losowości.

### Zależności

Kamień 4.

### Kryteria akceptacji

- żadna formacja nie przechowuje współrzędnych klatka po klatce;
- powtórzenie poziomu zachowuje jego klasę trudności;
- warianty zmieniają tylko dozwolone offsety, timing, kierunek lub ścieżkę;
- fala respektuje limit slotów i nie tworzy obiektów poza czytelnym wejściem;
- błędny descriptor zostaje odrzucony przez build lub test.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz bajty na formację i poziom, maksymalna długość tabeli,
koszt spawn ticku, koszt najgorszej formacji i maksymalna liczba jednoczesnych
enemies/projectiles.

### Wykluczenia

Bez debris, repair drone, min, sektorów capital ships, broadside, zaawansowanych
archetypów i skryptów per-frame.

## 6. Debris, safe paths i wybór repair drone

### Zakres

- klasy debris, w tym duże obiekty powodujące natychmiastowe zniszczenie;
- ograniczony generator z co najmniej jedną osiągalną trasą;
- repair drone/pod: zebranie daje dokładnie +20 punktów procentowych do 100%;
- zestrzelenie repair object daje punkty i wyklucza naprawę;
- pierwsze reguły cooldown/exclusion dla zdarzeń hazard i repair.

### Zależności

Kamienie 3 i 5; znane ograniczenia ruchu Vipera z bieżącej implementacji.

### Kryteria akceptacji

- automatyczne testy wielu seedów nie znajdują układu bez osiągalnej trasy;
- safe-path uwzględnia rzeczywistą prędkość oraz granice ruchu Vipera;
- duży debris ignoruje dodatni hull i przechodzi do zniszczenia;
- +20%, cap 100%, bonus za zestrzelenie i brak naprawy po zniszczeniu są
  przetestowane;
- repair object jest natychmiast czytelny bez symbolu ziemskiej apteczki.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz koszt generatora, częstotliwość jego wywołania,
złożoność safe-path check, liczba hazard/repair slots i najgorszy koszt
kolizji z pełną pulą. Jednorazowe tworzenie układu ma być oddzielone od kosztu
każdej widocznej ramki.

### Wykluczenia

Bez min, capital ships, broadside, advanced enemies i dodatkowych power-upów.
Safe path nie może być ręcznie zakodowaną długą sekwencją klatek.

## 7. Naprzemienne sektory open space i capital-ship corridor

### Zakres

- jawny sector controller z dwoma stanami środowiska;
- zmienne czasy trwania ograniczone do 2250 ramek PAL;
- osobne stany zapowiedzi, wejścia, active i wyjścia;
- encounter director wybierający tylko zdarzenia dozwolone w bieżącym stanie;
- prototyp czytelności hipotezy `8 + 24 + 8`.

### Zależności

Kamienie 5–6 oraz ustabilizowane event exclusions.

### Kryteria akceptacji

- żaden sektor nie przekracza 45 sekund;
- testy graniczne potwierdzają licznik 2250 ramek bez overflow;
- capital ships nie pojawiają się ani nie znikają w jednej klatce;
- przejście nie resetuje przypadkowo player state, hull ani score;
- układ `8 + 24 + 8` zostaje zaakceptowany albo jawnie skorygowany po teście,
  bez traktowania go jak kontraktu sprzętowego.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz bajty sector/director state, koszt ticku w każdym
stanie, koszt przejścia jako setup/transient work i wpływ różnej szerokości
korytarza na liczbę obiektów oraz kolizje.

### Wykluczenia

Bez finalnych hull tiles capital ships, broadside, trafień kadłuba, weapon
batteries, advanced enemies i mid-game disk access.

## 8. Przewijane side-hull segments i przejścia visual

### Zakres

- character-mode Battlestar segments po lewej;
- character-mode Cylon capital-ship segments po prawej;
- normal, damaged, burning, weapon, muzzle-flash i impact states jako
  współdzielone lub komponowane segmenty;
- przewijane wejście/wyjście zsynchronizowane z sector controller;
- source assets i deterministyczna konwersja/podgląd.

### Zależności

Kamień 7 i wynik testu układu korytarza.

### Kryteria akceptacji

- strony i frakcje pozostają czytelne na realnym sygnale PAL;
- segmenty nie nadpisują HUD-u ani aktywnych PMG;
- normal/damaged/burning różnią się bez polegania na pojedynczym niestabilnym
  kolorze;
- przejście nie pokazuje nieprzygotowanej pamięci obrazu;
- źródła assetów pozostają edytowalne i wersjonowane.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz liczba znaków/tiles, charset pressure, rozmiar map
segmentów, koszt przewijania najgorszej ramki, częstotliwość aktualizacji
animacji i ewentualny koszt DLI. PMG pozostaje osobnym, jawnym budżetem.

### Wykluczenia

Bez aktywnego broadside damage, crossfire, destructible batteries i bossa.
Capital hulls nie są implementowane głównie jako PMG.

## 9. Broadside, crossfire i trafienia kadłubów

### Zakres

- capital-ship controller dla czasowych salw;
- heavy projectile slots i czytelne linie ognia;
- wspólne collision/damage resolution dla Vipera, Cylon fighters
  i przeciwnego capital ship;
- brak faction immunity;
- impact states i możliwość zwabienia przeciwnika w ogień burtowy.

### Zależności

Kamienie 7–8 oraz istniejący model obrażeń.

### Kryteria akceptacji

- identyczny ciężki pocisk może trafić każdy dozwolony cel na swojej trasie;
- wynik zależy od danych kolizji, nie od przypadkowej kolejności procedur;
- ostrzeżenie pozostawia osiągalną reakcję;
- cooldown/exclusion nie pozwala broadside zablokować jedynej drogi ucieczki;
- trafienie przeciwnego kadłuba kończy pocisk i uruchamia właściwy impact
  state.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz limit heavy shots, koszt pełnej macierzy kolizji,
koszt broadside warning/salvo, liczba jednoczesnych impact effects i osobny
pomiar najgorszego zbiegu fali, debris oraz salwy.

### Wykluczenia

Bez destructible weapon batteries jako wymagania, advanced enemies, bossa,
overlayów i ładowania sektorów z dysku.

## 10. Zaawansowani enemies: Minelayer, Rammer, Heavy i Ace

### Zakres

- Minelayer z ograniczoną liczbą persistent hazards;
- Rammer z czytelnym telegraphingiem i bez nieuniknionej szarży;
- Heavy assault fighter z większą odpornością i krótką serią;
- Ace/command fighter łączący istniejące zachowania jako miniboss;
- nowe exclusion rules w encounter director.

### Zależności

Kamienie 4–6 i 9; wspólny model encji, pocisków, obrażeń i eventów.

### Kryteria akceptacji

- nowe typy są deskryptorami/współdzielonymi zachowaniami, nie osobnymi
  silnikami;
- miny mają wymuszony limit i bezpieczne wygaszanie;
- telegraph Rammera zapewnia osiągalną reakcję;
- short burst Heavy respektuje projectile limit;
- Ace pozostaje powtarzalny ze stałym seedem i nie omija reguł dyrektora.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz koszt każdego zachowania, maksymalna liczba min,
bullets i enemies, deskryptor delta, najgorsza kombinacja aktywnych typów
oraz koszt ich kolizji i telegraph effects.

### Wykluczenia

Bez wymogu czterech nowych pełnych sprite sets, bez nieograniczonych min,
loadable mission packages i dodatkowych power-upów.

## 11. Boss lub objective capital ship

### Zakres

- co najmniej jeden boss albo wieloetapowy cel związany z capital ship;
- fazy zapisane kompaktowymi deskryptorami i współdzielonymi zachowaniami;
- wybrane cele, na przykład baterie, mogą przyznawać score;
- pełne przejście do zakończenia celu i dalszego stanu gry.

### Zależności

Kamienie 8–10.

### Kryteria akceptacji

- fazy są deterministyczne, ograniczone i testowalne;
- cel nie wymaga długiego skryptu współrzędnych per-frame;
- wszystkie collision/damage paths używają wspólnego resolvera;
- encounter director wyłącza kombinacje niezgodne z fazą;
- ukończenie, porażka i restart nie pozostawiają aktywnych obiektów.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz rozmiar danych faz, resident asset pressure, limity
celów/projectiles/effects, najgorszy koszt aktywnej fazy i jednorazowych
przejść. Jeżeli pojawi się presja pamięci, najpierw powstaje pomiar; ten kamień
nie upoważnia automatycznie do overlayów.

### Wykluczenia

Bez spekulacyjnego managera overlayów, formatu mission packages, relokacji,
save state i level-loader API. Destructible batteries poza potrzebą wybranego
celu pozostają backlogiem.

## 12. Audio, balans, long-duration i real-hardware release validation

### Zakres

- docelowe, nowo stworzone audio POKEY i pełny zestaw potrzebnych SFX;
- strojenie damage, score, fal, eventów i sector durations;
- długotrwałe testy seedów, restartów i granic liczników;
- testy emulatorów oraz prawdziwego 65XE PAL przez SIO2SD;
- finalne XEX, ATR, źródła, dokumentacja i checksums.

### Zależności

Kamienie 1–11.

### Kryteria akceptacji

- stabilne 50 FPS PAL w najgorszych zatwierdzonych kombinacjach;
- brak nieuniknionych układów w zdefiniowanym korpusie seedów;
- wielokrotne level/state transitions i restarty nie powodują wycieku stanu;
- audio nie narusza widocznej ramki ani sterowania;
- XEX, bootowalny ATR i SIO2SD działają zgodnie z instrukcją;
- zachowane są niekomercyjny charakter fan-artu i oryginalność wszystkich
  danych projektu.

### Dowody pamięci i wydajności

Pełna karta dowodów w finalnej postaci, tabela maksymalnych konfiguracji
obiektów, pomiary main loop/VBI/DLI, finalny map/labels, wykorzystanie resident
i transient RAM, XEX/ATR sizes, hashes oraz zapis testu real hardware.

### Wykluczenia

Opcjonalny mnożnik no-damage, ofensywny power-up, pauza, dalszy polish loadera
i loadable content modules nie blokują wydania. Nie dodajemy funkcji
wyłącznie po to, aby zużyć wolne miejsce ATR.
