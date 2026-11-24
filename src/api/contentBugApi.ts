/**
 * In-app content bug reports (hard to read / incorrect / missing).
 * Uses the same analytics backend URL as Tehillim / support.
 */

export type ContentBugCategory = 'hard_to_read' | 'incorrect' | 'missing' | 'other';

export interface ContentBugPayload {
  source: string;
  title: string;
  context?: string;
  category: ContentBugCategory;
  note?: string;
  screenshot_base64?: string | null;
  screenshot_mime?: string | null;
  app_version?: string | null;
  platform?: string | null;
}

async function getBaseUrl(): Promise<string | null> {
  try {
    const { default: Constants } = await import('expo-constants');
    const extra = (Constants.expoConfig as any)?.extra;
    const u =
      (typeof extra?.analyticsUrl === 'string' && extra.analyticsUrl) ||
      (typeof process !== 'undefined' && (process as any).env?.EXPO_PUBLIC_ANALYTICS_URL);
    if (typeof u === 'string' && u.length > 0) return u.replace(/\/$/, '');
  } catch {}
  return null;
}

export async function submitContentBug(payload: ContentBugPayload): Promise<{ id: number }> {
  const base = await getBaseUrl();
  if (!base) throw new Error('Could not reach the server. Try again later.');
  const res = await fetch(`${base}/api/content-bugs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'Could not send the report.');
  }
  return { id: Number(data.id) };
}
