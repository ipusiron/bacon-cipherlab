// 画面の処理（DOM の組み立てとイベント）だけを書く。計算は js/bacon-core.js（BaconCore）
// 動的な要素はすべて textContent と要素の組み立てで作る（HTML の文字列を DOM に入れない）
(() => {
  'use strict';

  const C = globalThis.BaconCore;
  const I = globalThis.BaconI18n;
  const Theme = globalThis.BaconTheme;
  const t = (key, vars) => globalThis.BaconMessages.t(key, vars);
  const $ = (id) => document.getElementById(id);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // ===== 知らせ（各パネルの aria-live の欄） =====
  // items は { key, vars, level }。コピーの結果は extra として後ろに足し、次の描き直しで消える
  const statusState = {};
  function paint(id) {
    const s = statusState[id];
    const list = s.extra ? [...s.items, s.extra] : s.items;
    $(id).replaceChildren(...list.map((x) => el('p', `msg ${x.level || 'info'}`, t(x.key, x.vars))));
  }
  function show(id, items) {
    statusState[id] = { items, extra: null };
    paint(id);
  }
  function note(id, item) {
    if (!statusState[id]) statusState[id] = { items: [] };
    statusState[id].extra = item;
    paint(id);
  }

  // 見えない文字・制御文字は U+XXXX で示す
  const visible = (ch) => (/^[\p{C}\p{Z}]$/u.test(ch) ? `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}` : ch);

  // 使わない符号の範囲（並べ替えてから最初と最後）
  function range(codes) {
    const s = [...codes].sort();
    return t('ui.range', { from: s[0], to: s[s.length - 1] });
  }

  // ===== コピー・ダウンロード =====
  function copy(text, statusId, okItem = { key: 'copy.ok', level: 'ok' }) {
    if (!text) {
      note(statusId, { key: 'copy.empty', level: 'warn' });
      return;
    }
    const fail = () => note(statusId, { key: 'copy.fail', level: 'warn' });
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
        fail();
        return;
      }
      navigator.clipboard.writeText(text).then(() => note(statusId, okItem), fail);
    } catch {
      fail();
    }
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = el('a');
    a.href = url;
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const tooLong = (...values) => values.some((v) => v.length > C.MAX_INPUT);

  // ===== タブ（WAI-ARIA のタブ。矢印キー・Home・End で移る） =====
  const TABS = ['encode', 'decode', 'embed', 'extract', 'solve', 'biform', 'table'];
  const RICH = ['bold', 'italic', 'font'];
  function selectTab(name, focus = false) {
    for (const k of TABS) {
      const on = k === name;
      const tab = $(`tab-${k}`);
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      $(`panel-${k}`).hidden = !on;
      if (on && focus) tab.focus();
    }
  }
  for (const k of TABS) $(`tab-${k}`).addEventListener('click', () => selectTab(k));
  $('tab-encode').parentElement.addEventListener('keydown', (e) => {
    const i = TABS.findIndex((k) => $(`tab-${k}`).getAttribute('aria-selected') === 'true');
    const next = { ArrowRight: (i + 1) % TABS.length, ArrowLeft: (i - 1 + TABS.length) % TABS.length, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    selectTab(TABS[next], true);
  });

  // ===== 暗号化 =====
  function renderEncode() {
    const text = $('enc-plain').value;
    const variant = $('enc-variant').value;
    const format = $('enc-format').value;
    if (tooLong(text)) {
      $('enc-out').value = '';
      $('enc-pairs').replaceChildren();
      $('btn-enc-copy').disabled = $('btn-enc-download').disabled = true;
      show('enc-status', [{ key: 'input.tooLong', vars: { max: C.MAX_INPUT }, level: 'warn' }]);
      return;
    }
    const r = C.encode(text, variant);
    $('enc-out').value = C.formatBits(r.bits, format, $('enc-group').value);
    $('enc-pairs').replaceChildren(...r.pairs.map((p) => el('li', null, `${p.label} → ${C.formatBits(p.code, format)}`)));
    $('btn-enc-copy').disabled = $('btn-enc-download').disabled = !r.bits;
    const items = [r.bits
      ? { key: 'encode.stat', vars: { letters: r.letters.length, bits: r.bits.length, variant: t(`variant.${variant}`) }, level: 'ok' }
      : { key: 'encode.empty' }];
    if (r.dropped) items.push({ key: 'encode.dropped', vars: { n: r.dropped }, level: 'warn' });
    if (r.merged) items.push({ key: 'encode.merged', vars: { n: r.merged } });
    show('enc-status', items);
  }

  // ===== 復号 =====
  function renderDecode() {
    const input = $('dec-in').value;
    const variant = $('dec-variant').value;
    const keep = $('dec-keep').checked;
    $('dec-skip').disabled = keep;
    const clear = (item) => {
      $('dec-out').value = $('dec-annot').value = '';
      $('dec-steps').replaceChildren();
      $('btn-dec-copy').disabled = $('btn-dec-download').disabled = true;
      show('dec-status', [item]);
    };
    if (tooLong(input)) return clear({ key: 'input.tooLong', vars: { max: C.MAX_INPUT }, level: 'warn' });
    const r = C.readCipher(input, variant, { strict: !$('dec-skip').checked, offset: $('dec-offset').value, invert: $('dec-invert').checked, keep });
    if (!r.ok) return clear({ key: 'decode.stopped', vars: { ch: visible(r.first.ch), pos: r.first.index }, level: 'warn' });
    $('dec-out').value = r.text;
    $('dec-annot').value = r.annotated;
    $('dec-steps').replaceChildren(...r.steps.map((s) => el('li', null, `${C.formatBits(s.code, 'ab')} → ${s.label || '?'}`)));
    $('btn-dec-copy').disabled = $('btn-dec-download').disabled = !r.text;
    const items = [r.bits
      ? { key: 'decode.stat', vars: { bits: r.bits, letters: r.letters, variant: t(`variant.${variant}`) }, level: 'ok' }
      : { key: 'decode.empty' }];
    if (r.offset) items.push({ key: 'decode.shifted', vars: { n: r.offset } });
    if ($('dec-invert').checked) items.push({ key: 'decode.inverted' });
    if (r.kept) items.push({ key: 'decode.kept', vars: { n: r.kept } });
    if (r.invalid) items.push({ key: 'decode.skipped', vars: { n: r.invalid, ch: visible(r.first.ch), pos: r.first.index }, level: 'warn' });
    if (r.remainder) items.push({ key: 'decode.remainder', vars: { n: r.remainder }, level: 'warn' });
    if (r.unknown) {
      items.push({ key: 'decode.unknown', vars: { n: r.unknown, variant: t(`variant.${variant}`), codes: range(C.unusedCodes(variant)) }, level: 'warn' });
    }
    if (r.resolved !== r.text) items.push({ key: 'decode.resolved', vars: { text: r.resolved } });
    show('dec-status', items);
  }

  // ===== 解析（読み方の総当たり） =====
  const shorten = (s, n = 120) => ([...s].length > n ? `${[...s].slice(0, n).join('')}…` : s);
  const readingName = (x) => t(`reading.${x.reading || x.id}`, { a: x.a ? visible(x.a) : '', b: x.b ? visible(x.b) : '' });
  const confidence = (score) => (score >= 1 ? 'high' : score >= 0.5 ? 'mid' : 'low');

  // 候補の暗号文を復号タブに入れる。ずれの分は先頭に分けて書き、メッセージの後ろの余り（aaaaa の組）は入れない
  function openInDecode(c) {
    const used = c.bits.slice(0, c.offset + 5 * [...c.text].length);
    const head = used.slice(0, c.offset);
    $('dec-in').value = (head ? `${C.formatBits(head, 'ab')} ` : '') + C.formatBits(used.slice(c.offset), 'ab', '5');
    $('dec-variant').value = c.variant;
    $('dec-offset').value = String(c.offset);
    $('dec-invert').checked = c.invert;
    $('dec-keep').checked = false;
    $('dec-skip').checked = true;
    selectTab('decode', true);
    renderDecode();
    note('dec-status', { key: 'solve.opened' });
  }

  function candidateItem(c) {
    const li = el('li', 'result');
    const conf = confidence(c.score);
    const head = el('p', 'result-head');
    head.append(el('span', `conf conf-${conf}`, t(`solve.conf.${conf}`)), el('span', 'mono result-text', shorten(c.text)));
    li.append(head);
    li.append(el('p', 'result-meta', t('solve.meta', {
      reading: readingName(c), variant: t(`variant.${c.variant}`), invert: t(c.invert ? 'invert.on' : 'invert.off'), offset: c.offset
    })));
    li.append(el('p', 'result-meta', t('solve.evidence', {
      score: c.score.toFixed(2), english: c.english.toFixed(2), covered: c.covered, letters: c.letters, unknown: c.unknown
    })));
    if (c.words.length) li.append(el('p', 'result-meta', t('solve.words', { words: [...new Set(c.words)].join(t('ui.listSep')) })));
    if (c.resolved !== c.text) li.append(el('p', 'result-meta', t('solve.resolved', { text: shorten(c.resolved) })));
    const btn = el('button', 'btn ghost', t('solve.open'));
    btn.type = 'button';
    btn.addEventListener('click', () => openInDecode(c));
    li.append(btn);
    return li;
  }

  // ===== 見えない文字（ほかのツールのゼロ幅方式）と WeirdString Inspector へのリンク =====
  // リンクにできないとき（長すぎる・孤立サロゲート）は href を外して無効にし、理由を title と戻り値で返す
  function setWsiLink(a, text) {
    const r = C.wsiLink(text);
    if (r.ok) {
      a.href = r.url;
      a.removeAttribute('aria-disabled');
      a.removeAttribute('title');
    } else {
      a.removeAttribute('href');
      a.setAttribute('aria-disabled', 'true');
      a.title = t(r.error ? 'zw.badText' : 'zw.tooLong');
    }
    return r;
  }

  function renderZw() {
    const raw = $('solve-in').value;
    const link = setWsiLink($('zw-wsi'), raw);
    if (!raw) {
      $('zw-counts').replaceChildren();
      $('zw-schemes').replaceChildren();
      show('zw-status', [{ key: 'zw.empty' }]);
      return;
    }
    const r = C.zwSchemes(raw);
    const lines = r.list.map((x) => el('li', null, x.name ? t('zw.count', { name: x.name, cp: x.cp, n: x.n }) : t('zw.unnamed', { cp: x.cp, n: x.n })));
    if (r.tags) lines.push(el('li', null, t('zw.tags', { n: r.tags })));
    $('zw-counts').replaceChildren(...lines);
    $('zw-schemes').replaceChildren(...r.schemes.map((x) => {
      const li = el('li', 'result');
      const head = el('p', 'result-head');
      const match = el('span', `conf conf-${x.likely ? 'high' : 'mid'}`, t(x.likely ? 'match.likely' : 'match.possible'));
      head.append(match, el('span', 'result-label', t(`scheme.${x.id}`)));
      li.append(head);
      let read;
      if (x.decoded === null) read = t('zw.noDecode');
      else if (x.id === 'bacon') read = t('zw.decodedBacon', { variant: t(`variant.${x.variant}`), text: shorten(x.decoded) });
      else read = t('zw.decoded', { text: shorten(x.decoded) });
      li.append(el('p', 'result-meta mono', read));
      return li;
    }));
    const items = [r.total ? { key: 'zw.total', vars: { n: r.total }, level: 'ok' } : { key: 'zw.none' }];
    if (r.total && !r.schemes.length) items.push({ key: 'zw.schemesNone' });
    if (r.emojiZwj) items.push({ key: 'zw.emojiZwj', vars: { n: r.emojiZwj } });
    if (!link.ok) items.push({ key: link.error ? 'zw.badText' : 'zw.tooLong', level: 'warn' });
    show('zw-status', items);
  }

  function renderSolve() {
    renderZw();
    const raw = $('solve-in').value;
    const list = $('solve-results');
    const stats = $('solve-stats');
    const off = (item) => {
      list.replaceChildren();
      stats.replaceChildren();
      show('solve-status', [item]);
    };
    if (tooLong(raw)) return off({ key: 'input.tooLong', vars: { max: C.MAX_INPUT }, level: 'warn' });
    if (!raw.trim()) return off({ key: 'solve.empty' });
    const r = C.solve(raw, { limit: 5 });
    stats.replaceChildren(...r.readings.map((x) => el('li', null, t('solve.statLine', {
      reading: readingName(x), carriers: x.carriers, share: Math.round(x.share * 100)
    }))));
    if (!r.candidates.length) {
      list.replaceChildren();
      show('solve-status', [{ key: 'solve.none', level: 'warn' }]);
      return;
    }
    list.replaceChildren(...r.candidates.map(candidateItem));
    show('solve-status', [{ key: 'solve.stat', vars: { readings: r.readings.length, tried: r.tried, shown: r.candidates.length }, level: 'ok' }]);
  }

  // ===== 埋め込み =====
  let lastEmbed = null;

  function embedBits() {
    const msg = $('embed-msg').value;
    if ($('embed-kind').value === 'bits') {
      const p = C.parseCipher(msg);
      return { bits: p.bits, items: p.invalid ? [{ key: 'embed.badBits', vars: { n: p.invalid }, level: 'warn' }] : [] };
    }
    const r = C.encode(msg, $('embed-variant').value);
    const items = [];
    if (r.dropped) items.push({ key: 'encode.dropped', vars: { n: r.dropped }, level: 'warn' });
    if (r.merged) items.push({ key: 'encode.merged', vars: { n: r.merged } });
    return { bits: r.bits, items };
  }

  function renderPreview(r) {
    const box = $('embed-preview');
    box.className = r.method === 'font' ? 'preview form-a' : 'preview';
    if (RICH.includes(r.method)) {
      const cls = { bold: 'mark-bold', italic: 'mark-italic', font: 'form-b' }[r.method];
      box.replaceChildren(...r.parts.map((p) => (p.mark ? el('span', cls, p.text) : document.createTextNode(p.text))));
      return;
    }
    if (r.method === 'zw' && $('embed-reveal').checked) {
      const nodes = [];
      let buf = '';
      for (const ch of r.text) {
        if (ch !== C.ZW_A && ch !== C.ZW_B) {
          buf += ch;
          continue;
        }
        if (buf) nodes.push(document.createTextNode(buf));
        buf = '';
        nodes.push(el('span', ch === C.ZW_A ? 'zw-mark zw-a' : 'zw-mark zw-b', ch === C.ZW_A ? 'a' : 'b'));
      }
      if (buf) nodes.push(document.createTextNode(buf));
      box.replaceChildren(...nodes);
      return;
    }
    box.replaceChildren(document.createTextNode(r.text));
  }

  function renderEmbed() {
    const method = $('embed-method').value;
    const cover = $('embed-cover').value;
    const rich = RICH.includes(method);
    $('embed-fill').parentElement.hidden = method !== 'case';
    $('embed-reveal').parentElement.hidden = method !== 'zw';
    $('embed-variant').disabled = $('embed-kind').value === 'bits';
    $('embed-hint').textContent = t(`embed.hint.${method}`);
    const off = (item, extra = []) => {
      lastEmbed = null;
      $('embed-preview').replaceChildren();
      for (const id of ['btn-embed-copy-text', 'btn-embed-copy-html', 'btn-embed-download', 'btn-embed-to-extract']) $(id).disabled = true;
      show('embed-status', [item, ...extra]);
    };
    if (tooLong(cover, $('embed-msg').value)) {
      renderRoutes('');
      return off({ key: 'input.tooLong', vars: { max: C.MAX_INPUT }, level: 'warn' });
    }
    const m = embedBits();
    renderRoutes(m.bits);
    const r = C.embed(cover, m.bits, method, { fillRest: $('embed-fill').checked });
    if (!r.ok) return off({ key: r.error === 'short' ? 'embed.short' : 'embed.noBits', vars: { need: r.need, supply: r.supply }, level: 'warn' }, m.items);
    lastEmbed = { ...r, variant: $('embed-variant').value };
    renderPreview(r);
    $('btn-embed-copy-text').disabled = rich;
    for (const id of ['btn-embed-copy-html', 'btn-embed-download', 'btn-embed-to-extract']) $(id).disabled = false;
    const items = [{ key: 'embed.stat', vars: { need: r.need, supply: r.supply }, level: 'ok' }, ...m.items];
    if (rich) items.push({ key: 'embed.textLost' });
    show('embed-status', items);
  }

  // ===== 抽出 =====
  function renderExtract() {
    const raw = $('extract-in').value;
    const method = $('extract-method').value;
    setWsiLink($('extract-wsi'), raw);
    const variant = $('extract-variant').value;
    if (tooLong(raw)) {
      $('extract-msg').value = $('extract-bits').value = '';
      $('btn-extract-copy').disabled = true;
      show('extract-status', [{ key: 'input.tooLong', vars: { max: C.MAX_INPUT }, level: 'warn' }]);
      return;
    }
    let x;
    let marked = true;
    if (method === 'case') x = C.extractCase(raw);
    else if (method === 'zw') x = C.extractZw(raw);
    else {
      const runs = C.runsFromHtml(raw);
      x = C.extractRuns(runs, method);
      marked = runs.some((r) => (method === 'bold' ? r.bold : method === 'italic' ? r.italic : r.serif === true));
    }
    const m = C.readMessage(x.bits, variant, { trim: $('extract-trim').checked });
    $('extract-bits').value = C.formatBits(x.bits, 'ab', '5');
    $('extract-msg').value = m.text;
    $('btn-extract-copy').disabled = !m.text;
    const items = [];
    if (!raw) items.push({ key: 'extract.empty' });
    else if (!x.carriers) items.push({ key: 'extract.noCarrier', level: 'warn' });
    else items.push({ key: 'extract.stat', vars: { carriers: x.carriers, bits: x.bits.length }, level: 'ok' });
    if (raw && x.carriers && !marked) items.push({ key: 'extract.noMark', level: 'warn' });
    if (m.trimmed) items.push({ key: 'extract.trimmed', vars: { n: m.trimmed } });
    if (m.remainder) items.push({ key: 'decode.remainder', vars: { n: m.remainder }, level: 'warn' });
    if (m.unknown) {
      items.push({ key: 'decode.unknown', vars: { n: m.unknown, variant: t(`variant.${variant}`), codes: range(C.unusedCodes(variant)) }, level: 'warn' });
    }
    if (x.other) items.push({ key: 'extract.other', vars: { n: x.other }, level: 'warn' });
    show('extract-status', items);
  }

  // ===== 経路を通したときに残るか（生存性） =====
  function renderRoutes(bits) {
    const table = $('route-table');
    $('route-examples').replaceChildren(...C.ROUTES.map((id) => el('li', null, t(`route.ex.${id}`))));
    if (!bits) {
      table.replaceChildren();
      $('route-status').textContent = t('route.empty');
      return;
    }
    const r = C.survival($('embed-cover').value, bits, $('embed-variant').value, { fillRest: $('embed-fill').checked });
    const th = (text, scope) => {
      const e = el('th', null, text);
      e.scope = scope;
      return e;
    };
    const headRow = el('tr');
    headRow.append(th(t('route.colRoute'), 'col'), ...r.methods.map((m) => th(t(`methodShort.${m.method}`), 'col')));
    const look = el('tr');
    look.append(th(t('route.look'), 'row'), ...r.methods.map((m) => el('td', 'route-look', t(`look.${m.method}`))));
    const rows = C.ROUTES.map((id, i) => {
      const tr = el('tr');
      tr.append(th(t(`route.${id}`), 'row'), ...r.methods.map((m) => {
        if (!m.ok) return el('td', 'route-look', '—');
        const c = m.cells[i];
        if (c.survived) return el('td', 'route-yes', `✓ ${t('route.yes')}`);
        return el('td', 'route-no', `✗ ${t('route.no')}${c.read ? t('route.read', { text: shorten(c.read, 16) }) : t('route.readEmpty')}`);
      }));
      return tr;
    });
    const thead = el('thead');
    thead.append(headRow);
    const tbody = el('tbody');
    tbody.append(look, ...rows);
    table.replaceChildren(thead, tbody);
    const notes = [t('route.status', { want: shorten(r.want, 30) })];
    for (const m of r.methods.filter((x) => !x.ok)) {
      notes.push(t('route.short', { method: t(`methodShort.${m.method}`), need: m.need, supply: m.supply }));
    }
    $('route-status').textContent = notes.join(' ');
  }

  // ===== 二書体の練習 =====
  let labIndex = 0;
  let labMarks = [];
  let labChecked = false;

  function updateLab() {
    const p = C.labProblem(labIndex);
    const bits = labMarks.map((b) => (b ? '1' : '0')).join('');
    $('lab-bits').value = C.formatBits(bits, 'ab', '5');
    const read = C.readMessage(bits, '24').text;
    const items = [read ? { key: 'lab.read', vars: { text: read } } : { key: 'lab.readEmpty' }];
    if (labChecked) {
      const right = p.tokens.filter((tk) => !tk.space && labMarks[tk.index] === tk.b).length;
      items.unshift(right === p.letters
        ? { key: 'lab.perfect', vars: { answer: p.answer }, level: 'ok' }
        : { key: 'lab.result', vars: { total: p.letters, right, answer: p.answer }, level: 'warn' });
    }
    if (p.index === 0) items.push({ key: 'lab.tombNote' });
    show('lab-status', items);
  }

  function renderLab() {
    const p = C.labProblem(labIndex);
    if (labMarks.length !== p.letters) labMarks = new Array(p.letters).fill(false);
    $('lab-title').textContent = p.index === 0 ? t('lab.tomb', { letters: p.letters }) : t('lab.problem', { n: p.index, letters: p.letters });
    $('lab-letters').replaceChildren(...p.tokens.map((tk) => {
      if (tk.space) return el('span', 'lab-gap', ' ');
      const btn = el('button', `lab-letter ${tk.b ? 'form-b' : 'form-a'}`, tk.ch);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(labMarks[tk.index]));
      btn.setAttribute('aria-label', t('lab.letterLabel', { n: tk.index + 1, ch: tk.ch }));
      if (labChecked && labMarks[tk.index] !== tk.b) btn.classList.add('lab-wrong');
      btn.addEventListener('click', () => {
        labMarks[tk.index] = !labMarks[tk.index];
        btn.setAttribute('aria-pressed', String(labMarks[tk.index]));
        btn.classList.remove('lab-wrong');
        labChecked = false;
        updateLab();
      });
      return btn;
    }));
    updateLab();
  }

  // ===== 対応表 =====
  function renderTable() {
    const variant = $('table-variant').value;
    const format = $('table-format').value;
    const inv = $('table-invert').checked;
    const symbols = format === 'biform' ? 'ab' : format;
    const cells = C.table(variant).map((row) => {
      const shown = C.formatBits(inv ? C.invertBits(row.code) : row.code, symbols);
      const btn = el('button', 'cell');
      btn.type = 'button';
      btn.append(el('span', 'cell-letter', row.label));
      const code = el('span', 'cell-code mono');
      if (format === 'biform') for (const c of shown) code.append(el(c === 'b' ? 'b' : 'i', null, c));
      else code.textContent = shown;
      btn.append(code);
      btn.setAttribute('aria-label', t('table.cellLabel', { label: row.label, code: shown }));
      btn.addEventListener('click', () => copy(shown, 'table-status', { key: 'table.copied', vars: { label: row.label, code: shown }, level: 'ok' }));
      return btn;
    });
    $('table-grid').replaceChildren(...cells);
    const unused = C.unusedCodes(variant).map((c) => C.formatBits(inv ? C.invertBits(c) : c, symbols));
    $('table-unused').textContent = t('table.unused', { variant: t(`variant.${variant}`), codes: range(unused) });
    if (!statusState['table-status']) show('table-status', []);
  }

  const renderAll = () => {
    renderEncode();
    renderDecode();
    renderEmbed();
    renderExtract();
    renderSolve();
    renderLab();
    renderTable();
  };

  // ===== イベント =====
  const on = (ids, type, fn) => ids.forEach((id) => $(id).addEventListener(type, fn));
  on(['enc-plain'], 'input', renderEncode);
  on(['enc-variant', 'enc-format', 'enc-group'], 'change', renderEncode);
  on(['dec-in'], 'input', renderDecode);
  on(['dec-variant', 'dec-skip', 'dec-keep', 'dec-invert', 'dec-offset'], 'change', renderDecode);
  on(['solve-in'], 'input', renderSolve);
  on(['embed-cover', 'embed-msg'], 'input', renderEmbed);
  on(['embed-kind', 'embed-variant', 'embed-method', 'embed-fill', 'embed-reveal'], 'change', renderEmbed);
  on(['extract-in'], 'input', renderExtract);
  on(['extract-method', 'extract-variant', 'extract-trim'], 'change', renderExtract);
  on(['table-variant', 'table-format', 'table-invert'], 'change', renderTable);

  $('btn-enc-copy').addEventListener('click', () => copy($('enc-out').value, 'enc-status'));
  $('btn-enc-download').addEventListener('click', () => download('bacon-encrypt.txt', $('enc-out').value, 'text/plain;charset=utf-8'));
  $('btn-dec-copy').addEventListener('click', () => copy($('dec-out').value, 'dec-status'));
  $('btn-dec-download').addEventListener('click', () => download('bacon-decrypt.txt', $('dec-out').value, 'text/plain;charset=utf-8'));
  $('btn-embed-copy-text').addEventListener('click', () => lastEmbed && copy(lastEmbed.text, 'embed-status'));
  $('btn-embed-copy-html').addEventListener('click', () => lastEmbed && copy(lastEmbed.html, 'embed-status'));
  $('btn-embed-download').addEventListener('click', () => {
    if (lastEmbed) download('bacon-embed.html', C.htmlDocument(lastEmbed.html, { lang: I.lang }), 'text/html;charset=utf-8');
  });
  $('btn-embed-to-extract').addEventListener('click', () => {
    if (!lastEmbed) return;
    const rich = RICH.includes(lastEmbed.method);
    $('extract-in').value = rich ? lastEmbed.html : lastEmbed.text;
    $('extract-method').value = lastEmbed.method;
    if ($('embed-kind').value === 'text') $('extract-variant').value = lastEmbed.variant;
    selectTab('extract', true);
    renderExtract();
    note('extract-status', { key: 'embed.moved' });
  });
  $('btn-extract-copy').addEventListener('click', () => copy($('extract-msg').value, 'extract-status'));
  $('btn-zw-sample').addEventListener('click', () => {
    $('solve-in').value = C.makeZwSample($('zw-sample').value);
    renderSolve();
  });
  $('btn-solve-sample').addEventListener('click', () => {
    $('solve-in').value = C.makeSample($('solve-sample').value);
    renderSolve();
  });

  $('btn-lab-check').addEventListener('click', () => {
    labChecked = true;
    renderLab();
  });
  $('btn-lab-reset').addEventListener('click', () => {
    labMarks = [];
    labChecked = false;
    renderLab();
  });
  $('btn-lab-next').addEventListener('click', () => {
    labIndex = (labIndex + 1) % C.LAB_COUNT;
    labMarks = [];
    labChecked = false;
    renderLab();
  });

  $('btn-lang').addEventListener('click', () => {
    I.set(I.lang === 'ja' ? 'en' : 'ja');
    I.applyStaticText();
    Theme.refresh($('btn-theme'));
    renderAll();
  });
  $('btn-theme').addEventListener('click', () => Theme.toggle($('btn-theme')));

  // ===== 初期表示 =====
  I.init();
  I.applyStaticText();
  Theme.refresh($('btn-theme'));
  $('enc-plain').value = 'Fuge';
  $('dec-in').value = 'aabab baabb aabba aabaa';
  $('embed-cover').value = t('sample.cover');
  $('embed-msg').value = 'Fuge';
  renderAll();
})();
