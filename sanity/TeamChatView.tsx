// TeamChatView.tsx
// @ts-nocheck
import React, {useEffect, useState, useRef} from 'react';
import {useCurrentUser} from 'sanity';
import {supabase} from './studioSupabaseClient';

type Message = {
  id: string;
  room_id: string;
  author_name: string;
  text: string;
  created_at: string;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
};

const ROOM_ID = 'global:board-chat';
const CHANNEL_NAME = 'team-chat';

// small helper
function nowIso() {
  return new Date().toISOString();
}

const REACTION_OPTIONS = ['👍', '❤️', '🎉'];

const TeamChatView = () => {
  const user = useCurrentUser();

  if (!supabase) {
    return (
      <div className="p-3 text-xs text-gray-600">
        <p className="font-semibold mb-1">Team chat not configured</p>
        <p className="mb-1">
          Supabase credentials are missing in the Studio environment.
        </p>
        <p>
          Set{' '}
          <code className="font-mono text-[11px] bg-gray-100 px-1 rounded">
            SANITY_STUDIO_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="font-mono text-[11px] bg-gray-100 px-1 rounded">
            SANITY_STUDIO_SUPABASE_ANON_KEY
          </code>{' '}
          to enable live chat.
        </p>
      </div>
    );
  }

  const displayName = user?.name || user?.email || 'Unknown user';
  const userId = user?._id || displayName; // simple stable id
  const initials =
    (user?.name &&
      user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()) ||
    (user?.email?.[0]?.toUpperCase() ?? '?');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<
    Record<string, {name: string; last: number}>
  >({});
  const [onlineUsers, setOnlineUsers] = useState<
    Record<string, {name: string; last: number}>
  >({});
  const [reactions, setReactions] = useState<
    Record<string, Record<string, number>>
  >({});

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(
    typeof document !== 'undefined' ? !document.hidden : true,
  );

  const [lastReadAt, setLastReadAt] = useState<number>(() => Date.now());

  // Scroll to bottom on message changes
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({behavior: 'smooth', block: 'end'});
    }
  }, [messages]);

  // Track focus / visibility for "unread" logic
  useEffect(() => {
    function handleVisibility() {
      const visible = !document.hidden;
      setIsWindowFocused(visible);
      if (visible) {
        setLastReadAt(Date.now());
        setUnreadCount(0);
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, []);

  // Load history + setup broadcast channel (messages, typing, presence, reactions)
  useEffect(() => {
    let active = true;

    async function loadMessages() {
      setLoading(true);
      const {data, error} = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', ROOM_ID)
        .order('created_at', {ascending: true});

      if (!active) return;
      if (!error && data) {
        setMessages(data as Message[]);
      }
      setLoading(false);
    }

    loadMessages();

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on('broadcast', {event: 'message'}, (payload) => {
        const msg = payload.payload as Message;
        setMessages((prev) => [...prev, msg]);
        const createdTime = new Date(msg.created_at).getTime();
        // increment unread if we're not focused
        setUnreadCount((prev) =>
          isWindowFocused || createdTime <= lastReadAt ? prev : prev + 1,
        );
      })
      .on('broadcast', {event: 'typing'}, (payload) => {
        const {userId: typingId, name} = payload.payload as {
          userId: string;
          name: string;
        };
        const now = Date.now();
        setTypingUsers((prev) => ({
          ...prev,
          [typingId]: {name, last: now},
        }));
      })
      .on('broadcast', {event: 'presence'}, (payload) => {
        const {userId: presenceId, name} = payload.payload as {
          userId: string;
          name: string;
        };
        const now = Date.now();
        setOnlineUsers((prev) => ({
          ...prev,
          [presenceId]: {name, last: now},
        }));
      })
      .on('broadcast', {event: 'reaction'}, (payload) => {
        const {messageId, emoji} = payload.payload as {
          messageId: string;
          emoji: string;
        };
        setReactions((prev) => {
          const current = {...prev};
          const forMsg = {...(current[messageId] || {})};
          forMsg[emoji] = (forMsg[emoji] || 0) + 1;
          current[messageId] = forMsg;
          return current;
        });
      })
      .subscribe();

    channelRef.current = channel;

    // announce presence immediately and then ping every 20s
    function sendPresence() {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'presence',
        payload: {userId, name: displayName},
      });
    }
    sendPresence();
    const presenceInterval = setInterval(sendPresence, 20_000);

    // periodically prune stale typing / presence
    const pruneInterval = setInterval(() => {
      const cutoffTyping = Date.now() - 3_000; // 3s
      const cutoffPresence = Date.now() - 30_000; // 30s

      setTypingUsers((prev) => {
        const next: typeof prev = {};
        for (const [id, info] of Object.entries(prev)) {
          if (info.last > cutoffTyping) next[id] = info;
        }
        return next;
      });

      setOnlineUsers((prev) => {
        const next: typeof prev = {};
        for (const [id, info] of Object.entries(prev)) {
          if (info.last > cutoffPresence) next[id] = info;
        }
        return next;
      });
    }, 3_000);

    return () => {
      active = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearInterval(presenceInterval);
      clearInterval(pruneInterval);
    };
  }, [isWindowFocused, lastReadAt, userId, displayName]);

  // Typing broadcast on input change (debounced)
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInput(value);

    const now = Date.now();
    if (!channelRef.current) return;
    if (now - lastTypingSentRef.current < 800) return; // throttle
    lastTypingSentRef.current = now;

    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {userId, name: displayName},
    });
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const createdAt = nowIso();
    const localId =
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-${Date.now()}`);

    const msg: Message = {
      id: localId,
      room_id: ROOM_ID,
      author_name: displayName,
      text,
      created_at: createdAt,
    };

    // optimistic + broadcast
    setMessages((prev) => [...prev, msg]);
    setInput('');
    setSending(true);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: msg,
      });
    }

    // persist
    const {error} = await supabase.from('messages').insert({
      room_id: ROOM_ID,
      author_name: displayName,
      text,
      created_at: createdAt,
    });

    setSending(false);

    if (error) {
      // rollback optimistic if insert fails
      setMessages((prev) => prev.filter((m) => m.id !== localId));
      console.error('Supabase insert error:', error.message);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSending(true);
      const path = `${userId}/${Date.now()}-${file.name}`;
      const {error: uploadError} = await supabase.storage
        .from('chat-uploads')
        .upload(path, file);

      if (uploadError) {
        console.error(uploadError);
        setSending(false);
        return;
      }

      const {
        data: {publicUrl},
      } = supabase.storage.from('chat-uploads').getPublicUrl(path);

      const createdAt = nowIso();
      const localId =
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `file-${Date.now()}`);

      const msg: Message = {
        id: localId,
        room_id: ROOM_ID,
        author_name: displayName,
        text: file.name,
        created_at: createdAt,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
      };

      // optimistic + broadcast
      setMessages((prev) => [...prev, msg]);
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message',
          payload: msg,
        });
      }

      const {error: insertError} = await supabase.from('messages').insert({
        room_id: ROOM_ID,
        author_name: displayName,
        text: file.name,
        created_at: createdAt,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
      });

      if (insertError) {
        // rollback if necessary
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        console.error(insertError);
      }
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleReaction(messageId: string, emoji: string) {
    // local
    setReactions((prev) => {
      const current = {...prev};
      const forMsg = {...(current[messageId] || {})};
      forMsg[emoji] = (forMsg[emoji] || 0) + 1;
      current[messageId] = forMsg;
      return current;
    });

    // broadcast
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {messageId, emoji},
      });
    }
  }

  const typingList = Object.values(typingUsers)
    .map((t) => t.name)
    .filter((n) => n && n !== displayName);
  const onlineList = Object.entries(onlineUsers);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-800">
              Board / Team chat
            </p>
            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[9px]">
                {initials}
              </span>
              <span>Online as {displayName}</span>
            </p>
          </div>
          {onlineList.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-[10px] text-gray-500">
              <span className="mr-1">Also online:</span>
              {onlineList.map(([id, info]) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="truncate max-w-[90px]">{info.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-[10px] text-gray-400 text-right">
          <div>
            Room:{' '}
            <span className="font-mono">
              {ROOM_ID}
            </span>
          </div>
          {unreadCount > 0 && (
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              • {unreadCount} new message{unreadCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs">
        {loading ? (
          <p className="text-gray-500 text-[11px]">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-[11px]">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((m) => {
            const isMe = m.author_name === displayName;
            const createdTime = new Date(m.created_at).getTime();
            const isNew = createdTime > lastReadAt && !isMe;
            const msgReactions = reactions[m.id] || {};

            return (
              <div
                key={m.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className="flex flex-col items-stretch max-w-[80%]">
                  <div
                    className={`space-y-0.5 rounded-2xl px-3 py-1.5 border ${
                      isMe
                        ? 'bg-emerald-50 border-emerald-100 text-gray-900'
                        : 'bg-gray-50 border-gray-200 text-gray-900'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-[11px] text-gray-800 truncate">
                        {m.author_name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(m.created_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Message text */}
                    {m.text && (
                      <p className="text-[11px] text-gray-800">{m.text}</p>
                    )}

                    {/* Attachment preview/link */}
                    {m.file_url && (
                      <div className="mt-1">
                        {m.file_type?.startsWith('image/') ? (
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={m.file_url}
                              alt={m.file_name || 'Attachment'}
                              className="max-h-40 rounded-lg border border-gray-200"
                            />
                          </a>
                        ) : (
                          <a
                            href={m.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-emerald-700 underline"
                          >
                            {m.file_name || 'Download file'}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Reactions row */}
                    {Object.keys(msgReactions).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(msgReactions).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="inline-flex items-center gap-1 rounded-full bg-white/70 border border-gray-200 px-2 py-0.5 text-[10px]"
                          >
                            <span>{emoji}</span>
                            <span className="text-gray-600">{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reaction buttons */}
                  <div className="mt-1 flex gap-1">
                    {REACTION_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReaction(m.id, emoji)}
                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        {emoji}
                      </button>
                    ))}
                    {isNew && (
                      <span className="ml-1 text-[10px] text-emerald-600">
                        • New
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingList.length > 0 && (
        <div className="px-3 pb-1 text-[10px] text-gray-500">
          {typingList.length === 1
            ? `${typingList[0]} is typing…`
            : 'Several people are typing…'}
        </div>
      )}

      {/* Input + Attach */}
      <form
        onSubmit={handleSend}
        className="border-t border-gray-200 flex items-center gap-2 px-3 py-2"
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileSelected}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-[10px] px-2 py-1 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50"
          disabled={sending}
        >
          Attach
        </button>
        <input
          type="text"
          className="flex-1 rounded-full border border-gray-300 px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Type a message for the team…"
          value={input}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="text-xs font-semibold text-emerald-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default TeamChatView;
