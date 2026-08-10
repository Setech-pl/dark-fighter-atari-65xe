# Graphics sources

Editable source art and conversion metadata belong here. Every accepted asset should also have an enlarged PNG review sheet and a generated Atari data file created by a documented script.

## Accepted references

- `dark-fighter-screen-concept-v1.png` — accepted composition and art-direction reference for the first gameplay screen. It defines the HUD hierarchy, dark central flight corridor, worn steel-blue structures, red identification stripes, pale player/enemy hulls and amber/cyan weapon accents.
- `loader.png` — owner-authored visual source of truth for the loader composition,
  Galactica profile, `BSG` marking, title treatment, engine light, and green
  studio credit.
- `loader-bitmap.json` — editable Atari-native mixed-mode bitmap composition.
  It describes deterministic drawing primitives, ordered dither patterns, the
  pixel font, landmarks, two LMS addresses, palette zones, timing, and the
  reference checksum. The host compiler rasterizes title and ship rows as
  320-pixel ANTIC F and the studio footer as 160-pixel ANTIC E, always at 40
  bytes per row. It produces exactly 7680 bytes, PackBits-compresses them, and
  derives both ca65 data and `build/previews/loader-screen.png` from that result.
- `mainmenu.png` — zatwierdzona referencja kompozycji i atmosfery main menu.
  Implementacja Atari używa jej wyłącznie do podziału: duży tytuł u góry,
  hangar i myśliwiec po lewej oraz opcje po prawej. Dolny podpis studia z tej
  referencji nie występuje w runtime main menu. PNG nie jest
  skalowane, trasowane ani konwertowane do danych ekranu; oznaczenia i dokładne
  sylwetki z konceptu nie są kopiowane.
- `capital-hulls.json` — edytowalne, oryginalne źródło dwóch 32-wierszowych
  kadłubów bocznych ANTIC 4. Zawiera piksele 31 glifów, osobne mapy
  `allied_line_hull` i `enemy_void_hull`, głębokość wewnętrznej krawędzi,
  dwie kompletne baterie (po jednej na stronę) oraz rekordy położenia ich
  wylotów. Każdy 7-bajtowy rekord zawiera też rzeczywisty screen code komórki.
  Źródło definiuje ponadto czteroelementowy harmonogram stron z bazowymi
  odstępami, ich skalą i stałym calm interval, trzy fazy warningu, dokładne
  world rates 8/9/10 na 20 ramek i hull rates 8/9/10 na 40 ramek,
  damage/cooldown oraz
  source-derived granice kontaktu gracza. `scripts/capital-hulls.mjs` waliduje
  i pakuje źródło, a build generuje z
  niego `build/capital-hulls.inc`; bajtów wynikowych nie edytuje się ręcznie.
  Lewa mapa składa powierzchnię z dużych, zachodzących płyt, białych lips i
  pionowych żeber, a prawa z dużych burgundowych slabów, głębokich pionowych
  wnęk oraz stalowych buttresses. Każdy cykliczny kontur ma siedem dużych
  przejść głębokości 5/6/7/8, a każdy niezmienny odcinek trwa 2–8 wierszy.
  Lokalne trzywierszowe cofnięcia o jedną komórkę zwiększają czytelną głębię
  profilu bez zmiany nominalnego układu 8+24+8. Sekcja `sector` składa pełne
  okręty z 8-wierszowych modułów w kolejności lotu od rufy: 32 engines,
  24 aft, 128 combat, 24 forward i 32 prow. Dwie 30-bajtowe sekwencje, osobne rodziny lewej/prawej strony,
  offset 8 wierszy, maski banków silników i metadata combat-only batteries
  zastępują surową mapę 240×16. Dwa glify flash i dwa trzyfazowe glify energii
  są częścią źródła. Fazy zmieniają się deterministycznie co 8 ramek: dwa duże,
  rozdzielone rdzenie lewej strony i dwa szersze, kanciaste rdzenie prawej
  strony są ciągłe i nie używają checkerboardu ani grzebienia. Dwa dodatkowe
  glify częściowej krawędzi oraz po 32 B masek i granic na stronę tworzą
  siedmiostopniowe prows kończące się jedną komórką z rzeczywistym konturem
  pikselowym. Trzy dalsze glify oraz sześć
  faz 3×3 opisują 24-ramkową eksplozję kadłuba, a dwie 24-bajtowe tabele
  definiują source-derived `AUDF4/AUDC4` crack/rumble.

