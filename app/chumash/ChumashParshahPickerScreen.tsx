/**
 * Chumash Parshah Picker – choose a parsha within a sefer (book).
 */

import React from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LearningIndex, LearningNotFound } from '../../components/learning/LearningParts';
import { CHUMASH_BOOKS, PARSHIYOT_BY_BOOK, type ParshahOption } from '../../src/services/ChumashStructure';

type RouteParams = { sefariaName: string };

export const ChumashParshahPickerScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { sefariaName } = (route.params || {}) as RouteParams;

  const book = CHUMASH_BOOKS.find((b) => b.sefariaName === sefariaName);
  const parshiyot = (sefariaName && PARSHIYOT_BY_BOOK[sefariaName]) ?? [];

  const openParshah = (p: ParshahOption) => {
    (navigation as any).navigate('ChumashReader', {
      ref: p.ref,
      parsha: p.parsha,
    });
  };

  if (!sefariaName || !book) {
    return <LearningNotFound title="Book not found" onBack={() => navigation.goBack()} />;
  }

  return (
    <LearningIndex
      title={book.hebrew}
      titleIsHebrew
      subtitle={`${book.sefariaName} \u2022 ${parshiyot.length} parshiyot`}
      onBack={() => navigation.goBack()}
      data={parshiyot}
      keyExtractor={(p) => p.parsha}
      getHebrew={(p) => p.hebrew}
      getDetail={(p) => p.parsha}
      onSelect={openParshah}
    />
  );
};
