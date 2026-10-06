import test from 'node:test';
import assert from 'node:assert/strict';
import { read, load } from './load.js';

const html = read('index.html');
const { MESSAGES, t } = load('js/messages.js').BaconMessages;
const { parseVars } = load('js/i18n.js').BaconI18n;
const SCRIPTS = ['script.js', 'js/bacon-core.js', 'js/messages.js', 'js/i18n.js', 'js/theme.js', 'js/theme-init.js'];
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const TABS = ['encode', 'decode', 'embed', 'extract', 'solve', 'biform', 'table'];

test('CSP はスクリプト・スタイルを同じ場所のファイルだけに限り、unsafe-inline と外部の通信を許さない', () => {
  const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
  assert.equal(csp, "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
    + "connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
  assert.doesNotMatch(csp, /frame-ancestors/);
  // meta では効かないヘッダー（X-Content-Type-Options・X-Frame-Options・X-XSS-Protection）を書かない
  assert.doesNotMatch(html, /X-Content-Type-Options|X-Frame-Options|X-XSS-Protection/i);
  assert.equal((html.match(/http-equiv=/g) || []).length, 1);
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<link rel="icon" href="data:,">/);
  assert.match(html, /<noscript>/);
});

test('HTML に style 属性・インラインのスクリプト・イベントハンドラーがない。外部リンクは noopener noreferrer', () => {
  assert.doesNotMatch(html, /\sstyle=/);
  assert.doesNotMatch(html, /\son[a-z]+=/i);
  const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.deepEqual(scripts, ['js/theme-init.js', 'js/bacon-core.js', 'js/messages.js', 'js/i18n.js', 'js/theme.js', 'script.js']);
  assert.equal((html.match(/<script/g) || []).length, scripts.length);
  for (const a of html.match(/<a [^>]*>/g)) assert.match(a, /target="_blank" rel="noopener noreferrer"/, a);
});

test('タブは WAI-ARIA の形（tablist の中はタブだけ、aria-controls の先が実在、最初のタブだけ選択）', () => {
  const nav = html.match(/<nav class="tabs" role="tablist"[\s\S]*?<\/nav>/)[0];
  assert.equal((nav.match(/<button/g) || []).length, TABS.length);
  const tabs = [...nav.matchAll(/role="tab" id="(tab-[a-z]+)" data-tab="([a-z]+)" aria-controls="(panel-[a-z]+)" aria-selected="(true|false)"/g)];
  assert.deepEqual(tabs.map((m) => [m[2], m[4]]), TABS.map((k, i) => [k, i === 0 ? 'true' : 'false']));
  for (const [, id, , panel, selected] of tabs) {
    const tag = html.match(new RegExp(`<section [^>]*id="${panel}"[^>]*>`))[0];
    assert.match(tag, new RegExp(`role="tabpanel" aria-labelledby="${id}"`), panel);
    assert.equal(/\shidden/.test(tag), selected === 'false', panel);
  }
  // aria-labelledby の参照先はすべて実在する
  for (const m of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(ids.has(m[1]), m[1]);
});

test('ボタンは type="button"。入力欄には label があり、暗号文・カバーの欄はスペルチェックを切る', () => {
  for (const b of html.match(/<button[^>]*>/g)) assert.match(b, /type="button"/, b);
  for (const m of html.matchAll(/<(textarea|select|input) [^>]*id="([^"]+)"/g)) {
    assert.match(html, new RegExp(`<label [^>]*for="${m[2]}"`), m[2]);
  }
  for (const id of ['enc-plain', 'enc-out', 'dec-in', 'dec-out', 'dec-annot', 'embed-cover', 'embed-msg', 'extract-in', 'extract-msg', 'extract-bits',
    'solve-in']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*spellcheck="false"`), id);
  }
});

test('結果の知らせの欄には aria-live がある', () => {
  for (const id of ['enc-status', 'dec-status', 'embed-status', 'embed-hint', 'extract-status', 'solve-status', 'lab-status', 'route-status',
    'table-status']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*aria-live="polite"`), id);
  }
});

test('版・方式の選択肢は計算部と同じ値で、どのタブでも同じ並び', () => {
  const C = load('js/bacon-core.js').BaconCore;
  for (const id of ['enc-variant', 'dec-variant', 'embed-variant', 'extract-variant', 'table-variant']) {
    const sel = html.match(new RegExp(`<select id="${id}"[\\s\\S]*?</select>`))[0];
    assert.deepEqual([...sel.matchAll(/value="([^"]+)"/g)].map((m) => m[1]), C.VARIANTS, id);
  }
  for (const id of ['embed-method', 'extract-method']) {
    const sel = html.match(new RegExp(`<select id="${id}"[\\s\\S]*?</select>`))[0];
    assert.deepEqual([...sel.matchAll(/value="([^"]+)"/g)].map((m) => m[1]), C.METHODS, id);
  }
});

// 文言の太字（**）と改行（\n）は HTML の strong と br に当たる。HTML 側のタグを外して比べる
const plain = (s) => s.replace(/\n\s*/g, '').replace(/<br>/g, '\n').replace(/<[^>]+>/g, '')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').trim();
const fromDict = (s) => s.replace(/\*\*/g, '');

test('data-i18n のキーは辞書にあり、HTML に書いた日本語は辞書の日本語と同じ', () => {
  let n = 0;
  for (const m of html.matchAll(/<([a-z0-9]+)([^>]*?)data-i18n="([^"]+)"([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const key = m[3];
    assert.ok(MESSAGES.ja[key] !== undefined, key);
    const vars = parseVars(((m[2] + m[4]).match(/data-i18n-vars="([^"]*)"/) || [])[1]);
    assert.equal(plain(m[5]), fromDict(t(key, vars, 'ja')), key);
    n++;
  }
  assert.ok(n >= 60, String(n));
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(';')) assert.ok(MESSAGES.ja[pair.split(':')[1]] !== undefined, pair);
  }
});

