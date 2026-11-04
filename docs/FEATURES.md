# FEATURES — Siddur app inventory

Snapshot of every screen, route, feature, and user flow with its owning file. Stack: Expo / React Navigation (`src/navigation/AppNavigator.tsx`). Entry: `App.tsx`. No expo-router. No auth or paywall.

Phase-1 note: Gemara, Nach, Mishna, Rambam, Chumash, Pirkei Avos, and Parsha screens exist but Library entry points route to Coming Soon via `src/feature/LibraryFeatureAccess.ts`. Live library: daily tefillos + Tehillim + Asher Yatzar / Bentching / Bedtime / Tefillas HaDerech.

---

## Navigation shell

- Root navigator (onboarding gate → Main tabs + modal stack) — `src/navigation/AppNavigator.tsx`
- Bottom tabs (Home / Library / Hub / Calendar / Search) — `src/navigation/AppNavigator.tsx` (`MainTabs` via `MainWithChrome`)
- Settings is **not** a tab — Home header gear + Search row → root stack `Settings`
- Continue-reading MiniPlayer above tab bar — `components/navigation/ContinueReadingChrome.tsx` + `components/ui/MiniPlayer.tsx`; session in `src/storage/LastPrayerSession.ts`
- Custom liquid-glass tab bar — `components/navigation/LiquidGlassTabBar.tsx`
- Hub nested stack — `src/navigation/AppNavigator.tsx` (`HubNavigator`)
- Library nested stack — `src/navigation/AppNavigator.tsx` (`LibraryNavigator`)
- Search tab (global jump index) — `app/search/SearchScreen.tsx`
- Theme + NavigationContainer bootstrap — `App.tsx`
- Deep link Shared Tehillim (`siddur://tehillim/<id>`, `https://siddur24seven.com/tehillim/<id>`) — `App.tsx`
- Notification tap → open configured screen — `src/notifications/NotificationService.ts` / `App.tsx`

---

## Screens & routes

### Pre-stack / first launch

- Intro: brand pitch, tap Begin → onboarding — `app/intro/IntroScreen.tsx`
- Onboarding shell: Nusach → Welcome — `app/onboarding/OnboardingScreen.tsx` (route `Onboarding`)
- Nusach pick (Ashkenaz / Sfard, or skip) — `app/onboarding/NusachSelection.tsx`
- Welcome + notification permission + schedule — `app/onboarding/WelcomeScreen.tsx`
- Mark onboarding complete in prefs — `src/storage/UserPreferences.ts`
- Spiritual goals step (built, not wired into current flow) — `app/onboarding/SpiritualGoals.tsx`
- Notification prefs step (built, not wired into current flow) — `app/onboarding/NotificationPreferences.tsx`
- Animated splash component (not mounted; Expo splash used) — `app/splash/AnimatedSplash.tsx`

### Bottom tabs

- Home: customizable widget grid + Settings gear — `app/home/HomeScreen.tsx` (tab `Home`)
- Library home: daily tefillos, More Texts, search, quick Tehillim — `app/library/LibraryScreen.tsx` (tab `Library` → `LibraryHome`)
- Hub overview: day/week/month stats + quick actions — `app/hub/HubOverviewScreen.tsx` (tab `Hub` → `HubOverview`)
- Calendar: month grid + day detail + zmanim — `app/calendar/CalendarScreen.tsx` (tab `Calendar`)
- Search: index of pray / Tehillim / practice / day / learn / settings destinations — `app/search/SearchScreen.tsx` (tab `Search`)

### Settings (off-tab)

- Settings: Notifications / General / About — `app/settings/SettingsScreen.tsx` (root stack `Settings`; entry from Home gear or Search)

### Hub stack

- Daily goals: add / check off morning–night goals — `app/hub/DailyGoalsScreen.tsx` (`DailyGoals`)
- Goals history: past days’ completion — `app/hub/GoalsHistoryScreen.tsx` (`GoalsHistory`)
- Gratitude journal list + streak — `app/hub/GratitudeScreen.tsx` (`Gratitude`)
- Add gratitude entry — `app/hub/AddGratitudeScreen.tsx` (`AddGratitude`)

