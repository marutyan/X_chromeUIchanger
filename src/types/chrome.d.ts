interface XcuicStorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

interface XcuicStorageArea {
  get(defaultValues: { enabled: boolean }): Promise<{ enabled?: unknown }>;
  set(values: { enabled: boolean }): Promise<void>;
}

interface XcuicStorageChangeEvent {
  addListener(
    listener: (
      changes: Record<string, XcuicStorageChange>,
      areaName: string,
    ) => void,
  ): void;
}

interface XcuicRuntime {
  id?: string;
  lastError?: { message?: string };
  getURL?(path: string): string;
  sendMessage?(message: unknown, responseCallback?: (response: unknown) => void): void;
  onMessage?: {
    addListener(
      listener: (
        message: unknown,
        sender: unknown,
        sendResponse: (response?: unknown) => void,
      ) => void | boolean,
    ): void;
  };
}

declare const chrome: {
  storage: {
    local: XcuicStorageArea;
    onChanged: XcuicStorageChangeEvent;
  };
  runtime: XcuicRuntime;
};
