# Agent notes — Siddur repo

## Brand system

Before changing UI styling, read **`brand_kit/README.md`** and **`brand_kit/COMPONENTS.md`**. They summarize tokens, gradients, glass, and how global UI (e.g. **back button**) maps to **`brand_kit/assets/vectors/`** and raster mirrors under **`brand_kit/assets/`**.

**Source of truth in code:**

- `src/design/colors.ts` — palettes  
- `src/design/typography.ts` — fonts and `textStyles`  
- `src/design/spacing.ts` — `spacing`, `borderRadius`, `shadows`  
- `src/design/screenGradient.ts` — screen background gradients (including defaults and onboarding variants)  
- `src/design/colorAlpha.ts` — `colorWithAlpha(hex, alpha)` for translucent tints  
- `src/design/theme/context.ts` — `buildTheme`, `AppTheme` (`theme.backgroundGradient`, `theme.backgroundGradientLoop`, `theme.colors`, …)

Prefer **`useTheme()`** in React screens. If a screen cannot use hooks, import **`DEFAULT_SCREEN_BACKGROUND`** (and related exports) from `src/design/screenGradient.ts` while light mode is forced — still better than duplicating hex literals.

Do **not** introduce off-palette colors for chrome (e.g. random indigo or brown CTA buttons). Use primary / accent / semantic tokens.
