/**
 * Nach – list of Nach books + Nach Yomi action.
 * Presentation lives in components/learning/LearningParts.
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { LearningIndex } from '../../components/learning/LearningParts';
import { NACH_BOOKS } from '../../src/services/NachYomiService';

export const NachScreen: React.FC = () => {
  const navigation = useNavigation();

  const openNachYomi = () => {
    (navigation as any).navigate('NachReader', { nachYomi: true });
  };

  const openBook = (sefariaName: string) => {
    (navigation as any).navigate('NachBook', { book: sefariaName });
  };

  return (
    <LearningIndex
      title="Nach"
      titleHebrew="נביאים וכתובים"
      onBack={() => navigation.goBack()}
      yomi={{
        title: 'Nach Yomi',
        subtitle: "Open today's chapter",
        icon: 'book-outline',
        tint: 'sage',
        onPress: openNachYomi,
      }}
      sectionLabel="ספרים"
      data={NACH_BOOKS}
      keyExtractor={(b) => b.sefariaName}
      getHebrew={(b) => b.hebrew}
      getDetail={(b) => `${b.chapters} פרקים`}
      detailIsHebrew
      onSelect={(b) => openBook(b.sefariaName)}
    />
  );
};
