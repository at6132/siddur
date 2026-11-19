declare module 'magvar' {
  /** Magnetic declination in degrees (east positive) for WMM2025. */
  export function magvar(
    latitude: number,
    longitude: number,
    altitudeKm?: number,
    when?: number | Date
  ): number;

  export function magneticField(
    latitude: number,
    longitude: number,
    altitudeKm?: number,
    when?: number | Date
  ): {
    declination: number;
    inclination: number;
    x: number;
    y: number;
    z: number;
    h: number;
    f: number;
    decimalYear: number;
  };

  const _default: {
    magvar: typeof magvar;
    magneticField: typeof magneticField;
  };
  export default _default;
}
