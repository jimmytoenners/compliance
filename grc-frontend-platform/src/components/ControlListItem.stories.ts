import type { Meta, StoryObj } from '@storybook/react';
import ControlListItem from './ControlListItem';

const meta = {
  title: 'Components/ControlListItem',
  component: ControlListItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ControlListItem>;

export default meta;
type Story = StoryObj<typeof ControlListItem>;

const mockControl = {
  id: '1',
  name: 'Access Control Policy',
  description: 'Implement access control policies to ensure proper authorization.',
  standard: 'CIS IG1',
  family: 'Access Control',
  activated: false,
  status: 'pending' as const,
  due_date: '2024-12-31',
};

export const Default: Story = {
  args: {
    control: mockControl,
    onActivate: (id) => console.log('Activate control:', id),
    onViewDetails: (id) => console.log('View details:', id),
  },
};

export const Activated: Story = {
  args: {
    control: {
      ...mockControl,
      activated: true,
      status: 'compliant',
    },
    onActivate: (id) => console.log('Activate control:', id),
    onViewDetails: (id) => console.log('View details:', id),
  },
};

export const NonCompliant: Story = {
  args: {
    control: {
      ...mockControl,
      activated: true,
      status: 'non-compliant',
    },
    onActivate: (id) => console.log('Activate control:', id),
    onViewDetails: (id) => console.log('View details:', id),
  },
};