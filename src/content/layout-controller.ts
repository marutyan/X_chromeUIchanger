namespace Xcuic {
  /**
   * DOM から計測されたヘッダー幅・サイドバー幅・サイドバー表示状態およびビューポート幅。
   */
  export interface MeasuredLayoutContext {
    viewportWidthPx: number;
    headerWidthPx?: number | undefined;
    sidebarWidthPx?: number | undefined;
    hasSidebar: boolean;
  }

  /**
   * DOM 要素からヘッダー幅、サイドバー幅、サイドバー表示有無、ビューポート幅を実測する。
   * 現在の表示状態に応じたレイアウトモードを決定するための実測値を一括取得する。
   */
  export function measureLayoutContext(mainRegion: HTMLElement | null): MeasuredLayoutContext {
    const viewportWidthPx = window.innerWidth || document.documentElement.clientWidth;

    const headerEl = document.querySelector<HTMLElement>(SELECTORS.HEADER);
    const headerWidthPx = headerEl && headerEl.offsetWidth > 0 ? headerEl.offsetWidth : undefined;

    const sidebarEl = mainRegion?.querySelector<HTMLElement>(SELECTORS.SIDEBAR_COLUMN)
      ?? document.querySelector<HTMLElement>(SELECTORS.SIDEBAR_COLUMN);

    const hasSidebar = sidebarEl !== null
      ? (sidebarEl.offsetWidth > 0 && getComputedStyle(sidebarEl).display !== "none")
      : false;

    const sidebarWidthPx = (sidebarEl && sidebarEl.offsetWidth > 0) ? sidebarEl.offsetWidth : undefined;

    return {
      viewportWidthPx,
      headerWidthPx,
      sidebarWidthPx,
      hasSidebar,
    };
  }

  /**
   * DOMの監視、レイアウトモードの判定、DOMへの属性・クラス反映を統括するコントローラー。
   */
  export class LayoutController {
    private mainRegion: HTMLElement | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private enabled = false;
    private isCurrentlyWide = false;
    private previousLayoutMode: LayoutMode | null = null;
    private readonly refreshObserver = new RefreshObserver(() => this.refresh());
    private resizeAnimationFrameId: number | null = null;
    private readonly documentLayoutState: DocumentLayoutState;

    constructor(
      private readonly settingSource: EnabledSettingSource,
      documentLayoutState?: DocumentLayoutState,
    ) {
      this.documentLayoutState = documentLayoutState ?? new DocumentLayoutState();
    }

    /**
     * 設定情報源から初期値を読み込み、変更購読を開始する。
     */
    async initialize(): Promise<void> {
      const initialEnabled = await this.settingSource.get();
      this.setEnabled(initialEnabled);

      this.settingSource.onChange((nextEnabled) => {
        this.setEnabled(nextEnabled);
      });
    }

    /**
     * 有効化フラグを更新し、有効化・無効化のライフサイクル処理を実行する。
     */
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

    /**
     * メイン領域の再探索、タグ付け、およびレイアウトメトリクス更新をトリガーする。
     */
    refresh(): void {
      if (!this.enabled) {
        return;
      }

      this.updateMainRegionTargets();
      this.scheduleMetricsUpdate();
    }

    /**
     * 拡張機能を有効化し、enabled 属性付与、DOM タグ付け、同期実測、layout 属性付与および監視開始を行う。
     * 拡張 CSS 適用済みの DOM から実測して初期モードを正確に決定し、中間フレームを生じさせないために必要。
     */
    private enable(): void {
      this.documentLayoutState.setEnabled();
      this.updateMainRegionTargets();

      const initialMode = this.computeLayoutMode();
      this.isCurrentlyWide = (initialMode === "wide");
      this.previousLayoutMode = initialMode;
      this.documentLayoutState.setLayoutMode(initialMode);

      this.startWindowObserver();
      this.refreshObserver.start();
    }

    /**
     * 監視を停止し、付与した属性・クラスをすべて消去して初期状態へ戻す。
     */
    private disable(): void {
      this.refreshObserver.stop();
      this.stopWindowObserver();
      this.detachFromMainRegion();
      this.documentLayoutState.clear();
      this.previousLayoutMode = null;
      this.isCurrentlyWide = false;
    }

    /**
     * documentElement のリサイズ監視を開始する。
     */
    private startWindowObserver(): void {
      if (this.resizeObserver !== null) {
        return;
      }

      const target = document.documentElement;
      this.resizeObserver = new ResizeObserver(() => {
        this.scheduleMetricsUpdate();
      });
      this.resizeObserver.observe(target);
    }

    /**
     * リサイズ監視を停止し、保留中のアニメーションフレームをキャンセルする。
     */
    private stopWindowObserver(): void {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;

      if (this.resizeAnimationFrameId !== null) {
        cancelAnimationFrame(this.resizeAnimationFrameId);
        this.resizeAnimationFrameId = null;
      }
    }

    /**
     * メイン領域の再探索、アタッチ、およびレイアウト用クラスの付与を行う。
     * enable() と refresh() で重複するメイン領域の検出・追従処理を一元化するために必要。
     */
    private updateMainRegionTargets(): void {
      const nextMainRegion = findMainRegion();
      if (nextMainRegion === null) {
        this.detachFromMainRegion();
        return;
      }

      if (nextMainRegion !== this.mainRegion) {
        this.attachToMainRegion(nextMainRegion);
      }

      tagLayoutTargets(nextMainRegion);
    }

    /**
     * 新しいメイン領域にアタッチする。
     */
    private attachToMainRegion(mainRegion: HTMLElement): void {
      this.detachFromMainRegion();
      this.mainRegion = mainRegion;
    }

    /**
     * 現在のメイン領域からクラスを消去してデタッチする。
     */
    private detachFromMainRegion(): void {
      if (this.mainRegion !== null) {
        clearTargetClasses(this.mainRegion);
      }
      this.mainRegion = null;
    }

    /**
     * requestAnimationFrame を用いてレイアウトモード更新を間引いて予約する。
     */
    private scheduleMetricsUpdate(): void {
      if (!this.enabled || this.resizeAnimationFrameId !== null) {
        return;
      }

      this.resizeAnimationFrameId = requestAnimationFrame(() => {
        this.resizeAnimationFrameId = null;
        this.updateMetrics();
      });
    }

    /**
     * 現在の DOM 実測値から適用すべきレイアウトモードを算出する。
     */
    private computeLayoutMode(): LayoutMode {
      const measured = measureLayoutContext(this.mainRegion);
      return resolveLayoutMode(measured.viewportWidthPx, {
        currentlyWide: this.isCurrentlyWide,
        headerWidthPx: measured.headerWidthPx,
        sidebarWidthPx: measured.sidebarWidthPx,
        hasSidebar: measured.hasSidebar,
      });
    }

    /**
     * レイアウトモードを再計算し、前回と差異がある場合のみ documentElement の属性を更新する。
     */
    private updateMetrics(): void {
      if (!this.enabled) {
        return;
      }

      const nextMode = this.computeLayoutMode();
      this.isCurrentlyWide = (nextMode === "wide");

      if (nextMode === this.previousLayoutMode) {
        return;
      }
      this.previousLayoutMode = nextMode;
      this.documentLayoutState.setLayoutMode(nextMode);
    }
  }
}
