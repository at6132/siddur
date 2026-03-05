/**
 * Create a shared Tehillim campaign: choose type (split vs shared), title, reason, optional deadline.
 * On success shows shareable link with copy button.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors } from '../../src/design/colors';
import { spacing, borderRadius } from '../../src/design/spacing';
import { fonts } from '../../src/design/typography';
import { BackButton } from '../../components/ui/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { createTehillimCampaign, parseCampaignIdFromLink } from '../../src/api/tehillimApi';
import { getAnonymousId } from '../../src/analytics/IdentityService';

type CampaignType = 'split' | 'shared';

const GlassOption: React.FC<{
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}> = ({ title, subtitle, selected, onPress }) => {
  const content = (
    <View style={[styles.optionCard, selected && styles.optionCardSelected]}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={40} style={styles.optionBlur}>
          <View style={[styles.optionInner, selected && styles.optionInnerSelected]}>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{title}</Text>
              <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
              {selected && <View style={styles.radioInner} />}
            </View>
          </View>
        </BlurView>
      ) : (
        <LinearGradient
          colors={
            selected
              ? ['rgba(212, 165, 184, 0.3)', 'rgba(212, 165, 184, 0.2)']
              : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']
          }
          style={styles.optionBlur}
        >
          <View style={[styles.optionInner, selected && styles.optionInnerSelected]}>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{title}</Text>
              <Text style={styles.optionSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
              {selected && <View style={styles.radioInner} />}
            </View>
          </View>
        </LinearGradient>
      )}
    </View>
  );
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
};

export const CreateSharedTehillimScreen: React.FC = () => {
  const navigation = useNavigation();
  const [type, setType] = useState<CampaignType>('shared');
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinLinkInput, setJoinLinkInput] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    try {
      const createdBy = await getAnonymousId();
      const res = await createTehillimCampaign({
        type,
        title: title.trim() || 'Shared Tehillim',
        reason: reason.trim() || '',
        deadline: deadline.trim() ? new Date(deadline.trim()).toISOString() : null,
        created_by: createdBy,
      });
      setCreatedLink(res.campaign.link || null);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not create campaign. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdLink) return;
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(createdLink);
        Alert.alert('Copied', 'Link copied to clipboard.');
      } else {
        await Share.share({ message: createdLink, title: 'Shared Tehillim link' });
      }
    } catch (_) {
      Alert.alert('Could not copy');
    }
  };

  const handleJoinWithLink = () => {
    const id = parseCampaignIdFromLink(joinLinkInput);
    if (!id) {
      Alert.alert('Invalid link', 'Paste the full link you received (e.g. https://siddur24seven.com/tehillim/abc12xyz)');
      return;
    }
    setJoinModalVisible(false);
    setJoinLinkInput('');
    navigation.navigate('SharedTehillimView' as never, { campaignId: id } as never);
  };

  if (createdLink) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FAF9F7', '#F5E6E8', '#E8F0F5', '#FAF9F7']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
            <Text style={styles.title}>Share your Tehillim page</Text>
            <Text style={styles.subtitle}>Anyone with this link can join</Text>
          </View>
          <View style={styles.linkBox}>
            <Text style={styles.linkLabel}>Link</Text>
            <Text selectable style={styles.linkText}>
              {createdLink}
            </Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
              <Ionicons name="copy-outline" size={20} color={colors.text.inverse} />
              <Text style={styles.copyBtnText}>Copy / Share</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF9F7', '#F5E6E8', '#E8F0F5', '#FAF9F7']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps={Platform.OS === 'ios' ? 'never' : 'handled'}>
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} style={styles.backButton} />
          <Text style={styles.title}>Make your Tehillim page</Text>
          <Text style={styles.subtitle}>Create a shared page others can join</Text>
        </View>

        <TouchableOpacity style={styles.joinLinkRow} onPress={() => setJoinModalVisible(true)}>
          <Ionicons name="link" size={20} color={colors.primary.main} />
          <Text style={styles.joinLinkText}>I have a link — join a shared page</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Type</Text>
          <GlassOption
            title="Split & claim"
            subtitle="Participants claim sections (e.g. perakim 1–10). Each perek claimed by one person."
            selected={type === 'split'}
            onPress={() => setType('split')}
          />
          <GlassOption
            title="Shared completion"
            subtitle="Everyone completes perakim in any order. No claiming; mark complete when done."
            selected={type === 'shared'}
            onPress={() => setType('shared')}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name (optional)</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Refuah for Sarah"
            placeholderTextColor={colors.text.tertiary}
            inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reason (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Refuah sheleima"
            placeholderTextColor={colors.text.tertiary}
            multiline
            inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Deadline (optional)</Text>
          <TextInput
            style={styles.input}
            value={deadline}
            onChangeText={setDeadline}
            placeholder="e.g. 2025-03-15 or leave blank"
            placeholderTextColor={colors.text.tertiary}
            inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
          />
        </View>

        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.createBtnText}>Create & get link</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={joinModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setJoinModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Join with link</Text>
            <Text style={styles.modalSubtitle}>Paste the link you received</Text>
            <TextInput
              style={styles.modalInput}
              value={joinLinkInput}
              onChangeText={setJoinLinkInput}
              placeholder="https://siddur24seven.com/tehillim/..."
              placeholderTextColor={colors.text.tertiary}
              autoCapitalize="none"
              autoCorrect={false}
              inputAccessoryViewID={Platform.OS === 'ios' ? 'globalDone' : undefined}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setJoinModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalOk} onPress={handleJoinWithLink}>
                <Text style={styles.modalOkText}>Open</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing['2xl'] + spacing.safeTopInset,
    paddingBottom: 140,
  },
  header: { marginBottom: spacing.xl },
  backButton: { marginBottom: spacing.md },
  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 28,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    color: colors.text.secondary,
  },
  joinLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  joinLinkText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.primary.main,
  },
  section: { marginBottom: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  optionCard: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.md,
  },
  optionCardSelected: { borderColor: colors.primary.main },
  optionBlur: { overflow: 'hidden' },
  optionInner: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  optionInnerSelected: { backgroundColor: 'rgba(212, 165, 184, 0.15)' },
  optionContent: { flex: 1 },
  optionTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  optionTitleSelected: { color: colors.primary.dark, fontFamily: fonts.heading.bold },
  optionSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: colors.primary.main },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.main,
  },
  input: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputMultiline: { minHeight: 72 },
  createBtn: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createBtnDisabled: { opacity: 0.7 },
  createBtnText: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 17,
    color: colors.text.inverse,
  },
  linkBox: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  linkLabel: {
    fontFamily: fonts.body.semiBold,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  linkText: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  copyBtnText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 15,
    color: colors.text.inverse,
  },
  doneBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  doneBtnText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.primary.main,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalBox: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontFamily: fonts.heading.semiBold,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    fontFamily: fonts.body.regular,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalCancel: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  modalCancelText: { fontFamily: fonts.body.semiBold, fontSize: 15, color: colors.text.secondary },
  modalOk: {
    backgroundColor: colors.primary.main,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  modalOkText: { fontFamily: fonts.heading.semiBold, fontSize: 15, color: colors.text.inverse },
});
