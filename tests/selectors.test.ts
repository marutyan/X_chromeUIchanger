declare function require(name: string): any;

namespace SelectorTests {
  const assert = require("node:assert/strict");
  const test = require("node:test");

  class FakeClassList {
    private readonly values = new Set<string>();

    add(...names: string[]): void {
      for (const name of names) this.values.add(name);
    }

    remove(...names: string[]): void {
      for (const name of names) this.values.delete(name);
    }

    contains(name: string): boolean {
      return this.values.has(name);
    }
  }

  export class FakeElement {
    readonly children: FakeElement[] = [];
    readonly classList = new FakeClassList();
    readonly dataset: Record<string, string> = {};
    parentElement: FakeElement | null = null;

    constructor(
      readonly tagName: string,
      readonly attributes: Record<string, string> = {},
    ) {
      for (const [key, value] of Object.entries(attributes)) {
        if (key.startsWith("data-")) {
          const camelKey = key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          this.dataset[camelKey] = value;
        }
      }
    }

    get firstElementChild(): FakeElement | null {
      return this.children[0] ?? null;
    }

    getAttribute(name: string): string | null {
      return this.attributes[name] ?? null;
    }

    setAttribute(name: string, value: string): void {
      this.attributes[name] = value;
    }

    append(...children: FakeElement[]): FakeElement {
      for (const child of children) {
        child.parentElement = this;
        this.children.push(child);
      }
      return children[0]!;
    }

    contains(candidate: FakeElement): boolean {
      return candidate === this || this.children.some((child) => child.contains(candidate));
    }

    querySelector<T>(_selector: string): T | null {
      return (this.querySelectorAll(_selector)[0] as T | undefined) ?? null;
    }

    querySelectorAll<T>(selector: string): T[] {
      const matches: FakeElement[] = [];
      const visit = (element: FakeElement): void => {
        if (element.matches(selector)) matches.push(element);
        for (const child of element.children) visit(child);
      };
      for (const child of this.children) visit(child);
      return matches as T[];
    }

    closest<T>(selector: string): T | null {
      let current: FakeElement | null = this;
      while (current !== null) {
        if (current.matches(selector)) return current as T;
        current = current.parentElement;
      }
      return null;
    }

    matches(selectorList: string): boolean {
      return selectorList.split(",").some((part) => this.matchesSelector(part.trim()));
    }

    private matchesSelector(selector: string): boolean {
      const parts = selector.split(/\s+/);
      if (parts.length === 1) {
        return this.matchesCompound(parts[0]!);
      }
      if (!this.matchesCompound(parts[parts.length - 1]!)) {
        return false;
      }
      let current: FakeElement | null = this.parentElement;
      let partIndex = parts.length - 2;
      while (current !== null && partIndex >= 0) {
        if (current.matchesCompound(parts[partIndex]!)) {
          partIndex--;
        }
        current = current.parentElement;
      }
      return partIndex < 0;
    }

    private matchesCompound(sel: string): boolean {
      let remaining = sel;
      const tagMatch = remaining.match(/^[a-zA-Z0-9_-]+/);
      if (tagMatch) {
        if (this.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) {
          return false;
        }
        remaining = remaining.slice(tagMatch[0].length);
      }

      while (remaining.length > 0) {
        if (remaining.startsWith(".")) {
          const classMatch = remaining.match(/^\.([a-zA-Z0-9_-]+)/);
          if (!classMatch) return false;
          if (!this.classList.contains(classMatch[1]!)) return false;
          remaining = remaining.slice(classMatch[0].length);
        } else if (remaining.startsWith("[")) {
          const attrMatch = remaining.match(
            /^\[([a-zA-Z0-9_.-]+)(?:([*^$]?=)(?:"([^"]*)"|'([^']*)'|([^\]]+)))?(\s+i)?\]/,
          );
          if (!attrMatch) return false;
          const attrName = attrMatch[1]!;
          const operator = attrMatch[2];
          const attrVal = attrMatch[3] ?? attrMatch[4] ?? attrMatch[5];
          const caseInsensitive = Boolean(attrMatch[6]);

          const actualVal = this.getAttribute(attrName);
          if (actualVal === null) return false;

          if (operator !== undefined) {
            const valToCompare = caseInsensitive ? actualVal.toLowerCase() : actualVal;
            const targetVal = caseInsensitive ? (attrVal ?? "").toLowerCase() : (attrVal ?? "");

            if (operator === "=" && valToCompare !== targetVal) return false;
            if (operator === "*=" && !valToCompare.includes(targetVal)) return false;
            if (operator === "^=" && !valToCompare.startsWith(targetVal)) return false;
            if (operator === "$=" && !valToCompare.endsWith(targetVal)) return false;
          }
          remaining = remaining.slice(attrMatch[0].length);
        } else {
          return false;
        }
      }
      return true;
    }
  }

