import { useEffect, useRef, useState } from "react";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import { LoadingBlock } from "../ui/Spinner";
import EmptyState from "../ui/EmptyState";
import { clockTime } from "../../lib/time";

export default function ChatPanel({ messages, loading, currentUserId, onSend, disabled }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-scroll to newest, but only if the user is already near the bottom.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onSend(value);
      setText("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-frame px-4 py-3.5">
        <h2 className="kicker text-mint">Live chat</h2>
        <span className="kicker text-muted">{messages.length}</span>
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {loading ? (
          <LoadingBlock label="Loading chat…" />
        ) : messages.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No messages yet"
            description="Say hi and get the party started."
            className="border-none bg-transparent"
          />
        ) : (
          messages.map((m) => (
            <ChatMessage key={m.id} message={m} isMine={m.senderUserId === currentUserId} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={submit} className="border-t border-frame p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
            rows={1}
            disabled={disabled}
            placeholder={disabled ? "Room has ended" : "Message the room…"}
            aria-label="Message the room"
            className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-[2px] border border-frame bg-canvas px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted focus:border-mint focus:outline-none disabled:opacity-60"
          />
          <Button type="submit" loading={sending} disabled={disabled || !text.trim()} className="shrink-0">
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

function ChatMessage({ message, isMine }) {
  return (
    <div className={`flex items-start gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}>
      <Avatar name={message.senderName} seed={message.senderUsername} size="sm" />
      <div className={`flex min-w-0 max-w-[80%] flex-col ${isMine ? "items-end text-right" : ""}`}>
        <div className={`flex items-baseline gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
          <span className="kicker text-muted-2">{isMine ? "You" : message.senderName}</span>
          <span className="font-mono text-[10px] text-muted">{clockTime(message.createdAt)}</span>
        </div>
        <p
          className={`mt-1.5 inline-block break-words rounded-[16px] px-3.5 py-2 text-sm leading-relaxed ${
            isMine
              ? "rounded-tr-[2px] bg-mint text-ink-invert"
              : "rounded-tl-[2px] bg-surface text-ink"
          }`}
        >
          {message.message}
        </p>
      </div>
    </div>
  );
}
