import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Widget } from '../app/dashboard/Widgets.tsx';
import { StoryDashboard } from './StoryDashboard.tsx';

const meta = {
  title: 'Widgets/KPI tile',
  component: Widget,
  decorators: [
    (Story, { parameters }) => (
      <div className="w-56">
        <StoryDashboard filters={parameters.filters} editing={parameters.editing} height={176}>
          <Story />
        </StoryDashboard>
      </div>
    ),
  ],
  args: { kind: 'kpi.revenue' },
  argTypes: {
    kind: {
      control: 'select',
      options: [
        'kpi.revenue',
        'kpi.spend',
        'kpi.roas',
        'kpi.cac',
        'kpi.conversionRate',
        'kpi.orders',
      ],
    },
  },
} satisfies Meta<typeof Widget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Range revenue, its pacing against target, and the daily trend. */
export const Revenue: Story = {};

/** Compare on: the change against the previous period, colored by whether it's good news. */
export const WithDelta: Story = {
  args: { kind: 'kpi.cac' },
  parameters: { filters: { compare: true } },
};

/** One channel selected: the sparkline takes the channel's color. */
export const OneChannel: Story = {
  args: { kind: 'kpi.roas' },
  parameters: { filters: { channel: 'paid_search', compare: true } },
};

/** An unpaid channel has no ad spend, so ROAS is a dash, not zero. */
export const UndefinedRatio: Story = {
  args: { kind: 'kpi.roas' },
  parameters: { filters: { channel: 'organic' } },
};

/** Edit mode: the grip to drag (or move by keyboard) and the remove button. */
export const Editing: Story = { parameters: { editing: true } };
