"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
} from "react";
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
import {
  transformSnakeToCamel,
  transformCamelToSnake,
  flattenCategoryProperty,
  snakeToCamel,
} from "@/lib/categoryProperty";

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
// Helper: get all relevant keys for a group (including children)
// for custom memo comparison
// ------------------------------------------------------------------
function getGroupRelevantKeys(group: GroupNode): string[] {
  const keys: string[] = [];
  // Add own attribute codes (convert to camelCase for lookup)
  group.attributes.forEach((attr) => keys.push(snakeToCamel(attr.code)));
  // Recursively add children's attribute codes
  group.children.forEach((child) => {
    keys.push(...getGroupRelevantKeys(child));
  });
  // Special groups need additional top‑level product fields
  if (group.code === "variant_themes") {
    keys.push("variantThemes", "variantValues", "variants");
  }
  if (group.code === "product_relationships") {
    keys.push("relatedProducts");
  }
  return keys;
}

// ------------------------------------------------------------------
// Memoized GroupRenderer component with custom comparator
// ------------------------------------------------------------------
interface GroupRendererProps {
  group: GroupNode;
  productId: string;
  productData: Record<string, any>;
  validationErrors: { [key: string]: string[] };
  handleChange: (field: string, value: any) => void;
  units: any[];
  allVariantFields: AttributeDetail[];
}

const GroupRenderer = memo(
  ({
    group,
    productId,
    productData,
    validationErrors,
    handleChange,
    units,
    allVariantFields,
  }: GroupRendererProps) => {
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
              children.map((child) => (
                <GroupRenderer
                  key={child.id}
                  group={child}
                  productId={productId}
                  productData={productData}
                  validationErrors={validationErrors}
                  handleChange={handleChange}
                  units={units}
                  allVariantFields={allVariantFields}
                />
              ))}
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
              children.map((child) => (
                <GroupRenderer
                  key={child.id}
                  group={child}
                  productId={productId}
                  productData={productData}
                  validationErrors={validationErrors}
                  handleChange={handleChange}
                  units={units}
                  allVariantFields={allVariantFields}
                />
              ))}
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
                field={productData[snakeToCamel(a.code)]}
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
            children.map((child) => (
              <GroupRenderer
                key={child.id}
                group={child}
                productId={productId}
                productData={productData}
                validationErrors={validationErrors}
                handleChange={handleChange}
                units={units}
                allVariantFields={allVariantFields}
              />
            ))}
        </div>
      </section>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparator: only re‑render if relevant data changed
    // 1. Quick checks for stable props
    if (prevProps.productId !== nextProps.productId) return false;
    if (prevProps.units !== nextProps.units) return false;
    if (prevProps.allVariantFields !== nextProps.allVariantFields) return false;
    if (prevProps.handleChange !== nextProps.handleChange) return false;
    if (prevProps.group.id !== nextProps.group.id) return false;

    // 2. Compare relevant productData fields
    const relevantKeys = getGroupRelevantKeys(prevProps.group);
    for (const key of relevantKeys) {
      if (prevProps.productData[key] !== nextProps.productData[key]) {
        return false;
      }
    }

    // 3. Compare validation errors for this group
    const prevGroupErrors =
      prevProps.validationErrors[prevProps.group.id] || [];
    const nextGroupErrors =
      nextProps.validationErrors[nextProps.group.id] || [];
    if (prevGroupErrors.length !== nextGroupErrors.length) return false;
    if (prevGroupErrors.some((e, i) => e !== nextGroupErrors[i])) return false;

    // 4. If group is variant_themes, also compare variants validation errors
    if (prevProps.group.code === "variant_themes") {
      const prevVariantErrors = prevProps.validationErrors["variants"] || [];
      const nextVariantErrors = nextProps.validationErrors["variants"] || [];
      if (prevVariantErrors.length !== nextVariantErrors.length) return false;
      if (prevVariantErrors.some((e, i) => e !== nextVariantErrors[i]))
        return false;
    }

    // All checks passed → skip re‑render
    return true;
  },
);