  test("findMainRegion: main[role=main] と primaryColumn から正常に特定する", () => {
    const root = new FakeElement("div");
    const header = root.append(new FakeElement("header", { role: "banner" }));
    const main = root.append(new FakeElement("main", { role: "main" }));
    const wrapper = main.append(new FakeElement("div"));
    const primary = wrapper.append(new FakeElement("div", { "data-testid": "primaryColumn" }));
    const sidebar = wrapper.append(new FakeElement("div", { "data-testid": "sidebarColumn" }));

    const found = Xcuic.findMainRegion(root as unknown as ParentNode);
    assert.equal(found, main);
  });

  test("findMainRegion: main要素内にtweetが存在する場合も特定できる", () => {
    const root = new FakeElement("div");
    const main = root.append(new FakeElement("main", { role: "main" }));
    const tweet = main.append(new FakeElement("article", { "data-testid": "tweet" }));

    const found = Xcuic.findMainRegion(root as unknown as ParentNode);
    assert.equal(found, main);
  });

  test("findMainRegion: primaryColumnからclosestまたはparentElementで特定するフォールバック", () => {
    const root = new FakeElement("div");
    const wrapper = root.append(new FakeElement("div"));
    const primary = wrapper.append(new FakeElement("div", { "data-testid": "primaryColumn" }));

    const found = Xcuic.findMainRegion(root as unknown as ParentNode);
    assert.equal(found, wrapper);
  });

  test("findMainRegion: 対象が見つからない場合はnullを返す", () => {
    const root = new FakeElement("div");
    root.append(new FakeElement("div", { id: "empty" }));

    const found = Xcuic.findMainRegion(root as unknown as ParentNode);
    assert.equal(found, null);
  });

