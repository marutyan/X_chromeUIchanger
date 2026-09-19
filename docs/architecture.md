# Architecture

## Responsibility

本拡張機能は、X（旧Twitter）デスクトップ版（`x.com`, `twitter.com`）におけるメイン領域の横幅とカラムレイアウトを最適化する。
タイムラインの投稿内容、フォント、配色テーマ、いいね・リポスト等の操作、APIリクエスト、認証情報、Cookie、ユーザーデータへの介入や変更は行わない。

## モジュール構成と責務

| モジュール | 責務 |
|---|---|
| `src/content/index.ts` | 合成ルート。依存関係を生成・結合し `LayoutController` を初期化する |
| `src/content/enabled-setting.ts` | 有効化設定の読み込みと購読（`EnabledSettingSource` インターフェース、`ChromeStorageEnabledSettingSource`、`InMemoryEnabledSettingSource`） |
| `src/content/document-layout-state.ts` | `html`（`document.documentElement`）へのレイアウト属性（`data-xcuic-enabled`, `data-xcuic-layout`）の付与と消去 |
| `src/content/layout-controller.ts` | オーケストレーションと DOM 実測（`measureLayoutContext`）、ライフサイクル管理 |
| `src/content/observers.ts` | 再タグ付けの契機監視（`RefreshObserver` による URL 変化・DOM 変更の検知とデバウンス） |
| `src/content/selectors.ts` | セレクタとクラス名の情報源（`SELECTORS`, `CLASS_NAMES`）、構造要素のタグ付け |
| `src/content/content-targets.ts` | ツイート内要素・メディア・記事・引用ツイートの特定とタグ付け（`tagContentTargets`） |
| `src/shared/layout-metrics.ts` | モード判定の純関数（`resolveLayoutMode`）とレイアウト定数定義 |
| `src/shared/settings.ts` | 設定キー（`SETTING_KEY_ENABLED`）と既定値（`DEFAULT_ENABLED`） |

## レイアウト判定モデル (`resolveLayoutMode`)

表示モードの決定は `resolveLayoutMode(viewportWidthPx, options)` により行う。DOM操作を行わず `"wide" | "compact"` を返す純関数である。

### 入力パラメータ
- `viewportWidthPx`: ビューポート幅（`window.innerWidth`、フォールバック `document.documentElement.clientWidth`）
- `options.headerWidthPx`: ヘッダーの実測幅（`header[role="banner"]` の `offsetWidth`）
- `options.sidebarWidthPx`: サイドバーの実測幅（`div[data-testid="sidebarColumn"]` の `offsetWidth`）
- `options.hasSidebar`: サイドバーの有無（要素が存在し `offsetWidth > 0` かつ `display !== "none"`）
- `options.currentlyWide`: 現在のモードが wide かどうか

### 定数定義 (`src/shared/layout-metrics.ts`)
- `FALLBACK_SIDEBAR_WIDTH_PX = 350`: サイドバー幅が未計測または取得不能だった場合のフォールバック幅（px）
- `GAP_PX = 30`: タイムラインとサイドバー間の余白（px）
- `PADDING_PX = 20`: ヘッダー外側のパディング（px）
- `COMPACT_ENTER_TIMELINE_PX = 590`: wide 状態から compact 状態へと縮小移行するタイムライン利用可能幅のしきい値（px）
- `COMPACT_EXIT_TIMELINE_PX = 610`: compact 状態から wide 状態へと拡大移行するタイムライン利用可能幅のしきい値（px）

### 計算ロジック
1. **安全なビューポート幅の導出**:
   `safeWidth = Number.isFinite(viewportWidthPx) && viewportWidthPx > 0 ? viewportWidthPx : 0`
2. **減算幅の算出**:
   - ヘッダー幅: `headerWidthPx` が正数なら `headerWidthPx + PADDING_PX`、未計測なら `0`
   - サイドバー幅: `sidebarWidthPx` が正数ならその値、未計測なら `FALLBACK_SIDEBAR_WIDTH_PX`
   - 利用可能タイムライン幅:
     `availableTimelinePx = safeWidth - headerWidth - (hasSidebar ? sidebarWidth + GAP_PX : 0)`
3. **ヒステリシスによるモード決定**:
   境界値付近でのチャタリング（画面のちらつき・振動）を防ぐため、現在の状態に応じたしきい値で判定する。
   - 現在 wide の場合: `availableTimelinePx < COMPACT_ENTER_TIMELINE_PX`（590px）で compact、それ以外は wide を維持
   - 現在 compact の場合: `availableTimelinePx < COMPACT_EXIT_TIMELINE_PX`（610px）で compact、610px 以上で wide へ移行

## CSS による幅配分とスタイリング (`content.css`)

JavaScript は `document.documentElement` に `data-xcuic-enabled` と `data-xcuic-layout` 属性を設定するのみであり、CSS 変数の動的操作やインラインスタイル操作は行わない。カラム幅の実際の配分はすべて `content.css` の flex 規則が担う。

