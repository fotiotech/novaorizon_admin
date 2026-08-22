"use client";

import React from "react";
import MenuForm from "../../_component/MenuForm";
import { useSearchParams } from "next/navigation";

const EditMenu = () => {
  const id = useSearchParams().get("id");
  if (!id) return;
  return (
    <div>
      <MenuForm id={id} />{" "}
    </div>
  );
};

export default EditMenu;