The gameplay reference is not copied pixel-for-pixel into video memory.
Gameplay art is redrawn for a 160-color-clock ANTIC 4 playfield and
Player/Missile Graphics. The loader uses 320-pixel ANTIC F for its title and
ship and 160-pixel ANTIC E for the lime studio credit on a true black
background, without PMG. Its silhouette, negative panel gaps, repeated ribs,
and ordered dithering are a deliberate adaptation of `loader.png`, not an
automatic threshold. Both paths preserve deterministic operation on a stock
64 KB Atari 65XE.

The two gameplay HUD rows are genuine 40-column ANTIC 2 text. Their dedicated
runtime charset at `$5000-$53FF` is built deterministically from the compact
editable 6×7 glyph source in `src/main.s`; the 22 gameplay rows below still
use the source-derived ANTIC 4 charset and hull maps.

`npm run preview` odtwarza bieżącą fazę kadłubów w
`build/previews/gameplay-screen.png` i cały powtarzalny segment w
`build/previews/capital-hulls-strip.png`. Oba obrazy czytają te same glify,
mapy, role palety i pozycje wylotów co runtime; nie mają osobnych,
preview-only współrzędnych uzbrojenia.
`build/previews/enemy-hull-colour-options.png` zestawia dokładnie ten sam
screen i charset z `COLPF3=$44` oraz `$46`; `$44` jest wartością bieżącego
kandydata runtime, a `$46` wyłącznie wariantem do review.
`build/previews/broadside-fire-sequence.png` korzysta z tych samych rekordów
wylotów, harmonogramu, stałych ruchu, granic wierszowych i źródłowych kształtów
PMG co runtime. Sześć paneli pokazuje oba warningi, trzy jednoczesne pociski,
trafienie hostile fightera, trafienie przeciwnego kadłuba i damage gracza;
etykiety znajdują się poza symulowanym ekranem Atari.
`build/previews/broadside-acceptance-sequence.png` dodaje dziesięć klatek:
allied compact/medium/hot, launch bez skoku, enemy compact/hot, clamp na obu
kadłubach, istniejący damage flash i ukrycie gracza przy zero health. Wymiary,
kolory, pozycje, granice i fazy pochodzą z tego samego źródła i stałych runtime.
`build/previews/broadside-cadence-sequence.png` rysuje source-derived oś czasu
1000 ramek: paski od warningu do launch, rzeczywiste kolory M1–M3 oraz ticki
scrollu z akumulatora. Bieżący wariant mechaniczny pozostaje dowodem `HARD`.
`build/previews/broadside-speed-sequence.png` pokazuje pięć kolejnych ramek
PAL z autorytatywnej symulacji: dwa pełne kroki świata występują w ramkach 2
i 4, natomiast pierwszy krok kadłubów dopiero w ramce 4. Warning przesuwa się
wtedy dokładnie razem z wylotem, a lecący pocisk zachowuje 2 jednostki HPOS
ruchu na każdą ramkę.
`build/previews/difficulty-speed-comparison.png` pokazuje z jednego źródła
8/9/10 zdarzeń world scrolla oraz 4/4/5 zdarzeń hull scrolla w 20 ramkach,
przy identycznym warning timerze i ruchu pocisku. W długim oknie hull rates
wynoszą dokładnie połowę world rates dla każdej trudności.
`build/previews/flagship-sector-sequence.png` pokazuje source-derived ENGINES,
AFT, COMBAT, FORWARD, PROW, terminal tips, DRAIN i COMPLETE z jednego 240-wierszowego
modelu. `build/previews/heavy-shell-detail-sequence.png` pokazuje końcowy hot
warning, czteroramkowy flash, dwie fazy 3/4-scanline sluga i pięcioramkowy
impact; render używa rzeczywistych kolorów M1–M3 i nie maluje po obrazie Atari.
`build/previews/capital-hull-explosion-sequence.png` pokazuje wszystkie sześć
faz dużego trafienia, a `capital-explosion-pokey-trace.csv` dokładne 24 ramki
rejestrów channel 4 i końcowe wyciszenie.
`build/previews/capital-engine-bank-sequence.png` pokazuje obie duże banki we
wszystkich trzech fazach oraz przejście housing→AFT;
`capital-prow-sequence.png` pokazuje pełne zwężenie obu niejednakowych dziobów,
a `enemy-fighter-corridor-limits.png` renderuje P1/P2 przy obu kanonicznych
granicach HPOS bez nakładania choćby jednego piksela na side hull.
