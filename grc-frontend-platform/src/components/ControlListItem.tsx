interface Control {
  id: string;
  name: string;
  description: string;
  framework: string;
  activated: boolean;
  due_date?: string;
  status: 'compliant' | 'non-compliant' | 'pending';
}

interface ControlListItemProps {
  control: Control;
  onActivate: (id: string) => void;
  onViewDetails: (id: string) => void;
  isSubmitting?: boolean;
}

export default function ControlListItem({
  control,
  onActivate,
  onViewDetails,
  isSubmitting = false,
}: ControlListItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800';
      case 'non-compliant':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-medium text-gray-900">{control.name}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(control.status)}`}>
              {control.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{control.description}</p>
          <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
            <span>Framework: {control.framework}</span>
            {control.due_date && (
              <span>Due: {new Date(control.due_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onViewDetails(control.id)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View Details
          </button>
          {!control.activated && (
            <button
              onClick={() => onActivate(control.id)}
              disabled={isSubmitting}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Activating...' : 'Activate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}