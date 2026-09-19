# Selector Policy

## X (Twitter) のフロントエンド構造と課題

XのWebクライアントは React Native for Web (RNW) を基盤として設計されている。
RNWによるHTML出力には次の特徴がある:

- **ハッシュ型アトミックCSSクラス**: `css-175oi2r`, `r-14lw9tl`, `r-18u37iz` などのクラス名はビルドやデプロイのたびに変化するため、セレクタとして一切使用してはならない。
- **深いdiv階層**: ネスト構造が頻繁に増減するため、固定的な子セレクタ（例: `div > div > div > div`）や `nth-child` に依存すると保守不能になる。
- **ローカライズ文言**: UIテキストは言語設定（日本語、英語、多言語）によって変化するため、テキスト内容を判定基準にしてはならない。

## 高耐性セレクタ選定基準 (High-Resilience Selector Hierarchy)

本拡張では、破壊的変更に耐えうる以下の優先順位に従って要素を特定する。

### 1. 安定したテスト識別子 (`data-testid`)

X開発チーム自身がE2Eテストやアクセシビリティ自動テストのために維持している `data-testid` 属性を最優先で使用する。

| 対象要素 | 使用セレクタ | 備考 |
|---|---|---|
| メインカラム | `div[data-testid="primaryColumn"]` | タイムラインやポスト詳細の外枠 |
| サイドバー | `div[data-testid="sidebarColumn"]` | トレンド等の右カラム |
| ツイート行 | `article[data-testid="tweet"]` | 各ツイートのルート要素 |
| ツイート本文 | `div[data-testid="tweetText"]` | テキスト描画ブロック |
| 写真メディア | `div[data-testid="tweetPhoto"]` | 静止画グリッドコンテナ |
| 動画メディア | `div[data-testid="videoPlayer"]`, `div[data-testid="videoComponent"]` | 動画・GIFプレイヤー |
| カード/リンク | `div[data-testid="card.wrapper"]` | OGPプレビュー枠 |
| 引用ツイート | `div[data-testid="quoteTweet"]` (フォールバック含む) | 引用されたツイート枠 |
| 記事/note | `article[data-testid="article"]`, `div[data-testid="article-container"]`, `div[data-testid="twitter-article"]`, `div[data-testid="articleDraft"]`, `div[data-testid="note"]` | X長文記事コンテンツ |
| アバター要素 | `[data-testid*="UserAvatar"], [data-testid*="Tweet-User-Avatar"]` (`SELECTORS.AVATAR`) | ツイート行内でのアバター列とコンテンツ列の境界判定およびアバター保護 |
| 重要変更ノード | `primaryColumn`, `sidebarColumn`, `cellInnerDiv`, `main[role="main"]`, `main` (`SELECTORS.SIGNIFICANT_MUTATION`) | DOM変更監視でレイアウト再計算が必要な要素の追加・削除の判定 |

### 2. WAI-ARIA セマンティック属性 (`role`, `aria-label`)

Web標準規格であるARIA属性は、UIリニューアルが行われてもセマンティクスとして維持される確率が極めて高い。

- `main[role="main"], main`: アプリケーションのメイン表示領域
- `header[role="banner"]`: 左ナビゲーションヘッダー
- `section[role="region"]`: タイムライン区画
- `div[aria-label*="Timeline" i]`, `div[aria-label*="タイムライン" i]`: 大文字小文字や言語差分を吸収するタイムライン検出

### 3. 相対的親子構造と祖先トラバーサル (`closest()`)

単一要素の特定にとどまらず、要素間の論理的な親子関係を活用する。

- `findMainRegion()`:
  - まず `root.querySelector(SELECTORS.MAIN)` を取得。
  - その内部に `primaryColumn` または `tweet` が存在することを確認してメイン領域を確定。
  - `main` が取得できない場合でも、`primaryColumn.closest(SELECTORS.MAIN)` または親要素から安全に特定。
- `findMainWrappers(mainRegion, primaryColumn)`:
  - `primaryColumn` から親へ遡り、`mainRegion` に至る中間ラッパー要素の配列を探索して返す。探索とクラス付与（`xcuic-main-wrapper`）の責務を分離した純粋な探索関数である。

### 4. フォールバックリストの結合

新機能やA/Bテストでタグ名やテストIDが並行運用されるケースに備え、セレクタをカンマ区切りで結合して複数候補をサポートする（例: `TWEET_VIDEO`, `ARTICLE`, `QUOTE_TWEET`）。

## クラス名の情報源 (`CLASS_NAMES`) と付与クラス

DOM に付与するクラス名は `CLASS_NAMES` 定数オブジェクトで一元管理し、無効化時のクラス一括消去に用いられる全クラス配列 `TARGET_CLASSES` もここから導出する。

- `xcuic-tweet-row`: ツイート内部でアバター列と右側コンテンツ列を横並びに配置する行コンテナ要素。
- `xcuic-avatar-column`: ツイート左側のアバターを内包する列コンテナ要素（`align-self: flex-start` により上部揃えを維持）。

## Fail Closed 原則

1. **未確定要素への非適用**:
   - `primaryColumn` や `tweet` が検出できない領域に対しては、レイアウト用クラス（`xcuic-*`）を付与しない。
2. **未知のカード・コンポーネントの扱い**:
   - ツイート内の認識できない独自ウィジェットは強制全幅化せず、標準のサイズ制約を崩さない。
3. **過度なCSS優先度適用の限定**:
   - `!important` の使用は `xcuic-*` クラスが付与された要素および明示的な `data-testid` セレクタのみに限定し、ページ全体やモーダルに意図しない副作用を及ぼさない。

## Maintenance 指針

1. **XのDOM更新時**:
   - 表示が崩れた場合は、DevToolsの要素インスペクタで該当要素の `data-testid` および `role` 属性を確認する。
   - `src/content/selectors.ts` の定数定義を更新する。
2. **リグレッション防止**:
   - セレクタの追加・変更時は、必ず `tests/selectors.test.ts` に `FakeElement` を用いたモックテストケースを追加し、`node --test` で検証する。
