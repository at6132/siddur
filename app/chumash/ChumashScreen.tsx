/**
 * Chumash – Shneyim Mikra VeChad Targum (one aliyah/day) + 5 books browse.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/core';
import { Ionicons } from '@expo/vector-icons';
import { LearningIndex } from '../../components/learning/LearningParts';
import { GlassButton } from '../../components/ui/GlassButton';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { getShneyimMikraData } from '../../src/services/ShneyimMikraService';
import { ShneyimMikraTracker } from '../../src/storage/ShneyimMikraTracker';
import { CHUMASH_BOOKS } from '../../src/services/ChumashStructure';

const HEBREW_DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

export const ChumashScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const [data, setData] = useState<Awaited<ReturnType<typeof getShneyimMikraData>>>(null);
  const [progress, setProgress] = useState<{ aliyotCompleted: number[]; percentComplete: number; nextAliyah: number | null }>({ aliyotCompleted: [], percentComplete: 0, nextAliyah: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await getShneyimMikraData();
    setData(d);
    if (d?.parsha) {
      const p = await ShneyimMikraTracker.getProgress(d.parsha);
      setProgress(p);
    }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openNextAliyah = () => {
    if (!data?.parsha) return;
    const { nextAliyah } = progress;
    const ref = nextAliyah
      ? data.aliyot.find((a) => a.aliyah === nextAliyah)?.ref ?? data.todayRef
      : data.todayRef;
    if (ref) {
      (navigation as any).navigate('ChumashReader', {
        ref,
        parsha: data.parsha,
        aliyah: nextAliyah ?? data.todayAliyah,
      });
    }
  };

  const openBook = (b: { sefariaName: string; hebrew: string; firstRef: string }) => {
    (navigation as any).navigate('ChumashParshahPicker', { sefariaName: b.sefariaName });
  };

  const dayName = HEBREW_DAY_NAMES[new Date().getDay()];

  const renderShneyimMikraContent = () => {
    if (loading) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <ActivityIndicator size="small" color={theme.colors.primary.main} />
        </View>
      );
    }
    if (!data) {
      return (
        <>
          <Text style={[type.textStyles.h4, { color: theme.colors.text.primary }]}>
            Shneyim Mikra VeChad Targum
          </Text>
          <Text
            style={[
              type.textStyles.bodySmall,
              { color: theme.colors.text.secondary, marginTop: spacing.xs },
            ]}
          >
            {"Unable to load this week's parsha"}
          </Text>
        </>
      );
    }
    const { parsha, parshaHebrew, todayAliyah } = data;
    const { percentComplete, nextAliyah } = progress;

    return (
      <>
        <Text style={[type.textStyles.h4, { color: theme.colors.text.primary }]}>
          Shneyim Mikra VeChad Targum
        </Text>
        <Text
          style={[
            type.textStyles.bodySmall,
            { color: theme.colors.text.secondary, marginTop: spacing.xs },
          ]}
        >
          {parshaHebrew} {'\u2022'} Aliyah {todayAliyah} ({dayName})
        </Text>
        <View
          style={{
            height: spacing.sm,
            marginTop: spacing.md,
            borderRadius: radii.full,
            overflow: 'hidden',
            backgroundColor: colorWithAlpha(theme.colors.text.primary, theme.isDark ? 0.2 : 0.1),
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${percentComplete}%`,
              borderRadius: radii.full,
              backgroundColor: theme.colors.primary.main,
            }}
          />
        </View>
        <Text
          style={[
            type.textStyles.caption,
            { color: theme.colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.md },
          ]}
        >
          {progress.aliyotCompleted.length} of 7 aliyot complete
        </Text>
        {nextAliyah ? (
          <GlassButton
            title={`Continue with Aliyah ${nextAliyah}`}
            onPress={openNextAliyah}
            size="md"
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name="checkmark-circle"
              size={type.fontSize.xl}
              color={theme.colors.semantic.success}
            />
            <Text
              style={[
                type.textStyles.bodyBold,
                { color: theme.colors.text.primary, marginLeft: spacing.sm },
              ]}
            >
              {parsha} complete
            </Text>
          </View>
        )}
      </>
    );
  };

  const panel = (
    <Pressable
      onPress={openNextAliyah}
      disabled={loading || !data?.parsha}
      accessibilityRole="button"
      accessibilityLabel="Shneyim Mikra VeChad Targum"
      style={{
        padding: spacing.md,
        borderRadius: radii.lg,
        marginBottom: spacing.lg,
        backgroundColor: colorWithAlpha(theme.colors.accent.sage, theme.isDark ? 0.22 : 0.32),
      }}
    >
      {renderShneyimMikraContent()}
    </Pressable>
  );

  return (
    <LearningIndex
      title="Chumash"
      titleHebrew="חומש"
      onBack={() => navigation.goBack()}
      topContent={panel}
      sectionLabel="חמשה חומשי תורה"
      data={CHUMASH_BOOKS}
      keyExtractor={(b) => b.sefariaName}
      getHebrew={(b) => b.hebrew}
      onSelect={openBook}
    />
  );
};
