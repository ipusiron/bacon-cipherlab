# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Bacon CipherLab is a web-based educational tool for learning Bacon's Cipher. It supports encoding/decoding with two cipher variants (24/26 letter) and steganographic embedding/extraction using multiple methods.

## Development

- **No build process** - directly edit HTML/CSS/JS files
- **Test locally** - open `index.html` in a browser
- **Deployment** - GitHub Pages serves files directly from repository

## Architecture

### Files
- `index.html` - Tab-based UI with 5 panels: Encrypt, Decrypt, Cover Embed, Cover Extract, Matrix
- `script.js` - All application logic (~530 lines)
- `style.css` - Styling with CSS custom properties for dark/light themes

### Core Functions (script.js)

**Cipher Engine:**
- `buildMaps(variant)` - Creates forward/reverse lookup Maps for letter↔bits conversion
- `lettersToBits_AB(text, variant)` - Encodes plaintext to 5-bit sequences
- `bitsToLetters(bits, variant)` - Decodes bits back to letters
- `parseBitsFromInput(s)` - Normalizes A/B/a/b/0/1 input to bit array

**Steganography:**
- `countCoverCapacity(method, text)` - Calculates available embedding slots
- Embed methods: `case` (lowercase/uppercase), `bold`/`italic` (HTML spans), `zw` (zero-width U+200B/U+200C)

**UI Helpers:**
- `$()` / `$$()` - querySelector shortcuts
- `toast(msg)` - 1.3s notification display
- `escapeHTML(s)` - XSS prevention for dynamic content

### Bacon Cipher Variants
- **24-letter**: I/J combined, U/V combined (historical standard)
- **26-letter**: All letters distinct (modern variant)
- Each letter maps to 5 bits (00000-11001 for 24-letter, 00000-11001 for 26-letter)

### State Management
- No framework - vanilla JS with direct DOM manipulation
- Theme preference stored in `localStorage`
- All data processing is client-side only
