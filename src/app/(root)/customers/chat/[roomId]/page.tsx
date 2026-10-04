// app/chat/[roomId]/page.tsx - Individual Chat Page
"use client";

import { useUserData } from "@/app/context/UserDataContext";
import { useEffect, useMemo, useRef, useState, use } from "react";
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
import {
  ArrowBack,
  Send as SendIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory2,
  MoreVert,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

interface Message {
  id: string;
  from: string;
  text: string;
  sentAt?: any;
}

interface ChatPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function ChatPage(props: ChatPageProps) {
  const params = use(props.params);
  const { user } = useUserData();
  const { roomId } = params;
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<any | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const [editTarget, setEditTarget] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!draft.trim() || !user || !db) return;
    const newMsg = {
      from: user.name || "clickitcome",
      text: draft.trim(),
      sentAt: serverTimestamp(),
    };

    try {
      const msgRef = collection(db, "chats", roomId, "messages");
      await addDoc(msgRef, newMsg);

      const roomRef = doc(db, "chatRooms", roomId);
      await updateDoc(roomRef, {
        lastMessage:
          draft.trim().substring(0, 50) +
          (draft.trim().length > 50 ? "..." : ""),
        lastUpdated: serverTimestamp(),
      });
      setDraft("");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error("Failed to send message");
    }
  };

  const confirmEdit = async () => {
    if (!editTarget || !db) return;
    setIsBusy(true);
    try {
      const msgDoc = doc(db, "chats", roomId, "messages", editTarget.id);
      await updateDoc(msgDoc, { text: editText });
      toast.success("Message updated");
      setEditTarget(null);
      setEditText("");
    } catch (err) {
      console.error("Failed to update message:", err);
      toast.error("Failed to update message");
    } finally {
      setIsBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !db) return;
    setIsBusy(true);
    try {
      const msgDoc = doc(db, "chats", roomId, "messages", deleteTarget.id);
      await deleteDoc(msgDoc);
      toast.success("Message deleted");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete message:", err);
      toast.error("Failed to delete message");
    } finally {
      setIsBusy(false);
    }
  };

  // Mark messages as read
  useEffect(() => {
    if (!user || !roomId || !db) return;
    (async () => {
      try {
        const roomRef = doc(db, "chatRooms", roomId);
        await updateDoc(roomRef, { lastRead: serverTimestamp() });
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    })();
  }, [user, roomId]);

  // Fetch room + subscribe to messages
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
          setRoom({ roomId: snap.id, ...(snap.data() as any) });
        } else {
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
      <div className="flex h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!room) {
    notFound();
  }

  const getMessageMenuItems = (m: Message): PopoverMenuItem[] => [
    {
      key: "edit",
      label: "Edit message",
      icon: <EditIcon fontSize="small" />,
      onClick: () => {
        setEditTarget(m);
        setEditText(m.text);
      },
    },
    {
      key: "delete",
      label: "Delete message",
      icon: <DeleteIcon fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(m),
    },
  ];

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-4xl flex-col overflow-x-clip">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
        <button
          type="button"
          onClick={() => router.push("/chat")}
          aria-label="Back to chats"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowBack fontSize="small" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {room.from || "Unknown user"}
          </h1>
          <p className="truncate text-xs text-muted-foreground">
            {room.product || "No product specified"}
          </p>
        </div>

        <Link
          href="/chat"
          className="hidden shrink-0 items-center rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted sm:inline-flex"
        >
          All chats
        </Link>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3 sm:px-4">
        {/* Order summary */}
        {room.cart && room.cart.length > 0 && (
          <div className="mb-3 overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Order summary
              </h3>
            </div>
            <ul className="divide-y divide-border">
              {room.cart.map((item: any, i: number) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name || "Product image"}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <Inventory2
                        fontSize="small"
                        className="text-muted-foreground"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {item.price} CFA
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Total
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {room.cart.total?.toFixed(2)} CFA
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-2">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-foreground">
                No messages yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start the conversation below.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.from === user?.name;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`group relative max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground"
                    }`}
                  >
                    <p
                      className={`mb-0.5 text-[11px] font-medium ${
                        mine
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {m.from}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>

                    {mine && (
                      <div className="absolute -left-9 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <PopoverMenu
                          items={getMessageMenuItems(m)}
                          ariaLabel="Message actions"
                          trigger={<MoreVert sx={{ fontSize: 16 }} />}
                          align="left"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
      </div>

      {/* Edit message modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => {
            if (!isBusy) {
              setEditTarget(null);
              setEditText("");
            }
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full rounded-t-2xl border border-border bg-card p-5 text-card-foreground sm:max-w-md sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold tracking-tight">
              Edit message
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Update the text and save your changes.
            </p>

            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              autoFocus
              className="mt-4 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditTarget(null);
                  setEditText("");
                }}
                disabled={isBusy}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmEdit}
                disabled={isBusy || !editText.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isBusy) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete message"
        message="Are you sure you want to delete this message? This cannot be undone."
        confirmLabel={isBusy ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
}
