import { Platform } from 'react-native';

import { buildAllWidgetSnapshots } from './buildSnapshots';

/**
 * Push fresh snapshots into every iOS home-screen widget.
 * Safe to call from Expo Go / Android / web — no-ops when native widgets are unavailable.
 */
export async function refreshHomeWidgets(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const [
      { default: NextZmanWidget },
      { default: HebrewDateWidget },
      { default: TehillimStreakWidget },
      { default: CandlesWidget },
      { default: OmerBrachosWidget },
      { default: DailyInspirationWidget },
      { default: ZmanimStripWidget },
      { default: DaveningNoteWidget },
      { default: TehillimTodayWidget },
      { default: ShabbosTimesWidget },
      { default: DaySheetWidget },
      { default: PracticeHubWidget },
      { default: SeasonalBoardWidget },
    ] = await Promise.all([
      import('../../widgets/NextZmanWidget'),
      import('../../widgets/HebrewDateWidget'),
      import('../../widgets/TehillimStreakWidget'),
      import('../../widgets/CandlesWidget'),
      import('../../widgets/OmerBrachosWidget'),
      import('../../widgets/DailyInspirationWidget'),
      import('../../widgets/ZmanimStripWidget'),
      import('../../widgets/DaveningNoteWidget'),
      import('../../widgets/TehillimTodayWidget'),
      import('../../widgets/ShabbosTimesWidget'),
      import('../../widgets/DaySheetWidget'),
      import('../../widgets/PracticeHubWidget'),
      import('../../widgets/SeasonalBoardWidget'),
    ]);

    const snap = await buildAllWidgetSnapshots();

    await Promise.all([
      NextZmanWidget.updateSnapshot(snap.nextZman),
      HebrewDateWidget.updateSnapshot(snap.hebrewDate),
      TehillimStreakWidget.updateSnapshot(snap.tehillimStreak),
      CandlesWidget.updateSnapshot(snap.candles),
      OmerBrachosWidget.updateSnapshot(snap.omerBrachos),
      DailyInspirationWidget.updateSnapshot(snap.dailyInspiration),
      ZmanimStripWidget.updateSnapshot(snap.zmanimStrip),
      DaveningNoteWidget.updateSnapshot(snap.daveningNote),
      TehillimTodayWidget.updateSnapshot(snap.tehillimToday),
      ShabbosTimesWidget.updateSnapshot(snap.shabbosTimes),
      DaySheetWidget.updateSnapshot(snap.daySheet),
      PracticeHubWidget.updateSnapshot(snap.practiceHub),
      SeasonalBoardWidget.updateSnapshot(snap.seasonalBoard),
    ]);
  } catch (e) {
    // Expo Go and missing native modules land here — widgets need a dev/prod build.
    console.warn('Home widgets refresh skipped:', e);
  }
}
