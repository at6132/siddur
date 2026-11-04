/**
 * Rambam Book – list of Hilchot sections for one book of Mishneh Torah.
 * Tap section -> RambamSectionScreen (chapters).
 */

import React from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LearningIndex, LearningNotFound } from '../../components/learning/LearningParts';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { bookId: string };

export const RambamBookScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookId } = (route.params || {}) as RouteParams;

  const book = RAMBAM_BOOKS.find((b) => b.id === bookId);

  const openSection = (sefariaName: string) => {
    (navigation as any).navigate('RambamSection', { sefariaName });
  };

  if (!book) {
    return <LearningNotFound title="Book not found" onBack={() => navigation.goBack()} />;
  }

  const totalChapters = book.sections.reduce((sum, s) => sum + s.chapters, 0);

  return (
    <LearningIndex
      title={book.hebrew}
      titleIsHebrew
      subtitle={`${book.english} \u2022 ${JewishCalendarService.numberToHebrew(totalChapters)} פרקים`}
      onBack={() => navigation.goBack()}
      data={book.sections}
      keyExtractor={(s) => s.sefariaName}
      getHebrew={(s) => s.hebrew}
      getDetail={(s) => `${s.chapters} פרקים`}
      detailIsHebrew
      onSelect={(s) => openSection(s.sefariaName)}
    />
  );
};
