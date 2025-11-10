'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../lib/store';

interface Control {
  id: string;
  control_name?: string;
  name?: string;
  control_description?: string;
  description?: string;
  next_review_due_date?: string;
}

interface Asset {
  id: string;
  name: string;
  description: string;
  asset_type: string;
}

interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
}

interface MappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'asset' | 'document';
  itemId: string;
  itemName: string;
}

export default function MappingModal({ isOpen, onClose, type, itemId, itemName }: MappingModalProps) {
  const { token } = useAuthStore();
  const [controls, setControls] = useState<Control[]>([]);
  const [currentMappings, setCurrentMappings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchControls();
      fetchCurrentMappings();
    }
  }, [isOpen, type, itemId]);

  const fetchControls = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/controls/activated', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setControls(data);
      } else {
        console.error('Failed to fetch controls:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch controls:', error);
    }
  };

  const fetchCurrentMappings = async () => {
    try {
      const endpoint = type === 'asset'
        ? `http://localhost:8080/api/v1/mappings/asset-to-control?${type}_id=${itemId}`
        : `http://localhost:8080/api/v1/mappings/document-to-control?${type}_id=${itemId}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const mappedControlIds = data.map((mapping: any) => mapping.activated_control_id);
        setCurrentMappings(mappedControlIds);
      } else {
        setCurrentMappings([]);
      }
    } catch (error) {
      console.error('Failed to fetch current mappings:', error);
      setCurrentMappings([]);
    }
  };

  const handleMappingChange = async (controlId: string, isChecked: boolean) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const endpoint = type === 'asset'
        ? 'http://localhost:8080/api/v1/mappings/asset-to-control'
        : 'http://localhost:8080/api/v1/mappings/document-to-control';

      const method = isChecked ? 'POST' : 'DELETE';
      const body = isChecked
        ? JSON.stringify({
            activated_control_id: controlId,
            [`${type}_id`]: itemId,
            mapping_type: 'supports'
          })
        : undefined;

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (response.ok) {
        setCurrentMappings(prev =>
          isChecked
            ? [...prev, controlId]
            : prev.filter(id => id !== controlId)
        );
      } else {
        alert(`Failed to ${isChecked ? 'create' : 'remove'} mapping. Please try again.`);
      }
    } catch (error) {
      console.error(`Failed to ${isChecked ? 'create' : 'remove'} mapping:`, error);
      alert(`Failed to ${isChecked ? 'create' : 'remove'} mapping. Please check your connection and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Map {type === 'asset' ? 'Asset' : 'Document'} to Controls
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              <strong>{type === 'asset' ? 'Asset' : 'Document'}:</strong> {itemName}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Select the controls that this {type} supports or relates to:
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading controls...
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {controls.map((control) => (
                <div key={control.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    id={`control-${control.id}`}
                    checked={currentMappings.includes(control.id)}
                    onChange={(e) => handleMappingChange(control.id, e.target.checked)}
                    disabled={isSubmitting}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`control-${control.id}`}
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      {control.control_name || control.name}
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      {control.control_description || control.description}
                    </p>
                    {control.next_review_due_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Next review: {new Date(control.next_review_due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {controls.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  No activated controls found. Activate some controls first to create mappings.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}