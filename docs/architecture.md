# Dark Fighter — architektura

Dokument rozdziela dwie warstwy:

1. **potwierdzoną bieżącą implementację**, którą można wskazać w kodzie,
   linker map, labels i testach;
2. **docelową architekturę przyrostową**, która opisuje granice przyszłych
   systemów, lecz nie twierdzi, że są już zaimplementowane.

Kanoniczne reguły gry znajdują się w `docs/game-design.md`, a kolejność prac
w `docs/roadmap.md`.

## Potwierdzona bieżąca implementacja

### Model wykonania

Program przejmuje ekran i po starcie nie korzysta z usług DOS-u. XEX i ATR
zawierają ten sam payload ładowany pod `$2000`. Pierwsze 8192 B pozostaje pod
`$2000-$3FFF`; the 5612-byte packed tail at `$4000` is expanded before the
loader by the bounded decoder into `$5E10-$780E`. The second 1699-byte
starfield/music stream is preserved at `$7810-$7EAA` and expands after the
loader to `$552A-$5D99`. A bounded 226-byte product-preserving A2 kernel is
copied from the same payload to unconditional RAM at `$9000-$90E1`, and the
651-byte packed ENTITY_CODE tail expands to `$9100-$93D7`. Dopiero
potem bitmapa loadera może nadpisać przejściowe źródła. XEX uruchamia etykietę `start`,
a bootowalny ATR wczytuje kolejne sektory i dochodzi do `start` przez
`DOSVEC`. Bieżący gameplay jest jednym resident programem; title loader jest
jedyną fazą ładowania.

Po loaderze program wchodzi do osobnej pętli frontendu. Gameplay nie uruchamia
się sam; wybór `START GAME` przechodzi przez jedną procedurę resetu i dopiero
wtedy wchodzi do istniejącej głównej pętli:

`start_gameplay` resides in `CODE`, while `main_loop` resides in the
non-contiguous relocated `BROADSIDE` segment. Setup therefore ends with an
explicit `JMP main_loop`; an assembled-opcode regression verifies both `$4C`
and the linked target so execution can never fall through into the next
resident helper.

1. czeka na kolejną ramkę przez polling `VCOUNT`;
2. odczytuje joystick i FIRE oraz aktualizuje stałą pulę burst Vipera;
3. aktualizuje pojedynczego przeciwnika;
4. przechwytuje wszystkie potrzebne latch'e PMG, zachowuje kontrakt M0,
   aktualizuje trzy sloty broadside i dopiero potem zapisuje `HITCLR`;
5. akumuluje legacy world rate jako zegar kadłubów; kadłuby i przyczepione
   warningi zachowują 100% tej stawki, near stars 50%, far stars 25%, a
   neutralny debris 60%;
6. aktualizuje krótkie efekty POKEY, a następnie przy włączonej opcji wykonuje
   jeden bounded tick muzyki gameplay.

This is not yet the final scheduler. The numeric player hull, death/respawn,
terminal Game Over lifecycle and one neutral debris are implemented;
procedural waves, the encounter director and repair drone are not. Bieżący vertical slice ma finalną bazę graficzną
bocznych kadłubów i działający, deterministyczny prototyp crossfire M1–M3,
z 24-ramkowym SFX trafienia capital hull. Nadal nie ma trwałych damage decals,
zniszczenia capital ship ani encounter directora. Po jednym pełnym obrocie
ringu w stanie `COMPLETE` runtime przechodzi do legalnego otwartego stanu
`OPEN`; nie dodaje komunikatu ani bonusu. Kolizja gracza z obecnym
przeciwnikiem tylko resetuje przeciwnika, uruchamia dźwięk i krótką zmianę tła.

### Zaakceptowany loader i przejście

1. Kod wyłącza NMI, DMA, PMG i dźwięk.
2. Rozwija 2027-bajtowy LZ-10/5 do 7680-bajtowej bitmapy
   `$4010-$5E0F`.
3. Instaluje `loader_dli`, synchronizuje początek ramki i włącza DLI oraz
   mieszany playfield DMA: ANTIC F dla tytułu i statku, ANTIC E dla footera.
4. Wyświetla dokładnie 250 kompletnych ramek PAL bez odczytu joysticka i FIRE.
5. Wyłącza NMI i DMA, czyści rzeczywiste strony PMG `$3B00-$3FFF`, zachowuje
   non-DMA RODATA pod `$3800-$3AFF`, kopiuje gameplay charset oraz
   buduje osobny frontend charset `$4800-$4BFF`.
6. Renderuje main menu i jego statyczne warstwy P0/P2/P3 przy wyłączonym DMA,
   a przed widoczną częścią świeżej ramki włącza mieszany playfield oraz
   player DMA. Jedno DLI po dolnym dividerze ustawia neutralną paletę hintu.

Loader ma 192 linie po 40 B: linie 0–163 są bitmapą ANTIC F 320 px, a linie
164–191 bitmapą ANTIC E 160 px z wartościami 0/2 mapowanymi na `COLBK/COLPF1`.
Pierwsze LMS wskazuje `$4010`; drugie, po 102 liniach, wskazuje `$5000`.
Dwa DLI zmieniają kolory po liniach 39 i 163. Udokumentowana górna granica
jednego wywołania DLI z oczekiwaniem `WSYNC` wynosi około 160 cykli. Loader
nie dodaje pracy do gameplay main loop ani gameplay VBI po przejściu.

### Frontend i przejście do gameplayu

The explicit states are `loader`, `main menu`, `options`, `top scores`,
`exit confirmation`, `exited`, `gameplay`, and `game over`. Entry procedures set the state,
zerują wybór tam, gdzie jest to wymagane, renderują ekran przy wyłączonym DMA
i nie polegają na fall-through pomiędzy niezależnymi stanami. Frontend raz na
ramkę czeka przez `VCOUNT`, pobiera joystick portu 1 i FIRE, a następnie
wykonuje najwyżej jedno zdarzenie po pełnym neutralnym puszczeniu wejścia.

Menu, opcje, tabela wyników, potwierdzenie i ekran końcowy współdzielą
`$4000-$43FF` i osobny frontend charset `$4800-$4BFF`. Gameplay zachowuje
charset `$4400-$47FF`. Tylko main menu włącza P0/P2/P3:
P0 rysuje jasny kadłub, P3 bursztynowy silnik, a P2 dwa czerwone światła.
Warstwy są zapisane raz przy wyłączonym DMA, a pozostałe ekrany wyłączają PMG.
Main menu ma 820 B jawnie wyliczonych wierszy o szerokości 20 lub 40 B:
ANTIC 7 dla tytułu, ANTIC 6 dla opcji, ANTIC 4 dla hangaru/dekoracji oraz
ANTIC 2 dla dolnego hintu. Sub-screeny używają jednolitego ANTIC 2.
Frontend charset przechowuje 42 zwarte glify 6×7 oraz kopie 16 istniejących
glifów strukturalnych ANTIC 4. `frontend_hint_dli` działa raz na ramkę main
menu; po widocznym obszarze pętla przywraca paletę główną. Nie ma DLI per opcja.
`TOP SCORES` generuje dziesięć wierszy przy wejściu. Pierwszy pokazuje
sesyjny TOP aktualizowany przez `max(TOP, SCORE)` po każdej punktacji; pozostałe
wiersze zachowują szablon `--- 000000`. TOP przeżywa śmierć, respawn, game over
i nową grę, ale pełny restart programu zeruje go. Nie ma SIO, zapisu ATR,
inicjałów ani trwałego formatu.

`START GAME` remains the only entry into gameplay. It disables DMA, PMG, and
NMI; silences POKEY; clears PMG and the shared screen; initializes the complete
gameplay state; restores the display and objects; clears collision latches;
and enables PMG/DMA before a fresh frame. A separate FIRE gate requires a
release before the first shot. The last-life path retains the 24-frame death explosion, then
enters a text-mode Game Over screen exactly once. That transition leaves the
gameplay loop before input, weapons, collision, spawn, world, or scoring work.
The screen displays final `SCORE` and session `TOP SCORE`; its release gate
requires FIRE-up followed by a fresh FIRE-down before returning to the menu.

### Menu and gameplay POKEY music

The main menu owns all four POKEY voices while it is active: channel 1 is a
low drone, channel 2 a heavy ritual drum, channel 3 a military pulse/metallic
accent, and channel 4 the sparse C-Dorian motif. No music runs during the
loader, submenu screens, or Game Over.

Gameplay uses at most two voices. Channel 1 carries the low combat ostinato
only while the established Viper-shot timer is zero; channel 2 carries the
alarm arpeggio only while the established hit timer is zero. Those SFX retain
their original `$A8`/`$88` controls, envelopes, timing, and update order, while
music uses the deliberately quieter `$A2`/`$A3` controls. Channel 3 remains
the continuous engine bed and channel 4 remains the capital-hull explosion;
gameplay music never writes either channel and never writes `AUDCTL`. Thus an
SFX always preempts music, and the cached current music note returns after the
SFX timer expires without resetting song position.

`music_init`, `music_start_menu`, `music_start_gameplay`, `music_tick`,
`music_tick_gameplay`, and `music_stop` form the runtime boundary. Entering the
main menu restarts the menu score at its first row; all other frontend
transitions stop it. A fresh `START GAME` stops menu music, initializes the
unchanged gameplay SFX, and starts the gameplay score from row zero only when
both `SOUND` and `GAME MUSIC` are ON. Ordinary death continues the transport
while muting idle music-owned voices; respawn restores the current voices.
Game Over stops the player and clears POKEY. Returning to the main menu starts
the menu theme from its beginning independently of the gameplay option.

Physical `OPTION` is sampled directly from `CONSOL=$D01F` before
`frame_counter` or any simulation routine. Its active-low bit uses a release
latch, so one press enters `STATE_PAUSED` once and a fresh press resumes once.
While paused, a dedicated loop runs only the console-key edge detector and the
release-gated joystick/FIRE menu. It never calls world scroll, starfield, AI,
weapons, collision, damage, scoring, animation, death, respawn, invulnerability,
SFX update, or either music tick.

Pause entry disables DMA/PMG/NMI, mutes POKEY without changing SFX timers or
music transport, and copies the complete 960-byte gameplay screen to
`$7810-$7BCF`. The released starfield staging allocation owns that backup after
startup. The existing frontend display list, charset, ASCII renderer, and
marker renderer then draw `RESUME`, `GAME MUSIC`, and `QUIT TO MENU`; no pause
bitmap exists. Resume restores the screen and gameplay display state. Existing
music resumes from its cached transport position, while OFF-to-ON starts row
zero only after resume. A confirmed quit clears projectile, enemy, effect,
starfield, collision, and gameplay state before entering the main menu without
passing through Game Over. SCORE and TOP are not written by the quit path.

The editable menu source is `assets/music/menu-theme.json`;
`scripts/menu-music.mjs` validates it and generates the ca65 include during
every build. A menu pattern is 16
rows of four one-byte tokens. `$00` means HOLD, `$10` means REST, and all other
tokens encode a four-bit instrument and four-bit frequency-table index. The
12-entry order table selects seven reusable patterns arranged as intro,
development, climax, and return. One row lasts exactly eight PAL frames, so the
seamless loop is 1536 frames or 30.72 seconds at 50 Hz. A four-bit ownership
mask remains explicit player state.

