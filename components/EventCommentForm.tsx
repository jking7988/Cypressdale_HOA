'use client';

import { FormEvent, useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Trash2, Reply, Send, X } from 'lucide-react';

type Comment = { _id: string; name: string; message: string; createdAt: string; parentId: string | null };

function CommentsThreadForm({ targetId, targetType }: { targetId: string; targetType: 'event' | 'post' }) {
  const inputId = useId();
  const [comments, setComments] = useState<Comment[]>([]);
  const [permissions, setPermissions] = useState({ canComment: false, isAdmin: false, signedIn: false });
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const api = targetType === 'event' ? '/api/events/comments' : '/api/news/comments';
  const parameter = targetType === 'event' ? 'eventId' : 'postId';
  const load = useCallback(async () => {
    const response = await fetch(`${api}?${parameter}=${encodeURIComponent(targetId)}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Unable to load comments.');
    setComments(result.comments); setPermissions(result); setLoaded(true);
  }, [api, parameter, targetId]);
  useEffect(() => { load().catch(error => setError(error.message)); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !message.trim()) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [parameter]: targetId, message, ...(replyTo ? { parentCommentId: replyTo } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send comment.');
      setMessage(''); setReplyTo(null); await load();
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to send comment.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (busy || !window.confirm('Delete this comment permanently?')) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/events/comments/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete comment.');
      if (replyTo === id) setReplyTo(null);
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to delete comment.'); }
    finally { setBusy(false); }
  }

  function thread(comment: Comment, depth = 0): React.ReactNode {
    return <div key={comment._id} className={depth && depth <= 8 ? 'ml-3 border-l border-emerald-100 pl-3 mt-2' : ''}>
      <article className="border-b border-emerald-100 py-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800">
          <strong className="break-words">{comment.name || 'Neighbor'}</strong>
          <time className="text-gray-500" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</time>
          {permissions.isAdmin && <button title="Delete comment" aria-label="Delete comment" disabled={busy} onClick={() => remove(comment._id)} className="ml-auto p-2 text-red-700"><Trash2 size={15} /></button>}
        </div>
        <p className="mt-1 text-sm whitespace-pre-wrap break-words">{comment.message}</p>
        {permissions.canComment && depth < 8 && <button disabled={busy} onClick={() => setReplyTo(comment._id)} className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700"><Reply size={14} />Reply</button>}
      </article>
      {comments.filter(child => child.parentId === comment._id).map(child => thread(child, depth + 1))}
    </div>;
  }

  return <section className="mt-4 border-t border-emerald-100 pt-4 space-y-3" aria-label="Discussion">
    <h2 className="text-sm font-semibold">Discussion</h2>
    {comments.filter(comment => !comment.parentId).map(comment => thread(comment))}
    {loaded && !comments.length && <p className="text-xs text-gray-500">No comments yet.</p>}
    {loaded && !permissions.canComment && <p className="text-sm text-gray-600">{permissions.signedIn ? 'Approved membership is required to comment.' : <Link className="text-emerald-700 underline" href="/admin-sign-in">Sign in to comment</Link>}</p>}
    {permissions.canComment && <form onSubmit={submit} className="space-y-2">
      {replyTo && <div className="flex items-center gap-2 text-xs">Reply to {comments.find(comment => comment._id === replyTo)?.name}<button type="button" title="Cancel reply" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X size={16} /></button></div>}
      <label className="block text-xs font-semibold" htmlFor={inputId}>Comment</label>
      <textarea id={inputId} value={message} onChange={event => setMessage(event.target.value)} required maxLength={5000} rows={3} disabled={busy} className="w-full rounded-md border border-emerald-200 px-3 py-2 text-sm" />
      <button disabled={busy || !message.trim()} className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-xs text-white disabled:opacity-50"><Send size={14} />{busy ? 'Sending...' : 'Submit comment'}</button>
    </form>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}

export function EventCommentForm({ eventId }: { eventId: string }) { return <CommentsThreadForm targetId={eventId} targetType="event" />; }
export function NewsCommentForm({ postId }: { postId: string }) { return <CommentsThreadForm targetId={postId} targetType="post" />; }
