import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useRef } from 'react';
import { CommandPalette } from '../app/dashboard/CommandPalette.tsx';
import { DEFAULT_LAYOUT } from '../lib/widgets.ts';
import { StoryDashboard } from './StoryDashboard.tsx';

function Palette() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <CommandPalette
      dialog={dialog}
      layout={{
        items: [...DEFAULT_LAYOUT],
        canUndo: true,
        canRedo: false,
        isDefault: true,
        commit() {},
        undo() {},
        redo() {},
        reset() {},
      }}
      editing={false}
      onToggleEditing={() => {}}
      onShowShortcuts={() => {}}
    />
  );
}

const meta = {
  title: 'Command palette',
  render: () => (
    <StoryDashboard height={600}>
      <Palette />
    </StoryDashboard>
  ),
} satisfies Meta;

export default meta;

/** ⌘K: ranges, channels, campaigns, view and layout actions, filtered by every typed word. */
export const Open: StoryObj<typeof meta> = {};
