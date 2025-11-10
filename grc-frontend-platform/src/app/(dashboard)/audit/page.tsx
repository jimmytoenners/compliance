'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../lib/store';

interface AuditLog {
  id: string;
  performed_at: string;
  user_id: string | null;
  action_type: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  changes: string | null;
  ip_address: string | null;
}

export default function AuditPage() {
  const { token, user } = useAuthStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    user_id: '',
    action_type: '',
    entity_type: '',
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAuditLogs();
    }
  }, [token, user, currentPage, filters]);

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams({
        limit: '20',
        offset: ((currentPage - 1) * 20).toString(),
        ...filters,
      });

      const response = await fetch(`http://localhost:8080/api/v1/audit/logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
        // For simplicity, assume we have more pages if we got 20 results
        setTotalPages(data.length === 20 ? currentPage + 1 : currentPage);
      } else {
        console.error('Failed to fetch audit logs:', response.status, response.statusText);
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const formatChanges = (changes: string | null) => {
    if (!changes) return 'No changes recorded';

    try {
      const parsed = JSON.parse(changes);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return changes;
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-600">System activity and change history</p>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading audit logs...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600">System activity and change history</p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
                User ID
              </label>
              <input
                type="text"
                id="user_id"
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Filter by user ID"
              />
            </div>
            <div>
              <label htmlFor="action_type" className="block text-sm font-medium text-gray-700">
                Action Type
              </label>
              <select
                id="action_type"
                value={filters.action_type}
                onChange={(e) => handleFilterChange('action_type', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
            </div>
            <div>
              <label htmlFor="entity_type" className="block text-sm font-medium text-gray-700">
                Entity Type
              </label>
              <select
                id="entity_type"
                value={filters.entity_type}
                onChange={(e) => handleFilterChange('entity_type', e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">All entities</option>
                <option value="control">Control</option>
                <option value="ticket">Ticket</option>
                <option value="asset">Asset</option>
                <option value="document">Document</option>
                <option value="user">User</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {logs.map((log) => (
            <li key={log.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(log.action_type)}`}>
                      {log.action_type}
                    </span>
                    <span className="text-sm text-gray-900">
                      {log.target_entity_type && log.target_entity_id
                        ? `${log.target_entity_type} ${log.target_entity_id}`
                        : 'System action'
                      }
                    </span>
                  </div>
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <span>User: {log.user_id || 'System'}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(log.performed_at).toLocaleString()}</span>
                    {log.ip_address && (
                      <>
                        <span className="mx-2">•</span>
                        <span>IP: {log.ip_address}</span>
                      </>
                    )}
                  </div>
                  {log.changes && (
                    <div className="mt-3">
                      <details className="group">
                        <summary className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-900">
                          View changes
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded-md">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                            {formatChanges(log.changes)}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
          {logs.length === 0 && (
            <li className="px-6 py-4 text-center text-gray-500">
              No audit logs found matching the current filters.
            </li>
          )}
        </ul>
      </div>

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Page {currentPage}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={logs.length < 20}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}