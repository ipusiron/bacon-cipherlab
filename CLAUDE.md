# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bacon CipherLab is an educational web tool for Bacon's cipher. It converts between plaintext and five-symbol a/b codes (the 24-letter table Bacon published in 1623, and the later 26-letter variant), hides the a/b symbols in a cover text (case, bold, italic, two typefaces, zero-width characters) and reads them back, compares which methods survive common processing, offers a biform (two-typeface) practice, identifies other tools' zero-width methods and hands text to WeirdString Inspector, and helps solve unknown texts (offsets, swaps, one-bit candidates, trying every reading), all without network access.

## Architecture

Client-side only, no build step, no dependencies. Scripts are classic scripts (not ES modules) so that `index.html` also works from `file://`. Each script puts one object on `globalThis`.

- `index.html` - Seven tabs (Encrypt / Decrypt / Embed / Extract / Solve / Biform / Table) using the WAI-ARIA tab pattern. Meta CSP with `style-src 'self'` and `connect-src 'none'`
- `js/bacon-core.js` (`BaconCore`) - DOM-free logic
  - `table()` / `codeOf()` / `letterOf()`: the 24-letter table is Bacon's (`ABCDEFGHIKLMNOPQRSTUWXYZ`, J→I, V→U, labels `I/J` and `U/V`); the 26-letter table is A..Z. Code = index in 5-bit binary (a=0, b=1)
  - `encode()`: NFKC, ASCII letters only; returns counts of dropped characters and J/V merges. `parseCipher()` / `decode()`: a/A/0 and b/B/1, spaces skipped; other characters are counted or stop parsing (`strict`); remainder bits and out-of-range codes (`?`) are reported
  - `embed()`: methods `case` (ASCII letters), `bold` / `italic` / `font` (non-space graphemes; `parts` with marks, `html` with `<b>`/`<i>` or `font-family` spans using `FONT_A` (sans-serif = a) and `FONT_B` (serif = b)), `zw` (U+200B = a, U+200C = b after each grapheme, via `Intl.Segmenter`). Case fills letters after the message with lowercase (`fillRest`)
  - `extractCase()` / `extractZw()` / `extractRuns()`; `runsFromHtml()` reads HTML tokens without the DOM (b/strong/i/em, `bacon-bold`/`bacon-italic` classes, `font-weight`/`font-style`, `font-family` and `<font face>` via `serifOf()`; skips script/style/comments). `readMessage()` drops trailing all-a groups as padding
  - `readCipher()`: decrypt with `offset` (0-4), `invert`, `keep` (non-symbol characters stay in place; in a/b-letter ciphertext, digits 0/1 are kept too). Returns `annotated` ([I/J], [U/V], one-bit candidates such as [O/X]) and `resolved` (J/V and `?` filled in from `WORDS`)
  - `englishScore()`: mean log-likelihood per letter under `FREQ` (Wikipedia Letter frequency, Lewand 2000) vs uniform + 1.2 × word coverage − 2 × `?` share − bias toward one letter. `cover()` is the word-coverage DP
  - `readings()` / `solve()`: readings (symbols, case, A–M/N–Z, first letters of words, consonant/vowel, two symbols, bold, italic, zero-width; inverted duplicates removed) × variant × invert × offset 0-4; `makeSample()` builds the Solve tab examples, each of which must rank first
  - `survival()` / `route()`: embeds with every method, passes the HTML through `ROUTES` (html, plain, nfkc, ignorable, upper, lower, nfkccf, space) and checks the round trip
  - `invisibles()` / `zwSchemes()`: counts invisible characters (UCD names; emoji ZWJ and variation selectors excluded; tag characters grouped) and identifies Bacon CipherLab, Steganographr (decoded), 330k default chars (decoded), StegCloak (identified only) and tag characters (decoded). `wsiLink()` builds the `#text=` link to WeirdString Inspector (Day023), disabled above `WSI_MAX_URL` or for lone surrogates
  - `labProblem(i)`: Biform practice problems (0 = the Friedman tombstone recreated, answer WFF); `.form-a` / `.form-b` in `style.css` must match `FONT_A` / `FONT_B`
- `js/messages.js` (`BaconMessages`) and `js/i18n.js` (`BaconI18n`) - Japanese/English dictionaries and static text replacement (`data-i18n`, `data-i18n-attr`). Language: `?lang=` → saved choice → browser language
- `js/theme-init.js`, `js/theme.js` (`BaconTheme`) - Light/dark theme
- `script.js` - DOM handling only. Builds every dynamic element with `textContent` (no `innerHTML`, no `DOMParser`; parsing a `style` attribute in the browser under the CSP reports violations)
- `style.css` - Color tokens on `:root`; dark values under `prefers-color-scheme` and `[data-theme="dark"]` must stay identical

## Storage

- `localStorage`: `bacon-cipherlab-lang`, `bacon-cipherlab-theme` only. Every access is wrapped in `try`; the page keeps working when storage is blocked

## Development Commands

```bash
npm test                     # node --test (Node.js 22+, no dependencies)
python -m http.server 8000   # then open http://localhost:8000/
```

## Testing

- `test/core.test.js` - Bacon's original 24 rows, the 26-letter table, known answers (Fuge, HELLO, SOS, the Friedman tombstone = WFF), decoding notes, round trips for 4 methods × 2 variants, intact emoji, HTML token reading, offset/invert/keep, one-bit candidates, word-list resolution, Solve examples ranking first, typeface names, the survival matrix (5 methods × 8 routes), practice answers, invisible-character counts, other tools' methods, the Day023 link
- `test/html.test.js`, `test/contrast.test.js`, `test/messages.test.js`, `test/i18n.test.js`, `test/format.test.js` - CSP, ARIA, dictionaries, contrast, formatting
- `test/readme.test.js` - README tables and examples (including the Solve readings and examples and the survival table) are checked against the core (the zero-width example contains real U+200B/U+200C); Japanese/English READMEs must have matching headings, references and directory trees

When you change behavior, update the README tables (both languages) so that `test/readme.test.js` keeps passing. The README examples were generated by the core; regenerate them rather than editing by hand.

## Writing rules for Japanese text

- Body text in です・ます; lists and tables in である
- No space between Japanese and alphanumerics; long vowel marks (ブラウザー, フォルダー, ディレクトリー, リポジトリー, エディター)
- 「わかる」 in hiragana (「分ける」「分かれる」 stay in kanji)
- At most two bold spans per README section; do not bold list item labels
