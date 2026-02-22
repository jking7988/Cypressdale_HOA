'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Reply } from 'lucide-react';

type BaseCommentFormProps = {
  targetId: string;
  targetType: 'event' | 'post';
};

type EventCommentFormProps = {
  eventId: string;
};

type NewsCommentFormProps = {
  postId: string;
};

type SiteComment = {
  _id: string;
  name?: string | null;
  email?: string | null;
  message: string;
  createdAt?: string | null;
  parentId?: string | null;
};

type ReplyDraft = {
  message: string;
  name: string;
  email: string;
};

function CommentsThreadForm({ targetId, targetType }: BaseCommentFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<SiteComment[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, ReplyDraft>>({});

  const adminDeleteEnabled = process.env.NEXT_PUBLIC_ENABLE_ADMIN_DELETE === '1';
  const router = useRouter();

  const apiBase = targetType === 'event' ? '/api/events/comments' : '/api/news/comments';
  const idParam = targetType === 'event' ? 'eventId' : 'postId';

  const canSubmit = message.trim().length > 0 && status !== 'submitting';

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}?${idParam}=${encodeURIComponent(targetId)}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Unable to load comments');
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch (err) {
      console.error('Failed to load comments', err);
    }
  }, [apiBase, idParam, targetId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function submitComment(payload: {
    message: string;
    name?: string;
    email?: string;
    parentCommentId?: string;
  }) {
    const body: Record<string, string> = {
      [idParam]: targetId,
      message: payload.message,
      name: payload.name ?? '',
      email: payload.email ?? '',
    };

    if (payload.parentCommentId) body.parentCommentId = payload.parentCommentId;

    const res = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error('Failed to submit comment');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus('submitting');
    setError(null);

    try {
      await submitComment({
        message: message.trim(),
        name: name.trim(),
        email: email.trim(),
      });

      setName('');
      setEmail('');
      setMessage('');
      setStatus('success');
      await fetchComments();
      router.refresh();
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

  const rootComments = useMemo(
    () => sortedComments.filter((c) => !c.parentId),
    [sortedComments],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, SiteComment[]>();
    for (const comment of sortedComments) {
      if (!comment.parentId) continue;
      const list = map.get(comment.parentId) ?? [];
      list.push(comment);
      map.set(comment.parentId, list);
    }
    return map;
  }, [sortedComments]);

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

  function getReplyDraft(commentId: string): ReplyDraft {
    return (
      replyDrafts[commentId] ?? {
        message: '',
        name: name,
        email: email,
      }
    );
  }

  function setReplyDraft(commentId: string, patch: Partial<ReplyDraft>) {
    setReplyDrafts((prev) => {
      const current = getReplyDraft(commentId);
      return {
        ...prev,
        [commentId]: { ...current, ...patch },
      };
    });
  }

  async function handleSubmitReply(parentCommentId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = getReplyDraft(parentCommentId);
    const replyMessage = draft.message.trim();
    if (!replyMessage) return;

    try {
      await submitComment({
        message: replyMessage,
        name: draft.name.trim(),
        email: draft.email.trim(),
        parentCommentId,
      });

      setReplyDraft(parentCommentId, { message: '' });
      setReplyingToId(null);
      await fetchComments();
      router.refresh();
    } catch (err) {
      console.error(err);
      window.alert('Unable to send reply right now. Please try again.');
    }
  }

  async function handleDeleteComment(comment: SiteComment) {
    if (deletingCommentId) return;

    const confirmDelete = window.confirm('Delete this comment permanently?');
    if (!confirmDelete) return;

    const secret = window.prompt('Enter the delete passphrase:');
    if (!secret) return;

    setDeletingCommentId(comment._id);

    try {
      const response = await fetch(`/api/events/comments/${comment._id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-event-comment-delete-secret': secret,
        },
        body: JSON.stringify({ commentId: comment._id }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Unable to delete comment. Please try again.');
      }

      await fetchComments();
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : 'Unable to delete comment.');
    } finally {
      setDeletingCommentId(null);
    }
  }

  function renderComment(comment: SiteComment, isReply = false) {
    const deleting = deletingCommentId === comment._id;
    const childReplies = childrenByParent.get(comment._id) ?? [];
    const isReplyOpen = replyingToId === comment._id;
    const replyDraft = getReplyDraft(comment._id);

    return (
      <div key={comment._id} className={isReply ? 'ml-5 border-l border-emerald-100 pl-3 mt-2' : ''}>
        <div className="relative rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-emerald-800 uppercase tracking-wide">
            <span>{comment.name || 'Neighbor'}</span>
            <span className="text-emerald-600">{formatTimestamp(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-emerald-900 mt-1 whitespace-pre-wrap">{comment.message}</p>

          <div className="mt-2 flex items-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => setReplyingToId(isReplyOpen ? null : comment._id)}
              className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
          </div>

          {adminDeleteEnabled && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => handleDeleteComment(comment)}
              className="absolute top-2 right-2 h-6 w-6 rounded-full border border-red-100 bg-white text-red-600 shadow hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>

        {isReplyOpen && (
          <form
            className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2 space-y-2"
            onSubmit={(ev) => handleSubmitReply(comment._id, ev)}
          >
            <textarea
              className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Write a reply..."
              rows={2}
              value={replyDraft.message}
              onChange={(e) => setReplyDraft(comment._id, { message: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Name (optional)"
                value={replyDraft.name}
                onChange={(e) => setReplyDraft(comment._id, { name: e.target.value })}
              />
              <input
                type="email"
                className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Email (optional)"
                value={replyDraft.email}
                onChange={(e) => setReplyDraft(comment._id, { email: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-emerald-700"
              >
                Submit reply
              </button>
              <button
                type="button"
                onClick={() => setReplyingToId(null)}
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 hover:bg-emerald-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {childReplies.map((reply) => renderComment(reply, true))}
      </div>
    );
  }

  return (
    <div className="space-y-2 mt-4 border-t border-dotted border-emerald-100 pt-4">
      <p className="text-xs text-emerald-900 font-semibold">
        {sortedComments.length > 0 ? 'Discussion thread' : 'Start the conversation'}
      </p>

      {rootComments.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-auto pr-1">
          {rootComments.map((comment) => renderComment(comment))}
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
        {status === 'error' && error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {status === 'submitting' ? 'Sending...' : 'Submit comment'}
        </button>
      </form>
    </div>
  );
}

export function EventCommentForm({ eventId }: EventCommentFormProps) {
  return <CommentsThreadForm targetId={eventId} targetType="event" />;
}

export function NewsCommentForm({ postId }: NewsCommentFormProps) {
  return <CommentsThreadForm targetId={postId} targetType="post" />;
}
