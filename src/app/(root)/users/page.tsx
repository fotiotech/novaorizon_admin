"use client";

import { Users as usersTypes } from "@/constant/types";
import React, { useEffect, useState } from "react";
import { DateComponent } from "@/components/Date";
import { findUsers } from "@/app/actions/users";

const Users = () => {
  const [users, setUsers] = useState<usersTypes[] | null>([]);

  useEffect(() => {
    async function getUsers() {
      const content = await findUsers();
      if (content) {
        setUsers(content as usersTypes[]);
      }
    }
    getUsers();
  }, []);

  return (
    <>
      <h2 className="text-2xl font-bold p-2">Users</h2>
      <ul className="flex flex-col gap-2 mt-6">
        {users &&
          users.map((user, index) => (
            <li
              key={index}
              className="flex items-center gap-3 p-2 rounded-lg border"
            >
              <span className="font-bold">{user.username}</span>
              <span>{user.email}</span>
              <span>{user.role}</span>
              <span className="text-green-600">{user.status}</span>
              <span>
                <DateComponent date={user.created_at as string} />
              </span>
            </li>
          ))}
      </ul>
    </>
  );
};

export default Users;
