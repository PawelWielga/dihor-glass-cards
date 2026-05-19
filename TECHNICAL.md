# Technical Notes / Notatki Techniczne

PL: Ten plik jest dla osób rozwijających paczkę `dihor-glass-cards`.

EN: This file is for people developing the `dihor-glass-cards` package.

## Stack

- `Lit` - web components and reactive rendering
- `TypeScript` - typed source code
- `Rollup` - bundle build
- `ESLint` - static checks
- `Prettier` - source formatting
- `Semantic Release` - release automation

## Development / Praca Deweloperska

PL:
- `npm install` - instaluje zależności.
- `npm run lint` - sprawdza kod TypeScript/JavaScript przez ESLint.
- `npm run format:check` - sprawdza formatowanie Prettierem.
- `npm run format` - formatuje pliki w `src/`.
- `npx tsc --noEmit` - sprawdza typy.
- `npm run build` - buduje `dist/dihor-glass-cards.js`.
- `npm run prepare-docs` - kopiuje bundle i assety preview do `docs/`.
- `npm run check-docs-manifest` - sprawdza, czy preview ma wymagane pliki CSS.
- `npm run dev` - przygotowuje docs i uruchamia lokalny preview.

EN:
- `npm install` - installs dependencies.
- `npm run lint` - checks TypeScript/JavaScript with ESLint.
- `npm run format:check` - checks formatting with Prettier.
- `npm run format` - formats files in `src/`.
- `npx tsc --noEmit` - checks types.
- `npm run build` - builds `dist/dihor-glass-cards.js`.
- `npm run prepare-docs` - copies the bundle and preview assets into `docs/`.
- `npm run check-docs-manifest` - verifies that preview CSS assets exist.
- `npm run dev` - prepares docs and starts local preview.

## Project Structure / Struktura Projektu

- `src/index.ts` - entry point biblioteki / library entry point
- `src/cards/*` - implementacje kart / card implementations
- `src/shared/base-card.ts` - wspólna baza kart / shared card base
- `src/shared/styles/*` - wspólne style / shared styles
- `src/cards/cards-docs.json` - manifest preview / preview manifest
- `dist/dihor-glass-cards.js` - bundle runtime dla HACS / runtime bundle for HACS
- `docs/*` - preview i statyczne assety / preview and static assets
- `scripts/*` - skrypty operacyjne / operational scripts
- `.github/workflows/*` - CI, GitHub Pages i Semantic Release

## Adding a New Card / Dodawanie Nowej Karty

PL:
1. Utwórz katalog `src/cards/my-card`.
2. Dodaj pliki `dihor-my-card.ts` i `dihor-my-card.css`.
3. Rozszerz `BaseDihorCard`.
4. Zarejestruj custom element tylko wtedy, gdy jeszcze nie istnieje.
5. Dodaj import i eksport w `src/index.ts`.
6. Jeśli karta ma być w preview, dopisz ją do `src/cards/cards-docs.json`.
7. Uruchom pełną weryfikację.

EN:
1. Create `src/cards/my-card`.
2. Add `dihor-my-card.ts` and `dihor-my-card.css`.
3. Extend `BaseDihorCard`.
4. Register the custom element only if it does not exist yet.
5. Add the import and export in `src/index.ts`.
6. If the card should appear in preview, add it to `src/cards/cards-docs.json`.
7. Run the full verification.

```ts
import { css, html, unsafeCSS } from "lit";
import { BaseDihorCard } from "../../shared/base-card";
import cardCssStr from "./dihor-my-card.css";

interface MyCardConfig {
  title?: string;
}

export class MyCard extends BaseDihorCard<MyCardConfig> {
  static get styles() {
    return [super.styles, css`${unsafeCSS(cardCssStr)}`];
  }

  static getStubConfig() {
    return { title: "My Card" };
  }

  static getConfigForm() {
    return {
      schema: [{ name: "title", selector: { text: {} } }],
    };
  }

  protected renderCard() {
    return html`<ha-card>${this._config?.title ?? "My Card"}</ha-card>`;
  }
}

if (!customElements.get("dihor-my-card")) {
  customElements.define("dihor-my-card", MyCard);
}
```

## Release / Publikowanie

PL:
- Release jest obsługiwany przez Semantic Release.
- HACS używa runtime bundle: `dist/dihor-glass-cards.js`.
- GitHub release publikuje asset: `dihor-glass-cards.js`.
- GitHub Pages publikuje zawartość `docs/`.
- `npm run prepare-docs` powinno być uruchamiane po `npm run build`.

EN:
- Releases are handled by Semantic Release.
- HACS uses the runtime bundle: `dist/dihor-glass-cards.js`.
- GitHub releases publish the asset: `dihor-glass-cards.js`.
- GitHub Pages publishes the contents of `docs/`.
- `npm run prepare-docs` should run after `npm run build`.

## Verification / Weryfikacja

PL: Przed zmianą runtime, manifestów lub preview uruchom:

EN: Before changing runtime code, manifests, or preview assets, run:

```powershell
npm run lint
npm run format:check
npx tsc --noEmit
npm run build
npm run prepare-docs
npm run check-docs-manifest
```

## Dependency Audit / Audyt Zależności

PL:
- Runtime audit powinien przechodzić przez `npm audit --omit=dev`.
- Dev-audit może zgłaszać problemy w narzędziach budowania. Nie używaj `npm audit fix --force` bez sprawdzenia wpływu na Rollup i pluginy.

EN:
- Runtime audit should pass with `npm audit --omit=dev`.
- Dev audit may report issues in build tooling. Do not use `npm audit fix --force` without checking the impact on Rollup and plugins.

## Commit Messages / Komunikaty Commitów

Use Conventional Commits:

- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `refactor:` internal changes without behavior changes
- `chore:` maintenance changes
- `BREAKING CHANGE:` major release trigger
