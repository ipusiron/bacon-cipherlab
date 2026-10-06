import test from 'node:test';
import assert from 'node:assert/strict';
import { core, seeded } from './load.js';

const C = core();
const cp = (...xs) => String.fromCodePoint(...xs);
const ab = (bits) => C.formatBits(bits, 'ab');

// ベーコンの表（1623年 De Augmentis Scientiarum 第6巻第1章 p.279、1640年英訳 p.266）。原典は U の行がなく V で兼ねる
const BACON_1623 = [
  ['A', 'aaaaa'], ['B', 'aaaab'], ['C', 'aaaba'], ['D', 'aaabb'], ['E', 'aabaa'], ['F', 'aabab'], ['G', 'aabba'], ['H', 'aabbb'],
  ['I', 'abaaa'], ['K', 'abaab'], ['L', 'ababa'], ['M', 'ababb'], ['N', 'abbaa'], ['O', 'abbab'], ['P', 'abbba'], ['Q', 'abbbb'],
  ['R', 'baaaa'], ['S', 'baaab'], ['T', 'baaba'], ['V', 'baabb'], ['W', 'babaa'], ['X', 'babab'], ['Y', 'babba'], ['Z', 'babbb']
];

// 孤立したサロゲート（絵文字が途中で切れた跡）の数
function loneSurrogates(s) {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) i++;
      else n++;
    } else if (c >= 0xdc00 && c <= 0xdfff) n++;
  }
  return n;
}

test('24文字版の表は、ベーコンの原典（1623年）の24行と全部一致する（V は U の行、J は I の行）', () => {
  const rows = C.table('24');
  assert.equal(rows.length, 24);
  BACON_1623.forEach(([letter, code], i) => {
    const want = letter === 'V' ? 'U' : letter;
    assert.equal(rows[i].letter, want, letter);
    assert.equal(ab(rows[i].code), code, letter);
    assert.equal(ab(C.codeOf(letter, '24')), code, letter);
  });
  assert.equal(C.codeOf('J', '24'), C.codeOf('I', '24'));
  assert.equal(C.codeOf('V', '24'), C.codeOf('U', '24'));
  assert.deepEqual(rows.filter((r) => r.label !== r.letter).map((r) => r.label), ['I/J', 'U/V']);
  assert.deepEqual(C.unusedCodes('24'), ['11000', '11001', '11010', '11011', '11100', '11101', '11110', '11111']);
});

test('26文字版は A=00000 から Z=11001 まで、すべての字が別の符号', () => {
  const rows = C.table('26');
  assert.equal(rows.length, 26);
  rows.forEach((r, i) => {
    assert.equal(r.letter, String.fromCharCode(65 + i));
    assert.equal(r.code, i.toString(2).padStart(5, '0'));
    assert.equal(r.label, r.letter);
  });
  assert.deepEqual(C.unusedCodes('26'), ['11010', '11011', '11100', '11101', '11110', '11111']);
  assert.equal(C.codeOf('?', '26'), null);
  assert.equal(C.codeOf('AB', '26'), null);
});

test('ベーコン自身の例: Fuge は F V G E ＝ aabab baabb aabba aabaa（1623年 p.279）', () => {
  const r = C.encode('Fuge', '24');
  assert.equal(r.letters, 'FUGE');
  assert.equal(C.formatBits(r.bits, 'ab', '5'), 'aabab baabb aabba aabaa');
  assert.equal(C.decode(r.bits, '24').text, 'FUGE');
});

test('HELLO と SOS の既知解答（24文字版と26文字版で違う）', () => {
  assert.equal(C.formatBits(C.encode('HELLO', '24').bits, 'ab'), 'aabbbaabaaababaababaabbab');
  assert.equal(C.formatBits(C.encode('HELLO', '26').bits, 'ab'), 'aabbbaabaaababbababbabbba');
  assert.equal(C.formatBits(C.encode('SOS', '24').bits, '01', '5'), '10001 01101 10001');
  assert.equal(C.formatBits(C.encode('SOS', '26').bits, '01', '5'), '10010 01110 10010');
  assert.equal(C.formatBits(C.encode('SOS', '24').bits, 'AB'), 'BAAABABBABBAAAB');
  assert.equal(C.formatBits('0011100100', '01', '10'), '0011100100');
  assert.equal(C.formatBits('001110010011', 'AB', '10'), 'AABBBAABAA BB');
});

