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

  // edit/delete support
  edited_at?: string | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
};

const ROOM_ID = 'global:board-chat';
const CHANNEL_NAME = 'team-chat';
const REACTION_OPTIONS = ['👍', '❤️', '🎉'];

// Quote line styling
const quoteLineStyle: React.CSSProperties = {
  borderLeft: '2px solid rgba(148,163,184,0.6)',
  paddingLeft: 8,
  marginBottom: 2,
  color: '#9CA3AF',
  fontSize: 12,
};

function nowIso() {
  return new Date().toISOString();
}

// Render text with @mentions + quote blocks (lines starting with ">")
function renderWithMentions(text: string): React.ReactNode {
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    const trimmed = line.trim();
    const isQuote = trimmed.startsWith('>');
    const content = isQuote ? line.replace(/^\s*>\s?/, '') : line;

    const parts = content.split(/(\s+)/); // keep spaces
    const children = parts.map((part, idx) => {
      if (part.startsWith('@') && part.length > 1 && !part.includes('\n')) {
        return (
          <span key={idx} style={{color: '#A5B4FC', fontWeight: 500}}>
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });

    if (isQuote) {
      return (
        <div key={lineIndex} style={quoteLineStyle}>
          {children}
        </div>
      );
    }

    return <div key={lineIndex}>{children}</div>;
  });
}

