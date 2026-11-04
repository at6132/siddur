# Agent notes — Siddur repo

## Expo has changed — do not trust training data

This app targets **Expo SDK 58**. APIs rename every release. Before touching Expo, EAS, Expo Router, or React Native APIs:

1. Confirm the `expo` major in `package.json`.
2. Use Expo MCP (if connected) or fetch https://docs.expo.dev/versions/v58.0.0/ — never answer Expo API questions from memory.
3. For the full docs map and common LLM corrections: https://docs.expo.dev/llms.txt (follow links; append `.md` to any docs.expo.dev URL).
4. Install with `npx expo install <package>` so versions match the SDK.

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
