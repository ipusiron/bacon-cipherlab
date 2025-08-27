# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Bacon CipherLab is a web-based educational tool for learning and experimenting with Bacon's Cipher. It allows encoding/decoding of text using Bacon cipher variants and provides steganographic embedding/extraction features.

## Project Structure

This is a static HTML/CSS/JavaScript web application with no build process or dependencies:
- `index.html` - Main application entry point with tab-based UI
- `script.js` - Core cipher logic and UI interactions  
- `style.css` - Application styling with dark/light theme support
- `assets/` - Directory for screenshots and images

## Key Technical Details

### Bacon Cipher Implementation
- Supports two variants:
  - 24-letter variant (I/J and U/V combined)
  - 26-letter variant (all letters distinct)
- Uses 5-bit encoding (A/B or 0/1 format)
- Character mapping stored in Maps for efficient lookup

### Main Features
1. **Encrypt**: Converts plaintext to A/B or 0/1 sequences
2. **Decrypt**: Converts A/B or 0/1 sequences back to plaintext
3. **Cover Embed**: Hides cipher text in cover text using:
   - Case variation (lowercase=A, uppercase=B)
   - Text formatting (normal/bold, normal/italic)
   - Zero-width characters (U+200B/U+200C)
4. **Cover Extract**: Extracts hidden cipher from embedded text
5. **Matrix/History**: Shows encoding tables and historical context

### Development Notes

- No build process - directly edit HTML/CSS/JS files
- Test by opening `index.html` in a browser
- GitHub Pages deployment serves files directly from repository
- Theme preference stored in localStorage
- Toast notifications for user feedback (1.3 second duration)

### Security Context

This is an educational tool for learning classical cryptography. The Bacon cipher provides no modern cryptographic security and is implemented purely for historical/educational purposes.

## 改善点・課題

### UI/UX関連
- **レスポンシブデザイン改善**: モバイル表示での要素切れ対応
- **アクセシビリティ強化**: キーボードナビゲーション、スクリーンリーダー対応
- **エラー処理強化**: 入力ミスに対するより詳細なフィードバック
- **プログレス表示**: 大容量テキスト処理時の進捗表示

### 機能拡張
- **ファイル形式対応**: PDF、Word等の多様なファイル入出力
- **一括処理機能**: 複数ファイルの同時処理
- **高度なバリアント**: 不規則配列等のより複雑な暗号方式
- **統計・分析機能**: 文字頻度分析、暗号解読支援

### ステガノグラフィー強化  
- **埋め込み品質検証**: 自動検証・品質チェック機能
- **カバーテキスト最適化**: 最適長の自動提案
- **複合埋め込み**: 複数方式の組み合わせ対応
- **画像ステガノグラフィー**: テキスト以外媒体への対応

### 教育支援
- **チュートリアル機能**: インタラクティブな段階学習
- **練習問題生成**: 自動生成される解読問題
- **解読支援ツール**: 部分暗号からの推測機能

### 技術面改善
- **パフォーマンス最適化**: 大量データ処理の高速化
- **PWA対応**: オフライン機能、キャッシュ戦略
- **データ永続化**: 作業内容の自動保存・復元
- **エクスポート形式拡張**: JSON、XML等の構造化出力

### セキュリティ・プライバシー
- **メモリ管理**: 処理後の確実なメモリクリア
- **データ保護**: ローカルストレージの暗号化
- **履歴管理**: 機密データ履歴の適切な消去