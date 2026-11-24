/**
 * Shareable Refuah (choleh) name links.
 * Encodes name fields in the URL — no server-side entity.
 *
 * App:   siddur://refuah/add?n=...&m=...&g=male|female
 * Share: https://siddur24seven.com/refuah/add?n=...&m=...&g=...
 */

import type { RefuahPersonalNameGender } from '../types/preferences';

export const REFUAH_SHARE_BASE_URL = 'https://siddur24seven.com';

export type RefuahSharePayload = {
  nameHebrew: string;
  motherNameHebrew: string;
  gender: RefuahPersonalNameGender;
};

function isGender(value: string | null): value is RefuahPersonalNameGender {
  return value === 'male' || value === 'female';
}

/** Build HTTPS share URL for a choleh name. */
export function buildRefuahShareLink(payload: RefuahSharePayload): string {
  const params = new URLSearchParams({
    n: payload.nameHebrew.trim(),
    m: payload.motherNameHebrew.trim(),
    g: payload.gender,
  });
  return `${REFUAH_SHARE_BASE_URL}/refuah/add?${params.toString()}`;
}

/** Build custom-scheme deep link (used by server redirect). */
export function buildRefuahAppLink(payload: RefuahSharePayload): string {
  const params = new URLSearchParams({
    n: payload.nameHebrew.trim(),
    m: payload.motherNameHebrew.trim(),
    g: payload.gender,
  });
  return `siddur://refuah/add?${params.toString()}`;
}

/**
 * Parse a Refuah share / deep link.
 * Accepts siddur://refuah/add?... or https://siddur24seven.com/refuah/add?...
 */
export function parseRefuahShareLink(link: string | null | undefined): RefuahSharePayload | null {
  if (!link || typeof link !== 'string') return null;
  const trimmed = link.trim();
  if (!/refuah\/add/i.test(trimmed)) return null;

  let query = '';
  const qIndex = trimmed.indexOf('?');
  if (qIndex >= 0) {
    query = trimmed.slice(qIndex + 1);
  } else {
    return null;
  }

  // Strip hash fragments from query if present
  const hashIndex = query.indexOf('#');
  if (hashIndex >= 0) query = query.slice(0, hashIndex);

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query);
  } catch {
    return null;
  }

  const n = (params.get('n') || '').trim();
  const m = (params.get('m') || '').trim();
  const g = (params.get('g') || '').trim().toLowerCase();
  if (!n || !m || !isGender(g)) return null;

  return { nameHebrew: n, motherNameHebrew: m, gender: g };
}

export function formatRefuahDisplayName(payload: RefuahSharePayload): string {
  const connector = payload.gender === 'female' ? 'בת' : 'בן';
  return `${payload.nameHebrew} ${connector} ${payload.motherNameHebrew}`;
}
