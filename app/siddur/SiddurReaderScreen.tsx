import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  useWindowDimensions,
  PanResponder,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { useTheme } from '../../src/design/theme';
import { SefariaService, PrayerTextData } from '../../src/services/SefariaService';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import { recordDaveningToday } from '../../src/storage/DaveningStreakService';
import { MizrachCompass } from '../../components/ui/MizrachCompass';
import type { DisplayPreferences } from '../../src/types/preferences';

interface RouteParams {
  service: 'shacharis' | 'mincha' | 'maariv' | 'brachos' | 'shabbos' | 'bentching' | 'bedtime' | 'shema' | 'modeh_ani' | 'tefilas_haderech' | 'asher_yatzar';
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
  shema: { english: 'Shema', hebrew: 'קריאת שמע' },
  modeh_ani: { english: 'Modeh Ani', hebrew: 'מודה אני' },
  tefilas_haderech: { english: 'Tefillas HaDerech', hebrew: 'תפילת הדרך' },
  asher_yatzar: { english: 'Asher Yatzar', hebrew: 'אשר יצר' },
};

const AUTOSCROLL_SPEED_MIN = 0.5;
const AUTOSCROLL_SPEED_MAX = 2;

/** Tallit & Tefillin are optional (e.g. women don't have); show Hebrew + plus to expand. */
const OPTIONAL_SECTIONS = ['tallit', 'tefillin'];
const AUTOSCROLL_PIXELS_PER_SECOND = 45; // at speed 1
const STATIC_HEADER_HEIGHT_APPROX = 124; // back row + title + toggle + padding

const TEXT_SIZES: DisplayPreferences['textSize'][] = ['xsmall', 'small', 'medium', 'large'];
const HEBREW_FONT_SIZES: Record<DisplayPreferences['textSize'], number> = { xsmall: 15, small: 18, medium: 22, large: 26 };
const HEBREW_LINE_HEIGHTS: Record<DisplayPreferences['textSize'], number> = { xsmall: 26, small: 32, medium: 40, large: 48 };

// Cross-platform speed slider: track + thumb, tap and drag
const SpeedSlider: React.FC<{
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (v: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  style?: object;
}> = ({ value, min, max, step, onValueChange, minimumTrackTintColor, maximumTrackTintColor, thumbTintColor, style }) => {
  const trackWidth = useRef(0);
  const valueFromRatio = useCallback((ratio: number) => {
    const v = min + ratio * (max - min);
    const stepped = Math.round(v / step) * step;
    return Math.max(min, Math.min(max, stepped));
  }, [min, max, step]);
  const ratioFromValue = (v: number) => (v - min) / (max - min);
  const startXRef = useRef(0);
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (ev) => {
        const w = trackWidth.current;
        if (w <= 0) return;
        const x = ev.nativeEvent.locationX ?? 0;
        startXRef.current = x;
        const ratio = Math.max(0, Math.min(1, x / w));
        onValueChange(valueFromRatio(ratio));
      },
      onPanResponderMove: (ev, gestureState) => {
        const w = trackWidth.current;
        if (w <= 0) return;
        const x = startXRef.current + (gestureState.dx ?? 0);
        const ratio = Math.max(0, Math.min(1, x / w));
        onValueChange(valueFromRatio(ratio));
      },
    })
  ).current;
  const onTrackLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    trackWidth.current = e.nativeEvent.layout.width;
  }, []);
  const ratio = ratioFromValue(value);
  return (
    <View style={[styles.speedSliderTrack, style]} onLayout={onTrackLayout} {...pan.panHandlers}>
      <View style={[styles.speedSliderTrackBg, { backgroundColor: maximumTrackTintColor }]} />
      <View style={[styles.speedSliderTrackFill, { backgroundColor: minimumTrackTintColor, width: `${ratio * 100}%` }]} />
      <View style={[styles.speedSliderThumb, { backgroundColor: thumbTintColor, left: `${ratio * 100}%` }]} />
    </View>
  );
};

