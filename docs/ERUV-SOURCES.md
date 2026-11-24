# Eruv data sources (America-first)

There is **no single public nationwide API** that returns every US eruv with live status and boundary polygons. Status is still mostly per-community (website, hotline, WhatsApp, email). This doc ranks sources the **Railway aggregator** uses for Hub → Eruv Map, starting with the United States.

## App architecture

- Mobile app → **only** `GET /api/eruvs` on analytics-api (plus local AsyncStorage cache).
- Railway owns catalog seed, status polling, and Postgres (`eruvs`, `eruv_status_current`, `eruv_status_history`).
- External sites (e.g. eruvstat.us) are never called from the device.

See `analytics-api/README.md` and set `ERUV_REFRESH_SECRET` on the Railway `analytics-api` service.

## Verdict for v1

| Need | Best path now |
| --- | --- |
| List of US eruvin + area labels | Curated catalog seed in `analytics-api/eruv/catalogSeed.js` (~79 US) |
| Live up/down for a subset | Railway worker scrapes [EruvStatus](https://eruvstat.us/) HTML (~17 US communities) |
| Official “where to check” + hotlines | Seeded URLs / hotlines from [Eruv Status](https://eruvstatus.org/) + [ShulMap](https://shulmap.com/eruv/) |
| Boundary polygons / GeoJSON | No public national feed; per-eruv KML/PDF/maps only (e.g. EruvMaps, community PDFs) |

Always treat the **community’s own announcement** as authoritative. App status is a convenience mirror, not a psak.

---

## Tier A — usable programmatically (US)

### 1. EruvStatus — https://eruvstat.us/

- **What:** Live weekly status (UP / DOWN / NOT CHECKED) + update date for communities that run on their platform.
- **API:** No documented public JSON API (Drupal 11; `/jsonapi` and `?_format=json` not open).
- **Machine-readable enough:** Each eruv has a short URL; status lives in HTML:

  ```html
  <p class="es-eruv-status__label">NOT CHECKED</p>
  <p class="es-eruv-status__updated">Updated 13 November 2026</p>
  ```

- **Also:** Embed-status snippet for partner sites (contact them for a proper API / partnership).
- **US slugs (as of Nov 2026):**

  | Slug | Community |
  | --- | --- |
  | `33154` | Bal Harbour / Bay Harbor / Surfside, FL |
  | `baltimore` | Baltimore, MD |
  | `camberville` | Cambridge / Somerville, MA |
  | `cherryhillwest` | Cherry Hill West, NJ |
  | `lakeview` | Chicago (Lakeview), IL |
  | `southside` | Chicago (South Side), IL |
  | `southdallas` | Dallas (South), TX |
  | `lincolnwood` | Lincolnwood / Peterson Park, IL |
  | `mainline` | Main Line (Philadelphia), PA |
  | `malden` | Malden, MA |
  | `milwaukee` | Milwaukee (East Side), WI |
  | `neworleans` | New Orleans, LA |
  | `pceruv` | Passaic / Clifton, NJ |
  | `plano` | Plano, TX |
  | `rochester` | Rochester, NY (listed on site) |
  | `sewardpark` | Seward Park (Seattle), WA |
  | `skokie` | Skokie, IL |

- **Non-US (later):** `montreal`, `villesaintlaurent`

### 2. Per-community status sites (HTML scrape or deep-link)

Examples with structured weekly status pages (not official APIs):

| Community | Status / map URL | Notes |
| --- | --- | --- |
| Manhattan | https://eruv.nyc/ | Status + maps + zip coverage |
| Cincinnati | https://status.cincinnatieruv.org/ | Status history; hotline (513) 351-3788 |
| East Denver | https://denvereruv.org/ | Weekly web status |
| Phoenix / Valley | https://phoenixeruv.com/ / arizonaeruv.org | Hotline 602-264-3788 |
| Great Neck | https://greatneckeiruv.org/ | Weekly web status |
| Kew Gardens Hills | https://kgheruv.com/ | Weekly web status |
| Lower Merion | https://lowermerioneruv.org/ | Weekly web status |
| LA Community | https://laeruv.com/ | Email alerts |
| Detroit | https://www.detroiteruv.org/ | Status + map |
| Pittsburgh | https://vaadpgh.org/ | Weekly status |

---

## Tier B — directories (metadata, not live status)

### 3. Eruv Status (Consult With Ari) — https://eruvstatus.org/

- **What:** Directory of **~79 USA** eruvin (116 worldwide): official status source, map link, phone when found.
- **API:** None. Explicitly does **not** publish live up/down.
- **Use:** Seed catalog (name, city, area, statusSourceUrl, mapUrl, hotline).
- **Contact:** https://eruvstatus.org/contact for corrections / partnership.

### 4. ShulMap Eruv Guide — https://shulmap.com/eruv/

- Curated status lines / maps for ~41 communities.
- Good for hotlines and “how to check”; no bulk API.

### 5. EruvMaps — https://eruvmaps.com/

- 3D boundary exploration; **no public API** found.
- Useful later if they offer licensed GeoJSON.

---

## Tier C — not suitable for US v1

| Source | Why |
| --- | --- |
| Uman Map API `GET /v1/eruv` | Ukraine pilgrimage map; returns PDF, not US |
| Random shul pages | One-off HTML; high maintenance |
| Phone-only hotlines | Cannot poll from the app without human/voice |

---

## Recommended product phases

1. **USA catalog** — static list (name, area, state, city, lat/lng centroid, official links). Status = `unknown` unless enriched.
2. **Live status subset** — parse EruvStatus (`eruvstat.us`) for the ~16 US slugs above; deep-link everyone else to their official source / hotline.
3. **Partnerships** — ask EruvStatus / Eruv Status / EruvMaps for JSON feeds or licensed boundary data.
4. **Expand** — Canada → UK → elsewhere using the same directory + status providers.

## Halacha / product disclaimer (keep in UI)

Status in the app is informational. Confirm with the eruv’s official source and your rav before carrying on Shabbos.