test('暗号化は全角英字を半角に、英字以外（空白を除く）を数えて外し、24文字版では J・V の置き換えを数える', () => {
  const r = C.encode('Ｈｉ, Jove! 日本 2026', '24');
  assert.equal(r.letters, 'HIIOUE');
  assert.equal(r.dropped, 8);
  assert.equal(r.merged, 2);
  assert.equal(C.encode('Jove', '26').letters, 'JOVE');
  assert.equal(C.encode('Jove', '26').merged, 0);
  assert.deepEqual(C.encode('', '24'), { letters: '', bits: '', pairs: [], dropped: 0, merged: 0 });
  assert.deepEqual(C.encode('ij uv', '24').pairs.map((p) => p.label), ['I/J', 'I/J', 'U/V', 'U/V']);
});

test('復号: A・a・0 と B・b・1 を読み、空白は飛ばし、全角は半角にする。ほかの文字は数えるか、strict なら止める', () => {
  assert.deepEqual(C.parseCipher('AABBB aabaa 01 ＡＢ'), { ok: true, bits: '001110010001' + '01', invalid: 0, first: null, extras: [] });
  const loose = C.parseCipher('AABBB-AABAA/x');
  assert.equal(loose.ok, true);
  assert.equal(loose.bits, '0011100100');
  assert.equal(loose.invalid, 3);
  assert.deepEqual(loose.first, { ch: '-', index: 6 });
  const strict = C.parseCipher('AABBB-AABAA', { strict: true });
  assert.equal(strict.ok, false);
  assert.deepEqual(strict.first, { ch: '-', index: 6 });
  assert.equal(C.parseCipher('AABBB AABAA\n', { strict: true }).ok, true);
});

test('復号: どの字にも当たらない符号は ? で数え、5に満たない端数を返す', () => {
  const d = C.decode('11111' + '00111' + '11', '26');
  assert.equal(d.text, '?H');
  assert.equal(d.unknown, 1);
  assert.equal(d.remainder, 2);
  assert.deepEqual(d.steps.map((s) => [s.code, s.letter]), [['11111', null], ['00111', 'H']]);
  assert.equal(C.decode('11000', '24').text, '?');
  assert.equal(C.decode('11000', '26').text, 'Y');
  assert.equal(C.decode('10111', '24').text, 'Z');
  assert.equal(C.decode('', '24').text, '');
});

test('フリードマン夫妻の墓碑: セリフの字を大文字にした KnOwledGe Is pOwEr は、24文字版で WFF（末尾の1ビットは余り）', () => {
  const x = C.extractCase('KnOwledGe Is pOwEr');
  assert.equal(C.formatBits(x.bits, 'ab', '5'), 'babaa aabab aabab a');
  const m = C.readMessage(x.bits, '24');
  assert.equal(m.text, 'WFF');
  assert.equal(m.remainder, 1);
  assert.equal(C.readMessage(x.bits, '26').text, 'UFF');
});

test('読み取り: 末尾の「全部 a の組」は余りとして外し、外した数を返す（A で終わる語も戻せる）', () => {
  const bits = C.encode('IDEA', '24').bits + '00000'.repeat(3) + '00';
  const m = C.readMessage(bits, '24');
  assert.equal(m.text, 'IDE');
  assert.equal(m.trimmed, 4);
  assert.equal(m.full, 'IDEAAAA');
  assert.equal(m.remainder, 2);
  assert.equal(C.readMessage(bits, '24', { trim: false }).text, 'IDEAAAA');
  assert.equal(C.readMessage('00000', '24').text, '');
});

test('容量: 大小は ASCII の英字、太字・斜体は空白以外の書記素、ゼロ幅は書記素の数', () => {
  const cover = `Hi ${cp(0x1f953)} é ${cp(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467)}\n日本`;
  assert.equal(C.capacity('case', cover), 2);
  assert.equal(C.capacity('bold', cover), 7);
  assert.equal(C.capacity('italic', cover), 7);
  assert.equal(C.capacity('zw', cover), 11);
  assert.equal(C.capacity('nope', cover), 0);
});

