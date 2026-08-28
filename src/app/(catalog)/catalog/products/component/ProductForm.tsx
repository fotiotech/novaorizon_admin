"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";
import { addProduct, clearProduct } from "@/app/store/slices/productSlice";
import { getCategoryAttributeSets } from "@/app/actions/category";
import { getUnits } from "@/app/actions/unit";
import {
  updateProduct,
  createProduct,
  createOrUpdateProduct,
} from "@/app/actions/products";
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
import { isValidBarcode } from "@/app/lib/barcode"; // 👈 new import

// ------------------------------------------------------------------
// Types (unchanged)
// ------------------------------------------------------------------
export type AttributeDetail = {
  id: string;
  code: string;
  name: string;
  options?: string[];
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
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  attributes: AttributeDetail[];
  children: GroupNode[];
};

type AttributeSetStep = {
  id: string;
  title: string;
  code: string;
  groups: GroupNode[];
};

// ------------------------------------------------------------------
// Component
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

  // Helper: check if a value is "empty"
  const isEmptyValue = (value: any): boolean => {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  };

  // ----- GROUP‑SPECIFIC VALIDATION -----
  const validateGroup = (
    group: GroupNode,
    _skipOwnAttributes = false,
  ): string[] => {
    const errors: string[] = [];

    // Only validate the "product_code" group
    if (group.code !== "product_code") {
      return errors; // all other groups are skipped
    }

    // Find the relevant attributes
    const typeAttr = group.attributes.find((a) => a.code === "code_type");
    const valueAttr = group.attributes.find((a) => a.code === "code_value");

    if (!typeAttr || !valueAttr) return errors;

    const codeType = product["code_type"];
    const codeValue = product["code_value"];

    // If code_type is empty, we optionally require it
    if (isEmptyValue(codeType)) {
      if (typeAttr.isRequired) {
        errors.push(`${typeAttr.name} is required`);
      }
      return errors;
    }

    // Now code_type is selected; validate code_value
    if (isEmptyValue(codeValue)) {
      if (valueAttr.isRequired) {
        errors.push(`${valueAttr.name} is required`);
      }
      return errors;
    }

    // Validate barcode format using the selected type
    const valid = isValidBarcode(codeValue, codeType);
    if (!valid) {
      errors.push(
        `${valueAttr.name} is not a valid ${codeType} barcode. Please check the format and checksum.`,
      );
    }

    return errors;
  };

  const validateAllSteps = (): boolean => {
    const allErrors: { [key: string]: string[] } = {};
    let hasErrors = false;
    steps.forEach((step) => {
      step.groups.forEach((group) => {
        const errors = validateGroup(group, false);
        if (errors.length > 0) {
          allErrors[group.id] = errors;
          hasErrors = true;
        }
      });
    });
    setValidationErrors(allErrors);
    return !hasErrors;
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep >= steps.length) return true;
    const currentStepData = steps[currentStep];
    const newErrors = { ...validationErrors };
    let hasErrors = false;

    currentStepData.groups.forEach((group) => {
      const errors = validateGroup(group, false);
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

  // ----- Fetch attribute sets and units -----
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

  // ----- Navigation and change handlers -----
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

    // Clear validation errors for the affected group
    const currentStepData = steps[currentStep];
    if (currentStepData) {
      const group = currentStepData.groups.find((g) =>
        g.attributes.some((a) => a.code === field),
      );
      if (group && validationErrors[group.id]) {
        // Clear this group's errors; will revalidate on next step change
        const newErrors = { ...validationErrors };
        delete newErrors[group.id];
        setValidationErrors(newErrors);
      }
    }
  };

  // ----- Submit handler -----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== steps.length - 1) {
      handleNext();
      return;
    }

    setIsSubmitting(true);

    if (!validateAllSteps()) {
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

      const res = await createOrUpdateProduct({ _id: productId, ...product });

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

  // ----- Memoized variant fields -----
  const allVariantFields = useMemo(() => {
    for (const step of steps) {
      const group = step.groups.find((g) => g.code === "variant_fields");
      if (group) return group.attributes || [];
    }
    return [];
  }, [steps]);

  // ----- Render group helper -----
  function renderGroup(group: GroupNode, isChild = false) {
    const { id, code, name, attributes, children } = group;
    const groupErrors = validationErrors[id] || [];

    const isSpecialGroup =
      code === "variant_themes" ||
      code === "product_relationships" ||
      code === "variant_fields" ||
      code === "variants";

    if (isSpecialGroup) {
      if (code === "variant_themes") {
        return (
          <section key={id} className="mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground pb-2">
              {name}
            </h2>
            <VariantsManager
              productId={productId}
              product={product}
              attributes={attributes}
              variantFields={allVariantFields}
            />
            {children?.length > 0 &&
              children.map((child) => renderGroup(child, true))}
          </section>
        );
      }
      if (code === "product_relationships") {
        return (
          <section key={id} className="mb-2">
            <h2 className="text-sm font-semibold text-muted-foreground pb-2">
              {name}
            </h2>
            <ManageRelatedProduct
              id={productId}
              product={product}
              attribute={attributes}
            />
            {children?.length > 0 &&
              children.map((child) => renderGroup(child, true))}
          </section>
        );
      }
      if (code === "variants" || code === "variant_fields") {
        return null;
      }
    }

    return (
      <section key={id} className="mb-2">
        <h2 className="text-sm font-semibold text-muted-foreground pb-2">
          {name}
        </h2>
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

  // ----- Early exits -----
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

  if (!product.category_id) {
    return (
      <div className="flex flex-col max-w-3xl bg-card text-card-foreground mx-auto p-4 rounded-lg">
        <Alert severity="warning">
          Please select a category first to load product attributes.
        </Alert>
      </div>
    );
  }

  // ----- Main render -----
  return (
    <>
      <form className="flex flex-col max-w-4xl bg-card text-card-foreground mx-auto p-4 rounded-lg shadow-md">
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
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded transition mr-4"
            >
              Cancel
            </button>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded transition"
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
                className="px-6 py-2 bg-primary hover:bg-primary-600 text-white rounded transition"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || redirecting || isSubmitting}
                className="px-6 py-2 bg-primary hover:bg-primary-600 text-white rounded transition disabled:bg-muted disabled:text-muted-foreground"
              >
                {isLoading || isSubmitting ? "Saving..." : "Save Product"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </div>
      </form>

      <Snackbar
        open={showValidationAlert}
        autoHideDuration={6000}
        onClose={() => setShowValidationAlert(false)}
        message="Please fix the validation errors before proceeding"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default ProductForm;
