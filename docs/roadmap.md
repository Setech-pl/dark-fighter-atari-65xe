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

## 1. Zaakceptowany vertical slice i bitmapowy loader — ukończone

### Zakres

- przenośny build ca65/ld65;
- samowystarczalne XEX i bootowalny ATR;
- techniczny gameplay ANTIC 4 z joystickiem, FIRE, jednym przeciwnikiem,
  kolizją, wynikiem, przewijaniem i POKEY;
- loader ANTIC F 320 px z footerem ANTIC E 160 px, LZ-10/5, dwa LMS, dwa DLI
  i dokładnie 250 pełnych ramek PAL;
- czyste przejście z loadera do wspólnego ekranu ANTIC 4 bez kosztu loadera
  w gameplayowej pętli lub VBI.

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
page, aktywne PMG od `$3B00`, bitmapę przejściową 7680 B i strumień LZ-10/5
2027 B. Przewijanie tła ma już udokumentowane przybliżenie około 19 000 cykli
raz na cztery ramki; pozostałe ścieżki gameplayu nadal wymagają pełnego
pomiaru przed rozbudową.

### Wykluczenia

Nie są jeszcze zaimplementowane: hull percentage, zniszczenie gracza, game
over, fale, sektory capital ships, debris, repair drone, broadside i boss.

## 2. Interaktywny frontend i start menu — ukończone, bieżący build

### Zakres

- jawne stany loader, main menu, options, top scores, exit confirmation,
  exited i gameplay;
- menu `START GAME`, `OPTIONS`, `TOP SCORES`, `EXIT` ze sterowaniem
  joystickiem portu 1, zawijaniem i neutral-release gating;
- sesyjna opcja `SOUND: ON/OFF`;
- dziesięciowierszowa tabela z sesyjnym TOP w pierwszym wierszu, bez zapisu
  i inicjałów;
- bezpieczne Atari-specific EXIT pozostające na ekranie do RESET;
- jedna ścieżka resetu uruchamiająca istniejący vertical slice;
- mieszany playfield: ANTIC 7 dla tytułu, ANTIC 6 dla opcji, ANTIC 4 dla
  hangaru i gwiazd oraz ANTIC 2 dla kontrolnego hintu;
- statyczny Viper po lewej, pionowe menu po prawej i zielony akcent `$D8`;
- deterministyczny `build/previews/start-menu.png`.

### Zależności

Kamień 1, zaakceptowany loader i istniejąca infrastruktura ANTIC 4.

### Kryteria akceptacji

- loader nadal trwa dokładnie 250 ramek i przechodzi do menu, nie do gameplayu;
- domyślnym wyborem jest `START GAME`, wejście zawija się i nie autorepeatuje;
- przytrzymany FIRE nie wraca natychmiast z ekranu ani nie tworzy pierwszego
  pocisku po `START GAME`;
- SOUND domyślnie jest ON, wybór trwa w RAM, a OFF wycisza wszystkie kanały;
- TOP SCORES ma dokładnie dziesięć wierszy, zachowuje sesyjny rekord między
  grami i wraca przez FIRE;
- EXIT domyślnie wybiera NO, a YES nie skacze do DOS-u;
- testy kontraktowe, build, preview i verify przechodzą; gameplay preview
  pozostaje byte-for-byte zgodny z zaakceptowanym obrazem.

### Dowody pamięci i wydajności

Po mieszanym polishu bieżący kod ma 2579 B, RODATA 4902 B, zero page 34 B,
payload 7481 B, 59 boot sectors i XEX 7493 B; ATR pozostaje 92 176 B.
Względem wcześniejszego kandydata ANTIC 4 kod rośnie o 279 B, RODATA o 63 B,
a payload o 342 B; ZP pozostaje bez zmian. Powstaje osobny frontend charset
1 KB pod `$4800-$4BFF`, odzyskiwany po loaderze; ekran 1 KB i PMG nie zmieniają
rezerwacji. Main menu wykorzystuje 820 B ekranu, a sub-screeny 960 B.

