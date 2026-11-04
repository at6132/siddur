/**
 * Pirkei Avos – 6 perakim. No daily-schedule button (studied weekly in summer).
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { LearningIndex } from '../../components/learning/LearningParts';

const PEREK_HEBREW = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'];

const PEREKIM = [1, 2, 3, 4, 5, 6];

export const PirkeiAvosScreen: React.FC = () => {
  const navigation = useNavigation();

  const openPerek = (perek: number) => {
    (navigation as any).navigate('MishnaReader', { tractate: 'Pirkei Avot', perek });
  };

  return (
    <LearningIndex
      title="Pirkei Avos"
      titleHebrew="פרקי אבות"
      onBack={() => navigation.goBack()}
      subtitle="6 perakim"
      data={PEREKIM}
      keyExtractor={(p) => String(p)}
      getHebrew={(p) => `פרק ${PEREK_HEBREW[p - 1]}`}
      getDetail={(p) => `Perek ${p}`}
      onSelect={openPerek}
    />
  );
};
