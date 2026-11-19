#!/usr/bin/env node
/**
 * Local Siddur content editor.
 * Run: npm run content-editor
 * Opens http://127.0.0.1:4177
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SIDDUR = path.join(ROOT, 'src', 'content', 'siddur');
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.CONTENT_EDITOR_PORT || 4177);
const HOST = '127.0.0.1';

const SKIP_BASENAMES = new Set([
  'pack.ts',
  'meta.ts',
  'policy.ts',
  'index.ts',
  'packTypes.ts',
  'resolvePack.ts',
]);

const SEASONAL_PHRASES = [
  { id: 'aseret_zochreinu', label: 'Aseret · זכרנו', re: /זָ?כְרֵֽ?נוּ\s+לְ?חַיִּים|זכרנו לחיים/u },
  { id: 'aseret_mei', label: 'Aseret · מי כמוך', re: /מִי\s+כָמֽ?וֹךָ\s+אָב|מי כמוך אב/u },
  { id: 'aseret_vichtov', label: 'Aseret · וכתוב', re: /וּ?כְ?תוֹב\s+לְ?חַיִּים|וכתוב לחיים/u },
  { id: 'aseret_sefer', label: 'Aseret · בספר חיים', re: /בּ?ְ?סֵֽ?פֶר\s+חַיִּים|בספר חיים/u },
  { id: 'gevuros_tal', label: 'Gevuros · מוריד הטל', re: /מוֹרִיד\s+הַטָּל|מוריד הטל/u },
  { id: 'gevuros_mashiv', label: 'Gevuros · משיב הרוח', re: /מַשִּׁיב\s+הָרֽ?וּחַ|משיב הרוח/u },
  { id: 'vten_tal', label: 'שנים · טל ומטר', re: /וְ?תֵן\s+טַל\s+וּ?מָטָר|ותן טל ומטר/u },
  { id: 'vten_bracha', label: 'שנים · ותן ברכה', re: /וְ?תֵן\s+בְּרָכָה|ותן ברכה/u },
  { id: 'yaaleh', label: 'יעלה ויבא', re: /יַעֲלֶה\s+וְ?יָבֹא|יעלה ויבא/u },
  { id: 'al_hanissim', label: 'על הנסים', re: /עַל\s+הַנִּסִּים|על הנסים/u },
  { id: 'aneinu', label: 'עננו', re: /עֲנֵֽ?נוּ\s+יְהֹוָה|עננו יהוה|עננו ה'/u },
  { id: 'hamelech_kadosh', label: 'המלך הקדוש', re: /הַמֶּֽ?לֶךְ\s+הַקָּדוֹשׁ|המלך הקדוש/u },
  { id: 'hamelech_mishpat', label: 'המלך המשפט', re: /הַמֶּֽ?לֶךְ\s+הַמִּשְׁפָּט|המלך המשפט/u },
  { id: 'nachem', label: 'נחם', re: /נַחֵם\s+|נחם /u },
  { id: 'atah_chonantanu', label: 'אתה חוננתנו', re: /אַתָּה\s+חוֹנַנְתָּנוּ|אתה חוננתנו/u },
];

function walkTsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walkTsFiles(p, out);
    else if (name.endsWith('.ts') && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function parseExport(src) {
  const m = src.match(/export\s+const\s+(\w+)\s*=\s*/);
  if (!m) return null;
  const name = m[1];
  const start = m.index + m[0].length;
  let i = start;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = j + 1;
        break;
      }
    }
  }
  if (end < 0) return null;
  const jsonish = src.slice(i, end);
  let data;
  try {
    data = Function(`"use strict"; return (${jsonish});`)();
  } catch (e) {
    throw new Error(`Parse failed for ${name}: ${e.message}`);
  }
  const header = src.slice(0, m.index);
  const hasAsConst = /^\s*as\s+const/.test(src.slice(end));
  return { name, data, header, hasAsConst };
}

function isTextSection(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && typeof v.hebrew === 'string';
}

function packShape(data) {
  // Single-section file: { key, hebrew, english, ... }
  if (typeof data.hebrew === 'string') {
    return { kind: 'single', sections: [data.key || '_root'] };
  }
  const sections = Object.keys(data).filter((k) => isTextSection(data[k]));
  return { kind: 'multi', sections };
}

