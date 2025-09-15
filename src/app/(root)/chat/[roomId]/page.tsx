// app/chat/[roomId]/page.tsx - Individual Chat Page
"use client";
import { useUser } from "@/app/context/UserContext";
import { useEffect, useState, useRef } from "react";
import { db } from "@/utils/firebasedb";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";

interface Message {
  id: string;
  from: string;
  text: string;
  sentAt?: any;
}

interface ChatPageProps {
  params: {
    roomId: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const { user } = useUser();
  const { roomId } = params;
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<any | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  const sendMessage = async () => {
    if (!draft.trim() || !user) return;
    const newMsg = {
      from: user.name || "user",
      text: draft.trim(),
      sentAt: serverTimestamp(),
    };

    try {
      if (!db) return;
      const msgRef = collection(db, "chats", roomId, "messages");
      await addDoc(msgRef, newMsg);

      // Update the last message in the chat room
      if (db && roomId) {
        const roomRef = doc(db, "chatRooms", roomId);
        await updateDoc(roomRef, {
          lastMessage:
            draft.trim().substring(0, 50) +
            (draft.trim().length > 50 ? "..." : ""),
          lastUpdated: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }

    setDraft("");
  };

  const updateMessage = async (id: string, newText: string) => {
    try {
      if (!db) return;
      const msgDoc = doc(db, "chats", roomId, "messages", id);
      await updateDoc(msgDoc, { text: newText });
    } catch (err) {
      console.error("Failed to update message:", err);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      if (!db) return;
      const msgDoc = doc(db, "chats", roomId, "messages", id);
      await deleteDoc(msgDoc);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  useEffect(() => {
    async function fetchRoom() {
      if (!db || !roomId) {
        setLoading(false);
        return;
      }

      try {
        const roomRef = doc(db, "chatRooms", roomId);
        const snap = await getDoc(roomRef);

        if (snap.exists()) {
          setRoom({
            roomId: snap.id,
            ...(snap.data() as any),
          });
        } else {
          // Room doesn't exist
          setRoom(null);
        }
      } catch (error) {
        console.error("Error fetching room:", error);
        setRoom(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();

    if (!db || !roomId) return;
    const msgsRef = collection(db, "chats", roomId, "messages");
    const q = query(msgsRef, orderBy("sentAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      setMessages(msgs);
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsubscribe();
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!room) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              title="chat"
              type="button"
              onClick={() => router.push("/chat")}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">
                {room.from || "Unknown User"}
              </h1>
              <p className="text-sm text-gray-500">
                {room.product || "No product specified"}
              </p>
            </div>
          </div>

          <Link
            href="/chat"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            All Chats
          </Link>
        </div>
      </div>

      {/* Chat Content */}
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          {room.cart && (
            <div className="mb-6 p-4 rounded-lg bg-white shadow-sm border">
              <h3 className="font-semibold mb-2 text-gray-900">
                Order Summary
              </h3>
              <ul className="space-y-2">
                {room.cart.map((item: any, i: number) => (
                  <li key={i} className="flex items-center space-x-3">
                    {item.imageUrl && (
                      <div className="relative h-12 w-12 rounded-md overflow-hidden">
                        <Image
                          src={item.imageUrl}
                          alt={item.name || "Product image"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {item.price}CFA
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="font-medium text-gray-700">Total:</span>
                <span className="font-bold">
                  {room.cart.total?.toFixed(2)}CFA
                </span>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="h-96 overflow-y-auto space-y-3 mb-4">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${
                      m.from === user?.name ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md rounded-lg px-4 py-2 ${
                        m.from === user?.name ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {m.from}
                          </p>
                          <p className="text-gray-900">{m.text}</p>
                        </div>
                        {m.from === user?.name && (
                          <div className="flex space-x-1 ml-2">
                            <button
                              className="text-blue-600 text-xs hover:text-blue-800"
                              onClick={() =>
                                updateMessage(
                                  m.id,
                                  prompt("Edit message:", m.text) || m.text
                                )
                              }
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 text-xs hover:text-red-800"
                              onClick={() => deleteMessage(m.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex">
              <input
                className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your message…"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                className="bg-blue-600 text-white px-4 rounded-r-lg hover:bg-blue-700 transition-colors"
                onClick={sendMessage}
                disabled={!draft.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
