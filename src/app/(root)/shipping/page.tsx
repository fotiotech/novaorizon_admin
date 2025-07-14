"use client";

import { updateShipping } from "@/app/actions/shipping";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addShipping } from "@/app/store/slices/shippingSlice";
import { RootState } from "@/app/store/store";
import { fetchShipping } from "@/fetch/fetchShipping";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Shipping = () => {
  const dispatch = useAppDispatch();
  const shippings = useAppSelector((state: RootState) => state.shipping);
  const [selectedId, setSelectId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showReturnReason, setShowReturnReason] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const shipping = useAppSelector((state: RootState) =>
    selectedId ? state.shipping.byId[selectedId] : null
  );

  useEffect(() => {
    dispatch(fetchShipping());
  }, [dispatch]);

  const filteredShippingIds = statusFilter
    ? shippings.allIds.filter(
        (id) => shippings.byId[id]?.status === statusFilter
      )
    : shippings.allIds;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    if (!shipping) return;
    dispatch(
      addShipping({
        ...shipping,
        _id: selectedId,
        [name]: value,
        status: "assigned",
      })
    );
  }

  async function updateShippingInfos(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !shipping) return;
    try {
      await updateShipping(selectedId, shipping);
      toast.success("Shipping updated successfully");
    } catch (error) {
      toast.error("Failed to update shipping");
    }
  }

  async function changeStatus(newStatus: string) {
    if (!selectedId || !shipping) return;
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
    }
  }

  return (
    <div className="p-2 lg:p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2>Shipping</h2>
        <Link href="/shipping/manage_shipping">
          <button title="Add carrier" type="button" className="btn">
            Add Carrier
          </button>
        </Link>
      </div>

      <div className="flex gap-2 items-center">
        <label htmlFor="statusFilter">Filter by Status:</label>
        <select
          id="statusFilter"
          onChange={(e) => setStatusFilter(e.target.value || null)}
          className="border p-2 rounded"
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="assigned">Assigned</option>
          <option value="in-transit">In Transit</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
          <option value="returned">Returned</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <form onSubmit={updateShippingInfos} className="flex flex-col gap-4">
        <h2>Assign Shipping</h2>
        <div className="flex flex-col gap-2">
          <p>Select Order</p>
          <ul className="flex flex-col gap-3 h-44 overflow-y-auto rounded-lg border p-2 border-gray-600">
            {filteredShippingIds.map((id) => (
              <li key={id} className="flex flex-col gap-1">
                <p>#{shippings.byId[id]?.orderNumber || "Order " + id}</p>
                <div className="flex items-center gap-3">
                  <p>
                    {shippings.byId[id]?.firstName} {shippings.byId[id]?.email}
                  </p>
                  <p>{shippings.byId[id]?.status}</p>
                  <button
                    type="button"
                    onClick={() => setSelectId(shippings.byId[id]?._id)}
                    className="btn ml-2"
                  >
                    Select
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm text-gray-500">Driver:</p>
          <input
            title="assigned driver"
            type="text"
            name="assigned_driver"
            value={shipping?.assigned_driver || ""}
            placeholder="Assigned Driver"
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <p className="text-sm text-gray-500">Driver Number:</p>
          <input
            title="Driver Number"
            type="text"
            name="driver_number"
            value={shipping?.driver_number || ""}
            placeholder="Driver Number"
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <button type="submit" className="btn">
          Assign
        </button>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => changeStatus("cancelled")}
            disabled={shipping?.status !== "pending"}
            className="btn border border-red-500 text-red-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => changeStatus("in-transit")}
            disabled={shipping?.status !== "assigned"}
            className="btn border border-blue-500 text-blue-500 disabled:opacity-50"
          >
            Mark In-Transit
          </button>
          <button
            type="button"
            onClick={() => changeStatus("delivered")}
            disabled={shipping?.status !== "in-transit"}
            className="btn border border-green-500 text-green-500 disabled:opacity-50"
          >
            Mark Delivered
          </button>
          <button
            type="button"
            onClick={() => changeStatus("completed")}
            disabled={shipping?.status !== "delivered"}
            className="btn border border-gray-500 text-gray-500 disabled:opacity-50"
          >
            Complete
          </button>
          <button
            type="button"
            onClick={() => setShowReturnReason(true)}
            disabled={shipping?.status !== "delivered"}
            className="btn border border-yellow-500 text-yellow-600 disabled:opacity-50"
          >
            Return
          </button>
        </div>
      </form>

      <ReturnReasonModal
        open={showReturnReason}
        onClose={() => setShowReturnReason(false)}
        onConfirm={() => changeStatus("returned")}
        reason={returnReason}
        setReason={setReturnReason}
      />
    </div>
  );
};

export default Shipping;

const ReturnReasonModal = ({
  open,
  onClose,
  onConfirm,
  reason,
  setReason,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  reason: string;
  setReason: (value: string) => void;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded shadow-lg w-96 p-6">
        <h3 className="text-lg font-semibold mb-4">Return Reason</h3>
        <textarea
          className="w-full p-2 border rounded mb-4"
          placeholder="Enter reason for return..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-yellow-500 text-white rounded disabled:opacity-50"
          >
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  );
};
