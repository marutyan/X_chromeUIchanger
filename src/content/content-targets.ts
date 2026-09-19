namespace Xcuic {
  export interface ContentTargetsCount {
    tweets: number;
    articles: number;
    media: number;
  }

  export function tagContentTargets(root: HTMLElement): ContentTargetsCount {
    let tweets = 0;
    let articles = 0;
    let media = 0;

    // 1. ツイート (article[data-testid="tweet"])
    const tweetElements = root.querySelectorAll<HTMLElement>(SELECTORS.TWEET);
    for (const tweet of tweetElements) {
      tweet.classList.add("xcuic-tweet");
      tweets += 1;

      // tweetText
      const tweetText = tweet.querySelector<HTMLElement>(SELECTORS.TWEET_TEXT);
      if (tweetText !== null) {
        tweetText.classList.add("xcuic-tweet-text");
      }

      // ツイート右側のコンテンツ列（Right Column）の特定と全幅化
      tagTweetContentContainer(tweet, tweetText);

      // 写真 (tweetPhoto)
      for (const photo of tweet.querySelectorAll<HTMLElement>(SELECTORS.TWEET_PHOTO)) {
        photo.classList.add("xcuic-tweet-photo", "xcuic-media");
        tagMediaWrapper(photo, tweet);
        media += 1;
      }

      // 動画 (videoPlayer, videoComponent)
      for (const video of tweet.querySelectorAll<HTMLElement>(SELECTORS.TWEET_VIDEO)) {
        video.classList.add("xcuic-tweet-video", "xcuic-media");
        tagMediaWrapper(video, tweet);
        media += 1;
      }

      // カード (card.wrapper)
      for (const card of tweet.querySelectorAll<HTMLElement>(SELECTORS.CARD_WRAPPER)) {
        card.classList.add("xcuic-card-wrapper", "xcuic-media");
        tagMediaWrapper(card, tweet);
        media += 1;
      }

      // 引用ツイート
      tagQuoteTweets(tweet);
    }

    // 2. 記事 (X Articles / note / status詳細)
    const articleElements = root.querySelectorAll<HTMLElement>(SELECTORS.ARTICLE);
    for (const article of articleElements) {
      article.classList.add("xcuic-article");
      articles += 1;

      for (const block of article.children) {
        (block as HTMLElement).classList.add("xcuic-article-content");
      }
    }

    // status詳細ページの判定 (URLが /status/ を含んでいるか)
    if (typeof window !== "undefined" && window.location?.pathname?.includes("/status/")) {
      const primary = root.querySelector<HTMLElement>(SELECTORS.PRIMARY_COLUMN) ?? root;
      primary.classList.add("xcuic-status-detail");
    }

    return { tweets, articles, media };
  }

  function tagTweetContentContainer(tweet: HTMLElement, tweetText?: HTMLElement | null): void {
    const anchor = tweetText ?? tweet.querySelector<HTMLElement>(
      SELECTORS.TWEET_TEXT + ", " + SELECTORS.TWEET_PHOTO + ", " + SELECTORS.CARD_WRAPPER,
    );
    if (anchor === null) {
      return;
    }

    // 1. 本文・メディアから上へ遡り、アバター列と分岐する親（rowコンテナ）の直下コンテンツ列を特定
    let current: HTMLElement | null = anchor;
    while (current !== null && current !== tweet && current.parentElement !== null && current.parentElement !== tweet) {
      const parentEl: HTMLElement = current.parentElement;
      const parentHasAvatar = parentEl.querySelector(
        '[data-testid*="UserAvatar"], [data-testid*="Tweet-User-Avatar"]',
      ) !== null;
      const currentHasAvatar = current.querySelector(
        '[data-testid*="UserAvatar"], [data-testid*="Tweet-User-Avatar"]',
      ) !== null;

      if (parentHasAvatar && !currentHasAvatar) {
        current.classList.add("xcuic-tweet-content");
        if (current.style) {
          current.style.maxWidth = "100%";
          current.style.width = "100%";
          current.style.flexGrow = "1";
          current.style.flexShrink = "1";
          current.style.minWidth = "0";
        }
        // 行コンテナ（アバターとコンテンツ列を並べる親）も 100% 全幅化 & 上部揃え強制
        if (parentEl.style) {
          parentEl.style.width = "100%";
          parentEl.style.maxWidth = "100%";
          parentEl.style.alignItems = "flex-start";
        }
        // アバターを含む兄弟列（左列）を常に上部（flex-start）に固定
        for (const sibling of parentEl.children) {
          const siblingEl = sibling as HTMLElement;
          if (
            sibling !== current &&
            sibling.querySelector('[data-testid*="UserAvatar"], [data-testid*="Tweet-User-Avatar"]') &&
            siblingEl.style
          ) {
            siblingEl.style.alignSelf = "flex-start";
          }
        }
        return;
      }
      current = parentEl;
    }

    // 2. フォールバック: アバターが見つからない環境（モック等）での安全な特定
    let fallback: HTMLElement | null = anchor.parentElement;
    while (fallback !== null && fallback !== tweet) {
      if (
        fallback.parentElement === tweet ||
        (fallback.parentElement && fallback.parentElement.children.length >= 2)
      ) {
        fallback.classList.add("xcuic-tweet-content");
        if (fallback.style) {
          fallback.style.maxWidth = "100%";
          fallback.style.width = "100%";
          fallback.style.flexGrow = "1";
          fallback.style.flexShrink = "1";
        }
        if (fallback.parentElement && fallback.parentElement.style) {
          fallback.parentElement.style.width = "100%";
          fallback.parentElement.style.maxWidth = "100%";
          fallback.parentElement.style.alignItems = "flex-start";
        }
        break;
      }
      fallback = fallback.parentElement;
    }
  }

  function tagMediaWrapper(mediaEl: HTMLElement, tweet: HTMLElement): void {
    let current: HTMLElement | null = mediaEl.parentElement;
    let depth = 0;
    while (
      current !== null &&
      current !== tweet &&
      !current.classList.contains("xcuic-tweet-content") &&
      depth < 4
    ) {
      // アバターコンテナや行コンテナなど、アバターを含む上位コンテナには絶対に付与しない
      const containsAvatar =
        current.querySelector(
          '[data-testid*="UserAvatar"], [data-testid*="Tweet-User-Avatar"]',
        ) !== null;
      if (containsAvatar) {
        break;
      }

      current.classList.add("xcuic-media-wrapper");
      const style = current.getAttribute("style");
      if (
        style &&
        (style.includes("504") || style.includes("max-width") || style.includes("width"))
      ) {
        if (current.style) {
          current.style.maxWidth = "100%";
          current.style.width = "100%";
        }
      }
      current = current.parentElement;
      depth += 1;
    }
  }

  function tagQuoteTweets(tweet: HTMLElement): void {
    const candidates = tweet.querySelectorAll<HTMLElement>(SELECTORS.QUOTE_TWEET);
    for (const candidate of candidates) {
      const hasTweetText = candidate.querySelector(SELECTORS.TWEET_TEXT) !== null;
      const hasAvatarOrName =
        candidate.querySelector('[data-testid*="UserAvatar"], [data-testid*="User-Name"]') !==
        null;
      if (hasTweetText || hasAvatarOrName || candidate.getAttribute("role") === "blockquote") {
        candidate.classList.add("xcuic-quote-tweet", "xcuic-media");
        tagMediaWrapper(candidate, tweet);
      }
    }
  }

  export function clearContentClasses(root: ParentNode): void {
    const classesToRemove = [
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
    ];
    for (const cls of classesToRemove) {
      for (const el of root.querySelectorAll<HTMLElement>(`.${cls}`)) {
        el.classList.remove(cls);
      }
    }
  }
}