  test("tagLayoutTargets: primary-column, sidebar-column, main-wrapper, timeline, メディア, 記事へクラスを付与する", () => {
    const main = new FakeElement("main", { role: "main" });
    const mainWrapper = main.append(new FakeElement("div"));
    const primaryColumn = mainWrapper.append(
      new FakeElement("div", { "data-testid": "primaryColumn" }),
    );
    const timeline = primaryColumn.append(
      new FakeElement("section", { role: "region" }),
    );

    // ツイートとメディア要素
    const tweet = timeline.append(
      new FakeElement("article", { "data-testid": "tweet" }),
    );
    const tweetText = tweet.append(
      new FakeElement("div", { "data-testid": "tweetText" }),
    );
    const tweetPhoto = tweet.append(
      new FakeElement("div", { "data-testid": "tweetPhoto" }),
    );
    const tweetVideo = tweet.append(
      new FakeElement("div", { "data-testid": "videoPlayer" }),
    );
    const cardWrapper = tweet.append(
      new FakeElement("div", { "data-testid": "card.wrapper" }),
    );
    const quoteTweet = tweet.append(
      new FakeElement("div", {
        role: "link",
        tabindex: "0",
      }),
    );
    quoteTweet.append(new FakeElement("div", { "data-testid": "tweetText" }));

    // 記事要素
    const article = timeline.append(
      new FakeElement("article", { "data-testid": "article" }),
    );
    const articleParagraph = article.append(new FakeElement("p"));

    // サイドバー
    const sidebarColumn = mainWrapper.append(
      new FakeElement("div", { "data-testid": "sidebarColumn" }),
    );

    const result = Xcuic.tagLayoutTargets(main as unknown as HTMLElement);

    assert.equal(result.primaryColumnFound, true);
    assert.equal(result.sidebarColumnFound, true);
    assert.equal(result.tweetsCount, 1);
    assert.equal(result.articlesCount, 1);
    assert.equal(result.mediaCount, 3); // photo(1) + video(1) + card(1)

    // クラス付与検証
    assert.equal(primaryColumn.classList.contains("xcuic-primary-column"), true);
    assert.equal(sidebarColumn.classList.contains("xcuic-sidebar-column"), true);
    assert.equal(mainWrapper.classList.contains("xcuic-main-wrapper"), true);
    assert.equal(timeline.classList.contains("xcuic-timeline-wrapper"), true);
    assert.equal(tweet.classList.contains("xcuic-tweet"), true);
    assert.equal(tweetText.classList.contains("xcuic-tweet-text"), true);
    assert.equal(tweetPhoto.classList.contains("xcuic-tweet-photo"), true);
    assert.equal(tweetPhoto.classList.contains("xcuic-media"), true);
    assert.equal(tweetVideo.classList.contains("xcuic-tweet-video"), true);
    assert.equal(tweetVideo.classList.contains("xcuic-media"), true);
    assert.equal(cardWrapper.classList.contains("xcuic-card-wrapper"), true);
    assert.equal(cardWrapper.classList.contains("xcuic-media"), true);
    assert.equal(quoteTweet.classList.contains("xcuic-quote-tweet"), true);
    assert.equal(quoteTweet.classList.contains("xcuic-media"), true);
    assert.equal(article.classList.contains("xcuic-article"), true);
    assert.equal(articleParagraph.classList.contains("xcuic-article-content"), true);

    // クラス完全消去検証
    Xcuic.clearTargetClasses(main as unknown as ParentNode);
    assert.equal(primaryColumn.classList.contains("xcuic-primary-column"), false);
    assert.equal(sidebarColumn.classList.contains("xcuic-sidebar-column"), false);
    assert.equal(mainWrapper.classList.contains("xcuic-main-wrapper"), false);
    assert.equal(timeline.classList.contains("xcuic-timeline-wrapper"), false);
    assert.equal(tweet.classList.contains("xcuic-tweet"), false);
    assert.equal(tweetText.classList.contains("xcuic-tweet-text"), false);
    assert.equal(tweetPhoto.classList.contains("xcuic-tweet-photo"), false);
    assert.equal(tweetPhoto.classList.contains("xcuic-media"), false);
    assert.equal(tweetVideo.classList.contains("xcuic-tweet-video"), false);
    assert.equal(cardWrapper.classList.contains("xcuic-card-wrapper"), false);
    assert.equal(quoteTweet.classList.contains("xcuic-quote-tweet"), false);
    assert.equal(article.classList.contains("xcuic-article"), false);
    assert.equal(articleParagraph.classList.contains("xcuic-article-content"), false);
  });

  test("tagLayoutTargets: アバター列の兄弟要素（右側コンテンツ列全体）を正しく検出してxcuic-tweet-contentを付与する", () => {
    const main = new FakeElement("main", { role: "main" });
    const primary = main.append(new FakeElement("div", { "data-testid": "primaryColumn" }));
    const timeline = primary.append(new FakeElement("section", { role: "region" }));
    const tweet = timeline.append(new FakeElement("article", { "data-testid": "tweet" }));

    // X の実 DOM 構造: アバター列と右側コンテンツ列が横並び
    const rowWrapper = tweet.append(new FakeElement("div"));
    const avatarCol = rowWrapper.append(new FakeElement("div"));
    avatarCol.append(new FakeElement("div", { "data-testid": "Tweet-User-Avatar" }));

    const contentCol = rowWrapper.append(new FakeElement("div"));
    const headerBlock = contentCol.append(new FakeElement("div", { "data-testid": "User-Name" }));
    const textBlock = contentCol.append(new FakeElement("div", { "data-testid": "tweetText" }));
    const photoBlock = contentCol.append(new FakeElement("div", { "data-testid": "tweetPhoto" }));

    Xcuic.tagLayoutTargets(main as unknown as HTMLElement);

    assert.equal(
      contentCol.classList.contains("xcuic-tweet-content"),
      true,
      "アバターの兄弟であるコンテンツ列全体に xcuic-tweet-content が付与されるべき",
    );
    assert.equal(
      textBlock.classList.contains("xcuic-tweet-text"),
      true,
    );
    assert.equal(
      photoBlock.classList.contains("xcuic-tweet-photo"),
      true,
    );
  });
}
