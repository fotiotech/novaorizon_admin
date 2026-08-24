// components/MetaTagList.tsx
'use client';

import React from 'react';
import { MetaTagUrl as MetaTagUrlType } from '@/constant/types/metatag';
import { deleteMetaTag, toggleMetaTagStatus } from '@/app/actions/meta-tag-actions';

interface MetaTagListProps {
  metaTags: MetaTagUrlType[];
  loading: boolean;
  searchTerm: string;
  onSearch: (term: string) => void;
  onEdit: (metaTag: MetaTagUrlType) => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const MetaTagList: React.FC<MetaTagListProps> = ({
  metaTags,
  loading,
  searchTerm,
  onSearch,
  onEdit,
  onDelete,
  onToggleStatus,
  currentPage,
  totalPages,
  onPageChange
}) => {
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meta tag?')) return;

    try {
      const result = await deleteMetaTag(id);
      if (result.success) {
        onDelete();
      } else {
        alert(result.error || 'Failed to delete meta tag');
      }
    } catch (error) {
      alert('Error deleting meta tag');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const result = await toggleMetaTagStatus(id);
      if (result.success) {
        onToggleStatus();
      } else {
        alert(result.error || 'Failed to update status');
      }
    } catch (error) {
      alert('Error updating status');
    }
  };

  return (
    <div className="bg-white rounded shadow overflow-hidden">
      <div className="px-6 py-4 border-b">
        <h2 className="text-lg font-semibold">Managed URLs & Meta Tags</h2>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by URL, title, or description..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center">Loading meta tags...</div>
      ) : metaTags.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No meta tags found. {!searchTerm && 'Click "Add New Meta Tag" to get started.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metaTags.map((metaTag) => (
                  <tr key={metaTag._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{metaTag.url}</div>
                      {metaTag.urlPattern && (
                        <div className="text-xs text-gray-500">Pattern: {metaTag.urlPattern}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">{metaTag.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{metaTag.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        {metaTag.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(metaTag._id!)}
                        className={`px-2 py-1 text-xs rounded ${
                          metaTag.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {metaTag.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(metaTag.lastModified).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(metaTag)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(metaTag._id!)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <button
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MetaTagList;