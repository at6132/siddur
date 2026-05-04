# UI components ↔ brand assets

Runtime code lives under `components/` and `app/`. This folder holds **reference exports** (SVG, raster mirrors) for design tools, marketing, and agent context.

## Back navigation

| In app | Brand reference |
|--------|-----------------|
| `components/ui/BackButton.tsx` | `brand_kit/assets/vectors/back-button.svg` |

**Spec:** `←` + space + label (default `Back`). **Typography:** `fonts.body.medium` (Nunito 500), **16px**. **Color:** `theme.colors.primary.main` (light default `#D4A5B8`). **Layout:** `paddingVertical: spacing.xs` (4), `alignSelf: 'flex-start'`.

Do not replace with random chevron icons without updating this asset and the README.

## Primary actions (filled)

| In app | Notes |
|--------|--------|
| `components/ui/GlassButton.tsx` | Primary / secondary / ghost; uses `theme.colors` + blur |

No separate SVG export yet; rely on `colors.primary.main` + `text.inverse` from `brand_kit/README.md`.

## Glass surfaces

| In app | Notes |
|--------|--------|
| `components/ui/GlassCard.tsx` | Blur + `theme.colors.glass` gradient |
| `app/home/components/GlassCard.tsx` | Home tiles; light/dark glass gradients |

## Raster & audio (mirrors of `assets/`)

| Runtime path (`require` / `app.json`) | Brand kit copy |
|----------------------------------------|----------------|
| `assets/icon.png` | `brand_kit/assets/icon.png` |
| `assets/logo.png` | `brand_kit/assets/logo.png` |
| `assets/sounds/shabbos-alarm.wav` | `brand_kit/assets/sounds/shabbos-alarm.wav` |

**Splash** (`app.json`): `splash.backgroundColor` → `#FAF9F7` (matches gradient first stop).

**Vector gradient (design export):** `brand_kit/assets/vectors/screen-background-gradient.svg`

## When you change production assets

1. Replace files under **`assets/`** (what Expo bundles).
2. Copy the same files into **`brand_kit/assets/`** so the brand kit stays accurate.
