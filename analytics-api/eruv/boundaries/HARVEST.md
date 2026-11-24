# Eruv boundary harvest (exact polygons)

## Output contract (required)

For each assigned eruv id, write **one** JSON file:

`analytics-api/eruv/boundaries/inbox/<batch>/<eruv-id>.json`

```json
{
  "eruvId": "us-fl-miami-beach",
  "status": "ready" | "pending_digitize" | "not_found" | "skipped_contested",
  "sourceType": "google_my_maps" | "kml" | "kmz" | "pdf" | "image" | "web_map" | "none",
  "sourceUrl": "https://...",
  "googleMyMapsMid": "optional-mid-or-null",
  "notes": "short free text",
  "checkedAt": "ISO-8601",
  "geometry": null
}
```

When `status` is `"ready"`, `geometry` **must** be a GeoJSON `Polygon` or `MultiPolygon` (WGS84 lon/lat), e.g.:

```json
"geometry": {
  "type": "MultiPolygon",
  "coordinates": [ [ [ [lng, lat], ... ] ] ]
}
```

LineStrings alone are not enough unless you close them into a polygon ring.

## How to get geometry (priority order)

1. **Google My Maps**  
   - Find `https://www.google.com/maps/d/viewer?mid=XXXX` (or `/edit?mid=`).  
   - Download KML: `https://www.google.com/maps/d/kml?mid=XXXX&forcekml=1`  
   - Convert polygons/closed lines to GeoJSON MultiPolygon.  
2. **Native `.kml` / `.kmz`** download from the eruv site.  
3. **PDF / PNG map** only: set `status: "pending_digitize"`, fill `sourceUrl`, leave `geometry: null`. Do **not** invent borders.  
4. No map: `status: "not_found"`. Contested / do-not-rely listings: `skipped_contested`.

## Rules

- Do **not** invent or approximate polygons from city centroids.  
- Do **not** edit files outside your `inbox/<batch>/` folder.  
- Prefer official community / vaad maps.  
- One file per eruv id even if not found.  
- Also write `_summary.json` in your inbox folder: `{ "batch", "ready", "pending_digitize", "not_found", "skipped_contested", "eruvIdsReady": [] }`.
