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
| Search tab | `app/search/SearchScreen.tsx` | Global jump index | done — thin redesign if needed |
| App bootstrap / deep links / notification nav | `App.tsx` | Theme, deep links, notification tap | done — Settings off-tab routing |

## Prayer reader

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| SiddurReader | `app/siddur/SiddurReaderScreen.tsx` | Daily + standalone tefillos, autoscroll, text size, English toggle, section jump, Mizrach, Amidah foldouts, Refuah, continue-session | done — theme-aware styles + dark mode; logic unchanged |
| ReaderChrome / Toolbar / AutoscrollBar | `components/reader/*` | Shared reader chrome | done — no emoji; tokens; haptics |

## Home

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| Home | `app/home/HomeScreen.tsx` | Widget grid, seasonal auto-panels, Settings gear, birthday modal, Kosher AI banner, streaks glance | todo |
| CustomizeHome | `app/home/CustomizeHome.tsx` | Layout visibility / sizes | todo |
| PanelsMarketplace | `app/home/PanelsMarketplace.tsx` | Browse / add panels | todo |
| Home panel chrome | `app/home/components/GlassCard.tsx`, `DraggableGrid*.tsx`, `PanelContentRenderer.tsx` | Panel render / drag | todo — with Home |

## Pre-stack / first launch

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| Intro | `app/intro/IntroScreen.tsx` | Brand pitch → Begin | todo |
| Onboarding | `app/onboarding/OnboardingScreen.tsx` | Shell Nusach → Welcome | todo |
| NusachSelection | `app/onboarding/NusachSelection.tsx` | Ashkenaz / Sfard / skip | todo |
| Welcome | `app/onboarding/WelcomeScreen.tsx` | Notifications permission + schedule | todo |
| SpiritualGoals | `app/onboarding/SpiritualGoals.tsx` | Built, unwired | todo — presentational polish; keep available |
| NotificationPreferences | `app/onboarding/NotificationPreferences.tsx` | Built, unwired | todo — presentational polish; keep available |
| AnimatedSplash | `app/splash/AnimatedSplash.tsx` | Unmounted splash component | todo — polish; do not mount unless requested |

## Library + Tehillim

| Route / id | Owning file | FEATURES coverage | Status |
|------------|-------------|-------------------|--------|
| LibraryHome | `app/library/LibraryScreen.tsx` | Daily tefillos, More Texts, quick Tehillim, search shortcuts | todo |
| ComingSoon | `app/library/ComingSoonScreen.tsx` | Gated feature placeholder | todo |
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
| Calendar | `app/calendar/CalendarScreen.tsx` | Month, day detail, zmanim, location | todo |

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
