import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassPanel } from '../../components/ui/GlassPanel';
import { ScalePress } from '../../components/animations/ScalePress';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing } from '../../src/design/spacing';
import { textStyles } from '../../src/design/typography';

// Hebrew letters for Tehillim numbering
const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט', 'כ',
  'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל',
  'לא', 'לב', 'לג', 'לד', 'לה', 'לו', 'לז', 'לח', 'לט', 'מ',
  'מא', 'מב', 'מג', 'מד', 'מה', 'מו', 'מז', 'מח', 'מט', 'נ',
  'נא', 'נב', 'נג', 'נד', 'נה', 'נו', 'נז', 'נח', 'נט', 'ס',
  'סא', 'סב', 'סג', 'סד', 'סה', 'סו', 'סז', 'סח', 'סט', 'ע',
  'עא', 'עב', 'עג', 'עד', 'עה', 'עו', 'עז', 'עח', 'עט', 'פ',
  'פא', 'פב', 'פג', 'פד', 'פה', 'פו', 'פז', 'פח', 'פט', 'צ',
  'צא', 'צב', 'צג', 'צד', 'צה', 'צו', 'צז', 'צח', 'צט', 'ק',
  'קא', 'קב', 'קג', 'קד', 'קה', 'קו', 'קז', 'קח', 'קט', 'קי',
  'קיא', 'קיב', 'קיג', 'קיד', 'קטו', 'קטז', 'קיז', 'קיח', 'קיט', 'קכ',
  'קכא', 'קכב', 'קכג', 'קכד', 'קכה', 'קכו', 'קכז', 'קכח', 'קכט', 'קל',
  'קלא', 'קלב', 'קלג', 'קלד', 'קלה', 'קלו', 'קלז', 'קלח', 'קלט', 'קמ',
  'קמא', 'קמב', 'קמג', 'קמד', 'קמה', 'קמו', 'קמז', 'קמח', 'קמט', 'קנ',
];

const TEHILLIM_COUNT = 150;

interface TehillimItem {
  number: number;
  hebrew: string;
}

export const TehillimListScreen: React.FC = () => {
  const navigation = useNavigation();

  const tehillimList: TehillimItem[] = Array.from(
    { length: TEHILLIM_COUNT },
    (_, i) => ({
      number: i + 1,
      hebrew: HEBREW_LETTERS[i] || String(i + 1),
    })
  );

  const renderItem = ({ item, index }: { item: TehillimItem; index: number }) => (
    <FadeIn delay={index * 10}>
      <ScalePress
        onPress={() => {
          navigation.navigate('TehillimReader' as never, { psalm: item.number } as never);
        }}
        style={styles.itemContainer}
      >
        <GlassPanel padding="md" borderRadius="lg" style={styles.item}>
          <View style={styles.itemContent}>
            <Text style={[textStyles.h4, styles.hebrewNumber]}>
              {item.hebrew}
            </Text>
            <Text style={[textStyles.body, styles.englishNumber]}>
              {item.number}
            </Text>
          </View>
        </GlassPanel>
      </ScalePress>
    </FadeIn>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tehillimList}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.number)}
        numColumns={3}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  list: {
    padding: spacing.md,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemContainer: {
    flex: 1,
    marginHorizontal: spacing.xs,
  },
  item: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    alignItems: 'center',
  },
  hebrewNumber: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  englishNumber: {
    color: colors.text.secondary,
  },
});
