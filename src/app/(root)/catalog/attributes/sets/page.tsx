"use client";

import React, { useState, useEffect, useCallback, Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { toast } from "react-hot-toast";
import {
  getAttributeSets,
  deleteAttributeSet,
} from "@/app/actions/attribute_sets";
import AttributeSetForm from "../_component/AttributeSetForm";
import { Modal } from "@/components/ux/Modal";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";

interface AttributeSetRow {
  _id: string;
  title: string;
  code: string;
  description?: string;
  sortOrder?: number;
}

const KebabIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <circle cx="12" cy="5" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="12" cy="19" r="1.75" />
  </svg>
);

export default function SetsPage() {
  const [sets, setSets] = useState<AttributeSetRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  // Delete confirm
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const fetchSets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getAttributeSets();
      if (res.success) {
        setSets((res.data as any[]) || []);
      } else {
        toast.error(res.error || "Failed to load attribute sets");
        setSets([]);
      }
    } catch (err) {
      console.error("fetchSets error:", err);
      toast.error("Failed to load attribute sets");
      setSets([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSets();
  }, [fetchSets]);

  const openCreate = () => {
    setEditingSetId(null);
    setIsModalOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingSetId(id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSetId(null);
  };

  const handleSuccess = () => {
    closeModal();
    fetchSets();
  };

  // ---- Delete flow -----------------------------------------------------
  const requestDelete = (set: AttributeSetRow) => {
    setPendingDelete({ id: set._id, title: set.title });
  };

  const cancelDelete = () => {
    setPendingDelete(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { id, title } = pendingDelete;
    setPendingDelete(null);

    const toastId = toast.loading(`Deleting "${title}"…`);
    try {
      const res = await deleteAttributeSet(id);
      if (res.success) {
        toast.success("Attribute set deleted", { id: toastId });
        fetchSets();
      } else {
        toast.error(res.error || "Failed to delete attribute set", {
          id: toastId,
        });
      }
    } catch (err: any) {
      console.error("deleteAttributeSet error:", err);
      toast.error(err?.message || "Failed to delete attribute set", {
        id: toastId,
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Attribute Sets
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reusable groups of attributes that can be attached to categories.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <span className="text-base leading-none">+</span>
          New Set
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : sets.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No attribute sets found.
            </p>
            <button
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-primary hover:underline"
            >
              Create your first set →
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {sets.map((set) => (
              <li
                key={set._id}
                className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-muted/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {set.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {set.code}
                    </span>
                  </div>
                  {set.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {set.description}
                    </p>
                  )}
                </div>

                {/* Actions popover */}
                <Menu as="div" className="relative shrink-0">
                  <Menu.Button
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    aria-label="Open actions menu"
                  >
                    <KebabIcon />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 z-20 mt-1 w-40 origin-top-right overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg focus:outline-none">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => openEdit(set._id)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                              active ? "bg-muted" : ""
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              className="h-4 w-4 text-muted-foreground"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 18.82a4.5 4.5 0 01-1.897 1.13L3 21l1.05-1.935a4.5 4.5 0 011.13-1.897L16.862 4.487z"
                              />
                            </svg>
                            Edit
                          </button>
                        )}
                      </Menu.Item>
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={() => requestDelete(set)}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive transition ${
                              active ? "bg-destructive/10" : ""
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={1.8}
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                            Delete
                          </button>
                        )}
                      </Menu.Item>
                    </Menu.Items>
                  </Transition>
                </Menu>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit / Create modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSetId ? "Edit Attribute Set" : "New Attribute Set"}
        size="md"
      >
        <AttributeSetForm
          attributeSetId={editingSetId || undefined}
          onSuccess={handleSuccess}
          onCancel={closeModal}
        />
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete attribute set?"
        message={
          pendingDelete
            ? `"${pendingDelete.title}" will be permanently removed and unlinked from any category properties that reference it. This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Keep it"
        danger
      />
    </div>
  );
}
