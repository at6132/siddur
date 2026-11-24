export type TourTargetId = 'library-tab' | 'hub-tab' | 'settings-menu' | 'reader-bug';

export type TourTargetRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TourStepId = 'library' | 'hub' | 'settings' | 'bug';

export type TourStep = {
  id: TourStepId;
  targetId: TourTargetId;
  title: string;
  body: string;
  /** Padding around the measured target for the spotlight hole */
  holePadding?: number;
  /** Corner radius of the spotlight hole */
  holeRadius?: number;
};

export type TourNavigation = {
  goToTab: (tab: 'Home' | 'Library' | 'Hub' | 'Calendar' | 'Search') => void;
  openLibraryReader: (service: string) => void;
  closeReaderToLibrary: () => void;
};