test('埋め込み: ビットがない・容量が足りない・方式が違うときは作らない', () => {
  assert.deepEqual(C.embed('abc', '', 'case'), { ok: false, error: 'noBits', need: 0, supply: 3 });
  assert.deepEqual(C.embed('abc', '0101', 'case'), { ok: false, error: 'short', need: 4, supply: 3 });
  assert.deepEqual(C.embed('abc', '0', 'html'), { ok: false, error: 'method' });
});

test('大小: メッセージの後ろの英字は小文字にそろえる（fillRest=false なら元のまま）', () => {
  const cover = 'This is a Cover TEXT for Bacon.';
  const bits = C.encode('HI', '24').bits;
  const r = C.embed(cover, bits, 'case');
  assert.equal(r.text, 'thIS Is A cover text for bacon.');
  assert.equal(C.readMessage(C.extractCase(r.text).bits, '24').text, 'HI');
  const keep = C.embed(cover, bits, 'case', { fillRest: false });
  assert.equal(keep.text, 'thIS Is A cover TEXT for Bacon.');
  assert.notEqual(C.readMessage(C.extractCase(keep.text).bits, '24').text, 'HI');
});

test('太字・斜体: 空白には印を付けず、続く同じ印はまとめ、HTML はエスケープして b・i で囲む', () => {
  const r = C.embed('ab <c> d', '11010', 'bold');
  assert.deepEqual(r.parts, [{ text: 'ab', mark: true }, { text: ' <', mark: false }, { text: 'c', mark: true }, { text: '> d', mark: false }]);
  assert.equal(r.html, '<b>ab</b> &lt;<b>c</b>&gt; d');
  assert.equal(r.text, 'ab <c> d');
  assert.equal(C.extractRuns(C.runsFromParts(r.parts, 'bold'), 'bold').bits, '110100');
  const i = C.embed('x\ny', '01', 'italic');
  assert.equal(i.html, 'x<br>\n<i>y</i>');
});

test('ゼロ幅: 書記素の後ろに入れ、絵文字・結合文字を壊さない。ゼロ幅を取り除くと元の文に戻る', () => {
  const cover = `I ${cp(0x1f953)} bacon ${cp(0x1f1ef, 0x1f1f5)} e${cp(0x301)} ${cp(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467)}!`;
  const bits = C.encode('HI', '24').bits;
  const r = C.embed(cover, bits, 'zw');
  assert.equal(loneSurrogates(r.text), 0);
  assert.equal(r.text.split(C.ZW_A).join('').split(C.ZW_B).join(''), cover);
  assert.equal(C.extractZw(r.text).bits, bits);
  assert.equal(C.graphemes(r.text.split(C.ZW_A).join('').split(C.ZW_B).join('')).length, C.graphemes(cover).length);
});

test('ゼロ幅の抽出は数値文字参照も読み、ほかのツールのゼロ幅（ZWJ・WORD JOINER・BOM）は数だけ返す', () => {
  const x = C.extractZw(`a&#x200B;b&#8204;c${String.fromCharCode(0x200d)}d${String.fromCharCode(0x2060)}`);
  assert.equal(x.bits, '01');
  assert.equal(x.other, 2);
});

test('往復: 5方式 × 2版 × 乱数のメッセージで、埋め込んで抽出すると同じメッセージに戻る', () => {
  const rnd = seeded(55);
  const covers = [
    'The quick brown fox jumps over the lazy dog. '.repeat(12),
    `今日は良い天気ですね。散歩でもしませんか？ ${cp(0x1f953)} Bacon and eggs! `.repeat(10)
  ];
  let n = 0;
  for (const variant of ['24', '26']) {
    const letters = C.alphabet(variant);
    for (let k = 0; k < 20; k++) {
      let msg = '';
      const len = 1 + rnd(8);
      for (let j = 0; j < len; j++) msg += letters[rnd(letters.length)];
      if (msg.endsWith('A')) msg += 'Z';
      const bits = C.encode(msg, variant).bits;
      for (const method of C.METHODS) {
        for (const cover of covers) {
          if (method === 'case' && cover === covers[1]) continue;
          const r = C.embed(cover, bits, method);
          assert.equal(r.ok, true, `${method} ${msg}`);
          assert.equal(loneSurrogates(r.text), 0);
          const x = method === 'case' ? C.extractCase(r.text)
            : method === 'zw' ? C.extractZw(r.text)
              : C.extractRuns(C.runsFromParts(r.parts, method), method);
          assert.equal(C.readMessage(x.bits, variant).text, msg, `${variant} ${method} ${msg}`);
          n++;
        }
      }
    }
  }
  assert.equal(n, 2 * 20 * 9);
});

