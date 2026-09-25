// components/DeletePromotionButton.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

interface Props {
  id: string;
  name: string;
  action: (id: string) => Promise<{ success: boolean } | any>;
}

export function DeletePromotionButton({ id, name, action }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await action(id);
        toast.success("Promotion deleted");
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to delete");
        setConfirming(false);
      }
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[13px] font-medium text-destructive hover:underline"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      <span className="text-muted-foreground">Delete “{name}”?</span>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="font-medium text-destructive hover:underline disabled:opacity-50"
      >
        {isPending ? "Deleting…" : "Yes"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={isPending}
        className="font-medium text-muted-foreground hover:underline"
      >
        No
      </button>
    </span>
  );
}
