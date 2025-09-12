"use client"

import Link from "next/link";
import React from "react";

const ContentMerchandising = () => {
  return (
    <div>
      ContentMerchandising{" "}
      <div>
        {" "}
        <ul>
          <li>
            <Link href={"/content_merchandising/menus"}>Menus</Link>{" "}
          </li>
          <li>
            <Link href={"/content_merchandising/collection"}>Collections</Link>{" "}
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ContentMerchandising;