// runs を「印の付いた字」の a/b 列にする（空白以外）
const marks = (runs, key) => runs.map((r) => [...r.text].filter((c) => !/\s/.test(c)).map(() => (r[key] ? 'b' : 'a')).join('')).join('');

test('HTML の読み取り: b・strong・i・em・class・style（Word・Google ドキュメントの書き方）', () => {
  const word = "<p class=MsoNormal><b style='mso-bidi-font-weight:normal'>K</b>n<b>O</b>wl e<span style=\"font-weight:700\">d</span>Ge "
    + '<b style="font-weight:normal">I</b>s <strong>p</strong><span class="x bacon-bold">O</span>w<span style="color:red;font-weight: bolder">E</span>r</p>';
  assert.equal(marks(C.runsFromHtml(word), 'bold'), 'babaaabaaaabbaba');
  const it = '<em>a</em>b<i>c<span style="font-style:normal">d</span></i><span style="font-style: oblique">e</span><span class="bacon-italic">f</span>';
  assert.equal(marks(C.runsFromHtml(it), 'italic'), 'bababb');
  assert.equal(marks(C.runsFromHtml('<b>x<i>y</i></b>z'), 'italic'), 'aba');
});

test('HTML の読み取り: 文字参照・コメント・script や style の中身・閉じ忘れ・タグでない「<」', () => {
  const runs = C.runsFromHtml('A&amp;B&#x41;&#66;&nbsp;&bogus;<!-- <b>no</b> --><script>var b="<b>x</b>"</script><style>b{}</style>'
    + '<b>bold<br>still</p>end</b> 1 < 2 <i/>x<img src=x alt="<b>">');
  assert.equal(runs.map((r) => r.text).join(''), `A&BAB${String.fromCharCode(0xa0)}&bogus;bold\nstillend 1 < 2 x`);
  assert.deepEqual(runs.filter((r) => r.bold).map((r) => r.text), ['bold', '\n', 'still', 'end']);
  assert.equal(C.decodeEntities('&#xD800;&#0;&#x1F953;'), `&#xD800;&#0;${cp(0x1f953)}`);
});

test('HTML の読み取り: 埋め込みの HTML（b・i と <br>）をそのまま読み戻せる', () => {
  for (const method of ['bold', 'italic']) {
    const bits = C.encode('Fuge', '24').bits;
    const r = C.embed('Manere te volo\ndonec venero <script> & more letters here', bits, method);
    const x = C.extractRuns(C.runsFromHtml(r.html), method);
    assert.equal(C.readMessage(x.bits, '24').text, 'FUGE', method);
  }
});

test('ダウンロード用の HTML 文書は、題名をエスケープし、スクリプトを含まない', () => {
  const doc = C.htmlDocument('<b>x</b>', { lang: 'en', title: '<script>' });
  assert.match(doc, /^<!DOCTYPE html>\n<html lang="en">/);
  assert.match(doc, /<title>&lt;script&gt;<\/title>/);
  assert.doesNotMatch(doc, /<script/);
  assert.match(C.htmlDocument('', { lang: 'fr' }), /<html lang="ja">/);
});

test('反転は 0 と 1 を入れ替える', () => {
  assert.equal(C.invertBits('00101'), '11010');
  assert.equal(C.invertBits(''), '');
});

// ===== 第2弾: 解読の補助 =====

