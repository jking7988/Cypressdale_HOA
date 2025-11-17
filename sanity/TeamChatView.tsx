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

  edited_at?: string | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
};

const ROOM_ID = 'global:board-chat';
const CHANNEL_NAME = 'team-chat';

const REACTION_OPTIONS = ['👍', '❤️', '🎉', '👀', '🤔', '✅'];

const EMOJI_PICKER = [
  '👍', '👎', '❤️', '💚', '💛', '💙', '💜', '🤍',
  '😂', '🤣', '😊', '😅', '😇', '🙃', '😉', '😍',
  '🤔', '🤨', '😐', '😴', '🥱', '🤯', '😬', '😮',
  '🎉', '✨', '💥', '✅', '❌', '⚠️', '🚀', '📌',
  '🙏', '👏', '🙌', '🤝', '🤙', '🤘', '☕', '🍕',
];

type ReactionsState = Record<string, Record<string, string[]>>;

const quoteLineStyle: React.CSSProperties = {
  borderLeft: '2px solid rgba(148,163,184,0.6)',
  paddingLeft: 8,
  marginBottom: 4,
  color: '#9CA3AF',
  fontSize: 13,
};

function nowIso() {
  return new Date().toISOString();
}

function renderWithMentions(text: string): React.ReactNode {
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    const trimmed = line.trim();
    const isQuote = trimmed.startsWith('>');
    const content = isQuote ? line.replace(/^\s*>\s?/, '') : line;

    const parts = content.split(/(\s+)/);
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

    return (
      <div key={lineIndex} style={{marginBottom: 2}}>
        {children}
      </div>
    );
  });
}

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
      <div style={{padding: 16, fontSize: 14, color: '#9CA3AF'}}>
        <div style={{fontWeight: 600, marginBottom: 6}}>
          Team chat not configured
        </div>
        <div style={{marginBottom: 6}}>
          Supabase credentials are missing in the Studio environment.
        </div>
        <div>
          Set{' '}
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              background: '#111827',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            SANITY_STUDIO_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              background: '#111827',
              padding: '2px 6px',
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
  const [reactions, setReactions] = useState<ReactionsState>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);

  // Soft delete + undo
  const [pendingDelete, setPendingDelete] = useState<Message | null>(null);
  const deleteTimerRef = useRef<number | null>(null);

  // Search
  const [search, setSearch] = useState('');

  // Upload status / error
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Show controls only on hover
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<any>(null);
  const lastTypingSentRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isWindowFocused, setIsWindowFocused] = useState(
    typeof document !== 'undefined' ? !document.hidden : true,
  );
  const [originalTitle] = useState(
    typeof document !== 'undefined' ? document.title : 'Team Chat',
  );

  // focus / visibility tracking for unread count
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

  // tab title
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (unreadCount > 0 && !isWindowFocused) {
      document.title = `(${unreadCount}) Team Chat – Cypressdale CMS`;
    } else {
      document.title = originalTitle;
    }
  }, [unreadCount, isWindowFocused, originalTitle]);

  function scrollToBottomInstant() {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({behavior: 'auto', block: 'end'});
  }

  function scrollToBottomSmooth() {
    if (!bottomRef.current) return;
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({behavior: 'smooth', block: 'end'});
    }, 0);
  }

  // load history + realtime channel
  useEffect(() => {
    let active = true;

    async function loadMessages() {
      setLoading(true);
      const {data, error} = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', ROOM_ID)
        // don't load soft-deleted rows
        .or('deleted.is.null,deleted.eq.false')
        .order('created_at', {ascending: true});

      if (!active) return;
      if (!error && data) {
        setMessages(data as Message[]);
        scrollToBottomInstant();
      }
      setLoading(false);
    }

    loadMessages();

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on('broadcast', {event: 'message'}, (payload) => {
        const msg = payload.payload as Message;
        setMessages((prev) => [...prev, msg]);
        if (!isWindowFocused) {
          setUnreadCount((prev) => prev + 1);
        } else {
          scrollToBottomSmooth();
        }
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
        const {messageId, emoji, userId: reactor} = payload.payload as {
          messageId: string;
          emoji: string;
          userId: string;
        };

        setReactions((prev) => {
          const next: ReactionsState = {...prev};
          const msgReacts = {...(next[messageId] || {})};
          const currentUsers = msgReacts[emoji] ? [...msgReacts[emoji]] : [];
          const idx = currentUsers.indexOf(reactor);

          if (idx === -1) {
            currentUsers.push(reactor);
          } else {
            currentUsers.splice(idx, 1);
          }

          if (currentUsers.length === 0) {
            delete msgReacts[emoji];
          } else {
            msgReacts[emoji] = currentUsers;
          }

          if (Object.keys(msgReacts).length === 0) {
            delete next[messageId];
          } else {
            next[messageId] = msgReacts;
          }

          return next;
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
        // Remove from local list when a final delete is broadcast
        setMessages((prev) => prev.filter((m) => m.id !== id));
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
    const presenceInterval = setInterval(sendPresence, 20_000);

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

      if (deleteTimerRef.current !== null) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, [isWindowFocused, userId, displayName]);

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

  function startEdit(message: Message) {
    setEditingId(message.id);
    setEditingText(message.text || '');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingText('');
  }

  async function saveEdit(message: Message) {
    const newText = editingText.trim();
    if (!newText) {
      cancelEdit();
      return;
    }

    const updated: Message = {
      ...message,
      text: newText,
      edited_at: nowIso(),
    };

    setMessages((prev) =>
      prev.map((m) => (m.id === message.id ? updated : m)),
    );
    cancelEdit();

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'edit',
        payload: updated,
      });
    }

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

  // Finalize delete after undo window expires
  async function finalizeDelete(message: Message) {
    const id = message.id;

    // Notify other clients to remove
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'delete',
        payload: {id},
      });
    }

    // Try hard delete first
    const {error} = await supabase.from('messages').delete().eq('id', id);

    if (error) {
      console.error('hard delete failed, trying soft delete:', error.message);

      // Fallback: soft delete so it never shows up in future loads
      const {error: softError} = await supabase
        .from('messages')
        .update({deleted: true, deleted_at: nowIso()})
        .eq('id', id);

      if (softError) {
        console.error('soft delete also failed:', softError.message);
      }
    }
  }

  // Start soft delete with undo window
  function deleteMessage(message: Message) {
    const id = message.id;

    // If there's already a pending delete, cancel it (no finalize) and overwrite
    if (deleteTimerRef.current !== null) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }

    // Remove from local UI immediately
    setMessages((prev) => prev.filter((m) => m.id !== id));
    setPendingDelete(message);

    // Start timer to finalize delete in 5s
    deleteTimerRef.current = window.setTimeout(() => {
      deleteTimerRef.current = null;
      if (pendingDelete && pendingDelete.id === id) {
        finalizeDelete(pendingDelete).catch((err) =>
          console.error('finalizeDelete error', err),
        );
        setPendingDelete(null);
      }
    }, 5000);
  }

  // Undo soft delete – restore message locally and cancel finalize
  function undoDelete() {
    if (!pendingDelete) return;

    if (deleteTimerRef.current !== null) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }

    const messageToRestore = pendingDelete;
    setPendingDelete(null);

    // Insert back and keep chronological order
    setMessages((prev) => {
      const next = [...prev, messageToRestore];
      next.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      );
      return next;
    });
  }

  function startReply(message: Message) {
    setReplyTo(message);
    if (inputRef.current) inputRef.current.focus();
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    let text = input.trim();
    if (!text) return;

    // If we're replying, prepend a nice "Reply to ..." quote block
    if (replyTo) {
      const base = (replyTo.text || '').replace(/\s+/g, ' ').trim();
      const snippet =
        base.length > 160 ? base.slice(0, 157).trimEnd() + '…' : base;

      const header = replyTo.author_name
        ? `Reply to "${replyTo.author_name}"`
        : 'Reply';

      const quoteLine = snippet ? `${header}: ${snippet}` : header;

      // This ends up rendered inside the grey quote bar
      const quoteBlock = `> ${quoteLine}\n\n`;

      text = quoteBlock + text;
    }

    const createdAt = nowIso();
    const messageId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-${Date.now()}`;

    const msg: Message = {
      id: messageId,
      room_id: ROOM_ID,
      author_name: displayName,
      text,
      created_at: createdAt,
    };

    setMessages((prev) => [...prev, msg]);
    setInput('');
    setReplyTo(null);
    setSending(true);
    scrollToBottomSmooth();

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: msg,
      });
    }

    const {error} = await supabase.from('messages').insert({
      id: messageId,
      room_id: ROOM_ID,
      author_name: displayName,
      text,
      created_at: createdAt,
    });

    setSending(false);

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      console.error('Supabase insert error:', error.message);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    try {
      setUploadingFile(true);

      const path = `${userId}/${Date.now()}-${file.name}`;
      const {error: uploadErrorRaw} = await supabase.storage
        .from('chat-uploads')
        .upload(path, file);

      if (uploadErrorRaw) {
        console.error(uploadErrorRaw);
        setUploadError(
          `Upload failed: ${uploadErrorRaw.message ?? 'Unknown error'}`,
        );
        return;
      }

      const {
        data: {publicUrl},
      } = supabase.storage.from('chat-uploads').getPublicUrl(path);

      const createdAt = nowIso();
      const messageId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `file-${Date.now()}`;

      const msg: Message = {
        id: messageId,
        room_id: ROOM_ID,
        author_name: displayName,
        text: file.name,
        created_at: createdAt,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
      };

      setMessages((prev) => [...prev, msg]);
      scrollToBottomSmooth();

      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'message',
          payload: msg,
        });
      }

      const {error: insertError} = await supabase.from('messages').insert({
        id: messageId,
        room_id: ROOM_ID,
        author_name: displayName,
        text: file.name,
        created_at: createdAt,
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
      });

      if (insertError) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        console.error(insertError);
        setUploadError(
          `Upload saved to storage but DB insert failed: ${insertError.message}`,
        );
      }
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleReaction(messageId: string, emoji: string) {
    setReactions((prev) => {
      const next: ReactionsState = {...prev};
      const msgReacts = {...(next[messageId] || {})};
      const currentUsers = msgReacts[emoji] ? [...msgReacts[emoji]] : [];
      const myIndex = currentUsers.indexOf(userId);

      if (myIndex === -1) {
        currentUsers.push(userId);
      } else {
        currentUsers.splice(myIndex, 1);
      }

      if (currentUsers.length === 0) {
        delete msgReacts[emoji];
      } else {
        msgReacts[emoji] = currentUsers;
      }

      if (Object.keys(msgReacts).length === 0) {
        delete next[messageId];
      } else {
        next[messageId] = msgReacts;
      }

      return next;
    });

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: {messageId, emoji, userId},
      });
    }
  }

  function insertEmojiIntoComposer(emoji: string) {
    if (!inputRef.current) {
      setInput((prev) => prev + emoji);
      return;
    }

    const el = inputRef.current;
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;

    const before = input.slice(0, start);
    const after = input.slice(end);

    const nextValue = before + emoji + after;
    const cursorPos = start + emoji.length;

    setInput(nextValue);

    setTimeout(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      try {
        inputRef.current.setSelectionRange(cursorPos, cursorPos);
      } catch {
        // ignore
      }
    }, 0);
  }

  const typingList = Object.values(typingUsers)
    .map((t) => t.name)
    .filter((n) => n && n !== displayName);

  const onlineList = Object.entries(onlineUsers).filter(
    ([id]) => id !== userId,
  );

  // Search-filtered messages
  const lowerSearch = search.trim().toLowerCase();
  const filteredMessages =
    !lowerSearch
      ? messages
      : messages.filter((m) => {
          const text = (m.text || '').toLowerCase();
          const author = (m.author_name || '').toLowerCase();
          return text.includes(lowerSearch) || author.includes(lowerSearch);
        });

  // --- styles ---
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#030712',
    color: '#E5E7EB',
    fontSize: 14,
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  };

  const headerOuterStyle: React.CSSProperties = {
    padding: '10px 16px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.3)',
  };

  const headerInnerStyle: React.CSSProperties = {
    maxWidth: 1024,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  };

  const headerLeftStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const avatarStyle: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: '999px',
    background: '#10B981',
    color: '#022C22',
    fontSize: 14,
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
    fontSize: 12,
    color: '#9CA3AF',
  };

  const onlinePillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 999,
    background: 'rgba(31, 41, 55, 0.85)',
    border: '1px solid rgba(55, 65, 81, 0.9)',
    fontSize: 12,
    color: '#D1D5DB',
  };

  const searchInputStyle: React.CSSProperties = {
    width: 220,
    borderRadius: 999,
    border: '1px solid rgba(75,85,99,0.9)',
    background: 'rgba(15,23,42,0.95)',
    color: '#E5E7EB',
    fontSize: 12,
    padding: '6px 10px',
    outline: 'none',
    marginTop: 6,
  };

  const messagesContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 16px 6px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  const messagesInnerStyle: React.CSSProperties = {
    maxWidth: 1024,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  const bubbleBase: React.CSSProperties = {
    maxWidth: '100%',
    borderRadius: 18,
    padding: '12px 16px',
    border: '1px solid rgba(55,65,81,0.9)',
    background: 'rgba(31, 41, 55, 0.9)',
  };

  const bubbleMe: React.CSSProperties = {
    ...bubbleBase,
    background: 'rgba(5, 150, 105, 0.2)',
    borderColor: 'rgba(16,185,129,0.8)',
  };

  const bubbleMetaRow: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  };

  const bubbleAuthor: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 13,
    color: '#E5E7EB',
  };

  const bubbleTimeRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 8,
  };

  const bubbleTime: React.CSSProperties = {
    fontSize: 12,
    color: '#9CA3AF',
  };

  const bubbleText: React.CSSProperties = {
    fontSize: 14,
    color: '#E5E7EB',
  };

  const reactionsRowStyle: React.CSSProperties = {
    marginTop: 6,
    display: 'flex',
    flexWrap: 'nowrap',
    gap: 6,
  };

  const reactionBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    padding: '2px 8px',
    fontSize: 12,
    background: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(55,65,81,0.9)',
  };

  const reactionButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: '1px solid rgba(55,65,81,0.7)',
    background: 'rgba(15,23,42,0.95)',
    color: '#E5E7EB',
    fontSize: 13,
    padding: '4px 9px',
    cursor: 'pointer',
  };

  const reactionButtonActiveStyle: React.CSSProperties = {
    background: 'rgba(16,185,129,0.2)',
    borderColor: 'rgba(16,185,129,0.9)',
  };

  const footerOuterStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(148, 163, 184, 0.3)',
    padding: '8px 16px 10px 16px',
  };

  const footerInnerStyle: React.CSSProperties = {
    maxWidth: 1024,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const attachButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: '1px solid rgba(75,85,99,0.9)',
    background: 'rgba(15,23,42,0.95)',
    color: '#E5E7EB',
    fontSize: 13,
    padding: '6px 14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const emojiToggleButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: '1px solid rgba(75,85,99,0.9)',
    background: 'rgba(15,23,42,0.95)',
    color: '#E5E7EB',
    fontSize: 16,
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const textInputStyle: React.CSSProperties = {
    flex: 1,
    borderRadius: 999,
    border: '1px solid rgba(75,85,99,0.9)',
    background: 'rgba(15,23,42,0.95)',
    color: '#E5E7EB',
    fontSize: 14,
    padding: '8px 16px',
    outline: 'none',
  };

  const sendButtonStyle: React.CSSProperties = {
    borderRadius: 999,
    border: 'none',
    background: sending ? 'rgba(16,185,129,0.3)' : '#10B981',
    color: '#022C22',
    fontSize: 13,
    fontWeight: 600,
    padding: '7px 18px',
    cursor: sending ? 'default' : 'pointer',
  };

  const typingStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#9CA3AF',
    paddingTop: 2,
  };

  const replyBannerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '6px 10px',
    borderRadius: 10,
    background: 'rgba(15,23,42,0.9)',
    border: '1px solid rgba(55,65,81,0.8)',
    fontSize: 12,
    color: '#D1D5DB',
  };

  const emojiPickerStyle: React.CSSProperties = {
    marginTop: 6,
    padding: 8,
    borderRadius: 12,
    background: 'rgba(15,23,42,0.97)',
    border: '1px solid rgba(55,65,81,0.9)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 260,
  };

  const emojiPickerButtonStyle: React.CSSProperties = {
    border: 'none',
    background: 'transparent',
    padding: '4px 5px',
    cursor: 'pointer',
    fontSize: 18,
  };

  const composerEmojiPickerStyle: React.CSSProperties = {
    marginTop: 6,
    padding: 8,
    borderRadius: 12,
    background: 'rgba(15,23,42,0.97)',
    border: '1px solid rgba(55,65,81,0.9)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    maxWidth: 320,
  };

  const undoBannerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 8,
    background: 'rgba(30,64,75,0.9)',
    border: '1px solid rgba(148,163,184,0.7)',
    fontSize: 12,
    color: '#E5E7EB',
  };

  const errorBannerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '6px 10px',
    borderRadius: 8,
    background: 'rgba(127,29,29,0.9)',
    border: '1px solid rgba(248,113,113,0.8)',
    fontSize: 12,
    color: '#FEE2E2',
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
              <div style={{fontSize: 15, fontWeight: 600}}>
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
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: '#22C55E',
                        }}
                      />
                      <span
                        style={{
                          maxWidth: 140,
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
            <div style={{fontSize: 12, color: '#9CA3AF'}}>
              Room:{' '}
              <span style={{fontFamily: 'monospace'}}>{ROOM_ID}</span>
            </div>
            {unreadCount > 0 && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#22C55E',
                  marginTop: 2,
                }}
              >
                • {unreadCount} new message{unreadCount > 1 ? 's' : ''}
              </div>
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
              style={searchInputStyle}
            />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={messagesContainerStyle}>
        <div style={messagesInnerStyle}>
          {loading ? (
            <div style={{fontSize: 13, color: '#9CA3AF'}}>
              Loading messages…
            </div>
          ) : messages.length === 0 ? (
            <div style={{fontSize: 13, color: '#9CA3AF'}}>
              No messages yet. Start the conversation!
            </div>
          ) : filteredMessages.length === 0 ? (
            <div style={{fontSize: 13, color: '#9CA3AF'}}>
              No messages match your search.
            </div>
          ) : (
            filteredMessages.map((m, index) => {
              const isMe = m.author_name === displayName;
              const alignmentStyle: React.CSSProperties = {
                display: 'flex',
                justifyContent: isMe ? 'flex-end' : 'flex-start',
              };
              const bubbleStyle = isMe ? bubbleMe : bubbleBase;
              const msgReactions = reactions[m.id] || {};

              const currentDay = formatDayLabel(m.created_at);
              const prev =
                index > 0 ? filteredMessages[index - 1] : null;
              const prevDay = prev ? formatDayLabel(prev.created_at) : null;
              const showDaySeparator = currentDay && currentDay !== prevDay;

              const showHeader = true;
              const isHovered =
                hoveredMessageId === m.id || editingId === m.id;

              return (
                <React.Fragment key={m.id}>
                  {showDaySeparator && (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '10px 0 4px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: '#9CA3AF',
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: 'rgba(15,23,42,0.95)',
                          border: '1px solid rgba(55,65,81,0.9)',
                        }}
                      >
                        {currentDay}
                      </span>
                    </div>
                  )}

                  <div
                    style={alignmentStyle}
                    onMouseEnter={() => setHoveredMessageId(m.id)}
                    onMouseLeave={() =>
                      setHoveredMessageId((prev) =>
                        prev === m.id ? null : prev,
                      )
                    }
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        gap: 4,
                        width: '100%',
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
                              {m.edited_at && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: '#9CA3AF',
                                  }}
                                >
                                  (edited)
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {m.text ? (
                          <div style={bubbleText}>
                            {renderWithMentions(m.text)}
                          </div>
                        ) : null}

                        {editingId === m.id && (
                          <div style={{marginTop: 8}}>
                            <input
                              type="text"
                              value={editingText}
                              onChange={(e) =>
                                setEditingText(e.target.value)
                              }
                              style={{
                                width: '100%',
                                borderRadius: 10,
                                border:
                                  '1px solid rgba(75,85,99,0.9)',
                                background: 'rgba(15,23,42,0.95)',
                                color: '#E5E7EB',
                                fontSize: 13,
                                padding: '6px 10px',
                                outline: 'none',
                              }}
                            />
                          </div>
                        )}

                        {m.file_url && (
                          <div style={{marginTop: 6}}>
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
                                    maxHeight: 220,
                                    borderRadius: 10,
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
                                  fontSize: 13,
                                  color: '#6EE7B7',
                                  textDecoration: 'underline',
                                }}
                              >
                                {m.file_name || 'Download file'}
                              </a>
                            )}
                          </div>
                        )}

                        {Object.keys(msgReactions).length > 0 && (
                          <div style={reactionsRowStyle}>
                            {Object.entries(msgReactions).map(
                              ([emoji, users]) => {
                                const arr = users || [];
                                const count = arr.length;
                                const iReacted = arr.includes(userId);
                                if (count === 0) return null;
                                return (
                                  <span
                                    key={emoji}
                                    style={{
                                      ...reactionBadgeStyle,
                                      ...(iReacted
                                        ? {
                                            borderColor:
                                              'rgba(16,185,129,0.9)',
                                            background:
                                              'rgba(16,185,129,0.18)',
                                          }
                                        : {}),
                                    }}
                                  >
                                    <span>{emoji}</span>
                                    <span style={{color: '#9CA3AF'}}>
                                      {count}
                                    </span>
                                  </span>
                                );
                              },
                            )}
                          </div>
                        )}
                      </div>

                      {/* Controls row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          marginTop: 2,
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Reactions always visible */}
                        <div style={{display: 'flex', gap: 6, flexWrap: 'wrap'}}>
                          {REACTION_OPTIONS.map((emoji) => {
                            const users = msgReactions[emoji] || [];
                            const iReacted = users.includes(userId);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() =>
                                  handleReaction(m.id, emoji)
                                }
                                style={{
                                  ...reactionButtonStyle,
                                  ...(iReacted
                                    ? reactionButtonActiveStyle
                                    : {}),
                                }}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() =>
                              setEmojiPickerFor(
                                emojiPickerFor === m.id ? null : m.id,
                              )
                            }
                            style={{
                              ...reactionButtonStyle,
                              padding: '4px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <span>😀</span>
                            <span style={{fontSize: 11}}>More</span>
                          </button>
                        </div>

                        {/* Reply / Edit / Delete – only on hover / editing */}
                        <div
                          style={{
                            display: isHovered ? 'flex' : 'none',
                            gap: 8,
                            fontSize: 12,
                            flexShrink: 0,
                          }}
                        >
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

                          {isMe && (
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

                      {emojiPickerFor === m.id && (
                        <div style={emojiPickerStyle}>
                          {EMOJI_PICKER.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                handleReaction(m.id, emoji);
                                setEmojiPickerFor(null);
                              }}
                              style={emojiPickerButtonStyle}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Footer */}
      <div style={footerOuterStyle}>
        <div style={footerInnerStyle}>
          {uploadError && (
            <div style={errorBannerStyle}>
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#FCA5A5',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Dismiss
              </button>
            </div>
          )}

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
                    {replyTo.text.length > 80
                      ? replyTo.text.slice(0, 77).trimEnd() + '…'
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
                  fontSize: 12,
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {pendingDelete && (
            <div style={undoBannerStyle}>
              <span>Message deleted.</span>
              <button
                type="button"
                onClick={undoDelete}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#6EE7B7',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Undo
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
              disabled={sending || uploadingFile}
            >
              {uploadingFile ? 'Uploading…' : 'Attach'}
            </button>

            <button
              type="button"
              onClick={() =>
                setComposerEmojiOpen((prev) => !prev)
              }
              style={emojiToggleButtonStyle}
            >
              😊
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

          {composerEmojiOpen && (
            <div style={composerEmojiPickerStyle}>
              {EMOJI_PICKER.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => insertEmojiIntoComposer(emoji)}
                  style={emojiPickerButtonStyle}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamChatView;
