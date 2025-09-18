import Link from "next/link";
import React from "react";

const Localization = () => {
  return (
    <div>
      Localization{" "}
      <ul>
        <li>
          <Link href={"/settings/unit"}>Units</Link>{" "}
        </li>
        <li></li>
        <li></li>
        <li></li>
      </ul>
    </div>
  );
};

export default Localization;
