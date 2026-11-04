/**
 * Mishna – list of Mishna tractates + Mishna Yomi action.
 * Presentation lives in components/learning/LearningParts.
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { LearningIndex } from '../../components/learning/LearningParts';
import { MISHNA_TRACTATES } from '../../src/services/MishnaYomiService';

export const MishnaScreen: React.FC = () => {
  const navigation = useNavigation();

  const openMishnaYomi = () => {
    (navigation as any).navigate('MishnaReader', { mishnaYomi: true });
  };

  const openTractate = (sefariaName: string) => {
    (navigation as any).navigate('MishnaTractate', { tractate: sefariaName });
  };

  return (
    <LearningIndex
      title="Mishna"
      titleHebrew="משנה"
      onBack={() => navigation.goBack()}
      yomi={{
        title: 'Mishna Yomi',
        subtitle: "Open today's perek",
        icon: 'book-outline',
        tint: 'primary',
        onPress: openMishnaYomi,
      }}
      sectionLabel="מסכתות"
      data={MISHNA_TRACTATES}
      keyExtractor={(t) => t.sefariaName}
      getHebrew={(t) => t.hebrew}
      getDetail={(t) => `${t.perakim} פרקים`}
      detailIsHebrew
      onSelect={(t) => openTractate(t.sefariaName)}
    />
  );
};
