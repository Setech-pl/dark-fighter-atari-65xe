# Dark Fighter — kanoniczny projekt gry

Ten dokument jest źródłem prawdy dla docelowej rozgrywki Dark Fighter.
Opis bieżącej implementacji znajduje się w `docs/architecture.md`, kolejność
prac w `docs/roadmap.md`, a decyzje architektoniczne w `docs/decisions/`.
Sam fakt opisania pomysłu nie oznacza, że jest on już zaimplementowany.

## Statusy decyzji

- **BINDING** — zatwierdzona decyzja właściciela projektu. Implementacja ma ją
  zachować, dopóki właściciel jawnie jej nie zmieni.
- **PLANNED** — zatwierdzony kierunek implementacji, którego szczegóły nadal
  wymagają pomiaru lub iteracji. Nie jest to opis gotowej funkcji.
- **OPTIONAL BACKLOG** — pomysł nieobowiązkowy; nie może blokować pierwszej
  kompletnej wersji.
- **BALANCING DECISION STILL OPEN** — parametr lub wybór celowo pozostawiony do
  testów gry. Nie wolno zamieniać go w ukryte założenie.

## Tożsamość produktu

**BINDING**

- Dark Fighter jest nieoficjalnym, hobbystycznym i niekomercyjnym fan-artem
  `Battlestar Galactica`. Projekt nie jest oficjalnym produktem, nie jest
  powiązany z właścicielami marki i nie sugeruje ich poparcia.
- Gracz pilotuje Vipera i walczy z myśliwcami Cylonów, w tym wariantami
  wywodzącymi się z Raiderów.
- Battlestary, Cylon capital ships i Galactica mogą należeć do scenerii oraz
  rozgrywki.
- Wszystkie grafiki Atari, konwersje, animacje, efekty, aranżacje, muzyka i kod
  powstają od nowa dla tego projektu. Nie kopiujemy układów UI, muzyki, grafik
  źródłowych ani danych binarnych z istniejących gier i produkcji BSG.
- Kierunek wizualny to zużyte, wojskowe dark science-fiction: stalowe kadłuby,
  czarne szczeliny, pomarańczowe silniki i uszkodzenia, czerwone akcenty
  Cylonów, ograniczone zasoby oraz maszyny wielokrotnie naprawiane i odsyłane
  do walki.

## Rdzeń gry

**BINDING**

Dark Fighter jest pionowo przewijaną strzelanką kosmiczną działającą w tempie
50 FPS PAL. Viper stale leci naprzód. Gracz używa joysticka w porcie 1 do ruchu
i jednego przycisku FIRE do strzelania. Podczas kolejnych poziomów:

- omija przeciwników, odłamki, miny, ciężkie pociski i ogień capital ships;
- niszczy Cylon fighters oraz wybrane obiekty pola walki;
- podejmuje ryzyko, aby przetrwać i poprawić wynik;
- traci Vipera po wyzerowaniu kadłuba albo bezpośrednim zderzeniu z dużym
  odłamkiem.

Podstawowa pętla decyzji gracza brzmi: odczytaj zagrożenie, wybierz osiągalną
trasę, ustaw Vipera, zdecyduj czy unikać lub strzelać, a następnie reaguj na
skutek bez przerywania ciągłego lotu.

## Kontrakt rosteru przeciwników

**PLANNED**

| Stabilne ID | Rola | Tożsamość taktyczna | Rodzina broni |
| --- | --- | --- | --- |
| `RAIDER` | Standard fighter | Formation flight i czytelny zigzag attack | Single pulse |
| `TALON` | Fast interceptor | Wąski, szybki diagonal pass | Fast needle bolt |
| `SCYTHE_BOMBER` | Heavy bomber | Powolne lane denial i committed approach | Plasma bomb lub mine |
| `TRIDENT_GUNSHIP` | Heavy gunship | Utrzymuje pozycję i naciska kilka lanes | Three-shot sequence lub fan |
| `WRAITH_SCOUT` | Scout | Feint, blink lub rapid repositioning | Delayed aimed pulse |
| `HUNTER` | Pursuit fighter | Przewiduje pozycję gracza i nurkuje | Aimed burst |
| `LEECH_DRONE` | Swarm drone | Agresywnie domyka małą grupą | Contact attack lub short pulse |
| `AEGIS_ESCORT` | Escort | Chroni high-value unit i zajmuje defensive space | Defensive/intercepting fire |
| `CROWN_RAIDER` | Ace/elite | Feint, retreat i re-entry | Accurate multi-shot burst |
| `HYDRA_CARRIER` | Missile carrier | Pozostaje w dystansie i odpala timed salvos | Slowly steering missiles |

