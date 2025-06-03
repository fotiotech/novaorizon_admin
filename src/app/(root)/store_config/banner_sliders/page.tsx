import Link from "next/link";
import React from "react";

const Settings = () => {
  return (
    <>
      <div>
        <h2>Banners & Sliders</h2>
      </div>
      <div>
        <ul className="mt-4">
          <Link href={"/store_config/banner_sliders/hero_content"}>
            <li className="p-2 border rounded-lg ">Hero Content</li>
          </Link>
        </ul>
      </div>
    </>
  );
};

export default Settings;