### Root stack overlays

- Tehillim chapter reader — `app/tehillim/TehillimReaderScreen.tsx` (`TehillimReader`, params `{ psalm, campaignId? }`)
- Tehillim list (150 perakim, progress, campaigns) — `app/tehillim/TehillimListScreen.tsx` (`TehillimList`)
- Tehillim daily-goal settings — `app/tehillim/TehillimSettingsScreen.tsx` (`TehillimSettings`)
- Create shared/split Tehillim campaign — `app/tehillim/CreateSharedTehillimScreen.tsx` (`CreateSharedTehillim`)
- Shared campaign claim / read — `app/tehillim/SharedTehillimViewScreen.tsx` (`SharedTehillimView`, `{ campaignId }`)
- Sefiras HaOmer count + liturgy — `app/omer/OmerScreen.tsx` (`Omer`)
- Habits check-off against spiritual goals — `app/habits/HabitsScreen.tsx` (`Habits`)
- Tzedakah history / totals — `app/tzedakah/TzedakahScreen.tsx` (`Tzedakah`)
- Log tzedakah amount + organization — `app/tzedakah/AddTzedakahScreen.tsx` (`AddTzedakah`)
- Customize home layout (visibility / sizes) — `app/home/CustomizeHome.tsx` (`CustomizeHome`)
- Browse / add home widgets — `app/home/PanelsMarketplace.tsx` (`PanelsMarketplace`)
- Siddur / standalone prayer reader — `app/siddur/SiddurReaderScreen.tsx` (`SiddurReader`, `{ service, sectionKey? }`; also Library stack)
- Coming Soon placeholder for gated features — `app/library/ComingSoonScreen.tsx` (`ComingSoon`, `{ featureTitle? }`)
- Weekly Parsha placeholder UI — `app/library/ParshaScreen.tsx` (`Parsha`; gated)
- Gemara browse + Daf Yomi entry — `app/gemara/GemaraScreen.tsx` (`Gemara`; gated)
- Gemara tractate / daf picker — `app/gemara/GemaraTractateScreen.tsx` (`GemaraTractate`, `{ tractate }`; gated)
- Gemara page reader — `app/gemara/GemaraReaderScreen.tsx` (`GemaraReader`; gated)
- Nach books + Nach Yomi — `app/nach/NachScreen.tsx` (`Nach`; gated)
- Nach book chapters — `app/nach/NachBookScreen.tsx` (`NachBook`, `{ book }`; gated)
- Nach chapter reader — `app/nach/NachReaderScreen.tsx` (`NachReader`; gated)
- Mishna tractates + Mishna Yomi — `app/mishna/MishnaScreen.tsx` (`Mishna`; gated)
- Mishna perakim in tractate — `app/mishna/MishnaTractateScreen.tsx` (`MishnaTractate`, `{ tractate }`; gated)
- Mishna perek reader — `app/mishna/MishnaReaderScreen.tsx` (`MishnaReader`; gated)
- Rambam books + Rambam Yomi — `app/rambam/RambamScreen.tsx` (`Rambam`; gated)
- Rambam book sections — `app/rambam/RambamBookScreen.tsx` (`RambamBook`, `{ bookId }`; gated)
- Rambam hilchos chapters — `app/rambam/RambamSectionScreen.tsx` (`RambamSection`, `{ sefariaName }`; gated)
- Rambam chapter reader — `app/rambam/RambamReaderScreen.tsx` (`RambamReader`; gated)
- Chumash + Shneyim Mikra hub — `app/chumash/ChumashScreen.tsx` (`Chumash`; gated)
- Chumash parsha picker — `app/chumash/ChumashParshahPickerScreen.tsx` (`ChumashParshahPicker`, `{ sefariaName }`; gated)
- Chumash / Targum reader — `app/chumash/ChumashReaderScreen.tsx` (`ChumashReader`; gated)
- Pirkei Avos 6-perakim grid → MishnaReader — `app/library/PirkeiAvosScreen.tsx` (`PirkeiAvos`; gated)
- Create / edit custom reminder — `app/settings/AddCustomReminderScreen.tsx` (`AddCustomReminder`, `{ reminder? }`)