// Glass Card Component (for non–full-scroll mode)
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
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { theme } = useTheme();
  const { service } = (route.params as RouteParams) || { service: 'shacharis' };

  const isFullScroll =
    service === 'shacharis' || service === 'mincha' || service === 'maariv';

  const [sections, setSections] = useState<Section[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sectionContent, setSectionContent] = useState<{ [key: string]: PrayerTextData | null }>({});
  const [loading, setLoading] = useState(true);
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [nusach, setNusach] = useState<'ashkenaz' | 'sfard'>('ashkenaz');
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [textSize, setTextSize] = useState<DisplayPreferences['textSize']>('medium');

  // Full-scroll mode: section jump + autoscroll
  const [sectionOffsets, setSectionOffsets] = useState<Record<string, number>>({});
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const [showCompassModal, setShowCompassModal] = useState(false);
  const [autoscrollPlaying, setAutoscrollPlaying] = useState(false);
  const [autoscrollSpeed, setAutoscrollSpeed] = useState(1); // 0.5–2
  /** Optional sections (tallit, tefillin) collapsed by default; tap to expand. */
  const [expandedOptionals, setExpandedOptionals] = useState<Record<string, boolean>>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollYFloatRef = useRef(0);
  const contentHeightRef = useRef(0);
  const autoscrollRafRef = useRef<number | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await UserPreferencesService.getPreferences();
      if (prefs?.nusach) setNusach(prefs.nusach);
      if (prefs?.autoscrollSpeed != null) {
        const v = Math.max(AUTOSCROLL_SPEED_MIN, Math.min(AUTOSCROLL_SPEED_MAX, prefs.autoscrollSpeed));
        setAutoscrollSpeed(v);
      }
      if (prefs?.display?.textSize && TEXT_SIZES.includes(prefs.display.textSize)) {
        setTextSize(prefs.display.textSize);
      }
    } finally {
      setPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
    const fallback = setTimeout(() => setPrefsLoaded(true), 2500);
    return () => clearTimeout(fallback);
  }, [loadPreferences]);

  // Record davening streak when user opens siddur
  useFocusEffect(
    useCallback(() => {
      recordDaveningToday();
    }, [])
  );

  // Persist autoscroll speed when user changes it (not on initial load)
  const userHasChangedSpeedRef = useRef(false);
  useEffect(() => {
    if (!userHasChangedSpeedRef.current) return;
    const t = setTimeout(() => {
      UserPreferencesService.setAutoscrollSpeed(autoscrollSpeed);
    }, 400);
    return () => clearTimeout(t);
  }, [autoscrollSpeed]);

  const handleSpeedChange = useCallback((v: number) => {
    userHasChangedSpeedRef.current = true;
    setAutoscrollSpeed(v);
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    if (isFullScroll) {
      const flatSections = SefariaService.getFlatSectionsForFullScroll(service);
      setSections(flatSections);
      setLoading(true);
      (async () => {
        try {
          const results = await Promise.all(
            flatSections.map(async (s) => {
              try {
                const data = await SefariaService.fetchSiddurSection(s.key, nusach);
                return { key: s.key, data };
              } catch {
                return { key: s.key, data: null };
              }
            })
          );
          const content: { [key: string]: PrayerTextData | null } = {};
          for (const { key, data } of results) content[key] = data;
          setSectionContent(content);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      loadServiceStructure();
    }
  }, [service, nusach, isFullScroll, prefsLoaded]);

  const loadServiceStructure = async () => {
    setLoading(true);
    try {
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
      } else if (service === 'shema') {
        setSections([{ key: 'shema', title: 'The Shema', hebrewTitle: 'קריאת שמע' }]);
      } else if (service === 'modeh_ani') {
        setSections([{ key: 'modeh_ani', title: 'Modeh Ani', hebrewTitle: 'מודה אני' }]);
      } else if (service === 'tefilas_haderech') {
        setSections([{ key: 'tefilas_haderech', title: 'Tefillas HaDerech', hebrewTitle: 'תפילת הדרך' }]);
      } else if (service === 'asher_yatzar') {
        setSections([{ key: 'asher_yatzar', title: 'Asher Yatzar', hebrewTitle: 'אשר יצר' }]);
      } else {
        const structure = await SefariaService.fetchDaveningService(
          service as 'shacharis' | 'mincha' | 'maariv' | 'musaf',
          false,
          nusach
        );
        setSections(structure.sections);
      }
    } catch (e) {
      console.error('Error loading service structure:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSectionContent = async (sectionKey: string) => {
    if (sectionContent[sectionKey]) return;
    setLoadingSection(sectionKey);
    try {
      const content = await SefariaService.fetchSiddurSection(sectionKey, nusach);
      setSectionContent(prev => ({ ...prev, [sectionKey]: content }));
    } catch {
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

  // Auto-expand and load for single-section services (shema, modeh_ani, tefilas_haderech, asher_yatzar)
  useEffect(() => {
    if (!isFullScroll && sections.length === 1) {
      const key = sections[0].key;
      setExpandedSection(key);
      if (!sectionContent[key]) {
        loadSectionContent(key);
      }
    }
  }, [sections, isFullScroll]);

  const scrollToSection = useCallback((key: string) => {
    const y = sectionOffsets[key];
    if (y != null && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: Math.max(0, y - 16),
        animated: true,
      });
    }
    setShowSectionMenu(false);
  }, [sectionOffsets]);

  // Autoscroll: smooth scroll using requestAnimationFrame (float position, small delta per frame)
  useEffect(() => {
    if (!autoscrollPlaying) {
      if (autoscrollRafRef.current != null) {
        cancelAnimationFrame(autoscrollRafRef.current);
        autoscrollRafRef.current = null;
      }
      return;
    }
    scrollYFloatRef.current = scrollYRef.current;
    const maxY = Math.max(0, contentHeightRef.current - height);
    let lastTs = 0;
    const tick = (ts: number) => {
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      const speed = autoscrollSpeed;
      const delta = AUTOSCROLL_PIXELS_PER_SECOND * speed * dt;
      const nextY = Math.min(scrollYFloatRef.current + delta, maxY);
      if (nextY >= maxY) {
        setAutoscrollPlaying(false);
        return;
      }
      scrollYFloatRef.current = nextY;
      scrollYRef.current = nextY;
      scrollViewRef.current?.scrollTo({ y: nextY, animated: false });
      autoscrollRafRef.current = requestAnimationFrame(tick);
    };
    autoscrollRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (autoscrollRafRef.current != null) {
        cancelAnimationFrame(autoscrollRafRef.current);
        autoscrollRafRef.current = null;
      }
    };
  }, [autoscrollPlaying, autoscrollSpeed, height]);

  const serviceTitle = SERVICE_TITLES[service] || { english: service, hebrew: '' };

  const renderFullScrollContent = () => (
    <>
      {/* Static top bar – always visible */}
      <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerRightRow}>
            <TouchableOpacity
              onPress={() => setShowCompassModal(true)}
              style={styles.compassButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.compassIcon}>🧭</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSectionMenu(true)}
              style={styles.hamburgerButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.hamburgerIcon}>☰</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{serviceTitle.english}</Text>
          <Text style={styles.titleHebrew}>{serviceTitle.hebrew}</Text>
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.textSizeRow}>
            <TouchableOpacity
              style={[styles.textSizeButton, textSize === 'xsmall' && styles.textSizeButtonDisabled]}
              onPress={() => {
                const i = TEXT_SIZES.indexOf(textSize);
                if (i > 0) {
                  const next = TEXT_SIZES[i - 1];
                  setTextSize(next);
                  UserPreferencesService.setDisplayPreferences({ textSize: next });
                }
              }}
              disabled={textSize === 'xsmall'}
            >
              <Text style={styles.textSizeButtonLabel}>A−</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.textSizeButton, textSize === 'large' && styles.textSizeButtonDisabled]}
              onPress={() => {
                const i = TEXT_SIZES.indexOf(textSize);
                if (i < TEXT_SIZES.length - 1) {
                  const next = TEXT_SIZES[i + 1];
                  setTextSize(next);
                  UserPreferencesService.setDisplayPreferences({ textSize: next });
                }
              }}
              disabled={textSize === 'large'}
            >
              <Text style={styles.textSizeButtonLabel}>A+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.nusachBadge}>
            <Text style={styles.nusachText}>Nusach {nusach}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + STATIC_HEADER_HEIGHT_APPROX + spacing.md, paddingBottom: 24 + 88 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollYRef.current = y;
          scrollYFloatRef.current = y;
        }}
        onContentSizeChange={(_, h) => {
          contentHeightRef.current = h;
        }}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
            <Text style={styles.loadingText}>Loading prayers...</Text>
          </View>
        ) : sections.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No sections for this service.</Text>
          </View>
        ) : (
          sections.map((section) => {
            const isOptional = OPTIONAL_SECTIONS.includes(section.key);
            const isOptionalExpanded = isOptional && expandedOptionals[section.key];
            const showOptionalCollapsed = isOptional && !isOptionalExpanded;

            return (
              <View
                key={section.key}
                onLayout={(e) => {
                  const { y } = e.nativeEvent.layout;
                  setSectionOffsets(prev => (prev[section.key] === y ? prev : { ...prev, [section.key]: y }));
                }}
                style={styles.fullScrollSectionBlock}
              >
                {showOptionalCollapsed ? (
                  <TouchableOpacity
                    onPress={() => setExpandedOptionals(prev => ({ ...prev, [section.key]: true }))}
                    style={styles.optionalSectionRow}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hebrewText, styles.optionalSectionLabel, { fontSize: HEBREW_FONT_SIZES[textSize] }]}>
                      {section.hebrewTitle}  +
                    </Text>
                  </TouchableOpacity>
                ) : sectionContent[section.key] ? (
                  (() => {
                    const content = sectionContent[section.key]!;
                    const hebrewStyle = [styles.hebrewText, { fontSize: HEBREW_FONT_SIZES[textSize], lineHeight: HEBREW_LINE_HEIGHTS[textSize] }];
                    const hebrewInstructionStyle = [styles.hebrewText, styles.instructionText, { fontSize: HEBREW_FONT_SIZES[textSize] * 0.8, lineHeight: HEBREW_LINE_HEIGHTS[textSize] * 0.9 }];
                    const renderSegmentsAsBlocks = (
                      segs: { text: string; italic: boolean }[],
                      normalStyle: object,
                      instructionStyle: object,
                      instructionBlockStyle: object
                    ) => {
                      const nodes: React.ReactNode[] = [];
                      let i = 0;
                      let keyIdx = 0;
                      while (i < segs.length) {
                        if (segs[i].italic) {
                          nodes.push(
                            <View key={`seg-${keyIdx++}`} style={instructionBlockStyle}>
                              <Text style={instructionStyle}>{segs[i].text}</Text>
                            </View>
                          );
                          i += 1;
                        } else {
                          const normalParts: string[] = [];
                          while (i < segs.length && !segs[i].italic) {
                            normalParts.push(segs[i].text);
                            i += 1;
                          }
                          nodes.push(
                            <Text key={`seg-${keyIdx++}`} style={normalStyle}>{normalParts.join('')}</Text>
                          );
                        }
                      }
                      return <>{nodes}</>;
                    };
                    const renderHebrew = () => {
                      if (content.hebrewSegments?.length) {
                        return renderSegmentsAsBlocks(
                          content.hebrewSegments,
                          hebrewStyle,
                          hebrewInstructionStyle,
                          styles.instructionBlock
                        );
                      }
                      return <Text style={hebrewStyle}>{content.hebrew}</Text>;
                    };
                    return (
                      <>
                        {isOptional && (
                          <TouchableOpacity
                            onPress={() => setExpandedOptionals(prev => ({ ...prev, [section.key]: false }))}
                            style={styles.optionalSectionRow}
                          >
                            <Text style={[styles.hebrewText, styles.optionalSectionLabel, { fontSize: HEBREW_FONT_SIZES[textSize] }]}>
                              {section.hebrewTitle}  −
                            </Text>
                          </TouchableOpacity>
                        )}
                        {renderHebrew()}
                      </>
                    );
                  })()
                ) : (
                  <Text style={styles.errorText}>Unable to load this section.</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Compass modal - Apple-style */}
      <Modal
        visible={showCompassModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompassModal(false)}
      >
        <View style={[styles.compassModalBackdrop, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowCompassModal(false)}
          />
          <View style={styles.compassModalContent} pointerEvents="box-none">
            <MizrachCompass variant="apple" onClose={() => setShowCompassModal(false)} />
          </View>
        </View>
      </Modal>

      {/* Section jump dropdown */}
      <Modal
        visible={showSectionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSectionMenu(false)}
      >
        <TouchableOpacity
          style={styles.sectionMenuBackdrop}
          activeOpacity={1}
          onPress={() => setShowSectionMenu(false)}
        >
          <View style={[styles.sectionMenuBox, { marginTop: insets.top + 56 }]} pointerEvents="box-none">
            <ScrollView
              style={styles.sectionMenuScroll}
              contentContainerStyle={styles.sectionMenuScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {sections.map((s, idx) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sectionMenuItem, idx === sections.length - 1 && styles.sectionMenuItemLast]}
                  onPress={() => scrollToSection(s.key)}
                >
                  <Text style={styles.sectionMenuHebrew}>{s.hebrewTitle}</Text>
                  <Text style={styles.sectionMenuEnglish}>{s.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Liquid glass bottom bar – Autoscroll functions */}
      <View
        style={[
          styles.bottomBarWrapper,
          { paddingBottom: insets.bottom || 12 },
        ]}
      >
        {Platform.OS !== 'web' ? (
          <BlurView intensity={70} tint={theme.isDark ? 'dark' : 'light'} style={styles.bottomBarBlur}>
            <View style={styles.bottomBarInner}>
              <View style={styles.autoscrollButtonRow}>
                <Text style={styles.autoscrollLabel}>Autoscroll functions</Text>
                <TouchableOpacity
                  onPress={() => setAutoscrollPlaying(!autoscrollPlaying)}
                  style={styles.autoscrollButton}
                >
                  <Text style={styles.autoscrollButtonText}>
                    {autoscrollPlaying ? '⏸ Pause' : '▶ Play'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.speedRow}>
                <Text style={styles.speedLabel}>Speed</Text>
                <SpeedSlider
                  value={autoscrollSpeed}
                  min={AUTOSCROLL_SPEED_MIN}
                  max={AUTOSCROLL_SPEED_MAX}
                  step={0.25}
                  onValueChange={handleSpeedChange}
                  minimumTrackTintColor={colors.primary.main}
                  maximumTrackTintColor="rgba(0,0,0,0.25)"
                  thumbTintColor={colors.primary.main}
                  style={styles.speedSlider}
                />
                <Text style={styles.speedValue}>{autoscrollSpeed}×</Text>
              </View>
            </View>
          </BlurView>
        ) : (
          <LinearGradient
            colors={
              theme.isDark
                ? ['rgba(28,26,38,0.92)', 'rgba(24,22,34,0.88)']
                : ['rgba(255,255,255,0.92)', 'rgba(248,248,252,0.88)']
            }
            style={styles.bottomBarBlur}
          >
            <View style={styles.bottomBarInner}>
              <View style={styles.autoscrollButtonRow}>
                <Text style={[styles.autoscrollLabel, { color: theme.colors.text.primary }]}>Autoscroll functions</Text>
                <TouchableOpacity
                  onPress={() => setAutoscrollPlaying(!autoscrollPlaying)}
                  style={styles.autoscrollButton}
                >
                  <Text style={[styles.autoscrollButtonText, { color: theme.colors.text.primary }]}>
                    {autoscrollPlaying ? '⏸ Pause' : '▶ Play'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.speedRow, { width: width - spacing.lg * 4 }]}>
                <Text style={[styles.speedLabel, { color: theme.colors.text.primary }]}>Speed</Text>
                <SpeedSlider
                  value={autoscrollSpeed}
                  min={AUTOSCROLL_SPEED_MIN}
                  max={AUTOSCROLL_SPEED_MAX}
                  step={0.25}
                  onValueChange={handleSpeedChange}
                  minimumTrackTintColor={theme.colors.primary?.main || colors.primary.main}
                  maximumTrackTintColor="rgba(255,255,255,0.3)"
                  thumbTintColor={theme.colors.primary?.main || colors.primary.main}
                  style={[styles.speedSlider, { width: Math.max(120, (width - spacing.lg * 4) - 100) }]}
                />
                <Text style={[styles.speedValue, { color: theme.colors.text.primary }]}>{autoscrollSpeed}×</Text>
              </View>
            </View>
          </LinearGradient>
        )}
      </View>
    </>
  );

  const renderDropdownMode = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <FadeIn delay={0}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{serviceTitle.english}</Text>
            <Text style={styles.titleHebrew}>{serviceTitle.hebrew}</Text>
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.nusachBadge}>
              <Text style={styles.nusachText}>Nusach {nusach}</Text>
            </View>
          </View>
        </View>
      </FadeIn>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading prayers...</Text>
        </View>
      ) : (
        <View style={styles.sectionsList}>
          {sections.map((section, index) => (
            <FadeIn key={section.key} delay={50 + index * 30}>
              <GlassCard
                style={[
                  styles.sectionCard,
                  expandedSection === section.key && styles.sectionCardExpanded,
                ]}
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
                {expandedSection === section.key && (
                  <View style={styles.sectionContent}>
                    {loadingSection === section.key ? (
                      <View style={styles.sectionLoading}>
                        <ActivityIndicator size="small" color={colors.primary.main} />
                        <Text style={styles.sectionLoadingText}>Loading text...</Text>
                      </View>
                    ) : sectionContent[section.key] ? (
                      (() => {
                        const content = sectionContent[section.key]!;
                        const hebrewStyle = [styles.hebrewText, { fontSize: HEBREW_FONT_SIZES[textSize], lineHeight: HEBREW_LINE_HEIGHTS[textSize] }];
                        const hebrewInstructionStyle = [styles.hebrewText, styles.instructionText, { fontSize: HEBREW_FONT_SIZES[textSize] * 0.8, lineHeight: HEBREW_LINE_HEIGHTS[textSize] * 0.9 }];
                        const renderSegmentsAsBlocks = (
                          segs: { text: string; italic: boolean }[],
                          normalStyle: object,
                          instructionStyle: object,
                          instructionBlockStyle: object
                        ) => {
                          const nodes: React.ReactNode[] = [];
                          let i = 0;
                          let keyIdx = 0;
                          while (i < segs.length) {
                            if (segs[i].italic) {
                              nodes.push(
                                <View key={`d-seg-${keyIdx++}`} style={instructionBlockStyle}>
                                  <Text style={instructionStyle}>{segs[i].text}</Text>
                                </View>
                              );
                              i += 1;
                            } else {
                              const normalParts: string[] = [];
                              while (i < segs.length && !segs[i].italic) {
                                normalParts.push(segs[i].text);
                                i += 1;
                              }
                              nodes.push(
                                <Text key={`d-seg-${keyIdx++}`} style={normalStyle}>{normalParts.join('')}</Text>
                              );
                            }
                          }
                          return <>{nodes}</>;
                        };
                        const renderHebrew = () => {
                          if (content.hebrewSegments?.length) {
                            return renderSegmentsAsBlocks(
                              content.hebrewSegments,
                              hebrewStyle,
                              hebrewInstructionStyle,
                              styles.instructionBlock
                            );
                          }
                          return <Text style={hebrewStyle}>{content.hebrew}</Text>;
                        };
                        return <>{renderHebrew()}</>;
                      })()
                    ) : (
                      <Text style={styles.errorText}>Unable to load this section.</Text>
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
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5']}
        style={StyleSheet.absoluteFill}
      />
      {isFullScroll ? renderFullScrollContent() : renderDropdownMode()}
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
  staticHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(250, 249, 247, 0.95)',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.lg + 44,
    paddingBottom: 140,
  },

  header: {
    marginBottom: spacing.xl,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.primary.dark,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compassButton: {
    padding: spacing.sm,
  },
  compassIcon: {
    fontSize: 22,
  },
  hamburgerButton: {
    padding: spacing.sm,
  },
  hamburgerIcon: {
    fontSize: 24,
    color: colors.text.secondary,
  },
  compassModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  compassModalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: spacing.xs,
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
    flexShrink: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  textSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  textSizeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  textSizeButtonDisabled: {
    opacity: 0.4,
  },
  textSizeButtonLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.text.primary,
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

  fullScrollSectionBlock: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  optionalSectionRow: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  optionalSectionLabel: {
    fontFamily: fonts.heading.semiBold,
    color: colors.primary.main,
  },

  sectionMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.lg,
  },
  sectionMenuBox: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    maxHeight: 360,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionMenuScroll: {
    maxHeight: 336,
  },
  sectionMenuScrollContent: {
    paddingBottom: spacing.sm,
  },
  sectionMenuItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sectionMenuHebrew: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: 2,
  },
  sectionMenuEnglish: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
  },
  sectionMenuItemLast: {
    borderBottomWidth: 0,
  },

  bottomBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomBarBlur: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomBarInner: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  autoscrollLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
  },
  autoscrollButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  autoscrollButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(212, 165, 184, 0.35)',
  },
  autoscrollButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.primary.dark,
  },
  speedButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(165, 196, 212, 0.35)',
  },
  speedButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.secondary.dark,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  speedLabel: {
    fontFamily: fonts.body.medium,
    fontSize: 13,
    color: colors.text.secondary,
    minWidth: 40,
  },
  speedSlider: {
    flex: 1,
    height: 28,
    minWidth: 80,
    marginLeft: 14, /* room for thumb at min so it doesn't cover "Speed" */
  },
  speedSliderTrack: {
    height: 28,
    flex: 1,
    minWidth: 80,
    justifyContent: 'center',
    position: 'relative',
  },
  speedSliderTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  speedSliderTrackFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
    top: 10,
  },
  speedSliderThumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    top: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  speedValue: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.primary,
    minWidth: 28,
    textAlign: 'right',
  },

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
    marginTop: spacing.md,
    paddingTop: spacing.md,
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
  daySpecificHighlight: {
    backgroundColor: 'rgba(212, 165, 184, 0.22)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginVertical: spacing.xs,
  },
  instructionText: {
    fontStyle: 'italic',
    color: colors.neutral[600],
  },
  instructionBlock: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.semantic.error,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
