// Kept apart from CommandPalette.tsx so the page can open the palette without
// loading cmdk until it's first needed.

/**
 * Open the palette with the search field focused. A modal dialog would focus
 * cmdk's root (it has tabindex -1) rather than the input, and React's
 * autoFocus only fires on mount, which happens while the dialog is closed.
 */
export function showPalette(dialog: HTMLDialogElement | null) {
  dialog?.showModal();
  dialog?.querySelector<HTMLInputElement>('[cmdk-input]')?.focus();
}
