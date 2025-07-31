// components/ChatRoomList.jsx
"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/utils/firebaseConfig"; // Adjust the import path as necessary
export default function ChatRoomList({ onSelectRoom }) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "chatRooms"),
      orderBy("lastTimestamp", "desc")
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data());
      setRooms(data);
    });
  }, []);

  return (
    <div className="p-4 border-r border-gray-600 w-64 space-y-2">
      <h2 className="font-bold mb-2">Active Chats</h2>
      {rooms.map((room) => (
        <button
          key={room.roomId}
          className="block w-full text-left p-2 hover:bg-gray-100 rounded"
          onClick={() => onSelectRoom(room.roomId)}
        >
          <div className="font-medium">#{room.name}</div>
          <div className="text-sm truncate">{room.lastMessage}</div>
        </button>
      ))}
    </div>
  );
}
