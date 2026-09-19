namespace XcuicPopup {
  function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
  }

  async function initialize(): Promise<void> {
    const toggle = document.querySelector<HTMLInputElement>("#layout-enabled");
    const status = document.querySelector<HTMLElement>("#layout-status");

    if (toggle === null || status === null) {
      return;
    }

    const stored = await chrome.storage.local.get({
      [Xcuic.SETTING_KEY_ENABLED]: Xcuic.DEFAULT_ENABLED,
    });
    const storedValue = stored[Xcuic.SETTING_KEY_ENABLED];
    const enabled = isBoolean(storedValue) ? storedValue : Xcuic.DEFAULT_ENABLED;

    toggle.checked = enabled;
    updateStatus(status, enabled);

    toggle.addEventListener("change", async () => {
      const nextEnabled = toggle.checked;
      await chrome.storage.local.set({ [Xcuic.SETTING_KEY_ENABLED]: nextEnabled });
      updateStatus(status, nextEnabled);
    });
  }

  function updateStatus(status: HTMLElement, enabled: boolean): void {
    status.textContent = enabled ? "Enabled" : "Disabled";
  }

  void initialize();
}
