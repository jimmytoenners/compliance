'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../lib/store';
import MappingModal from '../../../components/MappingModal';

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  owner_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'list' | 'create' | 'edit';

export default function AssetsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [selectedAssetForMapping, setSelectedAssetForMapping] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    asset_type: '',
    owner_id: '',
  });

  useEffect(() => {
    if (viewMode === 'list') {
      fetchAssets();
    }
  }, [token, viewMode]);

  const fetchAssets = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/v1/assets', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data);
      } else {
        console.error('Failed to fetch assets:', response.status, response.statusText);
        setAssets([]);
        alert(`Failed to load assets: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      setAssets([]);
      alert('Failed to load assets. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      asset_type: '',
      owner_id: '',
    });
    setViewMode('create');
  };

  const handleEdit = (asset: Asset) => {
    setSelectedAsset(asset);
    setFormData({
      name: asset.name,
      asset_type: asset.asset_type,
      owner_id: asset.owner_id,
    });
    setViewMode('edit');
  };

  const handleMapToControls = (asset: Asset) => {
    setSelectedAssetForMapping(asset);
    setShowMappingModal(true);
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:8080/api/v1/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchAssets();
      } else {
        alert('Failed to delete asset. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete asset:', error);
      alert('Failed to delete asset. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const url = viewMode === 'create'
        ? 'http://localhost:8080/api/v1/assets'
        : `http://localhost:8080/api/v1/assets/${selectedAsset?.id}`;

      const method = viewMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setViewMode('list');
        setSelectedAsset(null);
        await fetchAssets();
      } else {
        alert(`Failed to ${viewMode === 'create' ? 'create' : 'update'} asset. Please try again.`);
      }
    } catch (error) {
      console.error(`Failed to ${viewMode === 'create' ? 'create' : 'update'} asset:`, error);
      alert(`Failed to ${viewMode === 'create' ? 'create' : 'update'} asset. Please check your connection and try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedAsset(null);
  };

  if (loading && viewMode === 'list') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600">Manage your organizational assets</p>
        </div>
        <div className="text-center py-8">
          <div className="inline-flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading assets...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-600">Manage your organizational assets</p>
        </div>
        {viewMode === 'list' && (
          <button
            onClick={handleCreate}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Create Asset
          </button>
        )}
      </div>

      {viewMode === 'list' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {assets.map((asset) => (
              <li key={asset.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 
                      className="text-lg font-medium text-gray-900 hover:text-indigo-600 cursor-pointer"
                      onClick={() => router.push(`/assets/${asset.id}`)}
                    >
                      {asset.name}
                    </h3>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span className="mr-4">Type: {asset.asset_type}</span>
                      <span className="mr-4">Status: {asset.status}</span>
                      <span>Owner: {asset.owner_id}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => router.push(`/assets/${asset.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleMapToControls(asset)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Map to Controls
                    </button>
                    <button
                      onClick={() => handleEdit(asset)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isSubmitting}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
            {assets.length === 0 && (
              <li className="px-6 py-4 text-center text-gray-500">
                No assets found. Create your first asset to get started.
              </li>
            )}
          </ul>
        </div>
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {viewMode === 'create' ? 'Create Asset' : 'Edit Asset'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="asset_type" className="block text-sm font-medium text-gray-700">
                  Asset Type
                </label>
                <select
                  id="asset_type"
                  value={formData.asset_type}
                  onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                >
                  <option value="">Select type</option>
                  <option value="server">Server</option>
                  <option value="database">Database</option>
                  <option value="application">Application</option>
                  <option value="network">Network</option>
                  <option value="storage">Storage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="owner_id" className="block text-sm font-medium text-gray-700">
                  Owner ID
                </label>
                <input
                  type="text"
                  id="owner_id"
                  value={formData.owner_id}
                  onChange={(e) => setFormData({ ...formData, owner_id: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : (viewMode === 'create' ? 'Create' : 'Update')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMappingModal && selectedAssetForMapping && (
        <MappingModal
          isOpen={showMappingModal}
          onClose={() => {
            setShowMappingModal(false);
            setSelectedAssetForMapping(null);
          }}
          type="asset"
          itemId={selectedAssetForMapping.id}
          itemName={selectedAssetForMapping.name}
        />
      )}
    </div>
  );
}