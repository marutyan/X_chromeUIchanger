namespace Xcuic {
  export interface LayoutMetrics {
    mainWidthPx: number;
    timelineWidthPx: number;
    sidebarWidthPx: number;
    canvasWidthPx: number;
    compact: boolean;
  }

  export interface LayoutOptions {
    currentlyWide?: boolean;
    headerWidthPx?: number | undefined;
    sidebarWidthPx?: number | undefined;
    hasSidebar?: boolean;
  }

  export const DEFAULT_HEADER_WIDTH_PX = 275;
  export const COMPACT_HEADER_WIDTH_PX = 68;
  export const SIDEBAR_WIDTH_PX = 350;
  export const GAP_PX = 30;
  export const PADDING_PX = 20;
  export const MIN_TIMELINE_WIDTH_PX = 600;
  export const MAX_TIMELINE_WIDTH_PX = 900;

  export const COMPACT_ENTER_TIMELINE_PX = 590;
  export const COMPACT_EXIT_TIMELINE_PX = 610;

  export function calculateLayoutMetrics(
    widthPx: number,
    optionsOrWide: boolean | LayoutOptions = false,
  ): LayoutMetrics {
    const safeWidth = Number.isFinite(widthPx) && widthPx > 0
      ? widthPx
      : 0;

    const options: LayoutOptions = typeof optionsOrWide === "boolean"
      ? { currentlyWide: optionsOrWide }
      : optionsOrWide;

    const currentlyWide = Boolean(options.currentlyWide);
    const hasSidebar = options.hasSidebar !== false;
    const sidebarWidth = hasSidebar
      ? (typeof options.sidebarWidthPx === "number" && options.sidebarWidthPx > 0 ? options.sidebarWidthPx : SIDEBAR_WIDTH_PX)
      : 0;

    const headerWidth = typeof options.headerWidthPx === "number" && options.headerWidthPx > 0
      ? options.headerWidthPx + PADDING_PX
      : 0;

    const availableTimelinePx = safeWidth - headerWidth - (hasSidebar ? sidebarWidth + GAP_PX : 0);

    // ヒステリシスによるコンパクト判定（境界付近での痙攣・チャタリングを完全防止）
    const compact = currentlyWide
      ? availableTimelinePx < COMPACT_ENTER_TIMELINE_PX
      : availableTimelinePx < COMPACT_EXIT_TIMELINE_PX;

    if (compact) {
      const fallbackTimelineWidth = roundPixel(
        Math.max(0, Math.min(safeWidth, MIN_TIMELINE_WIDTH_PX)),
      );
      return {
        mainWidthPx: roundPixel(safeWidth),
        timelineWidthPx: fallbackTimelineWidth,
        sidebarWidthPx: hasSidebar ? sidebarWidth : 0,
        canvasWidthPx: roundPixel(safeWidth),
        compact: true,
      };
    }

    const rawTimelineWidth = clamp(
      availableTimelinePx,
      MIN_TIMELINE_WIDTH_PX,
      MAX_TIMELINE_WIDTH_PX,
    );
    // スクロールバー等の微小変動（約15px）による無限リサイズループを遮断するため10px単位に量子化
    const timelineWidthPx = Math.round(rawTimelineWidth / 10) * 10;
    const canvasWidthPx = timelineWidthPx + (hasSidebar ? sidebarWidth + GAP_PX : 0);

    return {
      mainWidthPx: roundPixel(safeWidth),
      timelineWidthPx,
      sidebarWidthPx: hasSidebar ? sidebarWidth : 0,
      canvasWidthPx,
      compact: false,
    };
  }

  function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function roundPixel(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

