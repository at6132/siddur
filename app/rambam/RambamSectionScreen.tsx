/**
 * Rambam Section – grid of chapters for one Hilchot section.
 * Tap chapter -> RambamReader with sefariaRef.
 */

import React, { useMemo } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  LearningPicker,
  LearningNotFound,
  type PickerItem,
} from '../../components/learning/LearningParts';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { sefariaName: string };

export const RambamSectionScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { sefariaName } = (route.params || {}) as RouteParams;

  const section = RAMBAM_BOOKS.flatMap((b) => b.sections).find(
    (s) => s.sefariaName === sefariaName,
  );
  const chapters = section?.chapters ?? 0;

  const items = useMemo<PickerItem[]>(
    () =>
      Array.from({ length: chapters }, (_, i) => i + 1).map((ch) => ({
        key: String(ch),
        label: `פרק ${JewishCalendarService.numberToHebrew(ch)}`,
        onPress: () => {
          const sefariaRef = `Mishneh Torah, ${sefariaName} ${ch}`;
          (navigation as any).navigate('RambamReader', { sefariaRef });
        },
      })),
    [chapters, navigation, sefariaName],
  );

  if (!section || !sefariaName) {
    return <LearningNotFound title="Section not found" onBack={() => navigation.goBack()} />;
  }

  return (
    <LearningPicker
      title={section.hebrew}
      titleIsHebrew
      subtitle={`${JewishCalendarService.numberToHebrew(chapters)} פרקים`}
      subtitleIsHebrew
      onBack={() => navigation.goBack()}
      items={items}
    />
  );
};
