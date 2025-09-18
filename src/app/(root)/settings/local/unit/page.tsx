// components/UnitManagement.tsx (partial update)
'use client';

import { getUnits, updateUnit, createUnit, deleteUnit } from '@/app/actions/unit';
import { getUnitFamilies, updateUnitFamily, createUnitFamily, deleteUnitFamily } from '@/app/actions/unitFamilyActions';
import React, { useState, useEffect } from 'react';
import FamilyForm from './_component/FamilyForm';
import UnitForm from './_component/UnitForm';


// Add these interfaces at the top of the file
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

const UnitManagement = () => {
  const [unitFamilies, setUnitFamilies] = useState<UnitFamily[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingFamily, setEditingFamily] = useState<UnitFamily | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  useEffect(() => {
    loadUnitFamilies();
    loadUnits();
  }, []);

  const loadUnitFamilies = async () => {
    try {
      const families = await getUnitFamilies();
      setUnitFamilies(families);
    } catch (error) {
      console.error('Failed to load unit families:', error);
    }
  };

  const loadUnits = async (familyId?: string) => {
    try {
      const unitsData = await getUnits(familyId);
      setUnits(unitsData);
    } catch (error) {
      console.error('Failed to load units:', error);
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

  const handleDeleteFamily = async (id: string) => {
    if (confirm('Are you sure you want to delete this unit family?')) {
      await deleteUnitFamily(id);
      loadUnitFamilies();
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (confirm('Are you sure you want to delete this unit?')) {
      await deleteUnit(id);
      loadUnits(selectedFamily as string);
    }
  };

  const filterUnitsByFamily = (familyId: string) => {
    setSelectedFamily(familyId);
    loadUnits(familyId);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Unit Management</h1>
      
      {/* Unit Families Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Unit Families</h2>
          <button 
            onClick={() => setShowFamilyForm(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Add Family
          </button>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unitFamilies.map(family => (
            <div key={family._id} className="border p-4 rounded">
              <h3 className="font-semibold">{family.name}</h3>
              <p className="text-sm text-gray-600">{family.description}</p>
              <p className="text-sm">Base Unit: {family.baseUnit}</p>
              <div className="mt-2 flex space-x-2">
                <button 
                  onClick={() => {
                    setEditingFamily(family);
                    setShowFamilyForm(true);
                  }}
                  className="text-blue-500"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteFamily(family._id)}
                  className="text-red-500"
                >
                  Delete
                </button>
                <button 
                  onClick={() => filterUnitsByFamily(family._id)}
                  className="text-green-500"
                >
                  View Units
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Units Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Units {selectedFamily && `- ${unitFamilies.find(f => f._id === selectedFamily)?.name}`}
          </h2>
          <button 
            onClick={() => setShowUnitForm(true)}
            className="bg-green-500 text-white px-4 py-2 rounded"
            disabled={!selectedFamily}
          >
            Add Unit
          </button>
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {units.map((unit:any) => (
            <div key={unit._id} className="border p-4 rounded">
              <h3 className="font-semibold">{unit.name} ({unit.symbol})</h3>
              <p className="text-sm">Family: {unit.unitFamily.name}</p>
              <p className="text-sm">Conversion: {unit.conversionFactor}</p>
              <p className="text-sm">{unit.isBaseUnit ? 'Base Unit' : 'Derived Unit'}</p>
              <div className="mt-2 flex space-x-2">
                <button 
                  onClick={() => {
                    setEditingUnit(unit);
                    setShowUnitForm(true);
                  }}
                  className="text-blue-500"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteUnit(unit._id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Form components would be defined here...
// FamilyForm and UnitForm components for handling input

export default UnitManagement;