The editable gameplay source is `assets/music/gameplay-theme.json` and is
compiled by `scripts/gameplay-music.mjs`. It reuses the menu frequency table
but has independent patterns and order data. Each 16-row pattern stores one
byte per row: the high nibble is channel 1 and the low nibble channel 2;
`0=HOLD`, `1=REST`, and `2..15` select one of fourteen frequency entries. Six
patterns feed a 16-entry intro/development/climax/return order. At six PAL
frames per row the seamless loop is also 1536 frames, or 30.72 seconds.

Menu music costs 216 B of player code, 513 B of score data, and 6 B of shared
transport state. `music_tick` costs about 13
cycles while inactive, 21 cycles on a non-row menu frame, and conservatively
less than 560 cycles on an eight-frame row boundary. It is called before the
same-frame joystick/FIRE poll only on the main menu.

Gameplay music adds 226 B of specialized player code, 124 B of packed score
data, four transient cached register bytes, and one persistent option byte. It
adds no zero-page, PMG, DLI, VBI, dependency, or runtime tracker allocation.
The main-loop guard means OFF performs no player call and no gameplay-music
POKEY write. Executing the linked release player measures 42 cycles on its
shortest tick and 245 cycles on its heaviest row/order tick. The complete
generated timing report, rather than a hand-added source estimate, lives under
`runtimeTiming` in the release manifest and is described in
`docs/runtime-headroom.md`. The
music player alone raised the packed payload by 333 B from the accepted
menu-music build; gameplay music plus PAUSED now use a bounded 1094 B delta.
The packed format has no command stream: a row is one byte containing two
nibbles, and the generated `GAME_MUSIC_EVENTS_PER_TICK_LIMIT=1` assertion
hard-limits every tick to one event read. This bound is included in the
256-cycle worst-row figure.

`SOUND` jest jednym bajtem RAM, domyślnie ON. OFF blokuje zapisy uruchamiające
SFX, wycisza cztery kanały POKEY i nie zmienia kolejności ani timingu
gameplayu. `EXIT` nie próbuje wracać do DOS-u: po potwierdzeniu wycisza audio,
wyłącza PMG, pokazuje ekran końcowy i wykonuje wyłącznie ograniczone czekanie
na kolejne ramki aż do RESET.

`GAME_MUSIC_ENABLED` is one byte of reclaimed RAM at `$4EE3`, defaults to ON,
and is shared by the main OPTIONS screen and PAUSED menu. It persists across
games during one program run and is not stored to ATR. OFF affects neither the
menu theme nor any SFX. Toggling OFF in PAUSED clears only music transport and
idle channel-1/2 registers; active SFX timers and channels 3-4 are untouched.

`DIFFICULTY_SETTING` jest jednym bajtem odzyskanego RAM pod `$4E70`, domyślnie
`MEDIUM`. Frontend zmienia go wyłącznie LEFT/RIGHT z zawijaniem
`EASY/MEDIUM/HARD`; wejście do gameplayu zeruje fazę akumulatora, ale nie sam
wybór. Dzięki temu ustawienie trwa przez powroty do menu w jednej sesji.

### Obraz i PMG

- Gameplay używa wspólnego ekranu `$4000-$43FF`: górny wiersz to
  40-kolumnowy ANTIC 2 HUD, a 23 wiersze poniżej pozostają ANTIC 4. Ostatni
  scanline każdego używanego glifu HUD tworzy jednoliniowy biały separator.
  HUD ma
  dedykowany charset `$5000-$53FF`; playfield zachowuje charset
  `$4400-$47FF`. Frontend używa tego samego bufora z własnym charsetem
  `$4800-$4BFF`; mieszany main menu ma wiersze 20- i 40-bajtowe, a sub-screeny
  40-kolumnowy ANTIC 2.
- Kadłuby używają dotychczasowego world rate `8/9/10` przy mianowniku 20:
  `EASY` daje dokładnie 20 wierszy/160 scanlines/s, `MEDIUM` 22,5/180, a
  `HARD` 25/200. Ośmiokolumnowe masy obu statków, wyloty, warningi i granice
  kolizji zachowują 100% tej stawki. Pełny krok ma 8 scanlines i występuje
  najwyżej raz na ramkę; nie jest to ANTIC fine scrolling. Po launchu M1–M3
  poruszają się nadal o 2 HPOS/ramkę, a scheduler broni nadal liczy ramki PAL.
- Starfield ma dwie warstwy wyprowadzane z hull/world eventu. Warstwa near jest
  autorytatywnym tłem w screen RAM: generuje najwyżej jedną z trzech figur
  w nowo odsłoniętym górnym wierszu i używa dokładnego akumulatora `1/2`,
  czyli 50% prędkości kadłubów. Warstwa far ma stałą pulę 24 rekordów i osobny
  akumulator `1/4`, czyli 25% prędkości kadłubów. Każdy rekord przechowuje
  tylko flagę renderu, dokładny adres
  komórki i jeden z trzech kodów. Far zapisuje się wyłącznie na `CH_SPACE`,
  jest zdejmowany przed kopią world i ponownie nakładany po niej. Fighter fire
  oraz capital slug przechwytują ten złożony kod jako backing, dlatego po zejściu
  obiektu wraca bieżąca gwiazda, a nie hardkodowana pustka. Kolejność dwóch
  fighter overlays jest odwracana przy kasowaniu, więc nakładające się obiekty
  nie przywracają starej warstwy ponad nadal aktywną.
- Pełny kontrakt backed overlays renderuje od dołu do góry:
  base/ring → broadside shell → fighter projectile → interactive entity →
  transient effect. Następna ramka usuwa dokładnie w odwrotnej kolejności:
  effect → entity → fighter projectile → broadside shell → lower/base.
  ENTITY backing może zatem legalnie zawierać shell lub projectile. Erase
  entity wykonuje się przed A2 rotation; render dopiero po scroll/update.
  PMG jest sprzętowo niezależne od tego stosu.
- W broadside obie warstwy generują tylko w bezpiecznych kolumnach 9–30;
  8/31 pozostają pod kontrolą backingów granic i wylotów, a kolumny kadłubów
  nigdy nie są dotykane przez starfield. Po `COMPLETE` nowo odsłaniane wiersze
  rozszerzają tło do 0–39 bez osobnej pauzy lub pełnoekranowego redraw.
- Seed `$A7`, gęstość near `3/8`, populacja far 24, proporcje `1/2` i `1/4`
  względem hull oraz szesnastoramkowy
  timer twinkle i wybór specjalnego near star co `1/8` są wygenerowanymi
  parametrami z `assets/graphics/starfield.json`. Twinkle zmienia najwyżej jeden
  aktualnie widoczny far glyph i najpierw potwierdza jego screen code, więc nie
  prześwituje przez overlay gameplayu.
- Dwa oryginalne side hulls i efekty używają 31 glifów w istniejącym 1024-bajtowym
  gameplay charset. Osobne mapy 32×9 B są przechowywane w payloadzie w
  postaci 320 B danych pakowanych plus dwa 16-bajtowe codebooki. Dwa
  rekordy baterii po 7 B podają stronę, wiersz segmentu, kolumnę i scanline
  wylotu, kierunek, typ oraz rzeczywisty screen code wylotu. Obie mapy mają po
  siedem cyklicznych przejść inner-depth i używają głębokości 5/6/7/8; każdy
  odcinek stałej głębokości trwa 2–8 wierszy. Dwa lokalne, kilkurzędowe
  cofnięcia o jedną komórkę zwiększają profil o około 12,5% szerokości
  nominalnego ośmiokolumnowego pasa, bez poszerzania całej ściany.
  Allied glyphs używają D7=0, ale ich pancerz jest zbudowany przede wszystkim
  z pikseli `10`, które wybierają stalowy `COLPF1=$84`; `COLPF2=$1E` jest
  zarezerwowany dla żółtego ognia Vipera/Colonial i nielicznych jasnych
  punktów energii. Enemy glyphs używają D7=1, więc ich główne piksele `11`
  trafiają do czerwonego `COLPF3=$46`. Piksele `10` nadal wybierają wspólny stalowy
  `COLPF1=$84`, a `00` czarne `COLBK=$00`.
- `START GAME` jednorazowo rozwija mapy do `$4C00-$4E3F` (576 B) przy
  wyłączonym DMA. Koszt jest ograniczony do około 27 000 cykli setupu i nie
  występuje w widocznej pętli. Współdzielone wskaźniki loadera są wtedy martwe,
  więc zero page nie rośnie.
- Player 0 to korpus Vipera, Player 3 jego pomarańczowy silnik.
- Player 1 to obecny korpus przeciwnika, Player 2 czerwony skaner.
- M0 pozostaje wyłącznie zarezerwowane dla broni gracza, ale szybki burst jest
  renderowany przez niezależną pulę glifów ANTIC 4, aby uzyskać literalne
  `COLPF2=$1E` bez recoloru P0. M1–M3 rezerwują stałą pulę broadside
  dla warningów i impactów; po launchu capital slug jest
  dwukomórkowym overlayem ANTIC 4 sterowanym nadal przez ten sam logiczny
  slot; oba kody tła są zachowywane i odtwarzane;
  wszystkie cztery missiles współdzielą bajt każdego scanline pod `$3B00`.
  Maski M1/M2/M3 to `$0C/$30/$C0`, a maski czyszczące `$F3/$CF/$3F`, dzięki
  czemu rysowanie lub kasowanie jednego slotu nie zmienia pozostałych par
  bitów. `SIZEM=$54` ustawia podwójną szerokość M1–M3, zachowując parę M0.
- Loader nie używa PMG.
- Main menu czasowo używa P0 i P3 dla powiększonego istniejącego Vipera oraz
  P2 dla światła identyfikacyjnego. `START GAME` czyści PMG, przywraca
  `SIZEP0/SIZEP3=$01`, `COLPF2=$1E` i `COLPF3=$46` przed gameplayem.

### Stan, losowość i audio

The current state uses 32 zero-page bytes at `$0080-$009F`. It includes
pozycje gracza i jednego przeciwnika, timery, score BCD, prosty
`rng_state`, pointers used by scrolling/decompression, and one OPTION release
latch. Ordinary enemy
zachowuje swój mały deterministyczny generator, natomiast starfield ma osobny
LFSR pod `$4ED1` i jawny seed `$A7`, więc jego układ nie zależy od ruchu ani
respawnu przeciwnika i nigdy nie czyta niezainicjalizowanego RAM.

Viper przesuwa się bocznie o 2 HPOS w każdej aktywnej ramce. Raider zachowuje
soft pursuit i kierunek `-1/0/+1`, lecz istniejący bajt `$4ECC` jest jego
akumulatorem: krok 2 HPOS występuje w dokładnie 4 z 5 aktywnych ramek. Maksimum
wynosi więc 8 HPOS wobec 10 HPOS Vipera w pełnym oknie, dokładnie `4/5`.
Faza akumulatora zaczyna deterministycznie od zera po spawnie Raidera, utracie
życia gracza i rozpoczęciu nowej gry.

