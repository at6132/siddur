# Redesign summary

End-to-end presentation redesign against `docs/FEATURES.md`, `docs/CURRENT-TOKENS.md`, and `.cursor/rules/`. Business logic, storage, and navigation targets were preserved.

## What changed (by area)

| Area | Commit(s) | Notes |
|------|-----------|--------|
| Foundation | `redesign: foundation` | Tokens facade, Screen/Section/ListRow/Chip/GlassButton/MiniPlayer, 5-tab IA + continue-reading MiniPlayer |
| Prayer reader | `redesign: SiddurReader` + reader chrome | Theme-aware styles, no emoji toolbar, haptics |
| Search / Intro / ComingSoon / Calendar | per-screen commits | `Screen` primitives, Ionicons, token shadows/haptics |
| Onboarding | `redesign: onboarding` | Nusach / Welcome / unwired SpiritualGoals & NotificationPreferences |
| Home | `redesign: Home` | Edit haptics, marketplace/customize primitives, panel Ionicons |
| Library | `redesign: Library` | Grouped sections, customize sheet polish |
| Hub / practice | `redesign: Hub` | PracticeKit, goals/gratitude/habits/tzedakah/omer |
| Learning (gated) | `redesign: learning screens` (+ polish) | Shared LearningParts / ReaderParts |
| Settings + Tehillim | `redesign: Settings and Tehillim` | SettingsKit, TehillimKit, sheets instead of heavy glass cards |
| Splash | (with Settings commit) | AnimatedSplash themed; still **unmounted** (Expo splash) |
| Phase 4 cleanup | `redesign: phase-4 cleanup` | Remaining hex/emoji in calendar, panels, banners, celebration |

Full per-screen status lives in `docs/REDESIGN-CHECKLIST.md` (all rows marked done).

## FEATURES.md reachability

Every FEATURES.md screen and flow remains reachable:

- Tabs: Home / Library / Hub / Calendar / Search
- Settings off-tab (Home gear + Search)
- Continue-reading MiniPlayer → SiddurReader
- Library daily tefillos + Tehillim; gated learning still → Coming Soon via `LibraryFeatureAccess`
- Hub practice stacks, Omer, Habits, Tzedakah
- Deep link Shared Tehillim + notification navigation unchanged
- SpiritualGoals / NotificationPreferences still unwired (as before); polished and available
- AnimatedSplash still unmounted (as before)

No FEATURES.md item was removed. Small UX swaps that keep the same capability:

- Some success/info Alerts → inline errors or section footers (Settings / Tehillim create/claim)
- Transliteration “coming soon” Alert → disabled switch with subtitle
- Shabbos alarm “heads up” Alert → section footer copy

## Couldn’t / didn’t do

- **Expo Router native tabs / large titles** — app is React Navigation + LiquidGlassTabBar for Expo Go; native expo-router tabs deferred
- **Dark mode forced on** — tokens/theme support dark; app still defaults light as before
- **Pre-existing `tsc` noise** — Calendar/App typing issues and some `navigate(... as never)` casts remain; not introduced as blockers for this redesign
- **Did not rewrite** content pipelines, zmanim, notifications scheduling, or storage services

## Check on your phone

1. Cold start → Intro → Nusach → Welcome → notification prompt → Home
2. Home edit mode: drag, remove, add from marketplace, Settings gear
3. Library: open Shacharis, autoscroll / text size / English / section jump; resume via MiniPlayer
4. Tehillim list → read → mark complete; create/join shared page if you use that
5. Hub: brachos sheet, daily goals check-off + “all done”, gratitude, habits, tzedakah, Omer (if in season)
6. Calendar: month select, day detail, zmanim with location
7. Search jump to Settings; toggle a notification; add a custom reminder
8. Gated Library items still land on Coming Soon
9. Light appearance + safe areas above tab bar / MiniPlayer; selection haptics on presses
