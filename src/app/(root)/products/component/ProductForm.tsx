"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
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
  Snackbar,
} from "@mui/material";
import { AttributeField } from "@/components/products/AttributeFields";
import ManageRelatedProduct from "../../../../components/products/ManageRelatedProduct";
import VariantsManager from "@/components/products/variants/VariantOption";

export type AttributeDetail = {
  _id: string;
  code: string;
  name: string;
  option?: string[];
  type: string;
  isRequired?: boolean;
  unit?: string;
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
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string[];
  }>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const validateGroup = (group: GroupNode): string[] => {
    const errors: string[] = [];

    group.attributes.forEach((attr) => {
      if (attr.isRequired) {
        const value = product[attr.code];

        if (
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        ) {
          errors.push(`${attr.name} is required`);
        }
      }
    });

    if (group.children && group.children.length > 0) {
      group.children.forEach((child) => {
        errors.push(...validateGroup(child));
      });
    }

    return errors;
  };

  const validateAllGroups = (): boolean => {
    const allErrors: { [key: string]: string[] } = {};
    let hasErrors = false;

    topLevelGroups.forEach((group) => {
      const groupErrors = validateGroup(group);
      if (groupErrors.length > 0) {
        allErrors[group._id] = groupErrors;
        hasErrors = true;
      }
    });

    setValidationErrors(allErrors);
    return !hasErrors;
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep >= topLevelGroups.length) return true;

    const currentGroup = topLevelGroups[currentStep];
    const errors = validateGroup(currentGroup);

    if (errors.length > 0) {
      setValidationErrors({
        ...validationErrors,
        [currentGroup._id]: errors,
      });
      setShowValidationAlert(true);
      return false;
    }

    const newErrors = { ...validationErrors };
    delete newErrors[currentGroup._id];
    setValidationErrors(newErrors);

    return true;
  };

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

        const groupsWithAttributes = allGroups.filter(
          (group) => group.attributes && group.attributes.length > 0
        );

        const topGroups = groupsWithAttributes.filter(
          (group) => !group.parent_id
        );
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
    if (validateCurrentStep() && currentStep < topLevelGroups.length - 1) {
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

    const currentGroup = topLevelGroups[currentStep];
    if (currentGroup && validationErrors[currentGroup._id]) {
      const attr = currentGroup.attributes.find((a) => a.code === field);
      if (attr && attr.isRequired) {
        const newErrors = { ...validationErrors };
        const groupErrors = newErrors[currentGroup._id].filter(
          (error) => !error.startsWith(attr.name)
        );

        if (groupErrors.length === 0) {
          delete newErrors[currentGroup._id];
        } else {
          newErrors[currentGroup._id] = groupErrors;
        }

        setValidationErrors(newErrors);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== topLevelGroups.length - 1) {
      handleNext();
      return;
    }

    setIsSubmitting(true);

    if (!validateAllGroups()) {
      const firstErrorStep = topLevelGroups.findIndex(
        (group) =>
          validationErrors[group._id] && validationErrors[group._id].length > 0
      );

      if (firstErrorStep !== -1) {
        setCurrentStep(firstErrorStep);
        setShowValidationAlert(true);
      }

      setIsSubmitting(false);
      return;
    }

    const isNewProduct = !productId || productId.startsWith("temp-");

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      let res;
      if (!isNewProduct) {
        res = await updateProduct(productId, product);
      } else {
        res = await createProduct(product as any);
      }

      if (res.success) {
        setSuccess(
          isNewProduct
            ? "Product created successfully!"
            : "Product updated successfully!"
        );
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
      setIsSubmitting(false);
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
    const groupErrors = validationErrors[_id] || [];

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
              {groupErrors.length > 0 && (
                <Alert severity="error" className="mt-4">
                  <ul className="list-disc pl-4">
                    {groupErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}
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
    <>
      <form className="flex flex-col max-w-4xl bg-white mx-auto p-4 rounded-lg">
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
              <Stepper
                activeStep={currentStep}
                className="mb-6 w-full overflow-auto"
              >
                {topLevelGroups.map((group, index) => (
                  <Step key={group._id}>
                    <StepLabel
                      error={
                        validationErrors[group._id] &&
                        validationErrors[group._id].length > 0
                      }
                    >
                      {group.name}
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>

              {renderGroup(topLevelGroups[currentStep])}
            </>
          ) : (
            <Alert severity="info">
              No attribute groups found for this category.
            </Alert>
          )}
        </div>

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
                disabled={isLoading || redirecting || isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:bg-gray-400"
              >
                {isLoading || isSubmitting ? "Saving..." : "Save Product"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Step {currentStep + 1} of {topLevelGroups.length}
        </div>
      </form>

      <Snackbar
        open={showValidationAlert}
        autoHideDuration={6000}
        onClose={() => setShowValidationAlert(false)}
        message="Please fill in all required fields before proceeding"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default ProductForm;
