/**
 * Nusach (Prayer tradition) types
 */

export type Nusach = 'ashkenaz' | 'sfard';

export const NUSACH_OPTIONS: { value: Nusach; label: string }[] = [
  { value: 'ashkenaz', label: 'Ashkenaz' },
  { value: 'sfard', label: 'Sfard' },
];

