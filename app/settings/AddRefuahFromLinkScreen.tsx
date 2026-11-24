/**
 * Confirm screen opened from a Refuah share deep link.
 * One tap adds the choleh to local refuahPersonalNames (with dedupe).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Screen, GlassButton } from '../../components/ui';
import { PracticeHeader, InlineError } from '../../components/hub/PracticeKit';
import { UserPreferencesService } from '../../src/storage/UserPreferences';
import {
  RefuahPersonalName,
  RefuahPersonalNameGender,
} from '../../src/types/preferences';
import { useTheme } from '../../src/design/theme';
import { formatRefuahDisplayName } from '../../src/api/refuahShare';

type Params = {
  nameHebrew?: string;
  motherNameHebrew?: string;
  gender?: RefuahPersonalNameGender;
};

function sameName(a: RefuahPersonalName, b: Params): boolean {
  return (
    a.nameHebrew.trim() === (b.nameHebrew || '').trim() &&
    a.motherNameHebrew.trim() === (b.motherNameHebrew || '').trim() &&
    a.gender === b.gender
  );
}

export const AddRefuahFromLinkScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ AddRefuahFromLink: Params }, 'AddRefuahFromLink'>>();
  const { theme } = useTheme();
  const { spacing, type } = theme.tokens;

  const nameHebrew = (route.params?.nameHebrew || '').trim();
  const motherNameHebrew = (route.params?.motherNameHebrew || '').trim();
  const gender = route.params?.gender === 'female' ? 'female' : 'male';
  const valid = Boolean(nameHebrew && motherNameHebrew);

  const [alreadySaved, setAlreadySaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!valid) return;
      const prefs = await UserPreferencesService.getPreferences();
      const list = prefs?.refuahPersonalNames ?? [];
      if (!cancelled) {
        setAlreadySaved(
          list.some((x) => sameName(x, { nameHebrew, motherNameHebrew, gender }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [valid, nameHebrew, motherNameHebrew, gender]);

  const display = formatRefuahDisplayName({ nameHebrew, motherNameHebrew, gender });
  const genderLabel = gender === 'female' ? 'Female (בת)' : 'Male (בן)';

  const hebrewBody = {
    fontFamily: type.fonts.hebrew.medium,
    fontSize: type.fontSize.xl,
    writingDirection: 'rtl' as const,
  };

  const onAdd = useCallback(async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const prefs = await UserPreferencesService.getPreferences();
      const list = [...(prefs?.refuahPersonalNames ?? [])];
      if (list.some((x) => sameName(x, { nameHebrew, motherNameHebrew, gender }))) {
        setAlreadySaved(true);
        setSaved(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      const row: RefuahPersonalName = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        gender,
        nameHebrew,
        motherNameHebrew,
      };
      list.push(row);
      await UserPreferencesService.setRefuahPersonalNames(list);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
      setAlreadySaved(true);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Could not save this name. Try again.');
    } finally {
      setSaving(false);
    }
  }, [valid, saving, nameHebrew, motherNameHebrew, gender]);

  const onClose = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  if (!valid) {
    return (
      <Screen
        header={<PracticeHeader title="Add choleh" onBack={onClose} />}
        state="error"
        errorMessage="This link is missing a name. Ask for a new share link."
        onRetry={onClose}
      />
    );
  }

  return (
    <Screen header={<PracticeHeader title="Add choleh" onBack={onClose} />} scroll>
      <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, gap: spacing.lg }}>
        <Text style={[type.textStyles.body, { color: theme.colors.text.secondary }]}>
          Add this name to your Refuah list for Amidah?
        </Text>

        <View
          style={{
            paddingVertical: spacing.lg,
            paddingHorizontal: spacing.md,
            borderRadius: theme.tokens.radii.lg,
            backgroundColor: theme.colors.background.secondary,
            gap: spacing.xs,
          }}
        >
          <Text
            style={[
              hebrewBody,
              { color: theme.colors.text.primary, alignSelf: 'flex-start', textAlign: 'right' },
            ]}
          >
            {display}
          </Text>
          <Text style={[type.textStyles.caption, { color: theme.colors.text.secondary }]}>
            {genderLabel}
          </Text>
        </View>

        {error ? <InlineError message={error} /> : null}

        {saved || alreadySaved ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[type.textStyles.body, { color: theme.colors.text.primary }]}>
              {saved
                ? 'Saved. This name will appear in רְפָאֵנוּ.'
                : 'This name is already on your list.'}
            </Text>
            <GlassButton title="Done" onPress={onClose} />
          </View>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <GlassButton
              title="Add to my list"
              onPress={onAdd}
              disabled={saving}
              loading={saving}
            />
            <GlassButton title="Cancel" variant="secondary" onPress={onClose} />
          </View>
        )}
      </View>
    </Screen>
  );
};