function serializeValue(v, indent) {
  const pad = ' '.repeat(indent);
  if (v === null || typeof v !== 'object') {
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    const items = v.map((x) => `${pad}  ${JSON.stringify(x)}`).join(',\n');
    return `[\n${items}\n${pad}]`;
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  let out = '{\n';
  for (const k of keys) {
    out += `${pad}  ${JSON.stringify(k)}: ${serializeValue(v[k], indent + 2)},\n`;
  }
  out += `${pad}}`;
  return out;
}

function serializeFile(parsed) {
  const { name, data, header, hasAsConst } = parsed;
  const body = `export const ${name} = ${serializeValue(data, 0)}${hasAsConst ? ' as const' : ''};\n`;
  return header + body;
}

function classifyFile(absPath) {
  const rel = path.relative(SIDDUR, absPath).replace(/\\/g, '/');
  const parts = rel.split('/');
  if (parts.length < 2) return null;
  const prayer = parts[0];
  if (!['shacharit', 'mincha', 'maariv', 'standalone'].includes(prayer)) return null;
  const nusach = parts[1];
  if (!['ashkenaz', 'sefard'].includes(nusach)) return null;
  const file = parts.slice(2).join('/');
  if (!file.endsWith('.ts')) return null;
  if (SKIP_BASENAMES.has(path.basename(file))) return null;
  if (/Offline|ContentSets|Seasonal/i.test(file)) return null;
  return { prayer, nusach, file, rel, absPath };
}

function discoverPacks() {
  const packs = [];
  for (const absPath of walkTsFiles(SIDDUR)) {
    const f = classifyFile(absPath);
    if (!f) continue;
    try {
      const src = fs.readFileSync(absPath, 'utf8');
      if (!/export\s+const\s+\w+\s*=/.test(src)) continue;
      if (!/"hebrew"\s*:/.test(src)) continue;
      const parsed = parseExport(src);
      if (!parsed) continue;
      const shape = packShape(parsed.data);
      if (!shape.sections.length) continue;
      packs.push({
        id: `${f.prayer}/${f.nusach}/${f.file.replace(/\.ts$/, '')}`,
        prayer: f.prayer,
        nusach: f.nusach,
        file: f.file,
        rel: f.rel,
        absPath,
        exportName: parsed.name,
        kind: shape.kind,
        sections: shape.sections,
      });
    } catch {
      /* skip */
    }
  }
  packs.sort((a, b) => a.id.localeCompare(b.id));
  return packs;
}

function findPack(id) {
  return discoverPacks().find((p) => p.id === id);
}

function getSection(parsed, section) {
  const shape = packShape(parsed.data);
  if (shape.kind === 'single') {
    return parsed.data;
  }
  return parsed.data[section] || null;
}

function setSection(parsed, section, hebrew, english) {
  const shape = packShape(parsed.data);
  if (shape.kind === 'single') {
    if (typeof hebrew === 'string') parsed.data.hebrew = hebrew;
    if (typeof english === 'string') parsed.data.english = english;
    return;
  }
  if (!parsed.data[section]) throw new Error('section not found');
  if (typeof hebrew === 'string') parsed.data[section].hebrew = hebrew;
  if (typeof english === 'string') parsed.data[section].english = english;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function send(res, code, data, type = 'application/json') {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(code, {
    'Content-Type': `${type}; charset=utf-8`,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

const seasonalPublic = () =>
  SEASONAL_PHRASES.map(({ id, label, re }) => ({
    id,
    label,
    source: re.source,
    flags: re.flags,
  }));

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8'), 'text/html');
    }
    if (req.method === 'GET' && url.pathname === '/app.js') {
      return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'app.js'), 'utf8'), 'text/javascript');
    }
    if (req.method === 'GET' && url.pathname === '/styles.css') {
      return send(res, 200, fs.readFileSync(path.join(PUBLIC, 'styles.css'), 'utf8'), 'text/css');
    }

    if (req.method === 'GET' && url.pathname === '/api/packs') {
      return send(res, 200, {
        packs: discoverPacks().map(({ absPath, ...rest }) => rest),
        seasonalPhrases: seasonalPublic(),
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/section') {
      const id = url.searchParams.get('id');
      const section = url.searchParams.get('section');
      const pack = findPack(id);
      if (!pack) return send(res, 404, { error: 'pack not found' });
      const src = fs.readFileSync(pack.absPath, 'utf8');
      const parsed = parseExport(src);
      const sec = getSection(parsed, section);
      if (!sec) return send(res, 404, { error: 'section not found' });
      return send(res, 200, {
        id: pack.id,
        section: section || pack.sections[0],
        key: sec.key || section,
        hebrew: sec.hebrew || '',
        english: sec.english || '',
        seasonalPhrases: seasonalPublic(),
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/save') {
      const body = await readJson(req);
      const { id, section, hebrew, english } = body;
      const pack = findPack(id);
      if (!pack) return send(res, 404, { error: 'pack not found' });
      if (!section) return send(res, 400, { error: 'section required' });
      const src = fs.readFileSync(pack.absPath, 'utf8');
      const parsed = parseExport(src);
      setSection(parsed, section, hebrew, english);
      const out = serializeFile(parsed);
      // sanity re-parse
      parseExport(out);
      fs.writeFileSync(pack.absPath, out, 'utf8');
      return send(res, 200, { ok: true, bytes: out.length, path: pack.rel });
    }

    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: e.message || String(e) });
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST}:${PORT}`;
  console.log(`Siddur content editor → ${url}`);
  console.log(`Packs: ${path.relative(ROOT, SIDDUR)}`);
  const open =
    process.platform === 'win32'
      ? `cmd /c start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(open, () => {});
});
