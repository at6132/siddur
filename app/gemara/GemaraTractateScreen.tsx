/**
 * Gemara Tractate – list of dapim for one mesechta.
 * Tap a daf to open GemaraReader.
 */

import React, { useMemo } from 'react';
import { useRoute, useNavigation } from '@react-navigation/native';
import {
  LearningPicker,
  LearningNotFound,
  type PickerItem,
} from '../../components/learning/LearningParts';
import { MESECHTAS } from './GemaraScreen';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

type RouteParams = { tractate: string };

export const GemaraTractateScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { tractate } = (route.params || {}) as RouteParams;

  const info = MESECHTAS.find((m) => m.name === tractate);
  const dapim = info?.dapim ?? 0;

  const items = useMemo<PickerItem[]>(() => {
    const list: PickerItem[] = [];
    for (let d = 2; d <= dapim + 1; d++) {
      for (const side of ['a', 'b'] as const) {
        list.push({
          key: `${d}${side}`,
          label: `דף ${JewishCalendarService.numberToHebrew(d)} ${side === 'a' ? 'א' : 'ב'}`,
          onPress: () => (navigation as any).navigate('GemaraReader', { tractate, daf: d, side }),
        });
      }
    }
    return list;
  }, [dapim, navigation, tractate]);

  if (!tractate || !info) {
    return <LearningNotFound title="Tractate not found" onBack={() => navigation.goBack()} />;
  }

  return (
    <LearningPicker
      title={info.hebrew}
      titleIsHebrew
      subtitle={`${JewishCalendarService.numberToHebrew(dapim)} דפים`}
      subtitleIsHebrew
      onBack={() => navigation.goBack()}
      items={items}
    />
  );
};
