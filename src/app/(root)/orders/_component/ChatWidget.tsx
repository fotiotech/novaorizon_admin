// components/ChatWidget.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { db } from "@/utils/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

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
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!draft.trim() || !user) return;
    const newMsg = {
      from: user?.name,
      text: draft.trim(),
      sentAt: serverTimestamp(),
    };

    try {
      const msgRef = collection(db, "chats", roomId, "messages");
      const roomRef = doc(db, "chatRooms", roomId);

      await addDoc(msgRef, newMsg);
      await setDoc(
        roomRef,
        {
          roomId,
          name: user.name,
          lastMessage: draft,
          sentAt: serverTimestamp(),
        },
        { merge: true }
      );
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
      <div className="flex-1 h-64 overflow-y-auto space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className="flex justify-between items-center  p-2 rounded-lg"
          >
            <div className="text-sm">
              <strong>{m.from}:</strong> {m.text}
            </div>
            {user?.name === m.from && (
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