Main menu ma trzy widoczne warstwy PMG (P0/P2/P3); player DMA pozostaje
ograniczone jak wcześniej. Cała scena jest rysowana tylko przy wejściu i przy
wyłączonym DMA. Pojedynczy DLI po dividerze ma konserwatywną granicę około
160 cykli wraz z `WSYNC`, a przywrócenie głównej palety po obrazie dodaje około
55 cykli w idle ramce. Nie ma DLI per opcja ani dekoracji liczonych per-frame.
Ekrany podrzędne wyłączają PMG i DLI; gameplay nie otrzymuje kosztu frontendu.

### Wykluczenia

Bez hull, player destruction, game over, wstawiania score, initials, SIO/disk
persistence, pauzy, nowych enemies, formations, debris, repair, capital ships,
broadside i powrotu z aktywnego gameplayu do menu.

## 3. Audyt budżetu gameplayu i data-driven entity foundations — następne

### Zakres

- zmierzenie rzeczywistego resident i reclaimable RAM po przejściu loadera;
- rozdzielenie budżetów kodu, danych, obrazu, charsetu, PMG, zero page
  i przejściowych buforów;
- stała, mała pula slotów encji z jawnym typem, stanem aktywności, pozycją,
  prędkością i flagami;
- format deskryptora zachowania oraz małych tabel danych bez wdrażania nowej
  rozgrywki;
- narzędziowy lub testowy sposób raportowania limitów i przepełnienia slotów.

To jest **następna funkcja do implementacji** po zatwierdzeniu frontendu.

### Zależności

Kamienie 1–2 oraz aktualne map, labels i memory map.

### Kryteria akceptacji

- dokumentowany audyt nie nazywa 32-bajtowego gapu przed `$3B00` całkowitą
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

## 4. Hull percentage, obrażenia, zniszczenie, game over i restart

### Zakres

- stan kadłuba 0–100% i liczbowy `HULL nn%` w HUD;
- data-driven damage dla istniejących i testowych źródeł trafień;
- stan zniszczenia gracza, game over i deterministyczny restart;
- rozdzielenie aktywnej gry od animacji/odliczania zniszczenia;
- zachowanie startu oraz przejść maszyny stanów.

### Zależności

Kamienie 1–3 i zaakceptowany format player/entity state.

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

## 5. Deskryptory przeciwników i pierwsze zachowania — fundament rosteru pass 1

Pass 1 dostarcza wspólny indeksowany renderer/descriptors, dziesięć stabilnych
ID i trzy finalne maski: release `RAIDER` oraz review-only `TALON` i
`SCYTHE_BOMBER`. Nie uruchamia jeszcze nowej kompozycji fal ani ich docelowych
AI/weapons. Kolejne siedem wpisów — `TRIDENT_GUNSHIP`, `WRAITH_SCOUT`,
`HUNTER`, `LEECH_DRONE`, `AEGIS_ESCORT`, `CROWN_RAIDER`, `HYDRA_CARRIER` — ma
wyłącznie manifest referencji i kontrakt przyszłej roli; nie może się spawnować
i nie aliasuje Raidera.

Bieżąca korekta pass 1 nadaje release Raiderowi pierwszy profile-driven
`WEAPON_SINGLE_PULSE`: burst 10 strzałów co 4 ramki PAL, 10 damage,
5 scanlines/rama i pauza 60/50/40 dla EASY/MEDIUM/HARD. Dziewięć stałych
slotów ANTIC 4 zachowuje swept collision bez użycia M2. Talon oraz Scythe pozostają
`WEAPON_NONE` i nie wchodzą do release waves. Pozostałych siedem typów, Level 1
waves, bossy i ich finalne bronie nadal pozostają poza zakresem.

