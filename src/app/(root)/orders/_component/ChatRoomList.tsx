"use client";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

interface ChatRoom {
  roomId: string;
  name?: string;
  from?: string;
  product?: string;
  lastMessage?: string;
}

interface ChatRoomListProps {
  onSelectRoom: (roomId: string) => void;
}

export default function ChatRoomList({ onSelectRoom }: ChatRoomListProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    if(!db) return;
    const roomsRef = collection(db, "chatRooms");
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const parsedRooms = snapshot.docs.map((doc) => ({
        roomId: doc.id,
        ...(doc.data() as { name?: string }),
      }));
      setRooms(parsedRooms);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-2 lg:p-4 w-64 space-y-2 overflow-y-auto">
      <h2 className="font-bold mb-2 text-lg">Active Chats</h2>
      {rooms.length === 0 ? (
        <p className="text-gray-400">No active chats.</p>
      ) : (
        rooms.map((room) => (
          <div
            key={room.roomId}
            onClick={() => onSelectRoom(room.roomId)}
            className="block w-full text-left px-3 py-2 rounded hover:bg-gray-700 transition-colors"
          >
            <p>{room.from}</p>
            <p className="line-clamp-1 text-gray-400">{room.product}</p>
          </div>
        ))
      )}
    </div>
  );
}
