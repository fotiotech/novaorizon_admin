"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { persistor, RootState } from "@/app/store/store";
import { addProduct, clearProduct } from "@/app/store/slices/productSlice";
import { find_category_attribute_groups } from "@/app/actions/category";
import { updateProduct, createProduct } from "@/app/actions/products";
import { useRouter } from "next/navigation";
import {
  Box,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import CollabsibleSection from "@/components/products/CollabsibleSection";
import { AttributeField } from "@/components/products/AttributeFields";
import ManageRelatedProduct from "../../../../components/products/ManageRelatedProduct";
import VariantsManager from "@/components/products/variants/VariantOption";

export type AttributeDetail = {
  _id: string;
  code: string;
  name: string;
  option?: string[];
  type: string;
};

export type GroupNode = {
  _id: string;
  code: string;
  name: string;
  parent_id: string;
  attributes: AttributeDetail[];
  children: GroupNode[];
  group_order: number;
};

const ProductForm = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const productState = useAppSelector((state: RootState) => state.product);
  const productId = productState.allIds[0];
  const product = productState.byId[productId] || {};
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAttributes, setIsFetchingAttributes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [topLevelGroups, setTopLevelGroups] = useState<GroupNode[]>([]);

  const clearStoreAndRedirect = async () => {
    try {
      setRedirecting(true);
      dispatch(clearProduct());
      router.push("/products");
    } catch (err) {
      console.error("Error during cleanup and redirect:", err);
      setError("Failed to redirect. Please try again.");
      setRedirecting(false);
    }
  };

  // In your ProductForm component
  useEffect(() => {
    const fetchAttributes = async () => {
      if (!product.category_id) {
        setTopLevelGroups([]);
        return;
      }

      try {
        setIsFetchingAttributes(true);
        setError(null);
        const resp = await find_category_attribute_groups(product.category_id);
        const allGroups = resp as unknown as GroupNode[];

        // Additional filtering to ensure only groups with attributes are shown
        const groupsWithAttributes = allGroups.filter(
          (group) => group.attributes && group.attributes.length > 0
        );

        // Filter top-level groups (no parent_id)
        const topGroups = groupsWithAttributes.filter(
          (group) => !group.parent_id
        );
        console.log("All groups:", allGroups);
        console.log("Groups with attributes:", groupsWithAttributes);
        console.log("Top groups:", topGroups);
        setTopLevelGroups(topGroups);
      } catch (err) {
        console.error("Error fetching attributes:", err);
        setError("Failed to load product attributes. Please try again.");
      } finally {
        setIsFetchingAttributes(false);
      }
    };

    fetchAttributes();
  }, [product.category_id]);

  const handleNext = () => {
    if (currentStep < topLevelGroups.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleChange = (field: string, value: any) => {
    dispatch(
      addProduct({
        _id: productId,
        field,
        value,
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if we have a valid product ID (not a temporary UUID)
    const isNewProduct = !productId || productId.startsWith("temp-");

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      let res;
      if (!isNewProduct) {
        res = await updateProduct(productId, product);
      } else {
        res = await createProduct({
          category_id: product.category_id,
          ...product,
        } as any);
      }

      if (res.success) {
        setSuccess(
          isNewProduct
            ? "Product created successfully!"
            : "Product updated successfully!"
        );
        // Small delay to show success message before redirect
        setTimeout(() => {
          clearStoreAndRedirect();
        }, 1000);
      } else {
        setError(res.error || "Failed to submit product.");
      }
    } catch (error) {
      console.error("Error submitting product:", error);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || redirecting) {
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

  function renderGroup(group: GroupNode, isChild = false) {
    const { _id, code, name, attributes, children } = group;

    const renderGroupContent = () => {
      switch (code) {
        case "variants_options":
          return (
            <VariantsManager
              productId={productId}
              product={product}
              attributes={attributes}
            />
          );

        case "product_relationships":
          return (
            <ManageRelatedProduct
              id={productId}
              product={product}
              attribute={attributes}
            />
          );

        default:
          return (
            <>
              {attributes.map((a) => (
                <div key={a?._id} className="">
                  <AttributeField
                    productId={productId}
                    attribute={a}
                    field={product[a?.code]}
                    handleAttributeChange={handleChange}
                  />
                </div>
              ))}
            </>
          );
      }
    };

    return (
      <section key={_id} className="mb-2">
        <h2 className="text-sm font-semibold text-gray-600 pb-2">{name}</h2>
        <div className="flex flex-col gap-4">
          {renderGroupContent()}
          {children?.length > 0 &&
            children.map((child) => renderGroup(child, true))}
        </div>
      </section>
    );
  }

  if (!product.category_id) {
    return (
      <div className="flex flex-col max-w-3xl bg-white mx-auto p-4 rounded-lg">
        <Alert severity="warning">
          Please select a category first to load product attributes.
        </Alert>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col max-w-4xl bg-white mx-auto p-4 rounded-lg"
    >
      <div className="flex-1">
        {error && !success && <Alert severity="error">{error}</Alert>}
        {success && !error && <Alert severity="success">{success}</Alert>}

        {isFetchingAttributes ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="200px"
          >
            <CircularProgress />
          </Box>
        ) : topLevelGroups.length > 0 ? (
          <>
            {/* Stepper */}
            <Stepper
              activeStep={currentStep}
              className="mb-6 w-full overflow-auto"
            >
              {topLevelGroups.map((group, index) => (
                <Step key={group._id}>
                  <StepLabel>{group.name}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Render only current step's group */}
            {renderGroup(topLevelGroups[currentStep])}
          </>
        ) : (
          <Alert severity="info">
            No attribute groups found for this category.
          </Alert>
        )}
      </div>
      <button type="submit" style={{ display: "none" }} aria-hidden="true" />
      {/* Step Navigation */}
      <div className="flex justify-between mt-6 items-center">
        <div>
          <button
            type="button"
            onClick={clearStoreAndRedirect}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition mr-4"
          >
            Cancel
          </button>
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition"
            >
              Previous
            </button>
          )}
        </div>

        <div>
          {currentStep < topLevelGroups.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || redirecting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:bg-gray-400"
            >
              {isLoading ? "Saving..." : "Save Product"}
            </button>
          )}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Step {currentStep + 1} of {topLevelGroups.length}
      </div>
    </form>
  );
};

export default ProductForm;
