/**
 * Gemara – list of Talmud mesechtas + Daf Yomi button.
 * Presentation lives in components/learning/LearningParts.
 */

import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { LearningIndex } from '../../components/learning/LearningParts';
import { JewishCalendarService } from '../../src/core/calendar/JewishCalendar';

/** Babylonian Talmud mesechtas in Daf Yomi order; name = Sefaria ref, hebrew = display. */
export const MESECHTAS: { name: string; hebrew: string; dapim: number }[] = [
  { name: 'Berakhot', hebrew: 'ברכות', dapim: 64 },
  { name: 'Shabbat', hebrew: 'שבת', dapim: 157 },
  { name: 'Eruvin', hebrew: 'עירובין', dapim: 105 },
  { name: 'Pesachim', hebrew: 'פסחים', dapim: 121 },
  { name: 'Yoma', hebrew: 'יומא', dapim: 88 },
  { name: 'Sukkah', hebrew: 'סוכה', dapim: 56 },
  { name: 'Beitzah', hebrew: 'ביצה', dapim: 40 },
  { name: 'Rosh Hashanah', hebrew: 'ראש השנה', dapim: 35 },
  { name: 'Taanit', hebrew: 'תענית', dapim: 31 },
  { name: 'Megillah', hebrew: 'מגילה', dapim: 32 },
  { name: 'Moed Katan', hebrew: 'מועד קטן', dapim: 29 },
  { name: 'Chagigah', hebrew: 'חגיגה', dapim: 27 },
  { name: 'Yevamot', hebrew: 'יבמות', dapim: 122 },
  { name: 'Ketubot', hebrew: 'כתובות', dapim: 112 },
  { name: 'Nedarim', hebrew: 'נדרים', dapim: 91 },
  { name: 'Nazir', hebrew: 'נזיר', dapim: 66 },
  { name: 'Sotah', hebrew: 'סוטה', dapim: 49 },
  { name: 'Gittin', hebrew: 'גיטין', dapim: 90 },
  { name: 'Kiddushin', hebrew: 'קידושין', dapim: 82 },
  { name: 'Bava Kamma', hebrew: 'בבא קמא', dapim: 119 },
  { name: 'Bava Metzia', hebrew: 'בבא מציעא', dapim: 119 },
  { name: 'Bava Batra', hebrew: 'בבא בתרא', dapim: 176 },
  { name: 'Sanhedrin', hebrew: 'סנהדרין', dapim: 113 },
  { name: 'Makkot', hebrew: 'מכות', dapim: 24 },
  { name: 'Shevuot', hebrew: 'שבועות', dapim: 49 },
  { name: 'Avodah Zarah', hebrew: 'עבודה זרה', dapim: 76 },
  { name: 'Horayot', hebrew: 'הוריות', dapim: 14 },
  { name: 'Zevachim', hebrew: 'זבחים', dapim: 120 },
  { name: 'Menachot', hebrew: 'מנחות', dapim: 110 },
  { name: 'Chullin', hebrew: 'חולין', dapim: 142 },
  { name: 'Bekhorot', hebrew: 'בכורות', dapim: 61 },
  { name: 'Arachin', hebrew: 'ערכין', dapim: 34 },
  { name: 'Temurah', hebrew: 'תמורה', dapim: 34 },
  { name: 'Keritot', hebrew: 'כריתות', dapim: 28 },
  { name: 'Meilah', hebrew: 'מעילה', dapim: 22 },
  { name: 'Tamid', hebrew: 'תמיד', dapim: 32 },
  { name: 'Middot', hebrew: 'מידות', dapim: 37 },
  { name: 'Niddah', hebrew: 'נדה', dapim: 73 },
];

export const GemaraScreen: React.FC = () => {
  const navigation = useNavigation();

  const openDafYomi = () => {
    (navigation as any).navigate('GemaraReader', { dafYomi: true });
  };

  const openTractate = (name: string) => {
    (navigation as any).navigate('GemaraTractate', { tractate: name });
  };

  return (
    <LearningIndex
      title="Gemara"
      titleHebrew="תלמוד בבלי"
      onBack={() => navigation.goBack()}
      yomi={{
        title: 'Daf Yomi',
        subtitle: "Open today's daf",
        icon: 'book-outline',
        tint: 'lavender',
        onPress: openDafYomi,
      }}
      sectionLabel="מסכתות"
      data={MESECHTAS}
      keyExtractor={(m) => m.name}
      getHebrew={(m) => m.hebrew}
      getDetail={(m) => `${JewishCalendarService.numberToHebrew(m.dapim)} דפים`}
      detailIsHebrew
      onSelect={(m) => openTractate(m.name)}
    />
  );
};