Frontend dodaje 7 bajtów ZP: 5 bajtów trwałego stanu przejść/opcji/bramek oraz
2-bajtowy wskaźnik używany podczas renderowania. Trudność zajmuje poza ZP jeden
bajt pod `$4E70`; istniejący bajt `$008A` zmienił rolę z timera na akumulator.
POKEY generuje osobne krótkie
dźwięki strzału i trafienia oraz ciche tło silnika, o ile `SOUND` jest ON.
Nie ma jeszcze docelowego odtwarzacza ani budżetu audio.

### Broadside runtime, scheduling i damage

M1, M2 i M3 dziedziczą `COLPM1=$84`, `COLPM2=$46` i `COLPM3=$28`; dlatego
koloru lecącego capital sluga nie można bezpiecznie uzależnić od tych
rejestrów. Każdy slot ma jawny stan
`FREE/WARNING/FLYING/IMPACT`. Każda z dokładnie 25 ramek warningu jest
widoczna: ramki 0–7 mają 2 scanlines i normalną szerokość, 8–16 mają 4
scanlines i szerokość double, a 17–24 mają 6 scanlines i pulsują grupami po
dwie ramki między double i quad. Efekt rośnie wyłącznie w stronę corridor,
pozostaje przy przewijającym się wylocie i kończy się double-width bez skoku
położenia do lecącego pocisku. Lecący slug nadpisuje dokładnie dwie sąsiednie
komórki ANTIC 4 i pulsuje co dwie ramki między istniejącymi glifami lozenge.
Ma 8 jednostek HPOS szerokości, 6 scanlines wysokości i 40 zajętych native
pixeli; allied wybiera `COLPF2=$1E` (yellow-gold), a enemy D7=1 i
`COLPF3=$46` (crimson). Przesuwa się logicznie o 2 HPOS na ramkę, nie homuje,
a swept collision obejmuje pełne 8×6 i poprzednie/aktualne położenie. Overlay
zapisuje i przywraca oba dokładne kody tła, nie używa `COLPM`, `SIZEM` ani DMA
missiles, więc P0–P3, M0 i czerwony scanner nie migają. Impact nadal używa
tego samego zarezerwowanego slotu M1–M3, ma 8 scanlines, miga przez 5 ramek i
wraca do `FREE` bez osobnego PMG. Na launch powstaje czteroramkowy,
niekolizyjny glif muzzle flash; do końca timera pozostaje przy źródłowym
wierszu działa i jest przywracany z właściwego modułu kadłuba.

Źródłowy, 8-bajtowy harmonogram wybiera kolejno stronę enemy, allied, enemy,
allied, nie konkretny rekord działa. Bazowe odstępy 2/31/2/37 ramek są mnożone w konwerterze
przez 2 i otrzymują stały 64-ramkowy calm interval; runtime zużywa gotowe
odstępy 68/126/68/138 bez mnożenia lub dzielenia w 6502. Scheduler pracuje
wyłącznie w ramkach PAL, niezależnie od obu zdarzeń scrolla i trudności. Na
każdej okazji skanuje stałe dwa rekordy i wybiera najstarszą kwalifikującą się
baterię żądanej strony, czyli tę najbliższą dolnej granicy strefy. Kandydat
musi być w pełni widoczny, niewykorzystany w bieżącym przejściu segmentu,
niezarezerwowany i mieć miejsce na 25 ramek warningu oraz jeden pełny wiersz
marginesu. Dla `EASY/MEDIUM/HARD` ostatni bezpieczny wiersz środka działa to
odpowiednio 16/15/14. Po zniknięciu realnego wylotu lifecycle może zostać
użyty ponownie przy następnym module combat. Trzy sloty i retry po
7 ramkach pozostają bez zmian; brak kandydata opóźnia ten sam event.
Odległość aktywnych torów musi wynosić co najmniej 24 scanlines, a w
jednej ramce wolno rozpocząć najwyżej jeden warning i wystartować najwyżej
jednemu pociskowi. W jednym skończonym sektorze symulacja realizuje po cztery
warningi i launchy na każdym poziomie trudności; pozostałe próby nie mają jeszcze
bezpiecznego widocznego źródła. Żaden rozpoczęty warning nie jest anulowany,
a po `PROW` scheduler nie tworzy nowego. Warning nadal trwa dokładnie 25
ramek, a prędkość pocisku nadal wynosi 2 jednostki HPOS na ramkę.

### Skończony sektor dwóch okrętów

Broadside nie zapętla już 32-wierszowej mapy bez końca. Jeden wspólny licznik
podłużny przechodzi kolejno przez `ENGINES 32`, `AFT 24`, `COMBAT 128`,
`FORWARD 24`, `PROW 32`, razem dokładnie 240 wierszy na okręt. Lewa strona
prowadzi prawą o niezmienne 8 wierszy; nie ma drugiego akumulatora ani
możliwości dryfu. Po wprowadzeniu wiersza 239 generator wpisuje 22 puste
wiersze, przechodzi przez `DRAIN` i osiąga `COMPLETE` dopiero po zaniku
M1–M3, warningów, czteroramkowych flashów i 24-ramkowych eksplozji kadłuba.
`COMPLETE` trwa następnie dokładnie 22 kroki near/A2 ring, potrzebne do
odbudowania całego A2 ringu pełnoszerokim starfieldem, po czym przechodzi w
`OPEN`.

Sektor jest złożony z ośmiowierszowych modułów, nie z surowej mapy
240×16. Każda strona ma 12 modułów opisanych 96 B indeksów źródłowych oraz
30-bajtową sekwencję; dwie maski engine overlay zajmują 16 B. Prow, forward,
aft i engines używają oddzielnych rodzin i nie tworzą funkcjonalnych dział.
Combat powtarza cztery zatwierdzone moduły, zachowując cztery baterie na stronę
w wierszach allied 64/96/128/160 i enemy 68/100/132/164. Ostatnie osiem
wierszy combat jest jawnie niekwalifikujące się do nowego warningu. Każdy bank
silników otwiera teraz sektor: dwie oddzielne apertures lewej strony mają do
dwóch komórek szerokości, a dwa regularne, kanciaste zespoły prawej do trzech.
Maski rozszerzają rdzenie, oddzielają je ciemnym spine i kończą energię przed
pełnymi oprawami przechodzącymi w aft machinery. Dwa glify energii mają po
trzy fazy (dim/bright/residual) i są kopiowane do istniejącego charsetu co
8 ramek, bez PMG, DLI i kolizji. Ostatnie 32 wiersze używają dwóch różnych
32-bajtowych masek zajętości oraz dwóch 32-bajtowych tablic granic HPOS.
Oba prows schodzą przez siedem poziomów z 8 do 1 komórki; częściowe glify
krawędzi rysują ukośny terminal tip, po którym generator wydaje wyłącznie
pusty drain.

Zwykły hostile fighter używa jednego wspólnego renderera P1/P2 i indeksowanego
deskryptora archetypu. P1 niesie jednoramkowy mask body, P2 rzeczywisty
czerwony scanner; trzy fazy skanera wybierają jeden z trzech bajtów co osiem
ramek. Deskryptory przechowują wysokość, `SIZEP`, inset widocznego pierwszego
bitu, szerokość, logical/HPOS limits, offsety body/accent, liczbę klatek, HP,
BCD score, movement/weapon profile i flags. Nie ma osobnej ścieżki spawn,
movement, erase ani collision dla każdego typu.

Pass 1 linkuje trzy finalne maski: `RAIDER` 14 wierszy, double width i 16 HPOS;
`TALON` 16 wierszy, normal width i 6 HPOS; `SCYTHE_BOMBER` 16 wierszy, double
width i 16 HPOS. Ich logical bounds w corridor `[80,176)` wynoszą odpowiednio
`80..160`, `80..170`, `80..160`, natomiast bajtowe HPOSP bounds uwzględniają
inset Talona: `80..160`, `79..169`, `80..160`. Init, reset, oba kierunki
steering i końcowy renderer czytają aktywny deskryptor. Normalny release flow
ustawia wyłącznie `RAIDER`; Talon i Scythe występują tylko w kompilowanym
osobno harnessie, a ID 3–9 nie mają pointerów ani danych runtime i są odrzucane.

Kolizje fighterów używają wspólnych software envelopes: pocisk Vipera bada
pełny swept odcinek sześciu scanlines ruchu, contact bada widoczne prostokąty, a capital
shell porównuje poprzedni i bieżący poziomy zakres 8 HPOS z realną wysokością
i szerokością aktywnego archetypu. Transparentne padding i per-type HPOS nie rozszerzają obwiedni. P1 ma teraz
cylonowe burgundy `$44`, a P2 zachowuje czerwony `$46`; body dzieli hue `$4x`
z prawą burtą, lecz nie jej luminancję. Lewa burta pozostaje steel-blue `$84`,
a Viper `COLPM0=$0E` najjaśniejszym statkiem. Na czas eksplozji Raidera P1 jest
jawnie przełączany z powrotem na `$84`; wygaśnięcie enemy explosion slotu
przywraca `$44` przed narysowaniem następnego body, a wejście do nowej gry
powtarza ten zapis po przerwanym efekcie. Zaakceptowana eksplozja `$84/$46` nie zmienia
koloru. Pociski fighterów nie używają żadnego missile: dziesięcioslotowa pula
Vipera i dziewięcioslotowa pula Raidera zapisują przywracane kody ekranu oraz
korzystają ze wspólnych, prekompilowanych glifów fazowych ANTIC 4.

| Kontekst | P0 | P1 | P2 | P3 | M0 | M1–M3 |
| --- | --- | --- | --- | --- | --- | --- |
| Release/open-space | Viper body | Raider body `$44` | Raider scanner `$46` | Viper engine | M0 zarezerwowane, Viper burst w ANTIC 4 | M1–M3 wolne |
| Compile-time enemy review | Viper body | wybrany anchor body | anchor scanner | Viper engine | Viper burst w ANTIC 4 | M1–M3 wolne |
| Broadside | Viper body | aktywny Raider body | Raider scanner | Viper engine | Viper burst w ANTIC 4 | warning/impact M1–M3; oba fighter bursts i lecące capital slugs są niezależnymi overlayami ANTIC 4 |
| Hull explosion | bez zmiany | bez zmiany | bez zmiany | bez zmiany | bez zmiany | bez zmiany; efekt char-mode + POKEY |

`WEAPON_SINGLE_PULSE` pozostaje pierwszym ID profilu broni deskryptorowej, ale
jego bieżąca polityka runtime emituje szybki burst. Tylko
release `RAIDER` wybiera ID 1; Talon i Scythe wybierają `NONE`, a niewdrożone
ID nie mają wpisu runtime. Burst ma dokładnie 10 zaakceptowanych strzałów co
4 ramki PAL, po czym pauzuje 60/50/40 ramek dla EASY/MEDIUM/HARD. Odmowa
alokacji nie zmniejsza licznika, a pauza zaczyna się dopiero po dziesiątym realnym
strzale. Pocisk zaczyna
się pod ostatnim zajętym wierszem bieżącej maski, na środku realnej obwiedni,
ma 3 scanlines, szerokość 2 HPOS, damage 10, prędkość 5 scanlines na
ramkę i limit życia 96 ramek. Swept software collision bada przedział od
poprzedniego do nowego Y, zużywa pocisk po pierwszym kontakcie i przekazuje
damage do wspólnej gate lifecycle/invulnerability.

