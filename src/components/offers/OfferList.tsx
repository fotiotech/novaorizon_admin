"use client";

import { deleteOffer } from "@/app/actions/offers";

const OfferList = ({ offers }: { offers: any[] }) => {
  const handleDelete = async (id: string) => {
    await deleteOffer(id);
    // Optionally refresh the page or update state
  };

  return (
    <div className="bg-white shadow p-4 rounded text-sec">
      <h2 className="text-xl font-semibold mb-4">Offers</h2>
      {offers.length === 0 && <p>No offers available.</p>}
      <ul>
        {offers.map((offer) => (
          <li
            key={offer._id}
            className="flex justify-between items-center p-2 border-b"
          >
            <div>
              <p className="font-semibold">{offer.name}</p>
              <p className="text-sm text-gray-500">{offer.type}</p>
            </div>
            <button
              onClick={() => handleDelete(offer._id)}
              className="text-red-500"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OfferList;
