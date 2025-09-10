// components/DeleteButton.tsx
"use client";

import { deleteCollection } from "@/app/actions/collection";
import { useRouter } from "next/navigation";

interface DeleteButtonProps {
  id: string;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ id }) => {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this collection?")) {
      return;
    }

    try {
      await deleteCollection(id);
      router.refresh(); // Refresh the page to update the list
    } catch (error) {
      console.error("Failed to delete collection:", error);
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:text-red-900"
    >
      Delete
    </button>
  );
};

export default DeleteButton;