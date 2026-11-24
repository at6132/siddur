/**
 * Live address suggestions for the Eruv map (Photon / OpenStreetMap).
 * No API key; suitable for Expo Go. Debounce at the call site.
 */

export type AddressSuggestion = {
  id: string;
  label: string;
  secondary: string | null;
  latitude: number;
  longitude: number;
};

type PhotonFeature = {
  geometry?: { coordinates?: number[] };
  properties?: {
    osm_id?: number | string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
    type?: string;
  };
};

function formatLabel(p: PhotonFeature['properties']): { label: string; secondary: string | null } {
  if (!p) return { label: 'Place', secondary: null };
  const line1 =
    [p.housenumber, p.street].filter(Boolean).join(' ') ||
    p.name ||
    p.city ||
    p.town ||
    p.village ||
    'Place';
  const locality = p.city || p.town || p.village || null;
  const line2 = [locality, p.state, p.postcode].filter(Boolean).join(', ') || null;
  return { label: line1, secondary: line2 };
}

/** US-biased address autocomplete. */
export async function suggestAddresses(
  query: string,
  opts?: { signal?: AbortSignal; limit?: number },
): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const limit = opts?.limit ?? 6;
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
    `&limit=${limit}&lang=en&lat=39.8&lon=-98.6`;

  const res = await fetch(url, {
    signal: opts?.signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Address suggest HTTP ${res.status}`);

  const body = (await res.json()) as { features?: PhotonFeature[] };
  const out: AddressSuggestion[] = [];

  for (const f of body.features || []) {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;
    const [lng, lat] = coords;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const cc = (f.properties?.countrycode || '').toLowerCase();
    const country = (f.properties?.country || '').toLowerCase();
    if (cc && cc !== 'us' && country && !country.includes('united states')) {
      continue;
    }

    const { label, secondary } = formatLabel(f.properties);
    out.push({
      id: `photon-${f.properties?.osm_id ?? `${lat},${lng}`}`,
      label,
      secondary,
      latitude: lat,
      longitude: lng,
    });
  }

  return out;
}
