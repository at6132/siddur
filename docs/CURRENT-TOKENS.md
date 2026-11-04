# CURRENT-TOKENS — values actually in use

Inventory of colors, fonts, spacing, and radii found in `src/design/*`, `app/`, `components/`, and `App.tsx`. Deduplicated. Sources of truth: `src/design/colors.ts`, `typography.ts`, `spacing.ts`, `screenGradient.ts`, `colorAlpha.ts`.

---

## Core brand colors (7)

| Role | Hex | Token |
|------|-----|-------|
| Soft rose (primary) | `#D4A5B8` | `primary.main` |
| Rose tint | `#F5E6E8` | `primary.light` / gradient stop 2 |
| Sky blue (secondary) | `#A5C4D4` | `secondary.main` / `semantic.info` |
| Warm cream | `#FAF9F7` | `background.secondary` / gradient stop 1 |
| Sky mist | `#E8F0F5` | `secondary.light` / gradient stop 3 |
| Warm gold | `#E8D4A5` | `accent.gold` / `semantic.warning` |
| Soft lavender | `#D4C4E8` | `accent.lavender` |

Supporting brand neutrals used constantly: `#FFFFFF` (surfaces), `#1A1A1A` (text), `#B88FA3` (primary.dark), `#C4D4A5` (sage).

Canonical light screen gradient: `#FAF9F7` → `#F5E6E8` → `#E8F0F5` (`src/design/screenGradient.ts`).

---

## Colors — design system (light)

| Token | Value |
|-------|-------|
| `primary.light` / `main` / `dark` | `#F5E6E8` / `#D4A5B8` / `#B88FA3` |
| `secondary.light` / `main` / `dark` | `#E8F0F5` / `#A5C4D4` / `#8FA3B8` |
| `accent.gold` / `lavender` / `sage` | `#E8D4A5` / `#D4C4E8` / `#C4D4A5` |
| `background.primary` / `secondary` / `tertiary` | `#FFFFFF` / `#FAF9F7` / `#F5F3F0` |
| `background.glass` | `rgba(255,255,255,0.7)` |
| `text.primary` / `secondary` / `tertiary` / `inverse` | `#1A1A1A` / `#6A6A6A` / `#9A9A9A` / `#FFFFFF` |
| `neutral.50` → `900` | `#FAFAFA`, `#F5F5F5`, `#EEEEEE`, `#E0E0E0`, `#BDBDBD`, `#9E9E9E`, `#757575`, `#616161`, `#424242`, `#212121` |
| `semantic.success` / `info` / `warning` / `error` | `#A5D4B8` / `#A5C4D4` / `#E8D4A5` / `#D4A5A5` |
| `glass.light` / `medium` / `dark` / `blur` | white @ `0.8` / `0.6` / `0.4` / `0.3` |
| `shadow.light` / `medium` / `dark` | black @ `0.05` / `0.1` / `0.15` |

## Colors — design system (dark)

| Token | Value |
|-------|-------|
| `primary.light` / `main` / `dark` | `#F5CFE2` / `#E2A8C5` / `#C87AA1` |
| `secondary.light` / `main` / `dark` | `#89B6CE` / `#6D9FB9` / `#507890` |
| `accent.gold` / `lavender` / `sage` | `#C9A86A` / `#B8A0D2` / `#8FB28F` |
| `background.primary` / `secondary` / `tertiary` | `#08070C` / `#110F18` / `#191625` |
| `background.glass` | `rgba(12,10,18,0.6)` |
| `text.primary` / `secondary` / `tertiary` / `inverse` | `#F8F4F9` / `#D8CEE4` / `#B8A8D0` / `#0A070D` |
| `neutral.50` → `900` | `#17141F`, `#1F1B28`, `#2A2534`, `#3A3448`, `#4E4662`, `#6A607C`, `#8A7E9C`, `#A89EBC`, `#C4B8D8`, `#D8CEE4` |
| `semantic.success` / `info` / `warning` / `error` | `#80C9A5` / `#7DAECE` / `#CBA96A` / `#E394A3` |
| `glass.light` → `blur` | white @ `0.18` / `0.14` / `0.1` / `0.08` |
| `shadow.light` / `medium` / `dark` | black @ `0.45` / `0.55` / `0.65` |

## Gradients (canonical)

| Name | Stops |
|------|-------|
| Light screen | `#FAF9F7`, `#F5E6E8`, `#E8F0F5` |
| Dark screen | `#0A0811`, `#141129`, `#0D0F1C` |
| Soft (2-stop) | `#FAF9F7`, `#F5E6E8` |
| Loops / onboarding alts | Same hexes, reordered (cream/rose/sky closed loops) |

Helper: `colorWithAlpha(hex, alpha)` → `rgba(r,g,b,a)` — `src/design/colorAlpha.ts`.

---

## Colors — all hex literals in use (deduped)

Normalized from codebase scan (71 unique, including short forms).

### Brand / DS

