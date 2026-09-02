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
// Helpers (unchanged)
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

const normalizeCode = (code?: string): string => {
  if (!code) return "";
  return code.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
};

const toScalarId = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return toScalarId(value[0]) || null;
  if (typeof value === "object") {
    if (
      value instanceof Date === false &&
      (typeof value.toHexString === "function" ||
        value._bsontype === "ObjectId" ||
        value.constructor?.name === "ObjectId")
    ) {
      return value.toString();
    }

    const nested =
      value._id ?? value.id ?? value.value ?? value.categoryId ?? value.brand;
    if (nested !== undefined && nested !== null && nested !== value) {
      const scalar = toScalarId(nested);
      if (scalar) return scalar;
    }

    const candidate =
      Object.prototype.toString.call(value) === "[object Object]"
        ? ""
        : String(value);
    return candidate && candidate !== "[object Object]" ? candidate : null;
  }
  return null;
};

// ------------------------------------------------------------------
// getGroupRelevantKeys (unchanged)
// ------------------------------------------------------------------
function getGroupRelevantKeys(group: GroupNode): string[] {
  const keys: string[] = [];
  group.attributes.forEach((attr) => keys.push(normalizeCode(attr.code)));
  group.children.forEach((child) => {
    keys.push(...getGroupRelevantKeys(child));
  });
  if (normalizeCode(group.code) === "variantThemes") {
    keys.push("variantThemes", "variantValues", "variants");
  }
  if (normalizeCode(group.code) === "productRelationships") {
    keys.push("relatedProducts");
  }
  return keys;
}

