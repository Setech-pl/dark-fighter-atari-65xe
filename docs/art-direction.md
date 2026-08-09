# Dark Fighter — kierunek artystyczny

## Rdzeń stylu

Dark Fighter ma wyglądać jak wojna prowadzona przez maszyny naprawiane,
łatane i ponownie wysyłane do walki. To zużyte, wojskowe dark science-fiction,
a nie czysta i kolorowa przyszłość. Najważniejsze skojarzenia to ciężar,
funkcja, napięcie, ograniczone zasoby i widoczne ślady kolejnych napraw.

Priorytety palety:

- czerń i bardzo ciemny granat dla przestrzeni oraz negatywnych szczelin;
- przygaszona stal i chłodna biel dla Vipera oraz strony Battlestara;
- ciemne, chłodne szarości dla Cylon capital ship;
- pomarańcz i bursztyn dla silników, ciężkich pocisków, ognia i damage;
- oszczędny, agresywny czerwony dla sensorów i akcentów Cylonów;
- wysoki kontrast gameplayu ważniejszy niż lokalna zgodność koloru z dużą
  ilustracją referencyjną.

## Fan-art BSG i oryginalność wykonania

Dark Fighter jest nieoficjalnym, hobbystycznym i niekomercyjnym fan-artem
`Battlestar Galactica`. Właściciel projektu dopuścił użycie świata BSG,
statków, nazw, frakcji, oznaczeń, lore, odniesień UI i motywów muzycznych.
Projekt nie sugeruje oficjalnego związku ani poparcia właścicieli marki.
Dostarczonych i zaakceptowanych odniesień BSG nie należy po cichu zastępować
innym uniwersum.

Jednocześnie każda grafika Atari, konwersja, animacja, aranżacja, muzyka,
efekt i fragment kodu powstaje od nowa dla Dark Fighter. Nie kopiujemy muzyki,
układów UI, grafik źródłowych ani danych binarnych z istniejących gier lub
produkcji BSG. Odniesienie definiuje temat i tożsamość, nie dostarcza danych do
wycięcia lub przepisania.

## Czytelność na Atari

Każdy obiekt przechodzi test sylwetki w docelowej rozdzielczości i na
analogowym obrazie PAL. Detal ma wynikać z ruchu, kontrastu, animacji,
char-mode oraz oszczędnego nakładania PMG, a nie z pojedynczych pikseli
widocznych tylko na powiększonym PNG.

Bieżące PMG są w całości zajęte przez Vipera z silnikiem oraz jednego wroga ze
skanerem; Missile 0 jest pociskiem gracza. To potwierdzony stan vertical slice,
nie obietnica dowolnej liczby wielokolorowych sprite'ów. Przyszłe użycie
multipleksowania, nakładania players/missiles lub znakowych obiektów wymaga
pomiaru VBI/DLI, kolizji i real hardware.

## Viper

Viper musi być najszybciej rozpoznawalną ruchomą sylwetką:

- jasny, klinowaty kadłub z ciemnym rdzeniem;
- wyraźny kierunek lotu nawet bez koloru;
- oddzielony pomarańczowy lub bursztynowy ślad silnika;
- kształt i hitbox spójne na tyle, aby gracz mógł ocenić przejście obok debris
  i heavy projectile;
- damage feedback czytelny, ale nie zasłaniający bezpiecznej trasy.

## Cylon fighters i role

Cylon fighters mają zachować wspólny język Raiderów: szeroką, symetryczną
sylwetkę, ciemniejszy kadłub i czerwony sensor. Scout, Interceptor, Line
fighter, Hunter, Heavy, Minelayer, Rammer i Ace nie wymagają ośmiu dużych,
unikatowych zestawów sprite'ów.

Role należy rozróżniać tanimi środkami:

- tempem i charakterem ruchu;
- telegraphingiem przed dive, burst lub ram;
- położeniem i rytmem czerwonego sensora;
- jedną klatką attachments albo zmianą obrysu;
- akcentem koloru lub luminancji;
- skalą, formation role i sposobem strzelania.

Współdzielona baza jest pożądana, dopóki test bez ruchu i test w ruchu nadal
pozwalają szybko odróżnić zagrożenia.

## Capital ships i corridor

Battlestar zajmuje lewą stronę, a Cylon capital ship prawą. Oba kadłuby mają
być przede wszystkim przewijanym tłem znakowym, aby PMG pozostało dla
fighters, projectiles, highlights i efektów.

Segmenty powinny dać się składać z małego zestawu:

- **normal armour** — regularne panele, żebra i ciemne szczeliny;
- **damaged armour** — przerwane linie, wgniecenia i odsłonięta konstrukcja;
- **burning armour** — oszczędny, animowany pomarańczowo-bursztynowy ogień;
- **weapon battery** — łatwa do odróżnienia geometria, nawet zanim stanie się
  destructible;
- **muzzle flash** — krótki, jasny sygnał wystrzału;
- **impact state** — lokalny błysk, damage lub ogień po trafieniu.

Lewa i prawa strona muszą być rozróżnialne nie tylko kolorem. Battlestar
powinien czytać się jako warstwowy, żebrowany i wielokrotnie naprawiany;
Cylon capital ship może używać gładszych lub cięższych powtarzalnych mas,
głębokich czarnych przerw i czerwonych akcentów.

Hipoteza `8 + 24 + 8` kolumn jest tylko pierwszym testem kompozycji. Nie należy
przycinać sylwetek lub przestrzeni manewru wyłącznie po to, aby zachować tę
liczbę.

## Broadside i crossfire

