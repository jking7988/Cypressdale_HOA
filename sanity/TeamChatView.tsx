// TeamChatView.tsx
// @ts-nocheck
import React, {useEffect, useRef, useState} from 'react';
import {useCurrentUser} from 'sanity';
import {supabase} from './studioSupaBaseClient';
import './TeamChatView.css';

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
const REACTION_OPTIONS = ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}'];

function nowIso() {
  return new Date().toISOString();
}

const TeamChatView = () => {
  const user = useCurrentUser();

  if (!supabase) {
    return (
      <div className="tc-empty">
        <p className="tc-empty-title">Team chat not configured</p>
        <p>Supabase credentials are missing in the Studio environment.</p>
        <p>
          Set <code>SANITY_STUDIO_SUPABASE_URL</code> and{' '}
          <code>SANITY_STUDIO_SUPABASE_ANON_KEY</code> to enable live chat.
        </p>
      </div>
    );
  }

  const displayName = user?.name || user?.email || 'Unknown user';
  const userId = user?._id || displayName;
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
  const [typingUsers, setTypingUsers] = useState<Record<string, {name: string; last: number}>>({});
  const [onlineUsers, setOnlineUsers] = useState<Record<string, {name: string; last: number}>>({});
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isWindowFocused, setIsWindowFocused] = useState(
    typeof document !== 'undefined' ? !document.hidden : true,
  );
  const [lastReadAt, setLastReadAt] = useState<number>(() => Date.now());

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({behavior: 'smooth', block: 'end'});
    }
  }, [messages]);

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
        setUnreadCount((prev) =>
          isWindowFocused || createdTime <= lastReadAt ? prev : prev + 1,
        );
      })
      .on('broadcast', {event: 'typing'}, (payload) => {
        const {userId: typingId, name} = payload.payload as {userId: string; name: string};
        const now = Date.now();
        setTypingUsers((prev) => ({...prev, [typingId]: {name, last: now}}));
      })
      .on('broadcast', {event: 'presence'}, (payload) => {
        const {userId: presenceId, name} = payload.payload as {userId: string; name: string};
        const now = Date.now();
        setOnlineUsers((prev) => ({...prev, [presenceId]: {name, last: now}}));
      })
      .on('broadcast', {event: 'reaction'}, (payload) => {
        const {messageId, emoji} = payload.payload as {messageId: string; emoji: string};
        setReactions((prev) => {
          const next = {...prev};
          const forMsg = {...(next[messageId] || {})};
          forMsg[emoji] = (forMsg[emoji] || 0) + 1;
          next[messageId] = forMsg;
          return next;
        });
      })
      .subscribe();

    channelRef.current = channel;

    function sendPresence() {
      if (!channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'presence',
        payload: {userId, name: displayName},
      });
    }

    sendPresence();
    const presenceInterval = setInterval(sendPresence, 20000);

    const pruneInterval = setInterval(() => {
      const cutoffTyping = Date.now() - 3000;
      const cutoffPresence = Date.now() - 30000;

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
    }, 3000);

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

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setInput(value);

    const now = Date.now();
    if (!channelRef.current) return;
    if (now - lastTypingSentRef.current < 800) return;
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
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-${Date.now()}`;

    const msg: Message = {
      id: localId,
      room_id: ROOM_ID,
      author_name: displayName,
      text,
      created_at: createdAt,
    };

    setMessages((prev) => [...prev, msg]);
    setInput('');
    setSending(true);

    if (channelRef.current) {
      channelRef.current.send({type: 'broadcast', event: 'message', payload: msg});
    }

    const {error} = await supabase.from('messages').insert({
      room_id: ROOM_ID,
      author_name: displayName,
      text,
      created_at: createdAt,
    });

    setSending(false);

    if (error) {
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
      const {error: uploadError} = await supabase.storage.from('chat-uploads').upload(path, file);

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
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `file-${Date.now()}`;

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

      setMessages((prev) => [...prev, msg]);
      if (channelRef.current) {
        channelRef.current.send({type: 'broadcast', event: 'message', payload: msg});
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
        setMessages((prev) => prev.filter((m) => m.id !== localId));
        console.error(insertError);
      }
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleReaction(messageId: string, emoji: string) {
    setReactions((prev) => {
      const next = {...prev};
      const forMsg = {...(next[messageId] || {})};
      forMsg[emoji] = (forMsg[emoji] || 0) + 1;
      next[messageId] = forMsg;
      return next;
    });

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
    <div className="tc-root">
      <div className="tc-header">
        <div className="tc-header-main">
          <div>
            <p className="tc-title">Board / Team chat</p>
            <p className="tc-subtitle">
              <span className="tc-initials">{initials}</span>
              <span>Online as {displayName}</span>
            </p>
          </div>
          {onlineList.length > 0 && (
            <div className="tc-online-wrap">
              <span className="tc-online-label">Also online:</span>
              {onlineList.map(([id, info]) => (
                <span key={id} className="tc-online-chip">
                  <span className="tc-online-dot" />
                  <span className="tc-online-name">{info.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="tc-meta">
          <div>
            Room: <span className="tc-room-id">{ROOM_ID}</span>
          </div>
          {unreadCount > 0 && (
            <div className="tc-unread">
              {unreadCount} new message{unreadCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <div className="tc-messages">
        {loading ? (
          <p className="tc-muted">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="tc-muted">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((m) => {
            const isMe = m.author_name === displayName;
            const createdTime = new Date(m.created_at).getTime();
            const isNew = createdTime > lastReadAt && !isMe;
            const msgReactions = reactions[m.id] || {};

            return (
              <div key={m.id} className={isMe ? 'tc-row tc-row-me' : 'tc-row tc-row-other'}>
                <div className="tc-bubble-wrap">
                  <div className={isMe ? 'tc-bubble tc-bubble-me' : 'tc-bubble tc-bubble-other'}>
                    <div className="tc-line">
                      <span className="tc-author">{m.author_name}</span>
                      <span className="tc-time">
                        {new Date(m.created_at).toLocaleTimeString(undefined, {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {m.text && <p className="tc-text">{m.text}</p>}

                    {m.file_url && (
                      <div className="tc-file-wrap">
                        {m.file_type?.startsWith('image/') ? (
                          <a href={m.file_url} target="_blank" rel="noreferrer">
                            <img
                              src={m.file_url}
                              alt={m.file_name || 'Attachment'}
                              className="tc-file-image"
                            />
                          </a>
                        ) : (
                          <a href={m.file_url} target="_blank" rel="noreferrer" className="tc-file-link">
                            {m.file_name || 'Download file'}
                          </a>
                        )}
                      </div>
                    )}

                    {Object.keys(msgReactions).length > 0 && (
                      <div className="tc-reactions">
                        {Object.entries(msgReactions).map(([emoji, count]) => (
                          <span key={emoji} className="tc-reaction-chip">
                            <span>{emoji}</span>
                            <span className="tc-reaction-count">{count}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="tc-actions">
                    {REACTION_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleReaction(m.id, emoji)}
                        className="tc-reaction-btn"
                      >
                        {emoji}
                      </button>
                    ))}
                    {isNew && <span className="tc-new">New</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {typingList.length > 0 && (
        <div className="tc-typing">
          {typingList.length === 1
            ? `${typingList[0]} is typing...`
            : 'Several people are typing...'}
        </div>
      )}

      <form onSubmit={handleSend} className="tc-input-row">
        <input type="file" ref={fileInputRef} className="tc-hidden" onChange={handleFileSelected} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="tc-btn-secondary"
          disabled={sending}
        >
          Attach
        </button>
        <input
          type="text"
          className="tc-input"
          placeholder="Type a message for the team..."
          value={input}
          onChange={handleInputChange}
        />
        <button type="submit" disabled={sending || !input.trim()} className="tc-btn-primary">
          Send
        </button>
      </form>
    </div>
  );
};

export default TeamChatView;
