/* ============================
 * Bacon CipherLab - MVP Script
 * ============================ */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

/* ---------- Theme ---------- */
const themeToggle = $('#themeToggle');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const storedTheme = localStorage.getItem('theme');
if (storedTheme) {
  document.documentElement.dataset.theme = storedTheme;
  themeToggle.checked = storedTheme === 'dark';
} else {
  document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
  themeToggle.checked = prefersDark;
}
themeToggle.addEventListener('change', () => {
  document.documentElement.dataset.theme = themeToggle.checked ? 'dark' : 'light';
  localStorage.setItem('theme', document.documentElement.dataset.theme);
});

/* ---------- Tabs ---------- */
$$('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    $$('.panel').forEach(p => p.classList.remove('active'));
    $('#' + tab).classList.add('active');
  });
});

/* ---------- Toast ---------- */
function toast(msg, ms = 1300) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

/* ---------- Bacon Core ---------- */
const ALPHABET_26 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const ALPHABET_24 = 'ABCDEFGHIKLMNOPQRSTUWXYZ'; // J,V除外（I/J, U/V統合）

function buildMaps(variant = '24') {
  const alpha = (variant === '24') ? ALPHABET_24 : ALPHABET_26;
  const fwd = new Map(); // char -> bits (array of 5, 0/1)
  const rev = new Map(); // bitsString("00000") -> char
  for (let i = 0; i < alpha.length; i++) {
    const ch = alpha[i];
    const bits = i.toString(2).padStart(5, '0');
    fwd.set(ch, bits.split('').map(b => parseInt(b, 10)));
    rev.set(bits, ch);
  }
  return { alpha, fwd, rev };
}

function normalizePlainForVariant(text, variant = '24') {
  let t = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (variant === '24') {
    // I/J統合 → J→I, U/V統合 → V→U
    t = t.replace(/J/g, 'I').replace(/V/g, 'U');
  }
  return t;
}

function lettersToBits_AB(text, variant = '24') {
  const maps = buildMaps(variant);
  const norm = normalizePlainForVariant(text, variant);
  const bits = [];
  const livePairs = [];
  for (const ch of norm) {
    if (!maps.fwd.has(ch)) continue;
    const b5 = maps.fwd.get(ch);
    bits.push(...b5);
    livePairs.push({ ch, bits: b5.join('') });
  }
  return { bits, livePairs, length: norm.length };
}

function bitsToLetters(bits, variant = '24') {
  const maps = buildMaps(variant);
  const out = [];
  const steps = [];
  for (let i = 0; i + 4 < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).join('');
    const ch = maps.rev.get(chunk) || '?';
    out.push(ch);
    steps.push(`${chunk} → ${ch}`);
  }
  return { text: out.join(''), steps: steps.join('\n') };
}

function bitsFormat(bits, fmt = 'AB') {
  if (fmt === 'AB') return bits.map(b => (b ? 'B' : 'A')).join('');
  if (fmt === '01') return bits.join('');
  return bits.join('');
}

function groupString(str, mode) {
  if (mode === 'none') return str;
  const n = parseInt(mode, 10);
  const out = [];
  for (let i = 0; i < str.length; i += n) out.push(str.slice(i, i + n));
  return out.join(' ');
}

function parseBitsFromInput(s, skipInvalid = true) {
  const chars = s.toUpperCase().split('');
  const bits = [];
  const accepted = new Set(['A', 'B', '0', '1']);
  for (const c of chars) {
    if (!accepted.has(c)) {
      if (!skipInvalid) return { bits: [], error: `無効文字: ${c}` };
      continue;
    }
    bits.push(c === 'B' || c === '1' ? 1 : 0);
  }
  return { bits };
}

/* ---------- Encode UI ---------- */
const encPlain = $('#encPlain');
const variantEnc = $('#variantEnc');
const formatEnc = $('#formatEnc');
const groupEnc = $('#groupEnc');
const encOut = $('#encOut');
const statsEnc = $('#statsEnc');
const encMapLive = $('#encMapLive');

