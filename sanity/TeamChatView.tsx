'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {useCurrentUser} from 'sanity';
import {supabase} from './studioSupaBaseClient';

type Message = {
  id: string;
  room_id: string;
  author_name: string;
  text: string;
  created_at: string;
};

const ROOM_ID = 'global:board-chat';
const CHANNEL_NAME = 'team-chat';
const NOTE_COLORS = ['#FEF3C7', '#FDE7C7', '#F1F5F9', '#E0E7FF', '#FCE7F3'];
const PIN_COLORS = ['#EF4444', '#F97316', '#22C55E', '#2563EB'];
const NOTE_DESCRIPTION_LIMIT = 220;

const CORKBOARD_IMAGE = '/corkboard.jpg';

const corkBoardBackground =
  process.env.NEXT_PUBLIC_TEAM_NOTES_CORK ||
  `linear-gradient(180deg, rgba(177, 138, 84, 0.75) 0%, rgba(156, 104, 42, 0.85) 60%), url("${CORKBOARD_IMAGE}")`;

function nowIso() {
  return new Date().toISOString();
}

function formatTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const TeamChatView = () => {
  const user = useCurrentUser();

  if (!supabase) {
    return (
      <div className="p-6 text-sm text-gray-500 text-center">
        <p className="font-semibold text-gray-800 mb-2">Team Notes not configured</p>
        <p className="mb-1">
          Supabase credentials are missing in this Studio environment.
        </p>
        <p>
          Set <code className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-white">SANITY_STUDIO_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-xs px-2 py-0.5 rounded bg-slate-900 text-white">SANITY_STUDIO_SUPABASE_ANON_KEY</code> to enable the board.
        </p>
      </div>
    );
  }

  const displayName = user?.name || user?.email || 'Cypressdale teammate';
  const [notes, setNotes] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [expandedNote, setExpandedNote] = useState<Message | null>(null);
  const TOOL_BODY_CLASS = 'team-notes-corkboard';

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadNotes() {
      setLoading(true);
      const {data, error} = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', ROOM_ID)
        .order('created_at', {ascending: false})
        .limit(100);

      if (!active) return;
      if (!error && data) {
        const items = (data as Message[]).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setNotes(items);
      }
      setLoading(false);
    }

    loadNotes();

    channel = supabase
      .channel(CHANNEL_NAME)
      .on('broadcast', {event: 'message'}, (payload: {payload: unknown}) => {
        const payloadNote = payload.payload as Message;
        setNotes((prev) => {
          if (prev.some((note) => note.id === payloadNote.id)) {
            return prev;
          }
          const next = [payloadNote, ...prev];
          return next.slice(0, 100);
        });
      })
      .subscribe();

    return () => {
      active = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  async function handleSend(event?: React.FormEvent) {
    if (event) {
      event.preventDefault();
    }

    const text = draft.trim();
    if (!text) {
      return;
    }

    setSending(true);
    setDraft('');

    const createdAt = nowIso();
    const messageId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `note-${Date.now()}`;

    const note: Message = {
      id: messageId,
      room_id: ROOM_ID,
      author_name: displayName,
      text,
      created_at: createdAt,
    };

    setNotes((prev) => [note, ...prev].slice(0, 100));

    const {error} = await supabase.from('messages').insert(note);
    setSending(false);

    if (error) {
      console.error('Team notes insert error', error.message);
    }
  }

  const boardNotes = useMemo(() => notes, [notes]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const html = document.documentElement;
    const boardStyle = `url("${CORKBOARD_IMAGE}")`;
    const prev = {
      body: {
        backgroundImage: document.body.style.backgroundImage,
        backgroundRepeat: document.body.style.backgroundRepeat,
        backgroundSize: document.body.style.backgroundSize,
        backgroundPosition: document.body.style.backgroundPosition,
        backgroundAttachment: document.body.style.backgroundAttachment,
      },
      html: {
        backgroundImage: html.style.backgroundImage,
        backgroundRepeat: html.style.backgroundRepeat,
        backgroundSize: html.style.backgroundSize,
        backgroundPosition: html.style.backgroundPosition,
        backgroundAttachment: html.style.backgroundAttachment,
      },
    };

    [document.body, html].forEach((el) => {
      el.style.backgroundImage = boardStyle;
      el.style.backgroundRepeat = 'repeat';
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.style.backgroundAttachment = 'fixed';
    });

    return () => {
      document.body.style.backgroundImage = prev.body.backgroundImage;
      document.body.style.backgroundRepeat = prev.body.backgroundRepeat;
      document.body.style.backgroundSize = prev.body.backgroundSize;
      document.body.style.backgroundPosition = prev.body.backgroundPosition || '';
      document.body.style.backgroundAttachment = prev.body.backgroundAttachment || '';

      html.style.backgroundImage = prev.html.backgroundImage;
      html.style.backgroundRepeat = prev.html.backgroundRepeat;
      html.style.backgroundSize = prev.html.backgroundSize;
      html.style.backgroundPosition = prev.html.backgroundPosition || '';
      html.style.backgroundAttachment = prev.html.backgroundAttachment || '';
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const body = document.body;
    const style = document.createElement('style');
    style.textContent = `
      body.${TOOL_BODY_CLASS} .sanity-default-layout__content,
      body.${TOOL_BODY_CLASS} .sanity-default-layout__tool-content {
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);
    body.classList.add(TOOL_BODY_CLASS);

    return () => {
      body.classList.remove(TOOL_BODY_CLASS);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      <div
      className="flex min-h-screen flex-col bg-cover bg-center"
      style={{
        backgroundImage: corkBoardBackground,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: `url("${CORKBOARD_IMAGE}")`,
          backgroundSize: 'cover',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />
      <header className="px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-600">
          Team Notes
        </p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">
          Sticky ideas for the board
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Drop a note, a reminder, or a quick question for the group.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {loading ? (
          <div className="text-sm text-gray-500">Loading notes…</div>
        ) : boardNotes.length === 0 ? (
          <div className="text-sm text-gray-500">No notes yet—leave the first one below.</div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {boardNotes.map((note, index) => {
              const exceedsLimit = note.text.length > NOTE_DESCRIPTION_LIMIT;
              const truncatedText = exceedsLimit
                ? `${note.text.slice(0, NOTE_DESCRIPTION_LIMIT).trim()}…`
                : note.text;
              const rotation =
                index % 4 === 0
                  ? '-2deg'
                  : index % 4 === 1
                  ? '-0.5deg'
                  : index % 4 === 2
                  ? '0.5deg'
                  : '1.75deg';

              return (
                <article
                  key={note.id}
                  className="relative max-w-xs space-y-2 rounded-[28px] border border-slate-200 bg-white/70 p-5 text-left shadow-[0_18px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5"
                  style={{
                    background: NOTE_COLORS[index % NOTE_COLORS.length],
                    minHeight: 180,
                    transformOrigin: 'top center',
                    rotate: rotation,
                  }}
                >
                  <span
                    className="absolute left-1/2 top-3 block h-3 w-3 rounded-full shadow-md"
                    style={{
                      background: PIN_COLORS[index % PIN_COLORS.length],
                      transform: 'translateX(-50%)',
                    }}
                  />
                  <p className="text-sm text-slate-900" style={{whiteSpace: 'pre-line'}}>
                    {truncatedText}
                  </p>
                  <div className="text-[13px] font-semibold text-slate-900">{note.author_name}</div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                    {formatTimestamp(note.created_at)}
                  </div>
                  {exceedsLimit && (
                    <button
                      type="button"
                      onClick={() => setExpandedNote(note)}
                      className="inline-flex items-center rounded-full border border-slate-400 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-700 transition hover:border-slate-600 hover:text-slate-900"
                    >
                      Read more
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <form
        className="border-t border-emerald-200 bg-white px-6 py-5 shadow-inner"
        onSubmit={handleSend}
      >
        <label className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
          Add a note
        </label>
        <textarea
          className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-gray-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
          rows={3}
          placeholder="Remember to follow up on pool keys or plan the next board meeting recap"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <div className="mt-4 flex items-center justify-between gap-4">
          <span className="text-[11px] text-gray-500">
            {displayName} — {boardNotes.length} note{boardNotes.length === 1 ? '' : 's'}
          </span>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Saving…' : 'Post note'}
          </button>
        </div>
      </form>

      {expandedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
          <div
            className="absolute inset-0 bg-slate-900/60"
            onClick={() => setExpandedNote(null)}
          />
          <div
            className="relative w-full max-w-xl rounded-[32px] border border-slate-300 bg-yellow-50/95 p-6 text-slate-900 shadow-[0_35px_80px_rgba(15,23,42,0.35)]"
            style={{
              background: NOTE_COLORS[boardNotes.indexOf(expandedNote) % NOTE_COLORS.length],
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sticky note</h2>
              <button
                type="button"
                onClick={() => setExpandedNote(null)}
                className="text-sm font-semibold text-slate-700 underline"
              >
                Close
              </button>
            </div>
            <p className="mb-4 whitespace-pre-line text-base text-slate-900">{expandedNote.text}</p>
            <div className="text-sm font-semibold text-slate-900">{expandedNote.author_name}</div>
            <div className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
              {formatTimestamp(expandedNote.created_at)}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default TeamChatView;
