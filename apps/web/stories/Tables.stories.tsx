import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { OrdersTable } from '../app/dashboard/OrdersTable.tsx';
import { Widget } from '../app/dashboard/Widgets.tsx';
import { orders } from './fixtures.ts';
import { StoryDashboard } from './StoryDashboard.tsx';

const meta = {
  title: 'Widgets/Tables',
  component: Widget,
  decorators: [
    (Story, { parameters }) => (
      <StoryDashboard filters={parameters.filters} height={420}>
        <Story />
      </StoryDashboard>
    ),
  ],
  args: { kind: 'table.channels' },
} satisfies Meta<typeof Widget>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Range KPIs per channel; a row selects the channel. */
export const Channels: Story = {};

/** Spend, attributed revenue and ROAS per campaign, largest spend first. */
export const Campaigns: Story = { args: { kind: 'table.campaigns' } };

/** An unpaid channel has no campaigns, and says so. */
export const CampaignsUnpaid: Story = {
  args: { kind: 'table.campaigns' },
  parameters: { filters: { channel: 'email' } },
};

const names = new Map([
  ['fb_1', 'Prospecting · Lookalike'],
  ['fb_2', 'Retargeting · Site visitors'],
  ['fb_3', 'Awareness · Video'],
  ['gads_1', 'Brand search'],
  ['gads_2', 'Generic search'],
  ['gads_3', 'Shopping'],
]);

/** The virtualized orders table on its own: 2,000 rows, only those in view are in the DOM. */
export const Orders: StoryObj<typeof OrdersTable> = {
  render: () => (
    <div style={{ height: 420 }}>
      <OrdersTable
        orders={orders(2_000)}
        total={2_000}
        campaignNames={names}
        sort="date"
        dir="desc"
        onSort={() => {}}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => {}}
        pending={false}
      />
    </div>
  ),
};
