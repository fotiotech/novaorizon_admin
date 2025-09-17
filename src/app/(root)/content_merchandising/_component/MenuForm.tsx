// components/MenuForm.tsx (updated)
import { getAllCollections } from "@/app/actions/collection";
import {
  getMenuById,
  createMenu,
  updateMenu,
  MenuData,
} from "@/app/actions/menu";
import React, { useEffect, useState } from "react";
import Spinner from "@/components/Spinner";
import Notification from "@/components/Notification";

// Define menu types and their properties
const MENU_TYPES = {
  NAVIGATION: "navigation",
  HEADER: "header",
  SECTION: "section",
  FOOTER: "footer",
  CATEGORY: "category",
  PROMOTIONAL: "promotional",
} as const;

type MenuType = keyof typeof MENU_TYPES;

interface MenuProperties {
  // Common properties
  name: string;
  description: string;
  collections: string[];
  ctaUrl?: string;
  ctaText?: string;

  // Type-specific properties
  position?: string; // For header/footer menus
  columns?: number; // For footer menus
  maxDepth?: number; // For navigation menus
  showImages?: boolean; // For category menus
  backgroundColor?: string; // For promotional menus
  backgroundImage?: string; // For promotional menus
  isSticky?: boolean; // For header menus
  sectionTitle?: string; // For menu sections
}

