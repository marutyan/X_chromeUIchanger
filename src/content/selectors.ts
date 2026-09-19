namespace Xcuic {
  /**
   * DOM 要素の特定に使用するセレクタ文字列の定義集。
   * X の構造変化に備え、探索用セレクタを一元管理します。
   */
  export const SELECTORS = {
    MAIN: 'main[role="main"], main',
    HEADER: 'header[role="banner"]',
    PRIMARY_COLUMN: 'div[data-testid="primaryColumn"]',
    SIDEBAR_COLUMN: 'div[data-testid="sidebarColumn"]',
    TIMELINE_CONTAINER: [
      'section[role="region"]',
      'div[aria-label*="Timeline" i]',
      'div[aria-label*="タイムライン" i]',
      'div[data-testid="primaryColumn"] section',
    ].join(","),
    TWEET: 'article[data-testid="tweet"]',
    TWEET_TEXT: 'div[data-testid="tweetText"]',
    ARTICLE: [
      'article[data-testid="article"]',
      'div[data-testid="article-container"]',
      'div[data-testid="twitter-article"]',
      'div[data-testid="articleDraft"]',
      'div[data-testid="note"]',
    ].join(","),
    CELL_INNER_DIV: 'div[data-testid="cellInnerDiv"]',
    SIGNIFICANT_MUTATION: [
      '[data-testid="primaryColumn"]',
      '[data-testid="sidebarColumn"]',
      '[data-testid="cellInnerDiv"]',
      'main',
      '[role="main"]',
    ].join(","),
  } as const;

  /**
   * 拡張機能が CSS でスタイルを当てるために DOM へ付与するクラス名の一覧。
   */
  export const CLASS_NAMES = {
    APP_ROW: "xcuic-app-row",
    MAIN_WRAPPER: "xcuic-main-wrapper",
    PRIMARY_COLUMN: "xcuic-primary-column",
    SIDEBAR_COLUMN: "xcuic-sidebar-column",
    TIMELINE_WRAPPER: "xcuic-timeline-wrapper",
    TWEET: "xcuic-tweet",
    TWEET_TEXT: "xcuic-tweet-text",
    ARTICLE: "xcuic-article",
    ARTICLE_CONTENT: "xcuic-article-content",
    STATUS_DETAIL: "xcuic-status-detail",
  } as const;

  /**
   * クラス消去および検証の対象となる全 CSS クラス名の配列。
   * CLASS_NAMES の値から自動導出されます。
   */
  export const TARGET_CLASSES: readonly string[] = Object.values(CLASS_NAMES);

  /**
   * レイアウト要素のタグ付け処理結果を表す件数情報。
   */
  export interface TaggedTargets {
    primaryColumnFound: boolean;
    sidebarColumnFound: boolean;
    tweetsCount: number;
    articlesCount: number;
  }

  /**
   * DOM ルートからメインコンテンツ領域（main要素またはその代替コンテナ）を探索する。
   */
  export function findMainRegion(root: ParentNode = document): HTMLElement | null {
    const mainEl = root.querySelector<HTMLElement>(SELECTORS.MAIN);
    if (
      mainEl !== null &&
      (mainEl.querySelector(SELECTORS.PRIMARY_COLUMN) !== null ||
        mainEl.querySelector(SELECTORS.TWEET) !== null)
    ) {
      return mainEl;
    }

    const primary = root.querySelector<HTMLElement>(SELECTORS.PRIMARY_COLUMN);
    if (primary !== null) {
      const fromPrimary = primary.closest<HTMLElement>(SELECTORS.MAIN);
      if (fromPrimary !== null) {
        return fromPrimary;
      }
      return primary.parentElement;
    }

    const tweet = root.querySelector<HTMLElement>(SELECTORS.TWEET);
    if (tweet !== null) {
      const fromTweet = tweet.closest<HTMLElement>(SELECTORS.MAIN);
      if (fromTweet !== null) {
        return fromTweet;
      }
    }

    return mainEl;
  }

  /**
   * 指定されたメインコンテンツ領域およびその配下の各レイアウト要素へクラスを付与する。
   */
  export function tagLayoutTargets(mainRegion: HTMLElement): TaggedTargets {
    let primaryColumnFound = false;
    let sidebarColumnFound = false;

    const primaryColumn = mainRegion.querySelector<HTMLElement>(SELECTORS.PRIMARY_COLUMN);
    if (primaryColumn !== null) {
      primaryColumn.classList.add(CLASS_NAMES.PRIMARY_COLUMN);
      primaryColumnFound = true;

      const mainWrappers = findMainWrappers(mainRegion, primaryColumn);
      for (const wrapper of mainWrappers) {
        wrapper.classList.add(CLASS_NAMES.MAIN_WRAPPER);
      }

      const timelineWrapper = primaryColumn.querySelector<HTMLElement>(
        SELECTORS.TIMELINE_CONTAINER,
      );
      if (timelineWrapper !== null) {
        timelineWrapper.classList.add(CLASS_NAMES.TIMELINE_WRAPPER);
      }
    }

    const sidebarColumn = mainRegion.querySelector<HTMLElement>(SELECTORS.SIDEBAR_COLUMN);
    if (sidebarColumn !== null) {
      sidebarColumn.classList.add(CLASS_NAMES.SIDEBAR_COLUMN);
      sidebarColumnFound = true;
    }

    const header = typeof document !== "undefined"
      ? document.querySelector<HTMLElement>(SELECTORS.HEADER)
      : null;
    if (header !== null) {
      const appRow = findAppRow(header, mainRegion);
      if (appRow !== null) {
        appRow.classList.add(CLASS_NAMES.APP_ROW);
      }
    }

    const contentCounts = tagContentTargets(mainRegion);

    return {
      primaryColumnFound,
      sidebarColumnFound,
      tweetsCount: contentCounts.tweets,
      articlesCount: contentCounts.articles,
    };
  }

  /**
   * 付与されたすべての拡張機能用 CSS クラスを DOM 要素から消去する。
   */
  export function clearTargetClasses(root: ParentNode): void {
    for (const className of TARGET_CLASSES) {
      for (const element of root.querySelectorAll<HTMLElement>(`.${className}`)) {
        element.classList.remove(className);
      }
    }
  }

  /**
   * ヘッダーとメイン領域を包含する共通親コンテナ（appRow）を探索する。
   */
  function findAppRow(header: HTMLElement, mainRegion: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = header.parentElement;
    while (current !== null && current !== document.body && current !== document.documentElement) {
      if (current.contains(mainRegion)) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  /**
   * primaryColumn と mainRegion の間にある中間ラッパー要素群を副作用なしで探索する。
   */
  export function findMainWrappers(
    mainRegion: HTMLElement,
    primaryColumn: HTMLElement,
  ): HTMLElement[] {
    const wrappers: HTMLElement[] = [];
    let current: HTMLElement | null = primaryColumn.parentElement;
    while (current !== null && current !== mainRegion) {
      wrappers.push(current);
      current = current.parentElement;
    }
    if (wrappers.length === 0 && mainRegion.firstElementChild !== null) {
      wrappers.push(mainRegion.firstElementChild as HTMLElement);
    }
    return wrappers;
  }
}
