import Link from "next/link";
import React from "react";

const Localization = () => {
  return (
    <div>
      <h3 className="p-3 font-bold">Localization</h3>
      <ul className="py-3">
        <li>
          <Link href={"/settings/local/unit"}>Units</Link>{" "}
        </li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </div>
  );
};

export default Localization;
