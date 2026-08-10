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

Bieżąca implementacja używa neutralnych nazw `allied_line_hull` po lewej i
`enemy_void_hull` po prawej. Oba kadłuby są przewijanym tłem znakowym ANTIC 4;
nie zużywają PMG ani DLI. Bazowy, nieoczywisty moduł ma 32 wiersze, nominalny
podział wynosi `8 + 24 + 8`, a wylot kompletnej baterii może wejść o jedną
komórkę do korytarza. Aktualna geometria pozostawia co najmniej 23 wolne
komórki w każdym wierszu. Każda strona ma siedem cyklicznych przejść
głębokości 5/6/7/8, skupionych w odcinkach po 2–8 wierszy zamiast
jednowierszowego zygzakowania. Dwa lokalne cofnięcia o jedną komórkę dają
około 12,5% nominalnej szerokości pasa dodatkowej zmiany profilu, czyli
najbliższe siatce znakowej wykonanie żądanego około 10%, bez poszerzenia całej
ściany. Fazy zmian lewej i prawej strony są różne.

Jasny kadłub sojuszniczy używa warstwowych stalowo-niebieskich płyt,
chłodnobiałych krawędzi, pionowych grooves, wnęk, napraw i nielicznych
bursztynowych detali. Około 80% zajętej powierzchni pikselowej wybiera stalowy
`COLPF1`. Jego duże baterie składają się z szerokiej podstawy, obudowy,
dwóch grubych pasów lufy i wysuniętego wylotu. Ciemniejszy kadłub przeciwnika
używa D7=1: jego piksele `11` trafiają do `COLPF3=$44`, a `10` pozostają
stalowymi krawędziami. W zajętej powierzchni kandydat ma około 69% burgundu,
10% stali i 21% czarnych trenches; bieli używa poniżej 1%. Jego baterie są
węższe i bardziej zintegrowane z poszyciem. Mapy, sylwetki i główne struktury
broni nie są lustrzanymi odbiciami.

Pełny sektor układa te powierzchnie w dwa różne okręty i pokazuje je od rufy
do dziobu: odmienne 32-wierszowe banki silników, 24-wierszowe aft machinery,
128-wierszowy combat midsection, forward reinforcement i osobne prows z
konwergentnymi pasami. Moduły mają po 8 wierszy, więc duże formy zmieniają rytm
bez drobnego proceduralnego szumu. Lewa rufa ma dwa masywne, oddzielone
armoured spine rdzenie, prawa dwa szersze i bardziej regularne apertures;
energia jest odpowiednio stalowo-biała i bursztynowo-biała. Każdy rdzeń jest
ciągłym polem bez checkerboardu i comb stripes, rozszerza się w wielokomórkową
obudowę, kończy przed AFT i pulsuje w trzech fazach po 8 ramek przez charset,
nie PMG. Końcowe prows używają 32-bajtowych profili zajętości i częściowych
glifów krawędzi: ciężki lewy wedge oraz rozdzielony w środku prawy spear
schodzą z 8 do 1 komórki, a ostatnia komórka ma rzeczywisty ukośny kontur
zamiast płaskiego odcięcia. Stały offset +8 wierszy zapobiega lustrzanemu
wejściu struktur, lecz obie strony pozostają jednym fizycznym strumieniem.

Zwykły Cylon fighter P1/P2 jest podwójnej szerokości i ma 16 jednostek HPOS
widocznej obwiedni. Jego wspólne granice to `80..160`: przy minimum zajmuje
`[80,96)`, przy maksimum `[160,176)`, dokładnie wewnątrz corridor `[80,176)`.
Spawn, steering i ostateczny zapis HPOSP1/HPOSP2 używają tych samych stałych;
nie istnieje zwykła klatka lotu, w której fighter nachodzi na side hull.

Dominująca płyta strony sojuszniczej zajmuje 2–4 komórki szerokości i 3–6
wierszy wysokości. Staggered horizontal seams, czarne grooves i białe lips
oddzielają ją od sąsiedniej płyty; vent lub bursztynowy service point pojawia
się tylko wyjątkowo. Strona przeciwnika nie używa diagonalnej siatki: jej
czarne wnętrza są ograniczone długimi pionowymi ribs i szerokimi burgundowymi
slabami. Czerwień stanowi główną masę pancerza, lecz jawne glyphs trench/void,
offset buttresses i niejednakowy kontur zapobiegają powstaniu jednolitego
czerwonego prostokąta.

Późniejsze stany powinny dać się składać z małego zestawu:

- **normal armour** — regularne panele, żebra i ciemne szczeliny;
- **damaged armour** — przerwane linie, wgniecenia i odsłonięta konstrukcja;
- **burning armour** — oszczędny, animowany pomarańczowo-bursztynowy ogień;
- **weapon battery** — łatwa do odróżnienia geometria, nawet zanim stanie się
  destructible;