Pass 1 implementuje grafikę i wspólny renderer tylko dla pierwszych trzech
ID. Jedynie `RAIDER` jest aktywny w bieżącym release flow i wybiera przez
deskryptor `WEAPON_SINGLE_PULSE`: 10 damage, dziesięć strzałów co 4 ramki,
prędkość 5 scanlines/rama i pauza 60/50/40 ramek PAL dla EASY/MEDIUM/HARD.
Viper podczas trzymania FIRE emituje 10 żółtych strzałów co 3 ramki,
z prędkością 6 i 12-ramkową pauzą. `TALON` i `SCYTHE_BOMBER` pozostają
review-only z `WEAPON_NONE`. Tabela nie autoryzuje jeszcze AI, broni ani
balansu pozostałych typów.

Boczny ruch Vipera jest wartością odniesienia 100%: 2 HPOS na aktywną ramkę.
Raider przy ciągłym ruchu wykonuje taki sam krok w dokładnie 4 z 5 ramek,
czyli osiąga dokładnie `4/5 = 80%` maksimum Vipera. Soft pursuit, dead zone,
weave i pionowy ruch pozostają bez zmian.

## Model sektorów

**BINDING**

Rozgrywka naprzemiennie przechodzi między dwoma stanami środowiska:

1. otwartą przestrzenią;
2. korytarzem bitwy między przeciwnymi capital ships.

Każdy stan trwa zmienną liczbę ramek, lecz nigdy dłużej niż 2250 pełnych ramek
PAL, czyli 45 sekund. Przejście musi zostać wizualnie zapowiedziane i
przewinięte do lub z widoku. Capital ships nie mogą pojawiać się ani znikać
natychmiast.

**PLANNED**

Pierwszą hipotezą układu korytarza jest `8 + 24 + 8` kolumn znakowych:
około 8 dla Battlestara po lewej, 24 dla walki myśliwców i 8 dla Cylon capital
ship po prawej. To punkt startowy testu czytelności i grywalności, a nie stały
kontrakt sprzętowy.

**BALANCING DECISION STILL OPEN**

Minimalny czas sektora, rozkład długości, prawdopodobieństwo wejścia w sektor
capital ships oraz tempo ostrzeżenia przejścia zostaną wybrane po playtestach.
Nie obowiązuje obecnie żadne minimum.

## Bitwa capital ships

**BINDING**

W sektorze bitwy:

- Battlestar zajmuje lub przewija się wzdłuż lewej strony;
- Cylon capital ship zajmuje lub przewija się wzdłuż prawej strony;
- Viper i Cylon fighters walczą w środkowym korytarzu;
- capital ships okresowo wymieniają ogień burtowy;
- ciężkie pociski przecinają grywalny korytarz;
- ciężki pocisk może trafić Vipera, Cylon fighter albo przeciwny capital ship;
- myśliwiec na linii ognia nie otrzymuje sztucznej odporności swojej frakcji;
- gracz może celowo zwabić przeciwnika na linię ognia capital ship.

Kolizje burtowe mają wynikać z jednej spójnej symulacji, a nie z osobnych
efektów dekoracyjnych dla każdej frakcji.

Pierwsza warstwa tła jest wyłącznie dekoracyjna i deterministyczna. Capital
hulls zachowują 100% kanonicznego world rate `8/9/10 ÷ 20`; near stars używają
dokładnie `1/2`, a far stars `1/4` liczby kroków hull, czyli 50% i 25%.
W broadside obie warstwy istnieją tylko
w środkowym korytarzu i nigdy nie należą do collision, damage, score ani
steering. W `COMPLETE` nowo odsłaniane wiersze wracają do pełnej szerokości;
po dokładnie 22 krokach ringu stan `OPEN` kontynuuje pełnoszeroki starfield bez
resetu broni gracza lub dodatkowej pauzy sektorowej.

Punkty za zniszczenie fightera wynikają z archetypu i jawnego źródła damage.
Pocisk Vipera oraz rzeczywisty contact Vipera dają pełny score nawet, gdy ten
sam contact rani lub zabija gracza. Colonial capital fire niszczy Cylon fighter
bez punktów. Cylon capital fire może zniszczyć własny fighter przez friendly
fire i wtedy daje graczowi pełny score archetypu; trafienie Vipera przez ten
sam pocisk nie daje punktów. Cleanup/despawn/transition nigdy nie punktują.
Nieśmiertelny lub nielethal hit nie punktuje, a jeden living→destroyed transition
może przyznać wynik tylko raz.

Bieżący pierwszy sektor jest skończonym przelotem 240 wierszy na okręt od rufy
do dziobu: `ENGINES 32`, `AFT 24`, `COMBAT 128`, `FORWARD 24`, `PROW 32`. Strony mają
stałe przesunięcie treści o osiem wierszy, lecz wspólne tempo. Funkcjonalne
baterie występują wyłącznie w combat, a jego ostatnie osiem wierszy nie
rozpoczyna nowej salwy. Po zejściu terminalnych tips `DRAIN` pozwala dokończyć
już aktywne warningi, flashes, M1–M3 i 24-ramkowe eksplozje kadłuba. Następnie
`COMPLETE` odbudowuje pełny ring przez 22 kroki i przechodzi do legalnego
otwartego gameplayu `OPEN`. Nie dodaje komunikatu, bonusu ani encounter directora.

**PLANNED**

