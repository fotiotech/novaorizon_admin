import Link from "next/link";
import React from "react";

const Shipping = () => {
  return (
    <div>
      <div className="flex justify-between items-center">
        <h2>Shipping</h2>
        <Link href={"/shipping/manage_shipping"}><button title="Add carrier" type="button" className="btn">
          Add Carrier
        </button>
        </Link>
        
      </div>
    </div>
  );
};

export default Shipping;
