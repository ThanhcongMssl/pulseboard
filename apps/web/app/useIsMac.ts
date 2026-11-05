'use client';

import { useSyncExternalStore } from 'react';

const never = () => () => {};
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/** Whether to label shortcuts with ⌘ rather than Ctrl. False on the server, then corrected. */
export const useIsMac = () => useSyncExternalStore(never, isMac, () => false);