Kadłuby są przede wszystkim tłem znakowym i używają powtarzalnych,
przewijanych modułów: pancerza, prow, aft machinery, banków silników, baterii
broni i błysku wylotowego. Uszkodzony/płonący pancerz pozostaje planowany.
PMG pozostaje przede
wszystkim dla ruchomych myśliwców, pocisków, akcentów oraz efektów, gdzie daje
największą korzyść.

**OPTIONAL BACKLOG**

Niszczenie pojedynczych baterii broni jest pożądanym późniejszym rozwinięciem,
ale nie należy do pierwszej implementacji sektora capital ships. Jeżeli
zostanie dodane, zniszczenie baterii daje punkty i musi wejść do wspólnego
modelu kolizji oraz uszkodzeń.

## Odłamki

**IMPLEMENTED FOUNDATION**

Pierwszy neutralny obiekt złomu jest przeszkodą testową wspólnego entity
engine, a nie opisaną niżej klasą dużego odłamka. Jednocześnie aktywny jest
najwyżej jeden. Ma dwie czytelne sylwetki 2×1 znak (16×8 pikseli) — zwartą,
asymetryczną płytę pancerza i ażurowy fragment kratownicy — po dwie fazy
tumblingu każda. Cztery fazy używają dokładnie ośmiu glifów 110–117; dwie
fazy fragmentu rozpadu używają 118–119, Rapid Fire używa 120–123, a Spread
Shot 124–127. Gameplay charset nie ma już wolnych glifów.
Płyta i kratownica korzystają z kolorów pola 1/2,
więc nie są białymi odpowiednikami największych gwiazd. Każda faza wypełnia
bounding box 16×8; armour ma 47, a truss 45 aktywnych pikseli ANTIC.
Niezależny RNG entity deterministycznie wybiera sylwetkę, fazę początkową,
profil `straight`/`slight-left`/`slight-right` oraz bezpieczną kolumnę spawnu
18..20. Ten wąski zakres uwzględnia szerokość dwóch komórek i pełne dziewięć
możliwych kroków bocznych do despawnu, więc nie wymaga odbicia od krawędzi.
Debris spawnuje się na Y=24, a Y, faza i ewentualny ruch X zmieniają się
wyłącznie przy prawdziwym `WORLD_ROW_ADVANCED`. Pionowy akumulator wykonuje +8
w trzech z każdych pięciu takich zdarzeń; profile boczne przesuwają obiekt o jeden
znak co cztery takie zdarzenia i nie wymagają odbicia od krawędzi. Kontakt
zdejmuje jedną jednostkę HULL (10 punktów procentowych) przez wspólną damage
gate i usuwa złom tylko wtedy, gdy obrażenie zostało przyjęte; invulnerability
nie zużywa przeszkody. Hitbox obejmuje widoczne 16×8 pikseli. Debris zaczyna
z 3 HP; każdy prawidłowy pocisk Vipera odbiera 1 HP i zostaje zużyty. Pierwsze
dwa trafienia pozostawiają obiekt aktywny oraz pokazują dokładnie dwie klatki
lokalnego żółto-czerwonego feedbacku. Trzecie trafienie usuwa neutralny hitbox
przed testem kontaktu z graczem i tworzy lokalny pięcioklatkowy rdzeń oraz
cztery bezkolizyjne fragmenty na 30 klatek (0,6 s). Fragmenty lecą
deterministycznie lewo-góra, prawo-góra, lewo-dół i prawo-dół, zmieniają dwie
fazy oraz przechodzą od żółtego przez czerwony do migotania. Nie używają RNG
gameplay, nie zadają obrażeń i nie wpływają na wynik, enemy death,
full-screen flash ani SFX. Pociski Raidera i broadside ignorują debris.

Viper shots są rozstrzygane w rosnącej kolejności slotów przed kontaktem debris
z graczem; dlatego w jednej ramce tylko najniższy trafiający slot jest zużyty,
a finalnie zniszczony tuż przed kontaktem debris nie zadaje obrażeń. Przy
wspólnym przecięciu z Raiderem wygrywa pierwszy cel napotkany przez pocisk
lecący w górę, a dokładny remis wybiera debris. Następny debris używa zwykłego
64-klatkowego repeat delay, bez natychmiastowego zastępstwa. Ta funkcja nie zmienia
pozostałej logiki spawn/despawn i nie podnosi limitu puli interactive; pula
effects pozostaje fizycznie sześcioslotowa, z limitem aktywnym 5 dla rdzenia
i czterech fragmentów.

Każda prawidłowa śmierć zwykłego Raidera zachowuje dotychczasowy wynik,
dźwięk i pełnoekranowy profil `$1E,$3C,$1C,$34`, a dodatkowo uruchamia lokalny
rozpad w pozycji PMG myśliwca. Raider i jego hitbox znikają przed efektem.
Pięcioklatkowy rdzeń oraz cztery trzydziestoklatkowe fragmenty — lewe skrzydło,
prawe skrzydło, czerwone oko i część centralna — używają bezkolizyjnej puli
effects i wspólnych glifów debris/fragmentów. Materializacja następuje w
następnej klatce PAL, podczas czerwono-pomarańczowej fazy pełnoekranowego
flasha; pierwszy update od razu rozdziela fragmenty w cztery kierunki.
Najnowszy rozpad debris albo Raidera zastępuje poprzedni dopiero po reverse
erase, bez punktów, obrażeń, zmian RNG lub ghostów.