// ------------------------------------------------------------------
// Memoized GroupRenderer (unchanged)
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
    const normalizedCode = normalizeCode(code);

    const isSpecialGroup =
      normalizedCode === "variantThemes" ||
      normalizedCode === "productRelationships" ||
      normalizedCode === "variants" ||
      normalizedCode === "variantFields";

    if (isSpecialGroup) {
      if (normalizedCode === "variantThemes") {
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
      if (normalizedCode === "productRelationships") {
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
      if (normalizedCode === "variants" || normalizedCode === "variantFields") {
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
                field={productData[normalizeCode(a.code)]}
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
    if (prevProps.productId !== nextProps.productId) return false;
    if (prevProps.units !== nextProps.units) return false;
    if (prevProps.allVariantFields !== nextProps.allVariantFields) return false;
    if (prevProps.handleChange !== nextProps.handleChange) return false;
    if (prevProps.group.id !== nextProps.group.id) return false;

    const relevantKeys = getGroupRelevantKeys(prevProps.group);
    for (const key of relevantKeys) {
      if (prevProps.productData[key] !== nextProps.productData[key]) {
        return false;
      }
    }

    const prevGroupErrors =
      prevProps.validationErrors[prevProps.group.id] || [];
    const nextGroupErrors =
      nextProps.validationErrors[nextProps.group.id] || [];
    if (prevGroupErrors.length !== nextGroupErrors.length) return false;
    if (prevGroupErrors.some((e, i) => e !== nextGroupErrors[i])) return false;

    if (normalizeCode(prevProps.group.code) === "variantThemes") {
      const prevVariantErrors = prevProps.validationErrors["variants"] || [];
      const nextVariantErrors = nextProps.validationErrors["variants"] || [];
      if (prevVariantErrors.length !== nextVariantErrors.length) return false;
      if (prevVariantErrors.some((e, i) => e !== nextVariantErrors[i]))
        return false;
    }
    return true;
  },
);

GroupRenderer.displayName = "GroupRenderer";

// ------------------------------------------------------------------
// Main Component
// ------------------------------------------------------------------
interface ProductFormProps {
  productId?: string;
  initialCategoryId?: string;
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

  const currentStepRef = useRef(currentStep);

  // Draft auto-save
  useEffect(() => {
    if (Object.keys(productData).length === 0) return;
    const timer = setTimeout(async () => {
      try {
        await saveProductDraft(productId, productData);
      } catch (err) {
        // ignore
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

        if (initialProductId) {
          const result = await findProducts(initialProductId);
          console.log("[ProductForm] Raw product data:", result);
          if (result && !result.error) {
            data = result;
          } else {
            setError("Failed to load product");
          }
        }

        // Safely map productCode to type/value
        if (data.productCode) {
          // If it's an array, take the first element (legacy)
          let code = data.productCode;
          if (Array.isArray(code) && code.length > 0) {
            code = code[0];
          }
          if (code && typeof code === "object") {
            data.type = code.type || "";
            data.value = code.value || "";
          }
        }

        const draft = await getProductDraft(productId);
        if (draft) {
          let draftData = { ...draft };
          delete draftData._id;
          if (draftData.productCode) {
            let code = draftData.productCode;
            if (Array.isArray(code) && code.length > 0) {
              code = code[0];
            }
            if (code && typeof code === "object") {
              draftData.type = code.type || "";
              draftData.value = code.value || "";
            }
          }
          data = { ...data, ...draftData };
        }

        if (initialProductId) {
          data._id = initialProductId;
        }

        if (!data.categoryId && initialCategoryId) {
          data.categoryId = initialCategoryId;
        }

        // Normalize reference IDs
        if (data.categoryId) {
          const id = toScalarId(data.categoryId);
          data.categoryId = id || null;
        }
        if (data.brand) {
          const id = toScalarId(data.brand);
          data.brand = id || null;
        }
        if (Array.isArray(data.carrier)) {
          const id = toScalarId(data.carrier);
          data.carrier = id || null;
        }

        // Ensure status is always set (default to 'draft')
        if (data.status) {
          data.status = data.status.trim().toLowerCase();
        } else {
          data.status = "draft";
        }

        // Log final data for debugging
        console.log("[ProductForm] Final product data:", data);
        setProductData(data);
      } catch (err) {
        console.error("Error loading product data:", err);
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

  // ---------- Visible steps ----------
  const visibleSteps = useMemo(() => {
    const variantStepIndex = steps.findIndex((step) =>
      step.groups.some((g) => normalizeCode(g.code) === "variantThemes"),
    );
    if (variantStepIndex === -1 || productData.hasVariants) {
      return steps;
    }
    return steps.filter((_, index) => index !== variantStepIndex);
  }, [steps, productData.hasVariants]);

  useEffect(() => {
    if (currentStep >= visibleSteps.length) {
      setCurrentStep(Math.max(0, visibleSteps.length - 1));
    }
    currentStepRef.current = Math.max(0, visibleSteps.length - 1);
  }, [visibleSteps, currentStep]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // ---------- Validation (uses "type" and "value") ----------
  const validateGroup = (group: GroupNode): string[] => {
    const errors: string[] = [];
    group.attributes.forEach((attr) => {
      if (!attr.isRequired) return;
      const camelCode = normalizeCode(attr.code);
      const value = productData[camelCode];
      if (isEmptyValue(value)) {
        errors.push(`${attr.name} is required`);
      }
    });

    if (normalizeCode(group.code) === "productCode") {
      const typeAttr = group.attributes.find(
        (a) => normalizeCode(a.code) === "type",
      );
      const valueAttr = group.attributes.find(
        (a) => normalizeCode(a.code) === "value",
      );
      if (typeAttr && valueAttr) {
        const codeType = productData.type;
        const codeValue = productData.value;
        if (!isEmptyValue(codeType) && !isEmptyValue(codeValue)) {
          const valid = isValidBarcode(codeValue, codeType);
          if (!valid) {
            errors.push(
              `${valueAttr.name} is not a valid ${codeType} barcode.`,
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
      const group = step.groups.find(
        (g) => normalizeCode(g.code) === "variantFields",
      );
      if (group) {
        variantFields = group.attributes || [];
        break;
      }
    }
    if (variantFields.length === 0) return errors;
    const requiredVariantFields = variantFields.filter((f) => f.isRequired);

    variants.forEach((variant: any, index: number) => {
      requiredVariantFields.forEach((field) => {
        const camelCode = normalizeCode(field.code);
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
      step.groups.some((g) => normalizeCode(g.code) === "variantThemes"),
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
      (g) => normalizeCode(g.code) === "variantThemes",
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

  // ---------- Change handler ----------
  const handleChange = useCallback(
    (field: string, value: any) => {
      const camelField = normalizeCode(field);
      setProductData((prev) => ({ ...prev, [camelField]: value }));

      const stepIndex = currentStepRef.current;
      const stepData = visibleSteps[stepIndex];
      if (stepData) {
        const group = stepData.groups.find((g) =>
          g.attributes.some((a) => normalizeCode(a.code) === camelField),
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

      const payload = { ...productData };
      const productIdToUse =
        initialProductId ||
        payload._id ||
        (productId !== "new" ? productId : undefined);

      if (productIdToUse) {
        payload._id = productIdToUse;
        console.log("[ProductForm] Submitting UPDATE with _id:", payload._id);
      } else {
        delete payload._id;
        console.log("[ProductForm] Submitting CREATE (no _id)");
      }

      delete payload.Id;
      delete payload.id;

      console.log("[ProductForm] Full payload:", payload);

      const normalizedPayload: Record<string, any> = { ...payload };

      if (normalizedPayload.categoryId) {
        normalizedPayload.categoryId =
          toScalarId(normalizedPayload.categoryId) || null;
      }
      if (normalizedPayload.brand) {
        normalizedPayload.brand = toScalarId(normalizedPayload.brand) || null;
      }
      if (
        normalizedPayload.carrier &&
        Array.isArray(normalizedPayload.carrier)
      ) {
        normalizedPayload.carrier =
          toScalarId(normalizedPayload.carrier) || null;
      }
      if (typeof normalizedPayload.status === "string") {
        normalizedPayload.status = normalizedPayload.status
          .trim()
          .toLowerCase();
      } else if (Array.isArray(normalizedPayload.status)) {
        normalizedPayload.status = (normalizedPayload.status[0] || "draft")
          .toString()
          .trim()
          .toLowerCase();
      }

      if (Array.isArray(normalizedPayload.variants)) {
        normalizedPayload.variants = normalizedPayload.variants.map(
          (variant: any) => {
            if (!variant || typeof variant !== "object") return variant;
            const nextVariant = { ...variant };
            if (Array.isArray(nextVariant.mainImage)) {
              nextVariant.mainImage = nextVariant.mainImage[0] || "";
            }
            if (Array.isArray(nextVariant.images)) {
              nextVariant.images = nextVariant.images.filter(Boolean);
            }
            return nextVariant;
          },
        );
      }

      console.log(
        "[ProductForm] Normalized payload sent to server:",
        normalizedPayload,
      );

      const res = await createOrUpdateProduct(normalizedPayload);

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
      const group = step.groups.find(
        (g) => normalizeCode(g.code) === "variantFields",
      );
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
