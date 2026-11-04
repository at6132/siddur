/**
 * Mishna Tractate – list of perakim for one tractate.
 */

import React, { useMemo } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  LearningPicker,
  LearningNotFound,
  type PickerItem,
} from '../../components/learning/LearningParts';
import { MISHNA_TRACTATES } from '../../src/services/MishnaYomiService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { tractate: string };

export const MishnaTractateScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { tractate } = (route.params || {}) as RouteParams;

  const info = MISHNA_TRACTATES.find((t) => t.sefariaName === tractate);
  const perakim = info?.perakim ?? 0;

  const items = useMemo<PickerItem[]>(
    () =>
      Array.from({ length: perakim }, (_, i) => i + 1).map((p) => ({
        key: String(p),
        label: `פרק ${JewishCalendarService.numberToHebrew(p)}`,
        onPress: () => (navigation as any).navigate('MishnaReader', { tractate, perek: p }),
      })),
    [navigation, perakim, tractate],
  );

  if (!tractate || !info) {
    return <LearningNotFound title="Tractate not found" onBack={() => navigation.goBack()} />;
  }

  return (
    <LearningPicker
      title={info.hebrew}
      titleIsHebrew
      subtitle={`${JewishCalendarService.numberToHebrew(perakim)} פרקים`}
      subtitleIsHebrew
      onBack={() => navigation.goBack()}
      items={items}
    />
  );
};
