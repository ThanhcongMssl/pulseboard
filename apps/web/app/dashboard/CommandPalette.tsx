'use client';

import { ALL_CHANNELS, CHANNELS, type LayoutItem, type WidgetKind } from '@pulseboard/shared';
import { Command } from 'cmdk';
import { useState, type ReactNode, type RefObject } from 'react';
import { CHANNEL_COLORS, CHANNEL_LABELS } from '../../lib/channels.ts';
import {
  isPreset,
  RANGE_PRESETS,
  toggleCampaign,
  withChannel,
  withRange,
} from '../../lib/filters.ts';
import { matchCommand } from '../../lib/palette.ts';
import { addWidget, WIDGET_ORDER, WIDGETS } from '../../lib/widgets.ts';
import { toggleTheme, useTheme } from '../useTheme.ts';
import { useDashboard } from './DashboardContext.tsx';
import { useCampaigns } from './data.ts';

interface Props {
  dialog: RefObject<HTMLDialogElement | null>;
  /** The layout and its actions; null until the saved layout has loaded. */
  layout: {
    items: LayoutItem[] | null;
    canUndo: boolean;
    canRedo: boolean;
    isDefault: boolean;
    commit(items: LayoutItem[]): void;
    undo(): void;
    redo(): void;
    reset(): void;
  };
  editing: boolean;
  onToggleEditing(): void;
  onShowShortcuts(): void;
}

const group =
  'px-2 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted';

const Dot = ({ color }: { color: string }) => (
  <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
);

/**
 * Open the palette with the search field focused. A modal dialog would focus
 * cmdk's root (it has tabindex -1) rather than the input, and React's
 * autoFocus only fires on mount, which happens while the dialog is closed.
 */
export function showPalette(dialog: HTMLDialogElement | null) {
  dialog?.showModal();
  dialog?.querySelector<HTMLInputElement>('[cmdk-input]')?.focus();
}

/** A command: closes the palette, then runs. */
function Item({
  children,
  run,
  keywords,
  disabled,
}: {
  children: ReactNode;
  run(): void;
  keywords?: string[];
  disabled?: boolean;
}) {
  return (
    <Command.Item
      keywords={keywords}
      disabled={disabled}
      onSelect={() => {
        // The palette's <dialog> is the nearest open one.
        document.querySelector<HTMLDialogElement>('dialog[open]')?.close();
        run();
      }}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-secondary data-[disabled=true]:cursor-default data-[disabled=true]:opacity-40 data-[selected=true]:bg-line data-[selected=true]:text-ink"
    >
      {children}
    </Command.Item>
  );
}

/**
 * ⌘K: every filter, view and layout action by name. A cmdk menu inside a
 * native modal <dialog>, so Esc, the backdrop and focus trapping come from the
 * browser. Each command runs the same transitions as the visible controls.
 */
export function CommandPalette({
  dialog,
  layout,
  editing,
  onToggleEditing,
  onShowShortcuts,
}: Props) {
  const { filters, range, setFilters } = useDashboard();
  const campaigns = useCampaigns(range, null);
  const theme = useTheme();
  // A new session each time it opens, so the search starts empty.
  const [session, setSession] = useState(0);

  const placed = new Set(layout.items?.map((i) => i.kind));
  const missing: WidgetKind[] = WIDGET_ORDER.filter((k) => !placed.has(k));

  return (
    <dialog
      ref={dialog}
      aria-label="Command palette"
      onClose={() => setSession((s) => s + 1)}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      onKeyDown={(e) => {
        // ⌘K again closes it, like most palettes.
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          e.currentTarget.close();
        }
      }}
      className="mx-auto mt-[12vh] w-full max-w-lg rounded-xl border border-line bg-raised p-0 text-ink shadow-xl backdrop:bg-black/30"
    >
      <Command key={session} label="Command palette" loop filter={matchCommand}>
        <Command.Input
          placeholder="Jump to a channel, campaign, range or action…"
          className="w-full border-b border-line bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted"
        />
        <Command.List className="max-h-[min(60vh,28rem)] overflow-y-auto pb-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-muted">
            Nothing matches.
          </Command.Empty>

          <Command.Group heading="Date range" className={group}>
            {RANGE_PRESETS.map((preset) => (
              <Item
                key={preset}
                keywords={['range', 'days', String(preset)]}
                run={() => setFilters(withRange(filters, { preset }))}
              >
                Last {preset} days
                {isPreset(filters.range) && filters.range.preset === preset && (
                  <span className="ml-auto text-xs text-muted">Current</span>
                )}
              </Item>
            ))}
            <Item
              keywords={['range', 'dates', 'from', 'to']}
              run={() => document.getElementById('custom-range')?.showPopover()}
            >
              Custom range…
            </Item>
          </Command.Group>

          <Command.Group heading="Channel" className={group}>
            {[ALL_CHANNELS, ...CHANNELS].map((channel) => (
              <Item
                key={channel}
                keywords={['channel', 'focus']}
                run={() => setFilters(withChannel(filters, channel))}
              >
                <Dot color={channel === 'all' ? 'var(--ink-muted)' : CHANNEL_COLORS[channel]} />
                {CHANNEL_LABELS[channel]}
                {filters.channel === channel && (
                  <span className="ml-auto text-xs text-muted">Current</span>
                )}
              </Item>
            ))}
          </Command.Group>

          {campaigns.data && campaigns.data.campaigns.length > 0 && (
            <Command.Group heading="Campaign" className={group}>
              {campaigns.data.campaigns.map((c) => (
                <Item
                  key={c.campaignId}
                  keywords={['campaign', CHANNEL_LABELS[c.channel], c.campaignId]}
                  run={() =>
                    filters.campaign !== c.campaignId &&
                    setFilters(toggleCampaign(filters, c.campaignId, c.channel))
                  }
                >
                  <Dot color={CHANNEL_COLORS[c.channel]} />
                  {c.campaignName}
                  <span className="ml-auto text-xs text-muted">{CHANNEL_LABELS[c.channel]}</span>
                </Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="View" className={group}>
            <Item
              keywords={['compare', 'previous', 'period']}
              run={() => setFilters({ ...filters, compare: !filters.compare })}
            >
              {filters.compare ? 'Stop comparing' : 'Compare with the previous period'}
            </Item>
            <Item keywords={['theme', 'dark', 'light', 'mode']} run={toggleTheme}>
              Switch to {theme === 'light' ? 'dark' : 'light'} theme
            </Item>
            <Item keywords={['help', 'keys', 'keyboard']} run={onShowShortcuts}>
              Keyboard shortcuts
            </Item>
          </Command.Group>

          {layout.items && (
            <Command.Group heading="Layout" className={group}>
              <Item keywords={['edit', 'layout', 'arrange']} run={onToggleEditing}>
                {editing ? 'Finish editing the layout' : 'Edit layout'}
              </Item>
              {missing.map((kind) => (
                <Item
                  key={kind}
                  keywords={['add', 'widget', WIDGETS[kind].description]}
                  run={() => layout.items && layout.commit(addWidget(layout.items, kind))}
                >
                  Add widget: {WIDGETS[kind].title}
                </Item>
              ))}
              <Item keywords={['undo']} disabled={!layout.canUndo} run={layout.undo}>
                Undo layout change
              </Item>
              <Item keywords={['redo']} disabled={!layout.canRedo} run={layout.redo}>
                Redo layout change
              </Item>
              <Item keywords={['reset', 'default']} disabled={layout.isDefault} run={layout.reset}>
                Reset to the default layout
              </Item>
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </dialog>
  );
}
