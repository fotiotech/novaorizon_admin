"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { updateOffer, createOffer } from "@/app/actions/offers";
import { Offer } from "@/constant/types"; // assuming Offer is your type
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { v4 as uuidv4 } from "uuid";

type OfferFormProps = {
  initialData?: Offer; // Assuming Offer type exists
};

const OfferForm = ({ initialData }: OfferFormProps) => {
  const dispatch = useAppDispatch();
    const offer = useAppSelector((state) => state.offer);
    const id = offer.allIds.length ? offer.allIds[0] : uuidv4();
  // Use react-hook-form to manage form state
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Offer>({
    defaultValues: initialData || {
      name: "",
      type: "percentage",
      discountValue: 0,
      conditions: { startDate: "", endDate: "", minPurchaseAmount: 0 },
      isActive: true,
    },
  });

  // Effect hook to set initial data when present
  useEffect(() => {
    if (initialData) {
      setValue("name", initialData.name);
      setValue("type", initialData.type);
      setValue("discountValue", initialData.discountValue);
      setValue(
        "conditions.startDate",
        initialData?.conditions?.startDate || ""
      );
      setValue("conditions.endDate", initialData?.conditions?.endDate || "");
      setValue(
        "conditions.minPurchaseAmount",
        initialData?.conditions?.minPurchaseAmount
      );
      setValue("isActive", initialData.isActive);
    }
  }, [initialData, setValue]);

  const onSubmit = async (data: Offer) => {
    if (initialData?._id) {
      await updateOffer(initialData._id, data as any);
    } else {
      await createOffer(data as any);
    }
    // Optionally refresh the page or update the state
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-4 bg-gray-100 rounded mb-6 text-sec"
    >
      <h2 className="text-xl font-semibold mb-4">
        {initialData ? "Edit Offer" : "Create Offer"}
      </h2>

      <label className="block mb-2">Offer Name</label>
      <input
        {...register("name", { required: "Offer name is required" })}
        className="w-full p-2 mb-4 border rounded"
        placeholder="Enter offer name"
      />
      {errors.name && <p className="text-red-500">{errors.name.message}</p>}

      <label className="block mb-2">Type</label>
      <select
        {...register("type", { required: "Offer type is required" })}
        className="w-full p-2 mb-4 border rounded"
      >
        <option value="percentage">Percentage</option>
        <option value="fixed">Fixed Amount</option>
        <option value="bogo">Buy One Get One</option>
        <option value="free_shipping">Free Shipping</option>
        <option value="bundle">Bundle</option>
      </select>
      {errors.type && <p className="text-red-500">{errors.type.message}</p>}

      <label className="block mb-2">Discount Value</label>
      <input
        type="number"
        {...register("discountValue", {
          required: "Discount value is required",
        })}
        className="w-full p-2 mb-4 border rounded"
        placeholder="Enter discount value"
      />
      {errors.discountValue && (
        <p className="text-red-500">{errors.discountValue.message}</p>
      )}

      <label className="block mb-2">Start Date</label>
      <input
        type="date"
        {...register("conditions.startDate", {
          required: "Start date is required",
        })}
        className="w-full p-2 mb-4 border rounded"
      />
      {errors.conditions?.startDate && (
        <p className="text-red-500">{errors.conditions.startDate.message}</p>
      )}

      <label className="block mb-2">End Date</label>
      <input
        type="date"
        {...register("conditions.endDate", {
          required: "End date is required",
        })}
        className="w-full p-2 mb-4 border rounded"
      />
      {errors.conditions?.endDate && (
        <p className="text-red-500">{errors.conditions.endDate.message}</p>
      )}

      <label className="block mb-2">Minimum Purchase Amount</label>
      <input
        type="number"
        {...register("conditions.minPurchaseAmount", {
          required: "Minimum purchase amount is required",
        })}
        className="w-full p-2 mb-4 border rounded"
        placeholder="Enter minimum purchase amount"
      />
      {errors.conditions?.minPurchaseAmount && (
        <p className="text-red-500">
          {errors.conditions.minPurchaseAmount.message}
        </p>
      )}

      <label className="block mb-2">Active</label>
      <input type="checkbox" {...register("isActive")} className="mb-4" />

      <button
        type="submit"
        className="w-full bg-blue-500 text-white p-2 rounded"
      >
        {initialData ? "Update Offer" : "Create Offer"}
      </button>
    </form>
  );
};

export default OfferForm;