Korekta języka pocisków daje Viperowi literalne żółte 1×2 `COLPF2=$1E` i
Raiderowi czerwone 2×3 `COLPF3=$46`; obie pule są przywracanymi overlayami
ANTIC 4. Viper ma 10 strzałów co 3 ramki, prędkość 6 i pauzę 12 ramek.
Flying capital fire pozostaje dwukomórkowym 8×6 overlayem: Colonial `$1E`,
Cylon `$46`, więc nadal jest materialnie dłuższy od fighter fire.
Wspólna ścieżka enemy damage/resolve czyta HP i BCD score z deskryptora:
player projectile oraz contact dają pełny score, Colonial capital zero, a
Cylon capital friendly fire pełny score. Spatial sweep konsumuje capital shell
na pierwszym celu i zapobiega double hit/double score.

Każdy lethal fighter hit przechodzi teraz przez `ACTIVE → EXPLODING →
INACTIVE`. Raider i Viper współdzielą sześć masek 8×8 po cztery ramki; dwa
stałe sloty pozwalają im eksplodować równocześnie. Po `DRAIN` cleanup jest
wykonywany atomowo tylko raz, dzięki czemu świeże i trzymane FIRE uruchamia
broń Vipera w pierwszej legalnej ramce po `COMPLETE`. Respawn rozpoczyna 250
ramek invulnerability dopiero po pełnych 24 ramkach eksplozji.

### Zakres

- data-driven enemy descriptors;
- Raider, Talon/interceptor, Scythe/bomber i Hunter jako pierwsze zachowania;
- współdzielone sylwetki oraz parametry prędkości, ognia, odporności, kolizji
  i punktów;
- ograniczona pula enemy/projectile slots;
- spójne przekazanie obrażeń i score do systemów z kamienia 4.

### Zależności

Kamienie 3–4.

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

## 6. Proceduralne formacje i level wave tables

### Zakres

- kompaktowe deskryptory formacji;
- formacje początkowe: column, wedge, paired split i co najmniej jeden wariant
  ruchu wykorzystujący istniejące zachowania;
- level wave tables określające zestaw przeciwników, intensywność, ogień
  i dozwolone warianty;
- odtwarzalne testy całych fal ze stałym seedem;
- kontroler fal centralizujący spawn zamiast rozproszonej losowości.

### Zależności

Kamień 5.

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

## 7. Debris, safe paths i wybór repair drone

### Zakres

- klasy debris, w tym duże obiekty powodujące natychmiastowe zniszczenie;
- ograniczony generator z co najmniej jedną osiągalną trasą;
- repair drone/pod: zebranie daje dokładnie +20 punktów procentowych do 100%;
- zestrzelenie repair object daje punkty i wyklucza naprawę;
- pierwsze reguły cooldown/exclusion dla zdarzeń hazard i repair.

### Zależności

Kamienie 4 i 6; znane ograniczenia ruchu Vipera z bieżącej implementacji.

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

## 8. Naprzemienne sektory open space i capital-ship corridor

### Zakres

- jawny sector controller z dwoma stanami środowiska;
- zmienne czasy trwania ograniczone do 2250 ramek PAL;
- osobne stany zapowiedzi, wejścia, active i wyjścia;
- encounter director wybierający tylko zdarzenia dozwolone w bieżącym stanie;
- prototyp czytelności hipotezy `8 + 24 + 8`.

### Zależności

Kamienie 6–7 oraz ustabilizowane event exclusions.

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

## 9. Przewijane side-hull segments i przejścia visual — baza grafiki i danych gotowa do akceptacji

### Zakres

- oryginalny character-mode `allied_line_hull` po lewej;
- oryginalny character-mode `enemy_void_hull` po prawej;
- 32-wierszowe, różne moduły źródłowe, kontury 5/6/7/8 komórek i układ nominalny
  `8 + 24 + 8`;
- siedem dużych, cyklicznych przejść inner-edge na każdą stronę, ze stałą
  głębokością utrzymywaną przez 2–8 wierszy; lokalne cofnięcia o jedną
  komórkę zwiększają profil bez równomiernego poszerzenia obu ścian;