test('画面のスクリプトが参照する id は、すべて HTML にある', () => {
  const src = read('script.js');
  const used = [...src.matchAll(/\$\('([a-z0-9-]+)'\)/g)].map((m) => m[1]);
  assert.ok(used.length >= 40, String(used.length));
  for (const id of used) assert.ok(ids.has(id), id);
  for (const m of src.matchAll(/(?:show|note)\('([a-z-]+)'/g)) assert.ok(ids.has(m[1]), m[1]);
  for (const k of TABS) assert.ok(ids.has(`tab-${k}`) && ids.has(`panel-${k}`), k);
});

test('JS は innerHTML・eval・DOMParser を使わず、style を書き換えない。document 全体の keydown を拾わない', () => {
  for (const f of SCRIPTS) {
    const src = read(f);
    assert.doesNotMatch(src, /innerHTML|outerHTML|insertAdjacentHTML|DOMParser|\beval\(|new Function|document\.write/, f);
    assert.doesNotMatch(src, /\.style\b|setAttribute\('style'|cssText/, f);
    assert.doesNotMatch(src, /console\.(log|debug|info|error|warn)/, f);
    assert.doesNotMatch(src, /document\.addEventListener\('keydown'/, f);
    assert.doesNotMatch(src, /sessionStorage|Math\.random|fetch\(|XMLHttpRequest/, f);
  }
});

test('localStorage は try で囲んで読み書きする（使えない環境でも画面が止まらない）', () => {
  let total = 0;
  for (const f of SCRIPTS.filter((x) => x !== 'js/messages.js')) {
    const src = read(f);
    const uses = (src.match(/localStorage\./g) || []).length;
    const guarded = [...src.matchAll(/try \{\s*(?:const [a-z]+ = |return )?localStorage\./g)].length;
    assert.equal(guarded, uses, f);
    total += uses;
  }
  assert.equal(total, 4);
});

test('ダウンロードは、テキストを text/plain、埋め込みを text/html（計算部の htmlDocument）で作る', () => {
  const src = read('script.js');
  const types = [...src.matchAll(/download\('([^']+)', [^;]*?, '([^']+)'\)/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(types, [['bacon-encrypt.txt', 'text/plain;charset=utf-8'], ['bacon-decrypt.txt', 'text/plain;charset=utf-8'],
    ['bacon-embed.html', 'text/html;charset=utf-8']]);
  assert.match(src, /download\('bacon-embed\.html', C\.htmlDocument\(lastEmbed\.html, \{ lang: I\.lang \}\)/);
  assert.equal((src.match(/new Blob\(/g) || []).length, 1);
});

test('コピーは失敗を知らせる（then の第2引数と catch）', () => {
  const src = read('script.js');
  assert.match(src, /navigator\.clipboard\.writeText\(text\)\.then\(\(\) => note\(statusId, okItem\), fail\)/);
  assert.match(src, /catch \{\s*fail\(\);/);
  assert.equal((src.match(/navigator\.clipboard\.writeText\(/g) || []).length, 1);
});

test('解析タブの例の選択肢は計算部の例と同じ順。復号タブのずれは0〜4', () => {
  const C = load('js/bacon-core.js').BaconCore;
  const sel = html.match(/<select id="solve-sample"[\s\S]*?<\/select>/)[0];
  assert.deepEqual([...sel.matchAll(/value="([^"]+)"/g)].map((m) => m[1]), C.SAMPLE_IDS);
  const off = html.match(/<select id="dec-offset"[\s\S]*?<\/select>/)[0];
  assert.deepEqual([...off.matchAll(/value="([^"]+)"/g)].map((m) => m[1]), ['0', '1', '2', '3', '4']);
});

test('画面の画像は assets/ にあり、大きさと代替テキストを持つ。二書体の書体は計算部と CSS で同じ並び', () => {
  const fs = { existsSync: (f) => { try { read(f); return true; } catch { return false; } } };
  const imgs = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
  assert.equal(imgs.length, 1);
  for (const img of imgs) {
    const src = img.match(/src="([^"]+)"/)[1];
    assert.match(src, /^assets\/[a-z0-9-]+\.jpg$/);
    assert.ok(fs.existsSync(src), src);
    assert.match(img, /width="\d+" height="\d+"/);
    assert.match(img, /data-i18n-attr="alt:biform\.plateAlt"/);
  }
  const C = load('js/bacon-core.js').BaconCore;
  const css = read('style.css');
  assert.ok(css.includes(`.form-a { font-family: ${C.FONT_A}; }`));
  assert.ok(css.includes(`.form-b { font-family: ${C.FONT_B}; }`));
});
