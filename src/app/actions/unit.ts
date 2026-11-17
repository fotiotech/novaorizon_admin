// lib/actions/unitActions.ts
"use server";
import { requireAdmin } from "@/lib/authz";

import { revalidatePath } from "next/cache";
import { apiData, apiFetch } from "@/lib/server-api";

export async function createUnit(formData: FormData) {
  await requireAdmin();
  try {
    const unitData = {
      name: formData.get("name"),
      symbol: formData.get("symbol"),
      unitFamily: formData.get("unitFamily"),
      conversionFactor: parseFloat(formData.get("conversionFactor") as string),
      isBaseUnit: formData.get("isBaseUnit") === "true",
    };

    await apiFetch("/units", { method: "POST", body: unitData });

    revalidatePath("/attributes/unit");
    return { success: true, message: "Unit created successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateUnit(id: string, formData: FormData) {
  await requireAdmin();
  try {
    const updateData = {
      name: formData.get("name"),
      symbol: formData.get("symbol"),
      conversionFactor: parseFloat(formData.get("conversionFactor") as string),
      isBaseUnit: formData.get("isBaseUnit") === "true",
    };

    await apiFetch(`/units/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: updateData,
    });

    revalidatePath("/attributes/unit");
    return { success: true, message: "Unit updated successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteUnit(id: string) {
  await requireAdmin();
  try {
    await apiFetch(`/units/${encodeURIComponent(id)}`, { method: "DELETE" });

    revalidatePath("/attributes/unit");
    return { success: true, message: "Unit deleted successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getUnits(unitFamilyId?: string) {
  await requireAdmin();
  try {
    const units = await apiData<any[]>("/units", {
      query: unitFamilyId ? { unitFamilyId } : undefined,
    });
    return units ?? [];
  } catch (error: any) {
    throw new Error(`Failed to fetch units: ${error.message}`);
  }
}