Release i każdy reuse zaczynają `enemy_y=GAMEPLAY_TOP-height`, czyli dla
Raidera pod Y=2. Renderer tnie P1/P2 do `[16,200)`, więc żaden piksel body ani
scanner nie trafia do HUD-u, a state burstu zaczyna dopiero po pełnym wejściu.
Pierwszy strzał powstaje naturalnie w chwili kwalifikacji; nie jest wymuszany.

Scheduler capital zachowuje własne M1–M3 i nie współdzieli ich już z Raiderem.
Dziewięć stałych slotów Raidera pozwala na kilka widocznych strzałów podczas
broadside bez wywłaszczenia lub zmiany typu aktywnego obiektu. Viper analogicznie
ma dziesięć slotów, emituje 10 strzałów co 3 ramki, po czym pauzuje 12 ramek;
prędkość wynosi 6 scanlines/rama. `DRAIN` i `COMPLETE` zatrzymują nowe moduły
capital ship, ale nie wykonują teardown broni fighterów: kontroler Vipera i
istniejące backing-aware sloty pracują dalej w każdym PAL frame. Świeże
naciśnięcie FIRE oraz FIRE trzymany przez granicę sektora zachowują zwykły
burst Vipera bez dodatkowej ciszy. Śmierć, respawn i rzeczywisty teardown
gameplayu nadal czyszczą logiczny slot, backing i owner atomowo. P1/P2
oznaczają zawsze jeden ordinary enemy, więc capacity pozostaje 1. Harness jest osobnym
artefaktem kompilacyjnym pod `build/enemy-review`; normalny XEX nie zawiera
jego dispatchu. Wejście do frontendu nadal czyści PMG, a `START GAME` ustawia
rozmiary/kolory z deskryptora przed pokazaniem przeciwnika, bez stale accent.

Nominalne 240 wierszy okrętu wynosi 24,0 s na `EASY`, 21,33 s na `MEDIUM` i
19,2 s na `HARD`. Wspólny stream obejmuje dodatkowe 8 wierszy stałej fazy i
23 wiersze zejścia odpowiadające pełnemu viewportowi. Bez przedłużających
efektów osiąga `COMPLETE` po 27,1/24,1/21,68 s; `DRAIN` może poczekać dłużej
wyłącznie na już uruchomiony
efekt. Scheduler nie przyspiesza ani nie tworzy nowego źródła po
sekcji prow. Po kolejnych 22 krokach `COMPLETE` przechodzi do `OPEN`, gdzie
entity scheduler wraca z normalnym 32-ramkowym opóźnieniem. Ten etap nie dodaje
komunikatu, bonusu ani nowego authored encounter.

Kolejność kolizji jest stała: na początku ramki zerowany jest akumulator
enemy damage, potem software Viper-projectile→fighter i Viper contact zgłaszają jawne źródła,
każdy capital shell wybiera pierwszy obiekt na swept torze, następnie badana
jest granica przeciwnego kadłuba i offscreen expiry. Jedno
`resolve_enemy_damage` niszczy przeciwnika i przyznaje score najwyżej raz, po
czym pojedynczy `HITCLR` czyści sprzętowe latch'e. Następnie, po ewentualnym przewinięciu świata, osobny
detektor kontaktu gracza sprawdza źródłową geometrię kadłubów. Allied heavy
niszczy hostile fighter bez score; enemy heavy może zniszczyć własny fighter
i wtedy daje pełny score aktywnego archetypu. Gdy Cylon slug przecina fightera
i Vipera, kierunek lotu rozstrzyga pierwszy obiekt i pocisk kończy się po jednym
trafieniu. Trafienie kadłuba skanuje rzeczywisty zapisany
wiersz ekranu od wnętrza corridor do pierwszego znaku z zakresu glifów hull,
więc respektuje kontur i wyloty, a nie gwiazdy. Dwa liczniki trafień saturują
na `$FF` i nie niszczą jeszcze capital ship.

Enemy damage ma jawne źródła w kolejności kredytu
`PLAYER_PROJECTILE`, `PLAYER_CONTACT`, `CAPITAL_CYLON`,
`CAPITAL_COLONIAL`, `ENEMY_PROJECTILE`, `CLEANUP`. Wszystkie trafienia w jednej
ramce są zgłaszane do 1-bajtowego saturującego damage i 1-bajtowego źródła;
najniższy ID rozstrzyga remis. Dopiero wspólne `resolve_enemy_damage` odejmuje
HP, przełącza living enemy w `EXPLODING` i czyta BCD score z deskryptora.
Player projectile, player contact i Cylon capital friendly fire dostają pełną
wartość archetypu (`RAIDER=10`), colonial capital i cleanup zero. Rozstrzygnięty
obiekt nie może zostać zniszczony lub policzony drugi raz w tej samej ramce.

Każde zaakceptowane trafienie przeciwnego kadłuba tworzy dokładnie jeden
24-ramkowy overlay 3×3. Dwa niezależne sloty — po jednym na stronę — zapisują
18 B backing, przywracają go przed ruchem, przesuwają pointer o ten sam krok
40 B co hull i ponownie przechwytują aktualny moduł/engine/flash przed
rysowaniem. Fazy 1/5/8/7/4/2 zajętych komórek dają core, czerwone rozszerzenie,
fireball, breakup i embers. Zapis następuje tylko nad rzeczywistym glifem
kadłuba, więc efekt jest clipped do bandu, nie zmienia tablic kolizji i nie
zużywa PMG.

During gameplay, POKEY channel 4 is a separate 24-frame capital-hull hit SFX. `AUDCTL`
pozostaje `$00`; tabela `AUDF4` przechodzi od 6 do 255, a noise/volume `AUDC4`
od `$8F` do `$81`, po czym następna aktualizacja zapisuje zero. Kanały 1/2/3
zachowują shot/hit/engine bed. Bramka `sound_enabled` zapobiega startowi przy
OFF. The shared `silence_audio` clears every frequency/control register, the
capital sound timer, and `AUDCTL` on every audio-owner transition.

Kolizja P0/P3 z capital hull nie używa `P0PF/P3PF`, ponieważ te latch'e nie
odróżniają kadłuba od gwiazdy. Konwerter generuje z tych samych 32 wierszy map
dwie 32-bajtowe tablice bezpiecznych granic HPOS, wraz z fizycznymi
projekcjami wylotów. Złączona obwiednia źródłowych warstw P0/P3 ma 8 jednostek
HPOS i 15 scanlines; procedura sprawdza najwyżej trzy aktualnie widoczne
wiersze, używając `corridor_phase` i licznika wprowadzonych wierszy. Lewa
granica to `48 + (ostatnia zajęta kolumna + 1) * 4`, a prawa to
`48 + pierwsza zajęta kolumna * 4`; zadeklarowana projection cell jest zwykłą
zajętą komórką tej konwersji. Lewy kontakt zachodzi dla
`player_x < allied_boundary`, prawy dla
`player_x+7 >= enemy_boundary`. Clamp zapisuje jedną wartość do `player_x`,
`HPOSP0` i `HPOSP3`; nie kopiuje ponownie danych PMG. Kontakt odejmuje 20,
korzysta ze wspólnego cooldownu 25 ramek, nie daje score i nie zmienia hull-hit
counters. Heavy hit ma pierwszeństwo damage w tej samej ramce i zawsze
przechodzi do `IMPACT`; późniejszy kontakt nadal clampuje, ale wspólna bramka
pozwala tylko na jedno odjęcie zdrowia.
W 32 wierszach PROW detektor wybiera zamiast bazowego konturu source-derived
profil częściowej krawędzi. Pusta komórka i dekoracyjny piksel poza profilem
nie rozszerzają pełnego bandu kolizji, natomiast ostatni rzeczywiście zajęty
fragment pozostaje solidny.

Pierwsza wersja detektora miała potwierdzony błąd aliasowania: prawa granica
i licznik wierszy leżały w `BROAD_WORK_VALUE/COUNT`, mimo że
`resolve_allied_sector_row` oraz `resolve_enemy_sector_row` używają tych samych
bajtów jako module-id/local-row scratch. Pierwszy realny wiersz kadłuba na
wysokości Vipera zastępował więc prawą granicę małym id modułu i niszczył
licznik pętli. Wyśrodkowane `player_x=$80` spełniało wtedy fałszywy test prawej
burty, a clamp przenosił statek w okolice lewej krawędzi. Runtime przechowuje
teraz liczbę wierszy oraz obie granice wyłącznie pod `$4EA5-$4EA7`; resolver
może swobodnie używać własnego scratch. Pętla nadal bada najwyżej trzy wiersze,
a pełnosektorowa symulacja sprawdza każdy section, oba offsety i puste wiersze
drain przy wyśrodkowanym graczu na wszystkich trudnościach.

HUD rozdziela teraz `LIFE` od `HULL`: `PLAYER_LIVES` zaczyna od trzech
całkowitych, grywalnych żyć i jest zmniejszany dokładnie raz przy wejściu w
lethal lifecycle, natomiast `HULL` pokazuje kanoniczne `BROAD_PLAYER_HEALTH`.
Health przechowuje dziesięć jednostek po 10 punktów, więc deterministyczna
konwersja na procent jest dokładna: `units * 10`, bez zaokrąglania. Każdy heavy shot obu stron jest groźny dla
P0/P3, ale jedna ramka może zastosować tylko jeden damage, a cooldown trwa 25
ramek. Po zejściu do zera sterowanie i FIRE gracza są blokowane przez
24-klatkową fazę `PLAYER_DYING`, która pokazuje wspólną eksplozję fightera;
świat, enemy, scheduler i istniejące M1–M3 nadal pracują. Lethal gate zmienia
stan i odejmuje jedno życie tylko raz.

Viper i Raider używają jednego zestawu sześciu masek 8×8. Każda faza trwa
cztery ramki: compact flash, cross, większy burst, maksimum, fragmenty i
embers. Dwa stałe sloty zachowują niezależne centra, więc eksplozja Vipera i
fightera mogą trwać równocześnie. Runtime usuwa normalny statek i scanner przy
wejściu w `EXPLODING`, blokuje jego ruch, broń, kontakt i dalszy damage, a po
24 ramkach czyści wszystkie bajty PMG. Maski korzystają z istniejących par
P0/P3 albo P1/P2 bez zapisów `COLPM`, więc nie zmieniają kolorów innych
obiektów. Respawn i licznik 250 klatek invulnerability zaczynają się dopiero
po ostatniej klatce eksplozji.

