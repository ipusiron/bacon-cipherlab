import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { read, core, load } from './load.js';

const C = core();
const { MESSAGES } = load('js/messages.js').BaconMessages;
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const DOCS = {
  ja: {
    file: 'README.md', switcher: '[English](README.en.md) · 日本語', day: '**Day055 - 生成AIで作るセキュリティツール100**',
    shots: /^assets\/screenshot\d*\.png$/,
    sec: { tech: '🔬 技術的な説明', limits: '⚠️ 注意と限界', refs: '🔗 参考', tree: '📁 ディレクトリー構造', about: '🛠️ このツールについて',
      security: '🔒 セキュリティ', uses: '🎯 活用例', friedman: '🪦 フリードマン夫妻の墓碑', about2: '🥓 ベーコン暗号とは' },
    head: { table: '| 字 | 24文字版 | 26文字版 |', examples: '| 平文 | 24文字版 | 26文字版 |', methods: '| 方式 | a | b | キャリア |',
      readings: '| 読み方 | aになるもの | bになるもの |', samples: '| 例 | 1位の読み | 読み方 | 版 | ずれ |', survival: '| 経路 | 大小 |', schemes: '| 方式 | 使う見えない文字 |' },
    lab: (n) => `練習は${n}問`, yes: '残る', no: '消える',
    words: (n) => `英単語の一覧（${n}語）`, thresholds: ['1以上', '0.5以上'],
    same: (x) => `（${x}と同じ）`,
    method: { 大小: 'case', ゼロ幅文字: 'zw' },
    max: (n) => `${n.toLocaleString('en-US')}文字まで`,
    // 長音のない表記・「わかる」の漢字書き（分ける・分かれるは漢字のまま）・ベーコンの考案を1605年とする記述
    forbidden: /ブラウザ(?!ー)|フォルダ(?!ー)|ディレクトリ(?!ー)|リポジトリ(?!ー)|ライブラリ(?!ー)|エディタ(?!ー)|(?<![自0-9０-９])分か(?!れ)|完全な不可視|1605年に考案/
  },
  en: {
    file: 'README.en.md', switcher: 'English · [日本語](README.md)', day: '**Day055 - 100 Security Tools with Generative AI**',
    shots: /^assets\/en\/screenshot\d*\.png$/,
    sec: { tech: '🔬 Technical notes', limits: '⚠️ Notes and limitations', refs: '🔗 References', tree: '📁 Directory structure',
      about: '🛠️ About this tool', security: '🔒 Security', uses: '🎯 Use cases', friedman: "🪦 The Friedmans' gravestone",
      about2: "🥓 What is Bacon's cipher?" },
    head: { table: '| Letter | 24 letters | 26 letters |', examples: '| Plaintext | 24 letters | 26 letters |', methods: '| Method | a | b | Carrier |',
      readings: '| Reading | Becomes a | Becomes b |', samples: '| Example | Top reading | Reading | Variant | Offset |',
      survival: '| Route | Case |', schemes: '| Method | Invisible characters |' },
    lab: (n) => `has ${n} problems`, yes: 'Survives', no: 'Lost',
    words: (n) => `list of English words (${n} words)`, thresholds: ['1 or more', '0.5 or more'],
    same: (x) => ` (same as ${x})`,
    method: { case: 'case', 'zero-width characters': 'zw' },
    max: (n) => `up to ${n.toLocaleString('en-US')} characters`,
    forbidden: /complete invisibility|devised in 1605/i
  }
};
for (const d of Object.values(DOCS)) d.text = read(d.file);

function section(text, heading) {
  const i = text.indexOf(`\n## ${heading}`);
  assert.ok(i >= 0, heading);
  const rest = text.slice(i + 1);
  const end = rest.indexOf('\n## ', 3);
  return end < 0 ? rest : rest.slice(0, end);
}

function table(text, firstHeader) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(firstHeader));
  assert.ok(start >= 0, firstHeader);
  const rows = [];
  for (let i = start + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    rows.push(lines[i].replace(/^\| | \|$/g, '').split(/ (?<!\\)\| /).map((c) => c.trim()));
  }
  return rows;
}

