"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Region = {
  region: string;
  basePrice: number;
  averageDeliveryTime: string;
};

interface CarrierFormProps {
  initialData?: {
    _id?: string;
    name: string;
    contact: string;
    email: string;
    regionsServed: Region[];
    costWeight: number;
  };
  onSubmit: (data: any) => Promise<void>;
  submitLabel?: string;
}

export default function CarrierForm({
  initialData,
  onSubmit,
  submitLabel = "Create Carrier",
}: CarrierFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    contact: initialData?.contact || "",
    email: initialData?.email || "",
    regionsServed: initialData?.regionsServed || [
      { region: "", basePrice: 0, averageDeliveryTime: "" },
    ],
    costWeight: initialData?.costWeight || 0,
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegionChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    const updatedRegions = [...formData.regionsServed];
    updatedRegions[index] = {
      ...updatedRegions[index],
      [name]: name === "basePrice" ? parseFloat(value) : value,
    };
    setFormData((prev) => ({ ...prev, regionsServed: updatedRegions }));
  };

  const handleAddRegion = () => {
    setFormData((prev) => ({
      ...prev,
      regionsServed: [
        ...prev.regionsServed,
        { region: "", basePrice: 0, averageDeliveryTime: "" },
      ],
    }));
  };

  const handleRemoveRegion = (index: number) => {
    const updatedRegions = formData.regionsServed.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, regionsServed: updatedRegions }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        regionsServed: formData.regionsServed.map((r) => ({
          ...r,
          basePrice: parseFloat(r.basePrice as any),
        })),
        costWeight: parseFloat(formData.costWeight as any),
      };
      await onSubmit(payload);
      router.push("/sales/fulfillment");
      router.refresh();
    } catch (error) {
      console.error("Error submitting carrier:", error);
      alert("Failed to save carrier. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Carrier Name
        </label>
        <input
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Contact Number
        </label>
        <input
          name="contact"
          value={formData.contact}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Email (optional)
        </label>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted-foreground">
          Cost Weight (per kg)
        </label>
        <input
          name="costWeight"
          type="number"
          step="0.01"
          value={formData.costWeight}
          onChange={handleInputChange}
          required
          className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">
          Regions Served
        </label>
        {formData.regionsServed.map((region, index) => (
          <div
            key={index}
            className="flex flex-wrap gap-2 items-center mb-2 p-3 border border-border rounded-md"
          >
            <input
              name="region"
              value={region.region}
              onChange={(e) => handleRegionChange(index, e)}
              placeholder="Region"
              className="flex-1 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              name="basePrice"
              type="number"
              step="0.01"
              value={region.basePrice}
              onChange={(e) => handleRegionChange(index, e)}
              placeholder="Base Price"
              className="w-24 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              name="averageDeliveryTime"
              value={region.averageDeliveryTime}
              onChange={(e) => handleRegionChange(index, e)}
              placeholder="Delivery Time"
              className="flex-1 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => handleRemoveRegion(index)}
              className="text-destructive hover:text-destructive/80 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddRegion}
          className="text-primary hover:text-primary/80 text-sm font-medium"
        >
          + Add Region
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition disabled:opacity-50"
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
