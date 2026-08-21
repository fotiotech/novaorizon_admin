// components/DeleteButton.tsx
'use client';

import { deletePromotionType } from '@/app/actions/promotionType';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DeleteButtonProps {
  id: string;
  name: string;
}

export function DeleteButton({ id, name }: DeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePromotionType(id);
      router.refresh(); // Re-fetch data without full page reload
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-900 disabled:opacity-50"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  );
}