---

## User flows

### First-run

1. Intro → Begin — `app/intro/IntroScreen.tsx`
2. Choose nusach — `app/onboarding/NusachSelection.tsx`
3. Welcome → request notifications → enter Main tabs — `app/onboarding/WelcomeScreen.tsx`

### Daily prayer

- Open Shacharis from Library → full-scroll offline reader — `app/siddur/SiddurReaderScreen.tsx` + `src/content/siddur/shacharit/` + `src/services/ShacharitTextRules.ts`
- Open Mincha → offline pack (korbanot / ashrei / amidah / aleinu…) — `src/content/siddur/mincha/` + `src/services/MinchaTextRules.ts`
- Open Maariv → offline pack — `src/content/siddur/maariv/` + `src/services/MaarivTextRules.ts`
- Amidah seasonal / Kedusha / Modim foldouts / Refuah names — `src/services/AmidahTextPipeline.ts` + `src/content/siddur/amidahSeasonal.ts`
- Asher Yatzar / Bentching / Bedtime Shema / Tefillas HaDerech — `SiddurReader` services + `src/content/siddur/standalone/`
- Reader UX: autoscroll, text size, English toggle, section jump — `app/siddur/SiddurReaderScreen.tsx` + `components/reader/`
- Mizrach compass during Amidah — `components/ui/MizrachCompass.tsx`
- Phase-1 available services set — `src/feature/LibraryFeatureAccess.ts` (`AVAILABLE_SIDDUR_SERVICES`)

### Tehillim

- Browse / mark perakim complete — `app/tehillim/TehillimListScreen.tsx` + `src/storage/DailyTehillimTracker.ts`
- Read a perek — `app/tehillim/TehillimReaderScreen.tsx` + `src/content/tehillim/TehillimService.ts`
- Set daily Tehillim goal type — `app/tehillim/TehillimSettingsScreen.tsx`
- Create shared campaign + share link — `app/tehillim/CreateSharedTehillimScreen.tsx` + `src/api/tehillimApi.ts`
- Open / claim shared campaign (deep link) — `app/tehillim/SharedTehillimViewScreen.tsx`
- Library quick-access perakim modal — `app/library/LibraryScreen.tsx`

### Home widgets

- View / tap panels → Calendar, Tehillim, Library, trackers… — `app/home/HomeScreen.tsx` + `app/home/components/PanelContentRenderer.tsx`
- Edit layout — `app/home/CustomizeHome.tsx`
- Add panels from marketplace (phase-2 learning marked soon) — `app/home/PanelsMarketplace.tsx`
- Persist panel layout — `src/storage/HomePanelsService.ts`
- Widget copy (quotes, mussar, history…) — `src/content/HomeWidgetContent.ts`
- Auto-inject omer / davening note / fast day / rosh chodesh when relevant — `src/storage/HomePanelsService.ts`
- Hebrew birthday picker modal — `app/home/HomeScreen.tsx`
- Kosher AI App Store promo banner — `app/home/HomeScreen.tsx`

### Hub / spiritual tracking

- Hub dashboard + brachos quick-add modal — `app/hub/HubOverviewScreen.tsx` + `src/storage/BrachosCounterService.ts`
- Daily goals morning list / night check-off — `app/hub/DailyGoalsScreen.tsx` + `src/storage/DailyGoalsService.ts`
- Goals history day detail modal — `app/hub/GoalsHistoryScreen.tsx`
- Gratitude list → add entry — `app/hub/GratitudeScreen.tsx` → `AddGratitudeScreen.tsx` + `src/storage/GratitudeTracker.ts`
- Habits check-off — `app/habits/HabitsScreen.tsx` + `src/storage/HabitTracker.ts`
- Tzedakah history → add gift — `app/tzedakah/` + `src/storage/TzedakahTracker.ts`
- Omer count after tzeit + post-omer liturgy — `app/omer/OmerScreen.tsx` + `src/core/omer/OmerCalculator.ts` + `src/content/omer/postOmerLiturgy.ts`
- Streaks (Tehillim / davening) — `src/storage/DailyTehillimTracker.ts`, `DaveningStreakService.ts`, `StreakService.ts`
- Hub “coming soon” cards (Minyan Finder, Kosher Restaurants) — `app/hub/HubOverviewScreen.tsx`

