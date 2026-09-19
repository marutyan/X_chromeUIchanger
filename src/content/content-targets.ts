namespace Xcuic {
  /**
   * コンテンツ要素（ツイート・記事）へのクラス付与結果の件数。
   */
  export interface ContentTargetsCount {
    tweets: number;
    articles: number;
  }

  /**
   * ツイート本文、記事などのコンテンツ要素を特定し拡張機能用のクラスを付与する。
   */
  export function tagContentTargets(root: HTMLElement): ContentTargetsCount {
    let tweets = 0;
    let articles = 0;

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

    return { tweets, articles };
  }
}

