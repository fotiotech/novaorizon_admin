"use client";

import { signIn, useSession } from "next-auth/react";
import React from "react";

const Admin = () => {
  const session = useSession();
  if (!session) signIn();
  const user = session?.data?.user as any;

  return <>Admin {user?.name}</>;
};

export default Admin;
