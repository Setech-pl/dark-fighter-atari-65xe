# Mapa pamięci — wersja 0.1

| Zakres | Przeznaczenie |
| --- | --- |
| `$0080-$00FF` | zmienne zero-page gry |
| `$0100-$01FF` | stos 6502 |
| `$0200-$03FF` | obszar systemowy OS i wektory |
| `$2000-$2FFF` | nagłówek boot, kod i dane tylko do odczytu; build odrzuca przekroczenie `$3000` |
| `$3000-$37FF` | rezerwa na rozwój vertical slice'a |
| `$3800-$3FFF` | Player/Missile Graphics, rozdzielczość jednoliniowa |
| `$4000-$43FF` | ekran znakowy (960 bajtów używane, reszta buforowana) |
| `$4400-$47FF` | własny zestaw 128 znaków ANTIC 4, kopiowany z danych programu przy starcie |
| `$4800-$BFFF` | wolne dla kolejnych systemów i assetów |
| `$C000-$FFFF` | ROM i sprzętowe rejestry I/O |

PMG dla bazy `$3800`:

| Zakres | Obiekt |
| --- | --- |
| `$3B00-$3BFF` | missiles |
| `$3C00-$3CFF` | Player 0 — gracz |
| `$3D00-$3DFF` | Player 1 — przeciwnik |
| `$3E00-$3EFF` | Player 2 — skaner |
| `$3F00-$3FFF` | Player 3 — silnik gracza |
