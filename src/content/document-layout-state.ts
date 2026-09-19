namespace Xcuic {
  /**
   * documentElement へ付与する属性名の定義。
   * レイアウト適用およびモード切替用の属性を一元管理します。
   */
  export const LAYOUT_ATTRIBUTES = {
    ENABLED: "data-xcuic-enabled",
    LAYOUT: "data-xcuic-layout",
  } as const;

  /**
   * documentElement 上のレイアウト関連属性を一括操作・管理する責務を持つクラス。
   * 属性付与のタイミングを一元化し、CSS変数操作を行わずにDOM属性のみを更新します。
   */
  export class DocumentLayoutState {
    constructor(private readonly element: HTMLElement = document.documentElement) {}

    /**
     * 有効化フラグとレイアウトモードを同一フレームで同期的に適用する。
     * 有効化時に2つの属性が別フレームで付与される中間状態（一瞬のレイアウトずれ）を防止します。
     */
    apply(enabled: boolean, mode: LayoutMode): void {
      this.element.setAttribute(LAYOUT_ATTRIBUTES.ENABLED, enabled ? "true" : "false");
      this.element.setAttribute(LAYOUT_ATTRIBUTES.LAYOUT, mode);
    }

    /**
     * レイアウトモード（wide または compact）の属性値のみを更新する。
     */
    setLayoutMode(mode: LayoutMode): void {
      this.element.setAttribute(LAYOUT_ATTRIBUTES.LAYOUT, mode);
    }

    /**
     * 管理対象のレイアウト関連属性をすべて要素から削除する。
     */
    clear(): void {
      this.element.removeAttribute(LAYOUT_ATTRIBUTES.ENABLED);
      this.element.removeAttribute(LAYOUT_ATTRIBUTES.LAYOUT);
    }
  }
}