Heavy projectiles muszą różnić się od zwykłego ognia myśliwców grubością,
długością, rytmem, kolorem lub poprzedzającym je muzzle flash. Gracz ma
rozpoznać linię ognia dostatecznie wcześnie, aby samemu uniknąć salwy albo
zwabić Cylon fighter.

Czytelność wymaga:

- wyraźnego początku po stronie strzelającego capital ship;
- spójnego toru przez corridor;
- odróżnienia pocisku aktywnego od impact effect;
- takiej samej wiarygodności trafienia Vipera, Cylon fightera i przeciwnego
  kadłuba;
- ograniczenia liczby jednoczesnych błysków, aby nie zamieniły ekranu w szum.

## Debris

Klasy debris mają różne sylwetki, a nie tylko różny kolor:

- płaskie armour plates;
- nieregularne fighter remains;
- otwarte framework sections;
- masywne, wolno obracające się wreckage.

Duży debris natychmiast niszczy Vipera, więc jego rozmiar i zagrożenie muszą
być bezbłędnie czytelne. Animacja obrotu może używać małej liczby klatek lub
zmian znaków, ale nie może powodować mylącej zmiany hitboxu.

## Repair drone

Repair object ma wyglądać jak wojskowy drone lub pod: zwarta techniczna
sylwetka, czytelny sygnał funkcji i kontrast od debris oraz enemy fire.
Nie używa czerwonego krzyża ani dosłownej ziemskiej apteczki. Musi być równie
łatwy do rozpoznania jako obiekt do zebrania i jako cel dający bonus za
zestrzelenie.

## HUD i obecny ekran referencyjny

`assets/graphics/dark-fighter-screen-concept-v1.png` pozostaje zaakceptowanym
wzorcem kompozycji pierwszego gameplay screen: jednowierszowy HUD, czarna
przestrzeń lotu, stalowo-granatowe struktury, jasny Viper, blade Cylon fighters
i oszczędne weapon accents.

Bieżący Atari vertical slice nadal pokazuje techniczne napisy `FUEL`, `ARM`
i `LIFE`. Nie zatwierdzają one tych mechanik. Docelowy HUD pokazuje wynik
i liczbowy `HULL nn%`; dokładny układ pozostałych pól zostanie przetestowany
bez kopiowania UI istniejących produkcji BSG. Graficzny health bar pozostaje
opcjonalnym testem, nie równoległym wymaganiem.

PNG nie ustala rozdzielczości, liczby PMG ani zagęszczenia obiektów. Te wartości
są adaptowane do ANTIC/GTIA, budżetu PMG i jednej ramki PAL.

## Main menu i frontend

`assets/graphics/mainmenu.png` jest zatwierdzoną referencją wyłącznie dla
kompozycji, proporcji, atmosfery i hierarchii koloru. Atari menu nie skaluje,
nie trasuje i nie osadza tego PNG. Nie przejmuje z niego `BSG 75`, insygniów,
typografii, dokładnej sylwetki statku ani geometrii hangaru.

Bieżąca, oryginalna interpretacja miesza tryby znakowe według ich mocnych
stron:

- wyśrodkowanego `DARK FIGHTER` w 20-kolumnowym ANTIC 7, z czystym fontem
  6×7 i podwojoną wysokością;
- kątowych, stalowo-niebieskich warstw hangaru po lewej;
- istniejącego autorskiego `player_shape` z bursztynowym
  `player_engine_shape` jako statycznego, dwuwarstwowego PMG w hangarze;
- czterech czytelnych opcji ANTIC 6 ustawionych pionowo po prawej;
- kilku deterministycznych gwiazd i dużych czarnych przerw;
- nasyconego akcentu `$D8` dla markera i całego aktywnego napisu;
- oszczędnego czerwonego światła identyfikacyjnego bez oznaczeń BSG.
- neutralnego, białego hintu `UP/DOWN MOVE  FIRE SELECT` w ANTIC 2.

`SETECH GAME STUDIO` nie występuje w main menu; pozostaje częścią loadera.
Wiersze ANTIC 4 zachowują hangar, gwiazdy i dekoracje, a czarne odstępy
porządkują title, scenę, menu oraz hint bez dekoracyjnego przeliczania per-frame.

Menu główne może czasowo używać P0, P2 i P3, ponieważ nie wykonuje gameplayu.
Ekrany podrzędne wyłączają PMG, a wejście do gameplayu czyści cały obszar i
odtwarza zaakceptowane rozmiary oraz paletę obiektów.

## Zaakceptowany loader

Loader zachowuje zaakceptowaną geometrię i używa bitmapy mieszanej: ANTIC F
320 px dla tytułu i statku oraz ANTIC E 160 px dla podpisu studia, z:

- czarnym tłem;
- kremowym tytułem;
- stalowo-szarą Galactiką skierowaną w prawo;
- trzema oddzielnymi zespołami napędowymi;
- oznaczeniem `BSG`;
- zielonym `SETECH GAME STUDIO`;
- trzema strefami koloru utworzonymi przez dwa DLI.

Atari-native source znajduje się w `assets/graphics/loader-bitmap.json`,
a `assets/graphics/loader.png` pozostaje wysokorozdzielczą referencją
kompozycji. Strefy statku świadomie oddają półtony ditheringiem,
panelami, żebrami i czarnymi szczelinami. Loader nie ma wspieranego wariantu
ANTIC 4 i nie jest modyfikowany podczas prac nad gameplayem.

Poprawa litery `S` w `BSG`, wygładzenie jagged edges, mocniejsze negative gaps
oraz pomarańczowy PMG engine exhaust należą wyłącznie do niskopriorytetowego
visual-polish backlogu.
