# Chrome Web Store Metadata & Submission

## 基本メタデータ (Store Listing Information)

- **拡張機能名 (Item Name)**:
  `X Responsive Layout`
- **短縮名 (Short Name)**:
  `X Responsive Layout`
- **バージョン (Version)**:
  `0.1.0`
- **概要 (Summary / Short Description - 最大132文字)**:
  `X (Twitter) desktop のタイムラインを横長画面に合わせて最大900pxまで見やすく広げる軽量レスポンシブ拡張機能。`
- **カテゴリ (Category)**:
  `ユーザー補助 (Accessibility)` または `生産性 (Productivity)`
- **主要言語 (Default Language)**:
  `日本語 (Japanese)`

---

## 詳細説明 (Detailed Description)

### 日本語 (Japanese)

```text
X Responsive Layout は、X（旧Twitter）デスクトップ版の閲覧体験をワイド画面や高解像度ディスプレイ向けに最適化するオープンソースのChrome拡張機能です。

【主な特徴】
・中央タイムラインのワイド化: 標準約600pxの中央カラムを、画面幅に応じて最大900pxまで自動拡大。
・左右のレイアウト維持: 左メニューナビゲーションと右サイドバー（350px固定）の標準レイアウトを完全に維持。操作性を損ないません。
・各種メディアの自動追従: ツイート本文、画像、動画、OGPカード、引用ツイート、X Articles（長文記事）が拡大幅に美しく追従。
・スマートなレスポンシブ制御: ウィンドウ幅が狭い場合（メイン幅990px未満）は自動でX標準表示に戻るフェイルセーフ設計。
・ワンクリックでON/OFF: ツールバーのポップアップからいつでも標準表示とワイド表示を即座に切り替え可能。

【プライバシーとセキュリティ】
・要求権限は設定保存のための「storage」のみです。
・ツイート内容、入力テキスト、個人情報、認証トークンなどのデータ収集や外部送信は一切行いません。
・完全ローカルで動作し、広告やトラッキングスクリプトは含まれていません。
```

### English

```text
X Responsive Layout is a lightweight, privacy-first Chrome extension that optimizes the X (formerly Twitter) desktop layout for widescreen and high-resolution monitors.

Features:
- Responsive Timeline Expansion: Dynamically expands the center timeline column from the standard ~600px up to 900px based on your window width.
- Preserves Standard Sidebars: Keeps the left navigation and right sidebar (fixed at 350px) fully intact and functional.
- Media Auto-Fitting: Photos, videos, link preview cards, quote tweets, and X Articles automatically stretch to fit the widened timeline.
- Fail-Safe Compact Mode: Automatically reverts to standard layout when the window width drops below 990px to prevent visual clipping.
- Quick Toggle: Easily enable or disable the custom layout with a single click from the extension popup.

Privacy & Security:
- Requests only the minimal "storage" permission to remember your toggle setting.
- Never accesses, collects, or transmits your tweets, text inputs, account data, or browsing history.
- 100% locally operated with zero tracking, telemetry, or external network requests.
```

---

## 権限の正当化理由 (Permission Justifications)

Chrome Web Store の審査要件（Single Purpose Policy および Minimal Permissions）に基づく申請用理由説明:

### 1. `storage` 権限

- **正当化理由**:
  「拡張機能のポップアップUIにおいて、ユーザーがレイアウト有効/無効の切り替え状態（`enabled`: boolean）を設定・保持し、タブ間で設定を同期するために `chrome.storage.local` を使用します。ユーザーの個人情報や閲覧履歴の収集・保存には一切使用しません。」
- **Justification (English)**:
  "Used exclusively to store and synchronize the user's layout toggle state (enabled/disabled boolean flag) via chrome.storage.local. No user data, browsing history, or personal identifiers are stored."

### 2. ホスト権限 (`content_scripts.matches`)

- **対象ホスト**:
  `https://x.com/*`, `https://twitter.com/*`
- **正当化理由**:
  「本拡張機能はX（旧Twitter）デスクトップ版のレイアウト変更に特化した機能であり、該当サイトのWebページ上でのみCSSスタイルの注入およびDOM要素の特定を実行するためにコンテンツスクリプトを登録しています。」
- **Justification (English)**:
  "The content scripts need access to x.com and twitter.com exclusively to apply CSS overrides and detect layout container elements for responsive timeline expansion."

---

## プライバシーポリシー (Privacy Policy)

1. **単一の目的 (Single Purpose)**:
   本拡張機能は、X（Twitter）デスクトップWebサイトにおける表示横幅の調整のみを目的としています。
2. **収集するデータ (Data Collection)**:
   本拡張機能はいかなる個人情報、アクセスログ、ユーザーデータ、コンテンツデータも収集、記録、送信しません。
3. **第三者への開示 (Third-Party Disclosure)**:
   外部サーバーへの通信を行わないため、第三者へのデータ提供や転送は存在しません。
4. **データの保持 (Data Retention)**:
   ユーザーが設定したON/OFFフラグのみがブラウザのローカルストレージに保持され、拡張機能のアンインストール時に自動的に消去されます。