- allied plates o typowym rozmiarze 2–4 komórki × 3–6 wierszy oraz enemy slabs
  bez powtarzalnej diagonalnej siatki;
- po dwie kompletne baterie na stronę z rekordami muzzle position;
- jawny routing ANTIC 4: allied armour przez `COLPF1=$84`, enemy armour przez
  D7=1 i `COLPF3=$44`, z review identycznych pikseli także przy `$46`;
- skończony ciąg `ENGINES/AFT/COMBAT/FORWARD/PROW = 32/24/128/24/32` z
  osobnymi rodzinami obu stron; lewa strona prowadzi prawą o 8 wierszy bez
  osobnego tempa;
- muzzle flash i engine glow jako współdzielone/komponowane glify; damaged i
  burning pozostają przyszłymi stanami;
- final-art candidate: dwa ciągłe, wielokomórkowe rdzenie lewej rufy i dwa
  szersze kanciaste rdzenie prawej, trzy fazy co 8 ramek bez checkerboardu;
  oba prows używają odrębnych profili 8→1 z częściową krawędzią i terminal tip;
- zwykły P1/P2 fighter ma 16 HPOS szerokości i jeden kontrakt `[80,176)` dla
  spawn, steering i render clamp, więc nie nachodzi na side hull;
- przewijane wejście, 22-wierszowy drain i jawny `COMPLETE` zsynchronizowane z
  sector controller;
- source assets i deterministyczna konwersja/podgląd.

### Zależności

Baza wizualna działa w skończonym korytarzu vertical slice. Obecny controller
udostępnia stan `COMPLETE`; późniejszy encounter director nadal musi zdecydować
o zapowiedzi, bonusie i przejściu do następnego sektora.

### Kryteria akceptacji

- strony i frakcje pozostają czytelne na realnym sygnale PAL;
- owner akceptuje `gameplay-screen.png` i pełny `capital-hulls-strip.png`;
- każda mapa ma 32 wiersze, nie jest lustrem drugiej i ma co najmniej dwie
  kompletne baterie;
- nominalne 24 komórki walki nie spadają poniżej 23 w aktualnym segmencie;
- segmenty nie nadpisują HUD-u ani aktywnych PMG;
- normal/damaged/burning różnią się bez polegania na pojedynczym niestabilnym
  kolorze;
- przejście nie pokazuje nieprzygotowanej pamięci obrazu;
- źródła assetów pozostają edytowalne i wersjonowane.

### Dowody pamięci i wydajności

Pełna karta dowodów oraz liczba znaków/tiles, charset pressure, rozmiar map
segmentów, koszt przewijania najgorszej ramki, częstotliwość aktualizacji
animacji i ewentualny koszt DLI. Bieżące źródło ma 31 glifów/248 B, 320 B
pakowanych map, 32 B codebooków, 14 B metadanych, 8 B harmonogramu, 268 B
modułów/sekwencji/masek, 128 B profili/granic prow oraz 576 B map runtime.
Nie przechowuje surowej mapy
240×16.
Po korekcie pacingu hull zachowuje 100% legacy world rate i występuje
20/22,5/25 razy na sekundę. Near event używa 70%, a far 35% tej częstości;
najcięższa kopia near kosztuje konserwatywnie około 15 300 cykli, a hull event
około 11 600 cykli. PMG pozostaje bez zmian; dwa gameplay DLI należą wyłącznie do
mieszanej warstwy HUD z kamienia 11.

### Wykluczenia

Destructible batteries, boss, damage/burning decals, komunikat sector clear,
bonus i wybór następnego sektora pozostają późniejszą pracą.

## 10. Broadside, crossfire i trafienia kadłubów — kandydat gameplay gotowy do akceptacji

### Zakres

- source-derived controller dla deterministycznych salw;
- M0 pozostaje wyłącznie zarezerwowane dla broni gracza, bieżący burst Vipera
  używa puli ANTIC 4, a M1–M3 tworzą stałą pulę warning/impact;