Full-screen fighter flash ma jednego właściciela w końcu `update_sound` i
zmienia wyłącznie `COLBK`. Gameplay DLI nadal przełącza `CHBASE` i
`COLPF0-COLPF3`, ale nie zapisuje `COLBK`, więc wybrany kolor pozostaje aktywny
przez właściwą część gameplayu. Tło HUD w trybie ANTIC 2 pozostaje dokładnie
czarne dzięki `HUD_COLPF2=$00`, dlatego sam HUD zachowuje czytelność. Dwa istniejące
`FIGHTER_EXPLOSION_TIMER` są jednocześnie fazą palety: enemy używa czterech
ramek `$1E,$3C,$1C,$34`, Viper sześciu
`$1E,$3C,$1C,$3C,$38,$34`, a następna ramka bezwarunkowo przywraca czarne
`$00`. Slot Vipera jest sprawdzany przez cały jego 24-klatkowy lifecycle:
pierwsze sześć klatek wybiera profil, a pozostałe wymuszają bazę, dlatego
enemy explosion nie może wejść po restore ani wygrać remisu. Wejście w dowolny fighter profile zeruje starszy
`damage_timer`, co uniemożliwia powrót fioletowego `$42` po sekwencji;
nieletalne trafienie bez eksplozji zachowuje dotychczasowy, ograniczony
damage flash. Pause zatrzymuje oba timery i pokazuje bazową paletę frontendu,
a resume zaczyna od `$00`. Mechanizm nie zapisuje `COLPM`, nie zmienia
lokalnych masek eksplozji i nie jest używany przez capital explosion ani
launch flash broadside.

Jeśli życie pozostaje, atomowy respawn zapisuje
`player_x=HPOSP0=HPOSP3=124` oraz `player_y=184`, przywraca 100 zdrowia i
wchodzi w `PLAYER_RESPAWN_INVULNERABLE`. Wspólna bramka ignoruje wtedy każdy
damage przez dokładnie 250 aktualizacji PAL, ale joystick i M0 pozostają
aktywne. P0/P3 są rysowane przez 8 klatek i czyszczone przez 8 klatek bez
ruszania współrzędnych, kolorów ani pozostałych PMG. Przed ustawieniem
`PLAYER_ALIVE` runtime zeruje robocze snapshoty kolizji programowych oraz
`HITCLR` i wymusza widoczny sprite. Rejestry GTIA są pobierane przed wspólnym
resolverem i czyszczone dopiero po zakończeniu jego pracy, ale kolorowe piksele
ANTIC 4 nie są traktowane jako autorytatywna geometria kadłuba. On the last
life, the 24th death update sets terminal `PLAYER_GAME_OVER` and branches once
into frontend state `STATE_GAME_OVER`. Frontend entry clears PMG and audio,
rebuilds the text screen with gameplay DMA/NMI disabled, and calls no gameplay
simulation routine. FIRE is release-gated before it can return to the menu.

Stan i scratch puli zajmują 48 B pod `$4E40-$4E6F`, ustawienie trudności 1 B
pod `$4E70`, a stan fazy hull, backing 23 widocznych wierszy dwóch granicznych
kolumn (stały divider plus 22 gameplay rows)
gwiazd i dwie flagi lifecycle zajmują 49 B pod `$4E71-$4EA1`. Trzy timery
flash, stan sektora i licznik drain dodają 5 B pod `$4EA2-$4EA6`. Trzy
izolowane bajty kontaktu oraz cztery bajty lifecycle/lives/invulnerability/blink
zajmują `$4EA7-$4EAD`,
bez delta zero page. Dwa timery/pointery/kolumny eksplozji, 18 B backing i
timer audio dodają 27 B pod `$4EAE-$4EC8`. Timer i faza trzyfazowej animacji
silników dodają 2 B pod `$4EC9-$4ECA`.
Aktywny indeks archetypu, akumulator ruchu/active flag oraz trzy bajty HP/pending
damage/pending source zajmują 6 B pod `$4ECB-$4ED0`; zero page pozostaje bez zmian.
Session TOP SCORE uses 2 B of packed BCD at `$4ED7-$4ED8`; current SCORE still
uses `$0090-$0091`. Shared music transport uses 6 B at `$4ED9-$4EDE`, gameplay
voice caches use 4 B at `$4EDF-$4EE2`, and the persistent option uses `$4EE3`.
Two tracked muzzle records use 6 B at `$4EE4-$4EE9`. Code, tables, and
relocated broadside/frontend/pause data occupy 6655/6656 B at `$5E10-$780E`.
Starfield, relocated shared procedures, option helpers, and both music players
occupy 2160/2278 B at `$552A-$5D99`. The pre-music portion includes 64 B of collision boundaries, 64 B of
prow occupancy profiles, 64 B of prow boundaries, HUD font construction, and
the Game Over formatter. The packed payload tails are deterministic LZ-10/5
streams of 5612 B, 1699 B and 651 B ENTITY_CODE; the product-preserving A2
kernel occupies 226/256 B at `$9000`. Sam bounded
detektor z clampem kosztuje konserwatywnie do około 333 cykli; nie wykonuje
pełnego skanu ekranu. Łączny koszt systemu po korekcie szacuje się na około
495 cykli bez aktywnego slotu, około 745 dla jednego warningu, około 775 dla
jednego lecącego pocisku bez kolizji i około 1795 w dotychczasowym worst case
trzech aktywnych slotów. Jednoczesny heavy impact i clamp pozostaje poniżej
około 1820 cykli. Zmiana tabeli schedulera nie zwiększa żadnej z tych ścieżek.
Nowy dispatch akumulatora kosztuje około 26 cykli bez scrolla i 23 przed
ścieżką scrolla, czyli konserwatywnie do 12 cykli więcej niż poprzedni timer.
Po odzyskaniu dodatkowego wiersza near event przenosi 484 komórki środka,
przesuwa 46 B
backingu, generuje gwiazdy i ponownie nakłada dwa źródłowe wyloty; hull event
przenosi 352 komórki mas kadłubów, aktualizuje fazę, warningi oraz flagi
lifecycle. Konserwatywnie kosztują odpowiednio około 15 300 i 11 600 cykli
przed generatorem sektorowym. Dwa bounded lookupy modułu, obsługa trzech
flashów i okresowa 16-bajtowa animacja silników podnoszą najcięższą wspólną
ścieżkę z trzema slotami, kolizją i clampem do około 29 850 cykli po dodaniu
dwóch krótkich dispatchy lifecycle i wspólnej damage gate. Pozostaje około
5650 cykli zapasu bez dużego impactu. Jedna aktywna eksplozja dodaje
konserwatywnie około 1250 cykli restore/recapture/render, dwie około 2450, a
obsługa POKEY mniej niż 50. Najcięższa wspólna ścieżka z dwiema eksplozjami
kadłubów, ale bez wspólnej eksplozji fightera, pozostaje poniżej około 33 420
cykli. Stacjonarny efekt zapisuje osiem scanlines wyłącznie na granicy
czteroramkowej fazy i czyści je raz przy expiry, a nie co PAL frame. Surowy
koszt zmiany obu slotów pozostaje poniżej około 1100 cykli; równoczesne stany
`DYING/EXPLODING` pomijają co najmniej około 640 cykli zwykłego inputu,
ruchu, sprite renderu, broni i kolizji. Te historyczne source estimates nie są
już timing gate. Bieżący artefakt mierzy najcięższą legalną ścieżkę jako
20 372 cykle CPU DMA-off wraz z released OPTION poll, dając 15 196 cykli
wyłącznie w metryce porównawczej. Dokładny trace zegara ANTIC w Atari800 mierzy
tę ramkę jako 32 731 cykli z DMA/DLI, czyli 2 837 cykli fizycznego headroom;
addytywne 33 252 pozostaje estymacją. Baseline 9 040 ramek, targeted replay 920
ramek, trzy cadence replays po 400 ramek, flash lifecycle 1 600 ramek i 1 200
ramek efektów z aktywnym rdzeniem oraz czterema fragmentami mają zero
opuszczonych synchronizacji, dodatkowych granic VBI i deadline overruns.
Accepted flash baseline pozostaje jawny jako 32 122/3 446; feature target/hard
gate 32 762/32 890 przechodzi z deltą +609. Szczegóły
oraz ograniczenia są w `docs/runtime-headroom.md`. A held OPTION after resume skips simulation until
release, so its debounce path cannot coincide with the heavy gameplay frame.
Aktualizacja TOP kosztuje najwyżej 48 cykli wraz z `JSR` tylko w ramce
punktacji; śmierć i respawn nie zapisują SCORE ani TOP. Hull zachowuje 100%
legacy world rate, near
wykonuje 50%, far 25%, a debris 60% jego zdarzeń; VBI pozostaje bez zmian.
VBI pozostaje bez zmian. Gameplay wykonuje dwa DLI na ramkę: pierwszy po
jedynym wierszu HUD-u przełącza `CHBASE=$44` i przywraca paletę ANTIC 4, drugi
po ostatnim wierszu playfieldu przywraca `CHBASE=$50` oraz neutralne
`COLPF1=$0E/COLPF2=$00` dla następnej ramki. Ciała mają odpowiednio około
66 i 55 cykli wraz z wejściem NMI, bez czasu oczekiwania `WSYNC`; z dwoma
konserwatywnymi pełnymi oczekiwaniami górna granica wynosi około 349 cykli na
ramkę. Pełny pomiar na 65XE PAL pozostaje bramką hardware acceptance ownera.

### Gameplay HUD ANTIC 2

Gameplay display list zaczyna aktywny obraz bez wewnętrznych blank instructions:
pierwszy widoczny scanline HUD-u to 8. Pobiera jeden 40-bajtowy wiersz spod
`$4000`: `$C2` to ANTIC 2 z LMS i DLI. Następny ANTIC 4 LMS zawsze wskazuje
divider `$4028` i nigdy nie uczestniczy w obrocie. Dokładnie 22 kolejne wiersze
ANTIC 4 tworzą ring `$4050-$43BF`; każdy ma osobny trzybajtowy LMS (`$44`, a
ostatni `$C4` z drugim DLI). Historyczne „23 gameplay rows” oznaczało divider
plus 22 właściwe wiersze. Dwie 75-bajtowe listy pod `$7F10-$7FA5` zachowują
stały HUD i divider, a zmieniają kolejność wyłącznie 22 LMS ringu. Common
world+hull event publikuje przygotowaną listę jednym page-local zapisem
`DLISTL`; przyszła nieaktywna lista powstaje w gwarantowanej lekkiej następnej
ramce. Niezależny hull-only event nadal kopiuje tylko boczne pasy. Kanoniczna
mapa wyświetlania to HUD scanlines `8..15` pod `$4000-$4027`, divider
`16..23` pod `$4028-$404F` oraz gameplay `24..199` pod `$4050-$43BF`.
Entity/effects używają wyłącznie ostatniego zakresu:
`logical_row=(Y-24)>>3`, dokładnie `0..21`; Y spoza `24..199` nie może
renderować ani kolidować.
Ostatni scanline glifów HUD jest pełnym białym separatorem; nie zajmuje drugiego
40-bajtowego wiersza. Ekran nadal zużywa 24×40 = 960 B;
PMG przeciwnika jest jawnie clipowane do gameplayu i nie może zapisać HUD-u.

