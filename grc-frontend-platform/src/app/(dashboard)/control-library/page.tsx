'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../lib/store';

interface Control {
  id: string;
  standard: string;
  family: string;
  name: string;
  description: string;
}

export default function ControlLibraryPage() {
  const { token } = useAuthStore();
  const [controls, setControls] = useState<Control[]>([]);
  const [filteredControls, setFilteredControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStandard, setSelectedStandard] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingControl, setEditingControl] = useState<Control | null>(null);
  const [importing, setImporting] = useState(false);

  // New control form state
  const [newControl, setNewControl] = useState<Control>({
    id: '',
    standard: '',
    family: '',
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchControls();
  }, [token]);

  useEffect(() => {
    filterControls();
  }, [controls, selectedStandard, searchTerm]);

  const fetchControls = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/controls/library', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setControls(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch controls:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterControls = () => {
    let filtered = controls;

    if (selectedStandard !== 'all') {
      filtered = filtered.filter((c) => c.standard === selectedStandard);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.id.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term) ||
          c.family.toLowerCase().includes(term)
      );
    }

    setFilteredControls(filtered);
  };

  const getUniqueStandards = () => {
    const standards = new Set(controls.map((c) => c.standard));
    return Array.from(standards).sort();
  };

  const handleCreateControl = async () => {
    if (!newControl.id || !newControl.standard || !newControl.family || !newControl.name || !newControl.description) {
      alert('All fields are required');
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/v1/controls/library', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newControl),
      });

      if (response.ok) {
        alert('Control created successfully!');
        setShowAddDialog(false);
        setNewControl({ id: '', standard: '', family: '', name: '', description: '' });
        fetchControls();
      } else {
        const error = await response.text();
        alert(`Failed to create control: ${error}`);
      }
    } catch (error) {
      console.error('Failed to create control:', error);
      alert('Failed to create control');
    }
  };

  const handleUpdateControl = async (control: Control) => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/controls/library/${control.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(control),
      });

      if (response.ok) {
        alert('Control updated successfully!');
        setEditingControl(null);
        fetchControls();
      } else {
        const error = await response.text();
        alert(`Failed to update control: ${error}`);
      }
    } catch (error) {
      console.error('Failed to update control:', error);
      alert('Failed to update control');
    }
  };

  const handleDeleteControl = async (id: string) => {
    if (!confirm(`Are you sure you want to delete control ${id}? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/v1/controls/library/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('Control deleted successfully!');
        fetchControls();
      } else {
        const error = await response.text();
        alert(`Failed to delete control: ${error}`);
      }
    } catch (error) {
      console.error('Failed to delete control:', error);
      alert('Failed to delete control');
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/controls/library/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `control-library-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export controls:', error);
      alert('Failed to export controls');
    }
  };

  const handleImport = async (file: File, replaceExisting: boolean) => {
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Support both array format and object with controls property
      let controlsToImport: Control[];
      if (Array.isArray(data)) {
        controlsToImport = data;
      } else if (data.controls && Array.isArray(data.controls)) {
        controlsToImport = data.controls;
      } else {
        alert('Invalid JSON format. Expected array of controls or object with "controls" property');
        setImporting(false);
        return;
      }

      const response = await fetch('http://localhost:8080/api/v1/controls/library/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          controls: controlsToImport,
          replace_existing: replaceExisting,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully imported ${result.imported_count} of ${result.total_sent} controls!`);
        setShowImportDialog(false);
        fetchControls();
      } else {
        const error = await response.text();
        alert(`Failed to import controls: ${error}`);
      }
    } catch (error) {
      console.error('Failed to import controls:', error);
      alert('Failed to import controls. Please check the JSON format.');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Control Library Management</h1>
        <div className="text-center py-8">Loading controls...</div>
      </div>
    );
  }

  const groupedControls = filteredControls.reduce((acc, control) => {
    if (!acc[control.standard]) {
      acc[control.standard] = [];
    }
    acc[control.standard].push(control);
    return acc;
  }, {} as Record<string, Control[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control Library Management</h1>
          <p className="text-gray-600">Manage compliance control standards and frameworks</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Import JSON
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Export JSON
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Control
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Standard</label>
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">All Standards</option>
              {getUniqueStandards().map((standard) => (
                <option key={standard} value={standard}>
                  {standard}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, name, description..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Showing {filteredControls.length} of {controls.length} controls
        </div>
      </div>

      {/* Controls List - Grouped by Standard */}
      <div className="space-y-6">
        {Object.entries(groupedControls).map(([standard, stdControls]) => (
          <div key={standard} className="bg-white rounded-lg shadow">
            <div className="bg-indigo-50 px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-indigo-900">{standard}</h2>
              <p className="text-sm text-indigo-700">{stdControls.length} controls</p>
            </div>
            <div className="divide-y divide-gray-200">
              {stdControls.map((control) => (
                <div key={control.id} className="p-4 hover:bg-gray-50">
                  {editingControl?.id === control.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">ID</label>
                          <input
                            type="text"
                            value={editingControl.id}
                            disabled
                            className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Family</label>
                          <input
                            type="text"
                            value={editingControl.family}
                            onChange={(e) => setEditingControl({ ...editingControl, family: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Name</label>
                        <input
                          type="text"
                          value={editingControl.name}
                          onChange={(e) => setEditingControl({ ...editingControl, name: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Description</label>
                        <textarea
                          value={editingControl.description}
                          onChange={(e) => setEditingControl({ ...editingControl, description: e.target.value })}
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingControl(null)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateControl(editingControl)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {control.id}
                          </span>
                          <span className="text-sm text-gray-500">{control.family}</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-900 mb-1">{control.name}</h3>
                        <p className="text-sm text-gray-600">{control.description}</p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => setEditingControl(control)}
                          className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteControl(control.id)}
                          className="px-3 py-1 border border-red-300 rounded-md text-xs text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Control Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Control</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Control ID *</label>
                  <input
                    type="text"
                    value={newControl.id}
                    onChange={(e) => setNewControl({ ...newControl, id: e.target.value })}
                    placeholder="e.g., ISO27001-A.5.1"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard *</label>
                  <input
                    type="text"
                    value={newControl.standard}
                    onChange={(e) => setNewControl({ ...newControl, standard: e.target.value })}
                    placeholder="e.g., ISO/IEC 27001:2022"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Family *</label>
                <input
                  type="text"
                  value={newControl.family}
                  onChange={(e) => setNewControl({ ...newControl, family: e.target.value })}
                  placeholder="e.g., Organizational Controls"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newControl.name}
                  onChange={(e) => setNewControl({ ...newControl, name: e.target.value })}
                  placeholder="e.g., Policies for information security"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={newControl.description}
                  onChange={(e) => setNewControl({ ...newControl, description: e.target.value })}
                  rows={4}
                  placeholder="Full control requirement description..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setNewControl({ id: '', standard: '', family: '', name: '', description: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateControl}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Create Control
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Import Controls from JSON</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select JSON File</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const replaceExisting = confirm(
                        'Replace existing controls with same IDs?\n\nYes = Update existing controls\nNo = Skip controls that already exist'
                      );
                      handleImport(file, replaceExisting);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  disabled={importing}
                />
              </div>
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Expected JSON format:</p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`{
  "controls": [
    {
      "id": "CUSTOM-1",
      "standard": "My Standard",
      "family": "Category",
      "name": "Control Name",
      "description": "..."
    }
  ]
}`}
                </pre>
              </div>
              {importing && (
                <div className="text-center text-sm text-indigo-600">Importing controls...</div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowImportDialog(false)}
                disabled={importing}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
