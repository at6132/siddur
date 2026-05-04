# Siddur — Brand kit

Human-readable source of truth for product look and feel. **Implementations live in code** (`src/design/`); this folder describes the system so design and engineering stay aligned.

## Brand assets (files in this folder)


| Path                                            | Purpose                                                         |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `assets/icon.png`                               | App icon (mirror of `assets/icon.png`; used by Expo `app.json`) |
| `assets/logo.png`                               | In-app logo (splash / intro; mirror of `assets/logo.png`)       |
| `assets/sounds/shabbos-alarm.wav`               | Shabbos alarm sound (mirror of `assets/sounds/…`)               |
| `assets/vectors/back-button.svg`                | **Spec** for global `← Back` control (see `COMPONENTS.md`)      |
| `assets/vectors/screen-background-gradient.svg` | **Spec** for default screen background gradient                 |


**Runtime rule:** The app loads rasters and audio from `**assets/`** at the repo root. `**brand_kit/assets/**` holds duplicates for designers, docs, and agents. When you update the icon or logo, update `**assets/**` first, then copy into `**brand_kit/assets/**`.

**Reusable UI specs:** See `**COMPONENTS.md`** (back button, glass, mirrors table).

## Essence

- **Name / product:** Daily Jewish life companion (siddur, learning, hub, calendar).
- **Visual personality:** “Liquid glass” — soft, calm, feminine-leaning, modern. Never harsh alarms or saturated “web app” primaries.
- **Emotional goal:** Approachable continuity (24/7 companion), not corporate dashboard energy.

## Color system

Canonical palettes: `src/design/colors.ts`


| Role      | Light mode idea                       | Tokens                                                       |
| --------- | ------------------------------------- | ------------------------------------------------------------ |
| Primary   | Muted rose                            | `colors.primary.light`, `.main`, `.dark`                     |
| Secondary | Soft sky blue                         | `colors.secondary.*`                                         |
| Accents   | Gold, lavender, sage                  | `colors.accent.gold`, `.lavender`, `.sage`                   |
| Surfaces  | White → warm off-white                | `colors.background.primary` / `.secondary` / `.tertiary`     |
| Text      | Soft black → grays                    | `colors.text.primary`, `.secondary`, `.tertiary`, `.inverse` |
| Semantic  | Soft success / info / warning / error | `colors.semantic.*`                                          |
| Glass     | Frosted overlays                      | `colors.glass.light`, `.medium`, `.dark`, `.blur`            |
| Shadows   | Low-contrast depth                    | `colors.shadow.light`, `.medium`, `.dark`                    |


**Dark palette** is defined alongside light in the same file. The app may temporarily force light mode (`ThemeProvider`); still use `useTheme()` so dark mode can return without refactors.

### Rules

- Prefer `**useTheme().theme.colors`** on screens. Avoid ad-hoc hex except short-lived prototypes.
- Do **not** pull in unrelated palettes (e.g. Tailwind indigo `#6366f1`, amber `#F59E0B`, brown `#8B7355`) for UI chrome. Use rose / lavender / gold from tokens.
- For translucent tints of a token, use `**colorWithAlpha`** from `src/design/colorAlpha.ts`.

## Screen backgrounds

Canonical **3-stop** gradient (cream → rose → sky):

- Code: `theme.backgroundGradient` from `useTheme()`, or `DEFAULT_SCREEN_BACKGROUND` from `src/design/screenGradient.ts` when the screen has no theme hook yet.
- Single source: `src/design/screenGradient.ts` (used by `buildTheme` in `src/design/theme/context.ts`).

**4-stop loops** (e.g. splash, onboarding shell): `theme.backgroundGradientLoop` or `DEFAULT_SCREEN_BACKGROUND_LOOP`.

**Alternate loop orders** (same hexes, different emphasis — onboarding only):  
`screenBackgroundGradientLoopAltWelcome`, `…AltNotifications`, `…AltSpiritual` in `screenGradient.ts`.

**Two-stop soft variant:** `DEFAULT_SCREEN_BACKGROUND_SOFT` (first two stops only).

## Typography

Defined in `src/design/typography.ts` and loaded in `App.tsx`.


| Use                | Font family token                                                            |
| ------------------ | ---------------------------------------------------------------------------- |
| Headings / display | Cormorant Garamond (`fonts.heading.*`)                                       |
| Body / UI          | Nunito (`fonts.body.*`)                                                      |
| Hebrew / nikkud    | Frank Ruhl Libre (`fonts.hebrew.*`) — loaded where Hebrew reader UI needs it |


Predefined styles: `textStyles` (e.g. `textStyles.h1`, `textStyles.body`).

## Layout, radius, elevation

- **Spacing & radius:** `src/design/spacing.ts` (`spacing`, `borderRadius`).
- **Card shadows:** `shadows` in the same file (shared `shadowColor: '#000'` is intentional for RN shadow APIs).

## Glass / cards

- Shared `**GlassCard`** / `**GlassButton**` under `components/ui/` use theme glass colors and blur.
- Home grid uses `app/home/components/GlassCard.tsx` (similar language, platform-specific blur vs gradient).

## Motion

- Subtle springs and fades (`react-native-reanimated`, small animation components in `components/animations/`). Avoid flashy bouncy marketing motion unless the screen already sets that tone (e.g. splash).

## Content & voice (UI copy)

- Warm, concise, respectful. Avoid cringe or slang in sacred flows.
- Prefer neutral labels over hype (“New” is OK when true; avoid engagement bait).

## File map (for agents)


| Concern                     | File(s)                               |
| --------------------------- | ------------------------------------- |
| Light / dark palettes       | `src/design/colors.ts`                |
| Theme object + `buildTheme` | `src/design/theme/context.ts`         |
| Theme provider              | `src/design/theme/ThemeProvider.tsx`  |
| Screen gradients            | `src/design/screenGradient.ts`        |
| Hex → rgba helper           | `src/design/colorAlpha.ts`            |
| Type scale                  | `src/design/typography.ts`            |
| Spacing / radius / shadows  | `src/design/spacing.ts`               |
| Raster + audio mirrors      | `brand_kit/assets/` (see table above) |
| Component ↔ asset map       | `brand_kit/COMPONENTS.md`             |


When adding UI: **read an adjacent screen**, reuse patterns, and **extend tokens** instead of inventing one-off colors.