`#000`, `#08070C`, `#0A070D`, `#0A0811`, `#0D0F1C`, `#110F18`, `#141129`, `#17141F`, `#191625`, `#1A1A1A`, `#1F1B28`, `#212121`, `#2A2534`, `#3A3448`, `#424242`, `#4E4662`, `#507890`, `#616161`, `#6A607C`, `#6A6A6A`, `#6D9FB9`, `#757575`, `#7DAECE`, `#80C9A5`, `#89B6CE`, `#8A7E9C`, `#8FA3B8`, `#8FB28F`, `#9A9A9A`, `#9E9E9E`, `#A5C4D4`, `#A5D4B8`, `#A89EBC`, `#B88FA3`, `#B8A0D2`, `#B8A8D0`, `#BDBDBD`, `#C4B8D8`, `#C4D4A5`, `#C87AA1`, `#C9A86A`, `#CBA96A`, `#D4A5A5`, `#D4A5B8`, `#D4C4E8`, `#D8CEE4`, `#E0E0E0`, `#E2A8C5`, `#E394A3`, `#E8D4A5`, `#E8F0F5`, `#EEEEEE`, `#F5CFE2`, `#F5E6E8`, `#F5F3F0`, `#F5F5F5`, `#F8F4F9`, `#FAF9F7`, `#FAFAFA`, `#fff` / `#FFFFFF`

### Ad-hoc (off token path)

| Hex | Typical use |
|-----|-------------|
| `#007AFF` | Web chrome (`App.tsx`) — iOS system blue |
| `#e8e8ed`, `#c8c8cc` | Web chrome borders (`App.tsx`) |
| `#D45555` | Settings destructive |
| `#c62828`, `#c53030`, `#c00` | Form/error fallbacks |
| `#1C1B24` | Settings dark modal |
| `#2C2C2C` | Tab bar / segmented shadow |
| `#ccc` | Reader toolbar track fallback |

---

## Colors — all `rgba()` literals in use (deduped, 201)

### White glass ladder

`rgba(255,255,255,α)` for α ∈  
`0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.12, 0.14, 0.15, 0.16, 0.18, 0.22, 0.25, 0.28, 0.3, 0.35, 0.36, 0.38, 0.4, 0.42, 0.45, 0.48, 0.5, 0.52, 0.55, 0.6, 0.62, 0.65, 0.7, 0.72, 0.75, 0.78, 0.8, 0.85, 0.88, 0.9, 0.92, 0.95, 0.98`

### Black overlay ladder

`rgba(0,0,0,α)` for α ∈  
`0.02, 0.03, 0.04, 0.045, 0.05, 0.06, 0.08, 0.1, 0.14, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.65, 0.7`

### Brand-tint bases (rose / sky / gold / lavender / sage / error)

- Rose `rgba(212,165,184,α)` — α: `0.12, 0.14, 0.15, 0.2, 0.22, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.8, 0.85, 0.95`
- Primary dark `rgba(184,143,163,0.45)`
- Hotter rose `rgba(217,136,185,0.35|0.45)`, `rgba(180,120,150,0.45)`, `rgba(232,210,220,0.6)`
- Soft rose surfaces `rgba(255,210,228,0.14)`, `rgba(255,245,250,0.28|0.55)`, `rgba(255,248,250,0.98)`, `rgba(255,252,253,0.98)`, `rgba(245,236,242,0.98|0.99)`, `rgba(248,242,250,0.9)`, `rgba(198,182,196,0.42)`
- Sky `rgba(165,196,212,α)` — α: `0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6`
- Related blues `rgba(165,180,212,0.3)`, `rgba(120,160,190,0.25)`, `rgba(196,212,232,0.3)`, `rgba(100,120,180,0.3)`, `rgba(120,130,190,0.3|0.4)`, `rgba(160,180,255,0.3)`, `rgba(200,200,255,0.15)`, `rgba(220,220,255,0.12)`
- Gold `rgba(232,212,165,α)` — α: `0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7`; `rgba(212,196,165,0.3)`; `rgba(255,248,220,0.95)`
- Lavender `rgba(212,196,232,0.25|0.3|0.6)`
- Sage / success greens `rgba(165,212,184,0.2|0.3|0.35)`, `rgba(165,212,196,0.3)`, `rgba(165,200,165,0.25|0.3)`, `rgba(165,180,165,0.3)`, `rgba(100,180,100,0.3|0.4|0.5)`, `rgba(60,160,100,0.5)`, `rgba(80,180,120,0.85)`
- Soft error `rgba(212,165,165,0.25|0.3)`, `rgba(200,165,165,0.25|0.3)`
- Cream surface `rgba(250,249,247,0.82|0.95|0.98)`

### Dark glass surfaces

