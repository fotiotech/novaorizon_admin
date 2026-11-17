// lib/actions/unitFamilyActions.ts
"use server";
import { requireAdmin } from "@/lib/authz";

import { revalidatePath } from "next/cache";
import { apiData, apiFetch } from "@/lib/server-api";

export async function createUnitFamily(formData: FormData) {
  await requireAdmin();
  try {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const baseUnit = formData.get("baseUnit") as string;

    await apiFetch("/unit-families", {
      method: "POST",
      body: { name, description, baseUnit },
    });

    revalidatePath("/unit-management");
    return { success: true, message: "Unit family created successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateUnitFamily(id: string, formData: FormData) {
  await requireAdmin();
  try {
    const updateData = {
      name: formData.get("name"),
      description: formData.get("description"),
      baseUnit: formData.get("baseUnit"),
    };

    await apiFetch(`/unit-families/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: updateData,
    });

    revalidatePath("/unit-management");
    return { success: true, message: "Unit family updated successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteUnitFamily(id: string) {
  await requireAdmin();
  try {
    await apiFetch(`/unit-families/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    revalidatePath("/unit-management");
    return { success: true, message: "Unit family deleted successfully" };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getUnitFamilies() {
  await requireAdmin();
  try {
    const unitFamilies = await apiData<any[]>("/unit-families");
    return unitFamilies ?? [];
  } catch (error: any) {
    throw new Error(`Failed to fetch unit families: ${error.message}`);
  }
}
