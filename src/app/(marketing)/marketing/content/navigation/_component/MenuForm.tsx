// components/MenuForm.tsx
"use client";

import {
  getMenuById,
  createMenu,
  updateMenu,
  MenuData,
  getMenuContentOptions,
  deleteMenuBackgroundImage, // new action
} from "@/app/actions/menu";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import FilesUploader from "@/components/FilesUploader";
import useFileUploader from "@/hooks/useFileUploader";

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------
const MENU_TYPES = {
  CATEGORY: "Category",
  PRODUCT: "Product",
  BRAND: "Brand",
  COLLECTION: "Collection",
  PROMOTION: "Promotion",
  URL: "URL",
  SEARCH: "Search",
  PAGE: "Page",
} as const;

type MenuType = (typeof MENU_TYPES)[keyof typeof MENU_TYPES];

const CONTENT_TYPES: MenuType[] = [
  "Category",
  "Product",
  "Brand",
  "Collection",
  "Promotion",
];

// ------------------------------------------------------------
// Interface
// ------------------------------------------------------------
interface MenuFormProps {
  id?: string;
}

// ------------------------------------------------------------
// Helper: filter options
// ------------------------------------------------------------
const filterOptions = (
  options: { value: string; label: string }[],
  query: string,
) => {
  if (!query.trim()) return options;
  const lowerQuery = query.toLowerCase().trim();
  return options.filter((opt) => opt.label.toLowerCase().includes(lowerQuery));
};

