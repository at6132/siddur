import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, AppState, DeviceEventEmitter } from 'react-native';
import * as Haptics from 'expo-haptics';
import { UserPreferencesService } from '../storage/UserPreferences';
import { PRODUCT_TOUR_STEPS } from './steps';
import { getTourNavigation } from './tourNavigation';
import { PRODUCT_TOUR_RESTART_EVENT } from './tourEvents';
import type { TourStep, TourTargetId, TourTargetRect } from './types';

type TourContextValue = {
  active: boolean;
  stepIndex: number;
  step: TourStep | null;
  stepCount: number;
  targetRect: TourTargetRect | null;
  reduceMotion: boolean;
  registerTarget: (id: TourTargetId, rect: TourTargetRect) => void;
  unregisterTarget: (id: TourTargetId) => void;
  next: () => void;
  skip: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

const START_DELAY_MS = 850;
const STEP_SETTLE_MS = 480;
const BUG_STEP_SETTLE_MS = 720;
const TARGET_POLL_MS = 50;
const TARGET_WAIT_MS = 3200;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function prepareStep(step: TourStep) {
  const nav = getTourNavigation();
  if (!nav) return;

  switch (step.id) {
    case 'library':
      nav.goToTab('Library');
      break;
    case 'hub':
      nav.goToTab('Hub');
      break;
    case 'settings':
      nav.goToTab('Home');
      break;
    case 'bug':
      nav.openLibraryReader('modeh_ani');
      break;
    default:
      break;
  }
}

async function cleanupAfterTour(didReachBugStep: boolean) {
  const nav = getTourNavigation();
  if (!nav) return;
  if (didReachBugStep) {
    nav.closeReaderToLibrary();
    await delay(180);
  }
  nav.goToTab('Home');
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TourTargetRect | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const targetsRef = useRef<Partial<Record<TourTargetId, TourTargetRect>>>({});
  const finishingRef = useRef(false);
  const advancingRef = useRef(false);
  const startedRef = useRef(false);
  const stepIndexRef = useRef(0);

  const step = active ? PRODUCT_TOUR_STEPS[stepIndex] ?? null : null;
  const stepCount = PRODUCT_TOUR_STEPS.length;

  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(!!enabled);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const syncTarget = useCallback((targetId: TourTargetId) => {
    const rect = targetsRef.current[targetId] ?? null;
    setTargetRect(rect);
    return rect;
  }, []);

  const waitForTarget = useCallback(
    async (targetId: TourTargetId) => {
      const deadline = Date.now() + TARGET_WAIT_MS;
      while (Date.now() < deadline) {
        const rect = syncTarget(targetId);
        if (rect && rect.width > 0 && rect.height > 0) return rect;
        await delay(TARGET_POLL_MS);
      }
      return syncTarget(targetId);
    },
    [syncTarget]
  );

  const finishTour = useCallback(async (opts?: { skipped?: boolean }) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const reachedBug = stepIndexRef.current >= PRODUCT_TOUR_STEPS.findIndex((s) => s.id === 'bug');
    setActive(false);
    setTargetRect(null);
    try {
      await UserPreferencesService.markProductTourComplete();
    } catch {
      // Still leave the tour so the user is not stuck
    }
    try {
      await cleanupAfterTour(reachedBug || !!opts?.skipped);
    } catch {
      // ignore nav cleanup failures
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const showStep = useCallback(
    async (index: number) => {
      const nextStep = PRODUCT_TOUR_STEPS[index];
      if (!nextStep) {
        await finishTour();
        return;
      }
      setTargetRect(null);
      setStepIndex(index);
      setActive(true);
      await prepareStep(nextStep);
      await delay(nextStep.id === 'bug' ? BUG_STEP_SETTLE_MS : STEP_SETTLE_MS);
      await waitForTarget(nextStep.targetId);
      void Haptics.selectionAsync();
    },
    [finishTour, waitForTarget]
  );

  const next = useCallback(() => {
    if (advancingRef.current || finishingRef.current) return;
    advancingRef.current = true;
    void (async () => {
      try {
        const upcoming = stepIndexRef.current + 1;
        if (upcoming >= PRODUCT_TOUR_STEPS.length) {
          await finishTour();
          return;
        }
        await showStep(upcoming);
      } finally {
        advancingRef.current = false;
      }
    })();
  }, [finishTour, showStep]);

  const skip = useCallback(() => {
    if (finishingRef.current) return;
    void finishTour({ skipped: true });
  }, [finishTour]);

  const registerTarget = useCallback(
    (id: TourTargetId, rect: TourTargetRect) => {
      targetsRef.current[id] = rect;
      const current = PRODUCT_TOUR_STEPS[stepIndexRef.current];
      if (active && current?.targetId === id) {
        setTargetRect(rect);
      }
    },
    [active]
  );

  const unregisterTarget = useCallback((id: TourTargetId) => {
    delete targetsRef.current[id];
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tryStart = async (opts?: { force?: boolean }) => {
      if (cancelled) return;
      if (!opts?.force && startedRef.current) return;
      if (!opts?.force) {
        const completed = await UserPreferencesService.hasCompletedProductTour();
        if (cancelled || completed) return;
      }
      // Wait until tab navigation bridge is registered
      const deadline = Date.now() + 4000;
      while (!getTourNavigation() && Date.now() < deadline && !cancelled) {
        await delay(80);
      }
      if (cancelled || !getTourNavigation()) return;
      await delay(opts?.force ? 320 : START_DELAY_MS);
      if (cancelled) return;
      if (AppState.currentState !== 'active') return;
      startedRef.current = true;
      finishingRef.current = false;
      advancingRef.current = false;
      await showStep(0);
    };

    void tryStart();

    const sub = DeviceEventEmitter.addListener(PRODUCT_TOUR_RESTART_EVENT, () => {
      void tryStart({ force: true });
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [showStep]);

  const value = useMemo<TourContextValue>(
    () => ({
      active,
      stepIndex,
      step,
      stepCount,
      targetRect,
      reduceMotion,
      registerTarget,
      unregisterTarget,
      next,
      skip,
    }),
    [
      active,
      stepIndex,
      step,
      stepCount,
      targetRect,
      reduceMotion,
      registerTarget,
      unregisterTarget,
      next,
      skip,
    ]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within TourProvider');
  }
  return ctx;
}

export function useTourOptional() {
  return useContext(TourContext);
}