function updateEncStats() {
  const { bits, livePairs, length } = lettersToBits_AB(encPlain.value, variantEnc.value);
  const fmt = bitsFormat(bits, formatEnc.value);
  statsEnc.textContent = `文字数: ${length} / ビット数: ${bits.length}`;
  encMapLive.textContent = livePairs.map(p => `${p.ch} → ${p.bits}`).join('\n');
  return { bits, fmt };
}

$('#btnEncode').addEventListener('click', () => {
  const { bits, fmt } = updateEncStats();
  const grouped = groupString(fmt, groupEnc.value);
  encOut.value = grouped;
  toast('Encoded');
});
encPlain.addEventListener('input', updateEncStats);
variantEnc.addEventListener('change', updateEncStats);
formatEnc.addEventListener('change', updateEncStats);
groupEnc.addEventListener('change', updateEncStats);
$('#btnCopyEnc').addEventListener('click', () => {
  navigator.clipboard.writeText(encOut.value || '').then(() => toast('コピーしました'));
});
$('#btnDownloadEnc').addEventListener('click', () => {
  downloadText('bacon-encode.txt', encOut.value || '');
});

/* ---------- Decode UI ---------- */
const decCipher = $('#decCipher');
const variantDec = $('#variantDec');
const skipInvalid = $('#skipInvalid');
const decOut = $('#decOut');
const statsDec = $('#statsDec');
const decSteps = $('#decSteps');

function updateDecStats() {
  const { bits } = parseBitsFromInput(decCipher.value, skipInvalid.checked);
  statsDec.textContent = `ビット長: ${bits.length}（5の倍数推奨）`;
  return bits;
}

$('#btnDecode').addEventListener('click', () => {
  const bits = updateDecStats();
  const { text, steps } = bitsToLetters(bits, variantDec.value);
  decOut.value = text;
  decSteps.textContent = steps;
  toast('Decoded');
});
decCipher.addEventListener('input', updateDecStats);
variantDec.addEventListener('change', updateDecStats);
skipInvalid.addEventListener('change', updateDecStats);
$('#btnCopyDec').addEventListener('click', () => {
  navigator.clipboard.writeText(decOut.value || '').then(() => toast('コピーしました'));
});
$('#btnDownloadDec').addEventListener('click', () => {
  downloadText('bacon-decode.txt', decOut.value || '');
});

/* ---------- Embed UI ---------- */
const coverText = $('#coverText');
const coverMsg = $('#coverMsg');
const variantCover = $('#variantCover');
const coverAB = $('#coverAB');
const embedMethod = $('#embedMethod');
const capacityInfo = $('#capacityInfo');
const embedPreview = $('#embedPreview');
const embedMeta = $('#embedMeta');

function countCoverCapacity(method, text) {
  // capacity = 使用できるキャリアの数
  if (method === 'case') {
    // 英字が対象
    return (text.match(/[A-Za-z]/g) || []).length;
  }
  if (method === 'bold' || method === 'italic') {
    // 文字ごと（空白も対象に含める）
    return text.length;
  }
  if (method === 'zw') {
    // 文字間（挿入スロット数）= 長さ
    return text.length;
  }
  return 0;
}

function computeCapacity() {
  const method = embedMethod.value;
  const msgAB = (coverAB.value || '').toUpperCase().replace(/[^AB]/g, '');
  const need = msgAB.length * 1; // 1ビット=1スロット
  const supply = countCoverCapacity(method, coverText.value);
  capacityInfo.textContent = `必要容量: ${need} / カバー供給: ${supply}`;
  return { need, supply, method, msgAB };
}

embedMethod.addEventListener('change', computeCapacity);
coverText.addEventListener('input', computeCapacity);
coverAB.addEventListener('input', computeCapacity);
coverMsg.addEventListener('input', computeCapacity);

