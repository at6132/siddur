/**
 * KML → GeoJSON geometry helper for Google My Maps eruv exports.
 * Handles Polygon, MultiPolygon, closed LineStrings, stitched open border lines,
 * and named exclusion/karfef rings as Polygon interior holes.
 */

function parseCoordTuples(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter((c) => c.length >= 2 && Number.isFinite(c[0]) && Number.isFinite(c[1]))
    .map(([lng, lat]) => [lng, lat]);
}

function closeRing(ring) {
  if (ring.length < 3) return null;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, [first[0], first[1]]];
  }
  return ring;
}

function nearlyEqual(a, b, eps = 1e-5) {
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
}

/** Greedy stitch of open polylines into closed rings when endpoints meet. */
export function stitchLineStringsToRings(lines, eps = 1e-5) {
  const remaining = lines
    .map((l) => l.filter((c) => Array.isArray(c) && c.length >= 2))
    .filter((l) => l.length >= 2)
    .map((l) => [...l]);
  const rings = [];

  while (remaining.length) {
    let path = remaining.shift();
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < remaining.length; i++) {
        const seg = remaining[i];
        const head = path[0];
        const tail = path[path.length - 1];
        const s0 = seg[0];
        const s1 = seg[seg.length - 1];
        if (nearlyEqual(tail, s0, eps)) {
          path = path.concat(seg.slice(1));
          remaining.splice(i, 1);
          grew = true;
          break;
        }
        if (nearlyEqual(tail, s1, eps)) {
          path = path.concat(seg.slice(0, -1).reverse());
          remaining.splice(i, 1);
          grew = true;
          break;
        }
        if (nearlyEqual(head, s1, eps)) {
          path = seg.slice(0, -1).concat(path);
          remaining.splice(i, 1);
          grew = true;
          break;
        }
        if (nearlyEqual(head, s0, eps)) {
          path = seg.slice(1).reverse().concat(path);
          remaining.splice(i, 1);
          grew = true;
          break;
        }
      }
    }
    const ring = closeRing(path);
    if (ring && ring.length >= 4) rings.push(ring);
  }
  return rings;
}

function lineToPolygon(coords) {
  const ring = closeRing(coords);
  if (!ring || ring.length < 4) return null;
  return { type: 'Polygon', coordinates: [ring] };
}

function ringsToGeometry(rings) {
  if (!rings.length) return null;
  if (rings.length === 1) return { type: 'Polygon', coordinates: [rings[0]] };
  return { type: 'MultiPolygon', coordinates: rings.map((r) => [r]) };
}

function extractPolygonsFromBlock(block) {
  const polygons = [];
  const polyBlocks = String(block).match(/<Polygon\b[\s\S]*?<\/Polygon>/gi) || [];
  for (const pblock of polyBlocks) {
    const outer = pblock.match(
      /<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/i,
    );
    if (!outer) continue;
    const ring = closeRing(parseCoordTuples(outer[1]));
    if (!ring || ring.length < 4) continue;
    const holes = [];
    const inners = pblock.matchAll(
      /<innerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/gi,
    );
    for (const m of inners) {
      const hole = closeRing(parseCoordTuples(m[1]));
      if (hole && hole.length >= 4) holes.push(hole);
    }
    polygons.push([ring, ...holes]);
  }
  return polygons;
}

function extractLineCoordsFromBlock(block) {
  const lines = [];
  const lineBlocks = String(block).match(/<LineString\b[\s\S]*?<\/LineString>/gi) || [];
  for (const lblock of lineBlocks) {
    const coordsMatch = lblock.match(/<coordinates>([\s\S]*?)<\/coordinates>/i);
    if (!coordsMatch) continue;
    const coords = parseCoordTuples(coordsMatch[1]);
    if (coords.length >= 2) lines.push(coords);
  }
  return lines;
}

/** Named layers that are carve-outs inside the eruv (become GeoJSON holes). */
const EXCLUSION_NAME_RE =
  /exclu|karfef|karpaf|\bhole\b|gap|not in|outside|carve|internal exclu|(?:water|stream|pond|lake)\s+(?:area|section)/i;

/** Never treat these as holes even if they mention water/outside loosely. */
const EXCLUSION_NAME_DENY_RE =
  /shared\s*border|lechis?|direction|fence detail|hotline|\bstatus\b|marker|pin|label only|synagogue|shul|school|temple/i;

const BORDER_NAME_RE =
  /border|boundar|coverage|eruv(?!\s*exclu)|perimeter|outline|main|route|map/i;

function ringCentroid(ring) {
  let sx = 0;
  let sy = 0;
  const n = Math.max(1, ring.length - 1);
  for (let i = 0; i < n; i++) {
    sx += ring[i][0];
    sy += ring[i][1];
  }
  return [sx / n, sy / n];
}