// Day label helper: Today / Yesterday / date
function formatDayLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const today = new Date();
  const oneDay = 24 * 60 * 60 * 1000;

  const dayIndex = Math.floor(d.setHours(0, 0, 0, 0) / oneDay);
  const todayIndex = Math.floor(today.setHours(0, 0, 0, 0) / oneDay);
  const diff = dayIndex - todayIndex;

  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const TeamChatView = () => {
  const user = useCurrentUser();

  if (!supabase) {
    return (
      <div style={{padding: 12, fontSize: 13, color: '#9CA3AF'}}>
        <div style={{fontWeight: 600, marginBottom: 4}}>
          Team chat not configured
        </div>
        <div style={{marginBottom: 4}}>
          Supabase credentials are missing in the Studio environment.
        </div>
        <div>
          Set{' '}
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              background: '#111827',
              padding: '1px 4px',
              borderRadius: 4,
            }}
          >
            SANITY_STUDIO_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              background: '#111827',
              padding: '1px 4px',
              borderRadius: 4,
            }}
          >
            SANITY_STUDIO_SUPABASE_ANON_KEY
          </code>{' '}
          to enable live chat.
        </div>
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
  const [typingUsers, setTypingUsers] = useState<
    Record<string, {name: string; last: number}>
  >({});
  const [onlineUsers, setOnlineUsers] = useState<
    Record<string, {name: string; last: number}>
  >({});
  const [reactions, setReactions] = useState<
    Record<string, Record<string, number>>
  >({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [pendingUndo, setPendingUndo] = useState<{
    id: string;
    original: Message;
  } | null>(null);

  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deleteTimerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isWindowFocused, setIsWindowFocused] = useState(
    typeof document !== 'undefined' ? !document.hidden : true,
  );
  const [originalTitle] = useState(
    typeof document !== 'undefined' ? document.title : 'Team Chat',
  );

  // Focus / blur / visibility -> unread & focus state
  useEffect(() => {
    function handleFocus() {
      setIsWindowFocused(true);
      setUnreadCount(0);
    }

    function handleBlur() {
      setIsWindowFocused(false);
    }

    function handleVisibility() {
      if (document.hidden) {
        setIsWindowFocused(false);
      } else {
        setIsWindowFocused(true);
        setUnreadCount(0);
      }
    }

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Tab title notifications
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (unreadCount > 0 && !isWindowFocused) {
      document.title = `(${unreadCount}) Team Chat – Cypressdale CMS`;
    } else {
      document.title = originalTitle;
    }
  }, [unreadCount, isWindowFocused, originalTitle]);

  // Helpers: scroll
  function scrollToBottomInstant() {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({behavior: 'auto', block: 'end'});
  }

  function scrollToBottomSmooth() {
    if (!bottomRef.current) return;
    // Let React paint first
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({behavior: 'smooth', block: 'end'});
    }, 0);
  }

  // Load history + setup broadcast channel
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
        scrollToBottomInstant(); // initial scroll, no flicker
      }
      setLoading(false);
    }

    loadMessages();

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on('broadcast', {event: 'message'}, (payload) => {
        const msg = payload.payload as Message;
        setMessages((prev) => [...prev, msg]);

        // Only count as unread if this window/tab is not focused
        if (!isWindowFocused) {
          setUnreadCount((prev) => prev + 1);
        }

        // IMPORTANT: do NOT auto-scroll here, so we don't fight the user
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
      .on('broadcast', {event: 'edit'}, (payload) => {
        const updated = payload.payload as Message;
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? {...m, ...updated} : m)),
        );
      })
      .on('broadcast', {event: 'delete'}, (payload) => {
        const {id} = payload.payload as {id: string};
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id
              ? {...m, deleted: true, text: '', file_url: null}
              : m,
          ),
        );
      })
      .subscribe();

    channelRef.current = channel;

    // presence pings
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

    // prune stale typing & presence
    const pruneInterval = setInterval(() => {
      const cutoffTyping = Date.now() - 3_000;
      const cutoffPresence = Date.now() - 30_000;

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
  }, [isWindowFocused, userId, displayName]);

  // Typing broadcast
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

  // Start / cancel / save edit
  function startEdit(message: Message) {
    if (message.deleted) return;
    setEditingId(message.id);
    setEditingText(message.text || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText('');
  }

  async function saveEdit(message: Message) {
    const newText = editingText.trim();
    if (!newText || message.deleted) {
      cancelEdit();
      return;
    }

    const updated: Message = {
      ...message,
      text: newText,
      edited_at: nowIso(),
    };

    // optimistic
    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? updated : m)),
    );
    cancelEdit();

    // broadcast
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'edit',
        payload: updated,
      });
    }

    // persist
    const {error} = await supabase
      .from('messages')
      .update({
        text: newText,
        edited_at: updated.edited_at,
      })
      .eq('id', message.id);

    if (error) {
      console.error('edit error', error.message);
    }
  }

  // Delete + undo
  async function deleteMessage(message: Message) {
    if (message.deleted) return;

    const original = {...message};
    const id = message.id;

    // optimistic mark deleted
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id ? {...m, deleted: true, text: '', file_url: null} : m,
      ),
    );

    // allow undo for 5s
    setPendingUndo({id, original});

    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(async () => {
      setPendingUndo(null);

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'delete',
          payload: {id},
        });
      }

      const {error} = await supabase
        .from('messages')
        .update({deleted: true, deleted_at: nowIso()})
        .eq('id', id);

      if (error) console.error('delete error', error.message);
    }, 5000);
  }

  function undoDelete() {
    if (!pendingUndo) return;
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === pendingUndo.id ? pendingUndo.original : m,
      ),
    );
    setPendingUndo(null);
  }

  // Start a reply to a message
  function startReply(message: Message) {
    if (message.deleted) return;
    setReplyTo(message);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  // Send message (with optional quoted reply)
  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    let text = input.trim();
    if (!text) return;

    if (replyTo) {
      const base = (replyTo.text || '').replace(/\s+/g, ' ').trim();
      const snippet =
        base.length > 160 ? base.slice(0, 157).trimEnd() + '…' : base;
      const quoteBlock = snippet ? `> ${snippet}\n\n` : '';
      text = quoteBlock + text;
    }

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

    // optimistic
    setMessages((prev) => [...prev, msg]);
    setInput('');
    setReplyTo(null);
    setSending(true);
    scrollToBottomSmooth();

    // broadcast
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
          : `file-${Date.now()}`)

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
      scrollToBottomSmooth();

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message',
          payload: msg,
        });
      }

      // persist
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
      const current = {...prev};
      const forMsg = {...(current[messageId] || {})};
      forMsg[emoji] = (forMsg[emoji] || 0) + 1;
      current[messageId] = forMsg;
      return current;
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

  const onlineList = Object.entries(onlineUsers).filter(
    ([id]) => id !== userId,
  );

  // ---------- Styles ----------
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#030712',
    color: '#E5E7EB',
    fontSize: 13,
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  const headerOuterStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.3)',
  };

  const headerInnerStyle: React.CSSProperties = {
    maxWidth: 1024,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  };

  const headerLeftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const avatarStyle: React.CSSProperties = {
    width: 26,
    height: 26,
    borderRadius: '999px',
    background: '#10B981',
    color: '#022C22',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const headerTextStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };

  const subTextStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#9CA3AF',
  };

  const onlinePillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 999,
    background: 'rgba(31, 41, 55, 0.85)',
    border: '1px solid rgba(55, 65, 81, 0.9)',
    fontSize: 11,
    color: '#D1D5DB',
  };

  const messagesContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 12px 4px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const messagesInnerStyle: React.CSSProperties = {
    maxWidth: 1024,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const bubbleBase: React.CSSProperties = {
    maxWidth: '100%',
    borderRadius: 14,
    padding: '8px 12px',
    border: '1px solid rgba(55,65,81,0.9)',
    background: 'rgba(31, 41, 55, 0.9)',
  };

  const bubbleMe: React.CSSProperties = {
    ...bubbleBase,
    background: 'rgba(5, 150, 105, 0.18)',
    borderColor: 'rgba(16,185,129,0.7)',
  };

  const bubbleMetaRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 2,
  };

  const bubbleAuthor: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 12,
    color: '#E5E7EB',
  };

  const bubbleTimeRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
  };

  const bubbleTime: React.CSSProperties = {
    fontSize: 11,
    color: '#9CA3AF',
  };

  const bubbleText: React.CSSProperties = {
    fontSize: 12,
    color: '#E5E7EB',
  };

  const reactionsRowStyle: React.CSSProperties = {
    marginTop: 4,
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 4,
  };

  const reactionBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    padding: '1px 6px',
    fontSize: 11,
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(55,65,81,0.9)',
  };

  const reactionButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: '1px solid rgba(55,65,81,0.7)',
    background: 'rgba(15,23,42,0.9)',
    color: '#E5E7EB',
    fontSize: 11,
    padding: '2px 7px',
    cursor: 'pointer',
  };

  const footerOuterStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(148, 163, 184, 0.3)',
    padding: '6px 12px 8px 12px',
  };

  const footerInnerStyle: React.CSSProperties = {
    maxWidth: 1024,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const attachButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: '1px solid rgba(75,85,99,0.9)',
    background: 'rgba(15,23,42,0.9)',
    color: '#E5E7EB',
    fontSize: 11,
    padding: '4px 12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const textInputStyle: React.CSSProperties = {
    flex: 1,
    borderRadius: 999,
    border: '1px solid rgba(75,85,99,0.9)',
    background: 'rgba(15,23,42,0.9)',
    color: '#E5E7EB',
    fontSize: 13,
    padding: '6px 12px',
    outline: 'none',
  };

  const sendButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: 'none',
    background: sending ? 'rgba(16,185,129,0.3)' : '#10B981',
    color: '#022C22',
    fontSize: 12,
    fontWeight: 600,
    padding: '5px 14px',
    cursor: sending ? 'default' : 'pointer',
  };

  const typingStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#9CA3AF',
    paddingTop: 2,
  };

  const replyBannerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '4px 8px',
    borderRadius: 8,
    background: 'rgba(15,23,42,0.9)',
    border: '1px solid rgba(55,65,81,0.8)',
    fontSize: 11,
    color: '#D1D5DB',
  };

  const typingStr =
    typingList.length === 0
      ? ''
      : typingList.length === 1
        ? `${typingList[0]} is typing…`
        : 'Several people are typing…';

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerOuterStyle}>
        <div style={headerInnerStyle}>
          <div style={headerLeftStyle}>
            <div style={avatarStyle}>{initials}</div>
            <div style={headerTextStyle}>
              <div style={{fontSize: 14, fontWeight: 600}}>
                Board / Team chat
              </div>
              <div style={subTextStyle}>Online as {displayName}</div>
              {onlineList.length > 0 && (
                <div
                  style={{
                    marginTop: 2,
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                  }}
                >
                  {onlineList.map(([id, info]) => (
                    <span key={id} style={onlinePillStyle}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          background: '#22C55E',
                        }}
                      />
                      <span
                        style={{
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {info.name}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{textAlign: 'right'}}>
            <div style={{fontSize: 11, color: '#9CA3AF'}}>
              Room:{' '}
              <span style={{fontFamily: 'monospace'}}>{ROOM_ID}</span>
            </div>
            {unreadCount > 0 && (
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#22C55E',
                  marginTop: 2,
                }}
              >
                • {unreadCount} new message{unreadCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={messagesContainerStyle}>
        <div style={messagesInnerStyle}>
          {loading ? (
            <div style={{fontSize: 12, color: '#9CA3AF'}}>
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div style={{fontSize: 12, color: '#9CA3AF'}}>
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((m, index) => {
              const isMe = m.author_name === displayName;
              const alignmentStyle: React.CSSProperties = {
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
              };
              const bubbleStyle = isMe ? bubbleMe : bubbleBase;
              const msgReactions = reactions[m.id] || {};

              // Day separator
              const currentDay = formatDayLabel(m.created_at);
              const prev = index > 0 ? messages[index - 1] : null;
              const prevDay = prev ? formatDayLabel(prev.created_at) : null;
              const showDaySeparator = currentDay && currentDay !== prevDay;

              const showHeader = true; // always show name + time

              return (
                <React.Fragment key={m.id}>
                  {showDaySeparator && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '8px 0',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: '#9CA3AF',
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: 'rgba(15,23,42,0.9)',
                          border: '1px solid rgba(55,65,81,0.8)',
                        }}
                      >
                        {currentDay}
                      </span>
                    </div>
                  )}

                  <div style={alignmentStyle}>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        gap: 3,
                      }}
                    >
                      <div style={bubbleStyle}>
                        {showHeader && (
                          <div style={bubbleMetaRow}>
                            <div style={bubbleAuthor}>{m.author_name}</div>
                            <div style={bubbleTimeRow}>
                              <div style={bubbleTime}>
                                {new Date(
                                  m.created_at,
                                ).toLocaleTimeString(undefined, {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </div>
                              {m.edited_at && !m.deleted && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: '#9CA3AF',
                                  }}
                                >
                                  (edited)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* message text / deleted placeholder */}
                        {m.deleted ? (
                          <div
                            style={{
                              ...bubbleText,
                              fontStyle: 'italic',
                              color: '#6B7280',
                            }}
                          >
                            Message deleted
                          </div>
                        ) : m.text ? (
                          <div style={bubbleText}>
                            {renderWithMentions(m.text)}
                          </div>
                        ) : null}

                        {/* inline edit input */}
                        {editingId === m.id && !m.deleted && (
                          <div style={{marginTop: 6}}>
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) =>
                                setEditingText(e.target.value)
                              }
                              style={{
                                width: '100%',
                                borderRadius: 8,
                                border: '1px solid rgba(75,85,99,0.9)',
                                background: 'rgba(15,23,42,0.9)',
                                color: '#E5E7EB',
                                fontSize: 12,
                                padding: '4px 8px',
                                outline: 'none',
                              }}
                            />
                          </div>
                        )}

                        {/* Attachment */}
                        {m.file_url && (
                          <div style={{marginTop: 4}}>
                            {m.file_type?.startsWith('image/') ? (
                              <a
                                href={m.file_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={m.file_url}
                                  alt={m.file_name || 'Attachment'}
                                  style={{
                                    maxHeight: 180,
                                    borderRadius: 8,
                                    border:
                                      '1px solid rgba(75,85,99,0.8)',
                                  }}
                                />
                              </a>
                            ) : (
                              <a
                                href={m.file_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  fontSize: 12,
                                  color: '#6EE7B7',
                                  textDecoration: 'underline',
                                }}
                              >
                                {m.file_name || 'Download file'}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Reactions display */}
                        {Object.keys(msgReactions).length > 0 && (
                          <div style={reactionsRowStyle}>
                            {Object.entries(msgReactions).map(
                              ([emoji, count]) => (
                                <span
                                  key={emoji}
                                  style={reactionBadgeStyle}
                                >
                                  <span>{emoji}</span>
                                  <span style={{color: '#9CA3AF'}}>
                                    {count}
                                  </span>
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      {/* Reactions + reply + edit/delete controls */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 2,
                        }}
                      >
                        <div style={{display: 'flex', gap: 4}}>
                          {REACTION_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() =>
                                handleReaction(m.id, emoji)
                              }
                              style={reactionButtonStyle}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            gap: 6,
                            fontSize: 11,
                          }}
                        >
                          {!m.deleted && (
                            <button
                              type="button"
                              onClick={() => startReply(m)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#9CA3AF',
                                cursor: 'pointer',
                              }}
                            >
                              Reply
                            </button>
                          )}

                          {isMe && !m.deleted && (
                            <>
                              {editingId === m.id ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => saveEdit(m)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#10B981',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEdit}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#9CA3AF',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEdit(m)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#9CA3AF',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteMessage(m)
                                    }
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      color: '#F97373',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Undo toast */}
      {pendingUndo && (
        <div
          style={{
            maxWidth: 1024,
            margin: '0 auto 4px auto',
            padding: '4px 8px',
            fontSize: 11,
            color: '#FBBF24',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Message deleted. Undo?</span>
          <button
            type="button"
            onClick={undoDelete}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#FDE68A',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* Typing + reply banner + input */}
      <div style={footerOuterStyle}>
        <div style={footerInnerStyle}>
          {typingStr && <div style={typingStyle}>{typingStr}</div>}

          {replyTo && (
            <div style={replyBannerStyle}>
              <div>
                <span style={{color: '#9CA3AF', marginRight: 4}}>
                  Replying to
                </span>
                <span style={{fontWeight: 600}}>
                  {replyTo.author_name}
                </span>
                {replyTo.text && (
                  <span style={{marginLeft: 6, opacity: 0.8}}>
                    ·{' '}
                    {replyTo.text.length > 60
                      ? replyTo.text.slice(0, 57).trimEnd() + '…'
                      : replyTo.text}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <form onSubmit={handleSend} style={inputRowStyle}>
            <input
              type="file"
              ref={fileInputRef}
              style={{display: 'none'}}
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={attachButtonStyle}
              disabled={sending}
            >
              Attach
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a message for the team…"
              value={input}
              onChange={handleInputChange}
              style={textInputStyle}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={sendButtonStyle}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TeamChatView;
