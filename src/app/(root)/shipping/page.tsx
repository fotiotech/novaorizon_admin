"use client";

import { updateShipping } from "@/app/actions/shipping";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addShipping } from "@/app/store/slices/shippingSlice";
import { RootState } from "@/app/store/store";
import { fetchShipping } from "@/fetch/fetchShipping";
import Link from "next/link";
import React, { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const Shipping = () => {
  const dispatch = useAppDispatch();
  const shippings = useAppSelector((state: RootState) => state.shipping);
  const [selectedId, setSelectId] = React.useState<string | null>(null);
  const shipping = useAppSelector((state: RootState) =>
    selectedId ? state.shipping.byId[selectedId] : null
  );
  useEffect(() => {
    dispatch(fetchShipping());
  }, [dispatch]);

  const pendingShipping =
    shippings.allIds.length > 0
      ? shippings.allIds.filter(
          (id) => shippings.byId[id]?.status === "pending"
        )
      : null;

  const assignedShipping =
    shippings.allIds.length > 0
      ? shippings.allIds.filter(
          (id) => shippings.byId[id]?.status === "assigned"
        )
      : null;

  const selectedShipping =
    pendingShipping?.length! > 0
      ? pendingShipping?.filter((id) => shippings.byId[id]?._id === selectedId)
      : null;

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
    await updateShipping(selectedId, shipping);
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
      <form onSubmit={updateShippingInfos} className="flex flex-col gap-4">
        <h2>Assign Shipping</h2>
        <div className="flex flex-col gap-2">
          <p>Select Order</p>
          <ul className="flex flex-col gap-3">
            {pendingShipping?.map((id) => (
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
      </form>

      <div className="flex flex-col gap-2">
        <p>Assigned Orders</p>
        <ul className="flex flex-col gap-3">
          {assignedShipping?.map((id) => (
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
    </div>
  );
};

export default Shipping;