Rapid Fire i Spread Shot są zaimplementowanymi weapon pickupami; Shield,
rakiety i laser pozostają poza tym feature’em. Wyłącznie Raider zabity przez
rzeczywiście zużyty pocisk Vipera i rozliczony przez istniejącą ścieżkę
punktacji zwiększa licznik. Sekwencja `0→1→2` tworzy po trzecim takim zabiciu
kapsułę i zeruje licznik; broadside, kontakt, cleanup, debris i inne źródła
śmierci go nie zmieniają. Każda skutecznie utworzona kapsuła przełącza
deterministyczny typ `Rapid→Spread→Rapid→Spread`; fresh New Game zawsze zaczyna
od Rapid. PENDING albo widoczny pickup blokuje następny cykl, ale aktywny
booster nie: nowa kapsuła może zostać zdobyta i zebrana, aby naturalnie
zastąpić lub odnowić bieżący tryb. Na ekranie istnieje najwyżej jedna kapsuła.

Kapsuła ma footprint 2×2, gruby stalowy obrys, statyczne żółte wypełnienie
oraz wysokie na niemal 16 pikseli, czarne litery `R`/`F` wycięte kolorem tła.
Nie zawiera białych pikseli. W całym stanie ACTIVE używa tych samych
czterech normalnych kodów znaków; nie miga, nie przełącza inverse ani czerwieni i
jest renderowana nieprzerwanie w każdej aktywnej klatce.
Pozostaje ukryta i bezkolizyjna przez 30 pełnych klatek po rozpadzie Raidera,
potem dziedziczy natywny krok near/A2: jeden wiersz przy co drugim
`WORLD_ROW_ADVANCED`, bez niezależnego wolnego akumulatora i bez catch-up.
Debris i kapsuła mogą być widoczne jednocześnie. Kapsuła Spread używa osobnych
glifów 124–127: ma stalowy obrys, jasnoczerwoną obudowę `COLPF3=$46` i duży
czarny symbol trzech rozchodzących się pocisków wycięty kolorem tła, bez małej
litery `S`. Tak jak Rapid pozostaje statyczna, niemigocząca i używa tego samego
czterokomórkowego backingu przy każdym ruchu. Kontakt z Viperem nie daje
punktów, leczenia ani obrażeń, tylko usuwa backing kapsuły i aktywuje efekt.

Rapid Fire trwa dokładnie 500 aktywnych klatek PAL. Pause zatrzymuje timer;
life loss, Game Over i new game go czyszczą, natomiast żywy gracz zachowuje go
przez zmianę sektora. Interwał wewnątrz istniejącej dziesięciostrzałowej serii
zmienia się z 3 na 2 klatki. Liczba strzałów, cooldown po serii, pula,
odrzucenie pełnej puli, obrażenia i geometria pocisków pozostają bez zmian.
Nowy pocisk utworzony podczas Rapid Fire zachowuje czerwony `COLPF3=$46`
przez cały własny lifecycle; zwykłe i utworzone po wygaśnięciu są żółte
`COLPF2=$1E`. Istniejący HUD pokazuje `RF10` do `RF01`, aktualizowane wyłącznie
co 50 aktywnych klatek; pause zamraża timer i napis. Pickup nie korzysta z RNG,
PMG, DLI ani SFX.

Spread Shot również trwa dokładnie 500 aktywnych klatek PAL i używa `SP10` do
`SP01`. Pause zamraża timer, life loss/Game Over/New Game go czyszczą, a żywy
gracz zachowuje go przez zmianę sektora. Rapid i Spread wzajemnie się
zastępują; zebranie bieżącego typu odnawia pełne 500 klatek. Spread zachowuje
zwykły interwał 3 klatek i tworzy atomowo trzy logiczne pociski: żółty środkowy
leci pionowo, a dwa czerwone boczne przesuwają się dodatkowo o 2 HPOS na klatkę
w lewo/prawo. Cała trójka porusza się o 6 scanlines w górę, korzysta ze
wspólnej dziesięcioslotowej puli Vipera i zostaje odrzucona bez częściowego
zapisu, jeśli wolne są mniej niż trzy sloty. Pociski trafiają Raidera i debris;
debris nadal nie daje punktów. Reverse erase usuwa je przy górnej lub bocznej
granicy bez ghostów, zmian HUD albo charsetu. Spread nie łączy się z interwałem
Rapid, nie zwiększa puli effects i nie dodaje DLI, PMG ani globalnej palety.

