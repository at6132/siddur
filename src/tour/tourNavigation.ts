import type { TourNavigation } from './types';

let navigation: TourNavigation | null = null;

export function registerTourNavigation(next: TourNavigation | null) {
  navigation = next;
}

export function getTourNavigation(): TourNavigation | null {
  return navigation;
}
