import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BackButton } from '../../components/ui/BackButton';
import { Screen } from '../../components/ui/Screen';
import { Section } from '../../components/ui/Section';
import { ListRow } from '../../components/ui/ListRow';
import { GlassButton } from '../../components/ui/GlassButton';
import { useTheme } from '../../src/design/theme';
import {
  HomePanelsService,
  HomePanel,
  PANEL_DEFINITIONS,
} from '../../src/storage/HomePanelsService';
import { getPanelIconName } from './utils/panelIcons';

interface PanelActionProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

/** Secondary row action, revealed only when a panel row is expanded. */
const PanelAction: React.FC<PanelActionProps> = ({ icon, label, onPress, disabled, destructive }) => {
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const color = destructive ? theme.colors.semantic.error : theme.colors.text.secondary;

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        void Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.action,
        {
          gap: spacing.xs,
          opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={theme.tokens.type.fontSize.lg} color={color} />
      <Text style={[type.textStyles.label, { color }]}>{label}</Text>
    </Pressable>
  );
};

export const CustomizeHome: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;
  const [panels, setPanels] = useState<HomePanel[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadPanels();
  }, []);

  const loadPanels = async () => {
    const loadedPanels = await HomePanelsService.getPanels();
    setPanels(loadedPanels.sort((a, b) => a.order - b.order));
    setLoaded(true);
  };

  const getPanelInfo = (panel: HomePanel) => {
    return PANEL_DEFINITIONS.find(p => p.type === panel.type);
  };

  const movePanel = (index: number, direction: 'up' | 'down') => {
    const newPanels = [...panels];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= panels.length) return;

    // Swap panels
    [newPanels[index], newPanels[targetIndex]] = [newPanels[targetIndex], newPanels[index]];

    // Update order values
    newPanels.forEach((p, i) => (p.order = i));

    setPanels(newPanels);
    setHasChanges(true);
  };

  const toggleVisibility = (index: number) => {
    const newPanels = [...panels];
    newPanels[index].visible = !newPanels[index].visible;
    setPanels(newPanels);
    setHasChanges(true);
  };

  const removePanel = (index: number) => {
    const panel = panels[index];
    const info = getPanelInfo(panel);

    Alert.alert(
      'Remove Panel',
      `Remove "${info?.name || 'this panel'}" from your home screen?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await HomePanelsService.removePanel(panel.id);
            setExpandedId(null);
            loadPanels();
          },
        },
      ]
    );
  };

  const saveChanges = async () => {
    const panelIds = panels.map(p => p.id);
    await HomePanelsService.reorderPanels(panelIds);

    // Save visibility changes
    for (const panel of panels) {
      const original = await HomePanelsService.getPanels();
      const originalPanel = original.find(p => p.id === panel.id);
      if (originalPanel && originalPanel.visible !== panel.visible) {
        await HomePanelsService.togglePanelVisibility(panel.id);
      }
    }

    setHasChanges(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const resetToDefault = () => {
    Alert.alert(
      'Reset to Default',
      'This will restore the default panel layout.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await HomePanelsService.resetToDefault();
            loadPanels();
            setHasChanges(false);
          },
        },
      ]
    );
  };

  const goToMarketplace = () => navigation.navigate('PanelsMarketplace' as never);

  const header = (
    <View style={{ paddingBottom: spacing.md }}>
      <BackButton onPress={() => navigation.goBack()} style={{ marginBottom: spacing.sm }} />
      <Text style={[type.textStyles.h2, { color: theme.colors.text.primary }]}>
        Customize Home
      </Text>
      <Text
        style={[
          type.textStyles.bodySmall,
          { color: theme.colors.text.secondary, marginTop: spacing.xs },
        ]}
      >
        Tap a panel to reorder or remove it. Use the switch to show or hide.
      </Text>
    </View>
  );

  return (
    <Screen
      scroll
      header={header}
      state={loaded ? (panels.length === 0 ? 'empty' : 'ready') : 'loading'}
      emptyTitle="No panels on Home"
      emptyMessage="Add a panel to bring it back to your home screen."
      emptyAction={<GlassButton title="Add panel" onPress={goToMarketplace} />}
      bottomExtra={spacing['2xl']}
    >
      <View style={[styles.actionRow, { gap: spacing.sm, marginBottom: spacing.lg }]}>
        <GlassButton
          title="Add panel"
          variant={hasChanges ? 'ghost' : 'primary'}
          onPress={goToMarketplace}
          style={styles.flex}
        />
        {hasChanges ? (
          <GlassButton title="Save changes" onPress={saveChanges} style={styles.flex} />
        ) : null}
      </View>

      <Section title="Panels">
        {panels.map((panel, index) => {
          const info = getPanelInfo(panel);
          if (!info) return null;
          const expanded = expandedId === panel.id;

          return (
            <View key={panel.id}>
              <ListRow
                title={info.name}
                subtitle={info.category}
                leading={
                  <Ionicons
                    name={getPanelIconName(panel.type)}
                    size={type.fontSize.xl}
                    color={panel.visible ? theme.colors.primary.main : theme.colors.text.tertiary}
                  />
                }
                trailing={
                  <Switch
                    value={panel.visible}
                    onValueChange={() => {
                      void Haptics.selectionAsync();
                      toggleVisibility(index);
                    }}
                    trackColor={{
                      false: theme.colors.neutral[300],
                      true: theme.colors.primary.main,
                    }}
                    thumbColor={theme.colors.background.primary}
                    ios_backgroundColor={theme.colors.neutral[300]}
                    accessibilityLabel={`Show ${info.name} on Home`}
                  />
                }
                onPress={() => setExpandedId(expanded ? null : panel.id)}
              />
              {expanded ? (
                <View
                  style={[
                    styles.actionsRow,
                    {
                      paddingHorizontal: spacing.md,
                      paddingBottom: spacing.sm,
                      gap: spacing.md,
                    },
                  ]}
                >
                  <PanelAction
                    icon="arrow-up"
                    label="Move up"
                    disabled={index === 0}
                    onPress={() => movePanel(index, 'up')}
                  />
                  <PanelAction
                    icon="arrow-down"
                    label="Move down"
                    disabled={index === panels.length - 1}
                    onPress={() => movePanel(index, 'down')}
                  />
                  <PanelAction
                    icon="trash-outline"
                    label="Remove"
                    destructive
                    onPress={() => removePanel(index)}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </Section>

      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          resetToDefault();
        }}
        accessibilityRole="button"
        accessibilityLabel="Reset home to default layout"
        style={({ pressed }) => [
          styles.resetButton,
          { marginTop: spacing.md, paddingHorizontal: spacing.md, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <Text style={[type.textStyles.label, { color: theme.colors.text.tertiary }]}>
          Reset to default
        </Text>
      </Pressable>
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  resetButton: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
