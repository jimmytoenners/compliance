import { render, screen, fireEvent } from '@testing-library/react';
import ControlListItem from '../ControlListItem';

const mockControl = {
  id: '1',
  name: 'Access Control Policy',
  description: 'Implement access control policies to ensure proper authorization.',
  framework: 'CIS IG1',
  activated: false,
  status: 'pending' as const,
  due_date: '2024-12-31',
};

const mockProps = {
  control: mockControl,
  onActivate: jest.fn(),
  onViewDetails: jest.fn(),
};

describe('ControlListItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders control information correctly', () => {
    render(<ControlListItem {...mockProps} />);

    expect(screen.getByText('Access Control Policy')).toBeInTheDocument();
    expect(screen.getByText('Implement access control policies to ensure proper authorization.')).toBeInTheDocument();
    expect(screen.getByText('Framework: CIS IG1')).toBeInTheDocument();
    expect(screen.getByText('Due: 12/31/2024')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('shows activate button when control is not activated', () => {
    render(<ControlListItem {...mockProps} />);

    const activateButton = screen.getByText('Activate');
    expect(activateButton).toBeInTheDocument();
  });

  it('does not show activate button when control is activated', () => {
    const activatedControl = { ...mockControl, activated: true };
    render(<ControlListItem {...mockProps} control={activatedControl} />);

    expect(screen.queryByText('Activate')).not.toBeInTheDocument();
  });

  it('calls onActivate when activate button is clicked', () => {
    render(<ControlListItem {...mockProps} />);

    const activateButton = screen.getByText('Activate');
    fireEvent.click(activateButton);

    expect(mockProps.onActivate).toHaveBeenCalledWith('1');
  });

  it('calls onViewDetails when view details button is clicked', () => {
    render(<ControlListItem {...mockProps} />);

    const viewDetailsButton = screen.getByText('View Details');
    fireEvent.click(viewDetailsButton);

    expect(mockProps.onViewDetails).toHaveBeenCalledWith('1');
  });

  it('displays correct status colors', () => {
    const { rerender } = render(<ControlListItem {...mockProps} />);

    // Pending status
    expect(screen.getByText('pending')).toHaveClass('bg-yellow-100', 'text-yellow-800');

    // Compliant status
    const compliantControl = { ...mockControl, status: 'compliant' as const };
    rerender(<ControlListItem {...mockProps} control={compliantControl} />);
    expect(screen.getByText('compliant')).toHaveClass('bg-green-100', 'text-green-800');

    // Non-compliant status
    const nonCompliantControl = { ...mockControl, status: 'non-compliant' as const };
    rerender(<ControlListItem {...mockProps} control={nonCompliantControl} />);
    expect(screen.getByText('non-compliant')).toHaveClass('bg-red-100', 'text-red-800');
  });
});