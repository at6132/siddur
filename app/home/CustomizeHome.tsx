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
  PANEL_DEFINITIONS,
} from '../../src/storage/HomePanelsService';

// Glass Card Component
const GlassCard: React.FC<{
  children: React.ReactNode;
  style?: any;
}> = ({ children, style }) => {
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

  return content;
};

export const CustomizeHome: React.FC = () => {
  const navigation = useNavigation();
  const [panels, setPanels] = useState<HomePanel[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPanels();
  }, []);

  const loadPanels = async () => {
    const loadedPanels = await HomePanelsService.getPanels();
    setPanels(loadedPanels.sort((a, b) => a.order - b.order));
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
    newPanels.forEach((p, i) => p.order = i);
    
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
    Alert.alert('Saved', 'Your home screen has been updated!');
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
            <Text style={styles.title}>Customize Home</Text>
            <Text style={styles.subtitle}>Drag to reorder, tap to toggle visibility</Text>
          </View>
        </FadeIn>

        {/* Action Buttons */}
        <FadeIn delay={50}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.addPanelButton}
              onPress={() => navigation.navigate('PanelsMarketplace' as never)}
            >
              <Text style={styles.addPanelIcon}>+</Text>
              <Text style={styles.addPanelText}>Add Panel</Text>
            </TouchableOpacity>
            
            {hasChanges && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveChanges}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            )}
          </View>
        </FadeIn>

        {/* Panels List */}
        <View style={styles.panelsList}>
          {panels.map((panel, index) => {
            const info = getPanelInfo(panel);
            if (!info) return null;
            
            return (
              <FadeIn key={panel.id} delay={100 + index * 30}>
                <GlassCard style={[styles.panelItem, !panel.visible && styles.panelItemHidden]}>
                  <View style={styles.panelContent}>
                    <View style={styles.panelLeft}>
                      <Text style={styles.panelIcon}>{info.icon}</Text>
                      <View style={styles.panelInfo}>
                        <Text style={styles.panelName}>{info.name}</Text>
                        <Text style={styles.panelCategory}>{info.category}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.panelActions}>
                      {/* Move Up */}
                      <TouchableOpacity
                        style={[styles.actionButton, index === 0 && styles.actionButtonDisabled]}
                        onPress={() => movePanel(index, 'up')}
                        disabled={index === 0}
                      >
                        <Text style={styles.actionButtonText}>↑</Text>
                      </TouchableOpacity>
                      
                      {/* Move Down */}
                      <TouchableOpacity
                        style={[styles.actionButton, index === panels.length - 1 && styles.actionButtonDisabled]}
                        onPress={() => movePanel(index, 'down')}
                        disabled={index === panels.length - 1}
                      >
                        <Text style={styles.actionButtonText}>↓</Text>
                      </TouchableOpacity>
                      
                      {/* Toggle Visibility */}
                      <TouchableOpacity
                        style={[styles.actionButton, panel.visible && styles.actionButtonActive]}
                        onPress={() => toggleVisibility(index)}
                      >
                        <Text style={styles.actionButtonText}>{panel.visible ? '👁️' : '👁️‍🗨️'}</Text>
                      </TouchableOpacity>
                      
                      {/* Remove */}
                      <TouchableOpacity
                        style={[styles.actionButton, styles.actionButtonDanger]}
                        onPress={() => removePanel(index)}
                      >
                        <Text style={styles.actionButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>
              </FadeIn>
            );
          })}
        </View>

        {/* Reset Button */}
        <FadeIn delay={300}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={resetToDefault}
          >
            <Text style={styles.resetButtonText}>Reset to Default</Text>
          </TouchableOpacity>
        </FadeIn>

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
    fontSize: 14,
    color: colors.text.secondary,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  addPanelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.main,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  addPanelIcon: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  addPanelText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: '#fff',
  },
  saveButton: {
    backgroundColor: colors.semantic.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  saveButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: '#fff',
  },

  // Panels List
  panelsList: {
    gap: spacing.sm,
  },

  // Glass Card
  glassCard: {
    borderRadius: borderRadius.lg,
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

  // Panel Item
  panelItem: {},
  panelItemHidden: {
    opacity: 0.5,
  },
  panelContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  panelIcon: {
    fontSize: 24,
  },
  panelInfo: {
    flex: 1,
  },
  panelName: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.text.primary,
  },
  panelCategory: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    color: colors.text.tertiary,
    textTransform: 'capitalize',
  },

  // Panel Actions
  panelActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.3,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(212, 165, 184, 0.3)',
  },
  actionButtonDanger: {
    backgroundColor: 'rgba(212, 165, 165, 0.3)',
  },
  actionButtonText: {
    fontSize: 16,
  },

  // Reset Button
  resetButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resetButtonText: {
    fontFamily: fonts.body.medium,
    fontSize: 14,
    color: colors.text.tertiary,
    textDecorationLine: 'underline',
  },
});
