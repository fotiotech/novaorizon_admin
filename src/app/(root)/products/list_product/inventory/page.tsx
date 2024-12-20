import Link from "next/link";
import React from "react";

const Inventory = () => {
  return (
    <div>
      Inventory{" "}
      <div className="flex justify-between items-center mt-6">
        <Link
          href={"/products/list_product/variants"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Back
        </Link>
        <Link
          href={"/products/list_product/reviews_final"}
          className="bg-blue-500 text-white p-2 rounded"
        >
          Next
        </Link>
      </div>
    </div>
  );
};

export default Inventory;
