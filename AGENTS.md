# AGENTS.md

Podstawowe zasady pracy agentów w repozytorium `dihor-glass-cards`.

## 1) Kontekst projektu
- Projekt: `dihor-glass-cards`
- Cel: biblioteka custom cards dla Home Assistant.
- Stack: TypeScript + Lit + Rollup.
- Typ dystrybucji: moduł ES dla HACS/Home Assistant.
- Główne artefakty:
  - runtime: `dist/dihor-glass-cards.js`
  - preview/docs: `docs/`
  - manifest HACS: `hacs.json`

## 2) Język i styl komunikacji
- Komunikacja z użytkownikiem: **Polski**.
- Styl: konkretny, krótki, techniczny.
- Zmiany w dokumentach mogą być po angielsku, jeśli wynika to z kontekstu pliku.
- Dokumentacja user-facing powinna pozostać dwujęzyczna: **Polski + English**.

## 3) Architektura i ważne pliki
- Entry point: `src/index.ts`.
- Wspólna baza kart: `src/shared/base-card.ts`.
- Typy Home Assistant: `types/home-assistant.d.ts`.
- Import CSS jako string: `types/raw.d.ts` + `rollup-plugin-string`.
- Globalne style:
  - `src/shared/styles/theme.css`
  - `src/shared/styles/core.css`
  - `src/shared/styles/font.css`
- Karty:
  - `src/cards/clock/dihor-clock-card.ts`
  - `src/cards/minecraft/dihor-minecraft-card.ts`
  - `src/cards/person/dihor-person-card.ts`
  - `src/cards/toggle-button/dihor-toggle-button-card.ts`
- Manifest preview/docs: `src/cards/cards-docs.json`.
- Skrypty operacyjne: `scripts/*`.

## 4) Zasady implementacji
- Wprowadzaj zmiany minimalne i zgodne z istniejącą strukturą.
- Nie przebudowuj architektury bez wyraźnej prośby.
- Nie cofaj zmian użytkownika bez zgody.
- Nowe karty dodawaj jako osobny katalog w `src/cards/<nazwa>/`.
- Każda karta powinna:
  - rozszerzać `BaseDihorCard`
  - definiować custom element tylko, gdy jeszcze nie istnieje
  - mieć własny plik CSS importowany jako string
  - zostać zaimportowana i wyeksportowana w `src/index.ts`
  - zostać dopisana do `src/cards/cards-docs.json`, jeśli ma być widoczna w preview
- Nie edytuj ręcznie wygenerowanych artefaktów, jeśli zmiana powinna powstać przez `npm run build` albo `npm run prepare-docs`.

## 5) Dokumentacja i preview
- `README.md` oraz instrukcje instalacji/konfiguracji/migracji prowadź dwujęzycznie: PL + EN.
- Przy dodawaniu nowej sekcji dokumentacji dodaj obie wersje językowe tej samej treści.
- Przy edycji istniejącej sekcji zsynchronizuj PL i EN merytorycznie.
- `npm run prepare-docs` kopiuje:
  - `dist/dihor-glass-cards.js` do `docs/dihor-glass-cards.js`
  - manifest kart do `docs/cards/cards-docs.json`
  - CSS kart i style współdzielone do `docs/cards/`
  - `docs/version.json` oraz `docs/.nojekyll`
- Po zmianach w manifestach lub preview sprawdź `npm run check-docs-manifest`.

## 6) Komendy projektu
- Instalacja zależności: `npm install`.
- Lint: `npm run lint`.
- Build runtime: `npm run build`.
- Przygotowanie docs: `npm run prepare-docs`.
- Walidacja assets docs: `npm run check-docs-manifest`.
- Lokalny preview: `npm run preview`.
- Dev preview: `npm run dev`.
- Formatowanie kodu: `npm run format`.

## 7) Standard weryfikacji zmian
Po zmianach uruchom, jeśli dotyczy:
1. `npm run lint`
2. `npm run build`
3. `npm run prepare-docs`
4. `npm run check-docs-manifest`

Dla zmian wyłącznie w dokumentacji lub instrukcjach repozytorium wystarczy weryfikacja zakresu diffa i brak niechcianych referencji.

## 8) Gdzie pracować
- Kod kart: `src/cards/*`.
- Warstwa współdzielona: `src/shared/*`.
- Typy: `types/*`.
- Skrypty operacyjne: `scripts/*`.
- Dokumentacja i preview: `docs/*`, `README.md`.
- Build/release config: `rollup.config.js`, `tsconfig.json`, `.eslintrc.json`, `.releaserc.json`, `hacs.json`.

## 9) Definition of Done
- Zmiana działa i nie łamie builda, jeśli dotyczy kodu runtime.
- README/docs są zaktualizowane, jeśli zmiana wpływa na użycie.
- Manifest preview jest zsynchronizowany z kartami, jeśli zmiana dotyczy listy kart.
- Wygenerowane artefakty są odświeżone tylko wtedy, gdy wymagają tego zmiany.
- Zmiany są czytelne i gotowe do review.