- **muzzle flash** — krótki, jasny sygnał wystrzału;
- **impact state** — lokalny błysk, damage lub ogień po trafieniu.

Kontrast stron musi pozostać czytelny również na monochromatycznym zdjęciu
ekranu. Układ `8 + 24 + 8` jest przyjętą geometrią tej bazy wizualnej, nie
ogólnym kontraktem dla wszystkich późniejszych poziomów. Każda przyszła
zmiana musi ponownie przejść test czytelności, szerokości i osiągalnej trasy.

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

Bieżąca implementacja realizuje tę bazę bez zmiany zaakceptowanej grafiki
kadłubów. Warning jest widoczny przez wszystkie 25 ramek: przez 8 ramek ma
2 scanlines i normalną szerokość, przez 9 ramek 4 scanlines i double width,
a przez ostatnie 8 ramek 6 scanlines oraz dwuramkowy puls double/quad. Rośnie
od wylotu w stronę corridor i kończy się bez skoku względem przyszłego toru.
Lecący slug pulsuje co dwie ramki między zwartą sylwetką 3 scanlines i pełną
4 scanlines, zachowuje podwójną szerokość GTIA i przesuwa się o 2 jednostki
HPOS na ramkę. Jego fizyczna obwiednia nie przekracza wcześniejszych 4 linii.
Na launch czteroramkowy glif flash łączy realny wylot z pociskiem i pozostaje
przy wolniejszym strumieniu kadłuba; sam slug natychmiast przechodzi na ruch
ekranowy. Impact wykorzystuje ten sam slot, rozszerza wysokość
do 8 scanlines i trwa 5 ramek. M1, M2 i M3 zachowują
rzeczywiste odziedziczone kolory P1/P2/P3: odpowiednio chłodną biel, hostile
red i amber. Nie powstaje sztuczny, jaśniejszy kolor tylko dla preview.
Animacja nie zapisuje `COLPM`, dzięki czemu dzielone z M1–M3 warstwy fighterów
nie zmieniają koloru.

Trafienie przeciwnego capital hull uruchamia osobny, niekolizyjny overlay
3×3 znaków. Przez 24 ramki przechodzi od białobursztynowego core przez
dominujące czerwone rozszerzenie i nieregularny fireball do ciemnych embers.
Efekt zapisuje tylko komórki rzeczywistego bandu kadłuba, podąża za jego
scrollingiem i przywraca dokładnie przechwycony moduł; nie zużywa M0–M3 ani
nie zmienia kolorów fighterów.

Pełny skok zawsze ma 8 scanlines, bez fine scrollingu. Centralny świat
wykonuje dokładnie 8/9/10 takich skoków w 20 ramkach: `EASY` daje 20 wierszy
lub 160 scanlines/s, `MEDIUM` 22,5/180, a `HARD` 25/200. Osobny stream obu
capital hulls używa mianownika 40, więc w długim oknie zachowuje dokładnie
połowę tych prędkości: 10/80, 11,25/90 i 12,5/100. Wyloty, warningi i granice
kontaktowe pozostają przy tej wolniejszej fazie; statki, gwiazdy i lecące
pociski zachowują dotychczasową energię świata.
Skalę obu capital ships podkreślają rzadsze, niezależnie planowane sekwencje
ognia i spokojne odstępy między nimi, nie spowolnienie całego świata. Fizyczna
krawędź, łącznie z projekcjami turretów, jest też granicą kontaktu gracza.
Clamp utrzymuje obie warstwy Vipera razem i uruchamia istniejący damage flash.

Każdy 32-wierszowy moduł combat zawiera jedną funkcjonalną, wielokomórkową
baterię na stronę, z wierszami allied 8 i enemy 12 celowo przesuniętymi
względem siebie. Prow, forward, aft i engines nie mają funkcjonalnych dział,
a ostatnie 8 wierszy combat ma margines shutdown. Usunięte stanowiska są
zastąpione płytami, wnękami, żebrami i detalem
serwisowym bez glifu wylotu, aby nie sugerować nieaktywnej broni. Firing event
wybiera najstarszy bezpieczny widoczny emplacement danej strony; wymagany jest
pełny 25-ramkowy warning oraz jeden wiersz marginesu przed wyjściem ze strefy.

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

Bieżący Atari vertical slice pokazuje techniczne napisy `SCORE`, `FUEL`, `ARM`
i `LIFE` jako prawdziwy, monochromatyczny tekst ANTIC 2 z dedykowanego fontu
6×7. Dwa górne wiersze są odseparowane od kolorowego ANTIC 4 playfieldu;
dynamiczne score i trzy cyfry zdrowia pozostają kodami znaków, nie PMG ani
bitmapowym ornamentem. Te tymczasowe etykiety nie zatwierdzają jeszcze
mechanik paliwa i uzbrojenia. Docelowe nazewnictwo `HULL nn%` oraz układ
pozostałych pól będą osobnym testem UI. Graficzny health bar pozostaje
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