World zachowuje 20/22,5/25 wiersza/s dla EASY/MEDIUM/HARD. Near stars mają
10/11,25/12,5, far stars 5/5,625/6,25, a debris 12/13,5/15 wiersza/s.
Dokładna kolejność pozostaje `far < near < debris < world`. Trace mierzy od
spawnu Y=24 do despawnu odpowiednio 91/82/74 ramek
(1,82/1,64/1,48 s). Odrzucony kandydat 3/4 world potrzebował 73/66/60 ramek
(1,46/1,32/1,20 s), zatem nowa wersja jest rzeczywiście wolniejsza.

Scheduler nie tworzy nowych debris podczas `DRAIN` ani `COMPLETE`. Przejście
do `COMPLETE` uzbraja osobny wysoki licznik 22 rzeczywistych obrotów A2; po
pełnym odbudowaniu ringu stan `OPEN` ponownie ustawia normalne opóźnienie 32
klatek. Nie czyści bezwarunkowo puli i nie zużywa RNG entity podczas blokady.

**BINDING**

Zdarzenie odłamków może wystąpić w otwartej przestrzeni, a także w sektorze
capital ships, jeżeli reguły dyrektora na to pozwalają. Odłamki mogą
przedstawiać płyty pancerza, fragmenty konstrukcji, szczątki myśliwców,
kratownice oraz większe, wolno obracające się wraki.

Bezpośrednie zderzenie z dużym odłamkiem natychmiast niszczy Vipera niezależnie
od bieżącego procentu kadłuba. Generator nie może utworzyć sytuacji bez wyjścia:
każdy układ zachowuje co najmniej jedną trasę osiągalną przy rzeczywistej
prędkości oraz ograniczeniach ruchu Vipera.

**PLANNED**

Bezpieczeństwo układu będzie sprawdzane przez ograniczony generator lub
walidator osiągalnych pasów, a nie przez założenie, że losowy rozstaw „zwykle”
pozostawia lukę.

**BALANCING DECISION STILL OPEN**

Rozmiary klas odłamków, ich prędkość, tempo obrotu, gęstość oraz częstość
zdarzeń wymagają testów czytelności i czasu reakcji.

## Stan kadłuba i obiekty naprawcze

**BINDING**

- Viper ma stan kadłuba od 0% do 100%.
- HUD pokazuje wartość liczbową, na przykład `HULL 80%`.
- `LIFE` pokazuje wszystkie pozostałe grywalne Vipery, łącznie z aktualnie
  aktywnym; gra z trzema życiami przechodzi `3 → 2 → 1 → 0 / Game Over`.
- `HULL` jest wyprowadzany z kanonicznych dziesięciu jednostek health przez
  dokładne `units × 10`; nie istnieje drugi licznik zdrowia ani zaokrąglanie.
- Zwykły ogień przeciwnika i ciężkie pociski obniżają stan kadłuba.
- Osiągnięcie 0% niszczy Vipera.
- Duży odłamek niszczy Vipera natychmiast zamiast zadawać zwykłe obrażenia.
- Zebranie obiektu naprawczego przywraca dokładnie 20 punktów procentowych,
  maksymalnie do 100%.
- Zestrzelenie obiektu naprawczego działkiem Vipera daje punkty bonusowe.
- Zniszczony obiekt naprawczy nie naprawia Vipera.
- Obiekt ma wyglądać jak wojskowy repair drone lub repair pod, a nie dosłowna
  ziemska apteczka.

Wybór między zebraniem naprawy a jej zestrzeleniem jest zamierzoną decyzją
„przetrwanie kontra wynik”.

**BALANCING DECISION STILL OPEN**

Obrażenia zadawane przez poszczególne pociski i przeciwników, punkty za
zniszczenie obiektu, częstość napraw oraz warunki ich pojawiania pozostają
danymi do strojenia.

**OPTIONAL BACKLOG**

Graficzny pasek zdrowia może zostać rozważony wyłącznie po teście wizualnym,
który wykaże przewagę nad zatwierdzonym zapisem liczbowym. Nie jest obecnie
planowany jako równoległy element HUD-u.

## Poziomy, fale i kontrolowana losowość

**BINDING**

Każdy poziom ma powtarzalną tożsamość określoną przez:

- dostępne archetypy przeciwników;
- intensywność fal i częstotliwość ognia;
- dostępne formacje;
- prawdopodobieństwo odłamków i napraw;
- prawdopodobieństwo oraz długość sektorów capital ships;
- później obecność min, elitarnych przeciwników albo bossa.

Powtórzenie poziomu daje ten sam ogólny zestaw przeciwników i profil trudności.
Losowość może zmieniać dozwolone warianty ścieżki, przesunięcia, kierunek oraz
timing, ale nie może przekształcić poziomu w inną klasę trudności.

Losowość musi być ograniczona, testowalna, odtwarzalna ze stałym seedem
testowym, tania dla deterministycznego 50 FPS i niezdolna do wygenerowania
nieuniknionej kombinacji.

**PLANNED**

Dane fal będą używać tabel poziomów, deskryptorów formacji, małych tablic
pomocniczych oraz współdzielonych procedur ruchu. Długie skrypty współrzędnych
klatka po klatce nie są planowanym formatem treści.

