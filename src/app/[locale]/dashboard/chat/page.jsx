 
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  PageHeader,
  ToolbarButton,
  EmptyState,
  Modal,
  SearchInput,
  Avatar,
  TypingDots,
  spring,
} from "@/components/dashboard/ui/UI";
import {
  MessageSquare,
  Plus,
  Paperclip,
  Send,
  Image as ImageIcon,
  Smile,
  Phone,
  Video,
  Info,
  Pin,
  PinOff,
  Trash2,
  MoreVertical,
  ArrowLeft,
  CheckCheck,
  Check,
  Clock,
} from "lucide-react";

/* ================= Mock data ================= */
const seedConversations = [
  {
    id: "C-1",
    name: "John Doe",
    role: "Client",
    online: true,
    last: { text: "Will be 10 min late", at: "2025-08-31T15:20:00Z" },
    unread: 2,
    pinned: true,
  },
  {
    id: "C-2",
    name: "Sarah Smith",
    role: "Client",
    online: false,
    last: { text: "Thanks coach!", at: "2025-08-30T18:05:00Z" },
    unread: 0,
    pinned: false,
  },
  {
    id: "C-3",
    name: "Team Coaches",
    role: "Group",
    online: false,
    last: { text: "Meeting at 9:00", at: "2025-08-29T09:00:00Z" },
    unread: 0,
    pinned: false,
  },
];

