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
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { toast } from "react-hot-toast";

import { getCategoryAttributeSets } from "@/app/actions/category";
import { getUnits } from "@/app/actions/unit";
import {
  createProduct,
  updateProduct,
  findProductById,
} from "@/app/actions/products";
import {
  saveProductDraft,
  getProductDraft,
  deleteProductDraft,
} from "@/app/actions/drafts";

import { AttributeField } from "@/app/(catalog)/catalog/products/component/AttributeFields";
import ManageRelatedProduct from "./ManageRelatedProduct";
import VariantsManager from "@/app/(catalog)/catalog/products/component/variants/VariantOption";
import { isValidBarcode } from "@/app/lib/products/barcode";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import {
  getOrCreateNewProductDraftKey,
  clearNewProductDraftKey,
} from "@/app/lib/products/draftKeys";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
export type AttributeDetail = {
  id: string;
  code: string;
  name: string;
  options?: string[];
  type: string;
  isRequired?: boolean;
  isHighlight?: boolean;
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
  sortOrder: number;
  groups: GroupNode[];
};

type AttributeStep = {
  kind: "attributes";
  id: string;
  title: string;
  /** Preserved on the render step so the memo can sort deterministically. */
  sortOrder: number;
  groups: GroupNode[];
};

type VariantsStep = {
  kind: "variants";
  id: "__variants__";
  title: string;
  /** Always pinned last, regardless of any set's sortOrder. */
  sortOrder: number;
};

type RenderStep = AttributeStep | VariantsStep;

const VARIANTS_STEP_ID = "__variants__";
const VARIANT_GROUP_CODES = new Set([
  "variantThemes",
  "variantFields",
  "variants",
]);

// ------------------------------------------------------------------
// Helpers
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

function normalizeVariantValues(data: any): Record<string, string[]> {
  if (!data) return {};
  if (Array.isArray(data)) {
    const obj: Record<string, string[]> = {};
    data.forEach((item) => {
      if (item && typeof item === "object" && "k" in item && "v" in item) {
        const key = normalizeCode(item.k);
        const values = Array.isArray(item.v) ? item.v : [item.v];
        obj[key] = values;
      }
    });
    return obj;
  }
  if (typeof data === "object") {
    const obj: Record<string, string[]> = {};
    Object.entries(data).forEach(([k, v]) => {
      const key = normalizeCode(k);
      const values = Array.isArray(v)
        ? v
        : v !== undefined && v !== null
          ? [v]
          : [];
      obj[key] = values;
    });
    return obj;
  }
  return {};
}

function getGroupRelevantKeys(group: GroupNode): string[] {
  const keys: string[] = [];
  group.attributes.forEach((attr) => keys.push(normalizeCode(attr.code)));
  group.children.forEach((child) => keys.push(...getGroupRelevantKeys(child)));
  if (normalizeCode(group.code) === "productRelationships") {
    keys.push("relatedProducts");
  }
  if (normalizeCode(group.code) === "variantThemes") {
    keys.push("variants", "variantThemes", "variantValues", "hasVariants");
  }
  return keys;
}

function stripVariantGroups(groups: GroupNode[]): GroupNode[] {
  return groups
    .filter((g) => !VARIANT_GROUP_CODES.has(normalizeCode(g.code)))
    .map((g) => ({
      ...g,
      children: stripVariantGroups(g.children || []),
    }))
    .filter((g) => g.attributes.length > 0 || g.children.length > 0);
}

const findGroupByCode = (
  groups: GroupNode[],
  code: string,
): GroupNode | null => {
  for (const g of groups) {
    if (normalizeCode(g.code) === code) return g;
    const found = findGroupByCode(g.children || [], code);
    if (found) return found;
  }
  return null;
};

const findGroupInSteps = (
  steps: AttributeSetStep[],
  code: string,
): GroupNode | null => {
  for (const step of steps) {
    const found = findGroupByCode(step.groups, code);
    if (found) return found;
  }
  return null;
};

// ------------------------------------------------------------------
// GroupRenderer
// ------------------------------------------------------------------
interface GroupRendererProps {
  group: GroupNode;
  productId: string;
  productData: Record<string, any>;
  validationErrors: { [key: string]: string[] };
  handleChange: (field: string, value: any) => void;
  units: any[];
}

