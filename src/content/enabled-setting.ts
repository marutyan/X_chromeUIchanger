namespace Xcuic {
  /**
   * 有効化設定の読み込みと変更購読を提供する抽象インターフェース。
   * レイアウトコントローラーが具象ストレージ実装に依存しないようにします。
   */
  export interface EnabledSettingSource {
    /** 現在の設定値を非同期で取得する。 */
    get(): Promise<boolean>;
    /** 設定値の変更通知を受け取るリスナーを登録する。 */
    onChange(listener: (enabled: boolean) => void): void;
  }

  /**
   * chrome.storage.local API を利用した有効化設定の実装。
   * 拡張機能の実行環境において設定値の永続化と変更検知を担当します。
   */
  export class ChromeStorageEnabledSettingSource implements EnabledSettingSource {
    async get(): Promise<boolean> {
      try {
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          const stored = await chrome.storage.local.get({
            [SETTING_KEY_ENABLED]: DEFAULT_ENABLED,
          });
          const value = stored[SETTING_KEY_ENABLED];
          return typeof value === "boolean" ? value : DEFAULT_ENABLED;
        }
      } catch {
        // 取得失敗時は安全のため既定値を使用
      }
      return DEFAULT_ENABLED;
    }

    /**
     * chrome.storage の変更監視リスナーを登録する。
     * ポップアップ等による設定変更を即時反映するために必要。
     */
    onChange(listener: (enabled: boolean) => void): void {
      if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
        return;
      }

      const handleChanged = (
        changes: Record<string, XcuicStorageChange>,
        areaName: string,
      ): void => {
        if (areaName !== "local") {
          return;
        }
        const change = changes[SETTING_KEY_ENABLED];
        if (change && typeof change.newValue === "boolean") {
          listener(change.newValue);
        }
      };

      chrome.storage.onChanged.addListener(handleChanged);
    }
  }

  /**
   * メモリ上で既定値を返すフォールバック用の設定実装。
   * chrome.storage が利用できない非拡張機能環境で動作を担保するために使用する。
   */
  export class InMemoryEnabledSettingSource implements EnabledSettingSource {
    constructor(private readonly enabled: boolean = DEFAULT_ENABLED) {}

    async get(): Promise<boolean> {
      return this.enabled;
    }

    /**
     * 変更リスナー登録のスタブ。
     * 非拡張機能環境では外部変更が発生しないため何もしない。
     */
    onChange(_listener: (enabled: boolean) => void): void {}
  }
}
