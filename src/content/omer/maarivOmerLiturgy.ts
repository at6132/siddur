/**
 * Maariv Sefirat HaOmer — tonight only (same wording source as Omer practice screen).
 */

import { OmerCalculator } from '../../core/omer/OmerCalculator';
import { OMER_HARACHAMAN_HEBREW } from './postOmerLiturgy';

export function buildMaarivOmerLiturgy(omerDay: number): {
  hebrew: string;
  english: string;
  omerDay: number;
} | null {
  if (omerDay < 1 || omerDay > 49) return null;
  const blessing = OmerCalculator.getOmerBlessing(omerDay);
  if (!blessing.blessingHebrew?.trim() || !blessing.countHebrew?.trim()) return null;

  const hebrew = [blessing.blessingHebrew.trim(), blessing.countHebrew.trim(), OMER_HARACHAMAN_HEBREW.trim()]
    .filter(Boolean)
    .join('\n\n');

  const english = [blessing.blessing.trim(), blessing.count.trim()].filter(Boolean).join('\n\n');

  return { hebrew, english, omerDay };
}
