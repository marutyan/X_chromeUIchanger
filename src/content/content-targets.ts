namespace Xcuic {
  /**
   * コンテンツ要素（ツイート・記事・メディア）へのクラス付与結果の件数。
   */
  export interface ContentTargetsCount {
    tweets: number;
    articles: number;
    media: number;
  }

  /**
   * ツイート本文、メディア、記事などのコンテンツ要素を特定し拡張機能用のクラスを付与する。
   */
  export function tagContentTargets(root: HTMLElement): ContentTargetsCount {
    let tweets = 0;
    let articles = 0;
    let media = 0;

    // 1. ツイート (article[data-testid="tweet"])
    const tweetElements = root.querySelectorAll<HTMLElement>(SELECTORS.TWEET);
    for (const tweet of tweetElements) {
      tweet.classList.add(CLASS_NAMES.TWEET);
      tweets += 1;

      // tweetText
      const tweetText = tweet.querySelector<HTMLElement>(SELECTORS.TWEET_TEXT);
      if (tweetText !== null) {
        tweetText.classList.add(CLASS_NAMES.TWEET_TEXT);
      }

      // ツイート右側のコンテンツ列（Right Column）の特定
      tagTweetContentContainer(tweet, tweetText);

      // 写真 (tweetPhoto)
      for (const photo of tweet.querySelectorAll<HTMLElement>(SELECTORS.TWEET_PHOTO)) {
        photo.classList.add(CLASS_NAMES.TWEET_PHOTO, CLASS_NAMES.MEDIA);
        tagMediaWrapper(photo, tweet);
        media += 1;
      }

      // 動画 (videoPlayer, videoComponent)
      for (const video of tweet.querySelectorAll<HTMLElement>(SELECTORS.TWEET_VIDEO)) {
        video.classList.add(CLASS_NAMES.TWEET_VIDEO, CLASS_NAMES.MEDIA);
        tagMediaWrapper(video, tweet);
        media += 1;
      }

      // カード (card.wrapper)
      for (const card of tweet.querySelectorAll<HTMLElement>(SELECTORS.CARD_WRAPPER)) {
        card.classList.add(CLASS_NAMES.CARD_WRAPPER, CLASS_NAMES.MEDIA);
        tagMediaWrapper(card, tweet);
        media += 1;
      }

      // 引用ツイート
      tagQuoteTweets(tweet);
    }

    // 2. 記事 (X Articles / note / status詳細)
    const articleElements = root.querySelectorAll<HTMLElement>(SELECTORS.ARTICLE);
    for (const article of articleElements) {
      article.classList.add(CLASS_NAMES.ARTICLE);
      articles += 1;

      for (const block of article.children) {
        (block as HTMLElement).classList.add(CLASS_NAMES.ARTICLE_CONTENT);
      }
    }

    // status詳細ページの判定 (URLが /status/ を含んでいるか)
    if (typeof window !== "undefined" && window.location?.pathname?.includes("/status/")) {
      const primary = root.querySelector<HTMLElement>(SELECTORS.PRIMARY_COLUMN) ?? root;
      primary.classList.add(CLASS_NAMES.STATUS_DETAIL);
    }

    return { tweets, articles, media };
  }

  /**
   * ツイート行コンテナ、アバター列、およびコンテンツ列を特定してクラスを付与する。
   * インラインスタイルの直接操作は行わず、CSS規則適用のためのクラス付与のみを担います。
   */
  function tagTweetContentContainer(tweet: HTMLElement, tweetText?: HTMLElement | null): void {
    const anchor = tweetText ?? tweet.querySelector<HTMLElement>(
      SELECTORS.TWEET_TEXT + ", " + SELECTORS.TWEET_PHOTO + ", " + SELECTORS.CARD_WRAPPER,
    );
    if (anchor === null) {
      return;
    }

    // 1. 本文・メディアから上へ遡り、アバター列と分岐する親（行コンテナ）の直下コンテンツ列を特定
    let current: HTMLElement | null = anchor;
    while (current !== null && current !== tweet && current.parentElement !== null && current.parentElement !== tweet) {
      const parentEl: HTMLElement = current.parentElement;
      const parentHasAvatar = parentEl.querySelector(SELECTORS.AVATAR) !== null;
      const currentHasAvatar = current.querySelector(SELECTORS.AVATAR) !== null;

      if (parentHasAvatar && !currentHasAvatar) {
        current.classList.add(CLASS_NAMES.TWEET_CONTENT);
        parentEl.classList.add(CLASS_NAMES.TWEET_ROW);

        // アバターを含む兄弟列（左列）へクラス付与
        for (const sibling of parentEl.children) {
          const siblingEl = sibling as HTMLElement;
          if (sibling !== current && sibling.querySelector(SELECTORS.AVATAR)) {
            siblingEl.classList.add(CLASS_NAMES.AVATAR_COLUMN);
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
        fallback.classList.add(CLASS_NAMES.TWEET_CONTENT);
        if (fallback.parentElement) {
          fallback.parentElement.classList.add(CLASS_NAMES.TWEET_ROW);
        }
        break;
      }
      fallback = fallback.parentElement;
    }
  }

  /**
   * メディア要素を包含する中間ラッパー要素群へクラスを付与する。
   */
  function tagMediaWrapper(mediaEl: HTMLElement, tweet: HTMLElement): void {
    let current: HTMLElement | null = mediaEl.parentElement;
    let depth = 0;
    while (
      current !== null &&
      current !== tweet &&
      !current.classList.contains(CLASS_NAMES.TWEET_CONTENT) &&
      depth < 4
    ) {
      const containsAvatar = current.querySelector(SELECTORS.AVATAR) !== null;
      if (containsAvatar) {
        break;
      }

      current.classList.add(CLASS_NAMES.MEDIA_WRAPPER);
      current = current.parentElement;
      depth += 1;
    }
  }

  /**
   * ツイート内の引用ツイート要素を検出しクラスを付与する。
   */
  function tagQuoteTweets(tweet: HTMLElement): void {
    const candidates = tweet.querySelectorAll<HTMLElement>(SELECTORS.QUOTE_TWEET);
    for (const candidate of candidates) {
      const hasTweetText = candidate.querySelector(SELECTORS.TWEET_TEXT) !== null;
      const hasAvatarOrName =
        candidate.querySelector(SELECTORS.AVATAR) !== null ||
        candidate.querySelector('[data-testid*="User-Name"]') !== null;
      if (hasTweetText || hasAvatarOrName || candidate.getAttribute("role") === "blockquote") {
        candidate.classList.add(CLASS_NAMES.QUOTE_TWEET, CLASS_NAMES.MEDIA);
        tagMediaWrapper(candidate, tweet);
      }
    }
  }
}
