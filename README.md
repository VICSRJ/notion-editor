# Notion Editor CZ

Dark-first český blokový editor pro desktop, tablet a iPhone.

## Funkce

- Tiptap / ProseMirror editor
- stabilní levý gutter jako skutečná ovládací zóna
- `+` pro vložení nového bloku
- nabídka bloku přes grip
- vlastní pravý klik s `role="menu"`
- české UI
- dark-first vzhled
- skutečné nastavení editoru: velikost textu, šířka obsahu a hustota bloků
- desktopové, tabletové a telefonní breakpointy
- touch-friendly hit-area bez závislosti na hoveru
- `Ctrl/Cmd + K` Web Search
- serverová `/api/web-search` route
- preview výsledku a vložení do dokumentu
- `prefers-reduced-motion`
- GitHub Actions lint + typecheck + build + Playwright E2E

## Podporované viewporty

CI ověřuje hlavní pracovní rozměry: 375, 430, 768, 1024 a 1440 px. Playwright používá Desktop Chrome, iPad Mini, iPhone 13 a iPhone SE konfigurace.

## Lokální vývoj

```bash
pnpm install
pnpm dev
```

## Kontrola

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e
```

Kompletní pipeline:

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test:e2e
```

## Aktuální klíčové verze

- Next.js 16.3.3
- React 19.2.8
- Tiptap 3.30.5
- TypeScript 5.7.3

## Poznámka k mobilu

Rozhraní je navržené mobile-first bez hover-only ovládání. 100% shodné chování na každém fyzickém zařízení nelze potvrdit bez testu konkrétního zařízení; automatická zařízení v CI pokrývají běžné desktop/tablet/phone viewporty a dotykové hit-area.

## Vercel

Projekt je připraven pro Vercel a Git-based Preview/Production deployment.
