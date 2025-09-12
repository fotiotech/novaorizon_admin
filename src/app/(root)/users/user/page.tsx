"use client";

import React, { useEffect } from "react";
import { DateComponent } from "@/components/Date";
import { fetchUser } from "@/fetch/fetchUser";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { RootState } from "@/app/store/store";

const Users = () => {
  const dispatch = useAppDispatch();
  const users = useAppSelector((state: RootState) => state.user);

  useEffect(() => {
    dispatch(fetchUser());
  }, [dispatch]);

  return (
    <>
      <h2 className="text-2xl font-bold p-2">Users</h2>
      <ul className="flex flex-col gap-2 mt-6">
        {users.allIds &&
          users.allIds.map((index) => {
            const user = users.byId[index];
            return (
              <li
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg border"
              >
                <span className="font-bold line-clamp-1">{user.username}</span>
                <span>{user.email}</span>
                <span>{user.role}</span>
                <span className="text-green-600">{user.status}</span>
                <span className="line-clamp-1">
                  <DateComponent date={user.created_at as string} />
                </span>
              </li>
            );
          })}
      </ul>
    </>
  );
};

export default Users;
