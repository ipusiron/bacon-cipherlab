<!--
---
title: Bacon CipherLab
category: classic-crypto
difficulty: 1
description: Educational Bacon's Cipher lab: encoding/decoding, steganographic embedding, and historical insights.
tags: [bacon-cipher, classical-cryptography, steganography, cryptanalysis, education, web-tool]
demo: https://ipusiron.github.io/bacon-cipherlab/
---
-->

# 🥓 Bacon CipherLab - ベーコン暗号の体験ツール

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/bacon-cipherlab?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/bacon-cipherlab?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/bacon-cipherlab)
![GitHub license](https://img.shields.io/github/license/ipusiron/bacon-cipherlab)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/bacon-cipherlab/)

**Day055 - 生成AIで作るセキュリティツール100**

ベーコン暗号（Bacon's Cipher）をテーマにした学習・体験用のWebツールです。  

「平文⇔暗号文」の変換だけでなく、カバーテキストへの埋め込み・抽出を通して、ステガノグラフィー的な暗号の思想を理解できます。

「A=U+200B/B=U+200C」（ゼロ幅文字）を用いた高度なステガノグラフィーにも対応しています。

---

## 🌐 デモページ

👉 **[https://ipusiron.github.io/bacon-cipherlab/](https://ipusiron.github.io/bacon-cipherlab/)**

ブラウザーで直接お試しいただけます。

---

## 📸 スクリーンショット

>![a/bの対応表](assets/screenshot.png)
>
>*a/bの対応表*

---

## ✨ 主な機能

1. **Encrypt（暗号化）** - 平文をベーコン暗号に変換（0/1、A/B、a/b形式対応）
2. **Decrypt（復号）** - ベーコン暗号を平文に復号（全形式対応）
3. **Cover Embed（埋め込み）** - カバーテキストに秘密メッセージを隠す（ステガノグラフィー）
4. **Cover Extract（抽出）** - 埋め込まれた秘密メッセージを抽出
5. **Matrix（対応表）** - 文字対応表の表示・コピー機能

---

## 📊 ベーコン暗号変換表

### 24文字版（I/JとU/V統合）

| 文字 | 5ビット | a/b表記 | | 文字 | 5ビット | a/b表記 |
|------|---------|---------|--|------|---------|---------|
| A | 00000 | aaaaa | | N | 01101 | abbab |
| B | 00001 | aaaab | | O | 01110 | abbba |
| C | 00010 | aaaba | | P | 01111 | abbbb |
| D | 00011 | aaabb | | Q | 10000 | baaaa |
| E | 00100 | aabaa | | R | 10001 | baaab |
| F | 00101 | aabab | | S | 10010 | baaba |
| G | 00110 | aabba | | T | 10011 | baabb |
| H | 00111 | aabbb | | U/V | 10100 | babaa |
| I/J | 01000 | abaaa | | W | 10101 | babab |
| K | 01001 | abaab | | X | 10110 | babba |
| L | 01010 | ababa | | Y | 10111 | babbb |
| M | 01011 | ababb | | Z | 11000 | bbaaa |

### 26文字版（全文字個別）

| 文字 | 5ビット | a/b表記 | | 文字 | 5ビット | a/b表記 |
|------|---------|---------|--|------|---------|---------|
| A | 00000 | aaaaa | | N | 01101 | abbab |
| B | 00001 | aaaab | | O | 01110 | abbba |
| C | 00010 | aaaba | | P | 01111 | abbbb |
| D | 00011 | aaabb | | Q | 10000 | baaaa |
| E | 00100 | aabaa | | R | 10001 | baaab |
| F | 00101 | aabab | | S | 10010 | baaba |
| G | 00110 | aabba | | T | 10011 | baabb |
| H | 00111 | aabbb | | U | 10100 | babaa |
| I | 01000 | abaaa | | V | 10101 | babab |
| J | 01001 | abaab | | W | 10110 | babba |
| K | 01010 | ababa | | X | 10111 | babbb |
| L | 01011 | ababb | | Y | 11000 | bbaaa |
| M | 01100 | abbaa | | Z | 11001 | bbaab |

**変換例：HELLO** → `aabbbaabaaababaababaabbba`

---

## 📖 使い方

### 1. Encrypt（暗号化）
1. 平文を入力 → バリアント選択（24/26文字） → 出力形式選択（0/1、A/B、a/b）
2. 「ENCRYPT」ボタンでベーコン暗号に変換

### 2. Decrypt（復号）
1. 暗号列を入力（0/1、A/B、a/b形式すべて対応） → バリアント選択
2. 「DECRYPT」ボタンで平文に復号

### 3. Cover Embed（埋め込み） 🔥重要
1. **カバーテキスト**に自然な文章を入力
2. **秘密メッセージ**を平文で入力（または直接A/B形式）
3. **埋め込み方式**選択：
   - A=小文字/B=大文字（推奨）
   - A=通常/B=太字
   - A=通常/B=斜体  
   - A=U+200B/B=U+200C（ゼロ幅文字）
4. 「埋め込む」ボタンで実行

**注意：** カバーテキストは秘密メッセージの5倍以上の英字が必要

### 4. Cover Extract（抽出）
1. 埋め込み済みテキストを入力
2. 抽出方式選択（埋め込み時と同じもの）
3. 出力形式選択（A/B、0/1、平文）
4. 「抽出する」ボタンで秘密メッセージを取得

### 5. Matrix（対応表）
- 24/26文字版切り替え、表示形式変更（0/1、A/B、a/b、太字/斜体）
- セルクリックで暗号をコピー

---

## 🔍 ゼロ幅文字を用いた高度なステガノグラフィー

このツールの特徴的な機能として、**ゼロ幅文字**を利用した高度なステガノグラフィーがあります。

### ゼロ幅文字とは

ゼロ幅文字は、画面上では見えないが実際にはテキストに存在するUnicode文字です。

- **U+200B (Zero Width Space)** - ゼロ幅スペース
- **U+200C (Zero Width Non-Joiner)** - ゼロ幅非接合子

### 仕組み

1. **エンコーディング**: ベーコン暗号の0と1を以下のように対応
   - `A` (0ビット) → `U+200B` (ゼロ幅スペース)
   - `B` (1ビット) → `U+200C` (ゼロ幅非接合子)

2. **埋め込み**: カバーテキストの文字間に不可視文字を挿入
   ```
   例: "Hello World" に "SOS" を埋め込む場合
   
   SOS → 10010 01111 10010 (24文字版)
        → BAABAABBBBAABA (A/B表記)
        → ‌ ​​‌ ​‌‌‌‌​ ​‌​ (ゼロ幅文字、実際は不可視)
   
   結果: H‌e​l​l‌o​ ‌W‌o‌r‌l​d​‌​ (見た目は "Hello World" と同じ)
   ```

3. **抽出**: 埋め込まれたテキストからゼロ幅文字を検出して復号

### メリット・デメリット

#### ✅ メリット
- **完全な不可視性**: 見た目上は通常のテキストと区別不可能
- **高い秘匿性**: 暗号が使われていることが全く分からない
- **コピー&ペースト可能**: 多くの環境でゼロ幅文字も含めてコピーされる
- **Unicode対応**: 現代的なシステムで広くサポート

#### ⚠️ デメリット・注意点
- **環境依存性**: 一部のSNSやメールシステムで削除される場合がある
- **フィルタリング**: セキュリティソフトやテキスト処理で除去される可能性
- **検証困難**: 肉眼では確認不可能なため、事前テストが必須
- **容量制限**: カバーテキストの長さに依存

### 実用例

```
通常のテキスト:
"今日は良い天気ですね。散歩でもしませんか？"

ゼロ幅文字で "HELP" が埋め込まれたテキスト:
"今日は​良い‌天​気​で‌すね​‌‌​。散​歩‌で​も‌し​ま​せ​ん‌か‌？"
(見た目は全く同じだが、実際にはゼロ幅文字が含まれている)
```

### 使用上の注意

1. **事前検証**: 使用予定の環境で必ず動作テストを実行
2. **バックアップ**: 重要な情報は他の方法でもバックアップ
3. **環境確認**: SNS投稿、メール送信前に抽出テストを実施
4. **適用場面**: 教育・実験目的での使用に留める

このゼロ幅文字を使った方法は、ベーコンが提唱した「疑念を抱かせない」という暗号の理想を現代技術で実現した例と言えるでしょう。

---

## 🎯 ベーコン暗号の活用シナリオ

### シナリオ1: CTF（Capture The Flag）競技での応用

**状況**: オンラインCTF大会のSteganography問題

参加者には一見普通のWebページのソースコードが提供されます：

```html
<!-- Welcome to our COMPANY homepage! -->
<div class="content">
  <h1>About Our Business</h1>
  <p>We Are Committed to Excellence in everything we do. 
     Building Amazing solutions for Complex problems.</p>
  <p>Our Network spans Globally, ensuring Quality service.</p>
</div>
```

**隠された情報**:
- 大文字の頭文字を抽出: `W A C E B A C C N G Q`
- これをベーコン暗号（24文字版）として解釈
- `W=babab, A=aaaaa, C=aaaba, E=aabaa, ...`
- 復号結果: `FLAG{BACON}`

**CTFでの出題パターン**:
- **HTMLコメント内の大小文字**: `<!-- FlaG is Hidden in Plain Sight -->`
- **CSSプロパティ値**: `font-weight: Bold; font-style: Normal; font-weight: Bold;...`
- **JavaScript変数名**: `var isReady = true, canLoad = false, isValid = true;`
- **ゼロ幅文字**: 問題文に見えない文字を埋め込み

**攻略のコツ**:
1. テキスト内の規則的なパターンを探す
2. 大文字/小文字、太字/通常、0/1の組み合わせに注目
3. 5文字ずつのグルーピングを試す
4. 24文字版/26文字版の両方で復号を試行

### シナリオ2: 情報工作・スパイ活動での歴史的応用

**冷戦時代の想定シナリオ**: 東西ベルリン間の秘密通信

**状況**: 
1950年代、東ベルリンの協力者が西側に情報を伝達する必要がある状況。検閲が厳しく、通常の暗号は即座に発見・解読されてしまう。

**手法**: 新聞記事への埋め込み

```
表向きの記事（東ベルリン日報 1953年8月15日）:

「本日、市内の建設作業が順調に進行している。
 新しい橋の建設では、多くの作業員が熱心に working している。
 明日も good weather が予想され、作業は継続される予定だ。」

隠されたメッセージ:
- 英単語の大文字小文字パターン: working → WORKING（すべて大文字）
- good weather → Good Weather（頭文字大文字）
- W-O-R-K-I-N-G-G-W → ベーコン暗号で復号
- 結果: 「URGENT INTEL」（緊急情報）
```

**現代のデジタル応用例**:

1. **SNS投稿での情報伝達**:
   ```
   「Beautiful day Today! Amazing Weather for Outdoor activities.
    Nice Temperature, Great Humidity. Perfect for Hiking!」
   
   大文字パターン: B-T-A-W-O-N-T-G-H-P-H
   → ベーコン暗号で「MEETUP」を示唆
   ```

2. **メール署名での連絡**:
   ```
   Best regards,
   Alice Johnson
   Senior Developer
   Tech Solutions Inc.
   
   ゼロ幅文字で緊急度や場所情報を埋め込み
   ```

**スパイ活動での利点**:
- **深層隠蔽**: 暗号使用の痕跡を完全に隠蔽
- **大量通信**: 日常的な文書に混入可能  
- **検閲回避**: 表面上は無害な内容
- **多重防護**: 発見されても意味を特定困難

**対策・検出方法**:
- 統計分析による大文字使用頻度の異常検出
- ゼロ幅文字の存在チェック
- 文体解析による不自然さの発見
- パターン認識AIによる隠しメッセージ検出

**⚠️ 重要な注意**: これらのシナリオは教育・研究目的の説明です。実際の諜報活動や違法行為には使用しないでください。現代では、より高度な暗号技術と検出技術が発達しています。

---

## 🕮 ベーコンの暗号観

フランシス・ベーコンは『学問の進歩』（1605）で「優れた暗号の3条件」を提唱しました。

1. **容易さ（Ease）** - 書くのが簡単で骨が折れない
2. **安全性（Safeness）** - 破られにくい
3. **秘匿性（Not raising suspicion）** - 疑念を抱かせない

この発想は、字体や装飾にA/Bビットを埋め込むステガノグラフィー的応用として現在も活用されています。

---

## 🪦 歴史的エピソード：フリードマン夫妻の墓碑

アメリカの暗号研究の先駆者ウィリアム・F・フリードマン夫妻の墓石には、ベーコン暗号で夫のイニシャル「WFF」が隠されています。

夫妻の墓石には、"KNOWLEDGE IS POWER"が刻まれています。

<img src="https://upload.wikimedia.org/wikipedia/commons/8/89/ANCExplorer_William_F._Friedman_grave.jpg" alt="フリードマン夫妻の墓石" width="700">

たとえば、'E'に注目してみてください。
'E'は3文字ありますが、よく見ると異なる書体が使われています。
セリフ体とサンセリフ体です。

セリフ体を大文字のまま、サンセリフ体を小文字にすると、以下のように変換されます。

```
KnOwledGe Is pOwEr
```

暗号学では一般に5文字グループに分けられますので、それを適用してみます。

```
KnOwl edGeI spOwE r
```

さらに、小文字をaスタイル、大文字をbスタイルとしてタグ付けします。

```
KnOwl edGeI spOwE r
babaa aabab aabab a
```

これをベーコン暗号だと仮定して解読すると、"WFF"という文字列が得られます。
この文字列は、夫のウィリアム・F・フリードマンのイニシャルそのものです。

参考：[Cipher on the William and Elizebeth Friedman tombstone](https://elonka.com/friedman/)

---

## 📊 ベーコン暗号と他の暗号の比較

| 項目      | ベーコン暗号（Bacon’s Cipher）                 | シーザー暗号          | ヴィジュネル暗号          | プレイフェア暗号        |
| ------- | -------------------------------------- | --------------- | ----------------- | --------------- |
| 種別      | **換字式暗号 + ステガノグラフィー**                  | 換字式（単一換字）       | 多表式換字（多アルファベット換字） | 二文字単位換字         |
| 方式      | 各文字を5ビット（A/B）に変換、文字装飾や大文字小文字に埋め込む      | アルファベットを一定シフト   | 繰返し鍵で複数のシフト表を使用   | 5×5マトリクスによるペア変換 |
| 秘匿の狙い   | **暗号を使っていると気づかせない**（疑念回避）              | 単純な変換（簡単に気づかれる） | 頻度解析に強くなる         | 頻度解析にある程度強い     |
| 安全性（当時） | 低い（換字なので頻度解析に弱い）<br>ただし「ステガノ性」で検知されにくい | 極めて低い（すぐ破られる）   | 当時は比較的強力          | 当時は比較的強力        |
| 学習的特徴   | **暗号とステガノの境界を学べる**                     | 暗号の基礎理解に最適      | 多表式暗号の代表例         | ペア換字の発想を学べる     |
| 現代的評価   | 教材・ステガノ体験用                             | 入門教材            | 古典暗号の定番教材         | 古典暗号の定番教材       |
| 本プロジェクトのツール | [Bacon CipherLab](https://ipusiron.github.io/bacon-cipherlab/) | [Caesar Cipher Wheel Tool](https://ipusiron.github.io/caesar-cipher-wheel/) | [Vigenere Cipher Tool](https://ipusiron.github.io/vigenere-cipher-tool/) | [Playfair CipherLab](https://ipusiron.github.io/playfair-cipherlab/) |

---

## ⚠️ 注意点

- ベーコン暗号は古典暗号であり、現代的なセキュリティ強度はありません
- 教育・実験目的やステガノグラフィー体験に適しています
- 実際のセキュリティ用途には使用しないでください

---

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) をご覧ください。

---

## 🛠 このツールについて

本ツールは、「生成AIで作るセキュリティツール100」プロジェクトの一環として開発されました。  
このプロジェクトでは、AIの支援を活用しながら、セキュリティに関連するさまざまなツールを100日間にわたり制作・公開していく取り組みを行っています。

プロジェクトの詳細や他のツールについては、以下のページをご覧ください。  

🔗 [https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)