test('英語の文字の出現頻度は26字そろい、Wikipedia の表（Lewand）と同じ値。英単語の一覧は3字以上の大文字で重ならない', () => {
  assert.equal(Object.keys(C.FREQ).length, 26);
  assert.deepEqual([C.FREQ.E, C.FREQ.T, C.FREQ.Z, C.FREQ.J], [12.7, 9.1, 0.074, 0.16]);
  assert.ok(C.WORDS.length >= 200, String(C.WORDS.length));
  for (const w of C.WORDS) assert.match(w, /^[A-Z]{3,}$/, w);
  assert.equal(new Set(C.WORDS).size, C.WORDS.length);
});

test('1ビット違いの候補: 範囲外の符号から、どれかの字に当たる符号を出す', () => {
  assert.deepEqual(C.nearLetters('11101', '24'), ['O', 'X']);
  assert.deepEqual(C.nearLetters('11000', '24'), ['I', 'R']);
  assert.deepEqual(C.nearLetters('11111', '24'), ['Q', 'Z']);
  assert.deepEqual(C.nearLetters('11010', '26'), ['K', 'S', 'Y']);
});

test('復号の読み: 候補つきの読みと、英単語の一覧での読み替え（24文字版の V と、? の候補）', () => {
  const love = C.readCipher('ababa abbab baabb aabaa', '24');
  assert.equal(love.text, 'LOUE');
  assert.equal(love.annotated, 'LO[U/V]E');
  assert.equal(love.resolved, 'LOVE');
  const bacon = C.readCipher('aaaab aaaaa aaaba bbbab abbaa', '24');
  assert.equal(bacon.text, 'BAC?N');
  assert.equal(bacon.annotated, 'BAC[O/X]N');
  assert.equal(bacon.resolved, 'BACON');
  assert.deepEqual(bacon.words, ['BACON']);
  assert.equal(C.readCipher('aabbb abaaa', '26').annotated, 'HI');
});

test('復号の読み: ずれ（0〜4、範囲の外は丸める）と a・b の入れ替え', () => {
  const bits = C.formatBits(C.encode('Dawn', '24').bits, 'ab', '5');
  assert.equal(C.readCipher(`ba ${bits}`, '24', { offset: 2 }).text, 'DAWN');
  assert.equal(C.readCipher(`ba ${bits}`, '24', { offset: 9 }).offset, 4);
  assert.equal(C.readCipher(`ba ${bits}`, '24', { offset: -1 }).offset, 0);
  const inv = C.formatBits(C.invertBits(C.encode('Dawn', '24').bits), 'ab', '5');
  assert.equal(C.readCipher(inv, '24', { invert: true }).text, 'DAWN');
});

test('復号の読み: a/b 以外の文字を元の位置に残す（a/b の字の暗号文では数字の 0・1 も残す）', () => {
  const r = C.readCipher('aaaab 4 aaaba abbab 1 abbaa _ aaaaa', '24', { keep: true });
  assert.equal(r.text, 'B4CO1N_A');
  assert.equal(r.kept, 3);
  assert.equal(r.invalid, 0);
  // 0/1 で書いた暗号文では 0・1 は記号のまま。ほかの記号だけ残す
  assert.equal(C.readCipher('00001-00000', '24', { keep: true }).text, 'B-A');
  // 組の途中の文字は、その組を読んだ後ろに置く
  assert.equal(C.readCipher('aa!aab', '24', { keep: true }).text, 'B!');
  // keep のときは strict でも止めない
  assert.equal(C.readCipher('aaaab#', '24', { keep: true, strict: true }).ok, true);
});

test('英語らしさの採点: 英語の文は乱れた文より高く、1つの字に偏った文と ? の多い文は低い', () => {
  const s = (x) => C.englishScore(x, '24').score;
  assert.ok(s('MEETATNOON') > s('QZXKWYPQVZ'));
  assert.ok(s('MEETATNOON') > s('AAAAAAAAAB'));
  assert.ok(s('MEETATNOON') > s('M??TAT??ON'));
  assert.deepEqual(C.englishScore('THEFLAGISBACON', '24').words, ['THE', 'FLAG', 'BACON']);
  assert.equal(C.englishScore('', '24').score, -99);
});

