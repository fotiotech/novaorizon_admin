import React, { FC } from "react";
import { MoonLoader } from "react-spinners";

interface spinnerProps {
  loading?: boolean;
}

export default function Loading({ loading }: spinnerProps) {
  return (
    <div className="flex justify-center items-center w-full h-full p-2">
      <MoonLoader
        color="#5C83F7"
        loading={loading}
        size={30}
        aria-label="Loading Spinner"
        data-testid="loader"
      />
    </div>
  );
}
