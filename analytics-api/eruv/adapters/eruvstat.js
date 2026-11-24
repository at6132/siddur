/**
 * EruvStatus (eruvstat.us) HTML status adapter.
 */

const ERUVSTAT_BASE = 'https://eruvstat.us';

export function parseEruvstatLabel(raw) {
  const t = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  if (t === 'UP') return 'up';
  if (t === 'DOWN') return 'down';
  if (t === 'NOT CHECKED' || t === 'AWAITING' || t.includes('NOT CHECK')) return 'awaiting';
  return 'unknown';
}

export function parseEruvstatHtml(html) {
  const labelMatch = String(html).match(
    /class=["'][^"']*es-eruv-status__label[^"']*["'][^>]*>\s*([^<]+)\s*</i,
  );
  const updatedMatch = String(html).match(
    /class=["'][^"']*es-eruv-status__updated[^"']*["'][^>]*>\s*Updated\s+([^<]+)\s*</i,
  );
  return {
    status: labelMatch ? parseEruvstatLabel(labelMatch[1]) : 'unknown',
    statusText: labelMatch ? labelMatch[1].trim() : null,
    sourceUpdatedAt: updatedMatch ? updatedMatch[1].trim() : null,
  };
}

export async function fetchEruvstatStatus(slug) {
  const url = `${ERUVSTAT_BASE}/${encodeURIComponent(slug)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'SiddurEruvAggregator/1.0 (+https://siddur24seven.com)',
    },
  });
  if (!res.ok) {
    const err = new Error(`EruvStatus HTTP ${res.status}`);
    err.statusCode = res.status;
    throw err;
  }
  const html = await res.text();
  return { ...parseEruvstatHtml(html), url };
}
