import React, { FC } from "react";
import { MoonLoader } from "react-spinners";

export default function Spinner() {
  return (
    <div className="flex justify-center items-center text-center w-full h-full p-2">
      <MoonLoader color="#5C83F7" speedMultiplier={0.4} size={28} />
    </div>
  );
}
