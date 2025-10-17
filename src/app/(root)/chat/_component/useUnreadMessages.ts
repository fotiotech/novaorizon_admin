// app/(root)/chat/_component/useUnreadMessages.ts
import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext'; // Use your UserContext
import { db } from '@/utils/firebasedb'; // Use your firebasedb
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { useSession } from 'next-auth/react';

export function useUnreadMessages() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const roomsRef = collection(db, "chatRooms");
    
    // Since your chat list shows all rooms, we need to adjust the query
    // If you want only user-specific rooms, use: where("from", "==", user.name)
    const roomsQuery = query(roomsRef); // Remove the where clause to get all rooms

    const unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
      let total = 0;
      const roomUnsubscribes: (() => void)[] = [];

      snapshot.docs.forEach((roomDoc) => {
        const room:any = { id: roomDoc.id, ...roomDoc.data() };
        const messagesRef = collection(db, "chats", room.id, "messages");
        const messagesQuery = query(messagesRef, orderBy("sentAt", "asc"));

        const messageUnsubscribe = onSnapshot(messagesQuery, (messageSnapshot) => {
          const messages = messageSnapshot.docs.map(doc => ({
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
        });

        roomUnsubscribes.push(messageUnsubscribe);
      });

      return () => {
        roomUnsubscribes.forEach(unsub => unsub());
      };
    });

    return () => unsubscribe();
  }, [user?.id, user?.name]);

  return totalUnread;
}