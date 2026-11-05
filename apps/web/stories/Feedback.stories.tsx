import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useEffect, useRef } from 'react';
import { ShortcutHelp } from '../app/dashboard/ShortcutHelp.tsx';
import { Toast } from '../app/dashboard/Toast.tsx';
import { WidgetEmpty, WidgetError, WidgetSkeleton } from '../app/dashboard/WidgetState.tsx';

const meta = { title: 'Feedback' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="h-72 max-w-xl rounded-xl border border-line bg-raised p-5">{children}</div>
);

export const ChartLoading: Story = {
  render: () => (
    <Card>
      <WidgetSkeleton shape="chart" label="Loading chart" />
    </Card>
  ),
};

export const TableLoading: Story = {
  render: () => (
    <Card>
      <WidgetSkeleton shape="table" label="Loading orders" />
    </Card>
  ),
};

export const Empty: Story = {
  render: () => (
    <Card>
      <WidgetEmpty>No orders match these filters.</WidgetEmpty>
    </Card>
  ),
};

export const Error: Story = {
  render: () => (
    <Card>
      <WidgetError onRetry={() => {}}>Couldn’t load campaigns.</WidgetError>
    </Card>
  ),
};

/** New data for the range on screen, announced politely to screen readers. */
export const NewDataToast: Story = {
  render: () => <Toast update={{ id: 1, message: 'Reports updated for Nov 5 · Paid search' }} />,
};

function OpenHelp() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => dialog.current?.showModal(), []);
  return <ShortcutHelp dialog={dialog} />;
}

/** The ? dialog. */
export const KeyboardShortcuts: Story = { render: () => <OpenHelp /> };
