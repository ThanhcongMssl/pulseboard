import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Widget } from '../app/dashboard/Widgets.tsx';
import { StoryDashboard } from './StoryDashboard.tsx';

const meta = {
  title: 'Widgets/Charts',
  component: Widget,
  decorators: [
    (Story, { parameters }) => (
      <div className="max-w-3xl">
        <StoryDashboard filters={parameters.filters} height={400}>
          <Story />
        </StoryDashboard>
      </div>
    ),
  ],
  args: { kind: 'chart.revenue' },
} satisfies Meta<typeof Widget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Daily revenue against the prorated target, with ad spend for scale. */
export const RevenueVsTarget: Story = {};

/** Compare on: the previous period as a dashed line. */
export const RevenueCompared: Story = {
  parameters: { filters: { compare: true, channel: 'paid_social' } },
};

/** Daily revenue stacked by channel; the legend selects a channel. */
export const ChannelMix: Story = { args: { kind: 'chart.channelMix' } };

/** One channel selected: the others fade. */
export const ChannelMixFocused: Story = {
  args: { kind: 'chart.channelMix' },
  parameters: { filters: { channel: 'organic' } },
};
