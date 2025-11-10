'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';

interface DocumentInfo {
  id: string;
  title: string;
  category: string;
  owner_id: string | null;
  published_version_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchDocuments();
    }
  }, [token]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/documents', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error('Failed to fetch documents:', response.status, response.statusText);
        setDocuments([]);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'policy':
        return 'bg-blue-100 text-blue-800';
      case 'procedure':
        return 'bg-green-100 text-green-800';
      case 'guideline':
        return 'bg-yellow-100 text-yellow-800';
      case 'plan':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (doc: DocumentInfo) => {
    if (doc.published_version_id) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Published</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Draft</span>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your organizational documents</p>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading documents...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage organizational policies, procedures, and compliance documentation</p>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {documents.map((document) => (
            <li key={document.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 
                    className="text-lg font-medium text-gray-900 hover:text-indigo-600 cursor-pointer"
                    onClick={() => router.push(`/documents/${document.id}`)}
                  >
                    {document.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(document.category)}`}>
                      {document.category}
                    </span>
                    {getStatusBadge(document)}
                    <span>Updated: {new Date(document.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => router.push(`/documents/${document.id}`)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </li>
          ))}
          {documents.length === 0 && (
            <li className="px-6 py-4 text-center text-gray-500">
              No documents found.
            </li>
          )}
        </ul>
      </div>

    </div>
  );
}