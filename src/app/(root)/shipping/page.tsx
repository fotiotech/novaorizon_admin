"use client";

import { deleteShipping, updateShipping } from "@/app/actions/shipping";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { updateShippingLocal } from "@/app/store/slices/shippingSlice";
import { RootState } from "@/app/store/store";
import { fetchShipping } from "@/fetch/fetchShipping";
import Link from "next/link";
import React, { useEffect, useMemo, useCallback, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Status options for consistent reference
const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "processing", label: "processing" },
  { value: "assigned", label: "Assigned" },
  { value: "in-transit", label: "In Transit" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "returned", label: "Returned" },
  { value: "cancelled", label: "Cancelled" },
];

// Status transition rules
const STATUS_TRANSITIONS = {
  pending: ["cancelled", "assigned"],
  assigned: ["in-transit"],
  "in-transit": ["delivered"],
  delivered: ["completed", "returned"],
  returned: [],
  completed: [],
  cancelled: [],
};

const confirmDelete = async (id: string) => {
  if (window.confirm("Are you sure you want to delete this shipping?")) {
    await deleteShipping(id).catch(console.error);
  }
};

const Shipping = () => {
  const dispatch = useAppDispatch();
  const shippings = useAppSelector((state: RootState) => state.shipping);
  const [selectedId, setSelectId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showReturnReason, setShowReturnReason] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const shipping = useAppSelector((state: RootState) =>
    selectedId ? state.shipping.byId[selectedId] : null
  );

  useEffect(() => {
    const loadShippingData = async () => {
      setIsLoading(true);
      try {
        await dispatch(fetchShipping());
      } catch (error) {
        toast.error("Failed to load shipping data");
      } finally {
        setIsLoading(false);
      }
    };

    loadShippingData();
  }, [dispatch]);

  // Memoized filtered shipping IDs
  const filteredShippingIds = useMemo(() => {
    if (!statusFilter) return shippings.allIds;

    return shippings.allIds.filter(
      (id) => shippings.byId[id]?.status === statusFilter
    );
  }, [shippings, statusFilter]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      if (!shipping || !selectedId) return;

      // Only update the specific field, don't change status
      dispatch(
        updateShippingLocal({
          id: selectedId,
          changes: { [name]: value },
        })
      );
    },
    [shipping, selectedId, dispatch]
  );

  const updateShippingInfos = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedId || !shipping) return;

      setIsLoading(true);
      try {
        await updateShipping(selectedId, shipping);
        toast.success("Shipping updated successfully");
      } catch (error) {
        toast.error("Failed to update shipping");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedId, shipping]
  );

  const assignShipping = useCallback(async () => {
    if (!selectedId || !shipping) return;

    setIsLoading(true);
    try {
      const dataToSend = {
        ...shipping,
        status: "assigned",
        assigned_driver: shipping.assigned_driver || "",
        driver_number: shipping.driver_number || "",
      };

      await updateShipping(selectedId, dataToSend);
      toast.success("Shipping assigned successfully");
    } catch (error) {
      toast.error("Failed to assign shipping");
    } finally {
      setIsLoading(false);
    }
  }, [selectedId, shipping]);

  const changeStatus = useCallback(
    async (newStatus: string) => {
      if (!selectedId || !shipping) return;

      setIsLoading(true);
      try {
        const dataToSend = { ...shipping, status: newStatus };
        if (newStatus === "returned") {
          dataToSend.returnReason = returnReason;
        }
        await updateShipping(selectedId, dataToSend);
        toast.success(`Status updated to '${newStatus}'`);
        setShowReturnReason(false);
        setReturnReason("");
      } catch (error) {
        toast.error("Failed to update status");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedId, shipping, returnReason]
  );

  // Determine which status buttons to show based on current status
  const availableStatusTransitions = useMemo(() => {
    if (!shipping?.status) return [];
    return (
      STATUS_TRANSITIONS[shipping.status as keyof typeof STATUS_TRANSITIONS] ||
      []
    );
  }, [shipping?.status]);

  return (
    <div className=" lg:p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Shipping Management</h2>
        <Link href="/shipping/manage_shipping">
          <button
            title="Add carrier"
            type="button"
            className="btn-primary"
            disabled={isLoading}
          >
            Add Carrier
          </button>
        </Link>
      </div>

      <div className="flex gap-2 items-center">
        <label htmlFor="statusFilter" className="font-medium">
          Filter by Status:
        </label>
        <select
          id="statusFilter"
          value={statusFilter || ""}
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="border p-2 rounded w-40"
          disabled={isLoading}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Selection Panel */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3">Select Order</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-44">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto rounded-lg border p-3 border-gray-300">
              {filteredShippingIds.length === 0 ? (
                <li className="text-center py-4 text-gray-500">
                  No orders found
                </li>
              ) : (
                filteredShippingIds.map((id) => (
                  <ShippingListItem
                    key={id}
                    shipping={shippings.byId[id]}
                    onSelect={() => setSelectId(shippings.byId[id]?._id)}
                    isSelected={selectedId === id}
                  />
                ))
              )}
            </ul>
          )}
        </div>

        {/* Shipping Details Form */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-3">Shipping Details</h3>
          {shipping ? (
            <ShippingForm
              shipping={shipping}
              onChange={handleChange}
              onSubmit={updateShippingInfos}
              onAssign={assignShipping}
              onStatusChange={changeStatus}
              availableTransitions={availableStatusTransitions}
              onReturnClick={() => setShowReturnReason(true)}
              isLoading={isLoading}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              Select an order to view details
            </div>
          )}
        </div>
      </div>

      <ReturnReasonModal
        open={showReturnReason}
        onClose={() => setShowReturnReason(false)}
        onConfirm={() => changeStatus("returned")}
        reason={returnReason}
        setReason={setReturnReason}
        isLoading={isLoading}
      />
    </div>
  );
};

