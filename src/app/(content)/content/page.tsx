"use client";

import { useState } from "react";

type ContentItem = {
  id: string;
  title: string;
  body: string;
};

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([
    { id: "1", title: "Welcome", body: "Welcome to the admin content page." },
  ]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const addItem = () => {
    if (!title.trim()) return;
    const newItem: ContentItem = {
      id: Date.now().toString(),
      title: title.trim(),
      body: body.trim(),
    };
    setItems((prev) => [newItem, ...prev]);
    resetForm();
  };

  const startEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setItems((prev) =>
      prev.map((it) =>
        it.id === editingId
          ? { ...it, title: title.trim(), body: body.trim() }
          : it,
      ),
    );
    resetForm();
  };

  const cancelEdit = () => resetForm();

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setBody("");
  };

  const removeItem = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Content Management
      </h1>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            placeholder="Enter title"
          />
        </div>
        <div>
          <label
            htmlFor="body"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Body
          </label>
          <textarea
            id="body"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
            placeholder="Enter content body"
          />
        </div>
        <div className="flex items-center gap-3">
          {editingId ? (
            <>
              <button
                onClick={saveEdit}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={addItem}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Content
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
        {items.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 p-6 text-center">
            No content yet. Create your first item!
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-gray-600 dark:text-gray-300">
                  {item.body}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(item)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
