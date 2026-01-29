import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { UserPreferencesService } from '../../src/storage/UserPreferences';

interface PrayerItem {
  id: string;
  title: string;
  hebrewTitle: string;
  subtitle: string;
  icon: string;
  service: 'shacharis' | 'mincha' | 'maariv';
  color: string;
  defaultTime: string;
}

interface LibraryItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  screen: string;
  color: string;
}

const PRAYER_ITEMS: PrayerItem[] = [
  {
    id: 'shacharis',
    title: 'Shacharis',
    hebrewTitle: 'שחרית',
    subtitle: 'Morning prayers',
    icon: '🌅',
    service: 'shacharis',
    color: 'rgba(255, 200, 120, 0.3)',
    defaultTime: '7:00 AM',
  },
  {
    id: 'mincha',
    title: 'Mincha',
    hebrewTitle: 'מנחה',
    subtitle: 'Afternoon prayers',
    icon: '☀️',
    service: 'mincha',
    color: 'rgba(255, 180, 100, 0.3)',
    defaultTime: '1:00 PM',
  },
  {
    id: 'maariv',
    title: 'Maariv',
    hebrewTitle: 'מעריב',
    subtitle: 'Evening prayers',
    icon: '🌙',
    service: 'maariv',
    color: 'rgba(100, 120, 180, 0.3)',
    defaultTime: '8:00 PM',
  },
];

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
    icon: '😴',
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

// Prayer Reminder State
interface PrayerReminders {
  shacharis: { enabled: boolean; time: string };
  mincha: { enabled: boolean; time: string };
  maariv: { enabled: boolean; time: string };
}

