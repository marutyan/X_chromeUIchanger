namespace Xcuic {
  /**
   * DOMの変更やURL遷移を監視し、レイアウト更新を適切にデバウンスしてトリガーする監視クラス。
   */
  export class RefreshObserver {
    private mutationObserver: MutationObserver | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private lastUrl = "";

    constructor(private readonly refresh: () => void) {}

    /**
     * DOM 変更監視を開始する。
     */
    start(): void {
      if (this.mutationObserver !== null) {
        return;
      }

      this.lastUrl = typeof window !== "undefined" ? window.location.href : "";

      const root = document.body ?? document.documentElement;
      this.mutationObserver = new MutationObserver((records) => {
        const currentUrl = typeof window !== "undefined" ? window.location.href : "";
        if (currentUrl !== this.lastUrl) {
          this.lastUrl = currentUrl;
          this.schedule(50);
          return;
        }

        if (records.some(hasSignificantElementMutation)) {
          this.schedule(200);
        }
      });

      this.mutationObserver.observe(root, {
        childList: true,
        subtree: true,
      });
    }

    /**
     * DOM 変更監視を停止し、保留中のデバウンスタイマーを解除する。
     */
    stop(): void {
      this.mutationObserver?.disconnect();
      this.mutationObserver = null;

      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }

    /**
     * 指定ミリ秒後に requestAnimationFrame を介して再描画処理をスケジュールする。
     */
    schedule(delayMs = 200): void {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        requestAnimationFrame(() => {
          this.refresh();
        });
      }, delayMs);
    }
  }

  /**
   * MutationRecord にレイアウト再計算が必要な重要ノードの追加・削除が含まれるかを判定する。
   */
  function hasSignificantElementMutation(record: MutationRecord): boolean {
    return (
      containsSignificantNode(record.addedNodes) ||
      containsSignificantNode(record.removedNodes)
    );
  }

  /**
   * NodeList 内に SELECTORS.SIGNIFICANT_MUTATION に合致する要素が存在するかを検査する。
   */
  function containsSignificantNode(nodes: NodeList): boolean {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (typeof el.matches === "function" && el.matches(SELECTORS.SIGNIFICANT_MUTATION)) {
          return true;
        }
      }
    }
    return false;
  }
}
