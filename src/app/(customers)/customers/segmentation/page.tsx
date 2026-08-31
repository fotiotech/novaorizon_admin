"use client";

import React, { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";
import { Plus, Trash2, Edit2 } from "lucide-react";

interface CustomerGroup {
  _id: string;
  name: string;
  description: string;
  customers: string[];
  isActive: boolean;
  createdAt: string;
}

export default function SegmentationPage() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      // Fetch customer groups from API
      const response = await fetch("/api/customer-groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingId
        ? `/api/customer-groups/${editingId}`
        : "/api/customer-groups";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({ name: "", description: "", isActive: true });
        setEditingId(null);
        setShowForm(false);
        fetchGroups();
      }
    } catch (error) {
      console.error("Error saving group:", error);
    }

    setSaving(false);
  };

  const handleEdit = (group: CustomerGroup) => {
    setFormData({
      name: group.name,
      description: group.description,
      isActive: group.isActive,
    });
    setEditingId(group._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    try {
      const response = await fetch(`/api/customer-groups/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setGroups(groups.filter((g) => g._id !== id));
      }
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-foreground">
          Customer Segmentation
        </h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: "", description: "", isActive: true });
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Group Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded border border-border bg-background text-foreground outline-none focus:border-primary"
                placeholder="e.g., VIP Customers, Premium Members"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 rounded border border-border bg-background text-foreground outline-none focus:border-primary resize-none"
                rows={3}
                placeholder="Describe this customer segment..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="rounded border-border"
                />
                <span className="text-sm font-medium text-foreground">
                  Active
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: "", description: "", isActive: true });
                }}
                className="px-4 py-2 rounded border border-border hover:bg-muted transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No customer groups yet. Create one to get started.
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group._id}
              className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">{group.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {group.customers?.length || 0} members
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    group.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200"
                  }`}
                >
                  {group.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              {group.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {group.description}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(group)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded border border-border hover:bg-muted transition-colors text-xs font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(group._id)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-xs font-medium"
                >
                  <Trash2 className="w-4 h-4" />
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
