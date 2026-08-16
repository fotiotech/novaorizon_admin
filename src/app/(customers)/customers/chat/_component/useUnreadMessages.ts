// app/(root)/chat/_component/useUnreadMessages.ts
import { useState, useEffect } from "react";
import { useUserData } from "@/app/context/UserDataContext"; // 👈 new import
import { db } from "@/utils/firebasedb";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from "firebase/firestore";

export function useUnreadMessages() {
  const { user } = useUserData(); // 👈 get user from context
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const roomsRef = collection(db, "chatRooms");

    // Query all rooms (or filter by user if needed)
    const roomsQuery = query(roomsRef);

    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      let total = 0;
      const roomUnsubscribes: (() => void)[] = [];

      snapshot.docs.forEach((roomDoc) => {
        const room: any = { id: roomDoc.id, ...roomDoc.data() };
        const messagesRef = collection(db, "chats", room.id, "messages");
        const messagesQuery = query(messagesRef, orderBy("sentAt", "asc"));

        const messageUnsubscribe = onSnapshot(
          messagesQuery,
          (messageSnapshot) => {
            const messages = messageSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));

            const lastReadTime = room.lastRead?.toDate?.() || new Date(0);
            const unreadCount = messages.filter((message: any) => {
              const messageTime = message.sentAt?.toDate?.() || new Date(0);
              // Count messages from others that are after lastRead
              return message.from !== user.name && messageTime > lastReadTime;
            }).length;

            total += unreadCount;
            setTotalUnread(total);
          },
        );

        roomUnsubscribes.push(messageUnsubscribe);
      });

      return () => {
        roomUnsubscribes.forEach((unsub) => unsub());
      };
    });

    return () => unsubscribe();
  }, [user?.id, user?.name]);

  return totalUnread;
}
