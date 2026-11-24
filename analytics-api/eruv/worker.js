/**
 * Eruv status refresh worker. Fetches external sources (EruvStatus today),
 * writes results into Postgres. Never called from the mobile app.
 *
 * Cadence: full resync once per week on Thursday (America/New_York), plus
 * a one-shot boot refresh. Manual POST /api/eruvs/refresh still works.
 */

import { fetchEruvstatStatus } from './adapters/eruvstat.js';
import { listEruvsForProvider, upsertEruvStatus, seedEruvCatalog } from './store.js';

const CONCURRENCY = 5;
/** Thursday = 4 in JS getDay() (0=Sun). Run at 10:00 Eastern. */
const WEEKLY_WEEKDAY = 4;
const WEEKLY_HOUR_ET = 10;
const WEEKLY_MINUTE_ET = 0;

let running = false;
let timer = null;
let lastRun = null;

function easternParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    weekday: weekdayMap[get('weekday')] ?? 0,
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour') === '24' ? '0' : get('hour')),
    minute: Number(get('minute')),
  };
}

/** Ms until the next Thursday 10:00 America/New_York. */
export function msUntilNextThursdayResync(from = new Date()) {
  const stepMs = 60 * 1000;
  const horizon = from.getTime() + 8 * 24 * 60 * 60 * 1000;
  for (let t = from.getTime() + stepMs; t <= horizon; t += stepMs) {
    const p = easternParts(new Date(t));
    if (
      p.weekday === WEEKLY_WEEKDAY &&
      p.hour === WEEKLY_HOUR_ET &&
      p.minute === WEEKLY_MINUTE_ET
    ) {
      return t - from.getTime();
    }
  }
  return 7 * 24 * 60 * 60 * 1000;
}

async function mapPool(items, concurrency, fn) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  const n = Math.min(concurrency, items.length) || 1;
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

export async function refreshEruvStatuses({
  providers = ['eruvstat_us'],
  resyncCatalog = false,
} = {}) {
  if (running) {
    return { ok: false, skipped: true, reason: 'already_running', lastRun };
  }
  running = true;
  const started = Date.now();
  const summary = {
    ok: true,
    kind: resyncCatalog ? 'weekly_full' : 'status_only',
    refreshed: 0,
    failed: 0,
    catalogUpserted: 0,
    providers: {},
    durationMs: 0,
  };

  try {
    if (resyncCatalog) {
      const seeded = await seedEruvCatalog();
      summary.catalogUpserted = seeded?.upserted ?? 0;
    }

    for (const provider of providers) {
      if (provider !== 'eruvstat_us') {
        summary.providers[provider] = { skipped: true, reason: 'no_adapter' };
        continue;
      }
      const eruvs = await listEruvsForProvider('eruvstat_us');
      let refreshed = 0;
      let failed = 0;
      await mapPool(eruvs, CONCURRENCY, async (eruv) => {
        try {
          const parsed = await fetchEruvstatStatus(eruv.providerKey);
          await upsertEruvStatus({
            eruvId: eruv.id,
            status: parsed.status,
            statusText: parsed.statusText,
            sourceUpdatedAt: parsed.sourceUpdatedAt,
            fetchOk: true,
            error: null,
          });
          refreshed += 1;
        } catch (e) {
          failed += 1;
          await upsertEruvStatus({
            eruvId: eruv.id,
            status: 'unknown',
            statusText: null,
            sourceUpdatedAt: null,
            fetchOk: false,
            error: e?.message || String(e),
          });
        }
      });
      summary.providers[provider] = { total: eruvs.length, refreshed, failed };
      summary.refreshed += refreshed;
      summary.failed += failed;
    }
  } finally {
    running = false;
    summary.durationMs = Date.now() - started;
    lastRun = { at: new Date().toISOString(), ...summary };
  }

  console.log('[eruv-worker] refresh complete', JSON.stringify(lastRun));
  return lastRun;
}

/** Weekly Thursday job: re-seed catalog + refresh all live providers. */
export async function weeklyFullResync() {
  return refreshEruvStatuses({ resyncCatalog: true });
}

export function getEruvWorkerStatus() {
  return {
    running,
    lastRun,
    nextIntervalMs: msUntilNextThursdayResync(),
    schedule: 'weekly_thursday_10am_america_new_york',
  };
}

export function startEruvWorker() {
  if (timer) return;

  const schedule = () => {
    const ms = msUntilNextThursdayResync();
    console.log(
      `[eruv-worker] next Thursday full resync in ${Math.round(ms / 60000)} min`,
    );
    timer = setTimeout(async () => {
      try {
        await weeklyFullResync();
      } catch (e) {
        console.error('[eruv-worker] weekly resync error', e);
      } finally {
        schedule();
      }
    }, ms);
    if (typeof timer.unref === 'function') timer.unref();
  };

  // Boot once so a fresh deploy is not empty until next Thursday.
  setTimeout(() => {
    refreshEruvStatuses({ resyncCatalog: true }).catch((e) =>
      console.error('[eruv-worker] boot refresh', e),
    );
  }, 5_000).unref?.();

  schedule();
  console.log('[eruv-worker] scheduled weekly Thursday full resync (ET)');
}