/** Ray-casting point-in-ring (lng/lat as x/y). */
export function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function ringBBox(ring) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return { minLng, maxLng, minLat, maxLat };
}

function bboxArea(b) {
  return Math.max(0, b.maxLng - b.minLng) * Math.max(0, b.maxLat - b.minLat);
}

/** Shoelace signed area in lng/lat space (sign = winding). */
export function ringSignedArea(ring) {
  if (!ring || ring.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
}

/** Force ring winding: ccw=true → counterclockwise (GeoJSON exterior). */
export function orientRing(ring, ccw) {
  if (!ring || ring.length < 4) return ring;
  const area = ringSignedArea(ring);
  const isCcw = area > 0;
  if (isCcw === Boolean(ccw)) return ring;
  const open = ring.slice(0, -1).reverse();
  return closeRing(open);
}

/**
 * GeoJSON right-hand rule: exterior CCW, holes CW.
 * Apple Maps / Google often ignore holes when winding matches the outer.
 */
export function normalizePolygonWinding(geometry) {
  if (!geometry) return geometry;
  const fixPoly = (poly) => {
    if (!poly?.[0]) return poly;
    const outer = orientRing(poly[0], true);
    const holes = poly.slice(1).map((h) => orientRing(h, false));
    return [outer, ...holes];
  };
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: fixPoly(geometry.coordinates) };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map(fixPoly),
    };
  }
  return geometry;
}

/** Drop interior rings; keep only outers (Polygon or MultiPolygon). */
export function stripHoles(geometry) {
  if (!geometry) return geometry;
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: [geometry.coordinates[0]] };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((poly) => [poly[0]]),
    };
  }
  return geometry;
}

/**
 * Attach exclusion rings as interior holes of the containing outer polygon.
 * Returns a Polygon or MultiPolygon (each poly = [outer, ...holes]).
 */
