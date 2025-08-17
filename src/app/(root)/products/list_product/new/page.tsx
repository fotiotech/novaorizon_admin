"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { persistor, RootState } from "@/app/store/store";
import { addProduct, clearProduct } from "@/app/store/slices/productSlice";
import { getBrands } from "@/app/actions/brand";
import { Brand } from "@/constant/types";
import { getAttributesByCategoryAndGroupName } from "@/app/actions/category";
import { updateProduct, createProduct } from "@/app/actions/products";
import router from "next/router";
import { v4 as uuidv4, validate, version } from "uuid";
import { Box, CircularProgress } from "@mui/material";
import MainImageUploader from "@/components/products/MainImageUploader";
import GalleryUploader from "@/components/products/GalleryUploader";
import Select from "react-select";
import AttributeField from "@/components/products/AttributeFields";
import AttributeFieldsContainer from "@/components/products/AttributeFields";
import CollabsibleSection from "@/components/products/CollabsibleSection";
import { redirect } from "next/navigation";
import VariantsManager from "@/components/products/VariantOption";
import ManageRelatedProduct from "@/components/products/ManageRelatedProduct";

type AttributeDetail = {
  _id: string;
  name: string;
  option?: string[];
  type: string;
};

type GroupNode = {
  _id: string;
  name: string;
  parent_id: string;
  group_order: number;
  subgroups: GroupNode[];
  attributes: AttributeDetail[];
};

