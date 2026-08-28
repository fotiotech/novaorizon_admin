"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { getCategoryAttributeSets } from "@/app/actions/category";
import { getUnits } from "@/app/actions/unit";
import { createOrUpdateProduct, findProducts } from "@/app/actions/products";
import {
  saveProductDraft,
  getProductDraft,
  deleteProductDraft,
} from "@/app/actions/drafts";
import { AttributeField } from "@/app/(catalog)/catalog/products/component/AttributeFields";
import ManageRelatedProduct from "./ManageRelatedProduct";
import VariantsManager from "@/app/(catalog)/catalog/products/component/variants/VariantOption";
import { isValidBarcode } from "@/app/lib/barcode";

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
  unitFamily?: { id: string; name: string; baseUnit: string } | null;
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
// Helper: check if a value is "empty"
// ------------------------------------------------------------------
const isEmptyValue = (value: any): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    if ("value" in value) return isEmptyValue(value.value);
    return Object.keys(value).length === 0;
  }
  return false;
};

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
interface ProductFormProps {
  productId?: string; // if provided, editing an existing product
  initialCategoryId?: string; // for new products, the selected category ID
}

const ProductForm: React.FC<ProductFormProps> = ({
  productId: initialProductId,
  initialCategoryId,
}) => {
  const router = useRouter();
  const [productId, setProductId] = useState<string>(initialProductId || "new");
  const [productData, setProductData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [isFetchingAttributes, setIsFetchingAttributes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<AttributeSetStep[]>([]);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string[];
  }>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [units, setUnits] = useState<any[]>([]);

  // ---------- Draft (server) ----------
  useEffect(() => {
    if (Object.keys(productData).length === 0) return;
    const timer = setTimeout(async () => {
      try {
        await saveProductDraft(productId, productData);
      } catch (err) {
        // ignore – drafts are optional
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [productData, productId]);

  // ---------- Load product & draft ----------
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let data: Record<string, any> = {};

        // 1. If editing, fetch product
        if (initialProductId) {
          const result = await findProducts(initialProductId);
          if (result && !result.error) {
            data = result;
          } else {
            setError("Failed to load product");
          }
        }

        // 2. Fetch draft (keyed by productId)
        const draft = await getProductDraft(productId);
        if (draft) {
          data = { ...data, ...draft };
          if (draft._id) {
            setProductId(draft._id);
          }
        }

        // 3. If still no category_id and initialCategoryId is provided, set it
        if (!data.category_id && initialCategoryId) {
          data.category_id = initialCategoryId;
        }

        setProductData(data);
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initialProductId, productId, initialCategoryId]);

  // ---------- Fetch attribute sets and units ----------
  useEffect(() => {
    const fetchAttributeSets = async () => {
      if (!productData.category_id) {
        setSteps([]);
        return;
      }
      try {
        setIsFetchingAttributes(true);
        setError(null);
        const sets = await getCategoryAttributeSets(productData.category_id);
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
  }, [productData.category_id]);

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

  // ---------- Validation (unchanged) ----------
  const validateGroup = (group: GroupNode): string[] => {
    const errors: string[] = [];
    group.attributes.forEach((attr) => {
      if (!attr.isRequired) return;
      const value = productData[attr.code];
      if (isEmptyValue(value)) {
        errors.push(`${attr.name} is required`);
      }
    });

    if (group.code === "product_code") {
      const typeAttr = group.attributes.find((a) => a.code === "code_type");
      const valueAttr = group.attributes.find((a) => a.code === "code_value");
      if (typeAttr && valueAttr) {
        const codeType = productData["code_type"];
        const codeValue = productData["code_value"];
        if (!isEmptyValue(codeType) && !isEmptyValue(codeValue)) {
          const valid = isValidBarcode(codeValue, codeType);
          if (!valid) {
            errors.push(
              `${valueAttr.name} is not a valid ${codeType} barcode. Please check the format and checksum.`,
            );
          }
        }
      }
    }
    return errors;
  };

  const validateVariants = (): string[] => {
    const errors: string[] = [];
    const variants = productData.variants || [];
    if (variants.length === 0) return errors;

    let variantFields: AttributeDetail[] = [];
    for (const step of steps) {
      const group = step.groups.find((g) => g.code === "variant_fields");
      if (group) {
        variantFields = group.attributes || [];
        break;
      }
    }
    if (variantFields.length === 0) return errors;
    const requiredVariantFields = variantFields.filter((f) => f.isRequired);

    variants.forEach((variant: any, index: number) => {
      requiredVariantFields.forEach((field) => {
        const value = variant[field.code];
        if (isEmptyValue(value)) {
          errors.push(`Variant #${index + 1}: ${field.name} is required`);
        }
      });
    });
    return errors;
  };

  const validateAllSteps = (): boolean => {
    const allErrors: { [key: string]: string[] } = {};
    let hasErrors = false;
    steps.forEach((step) => {
      step.groups.forEach((group) => {
        const errors = validateGroup(group);
        if (errors.length > 0) {
          allErrors[group.id] = errors;
          hasErrors = true;
        }
      });
    });
    const variantErrors = validateVariants();
    if (variantErrors.length > 0) {
      allErrors["variants"] = variantErrors;
      hasErrors = true;
    }
    setValidationErrors(allErrors);
    return !hasErrors;
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep >= steps.length) return true;
    const currentStepData = steps[currentStep];
    const newErrors = { ...validationErrors };
    let hasErrors = false;

    currentStepData.groups.forEach((group) => {
      const errors = validateGroup(group);
      if (errors.length > 0) {
        newErrors[group.id] = errors;
        hasErrors = true;
      } else {
        delete newErrors[group.id];
      }
    });

    const hasVariantGroup = currentStepData.groups.some(
      (g) => g.code === "variant_themes",
    );
    if (hasVariantGroup) {
      const variantErrors = validateVariants();
      if (variantErrors.length > 0) {
        newErrors["variants"] = variantErrors;
        hasErrors = true;
      } else {
        delete newErrors["variants"];
      }
    }

    setValidationErrors(newErrors);
    if (hasErrors) {
      setShowValidationAlert(true);
      return false;
    }
    return true;
  };

  // ---------- Navigation ----------
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

  // ---------- Change handler ----------
  const handleChange = useCallback(
    (field: string, value: any) => {
      setProductData((prev) => ({ ...prev, [field]: value }));

      const currentStepData = steps[currentStep];
      if (currentStepData) {
        const group = currentStepData.groups.find((g) =>
          g.attributes.some((a) => a.code === field),
        );
        if (group) {
          setValidationErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[group.id];
            return newErrors;
          });
        }
      }
      if (field === "variants") {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors["variants"];
          return newErrors;
        });
      }
    },
    [steps, currentStep],
  );

  // ---------- Submit ----------
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

    try {
      setError(null);
      setSuccess(null);
      const payload = {
        _id: productId === "new" ? undefined : productId,
        ...productData,
      };
      const res = await createOrUpdateProduct(payload);

      if (res.success) {
        setSuccess("Product saved successfully!");
        await deleteProductDraft(productId);
        setTimeout(() => {
          router.push("/catalog/products");
        }, 1500);
      } else {
        setError(res.error || "Failed to save product.");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------- Cancel ----------
  const handleCancel = async () => {
    if (confirm("You have unsaved changes. Discard draft?")) {
      await deleteProductDraft(productId);
      router.push("/catalog/products");
    }
  };

  // ---------- Memoized values ----------
  const allVariantFields = useMemo(() => {
    for (const step of steps) {
      const group = step.groups.find((g) => g.code === "variant_fields");
      if (group) return group.attributes || [];
    }
    return [];
  }, [steps]);

  const currentStepGroups = useMemo(() => {
    if (steps.length === 0 || currentStep >= steps.length) return [];
    return steps[currentStep].groups;
  }, [steps, currentStep]);

  // ---------- Render group ----------
  const renderGroup = useCallback(
    (group: GroupNode, isChild = false) => {
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
                product={productData}
                attributes={attributes}
                variantFields={allVariantFields}
                onUpdate={handleChange}
              />
              {validationErrors["variants"] && (
                <Alert severity="error" className="mt-4">
                  <ul className="list-disc pl-4">
                    {validationErrors["variants"].map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </Alert>
              )}
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
                product={productData}
                attribute={attributes}
                onUpdate={handleChange}
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
                  field={productData[a.code]}
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
    },
    [
      productData,
      validationErrors,
      handleChange,
      units,
      allVariantFields,
      productId,
    ],
  );

  // ---------- Early exits ----------
  if (loading || redirecting) {
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

  if (!productData.category_id && !loading) {
    return (
      <div className="flex flex-col max-w-3xl bg-card text-card-foreground mx-auto p-4 rounded-lg">
        <Alert severity="warning">
          Please select a category first to load product attributes.
        </Alert>
      </div>
    );
  }

  // ---------- Main render ----------
  return (
    <>
      <form className="flex flex-col max-w-4xl bg-card text-card-foreground mx-auto p-4 rounded-lg shadow-md">
        <div className="flex-1">
          {error && !success && <Alert severity="error">{error}</Alert>}
          {success && !error && <Alert severity="success">{success}</Alert>}
          {!error && !success && (
            <div className="text-xs text-gray-400 mb-2">
              💾 Draft auto-saved to server
            </div>
          )}

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
                {currentStepGroups.map((group) => renderGroup(group, false))}
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
              onClick={handleCancel}
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
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary hover:bg-primary-600 text-white rounded transition disabled:bg-muted disabled:text-muted-foreground"
              >
                {isSubmitting ? "Saving..." : "Save Product"}
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
