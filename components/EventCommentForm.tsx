'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';

type EventCommentFormProps = {
  eventId: string;
};

type EventComment = {
  _id: string;
  name?: string | null;
  email?: string | null;
  message: string;
  createdAt?: string | null;
};

export function EventCommentForm({ eventId }: EventCommentFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const adminDeleteEnabled =
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_DELETE === '1';

  const canSubmit = message.trim().length > 0 && status !== 'submitting';

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/comments?eventId=${encodeURIComponent(eventId)}`);
      if (!res.ok) throw new Error('Unable to load comments');
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch (err) {
      console.error('Failed to load comments', err);
    }
  }, [eventId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus('submitting');
    setError(null);

    try {
      const res = await fetch('/api/events/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit comment');
      }

      setName('');
      setEmail('');
      setMessage('');
      setStatus('success');
      await fetchComments();
    } catch (err) {
      console.error(err);
      setStatus('error');
      setError('Unable to send comment right now. Please try again.');
    }
  }

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime;
    }),
    [comments],
  );

  function formatTimestamp(ts?: string | null) {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-2 mt-4 border-t border-dotted border-emerald-100 pt-4">
      <p className="text-xs text-emerald-900 font-semibold">
        {sortedComments.length > 0 ? 'Discussion thread' : 'Start the conversation'}
      </p>

      {sortedComments.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-auto pr-1">
          {sortedComments.map((comment) => {
            const deleting = deletingCommentId === comment._id;
            return (
              <div
                key={comment._id}
                className="relative rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm"
              >
                <div className="flex items-center justify-between text-[11px] text-emerald-800 uppercase tracking-wide">
                  <span>{comment.name || 'Neighbor'}</span>
                  <span className="text-emerald-600">
                    {formatTimestamp(comment.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-emerald-900 mt-1">{comment.message}</p>
                {adminDeleteEnabled && (
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={async () => {
                      if (deleting) return;
                      const confirmDelete = window.confirm(
                        'Delete this comment permanently?',
                      );
                      if (!confirmDelete) return;

                      const secret = window.prompt(
                        'Enter the delete passphrase:',
                      );
                      if (!secret) return;

                      setDeletingCommentId(comment._id);
                      try {
                        const response = await fetch(
                          `/api/events/comments/${comment._id}`,
                          {
                            method: 'DELETE',
                            headers: {
                              'x-event-comment-delete-secret': secret,
                            },
                          },
                        );

                        if (!response.ok) {
                          const payload = await response
                            .json()
                            .catch(() => null);
                          throw new Error(
                            payload?.error ||
                              'Unable to delete comment. Please try again.',
                          );
                        }

                        await fetchComments();
                      } catch (err) {
                        console.error(err);
                        window.alert(
                          err instanceof Error
                            ? err.message
                            : 'Unable to delete comment.',
                        );
                      } finally {
                        setDeletingCommentId(null);
                      }
                    }}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full border border-red-100 bg-white text-red-600 shadow hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-gray-500">No comments yet; be the first to ask.</p>
      )}

      <form className="space-y-2" onSubmit={handleSubmit}>
        <textarea
          className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          placeholder="Leave a quick question or comment for the HOA team..."
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="text"
            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {status === 'success' && (
          <p className="text-xs text-emerald-600">Thanks! Your comment has been submitted.</p>
        )}
        {status === 'error' && error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {status === 'submitting' ? 'Sending…' : 'Submit comment'}
        </button>
      </form>
    </div>
  );
}
