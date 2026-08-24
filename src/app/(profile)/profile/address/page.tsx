"use client";

import { useState } from "react";
import { getUserAddresses, deleteAddress } from "@/app/actions/address";
import AddressForm from "../../_component/AddressForm";

export default function AddressesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addresses, setAddresses] = useState([]);

  // Fetch addresses on mount (using useEffect) or use Server Component with async

  const handleDelete = async (id: string) => {
    if (confirm("Delete this address?")) {
      await deleteAddress(id);
      // Refresh list
    }
  };

  return (
    <div>
      <button onClick={() => setShowForm(true)}>Add New Address</button>

      {showForm && (
        <AddressForm
          onSuccess={() => {
            setShowForm(false);
            // Refresh addresses
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {addresses.map((addr: any) => (
        <div key={addr._id}>
          <span>{addr.label}</span>
          <button onClick={() => setEditingAddress(addr)}>Edit</button>
          <button onClick={() => handleDelete(addr._id)}>Delete</button>
        </div>
      ))}

      {editingAddress && (
        <AddressForm
          initialData={editingAddress}
          onSuccess={() => {
            setEditingAddress(null);
            // Refresh addresses
          }}
          onCancel={() => setEditingAddress(null)}
        />
      )}
    </div>
  );
}
