# ADR-001: przenośny toolchain ca65/ld65

Status: zaakceptowana

## Kontekst

Projekt musi budować się na macOS z procesorem Intel oraz na Windows. Natywne paczki cc65 i dodatkowe narzędzia do ATR różnią się instalacją i wersjami.

## Decyzja

Używamy przypiętej paczki `romdev-toolchain-cc65` zawierającej `ca65` i `ld65` w WebAssembly. Własny skrypt Node.js montuje pliki w wirtualnym systemie narzędzi, odbiera wynik i generuje XEX/ATR bez zewnętrznych programów.

## Konsekwencje

- build jest identyczny na wspieranych hostach;
- wymaga Node.js 24+ i jednorazowego `npm install`;
- nie zależy od Homebrew, Chocolatey, Pythona ani natywnego cc65;
- wersja toolchainu jest utrwalona w lockfile;
- w razie potrzeby można później dodać zgodny tryb użycia natywnych `ca65/ld65`.