export function attachExclusionHoles(outerGeometry, exclusionRings) {
  if (!outerGeometry || !exclusionRings?.length) {
    return normalizePolygonWinding(outerGeometry);
  }

  const polys =
    outerGeometry.type === 'Polygon'
      ? [outerGeometry.coordinates]
      : outerGeometry.coordinates.map((c) => [...c]);

  // Normalize to mutable [outer, ...existingHoles]
  const working = polys.map((poly) => {
    const outer = poly[0];
    const existing = poly.slice(1);
    return [outer, ...existing];
  });

  let attached = 0;
  for (const hole of exclusionRings) {
    if (!hole || hole.length < 4) continue;
    const c = ringCentroid(hole);
    const holeBox = ringBBox(hole);
    const holeA = bboxArea(holeBox);
    let bestIdx = -1;
    let bestOuterA = Infinity;
    for (let i = 0; i < working.length; i++) {
      const outer = working[i][0];
      if (!pointInRing(c, outer)) continue;
      const outerA = bboxArea(ringBBox(outer));
      // Hole must be meaningfully smaller than host (avoid flipping outer/inner)
      if (holeA >= outerA * 0.85) continue;
      if (outerA < bestOuterA) {
        bestOuterA = outerA;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      working[bestIdx].push(hole);
      attached += 1;
    }
  }

  let result;
  if (!attached) result = outerGeometry;
  else if (working.length === 1) result = { type: 'Polygon', coordinates: working[0] };
  else result = { type: 'MultiPolygon', coordinates: working };
  return normalizePolygonWinding(result);
}

export function isExclusionName(name) {
  if (!name) return false;
  // Explicit carve-outs win even if the placemark is named after a shul/school.
  // Match "excluded" / "exclusion" via exclu… (not a strict word-boundary on exclu).
  if (/exclu|karfef|karpaf|\bnot in\b|\boutside\b/i.test(name)) {
    return !/shared\s*border/i.test(name);
  }
  if (EXCLUSION_NAME_DENY_RE.test(name)) return false;
  return EXCLUSION_NAME_RE.test(name);
}

function collectRingsFromPolysAndLines(polys, lines) {
  const rings = [];
  for (const poly of polys) {
    // Full polygon with its own KML inner holes already attached
    if (poly[0]) rings.push(poly[0]);
    // Also keep native KML inner holes as exclusion candidates when this is an exclusion placemark
    for (let i = 1; i < poly.length; i++) rings.push(poly[i]);
  }
  for (const line of lines) {
    if (nearlyEqual(line[0], line[line.length - 1], 1e-4)) {
      const ring = closeRing(line);
      if (ring) rings.push(ring);
    }
  }
  // Stitch open exclusion segments (rare)
  const open = lines.filter((l) => !nearlyEqual(l[0], l[l.length - 1], 1e-4));
  if (open.length) rings.push(...stitchLineStringsToRings(open));
  return rings;
}

/**
 * Convert KML text to Polygon/MultiPolygon (with exclusion holes when present).
 * @param {string} kmlText
 * @param {{ preferBorders?: boolean, nameIncludes?: string, includeExclusions?: boolean }} [opts]
 */
export function kmlToGeometry(kmlText, opts = {}) {
  const {
    preferBorders = true,
    nameIncludes = null,
    includeExclusions = true,
  } = opts;
  const needle = nameIncludes ? String(nameIncludes).toLowerCase() : null;

  const placemarks = String(kmlText).match(/<Placemark\b[\s\S]*?<\/Placemark>/gi) || [];
  if (placemarks.length) {
    const borderPolys = [];
    const otherPolys = [];
    const borderLines = [];
    const otherLines = [];
    const exclusionRings = [];

    for (const pm of placemarks) {
      const nameMatch = pm.match(/<name>([^<]*)<\/name>/i);
      const name = (nameMatch?.[1] || '').trim();
      const polys = extractPolygonsFromBlock(pm);
      const lines = extractLineCoordsFromBlock(pm);

      // Always omit named carve-outs from the outer; optionally keep them as holes.
      if (isExclusionName(name)) {
        if (includeExclusions) {
          exclusionRings.push(...collectRingsFromPolysAndLines(polys, lines));
        }
        continue;
      }

      if (needle && !name.toLowerCase().includes(needle)) continue;

      const isBorder = BORDER_NAME_RE.test(name) || !name;

      if (polys.length) {
        (preferBorders && isBorder ? borderPolys : otherPolys).push(...polys);
      }
      if (lines.length) {
        (preferBorders && isBorder ? borderLines : otherLines).push(...lines);
      }
    }

    let geometry = null;
    const polys = borderPolys.length ? borderPolys : otherPolys;
    if (polys.length === 1) geometry = { type: 'Polygon', coordinates: polys[0] };
    else if (polys.length > 1) geometry = { type: 'MultiPolygon', coordinates: polys };

    if (!geometry) {
      const lines = borderLines.length ? borderLines : otherLines;
      const closed = [];
      const open = [];
      for (const line of lines) {
        const poly = lineToPolygon(line);
        if (poly && nearlyEqual(line[0], line[line.length - 1], 1e-4)) {
          closed.push(poly.coordinates);
        } else {
          open.push(line);
        }
      }
      if (closed.length === 1 && !open.length) {
        geometry = { type: 'Polygon', coordinates: closed[0] };
      } else if (closed.length > 1 && !open.length) {
        geometry = { type: 'MultiPolygon', coordinates: closed.map((c) => c) };
      } else {
        const stitched = stitchLineStringsToRings(open);
        const allRings = [...closed.map((c) => c[0]), ...stitched];
        geometry = ringsToGeometry(allRings);
      }
    }

    if (geometry && includeExclusions && exclusionRings.length) {
      geometry = attachExclusionHoles(geometry, exclusionRings);
    }
    return normalizePolygonWinding(geometry);
  }

  // Fallback: whole document (no placemark split) — keep native innerBoundaryIs holes
  const polygons = extractPolygonsFromBlock(kmlText);
  if (polygons.length === 1) {
    return normalizePolygonWinding({ type: 'Polygon', coordinates: polygons[0] });
  }
  if (polygons.length > 1) {
    return normalizePolygonWinding({ type: 'MultiPolygon', coordinates: polygons });
  }

  const lines = extractLineCoordsFromBlock(kmlText);
  const stitched = stitchLineStringsToRings(lines);
  return normalizePolygonWinding(ringsToGeometry(stitched));
}

/** Count interior rings (holes) on a Polygon/MultiPolygon. */
export function countHoles(geometry) {
  if (!geometry) return 0;
  if (geometry.type === 'Polygon') {
    return Math.max(0, geometry.coordinates.length - 1);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce((n, poly) => n + Math.max(0, poly.length - 1), 0);
  }
  return 0;
}

export async function fetchGoogleMyMapsGeometry(mid, opts = {}) {
  const url = `https://www.google.com/maps/d/kml?mid=${encodeURIComponent(mid)}&forcekml=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SiddurEruvBoundaryHarvest/1.0' },
  });
  if (!res.ok) throw new Error(`My Maps KML HTTP ${res.status}`);
  const kml = await res.text();
  const geometry = kmlToGeometry(kml, opts);
  return {
    geometry,
    sourceUrl: url,
    kmlBytes: kml.length,
    kml,
    holeCount: countHoles(geometry),
  };
}
