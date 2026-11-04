/**
 * Nach Book – list of chapters for one book.
 * Mirrors GemaraTractateScreen.
 */

import React, { useMemo } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  LearningPicker,
  LearningNotFound,
  type PickerItem,
} from '../../components/learning/LearningParts';
import { NACH_BOOKS } from '../../src/services/NachYomiService';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { book: string };

export const NachBookScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { book } = (route.params || {}) as RouteParams;

  const info = NACH_BOOKS.find((b) => b.sefariaName === book);
  const chapters = info?.chapters ?? 0;

  const items = useMemo<PickerItem[]>(
    () =>
      Array.from({ length: chapters }, (_, i) => i + 1).map((ch) => ({
        key: String(ch),
        label: `פרק ${JewishCalendarService.numberToHebrew(ch)}`,
        onPress: () => (navigation as any).navigate('NachReader', { book, chapter: ch }),
      })),
    [book, chapters, navigation],
  );

  if (!book || !info) {
    return <LearningNotFound title="Book not found" onBack={() => navigation.goBack()} />;
  }

  return (
    <LearningPicker
      title={info.hebrew}
      titleIsHebrew
      subtitle={`${JewishCalendarService.numberToHebrew(chapters)} פרקים`}
      subtitleIsHebrew
      onBack={() => navigation.goBack()}
      items={items}
    />
  );
};
