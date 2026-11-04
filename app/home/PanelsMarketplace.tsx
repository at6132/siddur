import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BackButton } from '../../components/ui/BackButton';
import { Screen } from '../../components/ui/Screen';
import { Section } from '../../components/ui/Section';
import { ListRow } from '../../components/ui/ListRow';
import { Chip } from '../../components/ui/Chip';
import { GlassButton } from '../../components/ui/GlassButton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import {
  HomePanelsService,
  HomePanel,
  PanelDefinition,
  PANEL_DEFINITIONS,
} from '../../src/storage/HomePanelsService';
import { isPanelLibraryPhase2ComingSoon } from '../../src/feature/LibraryFeatureAccess';
import { getPanelIconName } from './utils/panelIcons';

const CATEGORIES = [
  { id: 'essential', name: 'Essential' },
  { id: 'calendar', name: 'Calendar' },
  { id: 'prayer', name: 'Prayer' },
  { id: 'learning', name: 'Learning' },
  { id: 'personal', name: 'Personal' },
  { id: 'tracking', name: 'Tracking' },
  { id: 'community', name: 'Community' },
];

// Panels that only appear on certain days - don't offer in marketplace (they auto-show when relevant)
// Time-based panels: not in marketplace; they auto-appear on home when the time applies
const MARKETPLACE_HIDDEN_TYPES = ['fast_day_info', 'omer_counter', 'rosh_chodesh', 'davening_note'];

export const PanelsMarketplace: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const [currentPanels, setCurrentPanels] = useState<HomePanel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [infoPanel, setInfoPanel] = useState<PanelDefinition | null>(null);

  useEffect(() => {
    loadCurrentPanels();
  }, []);

  const loadCurrentPanels = async () => {
    const panels = await HomePanelsService.getPanels();
    setCurrentPanels(panels);
    setLoaded(true);
  };

  const handleAddPanel = async (definition: PanelDefinition) => {
    // Check if already added
    const existing = currentPanels.find(p => p.type === definition.type);
    if (existing) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    await HomePanelsService.addPanel(definition.type);
    await loadCurrentPanels();
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const isPanelAdded = (type: string): boolean => {
    return currentPanels.some(p => p.type === type);
  };

  const visiblePanels = PANEL_DEFINITIONS.filter(p => !MARKETPLACE_HIDDEN_TYPES.includes(p.type));

  const filteredPanels =
    selectedCategory === 'all'
      ? visiblePanels
      : visiblePanels.filter(p => p.category === selectedCategory);

  const groups = CATEGORIES.map(cat => ({
    ...cat,
    panels: filteredPanels.filter(p => p.category === cat.id),
  })).filter(group => group.panels.length > 0);

  const renderPanelRow = (panel: PanelDefinition) => {
    const isAdded = isPanelAdded(panel.type);
    const isLocked = panel.category === 'community' || isPanelLibraryPhase2ComingSoon(panel.type);
    const canAdd = !isLocked && !isAdded;

    return (
      <ListRow
        key={panel.type}
        title={panel.name}
        subtitle={panel.description}
        style={isLocked ? styles.locked : undefined}
        leading={
          <Ionicons
            name={getPanelIconName(panel.type)}
            size={type.fontSize.xl}
            color={isLocked ? theme.colors.text.tertiary : theme.colors.primary.main}
          />
        }
        trailing={
          <View style={styles.trailing}>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                setInfoPanel(panel);
              }}
              hitSlop={spacing.xs}
              accessibilityRole="button"
              accessibilityLabel={`About ${panel.name}`}
              style={styles.iconButton}
            >
              <Ionicons
                name="information-circle-outline"
                size={type.fontSize['2xl']}
                color={theme.colors.text.tertiary}
              />
            </Pressable>
            {isLocked ? (
              <Text style={[type.textStyles.caption, { color: theme.colors.text.tertiary }]}>
                Coming soon
              </Text>
            ) : isAdded ? (
              <Ionicons
                name="checkmark-circle"
                size={type.fontSize['2xl']}
                color={theme.colors.semantic.success}
                accessibilityLabel="Added"
              />
            ) : (
              <Pressable
                onPress={() => handleAddPanel(panel)}
                hitSlop={spacing.xs}
                accessibilityRole="button"
                accessibilityLabel={`Add ${panel.name}`}
                style={styles.iconButton}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={type.fontSize['2xl']}
                  color={theme.colors.primary.main}
                />
              </Pressable>
            )}
          </View>
        }
        onPress={canAdd ? () => handleAddPanel(panel) : undefined}
      />
    );
  };

  const header = (
    <View style={{ paddingBottom: spacing.sm }}>
      <BackButton onPress={() => navigation.goBack()} style={{ marginBottom: spacing.sm }} />
      <Text style={[type.textStyles.h2, { color: theme.colors.text.primary }]}>
        Panel Marketplace
      </Text>
      <Text
        style={[
          type.textStyles.bodySmall,
          { color: theme.colors.text.secondary, marginTop: spacing.xs },
        ]}
      >
        Add panels to your home screen
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: spacing.md, marginHorizontal: -spacing.gutter }}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.sm }}
      >
        <Chip
          label="All"
          selected={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
        />
        {CATEGORIES.map(cat => (
          <Chip
            key={cat.id}
            label={cat.name}
            selected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen
      scroll
      header={header}
      state={loaded ? 'ready' : 'loading'}
      bottomExtra={spacing['2xl']}
    >
      {groups.length === 0 ? (
        <EmptyState
          title="No panels here"
          message="Try another category to find more panels."
        />
      ) : (
        groups.map(group => (
          <Section
            key={group.id}
            title={selectedCategory === 'all' ? group.name : undefined}
          >
            {group.panels.map(renderPanelRow)}
          </Section>
        ))
      )}

      {/* Explanation modal */}
      <Modal
        visible={!!infoPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoPanel(null)}
      >
        <Pressable
          style={[
            styles.modalOverlay,
            {
              padding: spacing.xl,
              backgroundColor: colorWithAlpha(
                theme.isDark ? theme.colors.background.primary : theme.colors.text.primary,
                0.5,
              ),
            },
          ]}
          onPress={() => setInfoPanel(null)}
          accessibilityLabel="Close"
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.background.secondary,
                borderRadius: radii.lg,
                padding: spacing.lg,
                shadowColor: theme.colors.shadow.dark,
              },
            ]}
            onPress={e => e.stopPropagation()}
          >
            {infoPanel && (
              <>
                <View style={[styles.modalHeader, { gap: spacing.sm, marginBottom: spacing.md }]}>
                  <Ionicons
                    name={getPanelIconName(infoPanel.type)}
                    size={type.fontSize['3xl']}
                    color={theme.colors.primary.main}
                  />
                  <Text style={[type.textStyles.h4, styles.flex, { color: theme.colors.text.primary }]}>
                    {infoPanel.name}
                  </Text>
                </View>
                <Text
                  style={[
                    type.textStyles.body,
                    { color: theme.colors.text.secondary, marginBottom: spacing.lg },
                  ]}
                >
                  {infoPanel.explanation || infoPanel.description}
                </Text>
                <GlassButton title="Got it" onPress={() => setInfoPanel(null)} />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  locked: {
    opacity: 0.65,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
