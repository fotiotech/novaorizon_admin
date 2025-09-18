import Link from "next/link";
import React from "react";

const StoreConfig = () => {
  return (
    <div>
      <h1>Store Configuration</h1>
      <ul className="flex flex-col gap-3 py-3">
        <li className="bg-gray-700 rounded-lg hover:bg-gray-600 p-2">
          <Link href={"/store_config/hero_content"}>Hero</Link>{" "}
        </li>
        <li></li>
        <li></li>
      </ul>
    </div>
  );
};

export default StoreConfig;
