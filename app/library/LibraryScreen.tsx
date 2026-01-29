import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';

interface LibraryItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  screen: string;
  color: string;
}

const LIBRARY_ITEMS: LibraryItem[] = [
  {
    id: 'tehillim',
    title: 'Tehillim',
    subtitle: '150 chapters • Daily reading',
    icon: '📖',
    screen: 'TehillimList',
    color: 'rgba(212, 165, 184, 0.3)',
  },
  {
    id: 'siddur',
    title: 'Siddur',
    subtitle: 'Daily prayers • Ashkenaz / Sfard',
    icon: '🕯️',
    screen: 'Siddur',
    color: 'rgba(165, 196, 212, 0.3)',
  },
  {
    id: 'brachos',
    title: 'Brachos',
    subtitle: 'Blessings for all occasions',
    icon: '✨',
    screen: 'Brachos',
    color: 'rgba(232, 212, 165, 0.3)',
  },
  {
    id: 'shabbos',
    title: 'Shabbos',
    subtitle: 'Candle lighting • Kiddush • Havdalah',
    icon: '🕯️',
    screen: 'Shabbos',
    color: 'rgba(196, 212, 165, 0.3)',
  },
  {
    id: 'bentching',
    title: 'Bentching',
    subtitle: 'Birkas Hamazon',
    icon: '🍞',
    screen: 'Bentching',
    color: 'rgba(212, 196, 165, 0.3)',
  },
  {
    id: 'bedtime',
    title: 'Bedtime Shema',
    subtitle: 'Kriyas Shema Al Hamita',
    icon: '🌙',
    screen: 'BedtimeShema',
    color: 'rgba(165, 165, 212, 0.3)',
  },
];

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  bgColor?: string;
}> = ({ children, style, onPress, bgColor }) => {
  const content = (
    <View style={[styles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={50} style={styles.glassBlur}>
          <View style={[styles.glassInner, bgColor && { backgroundColor: bgColor }]}>
            {children}
          </View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
          style={styles.glassBlur}
        >
          <View style={[styles.glassInner, bgColor && { backgroundColor: bgColor }]}>
            {children}
          </View>
        </LinearGradient>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleItemPress = (item: LibraryItem) => {
    if (item.id === 'tehillim') {
      navigation.navigate('TehillimList' as never);
    } else {
      // For now, show coming soon for other items
      // These screens can be implemented later
      navigation.navigate('TehillimList' as never);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>Your spiritual texts</Text>
        </FadeIn>

        {/* Main Items Grid */}
        <View style={styles.grid}>
          {LIBRARY_ITEMS.map((item, index) => (
            <FadeIn key={item.id} delay={50 + index * 30}>
              <GlassCard
                style={styles.itemCard}
                onPress={() => handleItemPress(item)}
                bgColor={item.color}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                {item.id !== 'tehillim' && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Coming Soon</Text>
                  </View>
                )}
              </GlassCard>
            </FadeIn>
          ))}
        </View>

        {/* Quick Access Section */}
        <FadeIn delay={250}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickAccessRow}>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('TehillimReader' as never, { psalm: 23 } as never)}
            >
              <Text style={styles.quickAccessIcon}>🌟</Text>
              <Text style={styles.quickAccessText}>Tehillim 23</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('TehillimReader' as never, { psalm: 91 } as never)}
            >
              <Text style={styles.quickAccessIcon}>🛡️</Text>
              <Text style={styles.quickAccessText}>Tehillim 91</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('TehillimReader' as never, { psalm: 121 } as never)}
            >
              <Text style={styles.quickAccessIcon}>⛰️</Text>
              <Text style={styles.quickAccessText}>Tehillim 121</Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },

  // Glass Card
  glassCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Item Card
  itemCard: {
    width: '47%',
    minHeight: 140,
  },
  itemIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  itemTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  comingSoonText: {
    fontFamily: fonts.body.medium,
    fontSize: 9,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },

  // Section
  sectionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // Quick Access
  quickAccessRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickAccessItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  quickAccessIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  quickAccessText: {
    fontFamily: fonts.body.medium,
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