const GroupRenderer = memo(
  ({
    group,
    productId,
    productData,
    validationErrors,
    handleChange,
    units,
  }: GroupRendererProps) => {
    const { id, code, name, attributes, children } = group;
    const groupErrors = validationErrors[id] || [];
    const normalizedCode = normalizeCode(code);

    if (normalizedCode === "productRelationships") {
      return (
        <section key={id} className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{name}</h2>
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
              />
            ))}
        </section>
      );
    }

    return (
      <section key={id} className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">{name}</h2>
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
              />
            ))}
        </div>
      </section>
    );
  },
  (prev, next) => {
    if (prev.productId !== next.productId) return false;
    if (prev.units !== next.units) return false;
    if (prev.handleChange !== next.handleChange) return false;
    if (prev.group.id !== next.group.id) return false;

    const relevantKeys = getGroupRelevantKeys(prev.group);
    for (const key of relevantKeys) {
      if (prev.productData[key] !== next.productData[key]) return false;
    }

    const prevGroupErrors = prev.validationErrors[prev.group.id] || [];
    const nextGroupErrors = next.validationErrors[next.group.id] || [];
    if (prevGroupErrors.length !== nextGroupErrors.length) return false;
    if (prevGroupErrors.some((e, i) => e !== nextGroupErrors[i])) return false;

    return true;
  },
);
GroupRenderer.displayName = "GroupRenderer";