// ------------------------------------------------------------
// Main Component
// ------------------------------------------------------------
const MenuForm = ({ id }: MenuFormProps) => {
  // ------------------------------------------------------------
  // State
  // ------------------------------------------------------------
  const [menu, setMenu] = useState<
    Omit<MenuData, "content"> & { content: string[] }
  >({
    name: "",
    description: "",
    content: [],
    ctaUrl: "",
    ctaText: "",
    type: "Product",
    location: "Home",
    display: "List",
    position: "left",
    columns: 4,
    maxDepth: 2,
    showImages: false,
    backgroundColor: "#ffffff",
    backgroundImage: "",
    isSticky: false,
    sectionTitle: "",
  });

  const [contentOptions, setContentOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // --- Enhanced content selection states ---
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtered options based on search
  const filteredOptions = filterOptions(contentOptions, searchQuery);
  const selectedMap = new Map(menu.content.map((id) => [id, true]));

  // --- Background image uploader ---
  // Use the menu id (or a dummy) as productId; subfolder "menus/backgrounds"
  const bgUpload = useFileUploader(
    id || "new-menu",
    menu.backgroundImage ? [menu.backgroundImage] : [],
    "menus/backgrounds",
  );

  // Sync uploaded image URL with menu.backgroundImage
  useEffect(() => {
    const uploadedUrl = bgUpload.files[0] || "";
    if (uploadedUrl !== menu.backgroundImage) {
      setMenu((prev) => ({
        ...prev,
        backgroundImage: uploadedUrl,
      }));
    }
  }, [bgUpload.files, menu.backgroundImage]);

  // ---- Custom remove handler for background image ----
  const handleRemoveBackgroundImage = async (
    index: number,
    fileUrl: string,
  ) => {
    // Only allow removal if editing an existing menu
    if (!id) {
      // Create mode: just remove from local state
      bgUpload.setFiles([]);
      setMenu((prev) => ({ ...prev, backgroundImage: "" }));
      return;
    }

    // Edit mode: call server action
    try {
      const result = await deleteMenuBackgroundImage(id);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove background image");
      }
      // Update local state
      bgUpload.setFiles([]);
      setMenu((prev) => ({ ...prev, backgroundImage: "" }));
      setSuccess("Background image removed successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to remove image");
    }
  };

  // ------------------------------------------------------------
  // Fetch existing menu data (if editing)
  // ------------------------------------------------------------
  useEffect(() => {
    const fetchMenu = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await getMenuById(id);
        if (result.success && result.data) {
          const data = result.data;
          setMenu({
            name: data.name || "",
            description: data.description || "",
            content: data.content?.map((c: any) => c._id || c) || [],
            ctaUrl: data.ctaUrl || "",
            ctaText: data.ctaText || "",
            type: data.type || "Product",
            location: data.location || "Home",
            display: data.display || "List",
            position: data.position || "left",
            columns: data.columns || 4,
            maxDepth: data.maxDepth || 2,
            showImages: data.showImages || false,
            backgroundColor: data.backgroundColor || "#ffffff",
            backgroundImage: data.backgroundImage || "",
            isSticky: data.isSticky || false,
            sectionTitle: data.sectionTitle || "",
          });
          // After setting menu, fetch options for its type
          await fetchOptions(data.type);
        } else {
          setError(result.error || "Failed to load menu");
        }
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [id]);

  // ------------------------------------------------------------
  // Fetch content options
  // ------------------------------------------------------------
  const fetchOptions = async (type: MenuType) => {
    if (!CONTENT_TYPES.includes(type)) {
      setContentOptions([]);
      return;
    }
    setLoadingOptions(true);
    try {
      const options = await getMenuContentOptions(type);
      setContentOptions(options);
    } catch (err: any) {
      setError(err.message || "Failed to load options");
    } finally {
      setLoadingOptions(false);
    }
  };

  // ------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------
  const handleMenuTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as MenuType;
    setMenu((prev) => ({
      ...prev,
      type: newType,
      content: [], // clear previous selections
    }));
    setSearchQuery("");
    fetchOptions(newType);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setMenu((prev) => ({ ...prev, [name]: val }));
  };

  // --- Content selection ---
  const handleAddContent = (value: string) => {
    if (!menu.content.includes(value)) {
      setMenu((prev) => ({
        ...prev,
        content: [...prev.content, value],
      }));
    }
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleRemoveContent = (value: string) => {
    setMenu((prev) => ({
      ...prev,
      content: prev.content.filter((id) => id !== value),
    }));
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = id
        ? await updateMenu(id, menu)
        : await createMenu(menu as MenuData);

      if (result.success) {
        setSuccess(
          result.message || (id ? "Menu updated" : "Menu created successfully"),
        );
        if (!id) {
          // Reset form after creation
          setMenu({
            name: "",
            description: "",
            content: [],
            ctaUrl: "",
            ctaText: "",
            type: "Product",
            location: "Home",
            display: "List",
            position: "left",
            columns: 4,
            maxDepth: 2,
            showImages: false,
            backgroundColor: "#ffffff",
            backgroundImage: "",
            isSticky: false,
            sectionTitle: "",
          });
          setContentOptions([]);
          setSearchQuery("");
          // Clear background uploader files
          bgUpload.clearFiles();
        }
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spinner />
      </div>
    );
  }

  const isContentType = CONTENT_TYPES.includes(menu.type as MenuType);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-card rounded-lg shadow-md">
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

      <h2 className="text-2xl font-bold mb-6 text-foreground">
        {id ? "Edit Menu" : "Create New Menu"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Menu Type */}
        <div>
          <label
            htmlFor="type"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Menu Type *
          </label>
          <select
            id="type"
            name="type"
            value={menu.type}
            onChange={handleMenuTypeChange}
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {Object.values(MENU_TYPES).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={menu.name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Summer Sale"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={menu.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Brief description"
          />
        </div>

        {/* Enhanced Content Selection */}
        {isContentType && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Select {menu.type}s
            </label>
            <div className="relative" ref={dropdownRef}>
              {/* Search input */}
              <div className="flex items-center border border-border rounded-md bg-background focus-within:ring-2 focus-within:ring-primary">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={`Search ${menu.type}s...`}
                  className="flex-1 px-3 py-2 bg-transparent text-foreground outline-none"
                  disabled={loadingOptions}
                />
                {loadingOptions && <Spinner />}
              </div>

              {/* Dropdown list */}
              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loadingOptions ? (
                    <div className="p-2 text-center text-muted-foreground">
                      Loading...
                    </div>
                  ) : filteredOptions.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">
                      {searchQuery
                        ? "No matching items found"
                        : "No items available"}
                    </div>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = selectedMap.has(opt.value);
                      return (
                        <div
                          key={opt.value}
                          onClick={() => {
                            if (!isSelected) {
                              handleAddContent(opt.value);
                            }
                          }}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted ${
                            isSelected ? "bg-muted/50 cursor-not-allowed" : ""
                          }`}
                        >
                          <span className="text-foreground">{opt.label}</span>
                          {isSelected && (
                            <span className="text-primary text-sm">
                              ✓ Added
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Selected tags */}
            {menu.content.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {menu.content.map((id) => {
                  const label =
                    contentOptions.find((opt) => opt.value === id)?.label || id;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => handleRemoveContent(id)}
                        className="hover:text-destructive focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setMenu((prev) => ({ ...prev, content: [] }))}
                  className="text-sm text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Type to search, click to add, click × to remove
            </p>
          </div>
        )}

        {/* CTA Text & URL */}
        <div>
          <label
            htmlFor="ctaText"
            className="block text-sm font-medium text-foreground mb-1"
          >
            CTA Text
          </label>
          <input
            type="text"
            id="ctaText"
            name="ctaText"
            value={menu.ctaText || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Shop Now"
          />
        </div>
        <div>
          <label
            htmlFor="ctaUrl"
            className="block text-sm font-medium text-foreground mb-1"
          >
            CTA URL
          </label>
          <input
            type="url"
            id="ctaUrl"
            name="ctaUrl"
            value={menu.ctaUrl || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://example.com/sale"
          />
        </div>

        {/* Location, Display, etc. */}
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Location
          </label>
          <select
            id="location"
            name="location"
            value={menu.location}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Banner">Banner</option>
            <option value="Header">Header</option>
            <option value="Home">Home</option>
            <option value="Section">Section</option>
            <option value="Footer">Footer</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="display"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Display Mode
          </label>
          <select
            id="display"
            name="display"
            value={menu.display}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="List">List</option>
            <option value="Grid">Grid</option>
            <option value="Carousel">Carousel</option>
            <option value="Dropdown">Dropdown</option>
            <option value="MegaMenu">MegaMenu</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="position"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Position
          </label>
          <select
            id="position"
            name="position"
            value={menu.position}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="full">Full</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="columns"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Columns (for MegaMenu)
          </label>
          <input
            type="number"
            id="columns"
            name="columns"
            value={menu.columns}
            onChange={handleInputChange}
            min={1}
            max={6}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="maxDepth"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Max Depth
          </label>
          <input
            type="number"
            id="maxDepth"
            name="maxDepth"
            value={menu.maxDepth}
            onChange={handleInputChange}
            min={1}
            max={5}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="showImages"
            name="showImages"
            checked={menu.showImages || false}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary focus:ring-primary border-border rounded bg-background"
          />
          <label
            htmlFor="showImages"
            className="ml-2 block text-sm text-foreground"
          >
            Show Images
          </label>
        </div>

        <div>
          <label
            htmlFor="backgroundColor"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Background Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="backgroundColor"
              name="backgroundColor"
              value={menu.backgroundColor}
              onChange={handleInputChange}
              className="h-10 w-10 rounded border border-border bg-background"
            />
            <input
              type="text"
              name="backgroundColor"
              value={menu.backgroundColor}
              onChange={handleInputChange}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Background Image Uploader */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Background Image
          </label>
          <FilesUploader
            files={bgUpload.files}
            addFiles={bgUpload.addFiles}
            onRemove={handleRemoveBackgroundImage}
            loading={bgUpload.loading}
            progressByName={bgUpload.progressByName}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Upload an image to set as the menu background. Only the first image
            will be used. Click × to remove.
          </p>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isSticky"
            name="isSticky"
            checked={menu.isSticky || false}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary focus:ring-primary border-border rounded bg-background"
          />
          <label
            htmlFor="isSticky"
            className="ml-2 block text-sm text-foreground"
          >
            Sticky
          </label>
        </div>

        <div>
          <label
            htmlFor="sectionTitle"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Section Title
          </label>
          <input
            type="text"
            id="sectionTitle"
            name="sectionTitle"
            value={menu.sectionTitle || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Featured Products"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <Spinner />
                {id ? "Updating..." : "Creating..."}
              </span>
            ) : id ? (
              "Update Menu"
            ) : (
              "Create Menu"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MenuForm;