`rgba(12,10,18,0.6|0.78)`, `rgba(8,6,14,0.55)`, `rgba(10,10,15,0.55)`, `rgba(14,14,24,0.32|0.78)`, `rgba(17,17,28,0.5|0.76)`, `rgba(18,17,33,0.42|0.86)`, `rgba(20,18,30,0.95)`, `rgba(20,18,32,0.9|0.92|0.98)`, `rgba(20,20,32,0.92)`, `rgba(20,20,35,0.85)`, `rgba(22,19,32,0.55|0.92)`, `rgba(22,20,34,0.98|0.99)`, `rgba(24,22,34,0.82|0.88)`, `rgba(24,22,38,0.85|0.95)`, `rgba(24,23,37,0.6|0.82)`, `rgba(25,25,38,0.9)`, `rgba(25,25,40,0.9)`, `rgba(28,26,38,0.75|0.88|0.92)`, `rgba(28,26,40,0.98)`, `rgba(30,25,45,0.85)`, `rgba(30,28,45,0.9)`, `rgba(30,29,45,0.72|0.9)`, `rgba(30,30,45,0.9)`, `rgba(32,26,48,0.98)`, `rgba(35,32,50,0.62)`, `rgba(35,35,55,0.8)`, `rgba(36,32,48,0.98)`, `rgba(40,35,55,0.9)`, `rgba(40,38,55,0.8|0.85)`, `rgba(45,42,60,0.55|0.72)`, `rgba(48,36,70,0.95)`, `rgba(248,248,252,0.88)`, `rgba(230,228,235,0.98)`

### Off-brand / category tints

- Indigo (Settings): `rgba(124,92,255,0.08|0.12)`, `rgba(199,181,255,0.2)`
- Home blues: `rgba(80,100,160,0.35|0.5)`, `rgba(44,68,105,0.28)`, `rgba(72,65,103,0.35)`
- Gemara purple: `rgba(180,160,255,0.25|0.3)`
- Warm / orange accents: `rgba(180,140,100,0.25|0.3)`, `rgba(255,180,100,0.3)`, `rgba(255,200,120,0.3)`
- Muted purple: `rgba(120,96,140,0.14)`

No `hsla()` usage found.

---

## Fonts

### Families (always via `fonts.*` tokens)

| Role | Family | Weights |
|------|--------|---------|
| Headings | Cormorant Garamond | 400 / 500 / 600 / 700 → `fonts.heading.*` |
| Body / UI | Nunito | 400 / 500 / 600 / 700 → `fonts.body.*` |
| Hebrew | Frank Ruhl Libre | 400 / 500 / 600 / 700 → `fonts.hebrew.*` |

Loaded in `App.tsx`. No hardcoded `fontFamily: '…'` strings in screens.

### Font-size scale (design system)

| Key | px |
|-----|-----|
| `xs` … `5xl` | `12, 14, 16, 18, 20, 24, 30, 36, 48` |
| `textStyles.display` | `52` |

### Font sizes actually used in StyleSheets (deduped)

`9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32, 34, 36, 48, 52, 64, 72`

Outside the DS scale: `9, 10, 11, 13, 15, 17, 19, 22, 26, 28, 32, 34, 64, 72`.

### Line-height multipliers (DS)

`1.2` (tight), `1.35` (snug), `1.5` (normal), `1.65` (relaxed), `2` (loose)

Absolute `lineHeight` px values also appear hardcoded in screens (commonly 13–72, esp. Omer / readers).

### Letter spacing (DS)

`-0.5, -0.25, 0, 0.5, 1, 2`

### Named text styles (`textStyles`)

`h1`, `h2`, `h3`, `h4`, `body`, `bodyBold`, `bodyLarge`, `bodySmall`, `caption`, `label`, `display` — defined in `src/design/typography.ts`; used lightly; most screens set `fontFamily` + raw `fontSize`.

---

## Spacing

### Design-system scale (`spacing`)

| Key | px |
|-----|-----|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `2xl` | 48 |
| `3xl` | 64 |
| `4xl` | 96 |
| `safeTopInset` | 52 |

### Values commonly hardcoded off-scale

`1, 2, 3, 6, 10, 12, 14, 20, 28, 30` (micro/layout tweaks); large chrome paddings `100, 120, 140, 160` (tab bar / reader); negatives `-12, -2, -1`.

---

## Border radius

### Design-system scale (`borderRadius`)

| Key | px |
|-----|-----|
| `none` | 0 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 24 |
| `2xl` | 32 |
| `full` | 9999 |

### Radii actually used in StyleSheets (deduped)

`1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 20, 22, 24, 28, 30, 85, 95, 100, 105, 115, 120, 125, 999`

Notes: `999` ≈ pill (near `full`); `85–125` = decorative blobs / large circles; `1–6, 9–11, 13–14, 20, 22, 28, 30` are off-scale.

---

## Shadows (DS)

| Key | `shadowColor` | opacity | radius | elevation |
|-----|---------------|---------|--------|-----------|
| `sm` | `#000` | 0.05 | 4 | 2 |
| `md` | `#000` | 0.1 | 8 | 4 |
| `lg` | `#000` | 0.15 | 16 | 8 |

---

## Adoption notes

- Screens generally import `useTheme` / `colors` / `fonts` / `spacing` / `borderRadius`.
- Heavy ad-hoc `rgba()` glass overlays instead of `colorWithAlpha` + tokens.
- `textStyles` underused vs raw `fontSize`.
- Off-brand solids to watch: `#007AFF` (App web chrome), `#D45555` / Material reds (errors), indigo `rgba(124,92,255,*)` in Settings — conflict with brand kit “no indigo chrome” rule.