`start` po zakończeniu loadera i przy wyłączonym DMA zeruje dedykowany
1-kilobajtowy charset `$5000-$53FF`, a następnie rozwija do standardowych
indeksów screen-code cyfry 0–9 i litery A–Z z edytowalnego źródła 6×7.
Ósmy scanline używanych glifów jest pełny i wspólnie tworzy separator.
HUD przechowuje normalne kody znaków w screen RAM: wynik jest aktualizowany
pod `$4006-$400A`, cyfra `LIFE` pod `$4012`, a zmienne cyfry `HULL` pod
`$401A-$401B`; końcowe zero i `%` pozostają statyczne pod `$401C-$401D`.
Wartość dziesięciu jednostek health skaluje się dokładnie do
`100/090/.../010/000` bez drugiego stanu zdrowia. `ARM` i `FUEL` były wyłącznie
statycznymi placeholderami bez readers, writers ani efektu gameplay i zostały
usunięte z HUD-u.

Każde przyznanie punktów wykonuje decimal-mode BCD add, następnie
`TOP=max(TOP,SCORE)` i na końcu zapisuje nowe cyfry SCORE pod `$4006-$400A`.
SCORE obejmuje wszystkie życia bieżącej gry: damage, śmierć, eksplozja,
zmniejszenie LIFE, respawn i game over nie zapisują licznika. Wyłącznie
`init_state`, called only by a fresh `START GAME`, clears SCORE but not the
session TOP. `TOP SCORES` and `GAME OVER` each convert the same two packed-BCD
bytes into six frontend screen codes on entry. The Game Over formatter reads
the untouched final SCORE and performs no score-state writes.

Przed włączeniem DMA `start_gameplay` instaluje `$50` w `CHBASE`, neutralne
`COLPF1=$0E`, `COLPF2=$00` i fazę DLI równą zero. DLI po dividerze instaluje
`CHBASE=$44` oraz kompletną paletę gameplayu przed pierwszym scanline ANTIC 4;
DLI po ostatnim wierszu `$84` przywraca `$50/$0E/$00` w następującym blanku.
Obie ścieżki zachowują A przez `PHA/PLA`, nie modyfikują X/Y i synchronizują
zapisy przez `WSYNC`. Frontend przy wejściu nadal wyłącza NMI i wybiera własną
display list, więc gameplay HUD ani menu PMG nie przeciekają do sub-screenów.

### Entity/effects foundation, visual polish i destructible debris

Foundation uses two fixed SoA pools with no dynamic allocation. Interactive
state occupies `$8000-$805F`: 16 global bytes and twenty four-byte arrays for
four physical slots, while release allocation is capped at slot zero. Effects
occupy `$8080-$80F3`: 8 global bytes and eighteen six-byte arrays for six
physical slots, with release active limit five. `$8060-$807F` and
`$80F4-$80FF` are explicit
padding/tail, not assumed-zero RAM. Startup and every new game clear the full
`$8000-$80FF` page, then install deterministic spawn timer 32 and RNG seed
`$65`. An executable cold-boot test fills the page with `$A5`, runs the packed
XEX and ATR bootstrap path, compares all 256 bytes and checks guard bytes.

`ENTITY_CODE` runs at `$9100-$93D7` and is stored as a 651-byte LZ-10/5 boot
tail. It is unpacked before broadside, after which the shared self-modifying
decoder is explicitly re-armed. Build/manifest validation proves XEX/ATR
payload parity, exact round trips, non-overlap, and exclusion of
`$A000-$BFFF`. `$8100-$8FFF` and `$93D8-$9FFF` remain reserved rather than
being consumed automatically.

The visible-frame order is bounded: reverse erase, update, render. Empty masks
early-out; the linked empty wrapper costs 78 CPU cycles. Logical Y is the only
authoritative vertical position. A physical ring pointer is cached only after
render and consumed by erase before any A2 rotation. `MULTICELL`, `drawn_mask`
and the existing four backing arrays already cover a 2×1 object without new
state: this renderer sets mask `$03`, stores the left/right cells in
`backing0/backing1`, caches their shared-row left pointer, and erases right
before left. `backing2/backing3` remain reserved and unused.

The single neutral debris descriptor and eight glyphs 110–117 come from
`assets/graphics/entity-effects.json`: a dense asymmetric armour shard and an
open truss fragment, each filling a 16×8 bounding box with two tumbling phases.
The enlarged armour phases contain 47 lit ANTIC pixels each (+30.6% from the
owner-retested shapes), while the open truss phases contain 45 (+32.4%). Its independent LFSR
first chooses variant, initial phase and one of three trajectories (`straight`,
`slight-left`, `slight-right`), then chooses one of three source-derived safe
columns 18..20. It spawns at Y=24, advances +8 in exactly three of every five
`WORLD_ROW_ADVANCED` events, and despawns after Y=199. `ENTITY_TIMER` is the
vertical modulo-five accumulator; tumbling and lateral
movement also occur only on that event. The signed profiles use 0/-4/+4 HPOS;
the two drifting profiles use the separate `ENTITY_MOVE_ACCUMULATOR`, move one
character after every four events and need no edge bounce across the full
two-cell width. Empty scheduling uses the low timer (32 frames after game/open,
64 after a despawn or deferred attempt); its high byte counts the 22
`COMPLETE` reconstruction events. The debris event is emitted at the 100%
legacy world tick; the
`COMPLETE` high timer is deliberately decremented only after an actual near/A2
ring rotation, so all 22 physical rows are rebuilt before `OPEN` re-arms the
normal 32-frame delay. `ENTITY_SPAWN_PHASE` remains a cleared reserved
diagnostic byte.

The rejected build compared `CAPITAL_SECTOR_STATE >= DRAIN` and therefore
classified the later numeric `OPEN` state as permanently illegal. It also had
no transition-owned scheduler re-arm. The fixed predicate admits states below
`DRAIN` and exactly `OPEN`, while still blocking `DRAIN/COMPLETE`; the explicit
22-row completion counter performs the re-arm at the first legal sector
boundary without clearing the pool or consuming entity, Raider, starfield or
weapon RNG.
Contact delegates to `apply_player_damage(1)`: successful damage removes
the debris, while invulnerability leaves it active and the shared damage gate
limits the frame to one player-damage event. Fragments remain collisionless;
no booster, drop, score or Raider migration is enabled.
The half-open horizontal collision interval is the complete visible 16-pixel
(8 HPOS) width and the vertical interval is the complete eight scanlines.

The descriptor now carries the existing category flag `SHOOTABLE`, but debris
remains a neutral interactive entity and never enters enemy HP, death, score or
full-screen-flash handling. `update_fighter_projectiles` moves each active
Viper slot and resolves its existing swept interval before `entity_effects_update`
can test player contact. The ascending slot scan therefore makes the lowest
matching Viper slot the sole consumer in a frame. `ENTITY_HP` starts at 3;
nonlethal hits consume the shot, clear `SHOOTABLE` until entity update, and
reuse `ENTITY_OWNER` for the two-frame inverse/local hit feedback. The third
hit deactivates debris before player contact, so the entity cannot be rendered
again in that frame. Reverse erase has already restored both backed cells.
Raider and broadside projectiles do not call the neutral-target dispatcher.

When the same Viper shot intersects debris and the release Raider, the target
whose lower edge is met first by upward flight wins; an exact lower-edge tie
selects debris. Carry remains reserved for the existing enemy-damage queue,
while debris clears the projectile directly without score or full-screen
flash. On final damage, slot 0 becomes a five-frame local core and slots 1..4
become four 30-frame fragments. The fragments take fixed left-up/right-up/
left-down/right-down steps of ±2 HPOS and ±2 scanlines every active PAL frame,
plus the shared downward world event, and alternate glyphs 118/119. Their
normal, inverse and flickering render codes form the yellow/red/fade sequence
without touching gameplay RNG or collision paths. Core renders first and
fragments render over it; reverse erase scans slots 5..0 and restores each
exact `BACKING0` byte. The existing low spawn timer temporarily holds 65 after
final damage so later slots remain active in the same scan; the ordinary
empty-pool update immediately reduces this to the normal 64-frame repeat
delay. No BSS byte is added and no immediate replacement is created.

## Aktualny obraz pamięci i nośnika

Poniższe kategorie są celowo osobne. Wolne miejsce w jednej nie może być
przedstawiane jako wolne miejsce w innej.

