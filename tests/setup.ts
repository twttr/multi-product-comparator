import { vi } from "vitest";

const sessionStore: Record<string, unknown> = {};
const changeListeners: Array<
  (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string
  ) => void
> = [];

const storageMock = {
  session: {
    get: vi.fn(async (key: string) => {
      return { [key]: sessionStore[key] ?? undefined };
    }),
    set: vi.fn(async (items: Record<string, unknown>) => {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [key, value] of Object.entries(items)) {
        changes[key] = { oldValue: sessionStore[key], newValue: value };
        sessionStore[key] = value;
      }
      for (const listener of changeListeners) {
        listener(changes, "session");
      }
    }),
    remove: vi.fn(async (key: string) => {
      delete sessionStore[key];
    }),
    clear: vi.fn(async () => {
      for (const key of Object.keys(sessionStore)) {
        delete sessionStore[key];
      }
    }),
    setAccessLevel: vi.fn(),
  },
  onChanged: {
    addListener: vi.fn((fn: (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void) => {
      changeListeners.push(fn);
    }),
  },
};

const runtimeMock = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
  },
};

const i18nMock = {
  getMessage: vi.fn((key: string) => key),
};

globalThis.chrome = {
  storage: storageMock,
  runtime: runtimeMock,
  i18n: i18nMock,
} as unknown as typeof chrome;

export function resetSessionStore(): void {
  for (const key of Object.keys(sessionStore)) {
    delete sessionStore[key];
  }
  changeListeners.length = 0;
}

export { sessionStore, storageMock, runtimeMock };
