// components/ChatRoomList.jsx
"use client";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/utils/firebaseConfig"; // Adjust the import path as necessary
export default function ChatRoomList({ onSelectRoom }: { onSelectRoom: any }) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "chatRooms"),
      orderBy("lastTimestamp", "desc")
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data());
      setRooms(data as any);
    });
  }, []);

  return (
    <div className="p-4 border-r border-gray-600 w-64 space-y-2">
      <h2 className="font-bold mb-2">Active Chats</h2>
      {rooms.length === 0 ? (
        <p className="text-gray-400">No active chats.</p>
      ) : (
        rooms.map((room: any) => (
          <button key={room.roomId} onClick={() => onSelectRoom(room.roomId)}>
            {room.name || room.roomId}
          </button>
        ))
      )}
    </div>
  );
}