**BALANCING DECISION STILL OPEN**

Seed używany w normalnej grze, liczba wariantów ruchu, wagi wyboru formacji i
progi trudności zostaną ustalone po powstaniu powtarzalnych testów fal.

## Archetypy przeciwników

**PLANNED**

Różnorodność ma wynikać głównie z danych łączących mały zestaw sylwetek z
zachowaniem ruchu, prędkością, wzorcem strzału, wytrzymałością, kolizjami,
punktami, kolorem lub animacją, rolą w formacji i flagami zachowania.

Roboczy katalog obejmuje:

1. **Scout** — szybki zygzak, mała odporność, lekki ogień.
2. **Interceptor** — ustawia się i wykonuje nagłe nurkowanie.
3. **Line fighter** — leci w formacji i tworzy rdzeń zwykłych fal.
4. **Hunter** — stopniowo śledzi poziomą pozycję Vipera.
5. **Heavy assault fighter** — wolniejszy, odporniejszy, strzela krótkimi
   seriami.
6. **Minelayer** — rozmieszcza trwałe zagrożenia.
7. **Rammer** — zapowiada atak, a następnie szarżuje.
8. **Ace lub command fighter** — łączy zachowania i działa jako miniboss.

Pierwszy kamień milowy z aktywnymi przeciwnikami obejmuje tylko cztery pierwsze
zachowania. Typy zaawansowane wchodzą później. Osiem archetypów nie oznacza
ośmiu całkowicie osobnych zestawów sprite'ów: bazowe sylwetki mają być
współdzielone i różnicowane parametrami, ruchem, kolorem, animacją lub
dodatkami.

**BALANCING DECISION STILL OPEN**

Ostateczne nazwy zgodne z BSG, grafiki, punkty życia, prędkości, szybkostrzelność
i wartości punktowe wymagają testów implementacji.

## Formacje i fale

**PLANNED**

Kompaktowe formacje proceduralne mogą obejmować kolumnę, klin, rozdzieloną
parę, nożyce, naprzemienny slalom, lidera z eskortą oraz pozorny odwrót
z kolejnym atakiem. Deskryptor przechowuje identyfikator, pozycje początkowe,
timing, małe przesunięcia oraz parametry zachowania, a nie pełne ścieżki dla
każdej klatki.

Kontroler fali odpowiada za utworzenie formacji w granicach limitu slotów.
Poszczególne jednostki nadal wykonują współdzielone zachowania opisane przez
deskryptory przeciwników.

**BALANCING DECISION STILL OPEN**

Ostateczny zestaw formacji, liczba jednostek, odstępy, opóźnienia i warianty
wejścia zależą od limitu jednoczesnych obiektów oraz czytelności na realnym
Atari.

## Encounter director

**PLANNED**

Mały, deterministyczny i ograniczony encounter director wybiera dozwolone
zdarzenia, takie jak fala myśliwców, pole odłamków, repair drone, miny, salvo
burtowe, elitarny fighter lub miniboss. Nie wszystkie typy muszą istnieć
w pierwszej implementacji dyrektora.

Dyrektor stosuje reguły wykluczeń, cooldowny, limit aktywnych obiektów i stan
sektora. Nie może na przykład połączyć blokującej ściany odłamków,
nieuniknionej szarży i ciężkiego salwa przecinającego jedyny pas ucieczki.
Logika losowania zdarzeń nie powinna zostać rozproszona po niezależnych
fragmentach głównej pętli.

**BALANCING DECISION STILL OPEN**

Wagi zdarzeń, cooldowny, limity kumulacji i zasady eskalacji należą do danych
poziomu i wymagają testów z zapisanymi seedami.

## Wynik

**BINDING**

Punkty przyznawane są za:

- zniszczenie enemy fighter;
- zniszczenie repair object zamiast jego zebrania;
- po dodaniu takich celów, zniszczenie wybranych baterii broni lub celów bossa.

**BALANCING DECISION STILL OPEN**

Dokładne wartości i krzywa punktowania pozostają danymi do strojenia.

**OPTIONAL BACKLOG**

Mnożnik za grę bez otrzymania obrażeń i tymczasowy ofensywny power-up nie są
wymagane dla pierwszej kompletnej wersji.

## Stany gry

**BINDING**

Bieżąca jawna maszyna frontendu prowadzi:

`boot → loader przez 250 ramek PAL → main menu → gameplay`

Gameplay uruchamia się wyłącznie po wybraniu `START GAME`. Menu główne ma
cztery pozycje w stałej kolejności: `START GAME`, `OPTIONS`, `TOP SCORES`,
`EXIT`; domyślnie wybrane jest `START GAME`. Joystick portu 1 porusza wybór
UP/DOWN z zawijaniem, a FIRE aktywuje pozycję. Każde wejście jest bramkowane
neutralnym puszczeniem, więc przytrzymany kierunek nie wykonuje autorepeatu,
a FIRE nie przechodzi na następny ekran ani do pierwszego strzału w gameplayu.
Gameplay i jego timery nie działają w stanach frontendu.

