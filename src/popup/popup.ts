namespace XcuicPopup {
  const DEFAULT_ENABLED = true;

  function isBoolean(value: unknown): value is boolean {
    return typeof value === "boolean";
  }

  async function initialize(): Promise<void> {
    const toggle = document.querySelector<HTMLInputElement>("#layout-enabled");
    const status = document.querySelector<HTMLElement>("#layout-status");

    if (toggle === null || status === null) {
      return;
    }

    const stored = await chrome.storage.local.get({ enabled: DEFAULT_ENABLED });
    const enabled = isBoolean(stored.enabled) ? stored.enabled : DEFAULT_ENABLED;

    toggle.checked = enabled;
    updateStatus(status, enabled);

    toggle.addEventListener("change", async () => {
      const nextEnabled = toggle.checked;
      await chrome.storage.local.set({ enabled: nextEnabled });
      updateStatus(status, nextEnabled);
    });
  }

  function updateStatus(status: HTMLElement, enabled: boolean): void {
    status.textContent = enabled ? "Enabled" : "Disabled";
  }

  void initialize();
}
