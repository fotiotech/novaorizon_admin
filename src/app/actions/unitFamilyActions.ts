// lib/actions/unitFamilyActions.ts
'use server';

import { revalidatePath } from 'next/cache';
import UnitFamily from '@/models/UnitFamily';
import Unit from '@/models/Unit';
import { connection } from '@/utils/connection';

export async function createUnitFamily(formData: FormData) {
  try {
    await connection();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const baseUnit = formData.get('baseUnit') as string;

    const unitFamily = new UnitFamily({
      name,
      description,
      baseUnit
    });

    await unitFamily.save();
    
    revalidatePath('/unit-management');
    return { success: true, message: 'Unit family created successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateUnitFamily(id: string, formData: FormData) {
  try {
    await connection();
    
    const updateData = {
      name: formData.get('name'),
      description: formData.get('description'),
      baseUnit: formData.get('baseUnit')
    };

    await UnitFamily.findByIdAndUpdate(id, updateData);
    
    revalidatePath('/unit-management');
    return { success: true, message: 'Unit family updated successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteUnitFamily(id: string) {
  try {
    await connection();
    
    // Check if there are units in this family
    const unitsCount = await Unit.countDocuments({ unitFamily: id });
    if (unitsCount > 0) {
      return { success: false, message: 'Cannot delete unit family with existing units' };
    }

    await UnitFamily.findByIdAndDelete(id);
    
    revalidatePath('/unit-management');
    return { success: true, message: 'Unit family deleted successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getUnitFamilies() {
  try {
    await connection();
    const unitFamilies = await UnitFamily.find().sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(unitFamilies));
  } catch (error: any) {
    throw new Error(`Failed to fetch unit families: ${error.message}`);
  }
}