| Kategoria | Potwierdzony stan bieżący | Bramka dla przyszłych zmian |
| --- | --- | --- |
| 1. Pojemność ATR | Standardowy ATR ma 92 176 B pliku: 16 B nagłówka i 92 160 B danych, czyli 720 sektorów po 128 B. Duża część obrazu jest pusta. | Wolne sektory nie zwiększają resident RAM i nie uzasadniają same w sobie modułów ładowanych podczas gry. |
| 2. Boot payload i sektory startowe | Payload is exactly 16,384 B in 128 full sectors. The 16,380-byte linked/packed core contains the fixed `$2000-$3FFF` block, 5612 B broadside, 1699 B starfield, 226 B A2 kernel and 651 B ENTITY_CODE; a source-owned `DFB1` trailer occupies `$5FFC-$5FFF`. Formatter padding is forbidden. XEX is 16,396 B including headers/RUNAD. The loader field technically accepts 1–255 sectors, but release build and validation require exactly 128 without changing loader or format. | Raportować osobno rozmiar payloadu, liczbę sektorów, source-owned trailer, XEX headers i granice czasowe relokacji. Nie podnosić ani nie rozluźniać inwariantu 128 sektorów bez owner approval. |
| 3. Resident gameplay RAM | CODE/RODATA occupy `$2000-$3FF3`; the hull maps use 576 B at `$4C00-$4E3F`, persistent state ends at `$4EE9`, HUD charset uses `$5000-$53FF`, projectile/far-star state uses `$5400-$5529`, starfield/shared/music runtime uses 2160/2278 B at `$552A-$5D99`, and broadside/frontend/pause runtime uses 6655/6656 B at `$5E10-$780E`. A2 LMS/ring state uses 203 B at `$7F10-$7FDA`; ENTITY_STATE uses `$8000-$80FF`, A2 kernel `$9000-$90E1`, and ENTITY_CODE 728/3840 B at `$9100-$93D7`. | `$8100-$8FFF` and `$93D8-$9FFF` stay reserved rather than being consumed automatically. `$A000-$BFFF` remains excluded until PORTB/BASIC-ROM mapping is proved on XEX, cold ATR and hardware. |
| 4. Pamięć przejściowa loadera | Before the loader, `$4000-$5FFB` contains packed broadside/starfield, A2 source and ENTITY_CODE; `$5FFC-$5FFF` is the `DFB1` trailer. Startup expands ENTITY_CODE first, expands broadside at `$5E10`, stages the 1699-byte starfield stream at `$7810-$7EAA`, and copies A2 to `$9000-$90E1`. The raw loader bitmap then occupies `$4010-$5E0F`; its 1997-byte source at `$3827` is consumed before the 35-byte display-list stream at `$33C0` expands over it. | Koszt i zakresy rozpakowań/kopii raportować jako setup/transient, nie jako stały gameplay asset. |
| 5. Pamięć odzyskiwalna po przejściu | Only actual single-line PMG DMA pages `$3B00-$3FFF` are cleared. `$3800-$3AFF` contains non-DMA resident/loader RODATA and is preserved. After unpacking, `$7810-$7BCF` is reused only while PAUSED and `$7F10-$7FDA` holds A2 state. Frontend uses `$4800-$4BFF`, maps/state `$4C00-$4EE9`, HUD charset `$5000-$53FF`, projectile/far state `$5400-$5529`, starfield runtime `$552A-$5D99`, broadside runtime `$5E10-$780E`, entity state `$8000-$80FF`, A2 `$9000-$90E1`, and entity code `$9100-$93D7`. | Reuse wymaga jawnej rezerwacji, testu przejścia i aktualizacji memory map. Nie ma dynamicznego allocatora. |
| 6. PMG | PMBASE `$3800`; missiles `$3B00-$3BFF`: M0 pozostaje wyłącznie zarezerwowany dla player weapon, M1–M3 dla warning/impact broadside. P0/P3 to Viper hull/engine, P1/P2 hostile hull/scanner. Viper i Raider burst oraz lecące capital slugs używają przywracanych znaków ANTIC 4, więc nie przejmują missile ani `COLPM`. | Każda zmiana ról, multipleksowania lub trybu DMA wymaga limitu obiektów, kosztu i testu PAL/real hardware. |
| 7. Display memory i charset | Wspólny ekran `$4000-$43FF`; gameplay charset `$4400-$47FF`; frontend charset `$4800-$4BFF`; HUD charset `$5000-$53FF`. Starfield occupies indices 1–6, Viper fire starts at 11, hull/effects at 59, Raider fire at 90, neutral debris uses indices 110–117 and fragment phases 118–119, leaving 120–127 free. Main menu uses 820 B, sub-screens/gameplay 960 B. Two 75 B LMS lists preserve HUD `$4000`, divider `$4028` and rotate exactly 22 rows `$4050-$43BF`. | Kolejne glify wymagają ponownego audytu indeksów, bitów koloru ANTIC 4 i guard bytes; każdy runtime charset nadal ma dokładnie 1024 B. |
| 8. Zero page | Linker reports 32 B at `$0080-$009F`; removal of three unread bullet mirrors recovered 3 B. The declared `$0080-$00FF` region retains 96 unassigned bytes. | Każda funkcja podaje delta ZP; wolnych bajtów nie przydziela się bez audytu konfliktów i czasu życia. |
| 9. Koszt widocznej ramki | The destructible-debris build executes linked NMOS 6502 bytes over 9,040 deterministic frames, a 920-frame targeted replay, 1,200 cadence frames, 1,600 fighter-flash lifecycle frames and 1,200 destruction-effect frames. The legal-heavy loop is 20,364 cycles DMA-off with 15,204 comparison headroom. Atari800 measures 32,719 wall and 2,849 physical headroom; all replays have zero missed synchronisations, extra VBI boundaries and deadline overruns. The observer records 90 frames with all five effects, including 18 final-hit spawns and active debris after the capital sector. Four additional 750-frame PAL boot-smoke sessions cover XEX/ATR with `$A5/$5A` cold RAM and capture frames 1/250/300/500/750. | Accepted flash baseline is 32,122/3,446. The target/hard deltas are +640/+768, with a 2,800 minimum headroom; actual wall delta is +597. Inactive-debris and no-Viper dispatch deltas remain +18/0 CPU cycles against +32/+48 limits. |
| 10. Jednorazowy setup/transition | `start` expands 651 B into 728 B ENTITY_CODE, clears 256 B BSS, expands 5612 B into 6655 B broadside, preserves 1699 B at `$7810`, expands it into 2160 B starfield runtime and copies 226 B A2 kernel. Pause enter/exit still copies 960 B only with gameplay DMA disabled. | Nie sumować setup cost z kosztem stałej pętli; ograniczyć i mierzyć osobno przejścia sektorów, restart i inicjalizację poziomu. |

The main linker block ends RODATA at `$3FF3`, with 12 fixed fill bytes through
`$3FFF`; the payload then continues with
packed tails of 5612 B and 1699 B, the 226 B A2 kernel source and 651 B packed
ENTITY_CODE until startup relocation. These tails are not
resident display memory or a representation of all free Atari RAM.
Dokładne role czasowe pozostają w `docs/memory-map.md`.

## Odrzucony spike architektoniczny: osobny playfield broadside ANTIC 2

Owner porównał oba rendery i podjął wiążącą decyzję: produkcyjny broadside
pozostaje ANTIC 4. ANTIC 2 poprawiał cienkie linie, lecz odbierał scenie kolor,
głębię i atmosferę. Ta sekcja zachowuje **niezintegrowany, odrzucony prototyp
jako evidence**; nie jest roadmapą implementacji. Bieżący XEX i ATR zachowują
ANTIC 4 dla całego playfieldu pod HUD-em; wyłącznie jeden górny wiersz HUD-u
używają ANTIC 2.
Edytowalne źródło `assets/graphics/capital-hulls-antic2-prototype.json` oraz
renderer preview sprawdzają, czy chwilowa scena broadside zyskuje dostatecznie
dużo czytelności przy przejściu na monochromatyczne 320 px.

### Potwierdzone ograniczenie i proponowana organizacja

Opcode display list ustala tryb ANTIC dla całej poziomej mode line. Nie można
więc zbudować w jednym scanline układu `ANTIC 2 | ANTIC 4 | ANTIC 2`, a zmiana
kolorów w połowie linii nie zmienia interpretacji bitów. Cycle-exact kernel
poziomy nie jest proponowany: nie ma pomiaru potwierdzającego stabilne 50 FPS
PAL ani real hardware.

Proponowana osobna display list zachowuje 24 blank scanlines, potem HUD pod
`$4000` jako `$44` (ANTIC 4 + LMS), divider pod `$4028` jako `$84` (ANTIC 4 +
DLI), 22 wiersze `$02` (ANTIC 2) pod `$4050-$43BF` oraz JVB. Ma 32 B. ANTIC 2
i ANTIC 4 pobierają tu po 40 screen bytes na wiersz i po osiem scanlines, więc
całe obecne `$4000-$43FF`, 840-bajtowa kopia scrolla i faza 32-wierszowej mapy
pozostałyby geometrycznie zgodne. Historyczny spike poprzedzał wybór trudności;
produkcyjny ANTIC 4 używa teraz akumulatora 8/9/10 zdarzeń na 20 ramek PAL.

`CHBASE` obowiązuje globalnie. Historyczny spike zakładał charset
`$5000-$53FF`, który kopiowałby wszystkie 1024 B zaakceptowanego charsetu
`$4400-$47FF`, a następnie
podmieniałby 176 B indeksów 59–80 i 16 B indeksów gwiazdy/kropki. HUD zachowuje
te same indeksy i bytes. Mapy 32×9 B i rekordy czterech wylotów pozostają
źródłem prawdy; przy zapisie prawego kadłuba generator musi maskować
`screenCode & $7F`, ponieważ bit 7 oznacza w ANTIC 2 inverse, a nie bank PF3.
Ten historyczny adres jest obecnie zajęty przez produkcyjny font HUD i nie
jest rezerwacją dla prototypu; ewentualny powrót do spike'u wymagałby nowego
audytu wyrównanego zakresu.

Playfield broadside jest uczciwie monochromatyczny: po dividerze pojedynczy
DLI ustawia `COLPF1=$0A`, `COLPF2=$00`, `COLBK=$00`. Bit 0 daje prawdziwą
czerń, a bit 1 neutralną stalową luminancję. Allied/enemy różnią się gęstością,
konturem, płytami i wnękami, nie fałszywym kolorem. P0 pozostaje jasnym
myśliwcem gracza, P3 bursztynowym silnikiem, P1 przeciwnikiem, P2 czerwonym
skanerem, a M0 był ówczesnym pociskiem gracza. Historyczny preview spike nie przydzielał
M1–M3; bieżący runtime ANTIC 4 wykorzystuje je już w osobnym systemie opisanym
powyżej.

### Przygotowanie i atomowe przejścia

Kopiowanie i patchowanie charsetu (około 10 495 cykli dla kopii 1 KB oraz
około 2 700 cykli dla 192 B podmian) musi być wykonane wcześniej, poza VBI,
przy wyłączonym DMA albo w rozłożonej fazie setupu. Widoczna zmiana może potem
zmieścić się w jednym vertical blank bez wyłączania DMA, o ile scheduler
gwarantuje wejście przed pierwszą widoczną linią i wszystkie dane są gotowe.

Sekwencja wejścia do broadside:

1. ustaw sector state na przygotowany broadside i `NMIEN=$00`;
2. ustaw `DLISTL/H` na broadside display list i `CHBASE=$50`;
3. ustaw `VDSLST` na ograniczony DLI palety;
4. ustaw dla HUD zaakceptowane `COLPF0=$0E`, `COLPF1=$84`, `COLPF2=$28`,
   `COLPF3=$44`, `COLBK=$00` oraz `PRIOR=$00`;
5. zapisz `HITCLR`, następnie włącz tylko DLI przez `NMIEN=$80`.

Sekwencja wyjścia do zwykłego lotu:

1. ustaw `NMIEN=$00`;
2. przywróć normalne `DLISTL/H`, `CHBASE=$44` i pełną paletę
   `$0E/$84/$28/$44/$00`;
3. potwierdź `PMBASE=$38`, `SIZEP0..3=$01`, `SIZEM=$54`, `PRIOR=$00` i
   `GRACTL=$03`;
4. przywróć normalny generator tła/interpretację kolizji, zapisz `HITCLR` i
   pozostaw gameplay DLI wyłączone.

Nie jest potrzebny OS call. Sam zestaw zapisów wejścia szacuje się na około
82–90 cykli 6502, a restore na około 100–120 cykli; oba mieszczą się w VBI.
DLI playfieldu używa tylko A, `WSYNC`, trzech zapisów koloru i RTI; jego
konserwatywny worst case wraz z oczekiwaniem pozostaje poniżej około 160 cykli
na ramkę broadside. Jeśli przyszły scheduler nie zagwarantuje wejścia w VBI,
bezpiecznym fallbackiem jest jedna kompletna czarna ramka z `DMACTL=$00`, nie
częściowo przełączona ramka.

### Pamięć, CPU i kolizje

Historycznie szacowany dodatkowy resident asset to 1024 B wyrównanego
charsetu kadłubów. Screen,
mapy, metadata, PMG i zero page mają delta 0 B. Linkowane źródło glifów miałoby
192 B; osobna display list 32 B. Kod kopiowania, DLI i dwóch przejść nie jest
jeszcze zaimplementowany, więc jego uczciwy próg planistyczny wynosi około
225–275 B, dając przewidywany payload delta około 449–499 B. Rzeczywisty delta
musiałby pochodzić z linker map ewentualnej przyszłej integracji. Spike ma
payload delta 0 B i nie rezerwuje RAM; `$5000-$53FF` należy teraz wyłącznie do
produkcyjnego HUD-u.

