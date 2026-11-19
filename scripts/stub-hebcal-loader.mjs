/**
 * Node loader: stub @hebcal/core and fix extensionless TS relative imports.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve('c:/Users/avita/siddur-1');

const hebcalStub = `
export class HDate {
  constructor(d) { this._d = d || new Date(); }
  getFullYear() { return 5786; }
  getMonth() { return 8; }
  getDate() { return 28; }
  render() { return 'stub'; }
  abs() { return 0; }
}
export const HebrewCalendar = {
  getHolidaysOnDate() { return []; },
  calendar() { return []; },
};
export const flags = {};
export const months = {};
export const Locale = { useLocale() {}, lookupTranslation() { return ''; } };
export function getSedra() { return { get() { return []; } }; }
export class ParshaEvent {}
`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@hebcal/core') {
    return {
      shortCircuit: true,
      url: 'data:text/javascript,' + encodeURIComponent(hebcalStub),
    };
  }
  if (
    context.parentURL &&
    context.parentURL.includes('/src/') &&
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !path.extname(specifier)
  ) {
    const parentDir = path.dirname(new URL(context.parentURL).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
    for (const ext of ['.ts', '.tsx', '.js']) {
      const candidate = path.resolve(parentDir, specifier + ext);
      try {
        const fs = await import('node:fs');
        if (fs.existsSync(candidate)) {
          return {
            shortCircuit: true,
            url: pathToFileURL(candidate).href,
            format: 'module',
          };
        }
      } catch {
        /* */
      }
    }
  }
  return nextResolve(specifier, context);
}
