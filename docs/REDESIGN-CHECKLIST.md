# Redesign checklist

Source of truth: `docs/FEATURES.md`, `docs/CURRENT-TOKENS.md`, `.cursor/rules/`.  
Stack note: App uses **React Navigation** (`src/navigation/AppNavigator.tsx`), not Expo Router file routes. Screens live under `app/` but are registered in the navigator. Native expo-router tabs deferred — existing 5-tab LiquidGlass shell + MiniPlayer preserved for Expo Go / feature parity.

## Flags (features without a dedicated mounted screen)

- **SpiritualGoals** / **NotificationPreferences** — built under `app/onboarding/` but not wired into current Onboarding flow; reachable later via Settings redesign or onboarding re-wire. Status tracked below as components.
- **AnimatedSplash** — not mounted (Expo splash used). Keep as redesignable component; do not delete.

---

## Shared foundation

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| tokens | `src/design/theme/tokens.ts` (+ colors/spacing/typography) | Brand palette light/dark, spacing, radii, type, Hebrew | done — facade over CURRENT-TOKENS |
| Screen / Section / ListRow / Chip / GlassButton / MiniPlayer | `components/ui/*` | Shared chrome primitives | done |
| LoadingSpinner / ErrorView | `components/ui/LoadingSpinner.tsx`, `ErrorView.tsx` | Loading / error states | done — exist; adopt on screens |
| LastPrayerSession | `src/storage/LastPrayerSession.ts` | Continue-reading persistence | done |

## Navigation / layout

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| Main tabs shell | `src/navigation/AppNavigator.tsx` (`MainWithChrome`) | Home / Library / Hub / Calendar / Search; Settings off-tab | done — IA |
| LiquidGlassTabBar | `components/navigation/LiquidGlassTabBar.tsx` | Custom liquid-glass tab bar | done — selection haptics; absoluteFill fix |
| ContinueReadingChrome | `components/navigation/ContinueReadingChrome.tsx` | MiniPlayer above tab bar → SiddurReader | done |
| Search tab | `app/search/SearchScreen.tsx` | Global jump index | done — wrapped in `Screen` (gradient, safe areas, empty state), grouped `Section`/`ListRow` list, token-only styling |
| App bootstrap / deep links / notification nav | `App.tsx` | Theme, deep links, notification tap | done — Settings off-tab routing |

## Prayer reader

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| SiddurReader | `app/siddur/SiddurReaderScreen.tsx` | Daily + standalone tefillos, autoscroll, text size, English toggle, section jump, Mizrach, Amidah foldouts, Refuah, continue-session | done — theme-aware styles + dark mode; logic unchanged |
| ReaderChrome / Toolbar / AutoscrollBar | `components/reader/*` | Shared reader chrome | done — no emoji; tokens; haptics |

## Home

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| Home | `app/home/HomeScreen.tsx` | Widget grid, seasonal auto-panels, Settings gear, birthday modal, Kosher AI banner, streaks glance | done — no emoji (Ionicons), edit/add haptics, tokenized header/modal/panel fills, shorter edit hint; grid + panel logic unchanged |
| CustomizeHome | `app/home/CustomizeHome.tsx` | Layout visibility / sizes | done — `Screen` + `Section`/`ListRow`, native Switch for visibility, reorder/remove behind row expand, haptics; service calls unchanged |
| PanelsMarketplace | `app/home/PanelsMarketplace.tsx` | Browse / add panels | done — category `Chip`s, grouped `Section` rows, Ionicons via `utils/panelIcons.ts`, success haptic instead of alert; add logic unchanged |
| Home panel chrome | `app/home/components/GlassCard.tsx`, `DraggableGrid*.tsx`, `PanelContentRenderer.tsx` | Panel render / drag | done — GlassCard theme glass; panel emoji → Ionicons + `panelIcons`; DraggableGridItem remove/shadow tokens |

## Pre-stack / first launch

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| Intro | `app/intro/IntroScreen.tsx` | Brand pitch → Begin | done — emoji replaced with Ionicons rows (hairlines, no cards), theme tokens, Reanimated springs + reduced motion, `onBegin` unchanged |
| Onboarding | `app/onboarding/OnboardingScreen.tsx` | Shell Nusach → Welcome | done — shell is a token-colored wrapper; each step owns its `Screen` (gradient + safe areas); flow, analytics, and storage calls unchanged |
| NusachSelection | `app/onboarding/NusachSelection.tsx` | Ashkenaz / Sfard / skip | done — left-aligned title, `Section`/`ListRow` radio list with checkmark, spring-in Continue, ghost Skip; no emoji, orbs, or glass cards |
| Welcome | `app/onboarding/WelcomeScreen.tsx` | Notifications permission + schedule | done — Ionicons heart replaces emoji, Reanimated spring entrances (reduced-motion aware), em-dash removed from copy; `onStart` unchanged |
| SpiritualGoals | `app/onboarding/SpiritualGoals.tsx` | Built, unwired | done — token `Chip` goal picker (max 2 + custom input), shared step dots, tokenized count line, em-dash removed; selection logic unchanged, still unwired |
| NotificationPreferences | `app/onboarding/NotificationPreferences.tsx` | Built, unwired | done — grouped `Section` of `ListRow` + native `Switch` (selection haptic), emoji removed, enabled-count footer; preferences logic unchanged, still unwired |
| AnimatedSplash | `app/splash/AnimatedSplash.tsx` | Unmounted splash component | todo — polish; do not mount unless requested |