Spike nie zmienia produkcyjnych, rozdzielonych kopii world/hull ani PMG.
Historyczny szacunek pełnej wspólnej kopii 840 B został zastąpiony bounded
ścieżkami 462 komórek środka i 336 komórek kadłubów. ANTIC 2
i 4 pobierają tę samą liczbę bytes ekranu i glifów; dokładny
rozkład DMA steals nadal wymaga pomiaru Atari 65XE PAL.

Bieżąca logika odczytuje latch'e PMG–PMG dla pocisków i fighterów, natomiast
kontakt gracza i trafienia capital hull rozstrzyga z wierszowej geometrii
źródłowej; nie zależy od `P0PF/P3PF` ani od gwiazd. Pozostałaby więc bez zmiany.
Sprzętowe latch'e PMG–playfield miałyby w ANTIC 2 inną semantykę pojedynczej
płaszczyzny niż cztery role ANTIC 4. Przyszłe trafienia side hulls muszą użyć
wierszowych bounds/masek i istniejących metadanych muzzle jako źródła prawdy,
z `HITCLR` na obu przejściach, zamiast polegać na kolorowym banku znaku.

Pełny ANTIC F 320×192 został odrzucony dla tego kierunku: wymaga 7680 B
bitmapy zamiast 1024 B charsetu, nie współdzieli tanio obecnych map znakowych i
komplikuje przewijanie. ANTIC 2 nie będzie integrowany. Jego source-derived
previews pozostają tymczasowo w worktree wyłącznie do chwili akceptacji
następnego kandydata ANTIC 4.

## Docelowa architektura przyrostowa

### Jeden resident gameplay program

Zgodnie z ADR-004 normalne poziomy działają bez dostępu do dysku. Title loader
pozostaje jedyną obecną fazą ładowania, a XEX i ATR są samowystarczalne.
Treść ma być organizowana jako małe tabele i współdzielone procedury, ale nie
powstaje spekulacyjny overlay manager, format mission packages, relokacja,
save state ani level-loader API. Opcję podziału wolno ponownie rozważyć dopiero
po zmierzeniu presji resident RAM.

### Granice podsystemów

Poniższe granice są **planowane**. Dokładne struktury bajtowe i adresy zostaną
zatwierdzone dopiero w odpowiednim kamieniu milowym.

#### Frame scheduler

Jeden właściciel kolejności ramki i przejść game state. Odpowiada za
synchronizację PAL, wywołanie ograniczonych faz oraz wykrycie przekroczenia
budżetu. Praca rzadsza niż co ramkę musi mieć jawny harmonogram i znany
pesymistyczny koszt.

#### Frontend controller

The explicit frontend controller owns main menu, options, top scores, exit
confirmation, exited, and Game Over. Game Over joins through an explicit
transition and reuses the release-gated input loop and text renderer; gameplay
logic never runs underneath it.

#### Input

Raz na ramkę próbuje joystick port 1 i FIRE, a następnie udostępnia stabilny
snapshot. Interpretacja inputu zależy od stanu frontend/active/destruction/game
over, ale sprzęt nie jest odczytywany niezależnie przez wiele systemów.
Frontend zachowuje neutral-release gating; gameplay zachowuje osobną bramkę
pierwszego FIRE po `START GAME`.

#### Player state

Przechowuje pozycję, ograniczenia ruchu, stan kadłuba 0–100%, stan
zniszczenia i cooldown FIRE. Nie jest właścicielem wyniku, encounterów ani
bezpośrednich zapisów do cudzych slotów.

#### Entity slots

Mała pula o stałym limicie przechowuje aktywne fighters, hazards, repair
objects i efekty, jeśli pomiar wykaże sens wspólnego formatu. Aktywacja,
dezaktywacja i przepełnienie są jawne. Nie przewiduje się dynamicznej alokacji.

#### Enemy descriptors

Read-only dane łączą identyfikator sylwetki, movement behaviour, prędkość,
firing pattern, hull strength, collision policy, score, akcenty, formation
role i flags. Instancja przechowuje tylko stan zmienny wymagany przez wybrane
zachowanie.

#### Movement behaviours

Współdzielone, ograniczone procedury realizują zygzak, ustawienie i dive,
lot formacyjny, tracking oraz późniejsze zachowania. Używają małych lookup
tables lub parametrów; nie odtwarzają długich ścieżek per-frame.

#### Formation/wave controller

Czyta level wave tables i tworzy encje z deskryptorów formacji. Odpowiada za
initial positions, timing, małe offsety i respektowanie limitu slotów, ale nie
omija encounter directora.

#### Encounter director

Jeden punkt wyboru zdarzeń fighter wave, debris, repair, mine, broadside,
elite i miniboss. Używa cooldownów, exclusions, stanu sektora, poziomu oraz
stałego seed testowego. Nie dopuszcza kombinacji bez osiągalnej trasy.

#### Sector controller

Zarządza open space, zapowiedzią przejścia, wejściem, capital-ship corridor
i wyjściem. Każdy aktywny sektor ma licznik nie większy niż 2250 ramek.
Minimalny czas i rozkład pozostają danymi balansującymi.

#### Capital-ship controller

Zarządza pozycją i stanami segmentów lewej/prawej strony, timingiem broadside,
muzzle/impact states oraz późniejszym celem capital ship. Nie posiada
fighters i nie przyznaje im faction immunity. Istniejąca baza danych udostępnia
dwa siedmiobajtowe rekordy: side, segment row, muzzle column, scanline offset,
barrel direction, turret type i screen code wylotu. Harmonogram wskazuje
stronę, a bounded selector wybiera najstarszy bezpieczny widoczny rekord bez
duplikowania współrzędnych w kodzie pocisków.

#### Projectile system

Stałe pule rozróżniają co najmniej zwykłe player/enemy shots i heavy
broadside shots. Ruch, właściciel, damage, collision mask oraz zakończenie
życia wynikają z danych. Maksymalna liczba pocisków jest częścią kontraktu
wydajności.

#### Collision and damage resolution

Po zakończeniu ruchu wszystkich obiektów system zbiera zdarzenia kolizji dla
jednego spójnego stanu ramki, a potem aplikuje je w jawnej kolejności. Dzięki
temu wynik broadside, hull damage i score nie zależą od przypadkowej kolejności
procedur. Duży debris ma osobną semantykę natychmiastowego zniszczenia;
zwykłe i ciężkie pociski przekazują data-driven damage. Szczegółowa reguła
wyboru pierwszego celu na drodze heavy shot musi zostać zatwierdzona i
przetestowana przed kamieniem broadside.

#### Debris i repair objects

Generator debris zachowuje osiągalną trasę przy rzeczywistych limitach ruchu.
Repair object rozróżnia zebranie (+20 punktów procentowych, cap 100%) od
zestrzelenia (score, bez naprawy). Oba systemy podlegają exclusions directora.

#### HUD

HUD jest osobną, ograniczoną fazą zapisu display memory. Pokazuje score,
`LIFE n` z kanonicznego licznika grywalnych statków oraz `HULL nn%` z
kanonicznego health; aktualizuje tylko trzy zmienne pozycje statusu.

#### Scoring

Jeden system przyjmuje jawne zdarzenia punktowe za enemies, zestrzelony repair
object oraz późniejsze wybrane cele. Wartości są danymi balansującymi. System
nie ustala sam, czy kolizja była trafieniem.

#### Audio

Ograniczona faza na końcu ramki aktualizuje POKEY na podstawie kolejki lub
priorytetów zdarzeń. Liczba kanałów, koszt playera i konflikty SFX/muzyki muszą
być zmierzone przed integracją. Bieżąca opcja SOUND pozostaje nadrzędną bramką:
OFF nie może zmieniać symulacji i musi pozostawiać wszystkie kanały wyciszone.

#### PRNG

Jedno jawne API generatora przyjmuje seed testowy i rozdziela decyzje poziomu
od nieistotnych efektów wizualnych, jeśli pomiar pozwoli. Liczba wywołań nie
może przypadkowo zmieniać profilu poziomu po dodaniu efektu graficznego.

#### Loader-to-frontend i frontend-to-gameplay

Przejście zachowuje zaakceptowane 250 ramek, wyłącza DLI/DMA, odzyskuje
pamięć loader-only i dopiero potem włącza mieszany ANTIC 7/6/4/2 z main menu,
jednym dolnym DLI oraz statycznymi player PMG.
`START GAME` osobno inicjalizuje wszystkie trwałe pule i włącza PMG. Przyszły
reset gameplayu nie uruchamia ponownie loadera i nie zakłada dostępu do dysku.

## Stabilna kolejność jednej ramki

Docelowa logiczna kolejność aktywnego gameplayu jest kontraktem architektury:

1. czekaj na granicę ramki PAL;
2. pobierz jeden snapshot inputu;
3. przesuń timery sektora i encounter directora;
4. zaktualizuj gracza;
5. zaktualizuj enemies, hazards, repair objects i projectiles;
6. rozwiąż kolizje oraz damage dla post-update snapshotu;
7. zaktualizuj score i game state;
8. zapisz stan PMG oraz display;
9. zaktualizuj ograniczony stan audio.

System może rozłożyć rzadkie zadania na kilka ramek wyłącznie wtedy, gdy
zachowuje tę semantykę i jawny limit. VBI/DLI mogą wykonywać tylko wcześniej
przygotowane, ograniczone transfery; nie mogą wprowadzać drugiej, przypadkowej
kolejności symulacji.

Stany frontendu używają krótszej, osobnej kolejności: czekaj na granicę PAL,
pobierz joystick i FIRE, sprawdź neutral-release gate, wykonaj najwyżej jedno
zdarzenie stanu i w razie przejścia wyrenderuj cały nowy ekran przy wyłączonym
DMA. Nie wywołują faz sektorów, encji, kolizji, score ani gameplay audio.

## Bramy pomiarowe

Przed akceptacją każdej funkcji raport zawiera pełną kartę dowodów z roadmapy.
W szczególności:

- przed zwiększeniem liczby obiektów mierzymy pełny skan pustych i pełnych
  slotów;
- przed multipleksowaniem PMG mierzymy VBI/DLI i stabilność na real hardware;
- obecny audyt capital hulls potwierdza 31 glifów, 1024 B charsetu,
  945 B map/metadanych/modułów/harmonogramu/granic/rates/profili/eksplozji/SFX i
  576 B map runtime;
- broadside używa faktycznego wiersza ekranu, a player contact dwóch
  32-bajtowych granic wygenerowanych z tego samego źródła; pełny trace kosztu
  trzech kolizji oraz real-hardware PAL pozostają bramkami akceptacji;
- przed audio mierzymy koszt odtwarzacza razem z najcięższą ramką gameplayu;
- przed jakąkolwiek propozycją modułów mierzymy resident RAM po reclaimie
  loadera.

Podane liczby cykli broadside są konserwatywną analizą ścieżek, nie trace'em z
fizycznego 65XE. 50 FPS jest warunkiem akceptacji, nie założeniem wynikającym
z sukcesu emulatora.