$('#btnMsgToAB').addEventListener('click', () => {
  const { bits } = lettersToBits_AB(coverMsg.value, variantCover.value);
  const ab = bits.map(b => (b ? 'B' : 'A')).join('');
  coverAB.value = ab;
  computeCapacity();
  toast('平文→A/B 変換');
});

$('#btnEmbed').addEventListener('click', () => {
  const { need, supply, method, msgAB } = computeCapacity();
  if (!msgAB.length) return toast('A/Bを入力または平文→A/Bしてください');
  if (supply < need) {
    toast('容量不足：カバー文字数を増やしてください');
    return;
  }
  const src = coverText.value;
  let html = '', plain = '';
  const meta = { method, A: null, B: null, length: msgAB.length };

  if (method === 'case') {
    // A=lower, B=UPPER on letters only
    let i = 0;
    let out = '';
    for (const ch of src) {
      if (/[A-Za-z]/.test(ch) && i < msgAB.length) {
        const bit = msgAB[i++];
        out += (bit === 'B') ? ch.toUpperCase() : ch.toLowerCase();
      } else {
        out += ch;
      }
    }
    html = escapeHTML(out);
    plain = out;
    meta.A = 'lowercase';
    meta.B = 'UPPERCASE';
  }
  else if (method === 'bold' || method === 'italic') {
    // wrap each character by span when B
    let i = 0;
    let out = '';
    for (const ch of src) {
      if (i < msgAB.length) {
        const bit = msgAB[i++];
        if (bit === 'B') {
          out += (method === 'bold')
            ? `<span class="bacon-bold">${escapeHTML(ch)}</span>`
            : `<span class="bacon-italic">${escapeHTML(ch)}</span>`;
        } else {
          out += escapeHTML(ch);
        }
      } else {
        out += escapeHTML(ch);
      }
    }
    html = out;
    plain = src; // プレーンは装飾が落ちる
    meta.A = 'normal';
    meta.B = (method === 'bold') ? 'bold' : 'italic';
  }
  else if (method === 'zw') {
    // insert zero-width between chars: A=200B, B=200C
    // スロットは文字間（len と同数）
    let i = 0;
    let out = '';
    for (let idx = 0; idx < src.length; idx++) {
      const ch = src[idx];
      out += escapeHTML(ch);
      if (i < msgAB.length) {
        out += (msgAB[i++] === 'B') ? '&#x200C;' : '&#x200B;';
      }
    }
    html = out;
    plain = src; // プレーンは不可視が落ちやすい
    meta.A = 'U+200B';
    meta.B = 'U+200C';
  }

  embedPreview.innerHTML = html;
  embedMeta.textContent = JSON.stringify(meta, null, 2);
  embedPreview.dataset.plain = plain;
  toast('埋め込み完了');
});

$('#btnCopyEmbedPlain').addEventListener('click', () => {
  const plain = embedPreview.dataset.plain || '';
  navigator.clipboard.writeText(plain).then(() => toast('プレーンコピー完了'));
});
$('#btnCopyEmbedHTML').addEventListener('click', () => {
  const html = embedPreview.innerHTML || '';
  navigator.clipboard.writeText(html).then(() => toast('HTMLコピー完了'));
});
$('#btnDownloadEmbed').addEventListener('click', () => {
  const html = `<!doctype html><meta charset="utf-8"><div>${embedPreview.innerHTML || ''}</div>`;
  downloadBlob('bacon-embed.html', new Blob([html], { type: 'text/html' }));
});

/* ---------- Extract UI ---------- */
const extractInput = $('#extractInput');
const extractMethod = $('#extractMethod');
const extractOutType = $('#extractOutType');
const extractOut = $('#extractOut');

