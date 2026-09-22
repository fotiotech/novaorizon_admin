// app/chat/page.tsx - Chat List Page
"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { db } from "@/utils/firebasedb";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import {
  Search,
  SearchOff,
  Chat as ChatIcon,
  Delete,
  MoreVert,
  Close,
} from "@mui/icons-material";
import { ConfirmDialog } from "@/components/ux/ConfirmDialog";
import { PopoverMenu, type PopoverMenuItem } from "@/components/ux/PopoverMenu";
import { toast } from "react-hot-toast";

interface ChatRoom {
  roomId: string;
  name?: string;
  from?: string;
  product?: string;
  lastMessage?: string;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground transition placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40";

const EmptyState = memo(function EmptyState({
  isFiltering,
  onClear,
}: {
  isFiltering: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {isFiltering ? (
          <SearchOff className="text-muted-foreground" />
        ) : (
          <ChatIcon className="text-muted-foreground" />
        )}
      </div>
      <p className="text-sm font-medium text-foreground">
        {isFiltering ? "No chats match your search" : "No active chats"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {isFiltering
          ? "Try adjusting or clearing your search."
          : "Start a new conversation to see it here."}
      </p>
      {isFiltering && (
        <div className="mt-4">
          <button
            onClick={onClear}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
});

export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChatRoom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const confirmDelete = async () => {
    if (!deleteTarget || !db) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting chat room…");
    try {
      await deleteDoc(doc(db, "chatRooms", deleteTarget.roomId));
      toast.success("Chat room deleted", { id: toastId });
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Error deleting chat room:", err);
      toast.error("Failed to delete chat room", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const visibleRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => {
      const haystack =
        `${r.from ?? ""} ${r.product ?? ""} ${r.lastMessage ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [rooms, query]);

  const isFiltering = query.trim() !== "";

  const getMenuItems = (room: ChatRoom): PopoverMenuItem[] => [
    {
      key: "delete",
      label: "Delete room",
      icon: <Delete fontSize="small" />,
      danger: true,
      onClick: () => setDeleteTarget(room),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-clip">
      {/* Controls */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search
            fontSize="small"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className={`${INPUT_CLASS} pl-9`}
          />
        </div>
        {isFiltering && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Close fontSize="small" />
          </button>
        )}
      </div>

      {/* Card */}
      <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">All chats</h2>
            {visibleRooms.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {visibleRooms.length}
              </span>
            )}
          </div>
          {loading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Loading…
            </span>
          )}
        </div>

        {visibleRooms.length === 0 ? (
          <EmptyState isFiltering={isFiltering} onClear={() => setQuery("")} />
        ) : (
          <ul className="divide-y divide-border">
            {visibleRooms.map((room) => (
              <li
                key={room.roomId}
                className="group flex items-center gap-2 transition-colors hover:bg-muted/40"
              >
                <Link
                  href={`/chat/${room.roomId}`}
                  className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary">
                    {(room.from?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {room.from || "Unknown user"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {room.product || "No product specified"}
                    </p>
                    {room.lastMessage && (
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                        {room.lastMessage}
                      </p>
                    )}
                  </div>
                </Link>

                <div className="pr-3">
                  <PopoverMenu
                    items={getMenuItems(room)}
                    ariaLabel={`Actions for ${room.from ?? "chat"}`}
                    trigger={<MoreVert fontSize="small" />}
                    align="right"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete chat room"
        message={`Are you sure you want to delete the chat with "${deleteTarget?.from || "this user"}"? This cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        danger
      />
    </div>
  );
}
