interface Control {
  id: string;
  name: string;
  description: string;
  standard: string;
  family: string;
  activated?: boolean;
  due_date?: string;
  status?: 'compliant' | 'non-compliant' | 'pending';
  evidence?: Array<{
    id: string;
    description: string;
    submitted_at: string;
    file_url?: string;
  }>;
}

interface ControlDetailsViewProps {
  control: Control;
  onClose: () => void;
  onSubmitEvidence: () => void;
}

export default function ControlDetailsView({
  control,
  onClose,
  onSubmitEvidence,
}: ControlDetailsViewProps) {
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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{control.name}</h2>
          <div className="mt-2 flex items-center space-x-4">
            <span className="text-sm font-medium text-indigo-600">{control.standard}</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm text-gray-600">{control.family}</span>
            {control.status && (
              <>
                <span className="text-gray-400">•</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(control.status)}`}>
                  {control.status}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700">{control.description}</p>
        </div>

        {control.due_date && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Due Date</h3>
            <p className="text-gray-700">{new Date(control.due_date).toLocaleDateString()}</p>
          </div>
        )}

        {control.evidence && control.evidence.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Evidence</h3>
            <div className="space-y-3">
              {control.evidence.map((evidence) => (
                <div key={evidence.id} className="border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 mb-2">{evidence.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Submitted: {new Date(evidence.submitted_at).toLocaleDateString()}</span>
                    {evidence.file_url && (
                      <a
                        href={evidence.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        View File
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
          {control.activated && (
            <button
              onClick={onSubmitEvidence}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Submit Evidence
            </button>
          )}
        </div>
      </div>
    </div>
  );
}