const seedMessages = {
  "C-1": [
    { id: "m1", from: "client", text: "Hey coach!", at: "2025-08-31T15:10:00Z", status: "read" },
    { id: "m2", from: "coach", text: "Hi John, how do you feel today?", at: "2025-08-31T15:11:00Z", status: "read" },
    { id: "m3", from: "client", text: "Will be 10 min late", at: "2025-08-31T15:20:00Z", status: "read" },
  ],
  "C-2": [
    { id: "m1", from: "coach", text: "Nice progress this week!", at: "2025-08-30T17:55:00Z", status: "read" },
    { id: "m2", from: "client", text: "Thanks coach!", at: "2025-08-30T18:05:00Z", status: "read" },
  ],
  "C-3": [
    { id: "m1", from: "coach", text: "Reminder: meeting 9:00 in Studio A", at: "2025-08-29T08:30:00Z", status: "delivered" },
  ],
};

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [convs, setConvs] = useState([]);
  const [byId, setById] = useState({});
  const [active, setActive] = useState(null);

  // list filters
  const [q, setQ] = useState("");
  const [showPinned, setShowPinned] = useState(true);

  // composer
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  // typing simulation for demo
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setConvs(seedConversations);
      setById(seedMessages);
      setActive("C-1");
      setLoading(false);
    }, 300);
  }, []);

  const filtered = useMemo(() => {
    let list = [...convs];
    if (showPinned) {
      list.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    }
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(s) || c.last.text.toLowerCase().includes(s));
    }
    return list;
  }, [convs, q, showPinned]);

  const msgs = useMemo(() => (active ? byId[active] || [] : []), [byId, active]);

  /* ===== Actions ===== */
  function openNew() {
    // demo: create draft conversation
    const id = "C-" + Date.now();
    const rec = { id, name: "New Client", role: "Client", online: false, last: { text: "", at: new Date().toISOString() }, unread: 0, pinned: false };
    setConvs((arr) => [rec, ...arr]);
    setById((m) => ({ ...m, [id]: [] }));
    setActive(id);
  }

  function togglePin(id) {
    setConvs((arr) => arr.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
  }

  function removeConv(id) {
    setConvs((arr) => arr.filter((c) => c.id !== id));
    setById((m) => {
      const { [id]: _, ...rest } = m;
      return rest;
    });
    if (active === id) setActive(null);
  }

  function onAttachClick() {
    fileInputRef.current?.click();
  }

  function onAttach(e) {
    const arr = Array.from(e.target.files || []).slice(0, 5);
    setFiles((f) => [...f, ...arr]);
  }

  function send() {
    const content = text.trim();
    if (!content && files.length === 0) return;

    const newMsg = {
      id: "m-" + Date.now(),
      from: "coach",
      text: content,
      at: new Date().toISOString(),
      status: "sending",
      attachments: files.map((f, i) => ({
        id: `${i}`,
        name: f.name,
        url: URL.createObjectURL(f),
        type: f.type.startsWith("image/") ? "image" : "file",
        size: f.size,
      })),
    };

    setById((m) => ({ ...m, [active]: [...(m[active] || []), newMsg] }));
    setFiles([]);
    setText("");

    // update preview in list
    setConvs((arr) => arr.map((c) => (c.id === active ? { ...c, last: { text: content || (newMsg.attachments?.length ? "(attachment)" : ""), at: newMsg.at } } : c)));

    // simulate delivery/read + reply typing
    setTimeout(() => updateStatus(newMsg.id, "delivered"), 400);
    setTimeout(() => updateStatus(newMsg.id, "read"), 1200);
    setTimeout(() => simulateReply(), 1500);
  }

  function updateStatus(msgId, status) {
    setById((m) => ({
      ...m,
      [active]: (m[active] || []).map((x) => (x.id === msgId ? { ...x, status } : x)),
    }));
  }

  function simulateReply() {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply = {
        id: "r-" + Date.now(),
        from: "client",
        text: "Got it! See you soon.",
        at: new Date().toISOString(),
        status: "read",
      };
      setById((m) => ({ ...m, [active]: [...(m[active] || []), reply] }));
      // mark unread = 0 for active
      setConvs((arr) => arr.map((c) => (c.id === active ? { ...c, unread: 0, last: { text: reply.text, at: reply.at } } : c)));
    }, 1500);
  }

  function removeAttachment(i) {
    setFiles((arr) => arr.filter((_, idx) => idx !== i));
  }

  /* ===== Helpers ===== */
  function fmtTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  }

  // group by date for separators
  const grouped = useMemo(() => {
    const g = [];
    let currentDay = "";
    for (const m of msgs) {
      const day = (m.at || "").slice(0, 10);
      if (day !== currentDay) {
        currentDay = day;
        g.push({ type: "sep", day });
      }
      g.push({ type: "msg", ...m });
    }
    if (typing) g.push({ type: "typing" });
    return g;
  }, [msgs, typing]);

  const activeConv = convs.find((c) => c.id === active);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={MessageSquare}
        title="Messages"
        subtitle="Chat with clients and your coaching team."
        actions={<ToolbarButton icon={Plus} onClick={openNew}>New message</ToolbarButton>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ===== Conversations list ===== */}
        <motion.aside initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
          className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-3 h-[72vh] flex flex-col">
          <div className="flex items-center gap-2">
            <SearchInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
            <button
              className={`px-2 py-2 rounded-lg border text-xs ${showPinned ? "bg-indigo-600 text-white border-transparent" : "bg-white border-slate-200"}`}
              onClick={() => setShowPinned((v) => !v)}
              title="Toggle pin sort"
            >
              {showPinned ? <Pin className="w-3.5 h-3.5" /> : <PinOff className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="mt-3 overflow-auto divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 rounded bg-slate-100 animate-pulse w-1/2" />
                    <div className="h-3 rounded bg-slate-100 animate-pulse w-1/3" />
                  </div>
                </div>
              ))
            ) : filtered.length ? (
              filtered.map((c) => (
                <button key={c.id} onClick={() => setActive(c.id)} className={`w-full text-left py-3 flex items-center gap-3 ${active === c.id ? "bg-slate-50" : ""}`}>
                  <Avatar name={c.name} online={c.online} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{c.name}</div>
                      {c.unread ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs">{c.unread}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{c.last.text || "…"}</div>
                  </div>
                  <div className="text-[10px] text-slate-400 whitespace-nowrap">{fmtTime(c.last.at)}</div>
                </button>
              ))
            ) : (
              <EmptyState title="No conversations" subtitle="Start a new message." />
            )}
          </div>
        </motion.aside>

        {/* ===== Thread ===== */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={spring}
          className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white h-[72vh] flex flex-col">
          {/* Thread header */}
          <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-2">
            <button className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200" onClick={() => setActive(null)}>
              <ArrowLeft className="w-4 h-4" />
            </button>
            {activeConv ? <Avatar name={activeConv.name} online={activeConv.online} /> : <div className="w-9 h-9" />}
            <div className="min-w-0">
              <div className="font-medium leading-5">{activeConv?.name || "Select a conversation"}</div>
              <div className="text-[11px] text-slate-500">{activeConv?.online ? "Online" : "Offline"}</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {activeConv && (
                <>
                  <button className="btn-sm" onClick={() => togglePin(activeConv.id)}>{activeConv.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}</button>
                  <button className="btn-sm" title="Call"><Phone className="w-4 h-4" /></button>
                  <button className="btn-sm" title="Video"><Video className="w-4 h-4" /></button>
                  <button className="btn-sm" title="Info"><Info className="w-4 h-4" /></button>
                  <button className="btn-sm" title="Delete" onClick={() => removeConv(activeConv.id)}><Trash2 className="w-4 h-4" /></button>
                </>
              )}
              <button className="btn-sm"><MoreVertical className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Messages scroll */}
          <div className="flex-1 overflow-auto px-3 py-3" id="scrollArea">
            {!active ? (
              <div className="h-full grid place-items-center">
                <EmptyState title="Select a conversation" subtitle="Choose someone on the left or create a new message." />
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                    <div className="w-44 h-10 rounded-2xl bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {grouped.map((it, idx) => {
                  if (it.type === "sep") {
                    return (
                      <div key={`sep-${idx}`} className="text-center text-[11px] text-slate-500 my-2">
                        {fmtDate(it.day)}
                      </div>
                    );
                  }
                  if (it.type === "typing") {
                    return (
                      <div key={`typing-${idx}`} className="flex items-end gap-2">
                        <Avatar name={activeConv?.name || ""} online={true} size={28} />
                        <div className="px-3 py-2 rounded-2xl bg-slate-100"><TypingDots /></div>
                      </div>
                    );
                  }
                  const mine = it.from === "coach";
                  return (
                    <div key={it.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      {!mine && <Avatar name={activeConv?.name || ""} size={28} online={activeConv?.online} />}
                      <div className={`max-w-[72%] rounded-2xl px-3 py-2 border ${mine ? "bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent" : "bg-white border-slate-200 text-slate-800"}`}>
                        {it.text && <div className="whitespace-pre-wrap break-words">{it.text}</div>}
                        {it.attachments?.length ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {it.attachments.map((a) => (
                              <a key={a.id} href={a.url} target="_blank" className="block overflow-hidden rounded-lg border border-slate-200">
                                {a.type === "image" ? (
                                  <img src={a.url} alt={a.name} className="h-28 w-full object-cover" />
                                ) : (
                                  <div className="p-2 text-xs text-slate-600">{a.name}</div>
                                )}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-white/80" : "text-slate-500"}`}>
                          <span>{fmtTime(it.at)}</span>
                          {mine && (
                            <>
                              {it.status === "sending" && (
                                <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Sending</span>
                              )}
                              {it.status === "delivered" && (
                                <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" /> Delivered</span>
                              )}
                              {it.status === "read" && (
                                <span className="inline-flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Read</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="px-3 py-2 border-t border-slate-200">
            {!active ? null : (
              <div className="rounded-2xl border border-slate-200 bg-white p-2">
                {/* attachments preview */}
                {files.length ? (
                  <div className="px-2 pb-2 flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <div key={i} className="group relative w-24 h-20 rounded-lg overflow-hidden border border-slate-200">
                        {f.type.startsWith("image/") ? (
                          <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-[11px] text-slate-600 bg-slate-50 p-2 text-center break-words">
                            {f.name}
                          </div>
                        )}
                        <button
                          onClick={() => removeAttachment(i)}
                          className="absolute top-1 right-1 text-[10px] px-1 rounded bg-black/50 text-white"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-end gap-2">
                  <button className="btn-sm" title="Attach" onClick={onAttachClick}><Paperclip className="w-4 h-4" /></button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onAttach} />

                  <textarea
                    rows={1}
                    placeholder="Write a message…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    className="flex-1 resize-none max-h-28 px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />

                  <button className="btn-primary inline-flex items-center gap-1" onClick={send}>
                    <Send className="w-4 h-4" /> Send
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </div>

      {/* local styles if not global */}
      <style jsx>{`
        .btn-primary { @apply px-3 py-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white; }
        .btn-sm { @apply px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm; }
      `}</style>
    </div>
  );
}
