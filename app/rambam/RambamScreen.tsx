/**
 * Rambam – Rambam Yomi action + books of Mishneh Torah.
 * Presentation lives in components/learning/LearningParts.
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { LearningIndex } from '../../components/learning/LearningParts';
import { RAMBAM_BOOKS } from '../../src/services/RambamStructure';

export const RambamScreen: React.FC = () => {
  const navigation = useNavigation();

  const openRambamYomi = () => {
    (navigation as any).navigate('RambamReader', { rambamYomi: true });
  };

  const openBook = (bookId: string) => {
    (navigation as any).navigate('RambamBook', { bookId });
  };

  return (
    <LearningIndex
      title="Rambam"
      titleHebrew="משנה תורה"
      onBack={() => navigation.goBack()}
      yomi={{
        title: 'Rambam Yomi',
        subtitle: "3 chapters per day. Open today's study",
        icon: 'book-outline',
        tint: 'gold',
        onPress: openRambamYomi,
      }}
      sectionLabel="ספרים"
      data={RAMBAM_BOOKS}
      keyExtractor={(b) => b.id}
      getHebrew={(b) => b.hebrew}
      getDetail={(b) => `${b.sections.length} הלכות`}
      detailIsHebrew
      onSelect={(b) => openBook(b.id)}
    />
  );
};
