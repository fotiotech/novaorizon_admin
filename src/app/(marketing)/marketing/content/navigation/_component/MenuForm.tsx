"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenuBackgroundImage,
} from "@/app/actions/menu";
import { getAllCollections } from "@/app/actions/collection";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";
import FilesUploader from "@/components/FilesUploader";
import useFileUploader from "@/hooks/useFileUploader";

interface MenuFormProps {
  id?: string;
}

const MenuForm = ({ id }: MenuFormProps) => {
  const router = useRouter();

  // ----- State -----
  const [loading, setLoading] = useState(true);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Menu data
  const [menu, setMenu] = useState({
    name: "",
    description: "",
    collectionId: "",
    link: "",
    ctaText: "",
    ctaLink: "",
    location: "Home" as const,
    display: "List" as const,
    position: "left" as const,
    columns: 4,
    maxDepth: 2,
    showImages: false,
    backgroundColor: "#ffffff",
    backgroundImage: "",
    isSticky: false,
    sectionTitle: "",
    order: 0,
  });

  // Collections for dropdown
  const [collections, setCollections] = useState<any[]>([]);

  // Background image uploader – we pass an empty array initially, will update later.
  const bgUpload = useFileUploader(
    id || "new-menu",
    menu.backgroundImage ? [menu.backgroundImage] : [],
    "menus/backgrounds",
  );

  // Force re-render of FilesUploader when backgroundImage changes
  const bgUploadKey = useMemo(
    () => menu.backgroundImage || "none",
    [menu.backgroundImage],
  );

  // Sync uploaded image with menu state
  useEffect(() => {
    const uploadedUrl = bgUpload.files[0] || "";
    if (uploadedUrl !== menu.backgroundImage) {
      setMenu((prev) => ({
        ...prev,
        backgroundImage: uploadedUrl,
      }));
    }
  }, [bgUpload.files, menu.backgroundImage]);

  // ----- Fetch data -----
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch collections list
        setLoadingCollections(true);
        const collRes = await getAllCollections();
        if (collRes.success) {
          setCollections(collRes.data || []);
        } else {
          setError(collRes.error || "Failed to load collections");
        }
        setLoadingCollections(false);

        if (id) {
          const menuRes = await getMenuById(id);
          if (menuRes.success && menuRes.data) {
            const data = menuRes.data;
            setMenu({
              name: data.name || "",
              description: data.description || "",
              collectionId: data.collectionId || "",
              link: data.link || "",
              ctaText: data.ctaText || "",
              ctaLink: data.ctaLink || "",
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
              order: data.order || 0,
            });
            // Update background uploader with existing image
            if (data.backgroundImage) {
              bgUpload.setFiles([data.backgroundImage]);
            }
          } else {
            setError(menuRes.error || "Failed to load menu");
          }
        }
      } catch (err: any) {
        setError(err.message || "Unexpected error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]); // Remove bgUpload from deps to avoid infinite loop

  // ----- Handlers -----
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setMenu((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleRemoveBackground = async (index: number, fileUrl: string) => {
    if (!id) {
      bgUpload.setFiles([]);
      setMenu((prev) => ({ ...prev, backgroundImage: "" }));
      return;
    }
    try {
      const result = await deleteMenuBackgroundImage(id);
      if (!result.success) throw new Error(result.error || "Failed to remove");
      bgUpload.setFiles([]);
      setMenu((prev) => ({ ...prev, backgroundImage: "" }));
      setSuccess("Background image removed");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation: at least one of collectionId or link must be set
      if (!menu.collectionId && !menu.link) {
        setError("Please select a collection or provide a link.");
        setSubmitting(false);
        return;
      }

      const result = id ? await updateMenu(id, menu) : await createMenu(menu);

      if (result.success) {
        setSuccess(result.message || (id ? "Menu updated" : "Menu created"));
        if (!id) {
          // Reset form after creation
          setMenu({
            name: "",
            description: "",
            collectionId: "",
            link: "",
            ctaText: "",
            ctaLink: "",
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
            order: 0,
          });
          bgUpload.clearFiles();
        }
        // Redirect to list after brief delay
        setTimeout(() => {
          router.push("/marketing/content/navigation/menus");
          router.refresh();
        }, 1500);
      } else {
        setError(result.error || "Operation failed");
      }
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

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
            onChange={handleChange}
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
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Brief description"
          />
        </div>

        {/* Collection Selector */}
        <div>
          <label
            htmlFor="collectionId"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Collection (content source)
          </label>
          <select
            id="collectionId"
            name="collectionId"
            value={menu.collectionId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loadingCollections}
          >
            <option value="">-- None (use link) --</option>
            {collections.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.targetType})
              </option>
            ))}
          </select>
          {loadingCollections && (
            <div className="mt-1 text-xs text-muted-foreground">
              Loading collections...
            </div>
          )}
          {!loadingCollections && collections.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              No collections available. Please create a collection first.
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Select a collection to display its items. If none, the link below
            will be used.
          </p>
        </div>

        {/* Link (if no collection) */}
        <div>
          <label
            htmlFor="link"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Direct Link (URL)
          </label>
          <input
            type="url"
            id="link"
            name="link"
            value={menu.link}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://example.com/sale"
          />
          <p className="text-xs text-muted-foreground mt-1">
            If no collection is selected, this link will be used (e.g., for
            static pages).
          </p>
        </div>

        {/* CTA Text */}
        <div>
          <label
            htmlFor="ctaText"
            className="block text-sm font-medium text-foreground mb-1"
          >
            CTA Text (optional)
          </label>
          <input
            type="text"
            id="ctaText"
            name="ctaText"
            value={menu.ctaText}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., View All"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Text for the call-to-action button (e.g., "See More").
          </p>
        </div>

        {/* CTA Link */}
        <div>
          <label
            htmlFor="ctaLink"
            className="block text-sm font-medium text-foreground mb-1"
          >
            CTA Link (optional)
          </label>
          <input
            type="url"
            id="ctaLink"
            name="ctaLink"
            value={menu.ctaLink}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://example.com/all"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Destination URL for the CTA button.
          </p>
        </div>

        {/* Location */}
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
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="Banner">Banner</option>
            <option value="NavBar">NavBar</option>
            <option value="SideBar">SideBar</option>
            <option value="Home">Home</option>
            <option value="Section">Section</option>
            <option value="Footer">Footer</option>
          </select>
        </div>

        {/* Order */}
        <div>
          <label
            htmlFor="order"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Order (lower = higher priority)
          </label>
          <input
            type="number"
            id="order"
            name="order"
            value={menu.order}
            onChange={handleChange}
            min={0}
            step={1}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Menus with the same location are sorted by this number in ascending
            order.
          </p>
        </div>

        {/* Display */}
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
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="List">List</option>
            <option value="Grid">Grid</option>
            <option value="Carousel">Carousel</option>
            <option value="Dropdown">Dropdown</option>
            <option value="MegaMenu">MegaMenu</option>
          </select>
        </div>

        {/* Position */}
        <div>
          <label
            htmlFor="position"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Position (alignment)
          </label>
          <select
            id="position"
            name="position"
            value={menu.position}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="full">Full</option>
          </select>
        </div>

        {/* Columns (for MegaMenu) */}
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
            onChange={handleChange}
            min={1}
            max={6}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Max Depth */}
        <div>
          <label
            htmlFor="maxDepth"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Max Depth (nesting)
          </label>
          <input
            type="number"
            id="maxDepth"
            name="maxDepth"
            value={menu.maxDepth}
            onChange={handleChange}
            min={1}
            max={5}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            How many levels of nested items to allow (1-5). Only applicable for
            nested collections.
          </p>
        </div>

        {/* Show Images */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="showImages"
            name="showImages"
            checked={menu.showImages}
            onChange={handleChange}
            className="
              appearance-none
              w-5 h-5
              border-2 border-border
              rounded
              bg-background
              checked:bg-primary
              checked:border-primary
              relative
              after:content-['✓']
              after:absolute
              after:inset-0
              after:flex
              after:items-center
              after:justify-center
              after:text-white
              after:text-sm
              after:opacity-0
              checked:after:opacity-100
              focus:ring-2 focus:ring-primary
              transition-all
            "
          />
          <label
            htmlFor="showImages"
            className="ml-2 block text-sm text-foreground cursor-pointer"
          >
            Show Images in menu
          </label>
        </div>

        {/* Background Color */}
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
              onChange={handleChange}
              className="h-10 w-10 rounded border border-border bg-background"
            />
            <input
              type="text"
              name="backgroundColor"
              value={menu.backgroundColor}
              onChange={handleChange}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Background Image Upload - with key to force re-render */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Background Image
          </label>
          <FilesUploader
            key={bgUploadKey} // Force re-render when background image changes
            files={bgUpload.files}
            addFiles={bgUpload.addFiles}
            onRemove={handleRemoveBackground}
            loading={bgUpload.loading}
            progressByName={bgUpload.progressByName}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Upload a background image. Only the first image will be used. Click
            × to remove.
          </p>
        </div>

        {/* Sticky */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isSticky"
            name="isSticky"
            checked={menu.isSticky}
            onChange={handleChange}
            className="
              appearance-none
              w-5 h-5
              border-2 border-border
              rounded
              bg-background
              checked:bg-primary
              checked:border-primary
              relative
              after:content-['✓']
              after:absolute
              after:inset-0
              after:flex
              after:items-center
              after:justify-center
              after:text-white
              after:text-sm
              after:opacity-0
              checked:after:opacity-100
              focus:ring-2 focus:ring-primary
              transition-all
            "
          />
          <label
            htmlFor="isSticky"
            className="ml-2 block text-sm text-foreground cursor-pointer"
          >
            Sticky
          </label>
        </div>

        {/* Section Title */}
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
            value={menu.sectionTitle}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g., Featured Products"
          />
        </div>

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
      </form>
    </div>
  );
};

export default MenuForm;