- 25-ramkowe warningi compact/medium/hot przy rzeczywistych wylotach i
  czytelne linie ognia;
- wspólne collision/damage resolution dla Vipera, Cylon fighters
  i przeciwnego capital ship;
- source-derived kontakt Vipera z nieregularną krawędzią obu kadłubów,
  clamp P0/P3 oraz wspólny 25-ramkowy damage cooldown;
- brak faction immunity;
- pięcioramkowe impact states, 20 punktów damage gracza i możliwość zwabienia
  przeciwnika w ogień burtowy;
- dwufazowy 8×6 ANTIC 4 lozenge lecącego sluga i czteroramkowy
  niekolizyjny flash przy realnym wylocie;
- skończony 240-wierszowy sektor od banków silników do terminalnych bow tips,
  z combat-only batteries, `DRAIN` i deterministycznym `COMPLETE`;
- dwa 24-ramkowe, hull-attached czerwone impact overlays 3×3 oraz
  deterministyczny POKEY channel-4 crack/rumble tylko dla trafienia przeciwnego kadłuba;
- saturating hit counters obu kadłubów bez ich zniszczenia w tym kamieniu.

### Zależności

Zaakceptowana przez ownera baza grafiki i muzzle metadata z kamienia 9.
Bieżący vertical slice nie miał pełnego modelu obrażeń, dlatego ten kamień
dodaje tylko minimalny licznik 100–0 i deterministyczny powrót do istniejącego
menu. Sektor udostępnia czysty stan `COMPLETE` przyszłemu encounter director.

### Kryteria akceptacji

- identyczny ciężki pocisk może trafić każdy dozwolony cel na swojej trasie;
- wynik zależy od danych kolizji, nie od przypadkowej kolejności procedur;
- ostrzeżenie pozostawia osiągalną reakcję;
- cooldown/exclusion nie pozwala broadside zablokować jedynej drogi ucieczki;
- trafienie przeciwnego kadłuba kończy pocisk, uruchamia dokładnie jeden duży
  impact i dokładnie jeden SFX bez zmiany collision envelope;
- `EASY/MEDIUM/HARD` przesuwają pełny wiersz dokładnie 8/9/10 razy na 20
  ramek (160/180/200 scanlines/s); `HARD` zachowuje zaakceptowany szybki
  kandydat, warning nie ma niewidocznej fazy, a gwiazdy nie wywołują kontaktu;
- hull stream wykonuje 100% tych zdarzeń (160/180/200 scanlines/s), near
  dokładnie 70%, a far 35%, bez zmiany ruchu fighter fire i capital slugs;
- segment zawiera po jednej funkcjonalnej baterii na stronę zamiast dwóch,
  usunięte pozycje mają nieinteraktywną strukturę, a scheduler wybiera
  najstarszy bezpieczny widoczny emplacement żądanej strony;
- scheduler pracuje w ramkach PAL niezależnie od scrollu i nadal używa
  odstępów 68/126/68/138. Przy szybszym skończonym sektorze realizuje
  odpowiednio 3/2/2 warningi i launchy na EASY/MEDIUM/HARD, po czym
  `DRAIN` blokuje nowe źródła bez anulowania rozpoczętych efektów.

### Dowody pamięci i wydajności

