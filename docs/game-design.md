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
już aktywne warningi, flashes, M1–M3 i 24-ramkowe eksplozje kadłuba, po czym udostępnia `COMPLETE` przyszłemu
encounter director. Nie dodaje jeszcze komunikatu, bonusu ani następnego
sektora.

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

`OPTIONS` zawiera `SOUND: ON/OFF`, `DIFFICULTY: EASY/MEDIUM/HARD` oraz `BACK`.
Dźwięk jest domyślnie włączony, trudność domyślnie ma wartość `MEDIUM`, a oba
ustawienia pozostają w RAM podczas sesji i nie muszą przetrwać RESET ani
wyłączenia zasilania. UP/DOWN wybiera wiersz, LEFT/RIGHT zawija trudność między
trzema wartościami, a FIRE na `BACK` wraca do menu. Trudności nie można
zmieniać podczas aktywnego gameplayu. OFF wycisza wszystkie kanały POKEY.

Trudność ustala pełnowierszowy ruch świata: `EASY` to dokładnie 20
wierszy/160 scanlines na sekundę, `MEDIUM` 22,5/180, a `HARD` 25/200.
Side hulls używają osobnego akumulatora z tymi samymi licznikami i mianownikiem
40, więc poruszają się dokładnie o połowę wolniej: odpowiednio 10/80,
11,25/90 i 12,5/100. `EASY` jest 80% prędkości `HARD`. Harmonogram broadside,
25-ramkowy warning, prędkość pocisków, sterowanie i kolizje pozostają oparte
na ramkach PAL i nie są skalowane przez ten wybór. `HARD` pozostawia
zaakceptowaną prędkość świata, a tylko masa capital ships otrzymuje wolniejszy
strumień wzdłużny.

`TOP SCORES` pokazuje dziesięć ponumerowanych wierszy domyślnej tabeli
`--- 000000`. FIRE wraca do menu. Tabela nie jest jeszcze połączona z wynikami
zakończonych gier; wpisywanie inicjałów i wstawianie score powstaną razem
z integracją game over i scoringu. Tabela nie jest zapisywana na dysk i nie
definiuje trwałego formatu high scores.

`EXIT` najpierw pokazuje `EXIT GAME?`, z `NO` wybranym domyślnie. `NO` wraca do
menu. `YES` wycisza POKEY, wyłącza gameplay i pozostawia stabilny ekran
`DARK FIGHTER ENDED` / `PRESS RESET TO RESTART` aż do sprzętowego lub
emulatorowego RESET. Bootowalny ATR nie ma uniwersalnego desktopu ani DOS-u,
do którego można bezpiecznie wrócić, dlatego EXIT nie skacze do `DOSVEC` i nie
wywołuje nieudokumentowanej procedury OS.

Docelowa maszyna gameplayu nadal ma objąć aktywną grę, zniszczenie gracza,
game over oraz restart. Wejście w każdy stan ma być jawne i deterministyczne;
zniszczenie nie może być wyłącznie krótką zmianą koloru jak w bieżącym
vertical slice. Powrót z gameplayu do menu zostanie połączony z tymi stanami,
a nie dodany jako niezależny skrót w bieżącym milestone.

**OPTIONAL BACKLOG**

Pauza może zostać dodana w późniejszym kamieniu milowym. Nie blokuje pierwszej
kompletnej wersji, jeżeli nadal nie jest zaimplementowana.

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
  modelu rozgrywki. Napis `FUEL` w bieżącym vertical slice jest pozostałością
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
