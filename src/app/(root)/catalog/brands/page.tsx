"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { getBrands, createBrand, updateBrand, deleteBrand } from "@/app/actions/brand";
import { Brand } from "@/constant/types";

const Brands = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [formData, setFormData] = useState<Brand>({ _id: "", name: "", logoUrl: "", status: "active" });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function fetchBrands() {
      const data = await getBrands();
      setBrands(data);
    }
    fetchBrands();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Brand name is required!");
      return;
    }

    try {
      if (isEditing) {
        await updateBrand(formData._id as string, formData);
      } else {
        await createBrand(formData);
      }
      const updatedBrands = await getBrands();
      setBrands(updatedBrands);
      setFormData({ _id: "", name: "", logoUrl: "", status: "active" });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving brand:", error);
    }
  };

  const handleEdit = (brand: Brand) => {
    setFormData(brand);
    setIsEditing(true);
  };

  const handleDelete = async (brandId: string) => {
    if (confirm("Are you sure you want to delete this brand?")) {
      await deleteBrand(brandId);
      const updatedBrands = await getBrands();
      setBrands(updatedBrands);
    }
  };

  return (
    <div className="">
      <h2 className="font-bold text-xl mb-4">Brands</h2>
      <form onSubmit={handleSubmit} className="mb-4">
        <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Brand Name" className="p-2 mb-2 rounded-lg w-full bg-transparent" required />
        <input type="url" name="logoUrl" value={formData.logoUrl || ""} onChange={handleInputChange} placeholder="Logo URL" className="p-2 mb-2 rounded-lg w-full bg-transparent" required />
        <button type="submit" className="btn text-sm">{isEditing ? "Update Brand" : "Create Brand"}</button>
      </form>
      <ul>
        {brands.map((brand) => (
          <li key={brand._id} className="flex justify-between mb-2">
            <span>{brand.name}</span>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(brand)} className="btn-edit text-sm">Edit</button>
              <button onClick={() => handleDelete(brand._id as string)} className="btn-delete text-sm">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Brands;
