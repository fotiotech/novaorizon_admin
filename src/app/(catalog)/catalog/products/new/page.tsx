// app/catalog/products/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { toast } from "react-hot-toast";
import CategorySelector from "@/app/(catalog)/catalog/products/component/CategorySelector";
import ProductForm from "@/app/(catalog)/catalog/products/component/ProductForm";
import { getProductDraft, deleteProductDraft } from "@/app/actions/drafts";
import {
  getOrCreateNewProductDraftKey,
  clearNewProductDraftKey,
} from "@/app/lib/products/draftKeys";

type DraftState = "checking" | "found" | "accepted" | "none";

export default function CreateProductPage() {
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<DraftState>("checking");
  const [draftCategoryId, setDraftCategoryId] = useState<string | null>(null);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // On mount, check whether a draft already exists for this session's
  // new-product key.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draftKey = getOrCreateNewProductDraftKey();
        const draft = await getProductDraft(draftKey);
        if (cancelled) return;

        const hasContent =
          draft?.data &&
          typeof draft.data === "object" &&
          Object.keys(draft.data).length > 0;

        if (hasContent) {
          const catId =
            typeof draft!.data.categoryId === "string" &&
            draft!.data.categoryId.trim().length > 0
              ? draft!.data.categoryId
              : null;
          setDraftCategoryId(catId);
          setDraftState("found");
        } else {
          setDraftState("none");
        }
      } catch (err) {
        console.error("Failed to check for existing draft:", err);
        if (!cancelled) setDraftState("none");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinueWithDraft = () => {
    setDraftState("accepted");
  };

  const handleDiscardDraft = async () => {
    setIsDiscarding(true);
    const toastId = toast.loading("Discarding draft...");
    try {
      const draftKey = getOrCreateNewProductDraftKey();
      await deleteProductDraft(draftKey);
      clearNewProductDraftKey();
      toast.success("Draft discarded", { id: toastId });
      setDraftState("none");
      setCategoryId(null);
      setDraftCategoryId(null);
    } catch {
      toast.error("Failed to discard draft", { id: toastId });
    } finally {
      setIsDiscarding(false);
    }
  };

  if (draftState === "checking") {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="300px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (draftState === "found") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl border border-border shadow-xl p-6">
          <h3 className="text-lg font-semibold mb-1">
            Continue with your draft?
          </h3>
          <p className="text-sm text-muted-foreground mb-5">
            You have an unfinished draft for a new product. Would you like to
            continue editing it, or start fresh?
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleContinueWithDraft}
              disabled={isDiscarding}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue with draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              disabled={isDiscarding}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDiscarding ? "Discarding..." : "Start fresh (discard draft)"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Accept: if the draft carried a category, use it. Otherwise fall
  // through to the category selector.
  const effectiveCategoryId =
    categoryId ?? (draftState === "accepted" ? draftCategoryId : null);

  if (!effectiveCategoryId) {
    return <CategorySelector onSelect={setCategoryId} />;
  }

  return <ProductForm initialCategoryId={effectiveCategoryId} />;
}
