/* Siddur content editor — client */
(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    packs: [],
    seasonal: [],
    packId: null,
    section: null,
    hebrew: '',
    english: '',
    savedHebrew: '',
    savedEnglish: '',
    dirty: false,
    view: 'raw', // 'raw' | 'accordion'
    openHeb: new Set([0]),
    openEng: new Set([0]),
    rebuilding: false,
  };

  const packList = $('packList');
  const filterPrayer = $('filterPrayer');
  const filterNusach = $('filterNusach');
  const sectionSelect = $('sectionSelect');
  const crumbPack = $('crumbPack');
  const hebrewEl = $('hebrew');
  const englishEl = $('english');
  const hebHighlight = $('hebHighlight');
  const engHighlight = $('engHighlight');
  const hebAccordion = $('hebAccordion');
  const engAccordion = $('engAccordion');
  const rawEditors = $('rawEditors');
  const accordionEditors = $('accordionEditors');
  const btnSave = $('btnSave');
  const btnReload = $('btnReload');
  const statusEl = $('status');
  const legendEl = $('seasonalLegend');
  const showSeasonal = $('showSeasonal');
  const showBreaks = $('showBreaks');
  const viewRaw = $('viewRaw');
  const viewAccordion = $('viewAccordion');

  function setStatus(msg, kind = '') {
    statusEl.textContent = msg || '';
    statusEl.className = 'status' + (kind ? ` ${kind}` : '');
  }

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Split on blank lines (accordion blocks). Keeps block text as-is. */
  function splitBlocks(text) {
    if (!text) return [];
    const parts = text.split(/\n\n+/);
    // drop only fully empty trailing/leading from split artifacts
    return parts.map((p) => p.replace(/^\n+|\n+$/g, '')).filter((p, i, arr) => p.length || (i > 0 && i < arr.length - 1));
  }

  function joinBlocks(blocks) {
    return blocks.join('\n\n');
  }

  function blockTitle(text, max = 48) {
    const one = text.replace(/\s+/g, ' ').trim();
    if (!one) return '(empty)';
    return one.length > max ? one.slice(0, max) + '…' : one;
  }

  function buildSeasonalRegexes() {
    return state.seasonal.map((p, i) => ({
      ...p,
      re: new RegExp(p.source, p.flags.includes('g') ? p.flags : p.flags + 'g'),
      color: i % 5,
    }));
  }

  function highlightText(text, isHebrew) {
    if (!text) return '';
    const showS = showSeasonal.checked && isHebrew;
    const showB = showBreaks.checked;

    const ranges = [];
    if (showS) {
      for (const p of buildSeasonalRegexes()) {
        p.re.lastIndex = 0;
        let m;
        while ((m = p.re.exec(text)) !== null) {
          ranges.push({ start: m.index, end: m.index + m[0].length, cls: `season season-c${p.color}`, id: p.id });
          if (m[0].length === 0) p.re.lastIndex++;
        }
      }
    }
    // Pack markers always visible in raw highlight
    {
      const re = /\{\{(?:\/)?(?:gate|fold):?[a-z_]*\}\}/gi;
      let m;
      while ((m = re.exec(text)) !== null) {
        ranges.push({ start: m.index, end: m.index + m[0].length, cls: 'marker', id: 'marker' });
      }
    }
    if (showB) {
      const re = /\n/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        ranges.push({ start: m.index, end: m.index + 1, cls: 'break', id: 'break' });
      }
    }

    ranges.sort((a, b) => a.start - b.start || b.end - a.end);

    const picked = [];
    let cursor = 0;
    for (const r of ranges) {
      if (r.start < cursor) continue;
      picked.push(r);
      cursor = r.end;
    }

    let out = '';
    let i = 0;
    for (const r of picked) {
      out += escapeHtml(text.slice(i, r.start));
      const chunk = escapeHtml(text.slice(r.start, r.end));
      if (r.cls === 'break') out += `<mark class="break">\n</mark>`;
      else if (r.cls === 'marker') out += `<mark class="marker">${chunk}</mark>`;
      else out += `<mark class="${r.cls}">${chunk}</mark>`;
      i = r.end;
    }
    out += escapeHtml(text.slice(i));
    if (!out.endsWith('\n')) out += '\n';
    return out;
  }

  function syncHighlight() {
    hebHighlight.innerHTML = highlightText(hebrewEl.value, true);
    engHighlight.innerHTML = highlightText(englishEl.value, false);
    hebHighlight.scrollTop = hebrewEl.scrollTop;
    hebHighlight.scrollLeft = hebrewEl.scrollLeft;
    engHighlight.scrollTop = englishEl.scrollTop;
    engHighlight.scrollLeft = englishEl.scrollLeft;
  }

  function lineStats(text) {
    if (!text) return '0 lines · 0 chars';
    const lines = text.split('\n').length;
    return `${lines} lines · ${text.length.toLocaleString()} chars`;
  }

  function updateDirty() {
    state.hebrew = hebrewEl.value;
    state.english = englishEl.value;
    state.dirty =
      state.hebrew !== state.savedHebrew || state.english !== state.savedEnglish;
    btnSave.disabled = !state.packId || !state.dirty;
    btnSave.classList.toggle('dirty', state.dirty);
    $('hebStats').textContent = lineStats(state.hebrew);
    $('engStats').textContent = lineStats(state.english);
    syncHighlight();
    if (state.view === 'accordion' && !state.rebuilding) {
      // light refresh of titles/stats without clobbering open editors mid-type
      $('hebBlockStats').textContent = `${splitBlocks(hebrewEl.value).length} blocks`;
      $('engBlockStats').textContent = `${splitBlocks(englishEl.value).length} blocks`;
    }
  }

  function setView(mode) {
    state.view = mode;
    viewRaw.classList.toggle('active', mode === 'raw');
    viewAccordion.classList.toggle('active', mode === 'accordion');
    rawEditors.classList.toggle('hidden', mode !== 'raw');
    accordionEditors.classList.toggle('hidden', mode !== 'accordion');
    if (mode === 'accordion') renderAccordions();
    else syncHighlight();
  }

  function renderAccordionList(container, text, openSet, lang) {
    const blocks = splitBlocks(text);
    container.innerHTML = '';
    if (!blocks.length) {
      container.innerHTML = `<div class="acc-empty">No blocks yet. Use “→ Accordion block” or insert blank lines between chunks.</div>`;
      return blocks;
    }

    blocks.forEach((block, idx) => {
      const details = document.createElement('details');
      details.className = 'acc-item';
      details.dir = lang === 'heb' ? 'rtl' : 'ltr';
      if (openSet.has(idx)) details.open = true;

      const summary = document.createElement('summary');
      summary.innerHTML =
        `<span class="acc-idx">${idx + 1}</span>` +
        `<span class="acc-title">${escapeHtml(blockTitle(block))}</span>` +
        `<span class="acc-meta">${block.split('\n').length} ln</span>`;

      const body = document.createElement('div');
      body.className = 'acc-body';
      const ta = document.createElement('textarea');
      ta.spellcheck = lang === 'eng';
      ta.dir = details.dir;
      ta.value = block;
      ta.addEventListener('input', () => {
        const all = [...container.querySelectorAll('.acc-body textarea')].map((el) => el.value);
        state.rebuilding = true;
        const joined = joinBlocks(all);
        if (lang === 'heb') hebrewEl.value = joined;
        else englishEl.value = joined;
        // update this item's title live
        summary.querySelector('.acc-title').textContent = blockTitle(ta.value);
        summary.querySelector('.acc-meta').textContent = `${ta.value.split('\n').length} ln`;
        updateDirty();
        renderLegend();
        state.rebuilding = false;
      });

      details.addEventListener('toggle', () => {
        if (details.open) openSet.add(idx);
        else openSet.delete(idx);
      });

      body.appendChild(ta);
      details.appendChild(summary);
      details.appendChild(body);
      container.appendChild(details);
    });
    return blocks;
  }

  function renderAccordions() {
    const hebBlocks = renderAccordionList(hebAccordion, hebrewEl.value, state.openHeb, 'heb');
    const engBlocks = renderAccordionList(engAccordion, englishEl.value, state.openEng, 'eng');
    $('hebBlockStats').textContent = `${hebBlocks.length} blocks`;
    $('engBlockStats').textContent = `${engBlocks.length} blocks`;
  }

  function expandAll(open) {
    document.querySelectorAll('#accordionEditors details.acc-item').forEach((d, i) => {
      d.open = open;
      // openSet updated via toggle events — also sync manually
    });
    if (open) {
      splitBlocks(hebrewEl.value).forEach((_, i) => state.openHeb.add(i));
      splitBlocks(englishEl.value).forEach((_, i) => state.openEng.add(i));
    } else {
      state.openHeb.clear();
      state.openEng.clear();
    }
  }

  function renderLegend() {
    if (!showSeasonal.checked || !state.seasonal.length) {
      legendEl.innerHTML = '';
      return;
    }
    const found = new Set();
    const text = hebrewEl.value;
    const regs = buildSeasonalRegexes();
    for (const p of regs) {
      p.re.lastIndex = 0;
      if (p.re.test(text)) found.add(p.id);
    }
    legendEl.innerHTML = regs
      .filter((p) => found.has(p.id))
      .map(
        (p) =>
          `<span class="chip"><span class="swatch season-c${p.color}"></span>${escapeHtml(p.label)}</span>`
      )
      .join('');
  }

  function renderPackList() {
    const prayer = filterPrayer.value;
    const nusach = filterNusach.value;
    const filtered = state.packs.filter((p) => {
      if (prayer && p.prayer !== prayer) return false;
      if (nusach && p.nusach !== nusach) return false;
      return true;
    });

    const groups = new Map();
    for (const p of filtered) {
      const key = `${p.prayer} · ${p.nusach}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }

    packList.innerHTML = '';
    for (const [label, items] of groups) {
      const g = document.createElement('div');
      g.className = 'pack-group';
      g.innerHTML = `<h3>${escapeHtml(label)}</h3>`;
      for (const p of items) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pack-item' + (p.id === state.packId ? ' active' : '');
        btn.innerHTML = `${escapeHtml(p.file.replace(/\.ts$/, ''))}<span class="file">${escapeHtml(p.sections.length + ' section' + (p.sections.length === 1 ? '' : 's'))}</span>`;
        btn.addEventListener('click', () => selectPack(p.id));
        g.appendChild(btn);
      }
      packList.appendChild(g);
    }
  }

  function fillPrayerFilter() {
    const prayers = [...new Set(state.packs.map((p) => p.prayer))].sort();
    filterPrayer.innerHTML =
      '<option value="">All prayers</option>' +
      prayers.map((p) => `<option value="${p}">${p}</option>`).join('');
  }

  async function selectPack(id) {
    if (state.dirty && !confirm('Discard unsaved changes?')) return;
    const pack = state.packs.find((p) => p.id === id);
    if (!pack) return;
    state.packId = id;
    crumbPack.textContent = pack.id;
    sectionSelect.disabled = false;
    sectionSelect.innerHTML = pack.sections
      .map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`)
      .join('');
    renderPackList();
    await loadSection(pack.sections[0]);
  }

  async function loadSection(section) {
    if (!state.packId) return;
    setStatus('Loading…');
    const q = new URLSearchParams({ id: state.packId, section });
    const res = await fetch('/api/section?' + q);
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || 'Load failed', 'err');
      return;
    }
    state.section = data.section;
    sectionSelect.value = data.section;
    hebrewEl.value = data.hebrew || '';
    englishEl.value = data.english || '';
    state.savedHebrew = hebrewEl.value;
    state.savedEnglish = englishEl.value;
    state.dirty = false;
    state.openHeb = new Set([0]);
    state.openEng = new Set([0]);
    updateDirty();
    renderLegend();
    if (state.view === 'accordion') renderAccordions();
    setStatus(`Loaded ${data.key || data.section}`);
  }

  async function save() {
    if (!state.packId || !state.section) return;
    setStatus('Saving…');
    btnSave.disabled = true;
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: state.packId,
          section: state.section,
          hebrew: hebrewEl.value,
          english: englishEl.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      state.savedHebrew = hebrewEl.value;
      state.savedEnglish = englishEl.value;
      state.dirty = false;
      updateDirty();
      setStatus(`Saved · ${data.path} · ${data.bytes.toLocaleString()} bytes`, 'ok');
    } catch (e) {
      setStatus(e.message, 'err');
      updateDirty();
    }
  }

  function activeTextarea() {
    const a = document.activeElement;
    if (a && a.tagName === 'TEXTAREA') return a;
    return hebrewEl;
  }

  function toolJoin(ta) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      const before = ta.value.slice(0, start);
      const after = ta.value.slice(start);
      const lineStart = before.lastIndexOf('\n') + 1;
      const nextBreak = after.indexOf('\n');
      if (nextBreak < 0) return;
      const line = ta.value.slice(lineStart, start + nextBreak);
      const joined = line.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      ta.value =
        ta.value.slice(0, lineStart) + joined + ta.value.slice(start + nextBreak);
      const caret = lineStart + joined.length;
      ta.setSelectionRange(caret, caret);
      return;
    }
    const sel = ta.value.slice(start, end).replace(/\n+/g, ' ').replace(/[ \t]+/g, ' ');
    ta.value = ta.value.slice(0, start) + sel + ta.value.slice(end);
    ta.setSelectionRange(start, start + sel.length);
  }

  function toolSplit(ta) {
    const i = ta.selectionStart;
    ta.value = ta.value.slice(0, i) + '\n' + ta.value.slice(ta.selectionEnd);
    ta.setSelectionRange(i + 1, i + 1);
  }

  function toolCollapseWs(ta) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const whole = start === end;
    const from = whole ? 0 : start;
    const to = whole ? ta.value.length : end;
    const chunk = ta.value.slice(from, to).replace(/\n{3,}/g, '\n\n');
    ta.value = ta.value.slice(0, from) + chunk + ta.value.slice(to);
    if (!whole) ta.setSelectionRange(from, from + chunk.length);
  }

  function toolTrimLines(ta) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const whole = start === end;
    const from = whole ? 0 : start;
    const to = whole ? ta.value.length : end;
    const chunk = ta.value
      .slice(from, to)
      .split('\n')
      .map((l) => l.replace(/[ \t]+$/g, ''))
      .join('\n');
    ta.value = ta.value.slice(0, from) + chunk + ta.value.slice(to);
  }

  function toolFlatten(ta) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const whole = start === end;
    const from = whole ? 0 : start;
    const to = whole ? ta.value.length : end;
    const chunk = ta.value
      .slice(from, to)
      .replace(/\n+/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim();
    ta.value = ta.value.slice(0, from) + chunk + ta.value.slice(to);
    ta.setSelectionRange(from, from + chunk.length);
  }

  /** Wrap selection (or current line) so it becomes its own blank-line-separated block. */
  function toolAccordionBlock(ta) {
    let start = ta.selectionStart;
    let end = ta.selectionEnd;
    if (start === end) {
      const before = ta.value.slice(0, start);
      const after = ta.value.slice(start);
      start = before.lastIndexOf('\n') + 1;
      const nb = after.indexOf('\n');
      end = nb < 0 ? ta.value.length : start + nb;
    }
    // expand to full lines
    while (start > 0 && ta.value[start - 1] !== '\n') start--;
    while (end < ta.value.length && ta.value[end] !== '\n') end++;
    if (ta.value[end] === '\n') end++;

    let chunk = ta.value.slice(start, end).replace(/^\n+|\n+$/g, '');
    const before = ta.value.slice(0, start).replace(/\n+$/, '');
    const after = ta.value.slice(end).replace(/^\n+/, '');
    const parts = [];
    if (before) parts.push(before);
    parts.push(chunk);
    if (after) parts.push(after);
    ta.value = parts.join('\n\n');
    // select the new block
    const blockStart = before ? before.length + 2 : 0;
    ta.setSelectionRange(blockStart, blockStart + chunk.length);
    state.openHeb = new Set();
    state.openEng = new Set();
    // open the block we just made — approximate index
    const blocks = splitBlocks(ta.value);
    const idx = blocks.findIndex((b) => b === chunk);
    if (idx >= 0) {
      if (ta === hebrewEl || ta.closest?.('#hebAccordion')) state.openHeb.add(idx);
      else state.openEng.add(idx);
      state.openHeb.add(Math.max(0, idx));
    }
  }

  function toolAccordionBreak(ta) {
    const i = ta.selectionStart;
    const left = ta.value.slice(0, i).replace(/\n+$/, '');
    const right = ta.value.slice(ta.selectionEnd).replace(/^\n+/, '');
    ta.value = (left ? left + '\n\n' : '') + right;
    const caret = left ? left.length + 2 : 0;
    ta.setSelectionRange(caret, caret);
  }

  function toolMarkerWrap(ta, kind) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) {
      setStatus('Select text to wrap with a marker', 'warn');
      return;
    }
    const defaults = kind === 'gate' ? 'aseret' : 'birchot_expansion';
    const id = prompt(
      kind === 'gate'
        ? 'Gate id (aseret|tachanun|fast_or_aseret|rosh_chodesh|ledavid|monday_thursday|yaaleh|al_hanissim|omer|motzaei_shabbat):'
        : 'Fold id (e.g. birchot_expansion):',
      defaults
    );
    if (!id || !/^[a-z_]+$/.test(id)) {
      setStatus('Cancelled or invalid id', 'warn');
      return;
    }
    const inner = ta.value.slice(start, end);
    const open = `{{${kind}:${id}}}`;
    const close = `{{/${kind}}}`;
    const wrapped = `${open}${inner}${close}`;
    ta.value = ta.value.slice(0, start) + wrapped + ta.value.slice(end);
    ta.setSelectionRange(start, start + wrapped.length);
  }

  const tools = {
    join: toolJoin,
    split: toolSplit,
    'collapse-ws': toolCollapseWs,
    'trim-lines': toolTrimLines,
    'delete-breaks': toolFlatten,
    'accordion-block': toolAccordionBlock,
    'accordion-break': toolAccordionBreak,
    'gate-wrap': (ta) => toolMarkerWrap(ta, 'gate'),
    'fold-wrap': (ta) => toolMarkerWrap(ta, 'fold'),
  };

  function afterTool(ta) {
    // If we edited inside an accordion cell, sync parent raw first
    if (ta !== hebrewEl && ta !== englishEl) {
      const inHeb = ta.closest('#hebAccordion');
      const inEng = ta.closest('#engAccordion');
      if (inHeb) {
        const all = [...hebAccordion.querySelectorAll('.acc-body textarea')].map((el) => el.value);
        hebrewEl.value = joinBlocks(all);
      } else if (inEng) {
        const all = [...engAccordion.querySelectorAll('.acc-body textarea')].map((el) => el.value);
        englishEl.value = joinBlocks(all);
      }
    }
    updateDirty();
    renderLegend();
    if (state.view === 'accordion') renderAccordions();
  }

  function wireTools() {
    document.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ta = activeTextarea();
        const fn = tools[btn.dataset.tool];
        if (!fn) return;
        fn(ta);
        ta.focus();
        afterTool(ta);
        setStatus(`Applied: ${btn.textContent.trim()}`, 'warn');
      });
    });
  }

  function syncScroll(ta, pre) {
    ta.addEventListener('scroll', () => {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    });
  }

  async function init() {
    setStatus('Discovering packs…');
    const res = await fetch('/api/packs');
    const data = await res.json();
    state.packs = data.packs || [];
    state.seasonal = data.seasonalPhrases || [];
    fillPrayerFilter();
    renderPackList();
    setStatus(`${state.packs.length} packs`);

    filterPrayer.addEventListener('change', renderPackList);
    filterNusach.addEventListener('change', renderPackList);
    sectionSelect.addEventListener('change', async () => {
      if (state.dirty && !confirm('Discard unsaved changes?')) {
        sectionSelect.value = state.section;
        return;
      }
      await loadSection(sectionSelect.value);
    });
    hebrewEl.addEventListener('input', () => {
      updateDirty();
      renderLegend();
    });
    englishEl.addEventListener('input', updateDirty);
    showSeasonal.addEventListener('change', () => {
      syncHighlight();
      renderLegend();
    });
    showBreaks.addEventListener('change', syncHighlight);
    btnSave.addEventListener('click', save);
    btnReload.addEventListener('click', async () => {
      if (state.dirty && !confirm('Discard unsaved changes?')) return;
      if (state.section) await loadSection(state.section);
    });
    viewRaw.addEventListener('click', () => setView('raw'));
    viewAccordion.addEventListener('click', () => setView('accordion'));
    $('btnExpandAll').addEventListener('click', () => expandAll(true));
    $('btnCollapseAll').addEventListener('click', () => expandAll(false));
    syncScroll(hebrewEl, hebHighlight);
    syncScroll(englishEl, engHighlight);
    wireTools();

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!btnSave.disabled) save();
      }
    });
    window.addEventListener('beforeunload', (e) => {
      if (state.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    const prefer =
      state.packs.find((p) => p.id === 'shacharit/ashkenaz/raw') || state.packs[0];
    if (prefer) await selectPack(prefer.id);
  }

  init().catch((e) => setStatus(e.message, 'err'));
})();