const MenuForm = ({ id }: { id?: string }) => {
  const [menu, setMenu] = useState<MenuProperties>({
    name: "",
    description: "",
    collections: [],
    ctaUrl: "",
    ctaText: "",
    // Default properties based on type
    position: "top",
    columns: 4,
    maxDepth: 2,
    showImages: false,
    backgroundColor: "#ffffff",
    isSticky: false,
    sectionTitle: "",
  });

  const [menuType, setMenuType] = useState<MenuType>("NAVIGATION");
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch collections and existing menu data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch collections
        const collectionsResult = await getAllCollections();
        if (collectionsResult.success) {
          setCollections(collectionsResult.data || []);
        } else {
          setError(collectionsResult.error || "Failed to fetch collections");
        }

        // If we have an ID, fetch the existing menu
        if (id) {
          const menuResult = await getMenuById(id);
          if (menuResult.success) {
            const menuData = menuResult.data;
            setMenu((prev) => ({
              ...prev,
              ...menuData,
              // Ensure all properties exist to avoid undefined errors
              position: menuData.position || "top",
              columns: menuData.columns || 4,
              maxDepth: menuData.maxDepth || 2,
              showImages: menuData.showImages || false,
              backgroundColor: menuData.backgroundColor || "#ffffff",
              backgroundImage: menuData.backgroundImage || "",
              isSticky: menuData.isSticky || false,
              sectionTitle: menuData.sectionTitle || "",
            }));

            // Set menu type if available
            if (menuData.type) {
              const typeKey = Object.keys(MENU_TYPES).find(
                (key) => MENU_TYPES[key as MenuType] === menuData.type
              ) as MenuType;
              if (typeKey) setMenuType(typeKey);
            }
          } else {
            setError(menuResult.error || "Failed to fetch menu");
          }
        }
      } catch (err) {
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setMenu((prev) => ({ ...prev, [name]: val }));
  };

  // Handle menu type changes
  const handleMenuTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as MenuType;
    setMenuType(newType);

    // Reset type-specific properties when changing menu type
    setMenu((prev) => ({
      ...prev,
      position:
        newType === "HEADER" || newType === "FOOTER" ? prev.position : "top",
      columns: newType === "FOOTER" ? prev.columns : 4,
      maxDepth: newType === "NAVIGATION" ? prev.maxDepth : 2,
      showImages: newType === "CATEGORY" ? prev.showImages : false,
      backgroundColor:
        newType === "PROMOTIONAL" ? prev.backgroundColor : "#ffffff",
      isSticky: newType === "HEADER" ? prev.isSticky : false,
      sectionTitle: newType === "SECTION" ? prev.sectionTitle : "",
    }));
  };

  // Handle collection selection changes
  const handleCollectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedCollections: any = [];

    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedCollections.push(options[i].value);
      }
    }

    setMenu((prev) => ({ ...prev, collections: selectedCollections }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Prepare menu data with type
      const menuData: MenuData & Record<string, any> = {
        ...menu,
        type: MENU_TYPES[menuType],
      };

      let result;

      if (id) {
        // Update existing menu
        result = await updateMenu(id, menuData);
      } else {
        // Create new menu
        result = await createMenu(menuData);
      }

      if (result.success) {
        setSuccess(
          result.message ||
            (id ? "Menu updated successfully" : "Menu created successfully")
        );

        // If creating a new menu, reset the form
        if (!id) {
          setMenu({
            name: "",
            description: "",
            collections: [],
            ctaUrl: "",
            ctaText: "",
            position: "top",
            columns: 4,
            maxDepth: 2,
            showImages: false,
            backgroundColor: "#ffffff",
            backgroundImage: "",
            isSticky: false,
            sectionTitle: "",
          });
          setMenuType("NAVIGATION");
        }
      } else {
        setError(
          result.error ||
            (id ? "Failed to update menu" : "Failed to create menu")
        );
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
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

      <h2 className="text-2xl font-bold mb-6">
        {id ? "Edit Menu" : "Create New Menu"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Menu Type Selection */}
        <div>
          <label
            htmlFor="menuType"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Menu Type *
          </label>
          <select
            id="menuType"
            value={menuType}
            onChange={handleMenuTypeChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="NAVIGATION">Navigation Menu</option>
            <option value="HEADER">Header Menu</option>
            <option value="SECTION">Menu Section</option>
            <option value="FOOTER">Footer Menu</option>
            <option value="CATEGORY">Category Menu</option>
            <option value="PROMOTIONAL">Promotional Menu</option>
          </select>
        </div>

        {/* Common Properties */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Menu Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={menu.name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter menu name"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={menu.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter menu description"
          />
        </div>

        {/* Type-Specific Properties */}
        {menuType === "HEADER" && (
          <>
            <div>
              <label
                htmlFor="position"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Position
              </label>
              <select
                id="position"
                name="position"
                value={menu.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="top">Top</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isSticky"
                name="isSticky"
                checked={menu.isSticky || false}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="isSticky"
                className="ml-2 block text-sm text-gray-700"
              >
                Sticky Menu (remains visible when scrolling)
              </label>
            </div>
          </>
        )}

        {menuType === "FOOTER" && (
          <>
            <div>
              <label
                htmlFor="position"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Position
              </label>
              <select
                id="position"
                name="position"
                value={menu.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="top">Top Section</option>
                <option value="middle">Middle Section</option>
                <option value="bottom">Bottom Section</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="columns"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Number of Columns
              </label>
              <select
                id="columns"
                name="columns"
                value={menu.columns}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 Column</option>
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
              </select>
            </div>
          </>
        )}

        {menuType === "NAVIGATION" && (
          <div>
            <label
              htmlFor="maxDepth"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Maximum Menu Depth
            </label>
            <select
              id="maxDepth"
              name="maxDepth"
              value={menu.maxDepth}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>1 Level</option>
              <option value={2}>2 Levels</option>
              <option value={3}>3 Levels</option>
            </select>
          </div>
        )}

        {menuType === "CATEGORY" && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="showImages"
              name="showImages"
              checked={menu.showImages || false}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="showImages"
              className="ml-2 block text-sm text-gray-700"
            >
              Show Category Images
            </label>
          </div>
        )}

        {menuType === "PROMOTIONAL" && (
          <>
            <div>
              <label
                htmlFor="backgroundColor"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Background Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  id="backgroundColor"
                  name="backgroundColor"
                  value={menu.backgroundColor}
                  onChange={handleInputChange}
                  className="h-10 w-10 rounded border border-gray-300"
                />
                <input
                  title="background color"
                  type="text"
                  value={menu.backgroundColor}
                  onChange={handleInputChange}
                  name="backgroundColor"
                  className="ml-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="backgroundImage"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Background Image URL
              </label>
              <input
                type="url"
                id="backgroundImage"
                name="backgroundImage"
                value={menu.backgroundImage || ""}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter background image URL"
              />
            </div>
          </>
        )}

        {menuType === "SECTION" && (
          <div>
            <label
              htmlFor="sectionTitle"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Section Title
            </label>
            <input
              type="text"
              id="sectionTitle"
              name="sectionTitle"
              value={menu.sectionTitle || ""}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter section title"
            />
          </div>
        )}

        {/* Common Properties Continued */}
        <div>
          <label
            htmlFor="collections"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Collections
          </label>
          <select
            id="collections"
            name="collections"
            multiple
            value={menu.collections}
            onChange={handleCollectionChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            size={5}
          >
            {collections.map((collection) => (
              <option key={collection._id} value={collection._id}>
                {collection.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Hold Ctrl/Cmd to select multiple collections
          </p>
        </div>

        <div>
          <label
            htmlFor="ctaText"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            CTA Text
          </label>
          <input
            type="text"
            id="ctaText"
            name="ctaText"
            value={menu.ctaText || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter call-to-action text"
          />
        </div>

        <div>
          <label
            htmlFor="ctaUrl"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            CTA URL
          </label>
          <input
            type="url"
            id="ctaUrl"
            name="ctaUrl"
            value={menu.ctaUrl || ""}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter call-to-action URL"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
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
