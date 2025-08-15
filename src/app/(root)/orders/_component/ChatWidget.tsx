// components/ChatWidget.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "@/utils/firebaseConfig";
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
  setDoc,
  updateDoc,
} from "firebase/firestore";
import Image from "next/image";

interface ChatWidgetProps {
  user: { name: string } | null;
  roomId?: string;
}

interface Message {
  id: string;
  from: string;
  text: string;
  sentAt?: any;
}

export default function ChatWidget({
  user,
  roomId = "default-room",
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<any | null>(null);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!draft.trim() || !user) return;
    const newMsg = {
      from: "novaorizon",
      text: draft.trim(),
      sentAt: serverTimestamp(),
    };

    try {
      const msgRef = collection(db, "chats", roomId, "messages");
      const roomRef = doc(db, "chatRooms", roomId);

      await addDoc(msgRef, newMsg);
    } catch (err) {
      console.error("🔥 Firestore write failed:", err);
    }

    setDraft("");
  };

  const updateMessage = async (id: string, newText: string) => {
    try {
      const msgDoc = doc(db, "chats", roomId, "messages", id);
      await updateDoc(msgDoc, { text: newText });
    } catch (err) {
      console.error("🔥 Firestore update failed:", err);
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const msgDoc = doc(db, "chats", roomId, "messages", id);
      await deleteDoc(msgDoc);
    } catch (err) {
      console.error("🔥 Firestore delete failed:", err);
    }
  };

  useEffect(() => {
    async function fetchRoom() {
      const roomRef = doc(db, "chatRooms", roomId);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        setRoom({
          roomId: snap.id,
          ...(snap.data() as any),
        });
      }
    }
    fetchRoom();

    const msgsRef = collection(db, "chats", roomId, "messages");
    const q = query(msgsRef, orderBy("sentAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      setMessages(msgs);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });

    return () => unsubscribe();
  }, [roomId]);

  return (
    <div className="flex flex-col w-full rounded-xl shadow-lg p-4 space-y-3">
      {room?.cart && (
        <div className="mb-4 p-3 rounded-lg bg-gray-800 text-white shadow">
          <h3 className="font-semibold mb-1">Cart Summary</h3>
          <ul className="list-disc list-inside text-sm">
            {room.cart?.map((item: any, i: number) => (
              <li key={i} className="flex items-center gap-3">
                <Image
                  src={item.imageUrl}
                  width={100}
                  height={100}
                  alt="image"
                />
                <p>{item.name}</p>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-bold">
            Total: {room.cart?.total?.toFixed(2)}CFA
          </p>
        </div>
      )}
      <div className="flex-1 h-64 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className="flex justify-between items-center  p-2 rounded-lg"
          >
            <div className="text-sm w-full text-wrap">
              <strong>{m.from}:</strong> {m.text}
            </div>
            {m.from === "novaorizon" && (
              <div className="flex space-x-2">
                <button
                  className="text-blue-600 text-xs"
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
                  className="text-red-600 text-xs"
                  onClick={() => deleteMessage(m.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex">
        <input
          className="flex-1 border rounded-l-lg px-3 py-2 text-sm focus:outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Votre message…"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="bg-blue-600 text-white px-4 rounded-r-lg text-sm hover:bg-blue-700"
          onClick={sendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}