export const LibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [prayerReminders, setPrayerReminders] = useState<PrayerReminders>({
    shacharis: { enabled: false, time: '7:00 AM' },
    mincha: { enabled: false, time: '1:00 PM' },
    maariv: { enabled: false, time: '8:00 PM' },
  });

  useFocusEffect(
    React.useCallback(() => {
      loadReminders();
    }, [])
  );

  const loadReminders = async () => {
    const prefs = await UserPreferencesService.getPreferences();
    if (prefs?.notifications?.prayerReminders) {
      setPrayerReminders(prefs.notifications.prayerReminders);
    }
  };

  const toggleReminder = async (prayerId: 'shacharis' | 'mincha' | 'maariv') => {
    const newReminders = {
      ...prayerReminders,
      [prayerId]: {
        ...prayerReminders[prayerId],
        enabled: !prayerReminders[prayerId].enabled,
      },
    };
    setPrayerReminders(newReminders);
    
    // Save to preferences
    const prefs = await UserPreferencesService.getPreferences();
    if (prefs) {
      await UserPreferencesService.savePreferences({
        ...prefs,
        notifications: {
          ...prefs.notifications,
          prayerReminders: newReminders,
        },
      });
    }

    const prayer = PRAYER_ITEMS.find(p => p.id === prayerId);
    if (!prayerReminders[prayerId].enabled) {
      Alert.alert(
        'Reminder Set',
        `You'll be reminded to daven ${prayer?.title} daily at ${prayerReminders[prayerId].time}. You can change the time in Settings.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handlePrayerPress = (item: PrayerItem) => {
    navigation.navigate('SiddurReader' as never, { service: item.service } as never);
  };

  const handleItemPress = (item: LibraryItem) => {
    if (item.id === 'tehillim') {
      navigation.navigate('TehillimList' as never);
    } else if (item.id === 'brachos') {
      navigation.navigate('SiddurReader' as never, { service: 'brachos' } as never);
    } else if (item.id === 'shabbos') {
      navigation.navigate('SiddurReader' as never, { service: 'shabbos' } as never);
    } else if (item.id === 'bentching') {
      navigation.navigate('SiddurReader' as never, { service: 'bentching' } as never);
    } else if (item.id === 'bedtime') {
      navigation.navigate('SiddurReader' as never, { service: 'bedtime' } as never);
    } else {
      navigation.navigate('SiddurReader' as never, { service: item.id } as never);
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

        {/* Daily Prayers Section */}
        <FadeIn delay={50}>
          <Text style={styles.sectionTitle}>Daily Tefillos</Text>
        </FadeIn>

        <View style={styles.prayerCards}>
          {PRAYER_ITEMS.map((item, index) => (
            <FadeIn key={item.id} delay={100 + index * 50}>
              <GlassCard style={styles.prayerCard} bgColor={item.color}>
                <TouchableOpacity
                  style={styles.prayerCardContent}
                  onPress={() => handlePrayerPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.prayerCardLeft}>
                    <Text style={styles.prayerIcon}>{item.icon}</Text>
                    <View style={styles.prayerInfo}>
                      <View style={styles.prayerTitleRow}>
                        <Text style={styles.prayerTitle}>{item.title}</Text>
                        <Text style={styles.prayerHebrew}>{item.hebrewTitle}</Text>
                      </View>
                      <Text style={styles.prayerSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <Text style={styles.prayerArrow}>→</Text>
                </TouchableOpacity>
                
                {/* Reminder Toggle */}
                <View style={styles.reminderRow}>
                  <View style={styles.reminderLeft}>
                    <Text style={styles.reminderIcon}>🔔</Text>
                    <Text style={styles.reminderText}>
                      {prayerReminders[item.id as keyof PrayerReminders].enabled 
                        ? `Daily at ${prayerReminders[item.id as keyof PrayerReminders].time}`
                        : 'Set daily reminder'}
                    </Text>
                  </View>
                  <Switch
                    value={prayerReminders[item.id as keyof PrayerReminders].enabled}
                    onValueChange={() => toggleReminder(item.id as 'shacharis' | 'mincha' | 'maariv')}
                    trackColor={{ false: colors.neutral[300], true: colors.primary.light }}
                    thumbColor={prayerReminders[item.id as keyof PrayerReminders].enabled ? colors.primary.main : '#f4f3f4'}
                  />
                </View>
              </GlassCard>
            </FadeIn>
          ))}
        </View>

        {/* Other Texts Section */}
        <FadeIn delay={300}>
          <Text style={styles.sectionTitle}>More Texts</Text>
        </FadeIn>

        <View style={styles.grid}>
          {LIBRARY_ITEMS.map((item, index) => (
            <FadeIn key={item.id} delay={350 + index * 30}>
              <GlassCard
                style={styles.itemCard}
                onPress={() => handleItemPress(item)}
                bgColor={item.color}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
              </GlassCard>
            </FadeIn>
          ))}
        </View>

        {/* Quick Access Section */}
        <FadeIn delay={500}>
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

        {/* Attribution */}
        <FadeIn delay={550}>
          <View style={styles.attribution}>
            <Text style={styles.attributionText}>
              Texts provided by Sefaria • sefaria.org
            </Text>
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
    marginBottom: spacing.lg,
  },

  // Section
  sectionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },

  // Prayer Cards
  prayerCards: {
    gap: spacing.md,
    marginBottom: spacing.md,
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
    padding: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Prayer Card
  prayerCard: {},
  prayerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prayerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  prayerIcon: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  prayerTitle: {
    fontFamily: fonts.heading.bold,
    fontSize: 20,
    color: colors.text.primary,
  },
  prayerHebrew: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.secondary,
  },
  prayerSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  prayerArrow: {
    fontFamily: fonts.body.bold,
    fontSize: 20,
    color: colors.text.tertiary,
  },

  // Reminder Row
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reminderIcon: {
    fontSize: 14,
  },
  reminderText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  // Item Card
  itemCard: {
    width: '47%',
    minHeight: 120,
  },
  itemIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  itemTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 4,
  },
  itemSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 14,
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

  // Attribution
  attribution: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  attributionText: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    color: colors.text.tertiary,
  },
});
