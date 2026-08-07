# ADR-004: jeden resident gameplay program

Status: zaakceptowane

## Kontekst

Dark Fighter ma rozwijać się w kilka poziomów, proceduralne fale, open space,
sektory capital ships, debris, repair objects i kolejne typy przeciwników.
Standardowy ATR 90 KB ma znacznie więcej miejsca na nośniku niż bieżący
6193-bajtowy boot payload, ale stockowy Atari 65XE nadal ma tylko 64 KB RAM.
Pojemność ATR, limit boot sectors i resident gameplay RAM są odrębnymi
ograniczeniami.

Można byłoby od razu podzielić grę na ładowane pakiety misji, lecz wymagałoby
to zaprojektowania formatu modułów, managera overlayów, relokacji, save state
między częściami oraz bezpiecznego dostępu do dysku po przejęciu ekranu
i przerwań. Nie ma jeszcze pomiaru wykazującego, że ta złożoność jest
potrzebna.

## Decyzja

- Bieżąca gra będzie implementowana jako jeden resident gameplay program.
- Nie będzie dostępu do dysku ani ładowania pakietów między normalnymi
  poziomami.
- Title loader pozostaje jedyną obecną fazą ładowania.
- `dark-fighter.xex` i bootowalny `dark-fighter.atr` pozostają
  samowystarczalnymi deliverables.
- Wolna pojemność standardowego ATR nie jest traktowana jako dostępny
  gameplay RAM.
- Poziomy, enemies, formations, events i zachowania będą nadal organizowane
  jako małe data tables oraz reusable routines. Taka struktura ułatwia
  kontrolę pamięci i pozostawia możliwość przyszłego podziału bez jego
  implementowania teraz.
- Nie powstaje spekulacyjny overlay manager, disk-resident module format,
  save state, relocation system ani level-loader API.

## Powody

- Jedna część zachowuje prostą, deterministyczną pętlę 50 FPS i eliminuje
  ryzyko wywołań OS/SIO przy przejętym sprzęcie.
- Każdy przyrost pozostaje mały, buildable i możliwy do testu zarówno z XEX,
  jak i ATR.
- Najpierw można odzyskać pamięć przejściową loadera, współdzielić kod ruchu
  oraz grafiki i zmierzyć prawdziwą presję resident RAM.
- Data-driven content daje większość korzyści organizacyjnych bez kosztu
  formatu modułów i stanów przejściowych.
- XEX, ATR, emulator i SIO2SD zachowują jedną ścieżkę zachowania gameplayu.

## Konsekwencje

- Normalne level transitions są zmianami stanu i tabel w RAM, nie operacjami
  I/O.
- Wszystkie obowiązkowe systemy pierwszej kompletnej wersji muszą zmieścić się
  w zmierzonym resident budżecie razem z display memory, charsetem, PMG, zero
  page i trwałym stanem.
- Pamięć bitmapy loadera i dane potrzebne wyłącznie przed gameplayem mogą być
  rozpatrywane jako reclaimable, lecz każde użycie wymaga jawnej rezerwacji,
  testu przejścia i aktualizacji memory map.
- Rozmiar ATR nadal jest raportowany, ale nie stanowi dowodu, że funkcja
  mieści się w RAM lub w budżecie jednej ramki.
- Treść nie może polegać na długich skryptach per-frame tylko dlatego, że na
  dysku pozostaje miejsce.
- Ewentualny przyszły podział jest opcją architektoniczną, nie zaplanowaną
  funkcją ani obietnicą roadmapy.

## Odrzucona obecnie alternatywa

Odrzucamy natychmiastowy podział na loadable mission packages lub oddzielnie
ładowane chapters. Obecnie rozwiązywałby on niepotwierdzony problem, a od razu
dodawał ryzyko I/O, relokacji, niezgodnych stanów, dłuższych przejść i dwóch
ścieżek testowych.

Nie odrzucamy tej techniki na zawsze; odrzucamy jej spekulacyjne wdrożenie
przed pomiarem.

## Warunki ponownego rozważenia

Decyzję wolno otworzyć ponownie dopiero, gdy raport implementacyjny:

1. mierzy resident gameplay RAM po odzyskaniu pamięci loader-only;
2. rozdziela kod, dane, zero page, PMG, display/charset, persistent i transient
   RAM;
3. pokazuje, że współdzielenie silhouettes, routines, descriptors, kompresja
   i ograniczenie aktywnych obiektów nie wystarczają;
4. wskazuje konkretny wymagany zakres pierwszej wersji, który nie mieści się
   bez nieakceptowalnego naruszenia 50 FPS, czytelności albo real-hardware
   path;
5. porównuje koszt oraz ryzyko podziału z dalszą optymalizacją resident
   programu.

Dopiero taki pomiar może uzasadnić osobny ADR projektujący format i runtime
ładowania. Samo wolne miejsce ATR nie spełnia tych warunków.
