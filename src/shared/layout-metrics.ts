namespace Xcuic {
  /**
   * 画面幅に応じたレイアウトの表示モード。
   * wide はタイムライン拡張状態、compact は標準幅状態を表します。
   */
  export type LayoutMode = "wide" | "compact";

  /**
   * レイアウトモード決定のための実測値および前状態オプション。
   * DOM から計測されたヘッダー幅・サイドバー情報と現在のモード状態を渡します。
   */
  export interface ResolveLayoutModeOptions {
    currentlyWide?: boolean | undefined;
    headerWidthPx?: number | undefined;
    sidebarWidthPx?: number | undefined;
    hasSidebar?: boolean | undefined;
  }

  /**
   * サイドバー幅が未計測または取得不能だった場合に使用するフォールバック幅（px）。
   * X の標準サイドバー幅に合わせた 350px を採用します。
   */
  export const FALLBACK_SIDEBAR_WIDTH_PX = 350;

  /**
   * タイムラインとサイドバー間の余白（px）。
   */
  export const GAP_PX = 30;

  /**
   * ヘッダー外側のパディング（px）。
   */
  export const PADDING_PX = 20;

  /**
   * wide 状態から compact 状態へと縮小移行するタイムライン利用可能幅のしきい値（px）。
   */
  export const COMPACT_ENTER_TIMELINE_PX = 590;

  /**
   * compact 状態から wide 状態へと拡大移行するタイムライン利用可能幅のしきい値（px）。
   */
  export const COMPACT_EXIT_TIMELINE_PX = 610;

  /**
   * ビューポート幅と DOM 計測要素から適用すべきレイアウトモードを判定する純粋関数。
   * 境界値付近での画面痙攣・チャタリングを防止するためヒステリシスを設けています。
   */
  export function resolveLayoutMode(
    viewportWidthPx: number,
    options: ResolveLayoutModeOptions = {},
  ): LayoutMode {
    const safeWidth = Number.isFinite(viewportWidthPx) && viewportWidthPx > 0
      ? viewportWidthPx
      : 0;

    const currentlyWide = Boolean(options.currentlyWide);
    const hasSidebar = options.hasSidebar !== false;
    const sidebarWidth = typeof options.sidebarWidthPx === "number" && options.sidebarWidthPx > 0
      ? options.sidebarWidthPx
      : FALLBACK_SIDEBAR_WIDTH_PX;

    const headerWidth = typeof options.headerWidthPx === "number" && options.headerWidthPx > 0
      ? options.headerWidthPx + PADDING_PX
      : 0;

    const availableTimelinePx = safeWidth - headerWidth - (hasSidebar ? sidebarWidth + GAP_PX : 0);

    const isCompact = currentlyWide
      ? availableTimelinePx < COMPACT_ENTER_TIMELINE_PX
      : availableTimelinePx < COMPACT_EXIT_TIMELINE_PX;

    return isCompact ? "compact" : "wide";
  }
}