`OPTIONS` contains `SOUND: ON/OFF`, `GAME MUSIC: ON/OFF`,
`DIFFICULTY: EASY/MEDIUM/HARD`, and `BACK`. SOUND and GAME MUSIC default to ON,
while difficulty defaults to `MEDIUM`. All three settings remain in RAM during
the session and need not survive RESET or power-off. UP/DOWN selects a row;
LEFT/RIGHT or FIRE toggles either audio row, LEFT/RIGHT wraps difficulty across
its three values, and FIRE on `BACK` returns to the menu. Settings cannot be
changed while the world is running. During `PAUSED`, the shared
`GAME_MUSIC_ENABLED` value can be changed through `GAME MUSIC: ON/OFF`. SOUND
OFF silences all POKEY output. GAME MUSIC OFF suppresses only the gameplay
score; it does not affect the menu score or any SFX.

Trudność ustala pełnowierszowy ruch capital hulls: `EASY` to dokładnie 20
wierszy/160 scanlines na sekundę, `MEDIUM` 22,5/180, a `HARD` 25/200.
Side hulls używają tych samych liczników i mianownika 20, czyli 100% dawnego
world rate. `EASY` jest 80% prędkości `HARD`. Harmonogram broadside,
25-ramkowy warning, prędkość pocisków, sterowanie i kolizje pozostają oparte
na ramkach PAL i nie są skalowane przez ten wybór. Near i far zachowują wobec
tej stawki dokładne proporcje 50% i 25%, a debris 60%.

`TOP SCORES` pokazuje dziesięć ponumerowanych wierszy. Pierwszy wiersz
`--- 000000` jest sesyjnym TOP: po każdej punktacji przyjmuje
`max(TOP, SCORE)`, nie maleje i jest zachowywany przez śmierć, respawn, game
over oraz rozpoczęcie nowej gry. Pełny restart programu zeruje TOP. Pozostałe
wiersze są nadal szablonami `--- 000000`; FIRE wraca do menu. Tabela nie jest
zapisywana na dysk, nie obsługuje inicjałów i nie definiuje trwałego formatu
high scores.

SCORE obejmuje całą bieżącą grę i wszystkie życia gracza. Damage, śmierć,
eksplozja, zmniejszenie LIFE i respawn nie zmieniają SCORE. Licznik wraca do
zera wyłącznie przy rozpoczęciu zupełnie nowej gry; końcowy SCORE pozostaje
dostępny podczas game over, a TOP jest zachowany przy kolejnym `START GAME`.

`EXIT` najpierw pokazuje `EXIT GAME?`, z `NO` wybranym domyślnie. `NO` wraca do
menu. `YES` wycisza POKEY, wyłącza gameplay i pozostawia stabilny ekran
`DARK FIGHTER ENDED` / `PRESS RESET TO RESTART` aż do sprzętowego lub
emulatorowego RESET. Bootowalny ATR nie ma uniwersalnego desktopu ani DOS-u,
do którego można bezpiecznie wrócić, dlatego EXIT nie skacze do `DOSVEC` i nie
wywołuje nieudokumentowanej procedury OS.

The implemented player lifecycle is
`ALIVE → DYING → RESPAWN_INVULNERABLE` or
`ALIVE → DYING → GAME_OVER`. `DYING` retains the existing 24-frame fighter
explosion. Lethal damage decrements `LIFE` once with a zero floor. When the
last life is lost, the transition enters `GAME_OVER` exactly once after the
final explosion frame and leaves the gameplay loop, so player control, both
weapons, damage, collision, enemy spawning, world updates, and scoring stop.
The first six frames of Viper death set the full-screen background to bright
yellow, bright red-orange, lower-luminance yellow, bright red-orange, medium
red and dark red (`$1E,$3C,$1C,$3C,$38,$34`), one PAL frame each, then restore
black. An ordinary enemy fighter destruction uses the shorter four-frame
profile `$1E,$3C,$1C,$34`, then restores black. Viper death has priority when
both start together; neither profile changes PMG colours, local explosion
geometry, SFX, score, RNG or gameplay cadence.

The text-mode Game Over screen uses the resident frontend charset and shows
`GAME OVER`, the final six-column `SCORE`, the session `TOP SCORE`, and
`FIRE TO CONTINUE`. Entry clears the frontend input gate. Held FIRE is ignored
until the button is released; a later fresh press returns to the main menu.
The final score remains intact on this screen and in the menu. Only a new
`START GAME` resets `SCORE`; session `TOP` persists.

Physical Atari `OPTION` enters `PAUSED` before the next gameplay-frame mutation.
The pause menu contains `RESUME`, `GAME MUSIC: ON/OFF`, and `QUIT TO MENU`.
UP/DOWN changes the selected row, FIRE activates it, and a fresh OPTION press
is a quick resume. OPTION and FIRE both require release before another action.
No player input, world/star scroll, AI, spawn, projectile movement, collision,
damage, score, gameplay animation, death, respawn, invulnerability, SFX timer,
or music transport timer advances while paused.

