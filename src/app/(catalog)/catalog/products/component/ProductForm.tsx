"use client";

import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { addProduct, clearProduct } from "@/app/store/slices/productSlice";
import { getCategoryAttributeSets } from "@/app/actions/category";
import { getUnits } from "@/app/actions/unit";
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
import ManageRelatedProduct from "../../../../../components/products/ManageRelatedProduct";
import VariantsManager from "@/components/products/variants/VariantOption";

// ------------------------------------------------------------------
// Updated types to match the standardized camelCase structure
// ------------------------------------------------------------------
export type AttributeDetail = {
  id: string;
  code: string;
  name: string;
  options?: string[]; // was "option"
  type: string;
  isRequired?: boolean;
  unitFamily?: {
    id: string;
    name: string;
    baseUnit: string;
  } | null;
  sortOrder: number;
};

export type GroupNode = {
  id: string; // was "_id"
  code: string;
  name: string;
  parentId: string | null; // was "parent_id"
  sortOrder: number; // was "sort_order"
  attributes: AttributeDetail[];
  children: GroupNode[];
};

type AttributeSetStep = {
  id: string; // was "_id"
  title: string;
  code: string;
  groups: GroupNode[];
};

// ------------------------------------------------------------------
// ProductForm Component
// ------------------------------------------------------------------
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
  const [steps, setSteps] = useState<AttributeSetStep[]>([]);
  const [validationErrors, setValidationErrors] = useState<{
    [groupId: string]: string[];
  }>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [units, setUnits] = useState<any[]>([]);

  const clearStoreAndRedirect = async () => {
    try {
      setRedirecting(true);
      dispatch(clearProduct());
      router.push("/catalog/products");
    } catch (err) {
      console.error("Error during cleanup and redirect:", err);
      setError("Failed to redirect. Please try again.");
      setRedirecting(false);
    }
  };

  // Validate a group and its children.
  const validateGroup = (
    group: GroupNode,
    skipOwnAttributes = false,
  ): string[] => {
    const errors: string[] = [];
    if (!skipOwnAttributes) {
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
    }
    if (group.children && group.children.length > 0) {
      group.children.forEach((child) => {
        errors.push(...validateGroup(child, false));
      });
    }
    return errors;
  };

  // Validate all groups in all steps
  const validateAllSteps = (): boolean => {
    const allErrors: { [key: string]: string[] } = {};
    let hasErrors = false;
    steps.forEach((step) => {
      step.groups.forEach((group) => {
        const errors = validateGroup(group, true);
        if (errors.length > 0) {
          allErrors[group.id] = errors; // use group.id
          hasErrors = true;
        }
      });
    });
    setValidationErrors(allErrors);
    return !hasErrors;
  };

  // Validate only the current step's groups
  const validateCurrentStep = (): boolean => {
    if (currentStep >= steps.length) return true;
    const currentStepData = steps[currentStep];
    const newErrors = { ...validationErrors };
    let hasErrors = false;

    currentStepData.groups.forEach((group) => {
      const errors = validateGroup(group, true);
      if (errors.length > 0) {
        newErrors[group.id] = errors;
        hasErrors = true;
      } else {
        delete newErrors[group.id];
      }
    });

    setValidationErrors(newErrors);
    if (hasErrors) {
      setShowValidationAlert(true);
      return false;
    }
    return true;
  };

  // Fetch attribute sets when category changes
  useEffect(() => {
    const fetchAttributeSets = async () => {
      if (!product.category_id) {
        setSteps([]);
        return;
      }
      try {
        setIsFetchingAttributes(true);
        setError(null);
        const sets = await getCategoryAttributeSets(product.category_id);
        console.log(
          "ProductForm – Received sets:",
          JSON.stringify(sets, null, 2),
        );
        setSteps(sets);
        setCurrentStep(0);
        setValidationErrors({});
      } catch (err) {
        console.error("Error fetching attribute sets:", err);
        setError("Failed to load product attributes. Please try again.");
      } finally {
        setIsFetchingAttributes(false);
      }
    };
    fetchAttributeSets();
  }, [product.category_id]);

  // Fetch units once
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const allUnits = await getUnits();
        setUnits(allUnits);
      } catch (err) {
        console.error("Failed to fetch units", err);
      }
    };
    fetchUnits();
  }, []);

  const handleNext = () => {
    if (validateCurrentStep() && currentStep < steps.length - 1) {
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
      }),
    );

    // Clear validation error for this field if it exists
    const currentStepData = steps[currentStep];
    if (currentStepData) {
      const group = currentStepData.groups.find((g) =>
        g.attributes.some((a) => a.code === field),
      );
      if (group && validationErrors[group.id]) {
        const attr = group.attributes.find((a) => a.code === field);
        if (attr && attr.isRequired) {
          const newErrors = { ...validationErrors };
          const groupErrors = newErrors[group.id].filter(
            (error) => !error.startsWith(attr.name),
          );
          if (groupErrors.length === 0) {
            delete newErrors[group.id];
          } else {
            newErrors[group.id] = groupErrors;
          }
          setValidationErrors(newErrors);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== steps.length - 1) {
      handleNext();
      return;
    }

    setIsSubmitting(true);

    if (!validateAllSteps()) {
      // Find first step with errors
      let firstErrorStep = 0;
      for (let i = 0; i < steps.length; i++) {
        const hasError = steps[i].groups.some(
          (g) => validationErrors[g.id] && validationErrors[g.id].length > 0,
        );
        if (hasError) {
          firstErrorStep = i;
          break;
        }
      }
      setCurrentStep(firstErrorStep);
      setShowValidationAlert(true);
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
            : "Product updated successfully!",
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

  // Render a group (recursive)
  function renderGroup(group: GroupNode, isChild = false) {
    const { id, code, name, attributes, children } = group;
    const groupErrors = validationErrors[id] || [];

    const isSpecialGroup =
      code === "variants_options" || code === "product_relationships";

    if (isSpecialGroup) {
      return (
        <section key={id} className="mb-2">
          <h2 className="text-sm font-semibold text-gray-600 pb-2">{name}</h2>
          {code === "variants_options" && (
            <VariantsManager
              productId={productId}
              product={product}
              attributes={attributes}
            />
          )}
          {code === "product_relationships" && (
            <ManageRelatedProduct
              id={productId}
              product={product}
              attribute={attributes}
            />
          )}
          {children?.length > 0 &&
            children.map((child) => renderGroup(child, true))}
        </section>
      );
    }

    return (
      <section key={id} className="mb-2">
        <h2 className="text-sm font-semibold text-gray-600 pb-2">{name}</h2>
        <div className="flex flex-col gap-4">
          {attributes.map((a) => (
            <div key={a.id}>
              <AttributeField
                productId={productId}
                attribute={a}
                field={product[a.code]}
                handleAttributeChange={handleChange}
                units={units}
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
          ) : steps.length > 0 ? (
            <>
              <Stepper
                activeStep={currentStep}
                className="whitespace-nowrap mb-6 w-full overflow-auto"
              >
                {steps.map((step, index) => {
                  const hasError = step.groups.some(
                    (g) =>
                      validationErrors[g.id] &&
                      validationErrors[g.id].length > 0,
                  );
                  return (
                    <Step key={step.id} className="inline-block">
                      <StepLabel error={hasError}>{step.title}</StepLabel>
                    </Step>
                  );
                })}
              </Stepper>

              <div>
                {steps[currentStep].groups.map((group) =>
                  renderGroup(group, false),
                )}
              </div>
            </>
          ) : (
            <Alert severity="info">
              No attribute sets mapped to this category.
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
            {currentStep < steps.length - 1 ? (
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
          Step {currentStep + 1} of {steps.length}
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
