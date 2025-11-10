import type { Meta, StoryObj } from '@storybook/react';
import EvidenceForm from './EvidenceForm';

const meta = {
  title: 'Components/EvidenceForm',
  component: EvidenceForm,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EvidenceForm>;

export default meta;
type Story = StoryObj<typeof EvidenceForm>;

export const Default: Story = {
  args: {
    controlId: '1',
    onSubmit: (evidence) => console.log('Submit evidence:', evidence),
    onCancel: () => console.log('Cancel'),
  },
};