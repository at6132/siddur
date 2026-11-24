import type { TourStep } from './types';

export const PRODUCT_TOUR_STEPS: TourStep[] = [
  {
    id: 'library',
    targetId: 'library-tab',
    title: 'Library',
    body: 'Siddur, Tehillim, and learning texts live here. Open anything to start reading.',
    holePadding: 6,
    holeRadius: 18,
  },
  {
    id: 'hub',
    targetId: 'hub-tab',
    title: 'Hub',
    body: 'Track goals, brachos, gratitude, and eruv status in one place.',
    holePadding: 6,
    holeRadius: 18,
  },
  {
    id: 'settings',
    targetId: 'settings-menu',
    title: 'Settings',
    body: 'Tap the menu on Home for Settings, reminders, nusach, and display preferences.',
    holePadding: 10,
    holeRadius: 22,
  },
  {
    id: 'bug',
    targetId: 'reader-bug',
    title: 'Report text issues',
    body: 'In any library text, tap the bug icon to flag hard-to-read or incorrect wording.',
    holePadding: 12,
    holeRadius: 20,
  },
];
