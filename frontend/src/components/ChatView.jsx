// components/ChatView.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { MessageSquare, Users as UsersIcon, Send as SendIcon } from "lucide-react";

export default function ChatView({ theme, users, currentUser, chatState, setChatState }) {
  // ---------- helpers ----------
  const dmKey = (a, b) => `dm:${[a.toLowerCase(), b.toLowerCase()].sort().join("|")}`;
  const isDark = theme === "dark";
  const inputRef = useRef(null);

  // left list
  const peers = useMemo(
    () => users.filter(u => u.email !== currentUser.email && u.active !== false),
    [users, currentUser.email]
  );

  // selection: "general" or "dm:alice|bob"
  const [sel, setSel] = useState("general");

  // compute active id + title
  const activeId = sel === "general" ? "general" : sel;
  const title = useMemo(() => {
    if (activeId === "general") return "General";
    const [, pair] = activeId.split(":"); // alice|bob
    const [a, b] = pair.split("|");
    const other = [a, b].find(e => e !== currentUser.email.toLowerCase()) || a;
    const u = users.find(x => x.email.toLowerCase() === other);
    return u?.name?.toUpperCase?.() || u?.email?.toUpperCase?.() || "Direct Message";
  }, [activeId, users, currentUser.email]);

  // messages for the thread (BOTH sides)
  const threadMsgs = useMemo(() => {
    const list = (chatState?.messages || []).filter(m => m.channelId === activeId);
    return list.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  }, [chatState?.messages, activeId]);

  // compose/send
  const [text, setText] = useState("");
  const send = () => {
    const t = text.trim();
    if (!t) return;
    const msg = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      channelId: activeId,
      text: t,
      ts: new Date().toISOString(),
      user: { email: currentUser.email, name: currentUser.name, role: currentUser.role },
    };
    setChatState(prev => ({ ...prev, messages: [...(prev.messages || []), msg] }));
    setText("");
    // keep focus for fast typing
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // enter to send, shift+enter = newline
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // auto-select DM you last visited (optional)
  useEffect(() => {
    if (!sel) setSel("general");
  }, [sel]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* LEFT: channels & DMs */}
      <div className={`rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white"} p-4 lg:col-span-1`}>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquare className="w-4 h-4" />
          <span>Channels & DMs</span>
        </div>

        <div className="mt-3 space-y-2">
          <button
            onClick={() => setSel("general")}
            className={`w-full text-left px-3 py-2 rounded-xl ${
              activeId === "general"
                ? isDark ? "bg-slate-800" : "bg-slate-100"
                : isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"
            }`}
          >
            # General
          </button>

          <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"} px-1 mt-2`}>Direct messages</div>
          {peers.map(p => {
            const key = dmKey(currentUser.email, p.email);
            return (
              <button
                key={p.email}
                onClick={() => setSel(key)}
                className={`w-full text-left px-3 py-2 rounded-xl ${
                  activeId === key
                    ? isDark ? "bg-slate-800" : "bg-slate-100"
                    : isDark ? "hover:bg-slate-800" : "hover:bg-slate-50"
                }`}
              >
                DM · {p.name || p.email}
              </button>
            );
          })}

          <div className={`mt-3 text-xs ${isDark ? "text-slate-400" : "text-slate-500"} flex items-center gap-1 px-1`}>
            <UsersIcon className="w-3.5 h-3.5" />
            Online (simulated)
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {users.map(u => (
              <span
                key={u.email}
                className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}
              >
                {u.name || u.email}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: thread */}
      <div className={`rounded-2xl border ${isDark ? "bg-slate-900 border-slate-800" : "bg-white"} p-4 lg:col-span-2 flex flex-col`}>
        <div className="font-semibold">{title}</div>
        <div className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Internal chat (localStorage-backed)</div>

        <div className="mt-4 flex-1 overflow-auto pr-1">
          {threadMsgs.length === 0 && (
            <div className={`${isDark ? "text-slate-400" : "text-slate-500"} text-sm`}>No messages yet.</div>
          )}

          {threadMsgs.map(m => {
            const mine = m.user?.email === currentUser.email;
            return (
              <div key={m.id} className={`w-full flex ${mine ? "justify-end" : "justify-start"} mb-3`}>
                <div
                  className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-indigo-600 text-white"
                      : isDark
                      ? "bg-slate-800 text-slate-100"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="text-[11px] opacity-80 mb-0.5">
                    {m.user?.name?.toUpperCase?.()} <span className="opacity-70">[{m.user?.role}]</span>{" "}
                    <span className="opacity-70">{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* composer */}
        <div className={`mt-3 flex items-center gap-2 rounded-xl border px-3 ${isDark ? "border-slate-700" : ""}`}>
          <textarea
            ref={inputRef}
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message... (Shift+Enter for newline)"
            className={`flex-1 resize-none py-2 outline-none ${isDark ? "bg-transparent text-slate-100" : "text-slate-800"}`}
          />
          <button
            onClick={send}
            className={`rounded-xl ${isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-900 hover:bg-black"} text-white px-3 py-2`}
            title="Send"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
