import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { BackButton } from '../../components/ui/BackButton';
import { colors } from '../../src/design/colors';
import { DEFAULT_SCREEN_BACKGROUND } from '../../src/design/screenGradient';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import {
  HomePanelsService,
  HomePanel,
  PanelDefinition,
  PANEL_DEFINITIONS,
} from '../../src/storage/HomePanelsService';
import { isPanelLibraryPhase2ComingSoon } from '../../src/feature/LibraryFeatureAccess';

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
}> = ({ children, style, onPress }) => {
  const content = (
    <View style={[styles.glassCard, style]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={40} tint="light" style={styles.glassBlur}>
          <View style={styles.glassInner}>{children}</View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.35)']}
          style={styles.glassBlur}
        >
          <View style={styles.glassInner}>{children}</View>
        </LinearGradient>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};

const CATEGORIES = [
  { id: 'essential', name: 'Essential', icon: '⭐' },
  { id: 'calendar', name: 'Calendar', icon: '📅' },
  { id: 'prayer', name: 'Prayer', icon: '🙏' },
  { id: 'learning', name: 'Learning', icon: '📚' },
  { id: 'personal', name: 'Personal', icon: '💫' },
  { id: 'tracking', name: 'Tracking', icon: '📊' },
  { id: 'community', name: 'Community', icon: '👥' },
];

export const PanelsMarketplace: React.FC = () => {
  const navigation = useNavigation();
  const [currentPanels, setCurrentPanels] = useState<HomePanel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [infoPanel, setInfoPanel] = useState<PanelDefinition | null>(null);

  useEffect(() => {
    loadCurrentPanels();
  }, []);

  const loadCurrentPanels = async () => {
    const panels = await HomePanelsService.getPanels();
    setCurrentPanels(panels);
  };

  const handleAddPanel = async (definition: PanelDefinition) => {
    // Check if already added
    const existing = currentPanels.find(p => p.type === definition.type);
    if (existing) {
      Alert.alert('Already Added', 'This panel is already on your home screen.');
      return;
    }

    await HomePanelsService.addPanel(definition.type);
    await loadCurrentPanels();
    Alert.alert('Panel Added', `${definition.name} has been added to your home screen!`);
  };

  const isPanelAdded = (type: string): boolean => {
    return currentPanels.some(p => p.type === type);
  };

  // Panels that only appear on certain days - don't offer in marketplace (they auto-show when relevant)
  // Time-based panels: not in marketplace; they auto-appear on home when the time applies
  const MARKETPLACE_HIDDEN_TYPES = ['fast_day_info', 'omer_counter', 'rosh_chodesh', 'davening_note'];

  const filteredPanels = (selectedCategory === 'all'
    ? PANEL_DEFINITIONS
    : PANEL_DEFINITIONS.filter(p => p.category === selectedCategory)
  ).filter(p => !MARKETPLACE_HIDDEN_TYPES.includes(p.type));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...DEFAULT_SCREEN_BACKGROUND]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
      >
        {/* Header */}
        <FadeIn delay={0}>
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
            <Text style={styles.title}>Panel Marketplace</Text>
            <Text style={styles.subtitle}>Add widgets to your home screen</Text>
          </View>
        </FadeIn>

        {/* Category Filter */}
        <FadeIn delay={50}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === 'all' && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === 'all' && styles.categoryChipTextActive,
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </FadeIn>

        {/* Panels Grid */}
        <View style={styles.panelsGrid}>
          {filteredPanels.map((panel, index) => {
            const isAdded = isPanelAdded(panel.type);
            const isCommunity = panel.category === 'community';
            const isPhase2 = isPanelLibraryPhase2ComingSoon(panel.type);
            const isLocked = isCommunity || isPhase2;
            return (
              <View key={panel.type} style={styles.panelCardWrapper}>
                <GlassCard
                  style={[
                    styles.panelCard,
                    isAdded && styles.panelCardAdded,
                    isLocked && styles.panelCardComingSoon,
                  ]}
                  onPress={!isLocked && !isAdded ? () => handleAddPanel(panel) : undefined}
                >
                  {isLocked && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonBadgeText}>Coming soon</Text>
                    </View>
                  )}
                  <View style={styles.panelHeader}>
                    <Text style={[styles.panelIcon, isLocked && styles.panelIconMuted]}>{panel.icon}</Text>
                    <View style={styles.panelHeaderRight}>
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.helpButton}
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          setInfoPanel(panel);
                        }}
                      >
                        <Text style={styles.helpButtonText}>?</Text>
                      </TouchableOpacity>
                      {isAdded && !isLocked && (
                        <View style={styles.addedBadge}>
                          <Text style={styles.addedBadgeText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[styles.panelName, isLocked && styles.panelTextMuted]} numberOfLines={2}>{panel.name}</Text>
                  <Text style={[styles.panelDescription, isLocked && styles.panelTextMuted]} numberOfLines={2}>{panel.description}</Text>
                  <View style={styles.panelFooter}>
                    <View style={[styles.categoryBadge, isLocked && styles.categoryBadgeMuted]}>
                      <Text style={[styles.categoryBadgeText, isLocked && styles.panelTextMuted]}>{panel.category}</Text>
                    </View>
                    {!isAdded && !isLocked && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleAddPanel(panel)}
                      >
                        <Text style={styles.addButtonText}>+</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </GlassCard>
              </View>
            );
          })}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Explanation modal */}
      <Modal
        visible={!!infoPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoPanel(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setInfoPanel(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            {infoPanel && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalIcon}>{infoPanel.icon}</Text>
                  <Text style={styles.modalTitle}>{infoPanel.name}</Text>
                </View>
                <Text style={styles.modalExplanation}>
                  {infoPanel.explanation || infoPanel.description}
                </Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setInfoPanel(null)}
                >
                  <Text style={styles.modalCloseText}>Got it</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingTop: spacing.xl + spacing.safeTopInset,
    flexGrow: 1,
  },

  // Header
  header: {
    marginBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    fontFamily: fonts.body.medium,
    fontSize: 16,
    color: colors.primary.dark,
  },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.secondary,
  },

  // Categories
  categoryScroll: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
  },
  categoryContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    gap: 4,
    minHeight: 36,
    shadowColor: colors.shadow.light,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.secondary,
  },
  categoryChipTextActive: {
    color: '#fff',
  },

  // Panels Grid - single column so cards aren't shmushed, titles/descriptions have room
  panelsGrid: {
    flexDirection: 'column',
  },
  panelCardWrapper: {
    width: '100%',
    marginBottom: spacing.md,
  },

  // Glass Card - lighter, more translucent
  glassCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: colors.shadow.medium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5,
  },
  glassBlur: {
    overflow: 'hidden',
  },
  glassInner: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  // Panel Card (fills wrapper)
  panelCard: {
    width: '100%',
    minHeight: 180,
    paddingBottom: spacing.xs,
  },
  panelCardAdded: {
    opacity: 0.7,
  },
  panelCardComingSoon: {
    opacity: 0.65,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  comingSoonBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    zIndex: 1,
  },
  comingSoonBadgeText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 11,
    color: '#fff',
    textTransform: 'uppercase',
  },
  panelIconMuted: {
    opacity: 0.7,
  },
  panelTextMuted: {
    color: colors.text.tertiary,
  },
  categoryBadgeMuted: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  panelHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helpButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 14,
    fontFamily: fonts.body.semiBold,
    color: colors.text.secondary,
  },
  panelIcon: {
    fontSize: 24,
  },
  addedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.semantic.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  panelName: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: 4,
  },
  panelDescription: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
    marginBottom: spacing.sm,
    flex: 1,
  },
  panelFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  categoryBadgeText: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    flexShrink: 0,
  },
  addButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: '#fff',
  },

  // Explanation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  modalIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    flex: 1,
  },
  modalExplanation: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  modalCloseButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: '#fff',
  },
});
