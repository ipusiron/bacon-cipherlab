import test from 'node:test';
import assert from 'node:assert/strict';
import { read, load, core } from './load.js';

const { MESSAGES, t } = load('js/messages.js').BaconMessages;
const C = core();
// かな・カタカナ・漢字・全角の記号
const JAPANESE = new RegExp('[' + [[0x3000, 0x303f], [0x3040, 0x30ff], [0x3400, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCharCode(a) + '-' + String.fromCharCode(b)).join('') + ']');

const placeholders = (s) => [...s.matchAll(/\{([a-zA-Z0-9]+)\}/g)].map((m) => m[1]).sort();

test('日本語と英語の辞書は同じキーを持ち、置き場所 {name} と太字の数もそろう', () => {
  assert.deepEqual(Object.keys(MESSAGES.en).sort(), Object.keys(MESSAGES.ja).sort());
  assert.ok(Object.keys(MESSAGES.ja).length >= 100, String(Object.keys(MESSAGES.ja).length));
  for (const k of Object.keys(MESSAGES.ja)) {
    assert.deepEqual(placeholders(MESSAGES.en[k]), placeholders(MESSAGES.ja[k]), k);
    for (const lang of ['ja', 'en']) assert.equal((MESSAGES[lang][k].match(/\*\*/g) || []).length % 2, 0, `${lang} ${k}`);
  }
});

test('英語の辞書に日本語の文字がない（言語の切り替えボタンの「日本語」を除く）', () => {
  for (const [k, v] of Object.entries(MESSAGES.en)) {
    if (k === 'ui.langButton' || k === 'ui.langLabel') continue;
    assert.doesNotMatch(v, JAPANESE, k);
  }
});

test('日本語の文言は、日本語と英数字のあいだに半角空白を入れない。長音をそろえ、「わかる」はひらがな', () => {
  const bad = new RegExp(`(${JAPANESE.source} [A-Za-z0-9(])|([A-Za-z0-9)] ${JAPANESE.source})`);
  for (const [k, v] of Object.entries(MESSAGES.ja)) {
    assert.doesNotMatch(v, bad, k);
    assert.doesNotMatch(v, /ブラウザ(?!ー)|フォルダ(?!ー)|リポジトリ(?!ー)|ディレクトリ(?!ー)|サーバ(?!ー)|エディタ(?!ー)/, k);
    // 「わかる」はひらがな、「分ける・分かれる」は漢字
    assert.doesNotMatch(v, /(?<![自0-9０-９])分か(?!れ)/, k);
    // 日本語の後ろのコロンは全角にする
    assert.doesNotMatch(v, new RegExp(`${JAPANESE.source}:`), k);
  }
});

test('画面のスクリプトが使う文言のキーは、すべて辞書にある（方式・版・ヒントのキーも）', () => {
  const src = read('script.js');
  const keys = new Set([...src.matchAll(/\bt\('([a-zA-Z0-9.]+)'/g)].map((m) => m[1]));
  for (const m of src.matchAll(/key: '([a-zA-Z0-9.]+)'/g)) keys.add(m[1]);
  assert.ok(keys.size >= 25, String(keys.size));
  for (const m of C.METHODS) keys.add(`embed.hint.${m}`).add(`method.${m}`);
  for (const v of C.VARIANTS) keys.add(`variant.${v}`);
  for (const r of C.READINGS) keys.add(`reading.${r}`);
  for (const id of C.SAMPLE_IDS) keys.add(`sample.${id}`);
  for (const c of ['high', 'mid', 'low']) keys.add(`solve.conf.${c}`);
  for (const k of keys) for (const lang of ['ja', 'en']) assert.ok(MESSAGES[lang][k] !== undefined, `${lang} ${k}`);
});

test('文言に書いた数と記号は、計算部と同じ（ゼロ幅の符号位置・使わない符号）', () => {
  assert.equal(C.ZW_A.charCodeAt(0), 0x200b);
  assert.equal(C.ZW_B.charCodeAt(0), 0x200c);
  for (const lang of ['ja', 'en']) {
    assert.match(MESSAGES[lang]['method.zw'], /U\+200B.*U\+200C/);
    assert.match(MESSAGES[lang]['table.lead'], /I.*J.*U.*V/);
    assert.match(MESSAGES[lang]['encode.merged'], /J.*I.*V.*U/);
  }
  assert.deepEqual([C.unusedCodes('24')[0], C.unusedCodes('26')[0]], ['11000', '11010']);
});

test('t は {name} を置き換え、ない鍵はキーをそのまま返す', () => {
  assert.equal(t('encode.stat', { letters: 4, bits: 20, variant: t('variant.24', {}, 'ja') }, 'ja'), '英字4文字 → 20ビット（24文字版）。');
  assert.equal(t('encode.stat', { letters: 4, bits: 20, variant: t('variant.24', {}, 'en') }, 'en'), '4 letter(s) → 20 bit(s) (24-letter variant).');
  assert.equal(t('no.such.key', {}, 'ja'), 'no.such.key');
});
