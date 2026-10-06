// ベーコン暗号の計算部（DOM を使わない）。globalThis.BaconCore に置く
// 対応表・暗号化・復号と、カバーテキストへの埋め込み・抽出を純粋関数で書く。画面は script.js が組む
(() => {
  'use strict';

  const VARIANTS = ['24', '26'];
  // 24文字版はベーコンの表（1623年『De Augmentis Scientiarum』第6巻第1章）と同じ字の並び。
  // 原典は J を I、U を V で兼ねる。出力の字は I と U にする（CyberChef の Standard と同じ）
  const ALPHABETS = { 24: 'ABCDEFGHIKLMNOPQRSTUWXYZ', 26: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' };
  const MERGED = { J: 'I', V: 'U' };
  const LABEL_24 = { I: 'I/J', U: 'U/V' };
  const FORMATS = ['01', 'AB', 'ab'];
  const GROUPS = ['none', '5', '10'];
  const METHODS = ['case', 'bold', 'italic', 'zw'];
  const MAX_INPUT = 100000;

  // ゼロ幅の2文字（A＝ZERO WIDTH SPACE、B＝ZERO WIDTH NON-JOINER）。ソースに不可視の文字を置かないよう数値で書く
  const ZW_A = String.fromCharCode(0x200b);
  const ZW_B = String.fromCharCode(0x200c);
  // このツールでは使わないが、ほかのツールがゼロ幅の埋め込みに使う文字（ZWJ・WORD JOINER・BOM）
  const ZW_OTHER = [0x200d, 0x2060, 0xfeff].map((c) => String.fromCharCode(c));

  const variantOf = (v) => (String(v) === '26' ? '26' : '24');
  const alphabet = (v) => ALPHABETS[variantOf(v)];
  const isAsciiLetter = (ch) => /^[A-Za-z]$/.test(ch);
  const isSpace = (s) => /^\s+$/.test(s);

  // ===== 対応表 =====
  function codeOf(letter, variant) {
    let up = String(letter).toUpperCase();
    if (variantOf(variant) === '24' && MERGED[up]) up = MERGED[up];
    const i = alphabet(variant).indexOf(up);
    return i < 0 || up.length !== 1 ? null : i.toString(2).padStart(5, '0');
  }

  function letterOf(code, variant) {
    if (!/^[01]{5}$/.test(code)) return null;
    return alphabet(variant)[parseInt(code, 2)] || null;
  }

  const labelOf = (letter, variant) => (variantOf(variant) === '24' && LABEL_24[letter]) || letter;

  // 表の全行と、どの字にも当たらない符号（24文字版は 11000〜11111、26文字版は 11010〜11111）
  function table(variant) {
    return [...alphabet(variant)].map((letter, i) => ({ letter, label: labelOf(letter, variant), code: i.toString(2).padStart(5, '0') }));
  }

  function unusedCodes(variant) {
    const out = [];
    for (let i = alphabet(variant).length; i < 32; i++) out.push(i.toString(2).padStart(5, '0'));
    return out;
  }

  // ===== 暗号化 =====
  // 全角の英字は NFKC で半角にする。英字以外（空白を除く）は数えて外す。24文字版では J→I、V→U
  function encode(text, variant) {
    const v = variantOf(variant);
    const letters = [];
    let dropped = 0;
    let merged = 0;
    for (const ch of String(text).normalize('NFKC')) {
      if (isAsciiLetter(ch)) {
        const up = ch.toUpperCase();
        if (v === '24' && MERGED[up]) merged++;
        letters.push(v === '24' && MERGED[up] ? MERGED[up] : up);
      } else if (!isSpace(ch)) {
        dropped++;
      }
    }
    const pairs = letters.map((letter) => ({ letter, label: labelOf(letter, v), code: codeOf(letter, v) }));
    return { letters: letters.join(''), bits: pairs.map((p) => p.code).join(''), pairs, dropped, merged };
  }

  // 0/1 の列を、指定の記号（01・AB・ab）と区切り（なし・5・10）で書く
  function formatBits(bits, format = '01', group = 'none') {
    const [a, b] = format === 'AB' ? ['A', 'B'] : format === 'ab' ? ['a', 'b'] : ['0', '1'];
    const s = [...String(bits)].map((c) => (c === '1' ? b : a)).join('');
    const n = parseInt(group, 10);
    if (!n) return s;
    const out = [];
    for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n));
    return out.join(' ');
  }

  const invertBits = (bits) => [...String(bits)].map((c) => (c === '1' ? '0' : '1')).join('');

  // ===== 復号 =====
  // A・a・0 を 0、B・b・1 を 1 と読む。空白はつねに飛ばす。全角は NFKC で半角にする。
  // それ以外の文字は、strict なら最初の1つを示して止め、strict でなければ数えて飛ばす
  function parseCipher(input, { strict = false } = {}) {
    const bits = [];
    let invalid = 0;
    let first = null;
    let index = 0;
    for (const ch of String(input).normalize('NFKC')) {
      index++;
      if (ch === '0' || ch === 'a' || ch === 'A') bits.push('0');
      else if (ch === '1' || ch === 'b' || ch === 'B') bits.push('1');
      else if (!isSpace(ch)) {
        invalid++;
        if (!first) first = { ch, index };
        if (strict) return { ok: false, bits: '', invalid, first };
      }
    }
    return { ok: true, bits: bits.join(''), invalid, first };
  }

  // 5ビットずつ字にする。どの字にも当たらない符号は「?」、5に満たない端数は数えて残す
  function decode(bits, variant) {
    const s = String(bits);
    const steps = [];
    let unknown = 0;
    for (let i = 0; i + 5 <= s.length; i += 5) {
      const code = s.slice(i, i + 5);
      const letter = letterOf(code, variant);
      if (!letter) unknown++;
      steps.push({ code, letter, label: letter ? labelOf(letter, variant) : null });
    }
    return { text: steps.map((x) => x.letter || '?').join(''), steps, unknown, remainder: s.length % 5 };
  }

  // 抽出したビット列からメッセージを読む。メッセージの後ろのキャリアは a（0）になるので、
  // 末尾の「全部 a の組」（字の A）を余りとして外す。A で終わるメッセージもあるので外した数を返し、戻せるようにする
  function readMessage(bits, variant, { trim = true } = {}) {
    const d = decode(bits, variant);
    let trimmed = 0;
    if (trim) while (trimmed < d.steps.length && d.steps[d.steps.length - 1 - trimmed].code === '00000') trimmed++;
    const kept = d.steps.slice(0, d.steps.length - trimmed);
    return { text: kept.map((x) => x.letter || '?').join(''), full: d.text, trimmed, remainder: d.remainder, unknown: d.unknown, steps: d.steps };
  }

  // ===== 書記素 =====
  // 絵文字（サロゲートペア・ZWJ の並び）や結合文字を壊さないよう、書記素の単位で数える。Intl.Segmenter がなければコードポイント
  function graphemes(text) {
    const s = String(text);
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), (x) => x.segment);
    }
    return Array.from(s);
  }

  // ===== 埋め込み =====
  // キャリア（1ビットを運ぶ場所）の数。大小＝ASCII の英字、太字・斜体＝空白以外の書記素、ゼロ幅＝書記素の後ろ
  function capacity(method, cover) {
    const s = String(cover);
    if (method === 'case') return [...s].filter(isAsciiLetter).length;
    if (method === 'bold' || method === 'italic') return graphemes(s).filter((g) => !isSpace(g)).length;
    if (method === 'zw') return graphemes(s).length;
    return 0;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
  }

  const htmlText = (s) => escapeHtml(s).replace(/\r?\n/g, '<br>\n');

  // bits は 0/1 の文字列。fillRest は大小方式で、メッセージより後ろの英字を小文字（a 形）にそろえるか
  function embed(cover, bits, method, { fillRest = true } = {}) {
    const src = String(cover);
    const b = String(bits);
    if (!METHODS.includes(method)) return { ok: false, error: 'method' };
    const need = b.length;
    const supply = capacity(method, src);
    if (!need) return { ok: false, error: 'noBits', need, supply };
    if (supply < need) return { ok: false, error: 'short', need, supply };

    if (method === 'case') {
      let i = 0;
      let text = '';
      for (const ch of src) {
        if (!isAsciiLetter(ch)) text += ch;
        else if (i < need) text += b[i++] === '1' ? ch.toUpperCase() : ch.toLowerCase();
        else text += fillRest ? ch.toLowerCase() : ch;
      }
      return { ok: true, method, need, supply, text, parts: [{ text, mark: false }], html: htmlText(text) };
    }

    if (method === 'zw') {
      let i = 0;
      let text = '';
      for (const g of graphemes(src)) {
        text += g;
        if (i < need) text += b[i++] === '1' ? ZW_B : ZW_A;
      }
      return { ok: true, method, need, supply, text, parts: [{ text, mark: false }], html: htmlText(text) };
    }

    // 太字・斜体: 空白以外の書記素に1ビットずつ。B（1）の字に印を付ける。続く同じ印はまとめる
    const parts = [];
    let i = 0;
    for (const g of graphemes(src)) {
      const mark = !isSpace(g) && i < need && b[i] === '1';
      if (!isSpace(g) && i < need) i++;
      const last = parts[parts.length - 1];
      if (last && last.mark === mark) last.text += g;
      else parts.push({ text: g, mark });
    }
    const tag = method === 'bold' ? 'b' : 'i';
    const html = parts.map((p) => (p.mark ? `<${tag}>${htmlText(p.text)}</${tag}>` : htmlText(p.text))).join('');
    return { ok: true, method, need, supply, text: src, parts, html };
  }

  // ダウンロード用の HTML 文書（埋め込んだ結果だけを入れる。スクリプトなし）
  function htmlDocument(bodyHtml, { lang = 'ja', title = 'Bacon CipherLab' } = {}) {
    return `<!DOCTYPE html>\n<html lang="${lang === 'en' ? 'en' : 'ja'}">\n<head>\n<meta charset="utf-8">\n`
      + `<title>${escapeHtml(title)}</title>\n</head>\n<body>\n<p>${bodyHtml}</p>\n</body>\n</html>\n`;
  }

  // ===== 抽出 =====
  // 大小: ASCII の英字の大文字を 1、小文字を 0
  function extractCase(text) {
    const bits = [...String(text)].filter(isAsciiLetter).map((ch) => (ch === ch.toUpperCase() ? '1' : '0')).join('');
    return { bits, carriers: bits.length };
  }

  // ゼロ幅: U+200B を 0、U+200C を 1。HTML の数値文字参照（&#x200B; &#8203; &#x200C; &#8204;）も読む。
  // ほかのツールが使うゼロ幅の文字（ZWJ・WORD JOINER・BOM）は数だけ返す
  function extractZw(text) {
    const s = String(text).replace(/&#(x200b|8203|x200c|8204);/gi, (m, v) => (/^(x200b|8203)$/i.test(v) ? ZW_A : ZW_B));
    let bits = '';
    let other = 0;
    for (const ch of s) {
      if (ch === ZW_A) bits += '0';
      else if (ch === ZW_B) bits += '1';
      else if (ZW_OTHER.includes(ch)) other++;
    }
    return { bits, carriers: bits.length, other };
  }

  // 太字・斜体: runs は [{ text, bold, italic }]（画面側が HTML から作る）。空白以外の書記素に1ビットずつ
  function extractRuns(runs, method) {
    let bits = '';
    for (const r of runs) {
      const on = method === 'bold' ? !!r.bold : !!r.italic;
      for (const g of graphemes(r.text)) if (!isSpace(g)) bits += on ? '1' : '0';
    }
    return { bits, carriers: bits.length };
  }

  // embed() の parts を extractRuns() の形にする（テストと画面のプレビューで使う）
  const runsFromParts = (parts, method) => parts.map((p) => ({ text: p.text, bold: method === 'bold' && p.mark, italic: method === 'italic' && p.mark }));

  globalThis.BaconCore = {
    VARIANTS, FORMATS, GROUPS, METHODS, MAX_INPUT, ZW_A, ZW_B, ZW_OTHER,
    alphabet, codeOf, letterOf, labelOf, table, unusedCodes,
    encode, formatBits, invertBits, parseCipher, decode, readMessage,
    graphemes, capacity, escapeHtml, embed, htmlDocument,
    extractCase, extractZw, extractRuns, runsFromParts
  };
})();
