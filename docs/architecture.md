# Architecture

## Responsibility

本拡張機能は、X（旧Twitter）デスクトップ版（`x.com`, `twitter.com`）におけるメイン領域の横幅とカラムレイアウトのみを最適化する。
タイムラインの投稿内容、フォント、配色テーマ、いいね・リポスト等の操作、APIリクエスト、認証情報、Cookie、ユーザーデータへの介入や変更は一切行わない。

## Layout model

Xのメイン領域（`main[role="main"]`）の実測クライアント幅を `W`（px）とする。

- 定数定義:
  - `MIN_ACTIVE_WIDTH_PX = 990px`: ワイドレイアウトを発動する最小メイン幅
  - `SIDEBAR_WIDTH_PX = 350px`: 右サイドバー幅（X標準の幅を固定維持）
  - `GAP_PX = 30px`: カラム間グリッド余白
  - `MIN_TIMELINE_WIDTH_PX = 600px`: タイムライン最小幅
  - `MAX_TIMELINE_WIDTH_PX = 900px`: タイムライン最大幅（これ以上は1行の視線移動が長くなり可読性を損なうためクランプ）

### 計算式 (`calculateLayoutMetrics`)

1. **Compact 判定 (`W < 990px`)**:
   - `compact = true`
   - `timelineWidthPx = round(clamp(W, 0, 600))`
   - `sidebarWidthPx = 350px`
   - `canvasWidthPx = W`
   - 幅の強制上書きを解除し、X標準のレスポンシブ動作に委ねる。

2. **Wide レイアウト (`W >= 990px`)**:
   - `availableTimeline = W - SIDEBAR_WIDTH_PX - GAP_PX` (すなわち `W - 380px`)
   - `timelineWidthPx = round(clamp(availableTimeline, 600px, 900px))`
   - `sidebarWidthPx = 350px`
   - `canvasWidthPx = timelineWidthPx + SIDEBAR_WIDTH_PX + GAP_PX` (980px〜1280px)
   - `compact = false`

## 左右パネル維持と中央拡大の仕組み

Xの3カラム構成のうち、左右の役割を維持しつつ中央の閲覧スペースのみを拡大する。

```
+----------------+-------------------------------------+------------------+
| 左ナビゲーション |          中央タイムライン            |    右サイドバー   |
| (header)       |       (primaryColumn)               |  (sidebarColumn) |
|                |                                     |                  |
| X標準動作を維持 | 600px 〜 最大900px までレスポンシブ拡張 | 350px 固定維持   |
| (幅変更なし)    | ツイート・写真・動画・記事が追従    | (縮小・消去なし)  |
+----------------+-------------------------------------+------------------+
```

1. **左ナビゲーション (`header[role="banner"]`)**:
   - 拡張側のCSS・スクリプトで幅や配置を一切変更しない。
   - X標準の折りたたみ（アイコンのみ）/展開（ラベル付き）動作が自然に保たれる。
2. **右サイドバー (`div[data-testid="sidebarColumn"]`, `.xcuic-sidebar-column`)**:
   - `width: 350px !important; max-width: 350px !important; flex-shrink: 0 !important;` を指定。
   - 検索ボックス、トレンド、おすすめユーザー、サブスクリプション等のウィジェットが崩れず安定表示される。
3. **中央タイムライン (`div[data-testid="primaryColumn"]`, `.xcuic-primary-column`)**:
   - `max-width: var(--xcuic-timeline-width, 850px) !important;`
   - メインラッパー（`main[role="main"] > div`, `.xcuic-main-wrapper`）の `max-width` 制限を解除（`var(--xcuic-canvas-width)` まで開放）し、中央カラムが広がった分の横幅を自然に吸収する。
   - `flex-grow: 1` などのFlexbox競合を引き起こすプロパティを排除し、X本来の安定した幅計算を活用。
4. **メディアおよびコンテンツ要素の追従**:
   - 写真（`tweetPhoto`）、動画（`videoPlayer`, `videoComponent`）、カード（`card.wrapper`）、引用ツイート（`xcuic-quote-tweet`）の幅を `100% !important; max-width: 100% !important;` に統一。
   - 長文記事（`article`, `note`, `xcuic-status-detail`）もタイムライン幅に合わせて拡大し、余計な余白や見切れを防止する。

## 画面の痙攣（レイアウトスラッシング・リサイズループ）防止機構

子要素のスタイル変更とObserver監視が相互に影響しあって発生する「画面の痙攣（高速な振動・チャタリング）」を完全に遮断するための3重の防止機構を備えています。

1. **ルート要素監視とリファレンス分離**:
   - リサイズ監視の起点を、子要素の伸縮によって影響を受ける `mainRegion` ではなく、ビューポート基準の `document.documentElement` に設定。
   - スタイル変更が監視イベントを再帰的に再発火させる無限ループを原理的に防止。
2. **ヒステリシス帯（不感帯）による境界チャタリング防止**:
   - `wide` への突入判定閾値（1010px）と `compact` への脱出閾値（970px）に 40px のヒステリシスを設ける。
   - 境界値付近でスクロールバーの出現・消失によって `clientWidth` が約15px変動しても、状態が高速で行き来して痙攣する現象を数学的に防止。
3. **10px単位の量子化ステップ & デバウンス間引き**:
   - タイムライン幅の計算値を 10px 単位で丸め、微小な変動によるCSS変数更新を遮断。
   - `RefreshObserver`（MutationObserver）に 200ms のデバウンスと重要ノード（`primaryColumn` / `cellInnerDiv` 等）のフィルタリングを導入し、React Native for Web の仮想スクロール再描画との干渉を完全排除。

## Runtime flow

1. **初期化**:
   - `chrome.storage.local` から `enabled` 設定（デフォルト: `true`）を読み込む。
   - `chrome.storage.onChanged` リスナーを登録し、ポップアップからの変更を検知。
2. **メイン領域の検出**:
   - `findMainRegion()` により `main[role="main"]` を取得。
   - 見つからない場合は `primaryColumn` や `tweet` の祖先からフォールバック探索。
3. **リサイズ監視**:
   - `ResizeObserver` を `mainRegion` にアタッチ。幅の変化に応じて `calculateLayoutMetrics` を実行。
   - 計算されたピクセル値を `document.documentElement` のCSS変数（`--xcuic-timeline-width`, `--xcuic-sidebar-width`, `--xcuic-canvas-width`）へ反映。
   - `html[data-xcuic-layout="wide"|"compact"]` 属性を更新。
4. **DOM変更の追従**:
   - `MutationObserver` (`RefreshObserver`) によりノード追加・削除を検知。
   - `requestAnimationFrame` でスロットリングしながら `tagLayoutTargets()` を呼び出し、新規読み込みされたツイートやメディアへクラスを付与。
5. **クリーンアップ**:
   - ポップアップでOFFにされた場合、Observerを即時停止・切断。
   - `clearTargetClasses()` により付与した全クラスをDOMから消去。
   - `html` の属性およびCSS変数を削除し、完全なX標準表示に復元。

## Failure behavior (フェイルクローズ・フェイルセーフ)

- `mainRegion` または `primaryColumn` を特定できない画面（ログイン画面、認証フロー、一部のフルスクリーンダイアログ）では、クラス付与やCSS変数設定を行わず、標準表示を維持する。
- 幅測定で `NaN`、負数、無限大が発生した場合は `safeWidth = 0`, `compact = true` として扱い、レイアウト崩れを防ぐ。
