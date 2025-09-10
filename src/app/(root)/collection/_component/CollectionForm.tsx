"use client";

import React, { useEffect, useState } from "react";
import {
  createCollection,
  getCollectionById,
  updateCollection,
  deleteCollection,
} from "@/app/actions/collection";
import { useRouter } from "next/navigation";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import ColGroupImageUploader from "@/components/products/ColGroupImage";

const CollectionForm = ({ id }: { id?: string }) => {
  const router = useRouter();
  const [collection, setCollection] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [groups, setGroups] = useState<any[]>([
    {
      name: "",
      description: "",
      ctaText: "",
      ctaUrl: "",
      image: null,
      position: 0,
    },
  ]);

  // Fetch collection data on component mount if editing
  useEffect(() => {
    async function fetchCollection() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const result = await getCollectionById(id);
        if (result.success && result.data) {
          let collectionData = result.data;
          if (Array.isArray(collectionData)) {
            collectionData = collectionData[0];
          }
          setCollection(collectionData);

          // Set groups if they exist
          if (collectionData?.groups && collectionData.groups.length > 0) {
            setGroups(
              collectionData.groups.map((group: any) => ({
                ...group,
                image: group.imageUrl || null,
              }))
            );
          }
        } else {
          setError("Failed to fetch collection data");
        }
      } catch (err) {
        setError("An error occurred while fetching collection data");
      } finally {
        setLoading(false);
      }
    }
    fetchCollection();
  }, [id]);

  // Handle group changes
  const handleGroupChange = (index: number, field: string, value: any) => {
    const updatedGroups = [...groups];
    updatedGroups[index] = {
      ...updatedGroups[index],
      [field]: value,
    };
    setGroups(updatedGroups);
  };

  // Add a new group
  const addGroup = () => {
    setGroups([
      ...groups,
      {
        name: "",
        description: "",
        ctaText: "",
        ctaUrl: "",
        image: null,
        position: groups.length,
      },
    ]);
  };

  // Remove a group
  const removeGroup = (index: number) => {
    if (groups.length <= 1) return;
    const updatedGroups = [...groups];
    updatedGroups.splice(index, 1);
    // Update positions
    const groupsWithNewPositions = updatedGroups.map((group, i) => ({
      ...group,
      position: i,
    }));
    setGroups(groupsWithNewPositions);
  };

  console.log({ groups });

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const display = formData.get("display") as string;
      const status = formData.get("status") as string;

      if (!name.trim()) {
        setError("Name is required");
        return;
      }

      // Create a new FormData for the API call
      const submitData = new FormData();
      submitData.append("name", name);
      submitData.append("description", description);
      submitData.append("display", display);
      submitData.append("status", status);

      // Add groups metadata (without image files) to form data
      submitData.append(
        "groups",
        JSON.stringify(
          groups.map((group) => ({
            name: group.name,
            description: group.description,
            ctaText: group.ctaText,
            ctaUrl: group.ctaUrl,
            position: group.position,
            image: typeof group.image === "string" ? group.image : "",
          }))
        )
      );

      let result;
      if (id) {
        result = await updateCollection(id, submitData);
      } else {
        result = await createCollection(submitData);
      }

      if (result.success) {
        setSuccess(
          id
            ? "Collection updated successfully"
            : "Collection created successfully"
        );
        setTimeout(() => {
          router.push("/collection");
          router.refresh();
        }, 1500);
      } else {
        setError(
          result.error ||
            (id ? "Failed to update collection" : "Failed to create collection")
        );
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    if (
      !confirm(
        "Are you sure you want to delete this collection? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteCollection(id);

      if (result.success) {
        setSuccess("Collection deleted successfully");
        setTimeout(() => {
          router.push("/collection");
          router.refresh();
        }, 1500);
      } else {
        setError(result.error || "Failed to delete collection");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl mx-auto flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {error && (
        <Notification
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}
      {success && (
        <Notification
          type="success"
          message={success}
          onClose={() => setSuccess(null)}
        />
      )}

      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {id ? "Edit Collection" : "Create Collection"}
          </h1>
          <p className="text-gray-600 mt-1">
            {id
              ? "Edit your product collection"
              : "Create a new product collection with custom rules and groups"}
          </p>
        </div>

        {id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isDeleting ? (
              <span className="flex items-center justify-center">
                <Spinner />
                <span className="ml-2">Deleting...</span>
              </span>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Collection
              </>
            )}
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <form action={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block mb-2 font-medium text-gray-700"
              >
                Name *
              </label>
              <input
                id="name"
                type="text"
                name="name"
                defaultValue={collection?.name || ""}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting}
                placeholder="Enter collection name"
              />
            </div>

            <div>
              <label
                htmlFor="display"
                className="block mb-2 font-medium text-gray-700"
              >
                Display Format
              </label>
              <select
                id="display"
                name="display"
                defaultValue={collection?.display || "grid"}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={isSubmitting}
              >
                <option value="grid">Grid</option>
                <option value="carrousel">Carousel</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="block mb-2 font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={collection?.description || ""}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
              placeholder="Enter collection description"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="block mb-2 font-medium text-gray-700"
            >
              Status
            </label>
            <select
              name="status"
              id="status"
              defaultValue={collection?.status || "active"}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Groups Section */}
          <div className="py-6 border-t border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Groups</h2>
              <button
                type="button"
                onClick={addGroup}
                className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
              >
                + Add Group
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Create distinct groups within this collection with their own
              metadata
            </p>

            {groups.map((group, index) => (
              <div
                key={index}
                className="mb-6 p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-gray-700">
                    Group #{index + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeGroup(index)}
                    className="text-red-500 hover:text-red-700"
                    disabled={groups.length <= 1}
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) =>
                        handleGroupChange(index, "name", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg p-2"
                      placeholder="Group name"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700">
                      CTA Text
                    </label>
                    <input
                      type="text"
                      value={group.ctaText}
                      onChange={(e) =>
                        handleGroupChange(index, "ctaText", e.target.value)
                      }
                      className="w-full border border-gray-300 rounded-lg p-2"
                      placeholder="Button text"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    CTA URL
                  </label>
                  <input
                    type="url"
                    value={group.ctaUrl}
                    onChange={(e) =>
                      handleGroupChange(index, "ctaUrl", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg p-2"
                    placeholder="https://example.com"
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={group.description}
                    onChange={(e) =>
                      handleGroupChange(index, "description", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-lg p-2"
                    rows={2}
                    placeholder="Group description"
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Group Image
                  </label>
                  <ColGroupImageUploader
                    index={index}
                    handleColGroupChange={handleGroupChange}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => router.push("/collection")}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 px-5 py-2.5 rounded-lg text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <Spinner />
                  <span className="ml-2">
                    {id ? "Updating..." : "Creating..."}
                  </span>
                </span>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  {id ? "Update Collection" : "Create Collection"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectionForm;
