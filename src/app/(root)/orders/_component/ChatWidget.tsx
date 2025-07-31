// components/ChatWidget.jsx
import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "@/utils/firebaseConfig";

export default function ChatWidget({
  user,
  roomId = "default-room",
}: {
  user: any;
  roomId?: string;
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<any>();

  useEffect(() => {
    const msgsRef = collection(db, "chats", roomId, "messages");
    const q = query(msgsRef, orderBy("timestamp", "asc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs as any);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return unsubscribe;
  }, [roomId]);

  const sendMessage = async () => {
    if (!draft.trim()) return;
    const msgsRef = collection(db, "chats", roomId, "messages");
    const newMsg = {
      from: user?.name,
      text: draft.trim(),
      timestamp: serverTimestamp(),
    };
    

    try {
      // 1) add the message
      await addDoc(msgsRef, newMsg);

      // 2) upsert the room metadata
      const roomRef = doc(db, "chatRooms", roomId);
      await setDoc(
        roomRef,
        {
          roomId,
          name: user.name,
          avatar: user.avatarUrl,
          lastMessage: draft,
          lastTimestamp: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("🔥 Firestore write failed:", err);
    }
    setDraft("");
  };

  return (
    <div className="lg:space-x-10 w-full bg-white border rounded shadow-lg p-3">
      {messages.length > 0 && (
        <div className="h-64 overflow-y-auto mb-2 space-y-1">
          {messages.map((m: any) => (
            <div key={m.id} className="text-sm">
              <strong>{m.from}:</strong> {m.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
      <div className="flex">
        <input
          className="flex-1 border rounded-l px-2 py-1"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Votre message…"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          className="bg-blue-600 text-white px-3 rounded-r"
          onClick={sendMessage}
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