const ProductForm = () => {
  const dispatch = useAppDispatch();
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];
  const product = productState.byId[productId] || {};

  // Purge Redux store and redirect back to product list
  const clearStoreAndRedirect = async () => {
    await persistor.purge();
    dispatch(clearProduct());
    router.push("/products/list_product");
  };

  // Local state for brands & loading spinner
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [groups, setGroups] = useState<GroupNode[]>([]);
  const [groupIdentAndBrand, setGroupIdentAndBrand] = useState<GroupNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch “Identification & Branding” attribute‐groups (if any)
  useEffect(() => {
    const fetchAttributes = async () => {
      setIsLoading(true);
      if (product.category_id) {
        const resp = await getAttributesByCategoryAndGroupName(
          product.category_id,
          "Identification & Branding"
        );
        console.log("Fetched groups:", resp);
        setGroupIdentAndBrand(resp as unknown as GroupNode[]);
      }
      setIsLoading(false);
    };
    fetchAttributes();
  }, [product.category_id]);

  useEffect(() => {
    const fetchAttributes = async () => {
      setIsLoading(true);
      if (product.category_id) {
        const resp = await getAttributesByCategoryAndGroupName(
          product.category_id,
          "Product Specifications"
        );
        console.log("Fetched groups:", resp);
        setGroups(resp as unknown as GroupNode[]);
      }
      setIsLoading(false);
    };
    fetchAttributes();
  }, [product.category_id]);

  // Fetch brand list on mount
  useEffect(() => {
    getBrands().then((res) => setBrands(res));
  }, []);

  // Generic handler for top‐level or nested simple fields
  const handleChange = (groupCode: string, field: string, value: any) => {
    dispatch(
      addProduct({
        _id: productId,
        path: `${groupCode}.${field}`,
        value,
      })
    );
  };

  // Handler for 2‐level nested objects (e.g. dimensions, shipping_dimensions)
  const handleDimensionChange = (
    group: string,
    field: string,
    subfield: string,
    value: any
  ) => {
    dispatch(
      addProduct({
        _id: productId,
        path: `${group}.${field}.${subfield}`,
        value,
      })
    );
  };

  // Submit handler: create vs. update
  const handleSubmit = async () => {
    const isLocalId = validate(productId) && version(productId) === 4;
    try {
      let res;
      if (!isLocalId) {
        res = await updateProduct(productId, { product });
      } else {
        res = await createProduct({
          category_id: product.category_id,
          product,
        } as any);
      }
      if (res) {
        alert(
          isLocalId
            ? "Product submitted successfully!"
            : "Product updated successfully!"
        );
        await clearStoreAndRedirect();
        redirect("/admin/products/products_list");
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      alert("Failed to submit the product. Please try again.");
    }
  };

  const codeTypeOptions = [
    { value: "SKU", label: "SKU" },
    { value: "UPC", label: "UPC" },
    { value: "ISBN", label: "ISBN" },
  ];

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="64px"
      >
        <CircularProgress />
      </Box>
    );
  }

  console.log("product", product);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      className="space-y-8 max-w-3xl mx-auto rounded-lg shadow"
    >
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Identification &amp; Branding
        </h2>

        <CollabsibleSection>
          {/* Product Code Type + Value */}
          <div className="flex gap-4 items-center">
            <Select
              options={codeTypeOptions}
              value={codeTypeOptions.find(
                (opt) =>
                  opt.value ===
                  (product.identification_branding?.product_code?.type || "")
              )}
              onChange={(opt) =>
                handleChange("identification_branding", "product_code", {
                  ...product.identification_branding?.product_code,
                  type: opt?.value,
                  value: product.identification_branding?.product_code?.value,
                })
              }
              styles={{
                control: (prov) => ({
                  ...prov,
                  backgroundColor: "transparent",
                }),
                menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
              }}
              className="flex-1"
              placeholder="Select code type"
            />
            <input
              title="Product Code"
              type="text"
              className="border p-2 rounded flex-1"
              placeholder="Enter code"
              value={product.identification_branding?.product_code?.value || ""}
              onChange={(e) =>
                handleChange("identification_branding", "product_code", {
                  ...product.identification_branding?.product_code,
                  type: product.identification_branding?.product_code?.type,
                  value: e.target.value,
                })
              }
            />
          </div>
          {/* Name */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Name</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Product Name"
              value={product.identification_branding?.name || ""}
              onChange={(e) =>
                handleChange("identification_branding", "name", e.target.value)
              }
            />
          </div>

          {/* Brand */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Brand</label>
            <Select
              value={
                selectedBrand ||
                (product.identification_branding?.brand
                  ? {
                      value: product.identification_branding.brand?._id,
                      label:
                        brands.find(
                          (b) => b._id === product.identification_branding.brand
                        )?.name || "",
                    }
                  : null)
              }
              options={brands.map((b) => ({ value: b._id, label: b.name }))}
              onChange={(opt) => {
                setSelectedBrand(opt);
                handleChange("identification_branding", "brand", opt?.value);
              }}
              styles={{
                control: (prov) => ({
                  ...prov,
                  backgroundColor: "transparent",
                }),
                menu: (prov) => ({ ...prov, backgroundColor: "#111a2A" }),
              }}
              placeholder="Select brand"
            />
          </div>

          {/* Manufacturer */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Manufacturer</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Manufacturer"
              value={product.identification_branding?.manufacturer || ""}
              onChange={(e) =>
                handleChange(
                  "identification_branding",
                  "manufacturer",
                  e.target.value
                )
              }
            />
          </div>
          <div className="flex gap-2">
            <AttributeFieldsContainer
              fetchedGroup={groupIdentAndBrand as any}
              product={product?.identification_branding?.attributes}
              path="identification_branding.attributes"
              handleAttributeChange={handleChange}
            />
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Product Specifications
        </h2>
        <CollabsibleSection>
          {/* Weight */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Weight</label>
            <input
              type="number"
              className="border p-2 rounded w-full"
              placeholder="Weight"
              value={product.product_specifications?.weight || ""}
              onChange={(e) =>
                handleChange(
                  "product_specifications",
                  "weight",
                  Number(e.target.value)
                )
              }
            />
          </div>

          {/* Dimensions */}
          <div className="space-y-2">
            <h3 className="font-medium">Dimensions</h3>
            <div className="flex gap-2">
              <input
                type="number"
                className="border p-2 rounded flex-1"
                placeholder="Length"
                value={product.product_specifications?.dimensions?.length || ""}
                onChange={(e) =>
                  handleDimensionChange(
                    "product_specifications",
                    "dimensions",
                    "length",
                    Number(e.target.value)
                  )
                }
              />
              <input
                type="number"
                className="border p-2 rounded flex-1"
                placeholder="Width"
                value={product.product_specifications?.dimensions?.width || ""}
                onChange={(e) =>
                  handleDimensionChange(
                    "product_specifications",
                    "dimensions",
                    "width",
                    Number(e.target.value)
                  )
                }
              />
              <input
                type="number"
                className="border p-2 rounded flex-1"
                placeholder="Height"
                value={product.product_specifications?.dimensions?.height || ""}
                onChange={(e) =>
                  handleDimensionChange(
                    "product_specifications",
                    "dimensions",
                    "height",
                    Number(e.target.value)
                  )
                }
              />
              <input
                type="text"
                className="border p-2 rounded flex-1"
                placeholder="Unit (e.g., cm)"
                value={product.product_specifications?.dimensions?.unit || ""}
                onChange={(e) =>
                  handleDimensionChange(
                    "product_specifications",
                    "dimensions",
                    "unit",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Color</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Color"
              value={product.product_specifications?.color || ""}
              onChange={(e) =>
                handleChange("product_specifications", "color", e.target.value)
              }
            />
          </div>

          {/* Technical Specs (one example entry) */}
          <div className="space-y-2">
            <h3 className="font-medium">Technical Specs (one entry)</h3>
            <div className="flex gap-2">
              <AttributeFieldsContainer
                fetchedGroup={groups as any}
                product={product?.product_specifications?.technical_specs}
                path="product_specifications.technical_specs"
                handleAttributeChange={handleChange}
              />
            </div>
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <h2 className="ext-lg font-semibold text-gray-300 pb-2">
          Media &amp; Visuals
        </h2>
        <CollabsibleSection>
          {/* Main Image */}
          <div className="space-y-2">
            <h3 className="font-medium">Main Image</h3>
            <MainImageUploader productId={productId} />
          </div>

          {/* Gallery */}
          <div className="space-y-2">
            <h3 className="font-medium">Gallery</h3>
            <GalleryUploader productId={productId} />
          </div>

          {/* Videos (comma-separated URLs) */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">
              Video URLs (comma‐separated)
            </label>
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              placeholder="https://... , https://..."
              value={(product.media_visuals?.videos || []).join(", ")}
              onChange={(e) => {
                const arr = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
                handleChange("media_visuals", "videos", arr);
              }}
            />
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Pricing &amp; Availability
        </h2>
        <CollabsibleSection>
          {/* Price */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Price</label>
            <input
              type="number"
              className="border p-2 rounded w-full"
              placeholder="Price"
              value={product.pricing_availability?.price || 0}
              onChange={(e) =>
                handleChange(
                  "pricing_availability",
                  "price",
                  Number(e.target.value)
                )
              }
            />
          </div>

          {/* Currency */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Currency</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="e.g. USD"
              value={product.pricing_availability?.currency || "USD"}
              onChange={(e) =>
                handleChange("pricing_availability", "currency", e.target.value)
              }
            />
          </div>

          {/* Cost */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Cost</label>
            <input
              type="number"
              className="border p-2 rounded w-full"
              placeholder="Cost"
              value={product.pricing_availability?.cost || 0}
              onChange={(e) =>
                handleChange(
                  "pricing_availability",
                  "cost",
                  Number(e.target.value)
                )
              }
            />
          </div>

          {/* MSRP */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">MSRP</label>
            <input
              type="number"
              className="border p-2 rounded w-full"
              placeholder="MSRP"
              value={product.pricing_availability?.msrp || 0}
              onChange={(e) =>
                handleChange(
                  "pricing_availability",
                  "msrp",
                  Number(e.target.value)
                )
              }
            />
          </div>

          {/* Stock Status */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Stock Status</label>
            <select
              title="stock status"
              className="border p-2 rounded w-full"
              value={product.pricing_availability?.stock_status || ""}
              onChange={(e) =>
                handleChange(
                  "pricing_availability",
                  "stock_status",
                  e.target.value
                )
              }
            >
              <option value="">Select status</option>
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="backorder">Backorder</option>
            </select>
          </div>

          {/* Backorder */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="backorder"
              checked={product.pricing_availability?.backorder || false}
              onChange={(e) =>
                handleChange(
                  "pricing_availability",
                  "backorder",
                  e.target.checked
                )
              }
            />
            <label htmlFor="backorder" className="font-medium">
              Allow Backorder
            </label>
          </div>

          {/* Quantity */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Quantity</label>
            <input
              type="number"
              className="border p-2 rounded w-full"
              placeholder="Quantity"
              value={product.pricing_availability?.quantity || 0}
              onChange={(e) =>
                handleChange(
                  "pricing_availability",
                  "quantity",
                  Number(e.target.value)
                )
              }
            />
          </div>
        </CollabsibleSection>
      </section>

      <VariantsManager productId={productId} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Key Features &amp; Bullets
        </h2>
        <CollabsibleSection>
          {/* Key Features (one per line) */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">
              Key Features (one per line)
            </label>
            <textarea
              className="border p-2 rounded w-full"
              rows={3}
              placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
              value={(product.key_features || []).join("\n")}
              onChange={(e) => {
                const arr = e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter((s) => s);
                dispatch(
                  addProduct({
                    _id: productId,
                    path: "key_features",
                    value: arr,
                  })
                );
              }}
            />
          </div>

          {/* Bullets (one per line) */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Bullets (one per line)</label>
            <textarea
              className="border p-2 rounded w-full"
              rows={3}
              placeholder="• Bullet 1&#10;• Bullet 2&#10;• Bullet 3"
              value={(product.bullets || []).join("\n")}
              onChange={(e) => {
                const arr = e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter((s) => s);
                dispatch(
                  addProduct({
                    _id: productId,
                    path: "bullets",
                    value: arr,
                  })
                );
              }}
            />
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Descriptions
        </h2>
        <CollabsibleSection>
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Short Description</label>
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              placeholder="Short description"
              value={product.descriptions?.short || ""}
              onChange={(e) =>
                handleChange("descriptions", "short", e.target.value)
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Long Description</label>
            <textarea
              className="border p-2 rounded w-full"
              rows={4}
              placeholder="Long description"
              value={product.descriptions?.long || ""}
              onChange={(e) =>
                handleChange("descriptions", "long", e.target.value)
              }
            />
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <ManageRelatedProduct product={product} id={productId} />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Materials &amp; Composition
        </h2>
        <CollabsibleSection>
          {/* Primary Material */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Primary Material</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Primary Material"
              value={product.materials_composition?.primary_material || ""}
              onChange={(e) =>
                handleChange(
                  "materials_composition",
                  "primary_material",
                  e.target.value
                )
              }
            />
          </div>

          {/* Secondary Material */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Secondary Material</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Secondary Material"
              value={product.materials_composition?.secondary_material || ""}
              onChange={(e) =>
                handleChange(
                  "materials_composition",
                  "secondary_material",
                  e.target.value
                )
              }
            />
          </div>

          {/* Composition Details */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Composition Details</label>
            <textarea
              className="border p-2 rounded w-full"
              rows={3}
              placeholder="Composition details"
              value={product.materials_composition?.composition_details || ""}
              onChange={(e) =>
                handleChange(
                  "materials_composition",
                  "composition_details",
                  e.target.value
                )
              }
            />
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Logistics &amp; Shipping
        </h2>
        <CollabsibleSection>
          {/* Shipping Weight */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Shipping Weight</label>
            <input
              type="number"
              className="border p-2 rounded w-full"
              placeholder="Shipping Weight"
              value={product.logistics_shipping?.shipping_weight || ""}
              onChange={(e) =>
                handleChange(
                  "logistics_shipping",
                  "shipping_weight",
                  Number(e.target.value)
                )
              }
            />
          </div>

          {/* Shipping Dimensions */}
          <div className="space-y-2">
            <h3 className="font-medium">Shipping Dimensions</h3>
            <div className="flex gap-2">
              <input
                type="number"
                className="border p-2 rounded flex-1"
                placeholder="Length"
                value={
                  product.logistics_shipping?.shipping_dimensions?.length || ""
                }
                onChange={(e) =>
                  handleDimensionChange(
                    "logistics_shipping",
                    "shipping_dimensions",
                    "length",
                    Number(e.target.value)
                  )
                }
              />
              <input
                type="number"
                className="border p-2 rounded flex-1"
                placeholder="Width"
                value={
                  product.logistics_shipping?.shipping_dimensions?.width || ""
                }
                onChange={(e) =>
                  handleDimensionChange(
                    "logistics_shipping",
                    "shipping_dimensions",
                    "width",
                    Number(e.target.value)
                  )
                }
              />
              <input
                type="number"
                className="border p-2 rounded flex-1"
                placeholder="Height"
                value={
                  product.logistics_shipping?.shipping_dimensions?.height || ""
                }
                onChange={(e) =>
                  handleDimensionChange(
                    "logistics_shipping",
                    "shipping_dimensions",
                    "height",
                    Number(e.target.value)
                  )
                }
              />
              <input
                type="text"
                className="border p-2 rounded flex-1"
                placeholder="Unit (e.g. cm)"
                value={
                  product.logistics_shipping?.shipping_dimensions?.unit || ""
                }
                onChange={(e) =>
                  handleDimensionChange(
                    "logistics_shipping",
                    "shipping_dimensions",
                    "unit",
                    e.target.value
                  )
                }
              />
            </div>
          </div>

          {/* Origin Country */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Origin Country</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Origin Country"
              value={product.logistics_shipping?.origin_country || ""}
              onChange={(e) =>
                handleChange(
                  "logistics_shipping",
                  "origin_country",
                  e.target.value
                )
              }
            />
          </div>

          {/* Shipping Class */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Shipping Class</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Shipping Class"
              value={product.logistics_shipping?.shipping_class || ""}
              onChange={(e) =>
                handleChange(
                  "logistics_shipping",
                  "shipping_class",
                  e.target.value
                )
              }
            />
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Warranty &amp; Returns
        </h2>
        <CollabsibleSection>
          {/* Warranty Period */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Warranty Period</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="e.g. 1 year"
              value={product.warranty_returns?.warranty_period || ""}
              onChange={(e) =>
                handleChange(
                  "warranty_returns",
                  "warranty_period",
                  e.target.value
                )
              }
            />
          </div>

          {/* Return Policy */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Return Policy</label>
            <textarea
              className="border p-2 rounded w-full"
              rows={3}
              placeholder="Return Policy Details"
              value={product.warranty_returns?.return_policy || ""}
              onChange={(e) =>
                handleChange(
                  "warranty_returns",
                  "return_policy",
                  e.target.value
                )
              }
            />
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          SEO &amp; Marketing Metadata
        </h2>
        <CollabsibleSection>
          {/* Meta Title */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Meta Title</label>
            <input
              type="text"
              className="border p-2 rounded w-full"
              placeholder="Meta Title"
              value={product.seo_marketing?.meta_title || ""}
              onChange={(e) =>
                handleChange("seo_marketing", "meta_title", e.target.value)
              }
            />
          </div>

          {/* Meta Description */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">Meta Description</label>
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              placeholder="Meta Description"
              value={product.seo_marketing?.meta_description || ""}
              onChange={(e) =>
                handleChange(
                  "seo_marketing",
                  "meta_description",
                  e.target.value
                )
              }
            />
          </div>

          {/* Meta Keywords (comma‐separated) */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">
              Meta Keywords (comma‐separated)
            </label>
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              placeholder="keyword1, keyword2, keyword3"
              value={(product.seo_marketing?.meta_keywords || []).join(", ")}
              onChange={(e) => {
                const arr = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
                handleChange("seo_marketing", "meta_keywords", arr);
              }}
            />
          </div>

          {/* Marketing Tags (comma‐separated) */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">
              Marketing Tags (comma‐separated)
            </label>
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              placeholder="tag1, tag2, tag3"
              value={(product.seo_marketing?.marketing_tags || []).join(", ")}
              onChange={(e) => {
                const arr = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
                handleChange("seo_marketing", "marketing_tags", arr);
              }}
            />
          </div>
        </CollabsibleSection>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-300 pb-2">
          Legal &amp; Compliance
        </h2>
        <CollabsibleSection>
          {/* Safety Certifications (comma‐separated) */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">
              Safety Certifications (comma‐separated)
            </label>
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              placeholder="Cert1, Cert2, Cert3"
              value={(
                product.legal_compliance?.safety_certifications || []
              ).join(", ")}
              onChange={(e) => {
                const arr = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
                handleChange("legal_compliance", "safety_certifications", arr);
              }}
            />
          </div>

          {/* Country Restrictions (comma‐separated) */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">
              Country Restrictions (comma‐separated)
            </label>
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              placeholder="Country1, Country2, Country3"
              value={(
                product.legal_compliance?.country_restrictions || []
              ).join(", ")}
              onChange={(e) => {
                const arr = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
                handleChange("legal_compliance", "country_restrictions", arr);
              }}
            />
          </div>

          {/* Compliance Documents (comma‐separated URLs or IDs) */}
          <div className="flex flex-col">
            <label className="mb-1 font-medium">
              Compliance Documents (comma‐separated URLs/IDs)
            </label>
            <textarea
              className="border p-2 rounded w-full"
              rows={2}
              placeholder="doc1_url, doc2_url"
              value={(
                product.legal_compliance?.compliance_documents || []
              ).join(", ")}
              onChange={(e) => {
                const arr = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter((s) => s);
                handleChange("legal_compliance", "compliance_documents", arr);
              }}
            />
          </div>
        </CollabsibleSection>
      </section>

      <div className="flex justify-between mt-6 items-center">
        <button
          type="button"
          onClick={clearStoreAndRedirect}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
        >
          Save Product
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
