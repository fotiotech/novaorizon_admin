// lib/actions/unitActions.ts
'use server';
import { connection } from '@/utils/connection';
import { revalidatePath } from 'next/cache';
import Unit from '@/models/Unit';
import UnitFamily from '@/models/UnitFamily';


export async function createUnit(formData: FormData) {
  try {
    await connection();
    
    const unitData = {
      name: formData.get('name'),
      symbol: formData.get('symbol'),
      unitFamily: formData.get('unitFamily'),
      conversionFactor: parseFloat(formData.get('conversionFactor') as string),
      isBaseUnit: formData.get('isBaseUnit') === 'true'
    };

    const unit = new Unit(unitData);
    await unit.save();
    
    revalidatePath('/attributes/unit');
    return { success: true, message: 'Unit created successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateUnit(id: string, formData: FormData) {
  try {
    await connection();
    
    const updateData = {
      name: formData.get('name'),
      symbol: formData.get('symbol'),
      conversionFactor: parseFloat(formData.get('conversionFactor') as string),
      isBaseUnit: formData.get('isBaseUnit') === 'true'
    };

    await Unit.findByIdAndUpdate(id, updateData);
    
    revalidatePath('/attributes/unit');
    return { success: true, message: 'Unit updated successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteUnit(id: string) {
  try {
    await connection();
    await Unit.findByIdAndDelete(id);
    
    revalidatePath('/attributes/unit');
    return { success: true, message: 'Unit deleted successfully' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getUnits(unitFamilyId?: string) {
  try {
    await connection();
    const query = unitFamilyId ? { unitFamily: unitFamilyId } : {};
    const units = await Unit.find(query).populate('unitFamily').sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(units));
  } catch (error: any) {
    throw new Error(`Failed to fetch units: ${error.message}`);
  }
}