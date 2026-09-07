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
        tagTweetContentContainer(tweet, tweetText);
      }

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

  function tagTweetContentContainer(tweet: HTMLElement, tweetText: HTMLElement): void {
    // tweetText から上に向かって探索し、アバターと横並びになっている親/祖先コンテナを検出
    let current: HTMLElement | null = tweetText.parentElement;
    while (current !== null && current !== tweet) {
      if (current.parentElement === tweet || (current.parentElement && current.parentElement.children.length >= 2)) {
        current.classList.add("xcuic-tweet-content");
        break;
      }
      current = current.parentElement;
    }
  }

  function tagMediaWrapper(mediaEl: HTMLElement, tweet: HTMLElement): void {
    let current: HTMLElement | null = mediaEl.parentElement;
    let depth = 0;
    while (current !== null && current !== tweet && depth < 4) {
      current.classList.add("xcuic-media-wrapper");
      const style = current.getAttribute("style");
      if (style && (style.includes("504") || style.includes("max-width") || style.includes("width"))) {
        // インラインスタイルの幅制限があれば解除
        current.style.maxWidth = "100%";
        current.style.width = "100%";
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
