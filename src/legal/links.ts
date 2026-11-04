/** Canonical public legal + support URLs for App Store, Settings, and share links. */

export const LEGAL_SITE = 'https://www.siddur24seven.com';

export const LEGAL = {
  site: LEGAL_SITE,
  privacyUrl: `${LEGAL_SITE}/privacy`,
  termsUrl: `${LEGAL_SITE}/terms`,
  supportUrl: `${LEGAL_SITE}/support`,
  supportEmail: 'shevastudios@gmail.com',
  supportPhoneDisplay: '347-554-7549',
  supportPhoneTel: 'tel:+13475547549',
} as const;

export function mailtoSupport(subject?: string, body?: string): string {
  const q = new URLSearchParams();
  if (subject) q.set('subject', subject);
  if (body) q.set('body', body);
  const qs = q.toString();
  return qs ? `mailto:${LEGAL.supportEmail}?${qs}` : `mailto:${LEGAL.supportEmail}`;
}