$('#btnExtract').addEventListener('click', () => {
  const method = extractMethod.value;
  const raw = extractInput.value;
  let ab = '';

  if (method === 'case') {
    // A=lower, B=UPPER (letters only)
    for (const ch of raw) {
      if (/[A-Za-z]/.test(ch)) {
        ab += (ch === ch.toUpperCase()) ? 'B' : 'A';
      }
    }
  }
  else if (method === 'bold' || method === 'italic') {
    // parse HTML if any
    const div = document.createElement('div');
    div.innerHTML = raw;
    // walk text nodes and span bacon-bold/italic
    const walker = document.createTreeWalker(div, NodeFilter.SHOW_ALL);
    const seq = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.nodeValue;
        for (const ch of t) seq.push({ type: 'normal', ch });
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = /** @type {HTMLElement} */(node);
        if (el.classList && (el.classList.contains('bacon-bold') || el.classList.contains('bacon-italic'))) {
          const mode = el.classList.contains('bacon-bold') ? 'bold' : 'italic';
          const t = el.textContent || '';
          for (const ch of t) seq.push({ type: mode, ch });
        }
      }
    }
    // derive AB from sequence
    for (const item of seq) {
      if (item.type === 'bold' && method === 'bold') ab += 'B';
      else if (item.type === 'italic' && method === 'italic') ab += 'B';
      else if (item.type === 'normal') ab += 'A';
      // else skip other tags
    }
  }
  else if (method === 'zw') {
    // detect U+200B (A) and U+200C (B) between characters
    // read as text (not HTML entity)
    const s = raw.replace(/&(#x)?200(B|C);/gi, (m, hx, tail) => {
      // if user pasted HTML entities, convert to actual chars for detection
      return tail.toUpperCase() === 'B' ? '\u200B' : '\u200C';
    });
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\u200B') ab += 'A';
      else if (c === '\u200C') ab += 'B';
    }
  }

  // Convert to requested output
  let output = '';
  if (extractOutType.value === 'AB') output = ab;
  else if (extractOutType.value === '01') output = ab.replace(/A/g, '0').replace(/B/g, '1');
  else {
    // plain text: decode AB as bits -> letters
    const bits = ab.split('').map(c => (c === 'B' ? 1 : 0));
    const variant = extractOutType.value === 'plain24' ? '24' : '26';
    const { text } = bitsToLetters(bits, variant);
    output = text;
  }

  extractOut.value = output;
  toast('抽出完了');
});

$('#btnCopyExtract').addEventListener('click', () => {
  navigator.clipboard.writeText(extractOut.value || '').then(() => toast('コピーしました'));
});

/* ---------- Matrix ---------- */
const matrixVariant = $('#matrixVariant');
const matrixBits = $('#matrixBits');
const matrixTable = $('#matrixTable');

function renderMatrix() {
  const variant = matrixVariant.value;
  const bitsFmt = matrixBits.value;
  const { alpha } = buildMaps(variant);
  matrixTable.innerHTML = '';
  for (let i = 0; i < alpha.length; i++) {
    const ch = alpha[i];
    const bits = i.toString(2).padStart(5, '0');
    const bitsHuman = (bitsFmt === 'AB')
      ? bits.replace(/0/g, 'A').replace(/1/g, 'B')
      : bits;
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.innerHTML = `
      <div class="letter">${ch}</div>
      <div class="bits">${bitsHuman}</div>
    `;
    cell.title = `${ch} → ${bitsHuman}`;
    cell.addEventListener('click', () => {
      navigator.clipboard.writeText(bitsHuman).then(() => toast(`${ch} のビットをコピー`));
    });
    matrixTable.appendChild(cell);
  }
}
matrixVariant.addEventListener('change', renderMatrix);
matrixBits.addEventListener('change', renderMatrix);
renderMatrix();

/* ---------- Utils ---------- */
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function downloadText(filename, text) {
  downloadBlob(filename, new Blob([text], { type: 'text/plain;charset=utf-8' }));
}

function downloadBlob(filename, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/* ---------- Initial Hints ---------- */
(function initHints() {
  encPlain.value = 'HELLO WORLD';
  updateEncStats();
  coverText.value = 'This is a cover text. Paste your article here and embed a secret message.';
  computeCapacity();
})();
