export const storageProvider = {
  async get(appId: string, key: string): Promise<string | null> {
    return localStorage.getItem(`plein.store.${appId}:${key}`);
  },
  async set(appId: string, key: string, value: string): Promise<void> {
    localStorage.setItem(`plein.store.${appId}:${key}`, value);
  },
};
