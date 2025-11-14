'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function NewDocumentPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Policy',
    body_content: '',
    change_description: 'Initial version',
  });

  // Redirect if not admin
  if (user?.role !== 'admin') {
    router.push('/documents');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Create the document
      const createResponse = await fetch('http://localhost:8080/api/v1/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          owner_id: user.id,
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create document');
      }

      const document = await createResponse.json();

      // Step 2: Create first version
      const versionResponse = await fetch(
        `http://localhost:8080/api/v1/documents/${document.id}/versions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            body_content: formData.body_content,
            change_description: formData.change_description,
          }),
        }
      );

      if (!versionResponse.ok) {
        throw new Error('Failed to create document version');
      }

      // Redirect to document detail page
      router.push(`/documents/${document.id}`);
    } catch (err) {
      console.error('Error creating document:', err);
      setError(err instanceof Error ? err.message : 'Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Document</h1>
          <p className="text-gray-600">Create a new policy, procedure, or compliance document</p>
        </div>
        <button
          onClick={() => router.push('/documents')}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Back to Documents
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
            placeholder="e.g., Information Security Policy"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category *
          </label>
          <select
            id="category"
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
          >
            <option value="Policy">Policy</option>
            <option value="Procedure">Procedure</option>
            <option value="Guideline">Guideline</option>
            <option value="Plan">Plan</option>
            <option value="Standard">Standard</option>
          </select>
        </div>

        <div>
          <label htmlFor="body_content" className="block text-sm font-medium text-gray-700">
            Content *
          </label>
          <textarea
            id="body_content"
            required
            rows={12}
            value={formData.body_content}
            onChange={(e) => setFormData({ ...formData, body_content: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border font-mono"
            placeholder="Enter the document content here..."
          />
          <p className="mt-1 text-sm text-gray-500">
            You can use plain text or markdown formatting
          </p>
        </div>

        <div>
          <label htmlFor="change_description" className="block text-sm font-medium text-gray-700">
            Change Description
          </label>
          <input
            type="text"
            id="change_description"
            value={formData.change_description}
            onChange={(e) => setFormData({ ...formData, change_description: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
            placeholder="Initial version"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/documents')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Document'}
          </button>
        </div>
      </form>
    </div>
  );
}