test('読み方: 記号・大小・A〜M/N〜Z・単語の頭文字・子音と母音・2種類の記号・太字・斜体・ゼロ幅を、0 と 1 の両方があるときだけ出す', () => {
  const ids = (x) => C.readings(x).map((r) => r.id);
  assert.deepEqual(ids('aabbb aabaa'), ['symbols']);
  assert.deepEqual(ids('KnOwledGe Is pOwEr'), ['case', 'half', 'vowel']);
  assert.ok(ids('<b>Kn</b>ow<i>le</i>dge').includes('bold') && ids('<b>Kn</b>ow<i>le</i>dge').includes('italic'));
  assert.ok(ids(C.makeSample('zw')).includes('zw'));
  const two = C.readings(C.makeSample('emoji')).find((r) => r.id === 'two');
  assert.deepEqual([two.a, two.b], [cp(0x1f373), cp(0x1f953)]);
  assert.deepEqual(ids('all lower case words here only'), ['half', 'word', 'vowel']);
  assert.deepEqual(ids('abc'), []);
});

test('総当たり: 解析タブの例は、どれも正しい読み方・版・ずれ・入れ替えが1位になる', () => {
  const want = {
    case: ['THEFLAGISBACON', 'case', '24', false, 0],
    shift: ['ATTACKATDAWN', 'symbols', '24', false, 2],
    emoji: ['BACONANDEGGS', 'two', '26', false, 0],
    word: ['STOP', 'word', '24', false, 0],
    zw: ['MEETATNOON', 'zw', '24', false, 0]
  };
  for (const id of C.SAMPLE_IDS) {
    const top = C.solve(C.makeSample(id)).candidates[0];
    assert.deepEqual([top.text, top.reading, top.variant, top.invert, top.offset], want[id], id);
    assert.ok(top.score >= 1, `${id}: ${top.score}`);
  }
});

test('総当たり: a と b を入れ替えた暗号文と、24文字版の V を含む文', () => {
  const inv = C.formatBits(C.invertBits(C.encode('Meet at the bridge', '24').bits), 'AB', '5');
  const top = C.solve(inv).candidates[0];
  assert.deepEqual([top.text, top.invert], ['MEETATTHEBRIDGE', true]);
  const love = C.solve(C.formatBits(C.encode('I love bacon', '24').bits, 'AB', '5')).candidates[0];
  assert.deepEqual([love.text, love.resolved], ['ILOUEBACON', 'ILOVEBACON']);
});

test('総当たり: 何も隠していない文と読み方のない文', () => {
  const plain = C.solve('The quick brown fox jumps over the lazy dog. Nothing is hidden in this sentence at all, I promise.');
  assert.ok(plain.candidates[0].score < 1, String(plain.candidates[0].score));
  assert.deepEqual(C.solve('12345 !!!').candidates, []);
  assert.equal(C.solve('aabbb aabaa').tried, 20);
});

// ===== 第3弾: 二書体・生存性・練習 =====

test('二書体: 書体名の並びの最初の名前でセリフか決める（sans-serif を先に見る）', () => {
  assert.equal(C.serifOf('"Times New Roman", serif'), true);
  assert.equal(C.serifOf("Georgia, 'Times New Roman', Times, serif"), true);
  assert.equal(C.serifOf('Arial, sans-serif'), false);
  assert.equal(C.serifOf('sans-serif'), false);
  assert.equal(C.serifOf('游明朝, serif'), true);
  assert.equal(C.serifOf('Meiryo'), false);
  assert.equal(C.serifOf('monospace'), null);
  assert.equal(C.serifOf(''), null);
});

test('二書体: 埋め込みの HTML は、全体をサンセリフ、b の字をセリフの span にし、読み戻せる', () => {
  const bits = C.encode('Fuge', '24').bits;
  const r = C.embed('Manere te volo donec venero, my friend', bits, 'font');
  assert.ok(r.html.startsWith(`<span style="font-family: ${C.FONT_A}">`));
  assert.ok(r.html.includes(`<span style="font-family: ${C.FONT_B}">`));
  assert.equal(C.readMessage(C.extractRuns(C.runsFromHtml(r.html), 'font').bits, '24').text, 'FUGE');
  assert.equal(C.capacity('font', 'ab cd'), 4);
});

