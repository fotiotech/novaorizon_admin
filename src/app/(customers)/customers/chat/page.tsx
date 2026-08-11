// app/chat/page.tsx - Chat List Page
"use client";
import { useEffect, useState } from "react";
import { db } from "@/utils/firebasedb";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ChatRoom {
  roomId: string;
  name?: string;
  from?: string;
  product?: string;
  lastMessage?: string;
}

export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!db) return;
    const roomsRef = collection(db, "chatRooms");
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const parsedRooms = snapshot.docs.map((doc) => ({
        roomId: doc.id,
        ...(doc.data() as {
          name?: string;
          from?: string;
          product?: string;
          lastMessage?: string;
        }),
      }));
      setRooms(parsedRooms);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to delete this chat room?")) return;

    try {
      if (!db) return;
      // Delete the chat room document
      await deleteDoc(doc(db, "chatRooms", roomId));

      // Note: In a real application, you might also want to delete all messages in the room
      // This would require additional logic to delete the subcollection

      console.log("Chat room deleted successfully");
    } catch (error) {
      console.error("Error deleting chat room:", error);
      alert("Failed to delete chat room");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Chats</h1>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Home
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {rooms.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-lg">
                No active chats available.
              </p>
              <p className="text-gray-400 mt-2">
                Start a new conversation to see it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {rooms.map((room) => (
                <div
                  key={room.roomId}
                  className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <Link
                    href={`/chat/${room.roomId}`}
                    className="flex-1 cursor-pointer"
                  >
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {room.from || "Unknown User"}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {room.product || "No product specified"}
                      </p>
                      {room.lastMessage && (
                        <p className="text-gray-400 text-xs mt-1 truncate">
                          Last message: {room.lastMessage}
                        </p>
                      )}
                    </div>
                  </Link>

                  <button
                    onClick={() => handleDeleteRoom(room.roomId)}
                    className="ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete chat room"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