### Calendar / location / zmanim

- Month browse + day detail — `app/calendar/CalendarScreen.tsx`
- Zmanim / Jewish calendar engine — `src/core/zmanim/ZmanimService.ts` + `src/core/calendar/CalendarEngine.ts` + `JewishCalendar.ts`
- Request / refresh location (Calendar, Omer, Mizrach) — `src/services/LocationAccess.ts` + `LocationRefreshService.ts`
- Spiritual cues for davening notes — `src/core/spiritual/SpiritualCues.ts`
- Gedolim yahrzeit content — `src/content/GedolimYahrzeits.ts`

### Settings

- Notifications tab: master toggle, prayer times, Tehillim/Gratitude, Shabbos/Shekiya, special days, davening add-ons — `app/settings/SettingsScreen.tsx`
- Shabbos morning alarm + ring duration — `app/settings/SettingsScreen.tsx` + `src/notifications/shabbosClockConstants.ts`
- Custom reminders list → add/edit/delete — `SettingsScreen` + `AddCustomReminderScreen.tsx` + `NotificationScheduler.ts`
- Nusach Ashkenaz / Sfard — `SettingsScreen` + `src/types/preferences.ts`
- Refuah names CRUD for Amidah Refaenu — `SettingsScreen` modal
- Display text size (transliteration stub “coming soon”) — `SettingsScreen`
- About: version, Sefaria credit, support, Privacy/Terms URLs — `SettingsScreen` + `src/legal/links.ts`
- Preference persistence — `src/storage/UserPreferences.ts`

### Learning (implemented screens; Library-gated to Coming Soon)

- Navigate or Coming Soon gate — `src/feature/LibraryFeatureAccess.ts` (`navigateOrComingSoon`)
- Sefaria online text fetch — `src/services/SefariaService.ts`
- Daf / Mishna / Nach / Rambam / Shneyim Yomi calculators — `src/services/MishnaYomiService.ts`, `NachYomiService.ts`, `RambamYomiService.ts`, `ShneyimMikraService.ts`
- Chumash / Rambam / Pirkei Avos structure helpers — `ChumashStructure.ts`, `RambamStructure.ts`, `PirkeiAvosService.ts`
- Shneyim Mikra progress tracking — `src/storage/ShneyimMikraTracker.ts`

---

## Features (non-screen owners)

### Content / prayer pipeline

- Siddur orchestration — `src/content/siddur/SiddurService.ts`
- Offline Shacharit / Mincha / Maariv / Standalone — `OfflineShacharitService.ts`, `OfflineMinchaService.ts`, `OfflineMaarivService.ts`, `OfflineStandaloneService.ts`
- Section pipelines / prayer processor — `ShacharitSectionPipelines.ts`, `PrayerContentProcessor.ts`
- Nusach types — `src/types/nusach.ts`

### Notifications

- Permission + local scheduling — `src/notifications/NotificationService.ts`, `NotificationScheduler.ts`
- Notification copy — `src/notifications/NotificationContent.ts`
- Notification types — `src/notifications/types.ts`

### Analytics / identity

- Anonymous identity — `src/analytics/IdentityService.ts`
- Analytics client / lifecycle / screen context — `src/analytics/`
- Error boundary — `components/analytics/AnalyticsErrorBoundary.tsx`

### Shared UI chrome

