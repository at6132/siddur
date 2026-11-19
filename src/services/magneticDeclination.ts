/**
 * Magnetic declination (variation) via World Magnetic Model 2025.
 * East-positive degrees: trueHeading ≈ magHeading + declination.
 */

import * as magvarModule from 'magvar';

type MagvarFn = (
  latitude: number,
  longitude: number,
  altitudeKm?: number,
  when?: number | Date
) => number;

function resolveMagvarFn(): MagvarFn | null {
  const mod = magvarModule as {
    magvar?: MagvarFn;
    default?: { magvar?: MagvarFn } | MagvarFn;
  };
  if (typeof mod.magvar === 'function') return mod.magvar;
  if (mod.default && typeof mod.default === 'object' && typeof mod.default.magvar === 'function') {
    return mod.default.magvar;
  }
  if (typeof mod.default === 'function') return mod.default;
  return null;
}

const magvarFn = resolveMagvarFn();

/** Declination at lat/lon in degrees (east of true north is positive). */
export function getMagneticDeclination(
  latitude: number,
  longitude: number,
  altitudeKm = 0
): number | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (!magvarFn) return null;
  try {
    const decl = magvarFn(latitude, longitude, altitudeKm);
    return Number.isFinite(decl) ? decl : null;
  } catch {
    return null;
  }
}

/** Convert magnetic heading to true heading using local declination. */
export function magneticToTrueHeading(
  magHeading: number,
  declination: number
): number {
  return ((magHeading + declination) % 360 + 360) % 360;
}