// ------------------------------------------------------------------
// Legacy compatibility shim
// ------------------------------------------------------------------
function flattenStructuredFields(
  data: Record<string, any>,
): Record<string, any> {
  const result = { ...data };

  if (Array.isArray(result.specifications)) {
    const flattenSpecs = (specs: any[]) => {
      for (const group of specs) {
        if (Array.isArray(group.attributes)) {
          for (const attr of group.attributes) {
            if (attr?.k && attr.v !== undefined) result[attr.k] = attr.v;
          }
        }
        if (Array.isArray(group.groups)) flattenSpecs(group.groups);
      }
    };
    flattenSpecs(result.specifications);
  }
  return result;
}

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

  const [productId] = useState<string>(
    () => initialProductId || getOrCreateNewProductDraftKey(),
  );

  const [productData, setProductData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [isFetchingAttributes, setIsFetchingAttributes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<AttributeSetStep[]>([]);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string[];
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [units, setUnits] = useState<any[]>([]);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const currentStepRef = useRef(currentStep);
  const stepperViewportRef = useRef<HTMLDivElement | null>(null);

  const clearNewProductSession = useCallback(() => {
    if (initialProductId) return;
    clearNewProductDraftKey();
  }, [initialProductId]);

  // ---------------- Draft auto-save ---------------- //
  useEffect(() => {
    if (Object.keys(productData).length === 0) return;
    const timer = setTimeout(async () => {
      try {
        await saveProductDraft(productId, productData);
      } catch {
        /* silent */
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [productData, productId]);

  // ---------------- Load product & draft ---------------- //
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        let data: Record<string, any> = {};

        if (initialProductId) {
          const result = await findProductById(initialProductId);
          if (result && !result.error) {
            data = result;
          } else {
            setError("Failed to load product");
            toast.error("Failed to load product");
          }
        }

        data = flattenStructuredFields(data);

        if (data.productCode) {
          let code = data.productCode;
          if (Array.isArray(code) && code.length > 0) code = code[0];
          if (code && typeof code === "object") {
            data.type = code.type || "";
            data.value = code.value || "";
          }
        }
        if (data.variantValues) {
          data.variantValues = normalizeVariantValues(data.variantValues);
        }

        const draft = await getProductDraft(productId);
        if (draft && draft.data) {
          const draftTime = draft.updatedAt
            ? new Date(draft.updatedAt).getTime()
            : 0;
          const productTime = data.updatedAt
            ? new Date(data.updatedAt).getTime()
            : 0;
          const isNewProduct = !initialProductId;
          const shouldUseDraft = isNewProduct || draftTime > productTime;

          if (shouldUseDraft) {
            let draftData: any = { ...draft.data };
            const recreateSourceId = draftData._recreateSourceId;
            delete draftData._id;
            draftData = flattenStructuredFields(draftData);
            if (recreateSourceId !== undefined) {
              draftData._recreateSourceId = recreateSourceId;
            }
            if (draftData.productCode) {
              let code = draftData.productCode;
              if (Array.isArray(code) && code.length > 0) code = code[0];
              if (code && typeof code === "object") {
                draftData.type = code.type || "";
                draftData.value = code.value || "";
              }
            }
            if (draftData.variantValues) {
              draftData.variantValues = normalizeVariantValues(
                draftData.variantValues,
              );
            }
            data = { ...data, ...draftData };
          } else {
            try {
              await deleteProductDraft(productId);
            } catch {
              /* silent */
            }
          }
        }

        if (initialProductId) data._id = initialProductId;
        if (!data.categoryId && initialCategoryId) {
          data.categoryId = initialCategoryId;
        }

        if (data.categoryId) {
          data.categoryId = toScalarId(data.categoryId) || null;
        }
        if (data.brand) {
          data.brand = toScalarId(data.brand) || null;
        }
        if (Array.isArray(data.carrier)) {
          data.carrier = toScalarId(data.carrier) || null;
        }

        data.status = data.status ? data.status.trim().toLowerCase() : "draft";

        if (Array.isArray(data.images)) {
          data.images = data.images.map((img) =>
            typeof img === "string" ? img : "",
          );
        }

        if (typeof data.hasVariants !== "boolean") {
          data.hasVariants =
            Array.isArray(data.variants) && data.variants.length > 0;
        }

        setProductData(data);
      } catch (err) {
        console.error("Error loading product data:", err);
        setError("Failed to load data");
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initialProductId, productId, initialCategoryId]);

  // ---------------- Fetch attribute sets ---------------- //
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

        // The server already sorts by `sortOrder`. We re-sort here so the
        // form's step order is guaranteed regardless of how `sets` was
        // shaped upstream. Missing sortOrder is treated as 0 so it lands
        // at the top (matches the AttributeSet schema default).
        const sortedSets: AttributeSetStep[] = [...sets]
          .map((s) => ({
            id: s.id,
            title: s.title,
            code: s.code,
            sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : 0,
            groups: s.groups as GroupNode[],
          }))
          .sort((a, b) => a.sortOrder - b.sortOrder);

        setSteps(sortedSets);
        setCurrentStep(0);
        setValidationErrors({});
      } catch (err) {
        console.error("Error fetching attribute sets:", err);
        setError("Failed to load product attributes. Please try again.");
        toast.error("Failed to load product attributes.");
        setSteps([]);
      } finally {
        setIsFetchingAttributes(false);
      }
    };
    fetchAttributeSets();
  }, [productData.categoryId]);

  // ---------------- Fetch units ---------------- //
  useEffect(() => {
    (async () => {
      try {
        const allUnits = await getUnits();
        setUnits(allUnits);
      } catch (err) {
        console.error("Failed to fetch units", err);
      }
    })();
  }, []);

  // ================================================================== //
  // Variants — group-code driven                                       //
  // ================================================================== //
  const hasVariants = productData.hasVariants === true;

  const variantThemesGroup = useMemo(
    () => findGroupInSteps(steps, "variantThemes"),
    [steps],
  );
  const variantFieldsGroup = useMemo(
    () => findGroupInSteps(steps, "variantFields"),
    [steps],
  );

  const variantThemes = variantThemesGroup?.attributes ?? [];
  const variantFields = variantFieldsGroup?.attributes ?? [];
  const hasVariantConfig = !!variantThemesGroup;

  // ------------------------------------------------------------------ //
  // Build renderable steps                                             //
  //                                                                    //
  // 1. Map each AttributeSetStep to an AttributeStep, carrying sortOrder.
  // 2. Strip variant groups from each step's groups.
  // 3. Drop steps that became empty.
  // 4. Sort the whole list ascending by sortOrder — this is where the
  //    order is enforced for the UI, not just at fetch time.
  // 5. Append the synthetic Variants step last (it carries
  //    Number.MAX_SAFE_INTEGER so a re-sort below keeps it last).
  // ------------------------------------------------------------------ //
  const renderSteps = useMemo<RenderStep[]>(() => {
    const attributeSteps: AttributeStep[] = steps
      .map<AttributeStep>((step) => ({
        kind: "attributes",
        id: step.id,
        title: step.title,
        sortOrder: step.sortOrder ?? 0,
        groups: stripVariantGroups(step.groups),
      }))
      .filter((s) => s.groups.length > 0);

    const list: RenderStep[] = [...attributeSteps].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    if (hasVariants && hasVariantConfig) {
      list.push({
        kind: "variants",
        id: VARIANTS_STEP_ID,
        title: "Variants",
        sortOrder: Number.MAX_SAFE_INTEGER,
      });
    }

    // Final sort — attribute steps keep their relative order; the
    // variants step stays last because it carries MAX_SAFE_INTEGER.
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }, [steps, hasVariants, hasVariantConfig]);

  // Clamp the active index when the step list shrinks.
  useEffect(() => {
    if (currentStep >= renderSteps.length && renderSteps.length > 0) {
      setCurrentStep(renderSteps.length - 1);
    } else if (renderSteps.length === 0 && currentStep !== 0) {
      setCurrentStep(0);
    }
  }, [renderSteps.length, currentStep]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Keep the stepper's active step in view horizontally.
  useEffect(() => {
    const container = stepperViewportRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(
      ".MuiStep-root.Mui-active",
    );
    if (!active) return;
    const target =
      active.offsetLeft - container.clientWidth / 2 + active.clientWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [currentStep, renderSteps.length]);

  // ---------------- Toggle handler ---------------- //
  const handleToggleVariants = useCallback((enabled: boolean) => {
    setProductData((prev) => {
      const next: Record<string, any> = { ...prev, hasVariants: enabled };
      if (!enabled) {
        delete next.variants;
        delete next.variantThemes;
        delete next.variantValues;
      }
      return next;
    });

    if (!enabled) {
      setValidationErrors((prev) => {
        if (!("variants" in prev)) return prev;
        const next = { ...prev };
        delete next["variants"];
        return next;
      });
    }
  }, []);

  // ---------------- Validation ---------------- //
  const validateGroup = (group: GroupNode): string[] => {
    const errors: string[] = [];
    group.attributes.forEach((attr) => {
      if (!attr.isRequired) return;
      const camelCode = normalizeCode(attr.code);
      if (isEmptyValue(productData[camelCode])) {
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
          if (!isValidBarcode(codeValue, codeType)) {
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
    if (!hasVariants) return errors;
    const variants = productData.variants || [];
    if (variants.length === 0) return errors;
    if (variantFields.length === 0) return errors;

    const required = variantFields.filter((f) => f.isRequired);

    variants.forEach((variant: any, index: number) => {
      required.forEach((field) => {
        const camelCode = normalizeCode(field.code);
        if (isEmptyValue(variant[camelCode])) {
          errors.push(`Variant #${index + 1}: ${field.name} is required`);
        }
      });
    });
    return errors;
  };

  const validateAllSteps = (): {
    ok: boolean;
    errors: Record<string, string[]>;
  } => {
    const allErrors: { [key: string]: string[] } = {};
    let hasErrors = false;

    for (const step of renderSteps) {
      if (step.kind === "variants") {
        const errs = validateVariants();
        if (errs.length > 0) {
          allErrors["variants"] = errs;
          hasErrors = true;
        }
      } else {
        for (const group of step.groups) {
          const errs = validateGroup(group);
          if (errs.length > 0) {
            allErrors[group.id] = errs;
            hasErrors = true;
          }
        }
      }
    }

    setValidationErrors(allErrors);
    if (hasErrors) {
      toast.error("Please fix the validation errors before saving.");
    }
    return { ok: !hasErrors, errors: allErrors };
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep >= renderSteps.length) return true;
    const step = renderSteps[currentStep];
    if (!step) return true;
    const newErrors = { ...validationErrors };
    let hasErrors = false;

    if (step.kind === "variants") {
      const variantErrors = validateVariants();
      if (variantErrors.length > 0) {
        newErrors["variants"] = variantErrors;
        hasErrors = true;
      } else {
        delete newErrors["variants"];
      }
    } else {
      step.groups.forEach((group) => {
        const errs = validateGroup(group);
        if (errs.length > 0) {
          newErrors[group.id] = errs;
          hasErrors = true;
        } else {
          delete newErrors[group.id];
        }
      });
    }

    setValidationErrors(newErrors);
    if (hasErrors) {
      toast.error("Please fix the errors on this step before continuing.");
      return false;
    }
    return true;
  };

  // ---------------- Navigation ---------------- //
  const handleNext = () => {
    if (validateCurrentStep() && currentStep < renderSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  // ---------------- Change handler ---------------- //
  const handleChange = useCallback(
    (field: string, value: any) => {
      const camelField = normalizeCode(field);
      setProductData((prev) => ({ ...prev, [camelField]: value }));

      const step = renderSteps[currentStepRef.current];
      if (step && step.kind === "attributes") {
        const group = step.groups.find((g) =>
          g.attributes.some((a) => normalizeCode(a.code) === camelField),
        );
        if (group) {
          setValidationErrors((prev) => {
            const next = { ...prev };
            delete next[group.id];
            return next;
          });
        }
      }
      if (camelField === "variants") {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next["variants"];
          return next;
        });
      }
    },
    [renderSteps],
  );

  // ---------------- Submit ---------------- //
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentStep !== renderSteps.length - 1) {
      handleNext();
      return;
    }

    const { ok, errors } = validateAllSteps();
    if (!ok) {
      let firstErrorStep = 0;
      for (let i = 0; i < renderSteps.length; i++) {
        const step = renderSteps[i];
        const stepHasError =
          step.kind === "variants"
            ? (errors["variants"]?.length ?? 0) > 0
            : step.groups.some((g) => (errors[g.id]?.length ?? 0) > 0);
        if (stepHasError) {
          firstErrorStep = i;
          break;
        }
      }
      setCurrentStep(firstErrorStep);
      return;
    }

    const existingId =
      initialProductId ||
      (typeof productData._id === "string" ? productData._id : "");
    const isUpdate = Boolean(existingId);

    const toastId = toast.loading(
      isUpdate ? "Updating product..." : "Creating product...",
    );
    setIsSubmitting(true);

    try {
      const payload = { ...productData };

      delete payload.specifications;
      payload.status = "active";

      delete payload._id;
      delete payload.Id;
      delete payload.id;

      if (!hasVariants) {
        delete payload.variants;
        delete payload.variantThemes;
        delete payload.variantValues;
      }

      if (payload.categoryId)
        payload.categoryId = toScalarId(payload.categoryId) || null;
      if (payload.brand) payload.brand = toScalarId(payload.brand) || null;
      if (payload.carrier && Array.isArray(payload.carrier)) {
        payload.carrier = toScalarId(payload.carrier) || null;
      }

      if (typeof payload.status === "string") {
        payload.status = payload.status.trim().toLowerCase();
      } else if (Array.isArray(payload.status)) {
        payload.status = (payload.status[0] || "active")
          .toString()
          .trim()
          .toLowerCase();
      }

      if (Array.isArray(payload.variants)) {
        payload.variants = payload.variants.map((variant: any) => {
          if (!variant || typeof variant !== "object") return variant;
          const next = { ...variant };
          if (Array.isArray(next.mainImage))
            next.mainImage = next.mainImage[0] || "";
          if (Array.isArray(next.images))
            next.images = next.images.filter(Boolean);
          return next;
        });
      }

      if (
        payload.variantValues &&
        typeof payload.variantValues === "object" &&
        !Array.isArray(payload.variantValues)
      ) {
        payload.variantValues = Object.entries(payload.variantValues).map(
          ([k, v]) => ({ k, v }),
        );
      }

      const res = isUpdate
        ? await updateProduct(existingId, payload)
        : await createProduct(payload);

      if (res.success) {
        toast.success(
          isUpdate
            ? "Product updated successfully!"
            : "Product created successfully!",
          { id: toastId },
        );
        try {
          await deleteProductDraft(productId);
        } catch {
          /* silent */
        }
        clearNewProductSession();
        setTimeout(() => router.push("/catalog/products"), 900);
      } else {
        toast.error(res.error || "Failed to save product.", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------- Cancel ---------------- //
  const handleCancelClick = () => setIsCancelDialogOpen(true);
  const handleConfirmCancel = async () => {
    const toastId = toast.loading("Discarding draft...");
    try {
      await deleteProductDraft(productId);
      clearNewProductSession();
      toast.success("Draft discarded", { id: toastId });
    } catch {
      toast.error("Failed to discard draft", { id: toastId });
    } finally {
      setIsCancelDialogOpen(false);
      router.push("/catalog/products");
    }
  };

  // ---------------- Early exits ---------------- //
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!productData.categoryId && !loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-xl border border-amber-500/30 bg-amber-50/60 p-5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Please select a category first to load product attributes.
        </div>
      </div>
    );
  }

  const activeStep = renderSteps[currentStep];
  const showVariantsToggle = hasVariantConfig && !isFetchingAttributes;

  return (
    <div className="mx-auto max-w-4xl">
      <form
        onSubmit={handleSubmit}
        // `overflow-clip` clips rounded corners WITHOUT creating a
        // scroll container, so `position: sticky` on the header and
        // footer continues to work.
        className="overflow-clip lg:rounded-xl lg:border lg:border-border bg-card text-card-foreground"
      >
        {/* Sticky header — pinned to the top of the viewport while the
            form is in view. */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-1 py-3 backdrop-blur-sm sm:py-4">
          <div className="min-w-0 flex items-center gap-3">
            <h1 className="text-sm font-semibold text-foreground">
              {initialProductId ? "Edit product" : "New product"}
            </h1>
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
              {renderSteps.length > 0
                ? `Step ${currentStep + 1} of ${renderSteps.length}`
                : "Fill in product details"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!error && (
              <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Auto-saved
              </span>
            )}
            {showVariantsToggle && (
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={hasVariants}
                    onChange={(e) => handleToggleVariants(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <span className="text-xs text-muted-foreground">
                    Has variants
                  </span>
                }
                sx={{ mr: 0 }}
              />
            )}
          </div>
        </div>

        {/* Body — this is the only part that scrolls */}
        <div className="px-1 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive">
              {error}
            </div>
          )}

          {isFetchingAttributes ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <CircularProgress />
            </div>
          ) : renderSteps.length === 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              {steps.length === 0
                ? "No attribute sets mapped to this category."
                : "No product fields are configured for this category."}
            </div>
          ) : (
            <>
              <div
                ref={stepperViewportRef}
                className="mb-6 w-full overflow-x-auto"
              >
                <Stepper
                  key={`stepper-${renderSteps.length}`}
                  activeStep={Math.min(
                    currentStep,
                    Math.max(0, renderSteps.length - 1),
                  )}
                  className="w-full min-w-max"
                >
                  {renderSteps.map((step) => {
                    const hasError =
                      step.kind === "variants"
                        ? (validationErrors["variants"]?.length ?? 0) > 0
                        : step.groups.some(
                            (g) =>
                              validationErrors[g.id] &&
                              validationErrors[g.id].length > 0,
                          );
                    return (
                      <Step key={step.id}>
                        <StepLabel error={hasError}>{step.title}</StepLabel>
                      </Step>
                    );
                  })}
                </Stepper>
              </div>

              <div className="space-y-6">
                {activeStep?.kind === "variants" ? (
                  <VariantsManager
                    productId={productId}
                    product={productData}
                    attributes={variantThemes}
                    variantFields={variantFields}
                    onUpdate={handleChange}
                  />
                ) : (
                  activeStep?.groups.map((group) => (
                    <GroupRenderer
                      key={group.id}
                      group={group}
                      productId={productId}
                      productData={productData}
                      validationErrors={validationErrors}
                      handleChange={handleChange}
                      units={units}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Sticky footer — pinned to the viewport bottom while the form
            is in view. */}
        <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 border-t border-border bg-card/95 px-4 py-3 shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isSubmitting}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
            >
              Cancel
            </button>
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 sm:px-3.5"
              >
                Previous
              </button>
            )}
          </div>

          {renderSteps.length > 1 && (
            <span className="hidden text-xs text-muted-foreground md:inline">
              Step {currentStep + 1} of {renderSteps.length}
            </span>
          )}

          {currentStep < renderSteps.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              )}
              {isSubmitting ? "Saving…" : "Save product"}
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        isOpen={isCancelDialogOpen}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Discard this draft?"
        message="Your unsaved changes will be lost and the draft will be deleted. This action cannot be undone."
        confirmLabel="Discard & exit"
        cancelLabel="Keep editing"
        danger
      />
    </div>
  );
};

export default memo(ProductForm);