Pause entry mutes gameplay audio while preserving its logical state. RESUME
continues the current song position when GAME MUSIC remains ON. Switching ON
to OFF clears gameplay music immediately without changing SFX; switching OFF
to ON starts the song from row zero only after resume. The main OPTIONS screen
and pause menu always display the same session value.

`QUIT TO MENU` opens a `QUIT TO MENU?` confirmation with `NO` selected by
default. NO returns to PAUSED. YES clears projectiles, enemies, effects,
collision latches, and gameplay state, then returns directly to the main menu
without Game Over. Main-menu music starts from its beginning. TOP remains
unchanged; the abandoned SCORE need not be cleared by quit, but the next
`START GAME` always resets SCORE to zero.

## Wymagany zakres pierwszej kompletnej wersji

**BINDING**

Pierwsza kompletna wersja ma dostarczyć jako jeden resident gameplay program:

- rdzeń lotu, walki, wyniku oraz pełną maszynę stanów gry;
- liczbowy stan kadłuba, model obrażeń, repair drone i natychmiastową śmierć od
  dużego odłamka;
- powtarzalne poziomy, kontrolowaną losowość, proceduralne fale oraz
  ograniczony encounter director;
- naprzemienne sektory otwartej przestrzeni i bitwy capital ships z wizualnymi
  przejściami;
- ogień burtowy, crossfire działający na oba rodzaje myśliwców i trafienia
  kadłubów capital ships;
- rozwój od pierwszych czterech zachowań do planowanych typów zaawansowanych;
- co najmniej jeden boss lub cel związany z capital ship;
- ograniczone audio POKEY, stabilne 50 FPS PAL, długotrwałe testy i potwierdzoną
  ścieżkę uruchomienia XEX, ATR oraz SIO2SD na stockowym 65XE.

Kolejne elementy wchodzą etapami zgodnie z `docs/roadmap.md`; ten zakres nie
upoważnia do wdrożenia wszystkiego naraz.

## Opcjonalny backlog

**OPTIONAL BACKLOG**

- mnożnik wyniku za brak obrażeń;
- tymczasowy ofensywny power-up;
- pauza;
- destrukcyjne pojedyncze baterie broni, jeżeli nie wejdą jako część celu
  capital ship;
- korekty loadera: poprawa litery `S` w `BSG`, ograniczenie poszarpanych
  krawędzi, mocniejsze czarne szczeliny i pomarańczowy wydech silników przez
  PMG.

Żaden z tych punktów nie może zastąpić obowiązkowego zakresu ani powodować
spekulacyjnej infrastruktury.

## Jawne non-goals

**BINDING**

- Bieżąca architektura nie używa dostępu do dysku między normalnymi poziomami,
  overlayów, pakietów misji ani oddzielnie ładowanych rozdziałów.
- Title loader jest jedyną obecną fazą ładowania. Nie projektujemy teraz
  managera overlayów, formatu modułu dyskowego, relokacji, save state ani API
  level loadera.
- Standardowy ATR nie jest rozszerzeniem gameplay RAM; wolna pojemność obrazu
  dysku nie rozwiązuje presji pamięci resident programu.
- Stary loader ANTIC 4 nie jest wspieranym wariantem.
- Nie kopiujemy zasobów ani układów z istniejących produkcji BSG.
- Nie przechowujemy długich ścieżek ruchu jako współrzędnych każdej klatki.
- Nie wymagamy osobnego dużego zestawu sprite'ów dla każdego zachowania.
- Capital ships nie pojawiają się natychmiast i nie są budowane głównie z PMG.
- Fighters nie mają sztucznej odporności na ogień własnej frakcji.
- Paliwo, energia i punkty ich uzupełniania nie należą do zatwierdzonego
  modelu rozgrywki. Napis `FUEL` w bieżącym wydaniu jest pozostałością
  technicznego HUD-u, a nie aktywną decyzją produktu.

## Inwarianty sprzętowe

**BINDING**

- stockowy Atari 65XE PAL, 64 KB RAM i 6502C;
- 50 pełnych aktualizacji na sekundę, z deterministyczną i ograniczoną pracą
  widocznej ramki;
- joystick w porcie 1 i pojedynczy FIRE;
- wyłącznie udokumentowane instrukcje NMOS 6502;
- samowystarczalne `dark-fighter.xex` oraz bootowalne `dark-fighter.atr`;
- uruchomienie w emulatorze i na prawdziwym Atari przez SIO2SD;
- przenośny build na macOS Intel oraz Windows;
- brak zależności od zachowań dostępnych wyłącznie w emulatorze;
- brak wywołań OS po przejęciu sprzętu, chyba że zostaną jawnie opisane
  i przetestowane przy rzeczywistym stanie przerwań oraz ekranu;
- każda przyszła funkcja musi utrzymać zmierzony, ograniczony budżet pamięci,
  PMG, zero page i cykli PAL.
