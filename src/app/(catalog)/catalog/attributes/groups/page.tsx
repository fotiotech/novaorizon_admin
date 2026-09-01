"use client";

import {
  deleteAttributeGroup,
  findAllAttributeGroups,
} from "@/app/actions/attributegroup";
import { findAttributesAndValues } from "@/app/actions/attributes";
import React, { useEffect, useMemo, useState } from "react";
import { AttributeGroupFormModal } from "./_component/AttributeGroupFormModal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { Edit, Delete } from "@mui/icons-material";

// Types
type AttributeType = {
  _id?: string;
  id?: string;
  code: string;
  name: string;
  option?: string;
  type: string;
  sort_order: number;
};

type AttributesGroup = {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  parentId?: string;
  attributes?: string[];
  sort_order: number;
  sortOrder?: number;
  children?: AttributesGroup[];
};

// Main Group Component
const Group = () => {
  const [attributes, setAttributes] = useState<AttributeType[]>([]);
  const [groups, setGroups] = useState<AttributesGroup[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string>("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string>("");
  const [deleteTargetName, setDeleteTargetName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [attributesResponse, groupsResponse] = await Promise.all([
          findAttributesAndValues(),
          findAllAttributeGroups(),
        ]);

        if (attributesResponse?.length > 0) {
          setAttributes(attributesResponse as unknown as AttributeType[]);
        }

        if (groupsResponse) {
          setGroups(groupsResponse as unknown as AttributesGroup[]);
        }

        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFormSuccess = async () => {
    // Refresh groups list
    try {
      const res = await findAllAttributeGroups();
      setGroups(res as unknown as AttributesGroup[]);
      setSuccess(
        editGroupId
          ? "Group updated successfully!"
          : "Group created successfully!",
      );
      setEditGroupId("");
      setIsFormModalOpen(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh groups");
    }
  };

  const handleOpenCreateModal = () => {
    setEditGroupId("");
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (groupId: string) => {
    setEditGroupId(groupId);
    setIsFormModalOpen(true);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsLoading(true);
    try {
      await deleteAttributeGroup(deleteTargetId);
      const res = await findAllAttributeGroups();
      setGroups(res as unknown as AttributesGroup[]);
      setSuccess("Group deleted successfully!");
      setIsDeleteModalOpen(false);
      setDeleteTargetId("");
      setDeleteTargetName("");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle group expansion in overview
  const toggleGroupExpansion = (id: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Get the parent group name
  const getParentGroupName = (parentId: string) => {
    if (!parentId) return "-";
    const parent = groups.find((g) => g._id === parentId);
    return parent ? parent.name : parentId;
  };

  // Get attribute names for display
  const getAttributeNames = (attributeIds: string[] = []) => {
    return attributeIds
      .map((id) => {
        const attr = attributes.find((a) => a._id === id);
        return attr ? attr.name : null;
      })
      .filter(Boolean)
      .join(", ");
  };

  // Flatten groups for table display with hierarchy information
  const flattenedGroups = useMemo(() => {
    const flatten = (groupList: AttributesGroup[], level = 0): any[] => {
      let result: any[] = [];

      groupList.forEach((group) => {
        result.push({
          ...group,
          level,
          hasChildren: group.children && group.children.length > 0,
          isExpanded: expandedGroups.has(group._id),
        });

        if (expandedGroups.has(group._id) && group.children) {
          result = result.concat(flatten(group.children, level + 1));
        }
      });

      return result;
    };

    const rootGroups = groups.filter(
      (group) => !group.parent_id && !group.parentId,
    );
    return flatten(rootGroups);
  }, [groups, expandedGroups]);

  return (
    <div className="max-w-7xl mx-auto lg:px-8 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-bold text-2xl text-foreground">Attribute Groups</h2>
        <button
          onClick={handleOpenCreateModal}
          className="btn inline-flex items-center gap-1"
        >
          <span>+</span> New Group
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Success:</strong>
          <span className="block sm:inline"> {success}</span>
        </div>
      )}

      {/* Groups Table */}
      <div className="bg-card p-4 rounded-lg shadow-md border border-border overflow-x-auto">
        {isLoading && groups.length === 0 ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : groups.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No groups created yet. Click the "New Group" button to create one.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Code
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Parent
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Attributes
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {flattenedGroups.map((group) => (
                <tr key={group._id} className="hover:bg-muted/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {group.hasChildren && (
                        <button
                          type="button"
                          onClick={() => toggleGroupExpansion(group._id)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-foreground"
                        >
                          {group.isExpanded ? "−" : "+"}
                        </button>
                      )}
                      <span
                        style={{ marginLeft: `${group.level * 20}px` }}
                        className="text-sm font-medium text-foreground"
                      >
                        {group.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">
                      {group.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">
                      {getParentGroupName(
                        group.parent_id || group.parentId || "",
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-muted-foreground">
                      {group.attributes && group.attributes.length > 0
                        ? `${group.attributes.length} attribute(s)`
                        : "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(group._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
                        title="Edit group"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(group._id, group.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition"
                        title="Delete group"
                      >
                        <Delete className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      <AttributeGroupFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditGroupId("");
        }}
        onSuccess={handleFormSuccess}
        groupId={editGroupId || undefined}
        attributes={attributes}
        groups={groups}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetId("");
          setDeleteTargetName("");
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Attribute Group"
        message={`Are you sure you want to delete the group "${deleteTargetName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Group;