const noCode = (md) => md.replace(/```[\s\S]*?```/g, '');
const h2 = (md) => noCode(md).split('\n').filter((l) => l.startsWith('## ')).map((l) => l.slice(3));
const headings = (md) => noCode(md).split('\n').filter((l) => /^#{1,4} /.test(l));
const unquote = (s) => s.replace(/^`|`$/g, '');

test('YAML メタデータの構造（キーの順、ブロック形式のリスト、固定の値）。YAML は README.md だけに置く', () => {
  const m = DOCS.ja.text.match(/^<!--\n---\n([\s\S]*?)\n---\n-->\n/);
  assert.ok(m, 'YAML block');
  const keys = [...m[1].matchAll(/^([a-z_]+):/gm)].map((x) => x[1]);
  assert.deepEqual(keys, ['id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en', 'category_ja', 'category_en',
    'difficulty', 'tags', 'repo_url', 'demo_url', 'hub']);
  for (const k of ['category_ja', 'category_en', 'tags']) assert.match(m[1], new RegExp(`^${k}:\\n  - `, 'm'), k);
  assert.match(m[1], /^id: day055$/m);
  assert.match(m[1], /^slug: bacon-cipherlab$/m);
  assert.match(m[1], /^repo_url: "https:\/\/github.com\/ipusiron\/bacon-cipherlab"$/m);
  assert.match(m[1], /^demo_url: "https:\/\/ipusiron.github.io\/bacon-cipherlab\/"$/m);
  assert.match(m[1], /^hub: true$/m);
  assert.doesNotMatch(DOCS.en.text, /^<!--/);
});

test('日英の README は同じ見出しを同じ順に持つ（階層と絵文字がそろう）', () => {
  const ja = headings(DOCS.ja.text);
  const en = headings(DOCS.en.text);
  assert.equal(en.length, ja.length);
  assert.ok(ja.length >= 30, String(ja.length));
  ja.forEach((h, i) => {
    assert.equal(en[i].match(/^#+/)[0], h.match(/^#+/)[0], `${h} / ${en[i]}`);
    const first = [...h.replace(/^#+ /, '')][0];
    if (/\p{Extended_Pictographic}/u.test(first)) assert.equal([...en[i].replace(/^#+ /, '')][0], first, `${h} / ${en[i]}`);
  });
});

for (const [lang, d] of Object.entries(DOCS)) {
  test(`${d.file}: シリーズ標準の構成（前半と後半の見出しの順、Day の表記、言語の切り替え、プロジェクトのリンク）と、古い記述がないこと`, () => {
    const heads = h2(d.text);
    assert.ok(d.text.includes(d.switcher));
    assert.match(d.text, /(^|\n)# 🥓 Bacon CipherLab - .+\n/);
    assert.ok(d.text.includes(d.day));
    assert.ok(heads[0].startsWith('🌐'));
    assert.ok(heads[1].startsWith('📸'));
    assert.deepEqual(heads.slice(-4).map((h) => [...h][0]), ['📁', '💻', '📄', '🛠']);
    for (const icon of ['🥓', '✨', '📖', '🔬', '🪦', '🎯', '📊', '🔒', '⚠', '🧪', '🔗']) assert.ok(heads.some((h) => h.startsWith(icon)), icon);
    assert.match(section(d.text, d.sec.about), /https:\/\/akademeia\.info\/\?page_id=42163/);
    for (const b of ['stars', 'forks', 'last-commit', 'license']) assert.ok(d.text.includes(`img.shields.io/github/${b}/ipusiron/bacon-cipherlab`), b);
    assert.doesNotMatch(d.text.replace(/<!--[\s\S]*?-->/, ''), d.forbidden);
  });

  test(`${d.file}: 強調は1節に2か所まで、箇条書きの項目名を太字にしない、文末にコロンを置かない`, () => {
    for (const h of h2(d.text)) {
      const n = (section(d.text, h).match(/\*\*[^*\n]+\*\*/g) || []).length;
      assert.ok(n <= 2, `${h}: ${n}`);
    }
    assert.doesNotMatch(d.text, /^\s*- \*\*/m);
    if (lang === 'ja') assert.doesNotMatch(noCode(d.text).replace(/<!--[\s\S]*?-->/, ''), /[：:]$/m);
  });

  test(`${d.file}: 対応表は、計算部の24文字版・26文字版と全26行で同じ（J・V は I・U と同じ符号と書く）`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.table);
    assert.equal(rows.length, 26);
    rows.forEach(([letter, c24, c26], i) => {
      assert.equal(letter, String.fromCharCode(65 + i));
      const merged = { J: 'I', V: 'U' }[letter];
      assert.equal(c24, C.formatBits(C.codeOf(letter, '24'), 'ab') + (merged ? d.same(merged) : ''), letter);
      assert.equal(c26, C.formatBits(C.codeOf(letter, '26'), 'ab'), letter);
    });
  });

  test(`${d.file}: 変換の例は、計算部の暗号化と同じ`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.examples);
    assert.deepEqual(rows.map((r) => r[0]), ['HELLO', 'SOS', 'Fuge']);
    for (const [word, c24, c26] of rows) {
      assert.equal(unquote(c24), C.formatBits(C.encode(word, '24').bits, 'ab', '5'), word);
      assert.equal(unquote(c26), C.formatBits(C.encode(word, '26').bits, 'ab', '5'), word);
    }
  });

  test(`${d.file}: 方式とキャリアの表は、計算部の4方式と同じ順で、ゼロ幅文字の符号位置が同じ`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.methods);
    assert.equal(rows.length, C.METHODS.length);
    const zw = rows[C.METHODS.indexOf('zw')];
    assert.deepEqual(zw.slice(1, 3), [
      `U+${C.ZW_A.charCodeAt(0).toString(16).toUpperCase()}`, `U+${C.ZW_B.charCodeAt(0).toString(16).toUpperCase()}`
    ]);
  });

  test(`${d.file}: ベーコンの例（Fuge）と墓碑の読み方は、計算部の結果と同じ`, () => {
    assert.ok(section(d.text, d.sec.about2).includes(C.formatBits(C.encode('Fuge', '24').bits, 'ab', '5').split(' ').join(d === DOCS.ja ? '・' : ', ')));
    const f = section(d.text, d.sec.friedman);
    const x = C.extractCase('KnOwledGe Is pOwEr');
    assert.ok(f.includes(`KnOwl edGeI spOwE r\n${C.formatBits(x.bits, 'ab', '5')}`));
    assert.equal(C.readMessage(x.bits, '24').text, 'WFF');
    assert.ok(f.includes(C.readMessage(x.bits, '24').text) && f.includes(C.readMessage(x.bits, '26').text));
  });

  test(`${d.file}: 活用例の文（CTF・想定シナリオ）は、書いた方式で抽出すると書いたメッセージになる（ゼロ幅文字は実物）`, () => {
    const uses = section(d.text, d.sec.uses);
    const blocks = [...uses.matchAll(/```text\n([\s\S]*?)\n```\n\n→ `([A-Z]+)`(?:（| \()([^・,）)]+)(?:・|, )(24)/g)];
    assert.equal(blocks.length, 3);
    for (const [, text, msg, label, variant] of blocks) {
      const method = d.method[label];
      assert.ok(method, label);
      const x = method === 'case' ? C.extractCase(text) : C.extractZw(text);
      assert.equal(C.readMessage(x.bits, variant).text, msg, label);
    }
    const zw = blocks.find((b) => d.method[b[3]] === 'zw')[1];
    assert.equal(C.extractZw(zw).bits.length, C.encode('HELP', '24').bits.length);
  });

  test(`${d.file}: 解析の読み方の表は計算部の読み方と同じ順で、名前は画面の辞書と同じ`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.readings);
    assert.equal(rows.length, C.READINGS.length);
    rows.forEach(([name], i) => {
      const label = MESSAGES[lang][`reading.${C.READINGS[i]}`].replace(/（\{a\}と\{b\}）$| \(\{a\} and \{b\}\)$/, '');
      assert.equal(name, label, C.READINGS[i]);
    });
    assert.deepEqual(rows[C.READINGS.indexOf('zw')].slice(1, 3), ['U+200B', 'U+200C']);
  });

  test(`${d.file}: 解析の例の表は、計算部の例を総当たりした1位と同じ。語数と点数の目安も実装と同じ`, () => {
    const rows = table(section(d.text, d.sec.tech), d.head.samples);
    assert.equal(rows.length, C.SAMPLE_IDS.length);
    rows.forEach(([name, text, reading, variant, offset], i) => {
      const id = C.SAMPLE_IDS[i];
      const top = C.solve(C.makeSample(id)).candidates[0];
      assert.equal(name, MESSAGES[lang][`sample.${id}`], id);
      assert.equal(unquote(text), top.text, id);
      assert.ok(MESSAGES[lang][`reading.${top.reading}`].startsWith(reading), `${id}: ${reading}`);
      assert.equal(variant, MESSAGES[lang][`variant.${top.variant}`], id);
      assert.equal(Number(offset), top.offset, id);
      assert.equal(top.invert, false, id);
    });
    const tech = section(d.text, d.sec.tech);
    assert.ok(tech.includes(d.words(C.WORDS.length)), String(C.WORDS.length));
    for (const x of d.thresholds) assert.ok(tech.includes(x), x);
    assert.match(read('script.js'), /score >= 1 \? 'high' : score >= 0\.5 \? 'mid' : 'low'/);
  });

  test(`${d.file}: 生存性の表は、想定シナリオ1の記事の文で計算部の survival と全セル同じ。書体名と練習の問題数も実装と同じ`, () => {
    const NEWS = 'Construction work in the city is going well today. Many workers are busy at the new bridge, '
      + 'and good weather is expected for tomorrow.';
    const bits = C.encode('MEET AT NOON', '24').bits;
    assert.ok(section(d.text, d.sec.uses).includes(C.embed(NEWS, bits, 'case').text));
    const sv = C.survival(NEWS, bits, '24');
    const rows = table(section(d.text, d.sec.tech), d.head.survival);
    assert.equal(rows.length, C.ROUTES.length + 1);
    rows.slice(1).forEach(([name, ...cells], i) => {
      assert.equal(name, MESSAGES[lang][`route.${C.ROUTES[i]}`], C.ROUTES[i]);
      assert.deepEqual(cells, sv.methods.map((m) => (m.cells[i].survived ? d.yes : d.no)), C.ROUTES[i]);
    });
    const tech = section(d.text, d.sec.tech);
    assert.ok(tech.includes(`\`${C.FONT_A}\``) && tech.includes(`\`${C.FONT_B}\``));
    assert.ok(tech.includes(d.lab(C.LAB_COUNT)), String(C.LAB_COUNT));
  });

  test(`${d.file}: ほかのツールのゼロ幅方式の表は5行で、例の方式はどれも表にあり、リンクの上限は実装と同じ`, () => {
    const tech = section(d.text, d.sec.tech);
    const rows = table(tech, d.head.schemes);
    assert.deepEqual(rows.map((r) => r[0].split(' ')[0]), ['Bacon', 'Steganographr', '330k', 'StegCloak', lang === 'ja' ? 'タグ文字' : 'Tag']);
    for (const id of C.ZW_SAMPLE_IDS) assert.ok(C.zwSchemes(C.makeZwSample(id)).schemes.some((x) => x.likely), id);
    assert.ok(tech.includes(C.WSI_MAX_URL.toLocaleString('en-US')));
    assert.ok(tech.includes('source=bacon-cipherlab') && tech.includes('#text='));
  });

  test(`${d.file}: CSP・入力の上限は実装と同じ`, () => {
    const csp = read('index.html').match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
    assert.ok(section(d.text, d.sec.security).includes(`\`${csp}\``));
    assert.ok(section(d.text, d.sec.limits).includes(d.max(C.MAX_INPUT)));
  });

  test(`${d.file}: ディレクトリー構造にすべてのファイルとディレクトリーが載り、全行に説明がある`, () => {
    const block = section(d.text, d.sec.tree).match(/```text\n([\s\S]*?)```/)[1];
    const lines = block.split('\n').filter((l) => l.trim()).slice(1);
    const listed = new Set();
    for (const line of lines) {
      const m = line.match(/[├└]── ([^\s#]+)\s+# \S/);
      assert.ok(m, `説明のない行: ${line}`);
      listed.add(m[1].replace(/\/$/, ''));
    }
    const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
      .filter((x) => !['.git', 'node_modules', '.claude'].includes(x.name))
      .flatMap((x) => (x.isDirectory() ? [x.name, ...walk(path.join(dir, x.name))] : [x.name]));
    const all = walk('.');
    for (const name of all) assert.ok(listed.has(name), `ツリーにない: ${name}`);
    for (const name of listed) assert.ok(all.includes(name), `実在しない: ${name}`);
  });
}

test('参考文献の URL は日英で同じ', () => {
  const urls = (d) => [...section(d.text, d.sec.refs).matchAll(/\]\((https:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  assert.deepEqual(urls(DOCS.en), urls(DOCS.ja));
  assert.equal(urls(DOCS.ja).length, 18);
});

test('画像: 参照はすべて実在する。スクリーンショットは日本語版が assets/、英語版が assets/en/ の11枚。どこからも参照しない画像は置かない', () => {
  const refs = {};
  for (const [lang, d] of Object.entries(DOCS)) {
    refs[lang] = [...d.text.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map((m) => m[1]);
    for (const r of refs[lang]) assert.ok(fs.existsSync(path.join(ROOT, r)), r);
    const shots = refs[lang].filter((r) => /screenshot/.test(r));
    assert.equal(shots.length, 11, lang);
    for (const r of shots) {
      assert.match(r, d.shots, r);
      assert.ok(fs.statSync(path.join(ROOT, r)).size <= 300 * 1024, r);
    }
    for (const img of ['assets/bacon-1640-table.jpg', 'assets/bacon-1640-accommodation.jpg', 'assets/bacon-1640-biform.jpg']) {
      assert.ok(refs[lang].includes(img), `${lang} ${img}`);
    }
  }
  const used = new Set([...refs.ja, ...refs.en]);
  const files = (dir) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => /\.(png|jpg)$/.test(f)).map((f) => `${dir}/${f}`);
  for (const f of [...files('assets'), ...files('assets/en')]) assert.ok(used.has(f), `参照していない画像: ${f}`);
});