## Library + Tehillim

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| LibraryHome | `app/library/LibraryScreen.tsx` | Daily tefillos, More Texts, quick Tehillim, search shortcuts | done — `Screen` + virtualized `FlatList`, grouped `Section`/`ListRow` (Tefillos, More Texts, Quick Access), `Chip` quick links, pageSheet customize modal, no emoji or hex; navigation targets, search, and AsyncStorage unchanged |
| ComingSoon | `app/library/ComingSoonScreen.tsx` | Gated feature placeholder | done — `Screen` + `BackButton` + `EmptyState`, no hex or emoji |
| TehillimList | `app/tehillim/TehillimListScreen.tsx` | 150 perakim, progress, campaigns | todo |
| TehillimReader | `app/tehillim/TehillimReaderScreen.tsx` | Chapter reader | todo |
| TehillimSettings | `app/tehillim/TehillimSettingsScreen.tsx` | Daily goal type | todo |
| CreateSharedTehillim | `app/tehillim/CreateSharedTehillimScreen.tsx` | Shared campaign + share | todo |
| SharedTehillimView | `app/tehillim/SharedTehillimViewScreen.tsx` | Claim / read campaign | todo |

## Hub / practice

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| HubOverview | `app/hub/HubOverviewScreen.tsx` | Stats, brachos, quick actions, coming-soon cards | todo |
| DailyGoals | `app/hub/DailyGoalsScreen.tsx` | Morning–night goals | todo |
| GoalsHistory | `app/hub/GoalsHistoryScreen.tsx` | Past completion | todo |
| Gratitude | `app/hub/GratitudeScreen.tsx` | Journal + streak | todo |
| AddGratitude | `app/hub/AddGratitudeScreen.tsx` | Add entry | todo |
| Habits | `app/habits/HabitsScreen.tsx` | Habit check-off | todo |
| Tzedakah | `app/tzedakah/TzedakahScreen.tsx` | History / totals | todo |
| AddTzedakah | `app/tzedakah/AddTzedakahScreen.tsx` | Log gift | todo |
| Omer | `app/omer/OmerScreen.tsx` | Sefiras HaOmer + liturgy | todo |

## Calendar

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| Calendar | `app/calendar/CalendarScreen.tsx` | Month, day detail, zmanim, location | done — selection haptics; shadow tokens; dropped static colors import |

## Settings

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| Settings | `app/settings/SettingsScreen.tsx` | Notifications, Shabbos alarm, reminders, nusach, Refuah, display, About | todo |
| AddCustomReminder | `app/settings/AddCustomReminderScreen.tsx` | Create / edit reminder | todo |

## Learning (gated → Coming Soon from Library; screens exist)

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| Parsha | `app/library/ParshaScreen.tsx` | Weekly Parsha UI | todo |
| PirkeiAvos | `app/library/PirkeiAvosScreen.tsx` | 6 perakim → MishnaReader | todo |
| Gemara | `app/gemara/GemaraScreen.tsx` | Browse + Daf Yomi | todo |
| GemaraTractate | `app/gemara/GemaraTractateScreen.tsx` | Tractate / daf picker | todo |
| GemaraReader | `app/gemara/GemaraReaderScreen.tsx` | Page reader | todo |
| Nach | `app/nach/NachScreen.tsx` | Books + Nach Yomi | todo |
| NachBook | `app/nach/NachBookScreen.tsx` | Chapters | todo |
| NachReader | `app/nach/NachReaderScreen.tsx` | Chapter reader | todo |
| Mishna | `app/mishna/MishnaScreen.tsx` | Tractates + Mishna Yomi | todo |
| MishnaTractate | `app/mishna/MishnaTractateScreen.tsx` | Perakim | todo |
| MishnaReader | `app/mishna/MishnaReaderScreen.tsx` | Perek reader | todo |
| Rambam | `app/rambam/RambamScreen.tsx` | Books + Yomi | todo |
| RambamBook | `app/rambam/RambamBookScreen.tsx` | Sections | todo |
| RambamSection | `app/rambam/RambamSectionScreen.tsx` | Hilchos chapters | todo |
| RambamReader | `app/rambam/RambamReaderScreen.tsx` | Chapter reader | todo |
| Chumash | `app/chumash/ChumashScreen.tsx` | Shneyim Mikra hub | todo |
| ChumashParshahPicker | `app/chumash/ChumashParshahPickerScreen.tsx` | Parsha picker | todo |
| ChumashReader | `app/chumash/ChumashReaderScreen.tsx` | Chumash / Targum reader | todo |

---

## Progress log

- Foundation committed (`redesign: foundation`).
- LiquidGlassTabBar: selection haptics.
- Reader chrome: AutoscrollBar/Toolbar tokenized, no emoji play icons, haptics.
- SiddurReader: styles via `createReaderStyles(theme)` for light/dark; continue-session already wired.
