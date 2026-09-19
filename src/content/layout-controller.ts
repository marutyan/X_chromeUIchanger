namespace Xcuic {
  const DEFAULT_ENABLED = true;
  const ENABLED_ATTRIBUTE = "data-xcuic-enabled";
  const LAYOUT_ATTRIBUTE = "data-xcuic-layout";
  const CSS_VARIABLES = [
    "--xcuic-timeline-width",
    "--xcuic-sidebar-width",
    "--xcuic-canvas-width",
  ] as const;

  export class LayoutController {
    private mainRegion: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private enabled = false;
    private isCurrentlyWide = false;
    private readonly refreshObserver = new RefreshObserver(() => this.refresh());
    private previousMetricsKey = "";
    private resizeAnimationFrameId: number | null = null;

    async initialize(): Promise<void> {
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          const stored = await chrome.storage.local.get({ enabled: DEFAULT_ENABLED });
          this.setEnabled(
            typeof stored.enabled === "boolean" ? stored.enabled : DEFAULT_ENABLED,
          );

          chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName !== "local") {
              return;
            }

            const nextEnabled = changes["enabled"]?.newValue;
            if (typeof nextEnabled === "boolean") {
              this.setEnabled(nextEnabled);
            }
          });
          return;
        }
      } catch {
        // Fallback for non-extension context or storage error
      }

      this.setEnabled(DEFAULT_ENABLED);
    }

    setEnabled(enabled: boolean): void {
      if (this.enabled === enabled) {
        if (enabled) {
          this.refresh();
        }
        return;
      }

      this.enabled = enabled;
      if (enabled) {
        this.enable();
      } else {
        this.disable();
      }
    }

    refresh(): void {
      if (!this.enabled) {
        return;
      }

      const nextMainRegion = findMainRegion();
      if (nextMainRegion === null) {
        this.detachFromMainRegion();
        return;
      }

      if (nextMainRegion !== this.mainRegion) {
        this.attachToMainRegion(nextMainRegion);
      }

      tagLayoutTargets(nextMainRegion);
      this.scheduleMetricsUpdate();
    }

    private enable(): void {
      document.documentElement.setAttribute(ENABLED_ATTRIBUTE, "true");
      this.startWindowObserver();
      this.refreshObserver.start();
      this.refresh();
    }

    private disable(): void {
      this.refreshObserver.stop();
      this.stopWindowObserver();
      this.detachFromMainRegion();
      document.documentElement.removeAttribute(ENABLED_ATTRIBUTE);
      document.documentElement.removeAttribute(LAYOUT_ATTRIBUTE);
      document.documentElement.removeAttribute("data-xcuic-sidebar");
      for (const variable of CSS_VARIABLES) {
        document.documentElement.style.removeProperty(variable);
      }
      this.previousMetricsKey = "";
      this.isCurrentlyWide = false;
    }

    private startWindowObserver(): void {
      if (this.resizeObserver !== null) {
        return;
      }

      // mainRegion ではなく documentElement（またはwindow）を監視
      // 子要素の幅変更による無限フィードバックループ（画面の痙攣）を原理的に遮断
      const target = document.documentElement;
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleMetricsUpdate();
      });
      this.resizeObserver.observe(target);
    }

    private stopWindowObserver(): void {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;

      if (this.resizeAnimationFrameId !== null) {
        cancelAnimationFrame(this.resizeAnimationFrameId);
        this.resizeAnimationFrameId = null;
      }
    }

    private attachToMainRegion(mainRegion: HTMLElement): void {
      this.detachFromMainRegion();
      this.mainRegion = mainRegion;
    }

    private detachFromMainRegion(): void {
      if (this.mainRegion !== null) {
        clearTargetClasses(this.mainRegion);
      }
      this.mainRegion = null;
    }

    private scheduleMetricsUpdate(): void {
      if (!this.enabled || this.resizeAnimationFrameId !== null) {
        return;
      }

      this.resizeAnimationFrameId = requestAnimationFrame(() => {
        this.resizeAnimationFrameId = null;
        this.updateMetrics();
      });
    }

    private updateMetrics(): void {
      if (!this.enabled) {
        return;
      }

      // ビューポート幅（ズーム時も縮小される）を基準にメトリクスを算出
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

      // DOM から header と sidebar の実測幅と存在を確認
      const headerEl = document.querySelector<HTMLElement>(SELECTORS.HEADER);
      const headerWidthPx = headerEl && headerEl.offsetWidth > 0 ? headerEl.offsetWidth : undefined;

      const sidebarEl = this.mainRegion?.querySelector<HTMLElement>(SELECTORS.SIDEBAR_COLUMN)
        ?? document.querySelector<HTMLElement>(SELECTORS.SIDEBAR_COLUMN);
      const hasSidebar = sidebarEl !== null
        ? (sidebarEl.offsetWidth > 0 && getComputedStyle(sidebarEl).display !== "none")
        : false;
      const sidebarWidthPx = (sidebarEl && sidebarEl.offsetWidth > 0) ? sidebarEl.offsetWidth : undefined;

      const metrics = calculateLayoutMetrics(viewportWidth, {
        currentlyWide: this.isCurrentlyWide,
        headerWidthPx,
        sidebarWidthPx,
        hasSidebar,
      });
      this.isCurrentlyWide = !metrics.compact;

      const metricsKey = [
        metrics.timelineWidthPx,
        metrics.sidebarWidthPx,
        metrics.canvasWidthPx,
        metrics.compact,
      ].join(":");

      if (metricsKey === this.previousMetricsKey) {
        return;
      }
      this.previousMetricsKey = metricsKey;

      document.documentElement.setAttribute(
        LAYOUT_ATTRIBUTE,
        metrics.compact ? "compact" : "wide",
      );
      document.documentElement.setAttribute(
        "data-xcuic-sidebar",
        hasSidebar ? "true" : "false",
      );
      document.documentElement.style.setProperty(
        "--xcuic-timeline-width",
        `${metrics.timelineWidthPx}px`,
      );
      document.documentElement.style.setProperty(
        "--xcuic-sidebar-width",
        `${metrics.sidebarWidthPx}px`,
      );
      document.documentElement.style.setProperty(
        "--xcuic-canvas-width",
        `${metrics.canvasWidthPx}px`,
      );
    }
  }
}