- Glass cards / panels / buttons — `components/ui/GlassCard.tsx`, `GlassPanel.tsx`, home `GlassCard.tsx`
- Back button — `components/ui/BackButton.tsx`
- Segmented control — `components/navigation/LiquidGlassSegmentedControl.tsx`
- Reader chrome / toolbar / autoscroll — `components/reader/ReaderChrome.tsx`, `ReaderToolbar.tsx`, `ReaderAutoscrollBar.tsx`, `useAutoscroll.ts`
- Continue-reading MiniPlayer (last prayer session) — `components/ui/MiniPlayer.tsx`, `ContinueReadingChrome.tsx`, `LastPrayerSession.ts`
- Hub goal row / progress ring / celebration — `app/hub/` components (`GoalRow`, `GoalProgressRing`, `AllDoneCelebration`, `SatisfyingCheckbox`)
- Notification banner — `components/ui/NotificationBanner.tsx`
- Motion helpers — `components/animations/ScalePress.tsx`
- Home drag grid — `app/home/components/DraggableGrid.tsx`, `DraggableGridItem.tsx`

### Storage / prefs

- Generic storage — `src/storage/StorageService.ts`
- Date utils — `src/utils/dateUtils.ts`

---

## Home panel types (marketplace)

Each type is defined in `src/storage/HomePanelsService.ts`; rendered by `app/home/components/PanelContentRenderer.tsx`.

- `date` — Hebrew + Gregorian date
- `greeting` — time-of-day greeting
- `zmanim` — sunrise / sunset / key times
- `shabbos_times` — candle lighting + Havdalah
- `weekly_parsha` — week’s parsha (*phase-2 soon*)
- `candle_lighting` — countdown to candles
- `fast_day_info` — fast progress (auto when relevant)
- `omer_counter` — Sefiras HaOmer (auto when relevant)
- `rosh_chodesh` — new month / molad (auto when relevant)
- `hebrew_birthday` — countdown to Hebrew birthday
- `yahrzeit` — today’s gedolim yahrzeit
- `moon_phase` — lunar phase
- `tehillim_progress` — daily Tehillim tracker
- `davening_note` — Hallel / Tachanun changes (auto when relevant)
- `daf_yomi` / `nach_yomi` / `mishna_yomis` / `parsha_summary` / `rambam_daily` / `chumash_daily` — learning widgets (*phase-2 soon*)
- `mussar` / `word_of_day` / `torah_thought` / `zohar` / `jewish_history` / `gedolim_story` / `mitzvah_of_day` / `middah_of_week` — learning / inspiration content
- `inspiration_quote` — daily quote
- `gratitude` — gratitude prompt
- `tehillim_stats` / `brachos_counter` / `tzedakah_tracker` / `habits` — tracking
- `minyan_times` / `shul_announcements` / `shiurim` / `tehillim_group` / `simchas` / `chesed_opportunities` / `dvar_torah_share` / `prayer_request` — community (mostly stubs)

Default visible panels: `date`, `zmanim`, `tehillim_progress`, `davening_note`, `inspiration_quote`.

---

## Modals & special interactions

- Hebrew birthday picker — `app/home/HomeScreen.tsx`
- Refuah name editor — `app/settings/SettingsScreen.tsx`
- Reminder time pickers — `app/settings/SettingsScreen.tsx`
- Custom reminder overflow (edit/delete) — `app/settings/SettingsScreen.tsx`
- Mizrach compass — `app/siddur/SiddurReaderScreen.tsx` + `components/ui/MizrachCompass.tsx`
- Library quick Tehillim shortcuts editor — `app/library/LibraryScreen.tsx`
- Shared Tehillim claim range — `app/tehillim/SharedTehillimViewScreen.tsx`
- Brachos quick-add — `app/hub/HubOverviewScreen.tsx`
- Goals history day expand — `app/hub/GoalsHistoryScreen.tsx`
- Panel explanation (?) in marketplace — `app/home/PanelsMarketplace.tsx`
- Create-campaign share sheet — `app/tehillim/CreateSharedTehillimScreen.tsx`

---

## Explicit non-features (current build)

- No login / accounts UI (analytics identity only) — `src/analytics/IdentityService.ts`
- No IAP / paywall / Stripe
- No in-app Privacy/Terms screens (external URLs only) — `src/legal/links.ts`
- No dedicated Location settings panel (prompted in-context)
