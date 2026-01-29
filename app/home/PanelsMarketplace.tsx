import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FadeIn } from '../../components/animations/FadeIn';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import {
  HomePanelsService,
  HomePanel,
  PanelDefinition,
  PANEL_DEFINITIONS,
} from '../../src/storage/HomePanelsService';

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
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
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

const CATEGORIES = [
  { id: 'essential', name: 'Essential', icon: '⭐' },
  { id: 'calendar', name: 'Calendar', icon: '📅' },
  { id: 'prayer', name: 'Prayer', icon: '🙏' },
  { id: 'personal', name: 'Personal', icon: '💫' },
];

export const PanelsMarketplace: React.FC = () => {
  const navigation = useNavigation();
  const [currentPanels, setCurrentPanels] = useState<HomePanel[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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

  const filteredPanels = selectedCategory === 'all'
    ? PANEL_DEFINITIONS
    : PANEL_DEFINITIONS.filter(p => p.category === selectedCategory);

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
            return (
              <FadeIn key={panel.type} delay={100 + index * 30}>
                <GlassCard
                  style={[styles.panelCard, isAdded && styles.panelCardAdded]}
                  onPress={() => !isAdded && handleAddPanel(panel)}
                >
                  <View style={styles.panelHeader}>
                    <Text style={styles.panelIcon}>{panel.icon}</Text>
                    {isAdded && (
                      <View style={styles.addedBadge}>
                        <Text style={styles.addedBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.panelName}>{panel.name}</Text>
                  <Text style={styles.panelDescription}>{panel.description}</Text>
                  <View style={styles.panelFooter}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{panel.category}</Text>
                    </View>
                    {!isAdded && (
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => handleAddPanel(panel)}
                      >
                        <Text style={styles.addButtonText}>+ Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </GlassCard>
              </FadeIn>
            );
          })}
        </View>

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
    padding: spacing.lg,
    paddingTop: spacing.xl,
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
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    gap: 4,
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

  // Panels Grid
  panelsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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

  // Panel Card
  panelCard: {
    width: '47%',
    minHeight: 160,
  },
  panelCardAdded: {
    opacity: 0.7,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  panelIcon: {
    fontSize: 28,
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
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontFamily: fonts.body.medium,
    fontSize: 10,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  addButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    color: '#fff',
  },
});
