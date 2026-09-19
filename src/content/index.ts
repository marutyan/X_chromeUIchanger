namespace Xcuic {
  /**
   * content script の合成ルート。依存関係を生成・結合してレイアウトコントローラーを初期化する。
   */
  export async function bootstrap(): Promise<void> {
    const settingSource = typeof chrome !== "undefined" && chrome.storage?.local
      ? new ChromeStorageEnabledSettingSource()
      : new InMemoryEnabledSettingSource();
    const controller = new LayoutController(settingSource);
    await controller.initialize();
  }
}

void Xcuic.bootstrap();
