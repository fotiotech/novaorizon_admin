"use client";

import { useState, useEffect } from "react";
import {
  createCarrier,
  getCarriers,
  updateCarrier,
  deleteCarrier,
} from "@/app/actions/carrier";

type Region = {
  [key: string]: string | number; // Allows dynamic indexing
  region: string;
  basePrice: number;
  averageDeliveryTime: string;
};

export default function CarriersPage() {
  const [carriers, setCarriers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    regionsServed: [
      { region: "", basePrice: 0, averageDeliveryTime: "" },
    ] as Region[],
    costWeight: 0,
  });
  const [editingCarrierId, setEditingCarrierId] = useState<string | null>(null);

  // Fetch carriers on load
  useEffect(() => {
    async function fetchCarriers() {
      const data = await getCarriers();
      setCarriers(data);
    }
    fetchCarriers();
  }, []);

  // Handle general input fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle regions fields
  const handleRegionChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    const updatedRegions = [...formData.regionsServed];

    // Cast `name` to a key of the region object
    updatedRegions[index][name as keyof (typeof updatedRegions)[typeof index]] =
      name === "basePrice" ? parseFloat(value) : value; // Ensure `basePrice` is a number

    setFormData((prev) => ({ ...prev, regionsServed: updatedRegions }));
  };

  // Add new region field
  const handleAddRegion = () => {
    setFormData((prev) => ({
      ...prev,
      regionsServed: [
        ...prev.regionsServed,
        { region: "", basePrice: 0, averageDeliveryTime: "" },
      ],
    }));
  };

  // Remove a region field
  const handleRemoveRegion = (index: number) => {
    const updatedRegions = formData.regionsServed.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, regionsServed: updatedRegions }));
  };

  // Submit form (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const carrierData = {
      name: formData.name,
      contact: formData.contact,
      email: formData.email,
      regionsServed: formData.regionsServed.map((region) => ({
        region: region.region,
        basePrice: parseFloat(region.basePrice as any), // Ensure basePrice is a number
        averageDeliveryTime: region.averageDeliveryTime,
      })),
      costWeight: formData.costWeight,
    };

    // Send the carrierData to your backend
    try {
      if (editingCarrierId) {
        await updateCarrier(editingCarrierId, carrierData);
      } else {
        await createCarrier(carrierData);
      }
    } catch (error) {
      console.error("Error creating/updating carrier:", error);
    }
  };

  // Delete carrier
  const handleDelete = async (id: string) => {
    await deleteCarrier(id);
    setCarriers((prev) => prev.filter((carrier) => carrier._id !== id));
  };

  // Edit carrier
  const handleEdit = (carrier: any) => {
    setEditingCarrierId(carrier._id);
    setFormData({
      name: carrier.name,
      contact: carrier.contact,
      email: carrier.email || "",
      regionsServed: carrier.regionsServed,
      costWeight: carrier.costWeight,
    });
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Carriers</h1>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-4 space-y-4">
        {/* Carrier Name */}
        <input
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Carrier Name"
          className="border p-2 w-full bg-transparent"
        />

        {/* Contact Number */}
        <input
          name="contact"
          value={formData.contact}
          onChange={handleInputChange}
          placeholder="Contact Number"
          className="border p-2 w-full bg-transparent"
        />

        {/* Email (optional) */}
        <input
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="Email (optional)"
          className="border p-2 w-full bg-transparent"
        />

        {/* Regions Served */}
        {formData.regionsServed.map((region, index) => (
          <div key={index} className="flex space-x-2">
            {/* Region */}
            <input
              name="region"
              value={region.region}
              onChange={(e) => handleRegionChange(index, e)}
              placeholder="Region"
              className="border p-2 w-full bg-transparent"
            />
            {/* Base Price */}
            <input
              name="basePrice"
              type="number"
              value={region.basePrice}
              onChange={(e) => handleRegionChange(index, e)}
              placeholder="Base Price"
              className="border p-2 w-full bg-transparent"
            />
            {/* Average Delivery Time */}
            <input
              name="averageDeliveryTime"
              value={region.averageDeliveryTime}
              onChange={(e) => handleRegionChange(index, e)}
              placeholder="Average Delivery Time"
              className="border p-2 w-full bg-transparent"
            />
            <button
              type="button"
              onClick={() => handleRemoveRegion(index)}
              className="text-red-500"
            >
              Remove
            </button>
          </div>
        ))}

        {/* Add Region Button */}
        <button
          type="button"
          onClick={handleAddRegion}
          className="bg-green-500 text-white py-2 px-4"
        >
          Add Region
        </button>

        {/* Cost Per Km */}
        <div>
          <label htmlFor="costWeight">Cost Weight:</label>
          <input
            type="number"
            name="costWeight"
            value={formData.costWeight}
            onChange={handleInputChange}
            placeholder="Cost per Km"
            className="border p-2 w-full bg-transparent"
          />
        </div>

        {/* Submit Button */}
        <button type="submit" className="bg-blue-500 text-white py-2 px-4">
          {editingCarrierId ? "Update Carrier" : "Add Carrier"}
        </button>
      </form>

      {/* Carrier List */}
      <ul className="space-y-4">
        {carriers.map((carrier) => (
          <li
            key={carrier._id}
            className="border p-4 flex flex-col justify-between "
          >
            <div>
              <h2 className="font-bold">{carrier.name}</h2>
              <div className="flex flex-col gap-2 my-2">
                <p>Contact: {carrier.contact}</p>
                <p>Email: {carrier.email || "N/A"}</p>
                <p>
                  Regions:
                  <ul className="list-disc ml-5">
                    {carrier.regionsServed.map((region: any) => (
                      <li key={region._id}>
                        {region.region}: {region.basePrice} (Avg Delivery:{" "}
                        {region.averageDeliveryTime})
                      </li>
                    ))}
                  </ul>
                </p>
                <p>Cost per Weight: {carrier.costWeight}</p>
              </div>
            </div>
            <div className="flex space-x-2 justify-end mb-3">
              <button
                className="bg-yellow-500 text-white py-1 px-2"
                onClick={() => handleEdit(carrier)}
              >
                Edit
              </button>
              <button
                className="bg-red-500 text-white py-1 px-2"
                onClick={() => handleDelete(carrier._id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
