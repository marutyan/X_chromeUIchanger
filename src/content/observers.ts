namespace Xcuic {
  export class RefreshObserver {
    private mutationObserver: MutationObserver | null = null;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private lastUrl = "";

    constructor(private readonly refresh: () => void) {}

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

    stop(): void {
      this.mutationObserver?.disconnect();
      this.mutationObserver = null;

      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
    }

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

  function hasSignificantElementMutation(record: MutationRecord): boolean {
    return (
      containsSignificantNode(record.addedNodes) ||
      containsSignificantNode(record.removedNodes)
    );
  }

  function containsSignificantNode(nodes: NodeList): boolean {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node && node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const testId = el.getAttribute?.("data-testid") ?? "";
        if (
          testId === "primaryColumn" ||
          testId === "sidebarColumn" ||
          testId === "cellInnerDiv" ||
          el.tagName === "MAIN" ||
          el.getAttribute?.("role") === "main"
        ) {
          return true;
        }
      }
    }
    return false;
  }
}
