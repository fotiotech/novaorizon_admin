"use client";

import React, { useState, useEffect } from "react";
import {
  createAttributeSet,
  getAttributeSet,
  updateAttributeSet,
} from "@/app/actions/attribute_sets";

interface AttributeSetFormProps {
  attributeSetId?: string; // if provided, we're in edit mode
  onSuccess: () => void;
  onCancel: () => void;
}

const AttributeSetForm: React.FC<AttributeSetFormProps> = ({
  attributeSetId,
  onSuccess,
  onCancel,
}) => {
  const isEditing = !!attributeSetId;

  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    code?: string;
  }>({});

  // Fetch existing attribute set data when editing
  useEffect(() => {
    if (!isEditing || !attributeSetId) return;
    const fetchSet = async () => {
      setIsFetching(true);
      try {
        const res = await getAttributeSet(attributeSetId);
        if (res.success && res.data) {
          const d: any = res.data;
          setTitle(d.title ?? "");
          setCode(d.code ?? "");
          setDescription(d.description ?? "");
          setSortOrder(
            typeof d.sortOrder === "number"
              ? d.sortOrder
              : typeof d.sort_order === "number"
                ? d.sort_order
                : 0,
          );
        } else {
          setError(res.error || "Could not load attribute set");
        }
      } catch (err: any) {
        console.error("Failed to fetch attribute set:", err);
        setError(err?.message || "Could not load attribute set");
      } finally {
        setIsFetching(false);
      }
    };
    fetchSet();
  }, [attributeSetId, isEditing]);

  const validate = () => {
    const errs: { title?: string; code?: string } = {};
    if (!title.trim()) errs.title = "Title is required";
    if (!code.trim()) errs.code = "Code is required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;

    setIsLoading(true);
    try {
      const payload = {
        title: title.trim(),
        code: code.trim(),
        description: description.trim() || undefined,
        sortOrder: sortOrder ?? 0,
      };

      const result =
        isEditing && attributeSetId
          ? await updateAttributeSet(attributeSetId, payload)
          : await createAttributeSet(payload);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to save attribute set");
      }
    } catch (err: any) {
      console.error("Error submitting attribute set:", err);
      setError(err?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        <span className="ml-2">Loading…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="set-title"
            className="block text-sm font-medium text-foreground"
          >
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="set-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title)
                setFieldErrors((p) => ({ ...p, title: undefined }));
            }}
            placeholder="e.g. Product Dimensions"
            className={
              fieldErrors.title
                ? "border-destructive focus:border-destructive"
                : ""
            }
          />
          {fieldErrors.title && (
            <p className="text-xs text-destructive">{fieldErrors.title}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="set-code"
            className="block text-sm font-medium text-foreground"
          >
            Code <span className="text-destructive">*</span>
          </label>
          <input
            id="set-code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (fieldErrors.code)
                setFieldErrors((p) => ({ ...p, code: undefined }));
            }}
            placeholder="e.g. product_dimensions"
            className={
              fieldErrors.code
                ? "border-destructive focus:border-destructive"
                : ""
            }
          />
          {fieldErrors.code && (
            <p className="text-xs text-destructive">{fieldErrors.code}</p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor="set-sortOrder"
          className="block text-sm font-medium text-foreground"
        >
          Sort order
        </label>
        <input
          id="set-sortOrder"
          type="number"
          value={sortOrder ?? ""}
          onChange={(e) =>
            setSortOrder(e.target.value ? parseInt(e.target.value, 10) : null)
          }
          placeholder="0"
          className="max-w-[140px]"
        />
        <p className="text-xs text-muted-foreground">
          Lower numbers appear first in lists.
        </p>
      </div>

      <div>
        <label
          htmlFor="set-description"
          className="block text-sm font-medium text-foreground"
        >
          Description
        </label>
        <textarea
          id="set-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Optional description…"
          className="resize-none"
        />
      </div>

      {/* Footer inside the modal */}
      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          )}
          {isLoading
            ? isEditing
              ? "Updating…"
              : "Creating…"
            : isEditing
              ? "Update Set"
              : "Create Set"}
        </button>
      </div>
    </form>
  );
};

export default AttributeSetForm;
