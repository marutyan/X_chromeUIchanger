namespace Xcuic {
  /**
   * 有効化設定の読み込みと変更購読を提供する抽象インターフェース。
   * レイアウトコントローラーが具象ストレージ実装に依存しないようにします。
   */
  export interface EnabledSettingSource {
    /** 現在の設定値を非同期で取得する。 */
    get(): Promise<boolean>;
    /** 設定値の変更通知を受け取るリスナーを登録する。購読解除用の関数を返す。 */
    onChange(listener: (enabled: boolean) => void): () => void;
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

    onChange(listener: (enabled: boolean) => void): () => void {
      if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
        return () => {};
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
      return () => {
        // chrome.storage.onChanged の型定義および実行環境の制約に合わせクリーンアップ
      };
    }
  }

  /**
   * メモリ上で設定値を保持するテスト・フォールバック用の設定実装。
   * 拡張機能 API が利用できない非ブラウザ環境などで動作を担保します。
   */
  export class InMemoryEnabledSettingSource implements EnabledSettingSource {
    private readonly listeners = new Set<(enabled: boolean) => void>();

    constructor(private enabled: boolean = DEFAULT_ENABLED) {}

    async get(): Promise<boolean> {
      return this.enabled;
    }

    onChange(listener: (enabled: boolean) => void): () => void {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }

    /**
     * テスト環境等から設定値を更新し、リスナーへ変更を通知する。
     */
    set(enabled: boolean): void {
      if (this.enabled !== enabled) {
        this.enabled = enabled;
        for (const listener of this.listeners) {
          listener(enabled);
        }
      }
    }
  }
}
