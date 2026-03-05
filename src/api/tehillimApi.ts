/**
 * Shared Tehillim campaigns API. Uses same base URL as analytics (analyticsUrl).
 */

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

export interface TehillimCampaign {
  id: string;
  type: 'split' | 'shared';
  title: string;
  reason: string;
  deadline: string | null;
  created_at?: string;
  created_by?: string | null;
  link?: string;
  is_creator?: boolean;
}

export interface CampaignDetailResponse {
  campaign: TehillimCampaign;
  byPerek: Record<number, { participant_id?: string; completed_at?: string | null; is_mine?: boolean }>;
  commitments: Array<{ perek_number: number; participant_id: string; completed_at: string | null }>;
  completions: Array<{ perek_number: number; participant_id: string; completed_at: string | null }>;
}

export async function createTehillimCampaign(params: {
  type: 'split' | 'shared';
  title?: string;
  reason?: string;
  deadline?: string | null;
  created_by?: string | null;
}): Promise<{ campaign: TehillimCampaign & { link: string } }> {
  const base = await getBaseUrl();
  if (!base) throw new Error('Analytics URL not configured');
  const res = await fetch(`${base}/api/tehillim/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: params.type,
      title: params.title ?? '',
      reason: params.reason ?? '',
      deadline: params.deadline ?? null,
      created_by: params.created_by ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText || 'Failed to create campaign');
  }
  return res.json();
}

export async function getTehillimCampaign(
  campaignId: string,
  participantId: string
): Promise<CampaignDetailResponse> {
  const base = await getBaseUrl();
  if (!base) throw new Error('Analytics URL not configured');
  const url = `${base}/api/tehillim/campaigns/${encodeURIComponent(campaignId)}?participant_id=${encodeURIComponent(participantId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Campaign not found');
    throw new Error('Failed to load campaign');
  }
  return res.json();
}

export async function claimTehillimRange(
  campaignId: string,
  perekStart: number,
  perekEnd: number,
  participantId: string
): Promise<{ claimed: number }> {
  const base = await getBaseUrl();
  if (!base) throw new Error('Analytics URL not configured');
  const res = await fetch(`${base}/api/tehillim/campaigns/${encodeURIComponent(campaignId)}/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perek_start: perekStart, perek_end: perekEnd, participant_id: participantId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to claim');
  }
  return res.json();
}

export async function completeTehillimPereks(
  campaignId: string,
  perekNumbers: number[],
  participantId: string
): Promise<{ completed: number }> {
  const base = await getBaseUrl();
  if (!base) throw new Error('Analytics URL not configured');
  const res = await fetch(`${base}/api/tehillim/campaigns/${encodeURIComponent(campaignId)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perek_numbers: perekNumbers, participant_id: participantId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to complete');
  }
  return res.json();
}

export async function listMyTehillimCampaigns(participantId: string): Promise<{ campaigns: TehillimCampaign[] }> {
  const base = await getBaseUrl();
  if (!base) return { campaigns: [] };
  const url = `${base}/api/tehillim/campaigns?participant_id=${encodeURIComponent(participantId)}`;
  const res = await fetch(url);
  if (!res.ok) return { campaigns: [] };
  return res.json();
}

export async function leaveTehillimCampaign(campaignId: string, participantId: string): Promise<void> {
  const base = await getBaseUrl();
  if (!base) throw new Error('Analytics URL not configured');
  const res = await fetch(`${base}/api/tehillim/campaigns/${encodeURIComponent(campaignId)}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participant_id: participantId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to leave');
  }
}

export async function joinTehillimCampaign(campaignId: string, participantId: string): Promise<void> {
  const base = await getBaseUrl();
  if (!base) return;
  const res = await fetch(`${base}/api/tehillim/campaigns/${encodeURIComponent(campaignId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participant_id: participantId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 404) throw new Error(err.error || 'Campaign not found');
  }
}

export async function deleteTehillimCampaign(campaignId: string, participantId: string): Promise<void> {
  const base = await getBaseUrl();
  if (!base) throw new Error('Analytics URL not configured');
  const res = await fetch(
    `${base}/api/tehillim/campaigns/${encodeURIComponent(campaignId)}?participant_id=${encodeURIComponent(participantId)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete');
  }
}

/** Parse campaign id from share link (e.g. https://siddur24seven.com/tehillim/abc12 or siddur://tehillim/abc12). */
export function parseCampaignIdFromLink(link: string): string | null {
  const trimmed = link.trim();
  const match = trimmed.match(/tehillim[\/#]([a-z0-9]+)/i);
  return match ? match[1] : null;
}
