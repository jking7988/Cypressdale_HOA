'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';

type DeletePostButtonProps = {
  postId: string;
  className?: string;
};

export function DeletePostButton({
  postId,
  className = '',
}: DeletePostButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'deleting'>('idle');

  const handleDelete = async () => {
    if (status === 'deleting') return;

    if (
      !window.confirm(
        'This will permanently delete the news post. Continue?',
      )
    ) {
      return;
    }

    const secret = window.prompt('Enter the delete passphrase:');
    if (!secret) return;

    setStatus('deleting');

    try {
      const response = await fetch('/api/news/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-news-delete-secret': secret,
        },
        body: JSON.stringify({ postId }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error || 'Delete request failed. Please try again.',
        );
      }

      setStatus('idle');
      router.refresh();
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : 'Unable to delete this post.';
      window.alert(message);
      setStatus('idle');
    }
  };

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={handleDelete}
        disabled={status === 'deleting'}
        title="Delete this post"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 shadow transition hover:bg-red-50 disabled:opacity-60"
      >
        {status === 'deleting' ? (
          <span className="text-[10px] font-semibold tracking-wide">...</span>
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
