'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../lib/store';
import ControlListItem from '../../../components/ControlListItem';
import ControlDetailsView from '../../../components/ControlDetailsView';
import EvidenceForm from '../../../components/EvidenceForm';

interface Control {
  id: string;
  name: string;
  description: string;
  standard: string; // Changed from framework to match backend
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

type ViewMode = 'list' | 'details' | 'evidence';

export default function ControlsPage() {
  const { token } = useAuthStore();
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedControl, setSelectedControl] = useState<Control | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchControls();
  }, [token]);

  const fetchControls = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch('http://localhost:8080/api/v1/controls/library', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setControls(data);
      } else {
        console.error('Failed to fetch controls:', response.status, response.statusText);
        setControls([]);
        // Show error message to user
        alert(`Failed to load controls: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timed out');
        setControls([]);
        alert('Request timed out. Please check your connection and try again.');
      } else {
        console.error('Failed to fetch controls:', error);
        setControls([]);
        // Show error message to user
        alert('Failed to load controls. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (controlId: string) => {
    if (isSubmitting) return; // Prevent concurrent submissions

    // Get current user ID from token (decoded from useAuthStore)
    const { user } = useAuthStore.getState();
    if (!user) {
      alert('User not authenticated');
      return;
    }

    // Prompt for review interval
    const reviewDays = prompt('Enter review interval in days (e.g., 90, 180, 365):', '90');
    if (!reviewDays || isNaN(parseInt(reviewDays))) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:8080/api/v1/controls/activated`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          control_library_id: controlId,
          owner_id: user.id,
          review_interval_days: parseInt(reviewDays)
        }),
      });

      if (response.ok) {
        alert('Control activated successfully!');
        await fetchControls(); // Refresh the list
      } else {
        const errorText = await response.text();
        alert(`Failed to activate control: ${errorText}`);
      }
    } catch (error) {
      console.error('Failed to activate control:', error);
      alert('Failed to activate control. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (controlId: string) => {
    const control = controls.find(c => c.id === controlId);
    if (control) {
      setSelectedControl(control);
      setViewMode('details');
    }
  };

  const handleSubmitEvidence = (controlId: string) => {
    const control = controls.find(c => c.id === controlId);
    if (control) {
      setSelectedControl(control);
      setViewMode('evidence');
    }
  };

  const handleEvidenceSubmit = async (evidence: { description: string; file?: File }) => {
    if (!selectedControl || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('control_id', selectedControl.id);
      formData.append('description', evidence.description);
      if (evidence.file) {
        formData.append('file', evidence.file);
      }

      const response = await fetch('http://localhost:8080/api/v1/evidence', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setViewMode('list');
        setSelectedControl(null);
        await fetchControls(); // Refresh the list
      } else {
        alert('Failed to submit evidence. Please try again.');
      }
    } catch (error) {
      console.error('Failed to submit evidence:', error);
      alert('Failed to submit evidence. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setViewMode('list');
    setSelectedControl(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controls</h1>
          <p className="text-gray-600">Manage your compliance controls</p>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading controls...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Controls</h1>
        <p className="text-gray-600">Manage your compliance controls</p>
      </div>

      {viewMode === 'list' && (
        <div className="space-y-4">
          {controls.map((control) => (
            <ControlListItem
              key={control.id}
              control={control}
              onActivate={handleActivate}
              onViewDetails={handleViewDetails}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}

      {viewMode === 'details' && selectedControl && (
        <ControlDetailsView
          control={selectedControl}
          onClose={handleClose}
          onSubmitEvidence={() => handleSubmitEvidence(selectedControl.id)}
        />
      )}

      {viewMode === 'evidence' && selectedControl && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Submit Evidence for {selectedControl.name}</h2>
          </div>
          <EvidenceForm
            controlId={selectedControl.id}
            onSubmit={handleEvidenceSubmit}
            onCancel={handleClose}
          />
        </div>
      )}
    </div>
  );
}