test('二書体: Word の書き出し（Times New Roman・Arial）と font の face も読む。書体の指定がない字は親の書体を引き継ぐ', () => {
  const word = '<p class=MsoNormal><span style=\'font-family:"Times New Roman",serif\'>K</span><span style=\'font-family:Arial,sans-serif\'>n'
    + '<b>o</b></span><font face="Georgia">w</font>le</p>';
  const runs = C.runsFromHtml(word);
  assert.equal(marks(runs, 'serif'), 'baabaa');
  assert.deepEqual(C.readings(word).map((x) => x.id).includes('font'), true);
  assert.deepEqual(runs.filter((x) => x.serif === null).map((x) => x.text), ['le']);
});

test('生存性: 5方式 × 8経路の表（大小は大文字・小文字にそろえると消え、装飾はプレーンテキストで消え、ゼロ幅は不可視の文字の除去で消える）', () => {
  const cover = 'Construction work in the city is going well today. Many workers are busy at the new bridge, and good weather is expected.';
  const r = C.survival(cover, C.encode('Meet at noon', '24').bits, '24');
  assert.equal(r.want, 'MEETATNOON');
  assert.deepEqual(r.methods.map((m) => m.method), C.METHODS);
  const table = Object.fromEntries(r.methods.map((m) => [m.method, m.cells.map((c) => (c.survived ? 'Y' : 'n')).join('')]));
  assert.deepEqual(C.ROUTES, ['html', 'plain', 'nfkc', 'ignorable', 'upper', 'lower', 'nfkccf', 'space']);
  assert.deepEqual(table, { case: 'YYYYnnnY', bold: 'YnYYYYYY', italic: 'YnYYYYYY', font: 'YnYYYYYY', zw: 'YYYnYYnY' });
});

test('生存性: 埋め込めない方式は ok=false で理由を返し、大小で後ろをそろえないと HTML のままでも読み違える', () => {
  const r = C.survival('abc de', C.encode('Hi', '24').bits, '24');
  assert.ok(r.methods.every((m) => !m.ok && m.error === 'short'));
  const keep = C.survival('This is a Cover TEXT for Bacon.', C.encode('Hi', '24').bits, '24', { fillRest: false });
  assert.equal(keep.methods[0].cells[0].survived, false);
});

test('経路: NFKC は全角を半角に、不可視の文字の除去はゼロ幅文字と ZWJ を消し、空白はまとめる', () => {
  assert.equal(C.route('nfkc', 'ＡＢ'), 'AB');
  assert.equal(C.route('ignorable', `a${C.ZW_A}b${C.ZW_B}c${String.fromCharCode(0x200d)}d`), 'abcd');
  assert.equal(C.route('space', 'a  b\n\nc'), 'a b c');
  assert.equal(C.route('plain', '<b>x</b>&amp;y'), 'x&amp;y');
  assert.equal(C.route('html', '<b>x</b>'), '<b>x</b>');
});

test('二書体の練習: 0番は墓碑（答え WFF、16字）、ほかは練習の問題で、答えは隠した語。番号は回る', () => {
  const tomb = C.labProblem(0);
  assert.equal(tomb.cover, 'KNOWLEDGE IS POWER');
  assert.equal(tomb.letters, 16);
  assert.equal(tomb.answer, 'WFF');
  assert.equal(tomb.tokens.filter((x) => !x.space && x.b).map((x) => x.ch).join(''), 'KOGIOE');
  const answers = [];
  for (let i = 1; i < C.LAB_COUNT; i++) {
    const p = C.labProblem(i);
    assert.ok(p.letters >= p.answer.length * 5, `${i}`);
    assert.ok(/^[A-Z ]+$/.test(p.cover), p.cover);
    answers.push(p.answer);
  }
  assert.deepEqual(answers, ['SPY', 'FLEE', 'HIDE', 'RUN', 'YES', 'HELP', 'GOLD', 'DAWN', 'NOON', 'SAFE', 'WAIT', 'KEY']);
  assert.equal(C.labProblem(C.LAB_COUNT).index, 0);
  assert.equal(C.labProblem(-1).index, C.LAB_COUNT - 1);
});
