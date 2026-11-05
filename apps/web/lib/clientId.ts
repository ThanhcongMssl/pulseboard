import { clientIdSchema } from '@pulseboard/shared';

// The anonymous id a viewer's saved layout is filed under. There are no
// accounts: the id lives in localStorage, so a layout follows the browser.

export const CLIENT_ID_STORAGE_KEY = 'pulseboard:client-id';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * The stored client id, or a new one stored for next time. With storage
 * blocked (private mode, disabled site data) the id lasts for this page view
 * only, so layouts still save and load until a reload.
 */
export function getClientId(storage: StorageLike | null, newId: () => string): string {
  try {
    const stored = storage?.getItem(CLIENT_ID_STORAGE_KEY) ?? null;
    if (clientIdSchema.safeParse(stored).success) return stored!;
  } catch {
    // Reading storage can throw when site data is blocked.
  }
  const id = newId();
  try {
    storage?.setItem(CLIENT_ID_STORAGE_KEY, id);
  } catch {
    // Not persisted; see above.
  }
  return id;
}