1. **左ナビゲーション (`header[role="banner"]`)**:
   - `flex: 0 0 auto`、`width: auto` により、幅は X のナビ列の内容幅（ラベル付き 275px / アイコンのみ 88px に左余白 60px を加えた値）に任せ、伸長だけを止めて左端に固定する。
   - 固定 px 幅を与えると X の列幅と食い違い、ナビ列が主カラムに重なるため、幅は上書きしない。X 標準の `align-items: flex-end` も維持し、ナビ列を `main` の左隣へ寄せる。
2. **メイン領域 (`main[role="main"]`)**:
   - `flex: 1 1 0%`、`min-width: 0` により、残りの横幅を活用する。
3. **メインラッパー (`.xcuic-main-wrapper`)**:
   - wide モード時: `display: flex`、`gap: var(--xcuic-gap, 30px)`、`padding-right: 20px` を指定し、右パネルのはみ出しを防ぎながら水平配置する。
4. **中央タイムライン (`div[data-testid="primaryColumn"]`, `.xcuic-primary-column`)**:
   - wide モード時: `flex: 1 1 0%`、`width: auto`、`max-width: none` を指定。左ナビと右サイドバーの間の空きスペースに合わせて伸縮する。
   - compact モード時: `max-width: 600px` を指定し、標準レイアウトの幅を維持する。
5. **右サイドバー (`div[data-testid="sidebarColumn"]`, `.xcuic-sidebar-column`)**:
   - wide モード時: `flex: 0 0 var(--xcuic-sidebar-width, 350px)`、幅 350px を固定維持する。
   - 画面幅 1000px 以下のメディアクエリ: サイドバーを `display: none` で非表示にし、タイムラインを全幅（`width: 100%`）にして衝突を防ぐ。
6. **ツイートおよび内部コンテンツの追従**:
   - タグ付けは `classList` のみで行い、インラインスタイルは書き込まない。
   - ツイート行コンテナ（`.xcuic-tweet-row`）とアバター列（`.xcuic-avatar-column`）で上部揃え（`align-items: flex-start`, `align-self: flex-start`）を維持し、アバターサイズを 40px に固定する。
   - ツイート本文・右列（`.xcuic-tweet-content`）、写真・動画・カード（`.xcuic-media-wrapper`, `.xcuic-media`）を全幅化（`width: 100%`）する。
   - 単一メディアには `max-height: min(70vh, 750px)` を指定し、縦長画像のはみ出しを防ぐ。
   - 長文記事（`.xcuic-article`, `.xcuic-status-detail`）は `max-width: 950px` に広げる。

## リサイズ・DOM変更の監視機構 (`observers.ts`, `layout-controller.ts`)

レイアウトスラッシングや再描画ループを防ぐため、監視と処理の間引きを行う。

1. **ビューポートリサイズ監視 (`ResizeObserver`)**:
   - `document.documentElement` を監視対象とし、子要素の伸縮によるイベント再帰発火を防ぐ。
   - コールバックは `requestAnimationFrame`（rAF）で間引き、同一フレーム内の重複更新を抑止する。
2. **DOM変更監視 (`RefreshObserver`)**:
   - `document.body`（または `document.documentElement`）を対象に `childList` および `subtree` を監視する。
   - URL変化時: 50ms のデバウンス後に rAF で `refresh()` を実行。
   - 重要ノード変更時: `SELECTORS.SIGNIFICANT_MUTATION` に合致する要素（`primaryColumn`, `sidebarColumn`, `cellInnerDiv`, `main`, `[role="main"]`）の追加・削除が含まれる場合、200ms のデバウンス後に rAF で `refresh()` を実行。

## Runtime flow

1. **初期化 (`bootstrap`)**:
   - `ChromeStorageEnabledSettingSource`（またはテスト用の `InMemoryEnabledSettingSource`）から有効化設定を読み込む。
   - 設定変更のリスナーを登録する。
2. **有効化 (`enable`)**:
   - `documentLayoutState.setEnabled()` により `data-xcuic-enabled="true"` 属性を付与し、拡張 CSS を適用する。
   - メイン領域を検出し、構造要素およびツイート要素をタグ付けする。
   - 拡張 CSS 適用済みの DOM から初期実測とモード判定を行い、`data-xcuic-layout` 属性を付与する（これらを同一同期処理内で行い、中間フレームを生じさせない）。
   - リサイズ監視と DOM 監視を開始する。
3. **リサイズ・更新追従**:
   - リサイズや DOM 変更を検知すると、間引き・rAF 経由で再実測と判定を行う。
   - 前回とモードが変化した場合のみ `data-xcuic-layout` 属性を更新する。
4. **無効化 (`disable`)**:
   - 監視（`ResizeObserver`, `RefreshObserver`）を停止・切断する。
   - `clearTargetClasses()` により DOM から付与クラスをすべて消去する。
   - `documentLayoutState.clear()` により `html` の属性（`data-xcuic-enabled`, `data-xcuic-layout`）を削除し、標準表示に復元する。

## Failure behavior (フェイルクローズ・フェイルセーフ)

- `mainRegion` を特定できない画面（ログイン画面、認証フロー等）では、クラス付与を行わず何もしない（既存アタッチがある場合はデタッチしてクラスを消去する）。
- ビューポート幅が不正（`NaN`、負数、無限大）な場合は `safeWidth = 0` として計算し、`compact` モードを返してレイアウト崩れを防ぐ。
