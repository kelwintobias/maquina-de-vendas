"use client";

import { useState, useEffect, useRef } from "react";
import type { Message, Conversation, Tag, Lead } from "@/lib/types";

interface ChatViewProps {
  conversation: Conversation;
  tags: Tag[];
}

function formatTime(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatView({ conversation, tags }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (res.ok) {
        setText("");
        setTimeout(fetchMessages, 500);
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const lead = conversation.leads;
  const channel = conversation.channels;
  const displayName = lead?.name || lead?.phone || "Desconhecido";
  const isMetaCloud = channel?.provider === "meta_cloud";

  const leadTagIds = lead
    ? tags.filter((t) => (lead as Lead & { tag_ids?: string[] }).tag_ids?.includes(t.id))
    : [] as Tag[];

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#e5e5dc]">
        <div className="w-10 h-10 rounded-full bg-[#c8cc8e] flex items-center justify-center text-white font-medium">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-[#1f1f1f] font-medium text-sm">{displayName}</h2>
          <p className="text-[#9ca3af] text-xs">{lead?.phone || ""}</p>
        </div>
        {channel && (
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
              isMetaCloud
                ? "bg-[#c8cc8e] text-[#1f1f1f]"
                : "bg-[#93c5fd] text-[#1e3a5f]"
            }`}
          >
            {channel.name}
          </span>
        )}
        {leadTagIds.length > 0 && (
          <div className="flex gap-1">
            {leadTagIds.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-0.5 rounded-full text-xs text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-[#f6f7ed]">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#c8cc8e] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-[#9ca3af] text-sm text-center py-8">Nenhuma mensagem.</p>
        )}
        {messages.map((msg) => {
          const isFromMe = msg.role === "assistant" || msg.sent_by === "agent" || msg.sent_by === "seller";
          return (
            <div
              key={msg.id}
              className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] px-3 py-2 ${
                  isFromMe
                    ? "bg-[#1f1f1f] text-white rounded-2xl rounded-br-sm"
                    : "bg-white border border-[#e5e5dc] text-[#1f1f1f] rounded-2xl rounded-bl-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={`text-[11px] mt-1 ${
                    isFromMe ? "text-white/50" : "text-[#9ca3af]"
                  }`}
                >
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-[#e5e5dc]">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digitar mensagem..."
            rows={1}
            className="flex-1 bg-[#f6f7ed] text-[#1f1f1f] text-sm rounded-2xl px-4 py-2.5 placeholder-[#9ca3af] outline-none focus:ring-1 focus:ring-[#c8cc8e] resize-none max-h-32 border border-[#e5e5dc]"
          />
          <button
            onClick={handleSend}
            disabled={sending || !text.trim()}
            className="bg-[#1f1f1f] text-white p-2.5 rounded-full hover:bg-[#333] disabled:opacity-50 flex-shrink-0 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