// Extracted Shipping List Item Component
const ShippingListItem = React.memo(
  ({
    shipping,
    onSelect,
    isSelected,
  }: {
    shipping: any;
    onSelect: () => void;
    isSelected: boolean;
  }) => (
    <li
      className={`p-3 rounded border ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
      }`}
    >
      <Link
        href={`/orders/order_details?orderNumber=${shipping?.orderNumber}`}
        className="text-blue-600 hover:underline font-medium"
      >
        #{shipping?.orderNumber || "Order " + shipping?._id}
      </Link>
      <div className="flex justify-between items-center mt-2">
        <div>
          <p className="text-sm">{shipping?.userId?.name}</p>
          <span className={`status-badge status-${shipping?.status}`}>
            {shipping?.status}
          </span>
        </div>
        <div>
          <button
            type="button"
            onClick={onSelect}
            className="btn-secondary text-sm py-1 px-3"
          >
            {isSelected ? "Selected" : "Select"}
          </button>
          <button
            type="button"
            onClick={() => confirmDelete(shipping?._id)}
            className="btn-secondary text-sm py-1 px-3"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  )
);

ShippingListItem.displayName = "ShippingListItem";

// Extracted Shipping Form Component
const ShippingForm = React.memo(
  ({
    shipping,
    onChange,
    onSubmit,
    onAssign,
    onStatusChange,
    availableTransitions,
    onReturnClick,
    isLoading,
  }: {
    shipping: any;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onAssign: () => void;
    onStatusChange: (status: string) => void;
    availableTransitions: string[];
    onReturnClick: () => void;
    isLoading: boolean;
  }) => {
    const isAssignable = shipping.status === "processing";

    return (
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Driver:
          </label>
          <input
            title="assigned driver"
            type="text"
            name="assigned_driver"
            value={shipping.assigned_driver || ""}
            placeholder="Assigned Driver"
            onChange={onChange}
            className="w-full p-2 border rounded"
            disabled={!isAssignable || isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Driver Number:
          </label>
          <input
            title="Driver Number"
            type="text"
            name="driver_number"
            value={shipping.driver_number || ""}
            placeholder="Driver Number"
            onChange={onChange}
            className="w-full p-2 border rounded"
            disabled={!isAssignable || isLoading}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAssign}
            disabled={
              !isAssignable ||
              isLoading ||
              !shipping.assigned_driver ||
              !shipping.driver_number
            }
            className="btn-primary flex-1"
          >
            {isLoading ? "Processing..." : "Assign Shipping"}
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-secondary flex-1"
          >
            {isLoading ? "Saving..." : "Save Details"}
          </button>
        </div>

        <div className="mt-4">
          <h4 className="font-medium mb-2">Update Status</h4>
          <div className="flex flex-wrap gap-2">
            {availableTransitions.includes("cancelled") && (
              <StatusButton
                status="cancelled"
                label="Cancel"
                onClick={() => onStatusChange("cancelled")}
                disabled={isLoading}
              />
            )}
            {availableTransitions.includes("in-transit") && (
              <StatusButton
                status="in-transit"
                label="Mark In-Transit"
                onClick={() => onStatusChange("in-transit")}
                disabled={isLoading}
              />
            )}
            {availableTransitions.includes("delivered") && (
              <StatusButton
                status="delivered"
                label="Mark Delivered"
                onClick={() => onStatusChange("delivered")}
                disabled={isLoading}
              />
            )}
            {availableTransitions.includes("completed") && (
              <StatusButton
                status="completed"
                label="Complete"
                onClick={() => onStatusChange("completed")}
                disabled={isLoading}
              />
            )}
            {availableTransitions.includes("returned") && (
              <button
                type="button"
                onClick={onReturnClick}
                disabled={isLoading}
                className="status-button status-returned"
              >
                Return
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }
);

ShippingForm.displayName = "ShippingForm";

// Status Button Component
const StatusButton = ({
  status,
  label,
  onClick,
  disabled,
}: {
  status: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) => {
  const statusColors = {
    cancelled: "border-red-500 text-red-600 hover:bg-red-50",
    "in-transit": "border-blue-500 text-blue-600 hover:bg-blue-50",
    delivered: "border-green-500 text-green-600 hover:bg-green-50",
    completed: "border-gray-500 text-gray-600 hover:bg-gray-50",
    returned: "border-yellow-500 text-yellow-600 hover:bg-yellow-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2 border rounded text-sm font-medium transition-colors ${
        statusColors[status as keyof typeof statusColors]
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
};

// Optimized Modal Component
const ReturnReasonModal = React.memo(
  ({
    open,
    onClose,
    onConfirm,
    reason,
    setReason,
    isLoading,
  }: {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    reason: string;
    setReason: (value: string) => void;
    isLoading: boolean;
  }) => {
    if (!open) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <h3 className="text-lg font-semibold mb-4">Return Reason</h3>
          <textarea
            className="w-full p-3 border rounded mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter reason for return..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!reason.trim() || isLoading}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Confirm Return"}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

ReturnReasonModal.displayName = "ReturnReasonModal";

export default Shipping;
