namespace Xcuic {
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
    TWEET_PHOTO: 'div[data-testid="tweetPhoto"]',
    TWEET_VIDEO: [
      'div[data-testid="videoPlayer"]',
      'div[data-testid="videoComponent"]',
    ].join(","),
    CARD_WRAPPER: 'div[data-testid="card.wrapper"]',
    QUOTE_TWEET: [
      'div[role="link"][tabindex="0"]',
      'div[aria-labelledby*="id__"][role="blockquote"]',
      'div[data-testid="quoteTweet"]',
    ].join(","),
    ARTICLE: [
      'article[data-testid="article"]',
      'div[data-testid="article-container"]',
      'div[data-testid="twitter-article"]',
      'div[data-testid="articleDraft"]',
      'div[data-testid="note"]',
    ].join(","),
  } as const;

  export const TARGET_CLASSES = [
    "xcuic-app-row",
    "xcuic-main-wrapper",
    "xcuic-primary-column",
    "xcuic-sidebar-column",
    "xcuic-timeline-wrapper",
    "xcuic-tweet",
    "xcuic-tweet-content",
    "xcuic-tweet-text",
    "xcuic-tweet-photo",
    "xcuic-tweet-video",
    "xcuic-card-wrapper",
    "xcuic-media-wrapper",
    "xcuic-quote-tweet",
    "xcuic-media",
    "xcuic-article",
    "xcuic-article-content",
    "xcuic-status-detail",
  ] as const;

  export interface TaggedTargets {
    primaryColumnFound: boolean;
    sidebarColumnFound: boolean;
    tweetsCount: number;
    articlesCount: number;
    mediaCount: number;
  }

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

  export function tagLayoutTargets(mainRegion: HTMLElement): TaggedTargets {
    let primaryColumnFound = false;
    let sidebarColumnFound = false;

    const primaryColumn = mainRegion.querySelector<HTMLElement>(SELECTORS.PRIMARY_COLUMN);
    if (primaryColumn !== null) {
      primaryColumn.classList.add("xcuic-primary-column");
      primaryColumnFound = true;

      const mainWrapper = findMainWrapper(mainRegion, primaryColumn);
      if (mainWrapper !== null) {
        mainWrapper.classList.add("xcuic-main-wrapper");
      }

      const timelineWrapper = primaryColumn.querySelector<HTMLElement>(
        SELECTORS.TIMELINE_CONTAINER,
      );
      if (timelineWrapper !== null) {
        timelineWrapper.classList.add("xcuic-timeline-wrapper");
      }
    }

    const sidebarColumn = mainRegion.querySelector<HTMLElement>(SELECTORS.SIDEBAR_COLUMN);
    if (sidebarColumn !== null) {
      sidebarColumn.classList.add("xcuic-sidebar-column");
      sidebarColumnFound = true;
    }

    const header = typeof document !== "undefined"
      ? document.querySelector<HTMLElement>(SELECTORS.HEADER)
      : null;
    if (header !== null) {
      const appRow = findAppRow(header, mainRegion);
      if (appRow !== null) {
        appRow.classList.add("xcuic-app-row");
      }
    }

    const contentCounts = tagContentTargets(mainRegion);

    return {
      primaryColumnFound,
      sidebarColumnFound,
      tweetsCount: contentCounts.tweets,
      articlesCount: contentCounts.articles,
      mediaCount: contentCounts.media,
    };
  }

  export function clearTargetClasses(root: ParentNode): void {
    for (const className of TARGET_CLASSES) {
      for (const element of root.querySelectorAll<HTMLElement>(`.${className}`)) {
        element.classList.remove(className);
      }
    }
  }

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

  function findMainWrapper(
    mainRegion: HTMLElement,
    primaryColumn: HTMLElement,
  ): HTMLElement | null {
    let current: HTMLElement | null = primaryColumn;
    while (current !== null && current.parentElement !== mainRegion) {
      current = current.parentElement;
    }
    return current ?? (mainRegion.firstElementChild as HTMLElement | null);
  }
}