Limit wynosi trzy sloty; stan i scratch zajmują 48 B bez nowego zero page.
Trudność zajmuje 1 B odzyskanego RAM, a tabela rates 3 B.
Harmonogram ma 8 B, maski missile 6 B, tabele szerokości 6 B, offsety rekordów
2 B, dwa rekordy wylotów 14 B, 6 B stawek world/hull, 3 B granic bezpiecznego
warningu, a wygenerowane granice kontaktu 64 B. Runtime broadside wraz z
procedurami HUD, sektora, eksplozji, POKEY, fundamentem rosteru i pierwszym
profilem Raider burst, korektą transition i wspólną fighter explosion zajmował
w zaakceptowanym checkpointcie 5630/5632 B w odzyskanym RAM, a jego
4714-bajtowy pakowany ogon dawał payload 12 906 B. Starfield candidate przenosi
176 B wspólnych procedur z tego bloku bez zmiany ich zachowania. Bieżący speed
pass z obsługą sesyjnego TOP zajmuje 5525/5632 B BROADSIDE oraz 1146/2230 B
STARFIELD. Sam
zaakceptowany broadside przed rosterem zajmował 4605/3749 B i
payload 11 941 B. Rozdzielenie scrollu
dodało 47 B resident state i 560 B payloadu względem kandydata 9834 B;
eksplozje i audio dodały 27 B trwałego stanu. Detektor z
clampem ma około 333 cykli, a konserwatywny worst case systemu broadside około
1795–1820 cykli na ramkę. VBI ma delta 0; dwa gameplay DLI HUD-u dodają
121 cykli ciał rutyn na ramkę bez `WSYNC` (konserwatywnie do 349).
Rozdzielone bounded kopie kosztują około 15 300 cykli dla near eventu i
około 12 050 dla hull eventu z lookupem modułu; konserwatywny wspólny worst
case z trzema slotami, flashami, dwiema eksplozjami, POKEY, kolizją, profilem
prow, per-type clampem i nowym Raiderem to około 33 420 cykli bez fighter
explosion. Po odzyskaniu 23. wiersza wspólny world+hull step finalizuje
boundary/muzzles tylko raz; wynik zaakceptowanego checkpointu z oboma slotami
explosion wynosił około 33 380 i zostawiał około 2120 cykli. Po dodaniu dwóch
faz starfield, akumulatora Raidera i ograniczonej obsługi TOP bieżący source
bound wynosi około 34 230 cykli, z około 1270 cykli zapasu;
zero-page delta wynosi 0 B.

### Wykluczenia

Bez guided rockets, permanent damage decals, destrukcji capital
ship, komunikatu/bonusu zakończenia poziomu, destructible weapon batteries,
advanced enemies, bossa, overlayów i ładowania sektorów z dysku.

### Opcjonalny późniejszy pass różnorodności wizualnej kadłubów

Po akceptacji mechaniki można osobno rozważyć więcej wymiennych sekcji,
mniej oczywistą repetycję, dodatkowe plate breaks, maintenance bays i damaged
bands, kolejne sylwetki emplacementów oraz lokalną aktywność impact/muzzle.
Jest to opcjonalny polish, nie potwierdzony defekt mechaniki. Nie uzasadnia
zmiany z ANTIC 4 wyłącznie dla dekoracji i nie jest częścią bieżącej korekty.

## 11. Czytelny HUD ANTIC 2 i nowy font — kandydat gotowy do akceptacji

### Zakres

- jeden 40-kolumnowy wiersz HUD ANTIC 2 nad 23 wierszami playfieldu ANTIC 4;
  ósmy scanline fontu tworzy separator bez osobnego wiersza ekranu;
- dedykowany 1024-bajtowy charset `$5000-$53FF`, budowany z czystych glifów
  6×7 przy wyłączonym DMA;
- tekstowe `SCORE`, `LIFE` i `HULL` mają niezależne kanoniczne źródła, a
  dynamiczne score, cyfra całkowitych żyć i zdrowie `100/090/.../000` są
  kodami znaków w screen RAM; placeholdery `ARM`/`FUEL` usunięto;
- dwa ograniczone DLI przełączają `CHBASE=$50/$44` oraz paletę dokładnie na
  granicach HUD/playfield.

### Zależności

Akceptacja timingu, damage i powrotu do menu z kamienia 10. Ten kamień nie
zmienia playfieldu broadside, który pozostaje ANTIC 4.

### Kryteria akceptacji

- tekst jest czytelny na PAL CRT i nie zmienia geometrii 8+24+8;
- trzy cyfry `LIFE` aktualizują się tylko po inicjalizacji lub damage;
- gameplay palette, PMG i broadside pozostają bez regresji.

