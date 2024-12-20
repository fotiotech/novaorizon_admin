"use client";

import { Offer } from "@/constant/types";
import { useEffect, useState } from "react";
import OfferForm from "../../../components/offers/OfferForm";
import OfferList from "../../../components/offers/OfferList";
import { readOffers } from "@/app/actions/offers";

const OffersPage = () => {
  const [offers, setOffers] = useState<Offer[]>([]); // Replace with fetch call to backend

  useEffect(() => {
    async function getOffer() {
      setOffers(await readOffers());
    }
    getOffer();
  }, []);

  return (
    <div className="">
      <h1 className="text-2xl font-bold mb-6">Manage Offers</h1>
      <OfferForm />
      <OfferList offers={offers} />
    </div>
  );
};

export default OffersPage;
