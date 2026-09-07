# X Responsive Layout (X_chromeUIchanger)

X（旧Twitter）デスクトップ版のタイムラインを横長ディスプレイや高解像度画面に適応させ、閲覧領域を快適に広げるChrome拡張機能です。

## 主な機能 (Features)

- **動的レスポンシブレイアウト**: メイン表示領域の幅に追従し、中央タイムライン幅を標準の約600pxから最大900pxまでスムーズに拡大。
- **左右パネルの維持**: 左ナビゲーションバーおよび右サイドバー（350px固定）の標準レイアウト・操作性を崩さずそのまま維持。
- **コンテンツ幅の自動追従**: ツイート本文、画像、動画、リンクカード（OGP）、引用ツイート、長文記事（X Articles / note）が拡大タイムラインに完全フィット。
- **自動Compactフォールバック**: ウィンドウ幅が狭い環境（メイン幅990px未満）では自動で標準表示を維持し、表示崩れを防止。
- **ワンクリックON/OFF**: 拡張機能ポップアップからいつでもレイアウトの有効/無効を即時切り替え可能。
- **SPA画面遷移追従**: React Native for WebのDOM動的更新およびページ内遷移をMutationObserverとResizeObserverで自動追従。

## スコープとプライバシー方針 (Scope & Privacy)

- **対象ホスト**: `https://x.com/*`, `https://twitter.com/*` のみ
- **要求権限**: `storage` のみ（ポップアップによるON/OFF設定値の保存・同期に限定）
- **完全ローカル動作**: 外部通信、テレメトリ、アナリティクス、広告トラッキングは一切含みません。
- **機密情報の非保持**: ツイート内容、入力フォームテキスト、Cookie、認証トークン、アカウント情報を収集・読み取り・送信することは一切ありません。

## 開発とテスト (Development)

### 必要環境

- Node.js 22以上
- npm

### インストール

```bash
npm install
```

### 型検査とテスト

```bash
npm run typecheck
npm test
```

`npm test` はクリーンビルド、TypeScriptコンパイル、構文チェック（`node --check`）、および単体テスト（`node --test`）を一括実行します。

### ビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに生成されます。

## Chromeへの導入手順 (Installation)

1. `npm run build` を実行して `dist/` を生成します。
2. Google Chromeで `chrome://extensions/` を開きます。
3. 右上の「デベロッパー モード」をONにします。
4. 「パッケージ化されていない拡張機能を読み込む」をクリックします。
5. 本リポジトリの `dist/` ディレクトリを選択します。
6. `x.com` または `twitter.com` を開き、タイムラインがワイド表示されることを確認します。

## 無効化・アンインストール (Disable or Remove)

- ツールバーの拡張機能アイコンからポップアップを開き、「Layout」チェックボックスをOFFにすると即座にX標準の表示に戻ります。
- 完全にアンインストールする場合は `chrome://extensions/` から本拡張機能を削除してください。

## ドキュメント一覧 (Documentation)

- [アーキテクチャ設計書 (docs/architecture.md)](docs/architecture.md)
- [セレクタ選定方針 (docs/selector-policy.md)](docs/selector-policy.md)
- [手動スモークテスト手順書 (docs/manual-test.md)](docs/manual-test.md)
- [Chrome Web Store掲載メタデータ (CHROMEWEBSTORE.md)](CHROMEWEBSTORE.md)

## 既知の制約事項 (Known Limitations)

- Xの内部DOM構造（React Native for Web）は公式APIではないため、X側の将来的な大規模UI更新に伴いセレクタ定義の調整が必要になる場合があります。
- 画面幅が990px未満の狭いウィンドウでは、右サイドバーとの重複を防ぐため自動的に標準レイアウトで表示されます。