### Dowody pamięci i wydajności

Font zajmuje 1024 B odzyskanej pamięci, ale screen pozostaje 960 B. Korekta
HUD/kadłubów zwiększa payload o 190 B względem kandydata 9644 B i relokowany
runtime o 177 B. Dwa ciała DLI kosztują łącznie 121 cykli na ramkę bez
oczekiwania `WSYNC`, konserwatywnie do 349 cykli z dwoma pełnymi waitami; VBI
ma delta 0. Ostateczna stabilność granicy trybów wymaga Atari800 i 65XE PAL.

### Wykluczenia

Bez nowych weapons, enemies, debris, repair drone lub zmian salwy.

## 11A. Dwuwarstwowy PAL starfield — kandydat do testu ownera

### Zakres

- near layer z trzema zwartymi glifami, dokładnym rate `7/10` względem hull i
  średnią gęstością 8,625 znaków w 23-wierszowym viewporcie;
- 24-rekordowy far layer z trzema stalowo-niebieskimi glifami i dokładnym
  rate `7/20` względem hull, czyli połową prędkości near;
- osobny deterministyczny seed `$A7`, generacja tylko w odsłanianym górnym
  wierszu oraz pojedynczy bezpieczny twinkle co 16 PAL frames;
- jawna kolejność background/overlays i backing fighter/capital projectiles;
- clipping broadside do kolumn 9–30 i stopniowa rekonstrukcja pełnej szerokości
  po `COMPLETE`.

### Dowody pamięci i wydajności

Starfield dodaje 48 B glyphów, 102 B własnego stanu oraz współdzieli blok bez
zero page z obsługą TOP; 1146 B kodu/tabel leży pod `$555A-$59D3`, a 2 B
sesyjnego TOP pod `$4ED7-$4ED8`. Część bloku odzyskuje 176 B z wcześniej
prawie pełnego BROADSIDE. PMG delta wynosi 0. Pakowany ogon ma 989 B,
payload 13 829 B, XEX 13 841 B, ATR 92 176 B. Bounded far pass skanuje
24 rekordy wyłącznie przy zdarzeniu warstwy, nie cały ekran co ramkę; source
bound pozostawia około 1270 cykli do konserwatywnej ramki PAL 35 500.

### Wykluczenia

Bez nebuli, planet, księżyców, distant battle, debris, asteroid, wrecks,
obstacles, nowych przeciwników i zmian timingu broni.

## 12. Zaawansowani enemies: Minelayer, Rammer, Heavy i Ace

### Zakres

- Minelayer z ograniczoną liczbą persistent hazards;
- Rammer z czytelnym telegraphingiem i bez nieuniknionej szarży;
- Heavy assault fighter z większą odpornością i krótką serią;
- Ace/command fighter łączący istniejące zachowania jako miniboss;
- nowe exclusion rules w encounter director.

### Zależności

Kamienie 5–7 i 10; wspólny model encji, pocisków, obrażeń i eventów.

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

## 13. Boss lub objective capital ship

### Zakres

- co najmniej jeden boss albo wieloetapowy cel związany z capital ship;
- fazy zapisane kompaktowymi deskryptorami i współdzielonymi zachowaniami;
- wybrane cele, na przykład baterie, mogą przyznawać score;
- pełne przejście do zakończenia celu i dalszego stanu gry.

### Zależności

Kamienie 9–11.

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

## 14. Audio, balans, long-duration i real-hardware release validation

### Zakres

- docelowe, nowo stworzone audio POKEY i pełny zestaw potrzebnych SFX;
- strojenie damage, score, fal, eventów i sector durations;
- długotrwałe testy seedów, restartów i granic liczników;
- testy emulatorów oraz prawdziwego 65XE PAL przez SIO2SD;
- finalne XEX, ATR, źródła, dokumentacja i checksums.

### Zależności

Kamienie 1–12.

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
