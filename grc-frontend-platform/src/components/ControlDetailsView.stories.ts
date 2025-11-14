import type { Meta, StoryObj } from '@storybook/react';
import ControlDetailsView from './ControlDetailsView';

const meta = {
  title: 'Components/ControlDetailsView',
  component: ControlDetailsView,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ControlDetailsView>;

export default meta;
type Story = StoryObj<typeof ControlDetailsView>;

const mockControl = {
  id: '1',
  name: 'Access Control Policy',
  description: 'Implement access control policies to ensure proper authorization.',
  standard: 'CIS IG1',
  family: 'Access Control',
  activated: true,
  status: 'compliant' as const,
  due_date: '2024-12-31',
  evidence: [
    {
      id: '1',
      description: 'Access control policy document reviewed and approved.',
      submitted_at: '2024-01-15T10:00:00Z',
      file_url: '/files/policy.pdf',
    },
  ],
};

export const Default: Story = {
  args: {
    control: mockControl,
    onClose: () => console.log('Close'),
    onSubmitEvidence: () => console.log('Submit evidence'),
  },
};

export const NoEvidence: Story = {
  args: {
    control: {
      ...mockControl,
      evidence: [],
    },
    onClose: () => console.log('Close'),
    onSubmitEvidence: () => console.log('Submit evidence'),
  },
};