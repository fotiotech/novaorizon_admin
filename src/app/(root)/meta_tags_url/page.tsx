// components/MetaTagUrlManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getMetaTags, deleteMetaTag, toggleMetaTagStatus } from '@/app/actions/meta-tag-actions';
import { MetaTagUrl as MetaTagUrlType } from '@/constant/types/metatag';

const MetaTagUrlManagement: React.FC = () => {
  const [metaTags, setMetaTags] = useState<MetaTagUrlType[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadMetaTags();
  }, [currentPage, searchTerm]);

  const loadMetaTags = async () => {
    setLoading(true);
    try {
      const result = await getMetaTags(currentPage, 10, searchTerm);
      if (result.success) {
        setMetaTags(result.data);
        setTotalPages(Math.ceil(result.total / result.limit));
      } else {
        showMessage('error', 'Failed to load meta tags');
      }
    } catch (error) {
      showMessage('error', 'Error loading meta tags');
    }
    setLoading(false);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this meta tag?')) return;

    setLoading(true);
    try {
      const result = await deleteMetaTag(id);
      if (result.success) {
        showMessage('success', 'Meta tag deleted successfully');
        loadMetaTags();
      } else {
        showMessage('error', result.error || 'Failed to delete meta tag');
      }
    } catch (error) {
      showMessage('error', 'Error deleting meta tag');
    }
    setLoading(false);
  };

  const handleToggleStatus = async (id: string) => {
    setLoading(true);
    try {
      const result = await toggleMetaTagStatus(id);
      if (result.success) {
        showMessage('success', 'Meta tag status updated');
        loadMetaTags();
      } else {
        showMessage('error', result.error || 'Failed to update status');
      }
    } catch (error) {
      showMessage('error', 'Error updating status');
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadMetaTags();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Meta Tag & URL Management</h1>
        <Link
          href="/meta_tags_url/new"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add New Meta Tag
        </Link>
      </div>

      {message && (
        <div className={`p-4 mb-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            placeholder="Search by URL, title, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2 border rounded"
          />
          <button
            type="submit"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(1);
              loadMetaTags();
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear
          </button>
        </form>
      </div>

      {/* Meta Tags List */}
      <div className="bg-white rounded shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Managed URLs & Meta Tags</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading meta tags...</div>
        ) : metaTags.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No meta tags found. {!searchTerm && (
              <Link href="/meta_tags_url/new" className="text-blue-600 hover:underline">
                Click here to create your first meta tag.
              </Link>
            )}
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
                          <Link
                            href={`/meta_tags_url/edit/${metaTag._id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </Link>
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
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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
    </div>
  );
};

export default MetaTagUrlManagement;