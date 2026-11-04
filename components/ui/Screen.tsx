import React, { type ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/design/theme';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorView } from './ErrorView';
import { EmptyState } from './EmptyState';

export type ScreenState = 'ready' | 'loading' | 'empty' | 'error';

export interface ScreenProps {
  children?: ReactNode;
  /** Optional header slot (title row, native-ish chrome). */
  header?: ReactNode;
  /** When true, wraps body in a ScrollView. */
  scroll?: boolean;
  /** Apply screen background gradient (default true). */
  gradient?: boolean;
  /** Content state — loading / empty / error replace children. */
  state?: ScreenState;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  errorMessage?: string;
  onRetry?: () => void;
  /** Extra bottom padding beyond safe area (e.g. tab bar clearance). */
  bottomExtra?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  header,
  scroll = false,
  gradient = true,
  state = 'ready',
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction,
  errorMessage,
  onRetry,
  bottomExtra = 0,
  style,
  contentStyle,
}: ScreenProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing } = theme.tokens;

  const paddingBottom = insets.bottom + spacing.md + bottomExtra;

  let body: ReactNode = children;
  if (state === 'loading') {
    body = <LoadingSpinner />;
  } else if (state === 'error') {
    body = <ErrorView message={errorMessage} onRetry={onRetry} />;
  } else if (state === 'empty') {
    body = <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  }

  const content = (
    <View
      style={[
        styles.body,
        {
          paddingHorizontal: spacing.gutter,
          paddingTop: header ? spacing.sm : insets.top + spacing.sm,
          paddingBottom,
        },
        contentStyle,
      ]}
    >
      {body}
    </View>
  );

  const shell = (
    <View style={styles.flex}>
      {header ? (
        <View style={{ paddingTop: insets.top, paddingHorizontal: spacing.gutter }}>
          {header}
        </View>
      ) : null}
      {scroll && state === 'ready' ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );

  if (!gradient) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background.secondary }, style]}>
        {shell}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[...theme.backgroundGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.flex, style]}
    >
      {shell}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
