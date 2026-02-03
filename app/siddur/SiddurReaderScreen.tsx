import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { SefariaService, PrayerTextData } from '../../src/services/SefariaService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';

interface RouteParams {
  service: 'shacharis' | 'mincha' | 'maariv' | 'brachos' | 'shabbos' | 'bentching' | 'bedtime';
}

interface Section {
  key: string;
  title: string;
  hebrewTitle: string;
}

const SERVICE_TITLES: { [key: string]: { english: string; hebrew: string } } = {
  shacharis: { english: 'Shacharis', hebrew: 'שחרית' },
  mincha: { english: 'Mincha', hebrew: 'מנחה' },
  maariv: { english: 'Maariv', hebrew: 'מעריב' },
  brachos: { english: 'Brachos', hebrew: 'ברכות' },
  shabbos: { english: 'Shabbos', hebrew: 'שבת' },
  bentching: { english: 'Bentching', hebrew: 'ברכת המזון' },
  bedtime: { english: 'Bedtime Shema', hebrew: 'קריאת שמע על המטה' },
};

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}> = ({ children, style, onPress }) => {
  const content = (
    <View style={[styles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={50} style={styles.glassBlur}>
          <View style={styles.glassInner}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.glassBlur}
        >
          <View style={styles.glassInner}>{children}</View>
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

export const SiddurReaderScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { service } = (route.params as RouteParams) || { service: 'shacharis' };
  
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState<{ [key: string]: PrayerTextData | null }>({});
  const [loading, setLoading] = useState(true);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [nusach, setNusach] = useState<'ashkenaz' | 'sfard'>('ashkenaz');
  const [showEnglish, setShowEnglish] = useState(true);

  useEffect(() => {
    loadPreferences();
    loadServiceStructure();
  }, [service]);

  const loadPreferences = async () => {
    const prefs = await UserPreferencesService.getPreferences();
    if (prefs?.nusach) {
      setNusach(prefs.nusach);
    }
  };

  const loadServiceStructure = async () => {
    setLoading(true);
    try {
      let serviceType: 'shacharis' | 'mincha' | 'maariv' | 'musaf' = 'shacharis';
      if (service === 'mincha' || service === 'maariv') {
        serviceType = service;
      }

      // For special services, use custom section lists
      if (service === 'bentching') {
        setSections([
          { key: 'birchas_hamazon', title: 'Birkas Hamazon', hebrewTitle: 'ברכת המזון' },
          { key: 'al_hamichya', title: 'Al Hamichya', hebrewTitle: 'על המחיה' },
        ]);
      } else if (service === 'bedtime') {
        setSections([
          { key: 'krias_shema_al_hamita', title: 'Kriyas Shema', hebrewTitle: 'קריאת שמע על המטה' },
        ]);
      } else if (service === 'shabbos') {
        setSections([
          { key: 'kabbalas_shabbos', title: 'Kabbalas Shabbos', hebrewTitle: 'קבלת שבת' },
          { key: 'lecha_dodi', title: 'Lecha Dodi', hebrewTitle: 'לכה דודי' },
          { key: 'kiddush_friday', title: 'Friday Kiddush', hebrewTitle: 'קידוש' },
          { key: 'kiddush_shabbos_day', title: 'Shabbos Day Kiddush', hebrewTitle: 'קידוש' },
          { key: 'havdalah', title: 'Havdalah', hebrewTitle: 'הבדלה' },
        ]);
      } else if (service === 'brachos') {
        setSections([
          { key: 'netilas_yadayim', title: 'Washing Hands', hebrewTitle: 'נטילת ידים' },
          { key: 'asher_yatzar', title: 'Asher Yatzar', hebrewTitle: 'אשר יצר' },
          { key: 'birchos_hatorah', title: 'Torah Blessings', hebrewTitle: 'ברכות התורה' },
        ]);
      } else {
        const structure = await SefariaService.fetchDaveningService(serviceType, false, nusach);
        setSections(structure.sections);
      }
    } catch (error) {
      console.error('Error loading service structure:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSectionContent = async (sectionKey: string) => {
    if (sectionContent[sectionKey]) {
      // Already loaded
      return;
    }

    setLoadingSection(sectionKey);
    try {
      const content = await SefariaService.fetchSiddurSection(sectionKey, nusach);
      setSectionContent(prev => ({ ...prev, [sectionKey]: content }));
    } catch (error) {
      console.error(`Error loading section ${sectionKey}:`, error);
      setSectionContent(prev => ({ ...prev, [sectionKey]: null }));
    } finally {
      setLoadingSection(null);
    }
  };

  const handleSectionPress = async (sectionKey: string) => {
    if (expandedSection === sectionKey) {
      setExpandedSection(null);
    } else {
      setExpandedSection(sectionKey);
      await loadSectionContent(sectionKey);
    }
  };

  const serviceTitle = SERVICE_TITLES[service] || { english: service, hebrew: '' };

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
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{serviceTitle.english}</Text>
              <Text style={styles.titleHebrew}>{serviceTitle.hebrew}</Text>
            </View>
            
            {/* Toggle Row */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleButton, showEnglish && styles.toggleButtonActive]}
                onPress={() => setShowEnglish(!showEnglish)}
              >
                <Text style={[styles.toggleText, showEnglish && styles.toggleTextActive]}>
                  {showEnglish ? 'Hide' : 'Show'} English
                </Text>
              </TouchableOpacity>
              <View style={styles.nusachBadge}>
                <Text style={styles.nusachText}>Nusach {nusach}</Text>
              </View>
            </View>
          </View>
        </FadeIn>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Loading prayers...</Text>
          </View>
        ) : (
          /* Sections List */
          <View style={styles.sectionsList}>
            {sections.map((section, index) => (
              <FadeIn key={section.key} delay={50 + index * 30}>
                <GlassCard 
                  style={[styles.sectionCard, expandedSection === section.key && styles.sectionCardExpanded]}
                  onPress={() => handleSectionPress(section.key)}
                >
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleContainer}>
                      <Text style={styles.sectionHebrewTitle}>{section.hebrewTitle}</Text>
                      <Text style={styles.sectionEnglishTitle}>{section.title}</Text>
                    </View>
                    <Text style={styles.sectionArrow}>
                      {expandedSection === section.key ? '▼' : '▶'}
                    </Text>
                  </View>

                  {/* Expanded Content */}
                  {expandedSection === section.key && (
                    <View style={styles.sectionContent}>
                      {loadingSection === section.key ? (
                        <View style={styles.sectionLoading}>
                          <ActivityIndicator size="small" color={colors.primary.main} />
                          <Text style={styles.sectionLoadingText}>Loading text...</Text>
                        </View>
                      ) : sectionContent[section.key] ? (
                        <>
                          <Text style={styles.hebrewText}>
                            {sectionContent[section.key]?.hebrew || 'Text not available'}
                          </Text>
                          {showEnglish && sectionContent[section.key]?.english && (
                            <Text style={styles.englishText}>
                              {sectionContent[section.key]?.english}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={styles.errorText}>
                          Unable to load this section. Please try again.
                        </Text>
                      )}
                    </View>
                  )}
                </GlassCard>
              </FadeIn>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
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
    padding: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: 140,
  },

  // Header - Enhanced spacing
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.primary.dark,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 32,
    color: colors.text.primary,
    letterSpacing: -0.7,
  },
  titleHebrew: {
    fontFamily: fonts.heading.regular,
    fontSize: 24,
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary.light,
  },
  toggleText: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.primary.dark,
  },
  nusachBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(165, 196, 212, 0.3)',
    borderRadius: borderRadius.sm,
  },
  nusachText: {
    fontFamily: fonts.body.medium,
    fontSize: 11,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  loadingText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },

  // Glass Card - Enhanced depth
  glassCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  // Sections - Enhanced readability
  sectionsList: {
    gap: spacing.md,
  },
  sectionCard: {},
  sectionCardExpanded: {
    borderColor: colors.primary.main,
    shadowColor: colors.primary.main,
    shadowOpacity: 0.12,
    borderWidth: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionHebrewTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  sectionEnglishTitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },
  sectionArrow: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  sectionContent: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  sectionLoading: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  sectionLoadingText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },
  hebrewText: {
    fontFamily: fonts.heading.regular,
    fontSize: 22,
    color: colors.text.primary,
    lineHeight: 40,
    textAlign: 'right',
    writingDirection: 'rtl',
    letterSpacing: 0.3,
  },
  englishText: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 24,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  errorText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.semantic.error,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
