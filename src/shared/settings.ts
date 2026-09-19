namespace Xcuic {
  /**
   * 拡張機能の有効・無効状態を chrome.storage に保持するためのキー名。
   * content script と popup の間でストレージキーの定義を一元化します。
   */
  export const SETTING_KEY_ENABLED = "enabled";

  /**
   * 拡張機能の初回インストール時および設定未定義時の有効化状態の既定値。
   * デフォルトで拡張機能のレイアウト制御を有効とします。
   */
  export const DEFAULT_ENABLED = true;
}
