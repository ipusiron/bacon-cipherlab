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
  // それ以外の文字は、strict なら最初の1つを示して止め、strict でなければ数えて飛ばす。
  // keep なら、その文字を「何ビット目の後ろにあったか」と一緒に extras に残す（数字・記号を元の位置に戻すため）。
  // keep のとき、a/b の字で書いた暗号文なら数字の 0・1 も記号ではなく残す文字として扱う
  function parseCipher(input, { strict = false, keep = false } = {}) {
    const s = String(input).normalize('NFKC');
    const lettersOnly = keep && /[abAB]/.test(s);
    const bits = [];
    const extras = [];
    let invalid = 0;
    let first = null;
    let index = 0;
    for (const ch of s) {
      index++;
      if (ch === 'a' || ch === 'A' || (ch === '0' && !lettersOnly)) bits.push('0');
      else if (ch === 'b' || ch === 'B' || (ch === '1' && !lettersOnly)) bits.push('1');
      else if (isSpace(ch)) continue;
      else if (keep) extras.push({ at: bits.length, ch });
      else {
        invalid++;
        if (!first) first = { ch, index };
        if (strict) return { ok: false, bits: '', invalid, first, extras };
      }
    }
    return { ok: true, bits: bits.join(''), invalid, first, extras };
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

  // ===== HTML を「文字列と太字・斜体の印」の並びにする =====
  // ブラウザーの HTML 解析器で文書を作ると、CSP の下で style 属性を読むたびに違反が報告されるので、DOM を使わずに字句だけを読む。
  // 太字＝b・strong・class="bacon-bold"・font-weight（bold・bolder・600以上。normal・400 で戻る）、
  // 斜体＝i・em・class="bacon-italic"・font-style（italic・oblique。normal で戻る）。script・style などの中身は読まない
  const VOID = ['area', 'base', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'];
  const RAW = ['script', 'style', 'template', 'noscript', 'title', 'head', 'textarea'];
  const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: String.fromCharCode(0xa0) };
  const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/y;
  const ATTR = /([^\s"'=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const WEIGHT = /(?:^|;)\s*font-weight\s*:\s*([a-z0-9]+)/;
  const SLANT = /(?:^|;)\s*font-style\s*:\s*([a-z]+)/;

  function decodeEntities(s) {
    return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, v) => {
      if (v[0] === '#') {
        const n = /^#x/i.test(v) ? parseInt(v.slice(2), 16) : parseInt(v.slice(1), 10);
        return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : m;
      }
      const k = v.toLowerCase();
      return Object.prototype.hasOwnProperty.call(ENTITIES, k) ? ENTITIES[k] : m;
    });
  }

  function attrsOf(s) {
    const out = {};
    for (const m of s.matchAll(ATTR)) out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
    return out;
  }

  function runsFromHtml(html) {
    const s = String(html);
    const lower = s.toLowerCase();
    const runs = [];
    const stack = [{ tag: '', bold: false, italic: false }];
    const top = () => stack[stack.length - 1];
    const push = (text) => {
      if (text) runs.push({ text: decodeEntities(text), bold: top().bold, italic: top().italic });
    };
    let i = 0;
    while (i < s.length) {
      const lt = s.indexOf('<', i);
      if (lt < 0) {
        push(s.slice(i));
        break;
      }
      push(s.slice(i, lt));
      if (s.startsWith('<!--', lt)) {
        const end = s.indexOf('-->', lt + 4);
        i = end < 0 ? s.length : end + 3;
        continue;
      }
      if (s.startsWith('<!', lt) || s.startsWith('<?', lt)) {
        const end = s.indexOf('>', lt);
        i = end < 0 ? s.length : end + 1;
        continue;
      }
      TAG.lastIndex = lt;
      const m = TAG.exec(s);
      if (!m) {
        push('<');
        i = lt + 1;
        continue;
      }
      i = lt + m[0].length;
      const tag = m[2].toLowerCase();
      if (m[1]) {
        const k = stack.map((x) => x.tag).lastIndexOf(tag);
        if (k > 0) stack.length = k;
        continue;
      }
      if (RAW.includes(tag)) {
        const end = lower.indexOf(`</${tag}`, i);
        const close = end < 0 ? -1 : s.indexOf('>', end);
        i = close < 0 ? s.length : close + 1;
        continue;
      }
      if (tag === 'br') {
        push('\n');
        continue;
      }
      if (VOID.includes(tag) || /\/\s*$/.test(m[3])) continue;
      const { class: klass = '', style: inline = '' } = attrsOf(m[3]);
      const cls = String(klass).split(/\s+/);
      const style = String(inline).toLowerCase();
      let bold = top().bold || tag === 'b' || tag === 'strong' || cls.includes('bacon-bold');
      let italic = top().italic || tag === 'i' || tag === 'em' || cls.includes('bacon-italic');
      const w = style.match(WEIGHT);
      if (w) bold = w[1] === 'bold' || w[1] === 'bolder' || parseInt(w[1], 10) >= 600;
      const sl = style.match(SLANT);
      if (sl) italic = sl[1] === 'italic' || sl[1] === 'oblique';
      stack.push({ tag, bold, italic });
    }
    return runs;
  }

  // embed() の parts を extractRuns() の形にする（テストと画面のプレビューで使う）
  const runsFromParts = (parts, method) => parts.map((p) => ({ text: p.text, bold: method === 'bold' && p.mark, italic: method === 'italic' && p.mark }));

  // ===== 解読の補助（ずれ・入れ替え・読み違いの候補・辞書での読み替え・読み方の総当たり） =====
  // 英語の文字の出現頻度（%）。Wikipedia「Letter frequency」の Texts 列（出典は Lewand, Cryptological Mathematics, 2000）
  const FREQ = {
    A: 8.2, B: 1.5, C: 2.8, D: 4.3, E: 12.7, F: 2.2, G: 2.0, H: 6.1, I: 7.0, J: 0.16, K: 0.77, L: 4.0, M: 2.4,
    N: 6.7, O: 7.5, P: 1.9, Q: 0.12, R: 6.0, S: 6.3, T: 9.1, U: 2.8, V: 0.98, W: 2.4, X: 0.15, Y: 2.0, Z: 0.074
  };
  // 辞書での読み替えと採点に使う英単語（3字以上）。よく使う語と、暗号・CTF でよく隠される語
  const WORDS = (
    'THE AND FOR ARE BUT NOT YOU ALL ANY CAN HAD HER WAS ONE OUR OUT DAY GET HAS HIM HIS HOW MAN NEW NOW OLD SEE TWO WAY WHO '
    + 'DID ITS LET PUT SAY SHE TOO USE YES THAT WITH HAVE THIS WILL YOUR FROM THEY KNOW WANT BEEN GOOD MUCH SOME TIME VERY WHEN '
    + 'COME HERE JUST LIKE LONG MAKE MANY MORE ONLY OVER SUCH TAKE THAN THEM WELL WERE WHAT WORK YEAR BACK CALL CAME EACH EVEN FIND '
    + 'GIVE HAND HIGH KEEP LAST LEFT LIFE LIVE LOOK MADE MOST MOVE MUST NAME NEED NEXT OPEN PART PLAY SAID SAME SHOW SIDE TELL '
    + 'TURN WEEK WENT WORD ABOUT AFTER AGAIN COULD EVERY FIRST FOUND GREAT HOUSE LARGE LEARN NEVER OTHER PLACE POINT RIGHT SMALL '
    + 'STILL STUDY THEIR THERE THESE THING THINK THREE WATER WHERE WHICH WORLD WOULD WRITE LOVE HOME CITY ROAD TREE FIRE '
    + 'FLAG KEY CODE BACON CIPHER SECRET HIDDEN HIDE MESSAGE PASSWORD ATTACK DAWN MEET NOON NIGHT HELP FLEE ESCAPE SPY AGENT '
    + 'TREASURE GOLD NORTH SOUTH EAST WEST LETTER KNOWLEDGE POWER HELLO SAFE DANGER ENEMY ARMY KING QUEEN LORD STAY WAIT '
    + 'SEND RUN STOP START END TODAY TOMORROW MORNING EVENING BRIDGE STATION CASTLE TOWER GATE DOOR WALL SIGNAL TRUTH HONOR'
  ).split(' ');
  const SCORE_LETTERS = 400;
  const READINGS = ['symbols', 'case', 'half', 'word', 'vowel', 'two', 'bold', 'italic', 'zw'];

  const cache = {};
  // 版ごとの辞書（24文字版では J→I、V→U にそろえた綴りで照らし、元の綴りを返す）と、正規化した出現確率
  function model(variant) {
    const v = variantOf(variant);
    if (cache[v]) return cache[v];
    const norm = (w) => (v === '24' ? w.replace(/J/g, 'I').replace(/V/g, 'U') : w);
    const byLength = {};
    const exact = new Map();
    for (const w of WORDS) {
      const n = norm(w);
      if (!exact.has(n)) exact.set(n, w);
      (byLength[n.length] = byLength[n.length] || []).push([n, w]);
    }
    const p = {};
    for (const [ch, f] of Object.entries(FREQ)) {
      const k = v === '24' && MERGED[ch] ? MERGED[ch] : ch;
      p[k] = (p[k] || 0) + f;
    }
    const total = Object.values(p).reduce((a, b) => a + b, 0);
    for (const k of Object.keys(p)) p[k] /= total;
    const maxLen = Math.max(...WORDS.map((w) => w.length));
    cache[v] = { exact, byLength, p, size: alphabet(v).length, maxLen };
    return cache[v];
  }

  // 1ビット違いで、どれかの字に当たる符号の字（範囲外の符号「?」の候補）
  function nearLetters(code, variant) {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const c = code.slice(0, i) + (code[i] === '1' ? '0' : '1') + code.slice(i + 1);
      const l = letterOf(c, variant);
      if (l && !out.includes(l)) out.push(l);
    }
    return out;
  }

  // 辞書の語で覆える字を最大にする読み（動的計画法）。text は英字と ?、alts[i] は ? の位置の候補の字
  function cover(text, variant, alts = []) {
    const s = String(text).slice(0, SCORE_LETTERS);
    const M = model(variant);
    const n = s.length;
    const best = new Array(n + 1).fill(-1);
    const back = new Array(n + 1).fill(null);
    best[0] = 0;
    const fits = (seg, i, norm) => [...norm].every((c, k) => seg[k] === c || (seg[k] === '?' && (alts[i + k] || []).includes(c)));
    for (let i = 0; i < n; i++) {
      if (best[i] < 0) continue;
      if (best[i] > best[i + 1]) {
        best[i + 1] = best[i];
        back[i + 1] = { from: i, word: null };
      }
      for (let len = 3; len <= M.maxLen && i + len <= n; len++) {
        const seg = s.slice(i, i + len);
        let word = null;
        if (!seg.includes('?')) word = M.exact.get(seg) || null;
        else word = ((M.byLength[len] || []).find(([norm]) => fits(seg, i, norm)) || [])[1] || null;
        if (word && best[i] + len > best[i + len]) {
          best[i + len] = best[i] + len;
          back[i + len] = { from: i, word };
        }
      }
    }
    const parts = [];
    const words = [];
    for (let j = n; j > 0; j = back[j].from) {
      const b = back[j];
      parts.unshift(b.word || s.slice(b.from, j));
      if (b.word) words.unshift(b.word);
    }
    return { covered: Math.max(best[n], 0), words, resolved: parts.join('') + String(text).slice(SCORE_LETTERS) };
  }

  // 英語らしさの採点。1文字あたりの対数尤度（一様分布と比べる）＋辞書の語で覆える割合 − ? の割合 − 1つの字への偏り
  function englishScore(text, variant, alts = []) {
    const s = String(text).slice(0, SCORE_LETTERS);
    const M = model(variant);
    const letters = [...s].filter((c) => c >= 'A' && c <= 'Z');
    const unknown = [...s].filter((c) => c === '?').length;
    const n = letters.length;
    if (!n) return { score: -99, english: -99, covered: 0, letters: 0, words: [], unknown, resolved: String(text) };
    let ll = 0;
    const counts = {};
    for (const c of letters) {
      ll += Math.log((M.p[c] || 1e-4) * M.size);
      counts[c] = (counts[c] || 0) + 1;
    }
    const english = ll / n;
    const share = Math.max(...Object.values(counts)) / n;
    const c = cover(text, variant, alts);
    const length = s.length;
    const score = english + 1.2 * (c.covered / length) - 2 * (unknown / length) - (n >= 6 ? Math.max(0, share - 0.3) * 4 : 0) - (n < 4 ? 1 : 0);
    return { score, english, covered: c.covered, letters: length, words: c.words, unknown, resolved: c.resolved };
  }

  // 1つの符号を、画面に出す字と候補にする（24文字版の I・U は [I/J]・[U/V]、範囲外は1ビット違いの候補）
  function tokenOf(step, variant) {
    if (!step.letter) {
      const alts = nearLetters(step.code, variant);
      return { text: '?', alts: alts.length ? alts : null };
    }
    if (variantOf(variant) === '24' && LABEL_24[step.letter]) return { text: step.letter, alts: LABEL_24[step.letter].split('/') };
    return { text: step.letter, alts: null };
  }

  // 復号タブの読み。offset＝先頭から飛ばすビット（0〜4）、invert＝a と b を入れ替える、keep＝記号以外の文字を元の位置に残す
  function readCipher(input, variant, { strict = false, offset = 0, invert = false, keep = false } = {}) {
    const p = parseCipher(input, { strict: strict && !keep, keep });
    if (!p.ok) return { ok: false, invalid: p.invalid, first: p.first };
    const off = Math.min(Math.max(Math.trunc(Number(offset)) || 0, 0), 4);
    const bits = (invert ? invertBits(p.bits) : p.bits).slice(off);
    const d = decode(bits, variant);
    const tokens = [];
    const extras = p.extras.map((e) => ({ at: Math.ceil(Math.max(0, e.at - off) / 5), ch: e.ch }));
    let k = 0;
    d.steps.forEach((step, i) => {
      while (k < extras.length && extras[k].at <= i) tokens.push({ text: extras[k++].ch, alts: null });
      tokens.push(tokenOf(step, variant));
    });
    while (k < extras.length) tokens.push({ text: extras[k++].ch, alts: null });
    const text = tokens.map((x) => x.text).join('');
    const alts = tokens.map((x) => (x.text === '?' ? x.alts : null));
    const c = cover(text, variant, alts);
    return {
      ok: true, text, bits: bits.length, letters: d.steps.length, steps: d.steps, unknown: d.unknown, remainder: d.remainder,
      invalid: p.invalid, first: p.first, kept: p.extras.length, offset: off,
      annotated: tokens.map((x) => (x.alts ? `[${x.alts.join('/')}]` : x.text)).join(''),
      resolved: c.resolved, words: c.words
    };
  }

  // 自動判別の読み方。2通りに分かれるものを、それぞれ 0/1 の列にする（5つ以上あって、0 と 1 の両方があるものだけ）
  function readings(text) {
    const s = String(text);
    const html = /<[a-zA-Z][^>]*>/.test(s);
    const runs = html ? runsFromHtml(s) : [{ text: s, bold: false, italic: false }];
    const plain = runs.map((r) => r.text).join('');
    const out = [];
    const add = (id, bits, extra = {}) => {
      // 入れ替えも総当たりするので、既にある読み方の a・b を入れ替えただけのものも除く
      const inv = invertBits(bits);
      if (bits.length < 5 || !bits.includes('0') || !bits.includes('1') || out.some((r) => r.bits === bits || r.bits === inv)) return;
      out.push({ id, bits, carriers: bits.length, share: [...bits].filter((b) => b === '1').length / bits.length, ...extra });
    };
    const p = parseCipher(plain);
    const visible = [...plain].filter((c) => !isSpace(c)).length;
    if (p.bits.length >= visible * 0.8) add('symbols', p.bits);
    const letters = [...plain].filter(isAsciiLetter);
    const half = (c) => (c.toUpperCase() <= 'M' ? '0' : '1');
    add('case', letters.map((c) => (c === c.toUpperCase() ? '1' : '0')).join(''));
    add('half', letters.map(half).join(''));
    add('word', plain.split(/\s+/).map((w) => [...w].find(isAsciiLetter)).filter(Boolean).map(half).join(''));
    add('vowel', letters.map((c) => ('AEIOU'.includes(c.toUpperCase()) ? '1' : '0')).join(''));
    const gs = graphemes(plain).filter((g) => !isSpace(g));
    const distinct = [...new Set(gs)];
    if (distinct.length === 2) add('two', gs.map((g) => (g === distinct[0] ? '0' : '1')).join(''), { a: distinct[0], b: distinct[1] });
    if (html) {
      add('bold', extractRuns(runs, 'bold').bits);
      add('italic', extractRuns(runs, 'italic').bits);
    }
    add('zw', extractZw(s).bits);
    return out;
  }

  // 読み方 × 版 × 入れ替え × ずれ（0〜4）を総当たりし、末尾の余りを外してから採点して並べる。同じ読みは点の高いほうだけ残す
  function solve(text, { limit = 8 } = {}) {
    const rs = readings(text);
    const best = new Map();
    let tried = 0;
    for (const r of rs) {
      for (const variant of VARIANTS) {
        for (const invert of [false, true]) {
          for (let offset = 0; offset < 5; offset++) {
            tried++;
            const m = readMessage((invert ? invertBits(r.bits) : r.bits).slice(offset), variant);
            if (m.text.replace(/\?/g, '').length < 2) continue;
            const alts = m.steps.slice(0, m.text.length).map((st) => (st.letter ? null : nearLetters(st.code, variant)));
            const sc = englishScore(m.text, variant, alts);
            const cand = { reading: r.id, a: r.a, b: r.b, bits: r.bits, carriers: r.carriers, variant, invert, offset, text: m.text,
              trimmed: m.trimmed, remainder: m.remainder, ...sc };
            const prev = best.get(m.text);
            if (!prev || prev.score < cand.score) best.set(m.text, cand);
          }
        }
      }
    }
    const list = [...best.values()].sort((x, y) => y.score - x.score);
    return { readings: rs, tried, total: list.length, candidates: list.slice(0, limit) };
  }

  // 解析タブの例（どれも計算部で作る）
  const SAMPLE_IDS = ['case', 'shift', 'emoji', 'word', 'zw'];
  function makeSample(id) {
    if (id === 'shift') return `ba ${formatBits(encode('Attack at dawn', '24').bits, 'ab', '5')}`;
    if (id === 'emoji') {
      const egg = String.fromCodePoint(0x1f373);
      const bacon = String.fromCodePoint(0x1f953);
      return formatBits(encode('Bacon and eggs', '26').bits, 'ab', '5').replace(/a/g, egg).replace(/b/g, bacon);
    }
    if (id === 'word') {
      // 頭文字が A〜M の語＝a、N〜Z の語＝b
      const A = 'all big cats dream about green hills in jungle land'.split(' ');
      const B = 'now our people sing together under very warm yellow skies'.split(' ');
      let i = 0;
      let j = 0;
      return [...encode('Stop', '24').bits].map((b) => (b === '0' ? A[i++ % A.length] : B[j++ % B.length])).join(' ');
    }
    if (id === 'zw') {
      return embed('Lovely weather today. Fancy a walk in the park this afternoon?', encode('Meet at noon', '24').bits, 'zw').text;
    }
    return embed('Welcome to our company homepage. We are committed to excellence in everything we do, '
      + 'building practical solutions for complex problems across the globe.', encode('The flag is bacon', '24').bits, 'case').text;
  }

  globalThis.BaconCore = {
    VARIANTS, FORMATS, GROUPS, METHODS, MAX_INPUT, ZW_A, ZW_B, ZW_OTHER,
    alphabet, codeOf, letterOf, labelOf, table, unusedCodes,
    encode, formatBits, invertBits, parseCipher, decode, readMessage,
    graphemes, capacity, escapeHtml, embed, htmlDocument,
    extractCase, extractZw, extractRuns, runsFromHtml, decodeEntities, runsFromParts,
    FREQ, WORDS, READINGS, SAMPLE_IDS, nearLetters, cover, englishScore, readCipher, readings, solve, makeSample
  };
})();
