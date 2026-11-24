/**
 * Capture the visible reader area and open the bug-report sheet.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import { ReaderBugReportModal } from './ReaderBugReportModal';

export interface ReaderBugReportMeta {
  /** e.g. siddur, tehillim, chumash */
  source: string;
  title: string;
  /** Location hint: section, perek, Sefaria ref, etc. */
  context?: string;
}

export function useReaderBugReport(meta: ReaderBugReportMeta | (() => ReaderBugReportMeta)) {
  const captureViewRef = useRef<View>(null);
  const [visible, setVisible] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [activeMeta, setActiveMeta] = useState<ReaderBugReportMeta>(() =>
    typeof meta === 'function' ? meta() : meta
  );

  const openBugReport = useCallback(async () => {
    const nextMeta = typeof meta === 'function' ? meta() : meta;
    setActiveMeta(nextMeta);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setScreenshotUri(null);
    setScreenshotBase64(null);
    setCapturing(true);

    // Capture the reader before the sheet covers it.
    try {
      if (captureViewRef.current) {
        const base64 = await captureRef(captureViewRef, {
          format: 'jpg',
          quality: 0.5,
          result: 'base64',
          width: 540,
        });
        if (typeof base64 === 'string' && base64.length > 0) {
          const capped = base64.length > 1_200_000 ? base64.slice(0, 1_200_000) : base64;
          setScreenshotBase64(capped);
          setScreenshotUri(`data:image/jpeg;base64,${capped}`);
        }
      }
    } catch {
      // Screenshot is optional; note-only reports are fine.
    } finally {
      setCapturing(false);
      setVisible(true);
    }
  }, [meta]);

  const chromeProps = useMemo(
    () => ({
      showBugReport: true as const,
      onBugReport: openBugReport,
    }),
    [openBugReport]
  );

  const modal = (
    <ReaderBugReportModal
      visible={visible}
      onClose={() => setVisible(false)}
      meta={activeMeta}
      screenshotUri={screenshotUri}
      screenshotBase64={screenshotBase64}
      capturing={capturing}
    />
  );

  return { captureViewRef, chromeProps, modal, openBugReport };
}
