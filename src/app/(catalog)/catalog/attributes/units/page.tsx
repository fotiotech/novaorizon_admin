// app/(settings)/settings/local/unit/page.tsx
"use client";

import FamilyForm from "@/app/(settings)/settings/local/unit/_component/FamilyForm";
import UnitForm from "@/app/(settings)/settings/local/unit/_component/UnitForm";
import {
  getUnits,
  updateUnit,
  createUnit,
  deleteUnit,
} from "@/app/actions/unit";
import {
  getUnitFamilies,
  updateUnitFamily,
  createUnitFamily,
  deleteUnitFamily,
} from "@/app/actions/unitFamilyActions";
import React, { useState, useEffect, useMemo } from "react";
import {
  Add,
  Edit,
  Delete,
  FilterList,
  Search,
  SearchOff,
  Straighten,
  MoreVert,
  Close,
  Category as CategoryIcon,
  ListAlt,
  FolderOpen,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { BottomSheet } from "@/components/ux/BottomSheet";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface UnitFamily {
  _id: string;
  name: string;
  description?: string;
  baseUnit: string;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  _id: string;
  name: string;
  symbol: string;
  unitFamily: string | UnitFamily;
  conversionFactor: number;
  isBaseUnit: boolean;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------
// Shared class tokens
// ------------------------------------------------------------------
const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const familyName = (u: Unit): string => {
  if (!u.unitFamily) return "—";
  if (typeof u.unitFamily === "string") return u.unitFamily;
  return u.unitFamily.name || "—";
};

// ------------------------------------------------------------------
// Empty state
// ------------------------------------------------------------------
const EmptyState = React.memo(function EmptyState({
  isFiltering,
  onNew,
  onClear,
  newLabel,
  emptyLabel,
  filterLabel,
}: {
  isFiltering: boolean;
  onNew: () => void;
  onClear: () => void;
  newLabel: string;
  emptyLabel: string;
  filterLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {isFiltering ? (
          <SearchOff className="text-muted-foreground" />
        ) : (
          <Straighten className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? filterLabel : emptyLabel}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your filter."
          : "Create your first entry to get started."}
      </p>
      <div className="mt-4">
        {isFiltering ? (
          <button
            onClick={onClear}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Clear filters
          </button>
        ) : (
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <Add fontSize="small" />
            {newLabel}
          </button>
        )}
      </div>
    </div>
  );
});

const UnitManagement = () => {
  const [unitFamilies, setUnitFamilies] = useState<UnitFamily[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingFamily, setEditingFamily] = useState<UnitFamily | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // ---------- Filters ----------
  const [familyFilter, setFamilyFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // ---------- Delete confirmations ----------
  const [deleteFamilyTarget, setDeleteFamilyTarget] =
    useState<UnitFamily | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<Unit | null>(null);

  useEffect(() => {
    loadUnitFamilies();
    loadUnits();
  }, []);

  const loadUnitFamilies = async () => {
    try {
      const families = await getUnitFamilies();
      setUnitFamilies(families);
    } catch (error) {
      console.error("Failed to load unit families:", error);
    }
  };

  const loadUnits = async (familyId?: string) => {
    try {
      const unitsData = await getUnits(familyId);
      setUnits(unitsData as any[]);
    } catch (error) {
      console.error("Failed to load units:", error);
    }
  };

  const handleFamilySubmit = async (formData: FormData) => {
    if (editingFamily) {
      await updateUnitFamily(editingFamily._id, formData);
    } else {
      await createUnitFamily(formData);
    }
    setShowFamilyForm(false);
    setEditingFamily(null);
    loadUnitFamilies();
  };

  const handleUnitSubmit = async (formData: FormData) => {
    if (editingUnit) {
      await updateUnit(editingUnit._id, formData);
    } else {
      await createUnit(formData);
    }
    setShowUnitForm(false);
    setEditingUnit(null);
    loadUnits(selectedFamily as string);
  };

  const confirmDeleteFamily = async () => {
    if (!deleteFamilyTarget) return;
    await deleteUnitFamily(deleteFamilyTarget._id);
    setDeleteFamilyTarget(null);
    loadUnitFamilies();
    // If the currently selected family was deleted, clear the selection.
    if (selectedFamily === deleteFamilyTarget._id) {
      setSelectedFamily(null);
      loadUnits();
    }
  };

  const confirmDeleteUnit = async () => {
    if (!deleteUnitTarget) return;
    await deleteUnit(deleteUnitTarget._id);
    setDeleteUnitTarget(null);
    loadUnits(selectedFamily as string);
  };

  const filterUnitsByFamily = (familyId: string | null) => {
    setSelectedFamily(familyId);
    loadUnits(familyId ?? undefined);
  };

  // ---------- Derived lists ----------
  const visibleFamilies = useMemo(() => {
    const q = familyFilter.trim().toLowerCase();
    if (!q) return unitFamilies;
    return unitFamilies.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description || "").toLowerCase().includes(q),
    );
  }, [unitFamilies, familyFilter]);

  const visibleUnits = useMemo(() => {
    const q = unitFilter.trim().toLowerCase();
    if (!q) return units;
    return units.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.symbol.toLowerCase().includes(q) ||
        familyName(u).toLowerCase().includes(q),
    );
  }, [units, unitFilter]);

  // ---------- Popover menus ----------
  const getFamilyMenuItems = (family: UnitFamily): PopoverMenuItem[] => [
    {
      key: "view",
      label: "View units",
      icon: <FolderOpen fontSize="small" />,
      onClick: () => filterUnitsByFamily(family._id),
    },
    {
      key: "edit",
      label: "Edit family",
      icon: <Edit fontSize="small" />,
      onClick: () => {
        setEditingFamily(family);
        setShowFamilyForm(true);
      },
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteFamilyTarget(family),
    },
  ];

  const getUnitMenuItems = (unit: Unit): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit unit",
      icon: <Edit fontSize="small" />,
      onClick: () => {
        setEditingUnit(unit);
        setShowUnitForm(true);
      },
    },
    {
      key: "delete",
      label: "Delete",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteUnitTarget(unit),
    },
  ];

  // ---------- Filter input ----------
  const familyFilterEl = (
    <div className="relative w-full">
      <Search
        fontSize="small"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        placeholder="Filter families…"
        value={familyFilter}
        onChange={(e) => setFamilyFilter(e.target.value)}
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );

  const unitFilterEl = (
    <div className="relative w-full">
      <Search
        fontSize="small"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="text"
        placeholder="Filter units…"
        value={unitFilter}
        onChange={(e) => setUnitFilter(e.target.value)}
        className={`${INPUT_CLASS} pl-9`}
      />
    </div>
  );

  const hasFamilyFilter = familyFilter.trim() !== "";
  const hasUnitFilter = unitFilter.trim() !== "";

  return (
    <div className="mx-auto w-full max-w-7xl overflow-x-clip">
      {/* ================================================================= */}
      {/* UNIT FAMILIES                                                     */}
      {/* ================================================================= */}
      <section className="mb-6">
        {/* Controls row */}
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              aria-label="Open filters"
            >
              <FilterList fontSize="small" />
              <span>Filters</span>
              {hasFamilyFilter && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  1
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setEditingFamily(null);
                setShowFamilyForm(true);
              }}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Add fontSize="small" />
              Add Family
            </button>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <div className="min-w-0 max-w-sm flex-1">{familyFilterEl}</div>
            {hasFamilyFilter && (
              <button
                type="button"
                onClick={() => setFamilyFilter("")}
                aria-label="Clear filter"
                title="Clear filter"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Close fontSize="small" />
              </button>
            )}
            <button
              onClick={() => {
                setEditingFamily(null);
                setShowFamilyForm(true);
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Add fontSize="small" />
              Add Family
            </button>
          </div>
        </div>

        {/* Family cards */}
        {visibleFamilies.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <EmptyState
              isFiltering={hasFamilyFilter}
              onNew={() => {
                setEditingFamily(null);
                setShowFamilyForm(true);
              }}
              onClear={() => setFamilyFilter("")}
              newLabel="Add Family"
              emptyLabel="No unit families yet"
              filterLabel="No families match your search"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {visibleFamilies.map((family) => {
              const isActive = selectedFamily === family._id;
              return (
                <div
                  key={family._id}
                  className={`group relative rounded-lg border bg-card p-4 transition-colors ${
                    isActive
                      ? "border-primary/40 ring-1 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-foreground">
                          {family.name}
                        </h3>
                        {isActive && (
                          <span className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      {family.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {family.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <CategoryIcon sx={{ fontSize: 11 }} />
                          Base: {family.baseUnit}
                        </span>
                      </div>
                    </div>

                    <PopoverMenu
                      items={getFamilyMenuItems(family)}
                      ariaLabel={`Actions for ${family.name}`}
                      trigger={<MoreVert fontSize="small" />}
                      align="right"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* UNITS                                                             */}
      {/* ================================================================= */}
      <section>
        {/* Controls row */}
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(true)}
              className="relative inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
              aria-label="Open filters"
            >
              <FilterList fontSize="small" />
              <span>Filters</span>
              {hasUnitFilter && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                  1
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setEditingUnit(null);
                setShowUnitForm(true);
              }}
              disabled={!selectedFamily}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Add fontSize="small" />
              Add Unit
            </button>
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <div className="min-w-0 max-w-sm flex-1">{unitFilterEl}</div>
            {hasUnitFilter && (
              <button
                type="button"
                onClick={() => setUnitFilter("")}
                aria-label="Clear filter"
                title="Clear filter"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <Close fontSize="small" />
              </button>
            )}

            {/* Filter-by-family pill toggle */}
            <button
              type="button"
              onClick={() => filterUnitsByFamily(null)}
              aria-pressed={selectedFamily === null}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                selectedFamily === null
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              <ListAlt fontSize="small" />
              All
            </button>

            <button
              onClick={() => {
                setEditingUnit(null);
                setShowUnitForm(true);
              }}
              disabled={!selectedFamily}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Add fontSize="small" />
              Add Unit
            </button>
          </div>
        </div>

        {/* Active-family banner */}
        {selectedFamily && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <FolderOpen sx={{ fontSize: 14 }} />
            <span>
              Showing units in{" "}
              <span className="font-medium text-foreground">
                {unitFamilies.find((f) => f._id === selectedFamily)?.name ??
                  "—"}
              </span>
            </span>
            <button
              type="button"
              onClick={() => filterUnitsByFamily(null)}
              className="ml-auto rounded px-1.5 py-0.5 font-medium text-foreground transition hover:bg-muted"
            >
              Show all
            </button>
          </div>
        )}

        {/* Unit cards */}
        {visibleUnits.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <EmptyState
              isFiltering={hasUnitFilter}
              onNew={() => {
                setEditingUnit(null);
                setShowUnitForm(true);
              }}
              onClear={() => setUnitFilter("")}
              newLabel="Add Unit"
              emptyLabel={
                selectedFamily ? "No units in this family yet" : "No units yet"
              }
              filterLabel="No units match your search"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {visibleUnits.map((unit) => (
              <div
                key={unit._id}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {unit.name}{" "}
                      <span className="font-mono text-xs font-normal text-muted-foreground">
                        ({unit.symbol})
                      </span>
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {familyName(unit)}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        ×{unit.conversionFactor}
                      </span>
                      {unit.isBaseUnit && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          Base
                        </span>
                      )}
                    </div>
                  </div>

                  <PopoverMenu
                    items={getUnitMenuItems(unit)}
                    ariaLabel={`Actions for ${unit.name}`}
                    trigger={<MoreVert fontSize="small" />}
                    align="right"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* MOBILE FILTER SHEET                                               */}
      {/* ================================================================= */}
      <BottomSheet
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        title="Filters"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Family
            </label>
            {familyFilterEl}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Unit
            </label>
            {unitFilterEl}
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => {
                setFamilyFilter("");
                setUnitFilter("");
              }}
              disabled={!hasFamilyFilter && !hasUnitFilter}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(false)}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ================================================================= */}
      {/* FORMS                                                             */}
      {/* ================================================================= */}
      {showFamilyForm && (
        <FamilyForm
          family={editingFamily}
          onSubmit={handleFamilySubmit}
          onCancel={() => {
            setShowFamilyForm(false);
            setEditingFamily(null);
          }}
        />
      )}

      {showUnitForm && (
        <UnitForm
          unit={editingUnit}
          unitFamilies={unitFamilies}
          selectedFamily={selectedFamily}
          onSubmit={handleUnitSubmit}
          onCancel={() => {
            setShowUnitForm(false);
            setEditingUnit(null);
          }}
        />
      )}

      {/* ================================================================= */}
      {/* DELETE CONFIRMATIONS                                              */}
      {/* ================================================================= */}
      <ConfirmDialog
        isOpen={!!deleteFamilyTarget}
        onClose={() => setDeleteFamilyTarget(null)}
        onConfirm={confirmDeleteFamily}
        title="Delete unit family"
        message={`Are you sure you want to delete the unit family "${deleteFamilyTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
      />

      <ConfirmDialog
        isOpen={!!deleteUnitTarget}
        onClose={() => setDeleteUnitTarget(null)}
        onConfirm={confirmDeleteUnit}
        title="Delete unit"
        message={`Are you sure you want to delete the unit "${deleteUnitTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default UnitManagement;