GroupRenderer.displayName = "GroupRenderer";

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

  // Ref to track current step without causing re‑renders in callbacks
  const currentStepRef = useRef(currentStep);

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

        // 2. If categoryProperty exists in the data, flatten it and merge with product data
        if (
          data.categoryProperty &&
          typeof data.categoryProperty === "object"
        ) {
          const flattenedCategoryProperty = flattenCategoryProperty(
            data.categoryProperty,
          );
          data = { ...data, ...flattenedCategoryProperty };
          // Remove the nested structure after flattening
          delete (data as any).categoryProperty;
        }

        // 3. Transform any remaining snake_case fields to camelCase
        data = transformSnakeToCamel(data);

        // 4. Fetch draft (keyed by productId)
        const draft = await getProductDraft(productId);
        if (draft) {
          data = { ...data, ...draft };
          if (draft._id) {
            setProductId(draft._id);
          }
        }

        // 5. If still no categoryId and initialCategoryId is provided, set it
        if (!data.categoryId && initialCategoryId) {
          data.categoryId = initialCategoryId;
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
      if (!productData.categoryId) {
        setSteps([]);
        return;
      }
      try {
        setIsFetchingAttributes(true);
        setError(null);
        const sets = await getCategoryAttributeSets(productData.categoryId);
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
  }, [productData.categoryId]);

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

  // ============================================================
  // Compute visible steps based on hasVariants
  // ============================================================
  const visibleSteps = useMemo(() => {
    const variantStepIndex = steps.findIndex((step) =>
      step.groups.some(
        (g) => g.code === "variant_themes" || g.code === "variant_fields",
      ),
    );
    // If no variant step exists, or hasVariants is truthy, show all
    if (variantStepIndex === -1 || productData.hasVariants) {
      return steps;
    }
    // Otherwise, filter out the variant step
    return steps.filter((_, index) => index !== variantStepIndex);
  }, [steps, productData.hasVariants]);

  // Sync currentStep when visibleSteps changes
  useEffect(() => {
    if (currentStep >= visibleSteps.length) {
      setCurrentStep(Math.max(0, visibleSteps.length - 1));
    }
    // Update ref as well
    currentStepRef.current = Math.max(0, visibleSteps.length - 1);
  }, [visibleSteps, currentStep]);

  // Keep the ref in sync with currentStep state
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // ---------- Validation (unchanged) ----------
  const validateGroup = (group: GroupNode): string[] => {
    const errors: string[] = [];
    group.attributes.forEach((attr) => {
      if (!attr.isRequired) return;
      const camelCode = snakeToCamel(attr.code);
      const value = productData[camelCode];
      if (isEmptyValue(value)) {
        errors.push(`${attr.name} is required`);
      }
    });

    if (group.code === "product_code") {
      const typeAttr = group.attributes.find((a) => a.code === "code_type");
      const valueAttr = group.attributes.find((a) => a.code === "code_value");
      if (typeAttr && valueAttr) {
        const codeType = productData[snakeToCamel("code_type")];
        const codeValue = productData[snakeToCamel("code_value")];
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
    for (const step of visibleSteps) {
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
        const camelCode = snakeToCamel(field.code);
        const value = variant[camelCode];
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
    visibleSteps.forEach((step) => {
      step.groups.forEach((group) => {
        const errors = validateGroup(group);
        if (errors.length > 0) {
          allErrors[group.id] = errors;
          hasErrors = true;
        }
      });
    });
    const hasVariantStep = visibleSteps.some((step) =>
      step.groups.some(
        (g) => g.code === "variant_themes" || g.code === "variant_fields",
      ),
    );
    if (hasVariantStep) {
      const variantErrors = validateVariants();
      if (variantErrors.length > 0) {
        allErrors["variants"] = variantErrors;
        hasErrors = true;
      }
    }
    setValidationErrors(allErrors);
    return !hasErrors;
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep >= visibleSteps.length) return true;
    const currentStepData = visibleSteps[currentStep];
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
    if (validateCurrentStep() && currentStep < visibleSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ---------- Change handler (stabilized using ref for currentStep) ----------
  const handleChange = useCallback(
    (field: string, value: any) => {
      // Convert snake_case field names to camelCase for storage
      const camelField = snakeToCamel(field);

      setProductData((prev) => ({ ...prev, [camelField]: value }));

      // Use the ref to get the current step without re‑creating the callback
      const stepIndex = currentStepRef.current;
      const stepData = visibleSteps[stepIndex];
      if (stepData) {
        const group = stepData.groups.find((g) =>
          g.attributes.some((a) => snakeToCamel(a.code) === camelField),
        );
        if (group) {
          setValidationErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[group.id];
            return newErrors;
          });
        }
      }
      if (camelField === "variants") {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors["variants"];
          return newErrors;
        });
      }
    },
    [visibleSteps],
  );

  // ---------- Submit ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== visibleSteps.length - 1) {
      handleNext();
      return;
    }

    setIsSubmitting(true);

    if (!validateAllSteps()) {
      let firstErrorStep = 0;
      for (let i = 0; i < visibleSteps.length; i++) {
        const hasError = visibleSteps[i].groups.some(
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
      // Prepare payload with camelCase field names (Zod schema expects camelCase)
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
    for (const step of visibleSteps) {
      const group = step.groups.find((g) => g.code === "variant_fields");
      if (group) return group.attributes || [];
    }
    return [];
  }, [visibleSteps]);

  const currentStepGroups = useMemo(() => {
    if (visibleSteps.length === 0 || currentStep >= visibleSteps.length)
      return [];
    return visibleSteps[currentStep].groups;
  }, [visibleSteps, currentStep]);

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

  if (!productData.categoryId && !loading) {
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
    <div>
      <form className="flex flex-col max-w-4xl bg-card text-card-foreground p-2 lg:p-4 rounded-lg ">
        <div className="flex-1">
          {error && !success && <Alert severity="error">{error}</Alert>}
          {success && !error && <Alert severity="success">{success}</Alert>}
          {!error && !success && (
            <div className="text-xs text-gray-400 mb-2">
              💾 Draft auto-saved
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
          ) : visibleSteps.length > 0 ? (
            <>
              <Stepper
                activeStep={currentStep}
                className="whitespace-nowrap mb-6 w-full overflow-auto"
              >
                {visibleSteps.map((step, index) => {
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
                {currentStepGroups.map((group) => (
                  <GroupRenderer
                    key={group.id}
                    group={group}
                    productId={productId}
                    productData={productData}
                    validationErrors={validationErrors}
                    handleChange={handleChange}
                    units={units}
                    allVariantFields={allVariantFields}
                  />
                ))}
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
            {currentStep < visibleSteps.length - 1 ? (
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
          Step {currentStep + 1} of {visibleSteps.length}
        </div>
      </form>

      <Snackbar
        open={showValidationAlert}
        autoHideDuration={6000}
        onClose={() => setShowValidationAlert(false)}
        message="Please fix the validation errors before proceeding"
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </div>
  );
};

export default memo(ProductForm);
