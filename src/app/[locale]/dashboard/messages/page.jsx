"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  PageHeader, SearchInput, TabsPill, ToolbarButton, Modal, EmptyState,
  Avatar, AutoGrowTextarea, TypingDots, spring
} from "@/components/dashboard/ui/UI";
import {
  MessageSquare, Send, Paperclip, Archive, ArchiveRestore, BellOff, Star, StarOff, Users, Trash2
} from "lucide-react";

/* ---------------- Mock data ---------------- */
const MOCK_CONVOS = [
  { id: 1, name: "John Doe", role: "Client", last: "Finished today’s workout 💪", at: "2025-08-30T11:32:00Z", unread: 2, pinned: true, assignedTo: "You", status: "open", online: true },
  { id: 2, name: "Sarah Smith", role: "Client", last: "Can we move leg day?",      at: "2025-08-29T18:12:00Z", unread: 0, pinned: false, assignedTo: "Coach Ali", status: "open", online: false },
  { id: 3, name: "Mike Johnson", role: "Client", last: "Macros look good?",        at: "2025-08-28T09:50:00Z", unread: 1, pinned: false, assignedTo: "You", status: "open", online: true },
  { id: 4, name: "David Brown", role: "Client", last: "Thanks coach!",             at: "2025-08-10T07:44:00Z", unread: 0, pinned: false, assignedTo: "—", status: "archived", online: false },
];

const MOCK_MESSAGES = {
  1: [
    { id: "m1", from: "client", text: "Hey coach, finished today’s workout 💪", at: "2025-08-30T11:32:00Z" },
    { id: "m2", from: "coach",  text: "Nice work! How was the RPE on squats?",   at: "2025-08-30T11:34:00Z" },
  ],
  2: [
    { id: "m1", from: "client", text: "Can we move leg day to Thu?", at: "2025-08-29T18:12:00Z" },
    { id: "m2", from: "coach",  text: "Sure, I’ll update the plan.",  at: "2025-08-29T18:14:00Z" },
  ],
  3: [
    { id: "m1", from: "client", text: "Macros look good?", at: "2025-08-28T09:50:00Z" },
  ],
  4: [
    { id: "m1", from: "client", text: "Thanks coach!", at: "2025-08-10T07:44:00Z" },
    { id: "m2", from: "coach",  text: "Anytime! 🙌",    at: "2025-08-10T07:45:00Z" },
  ],
};

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "assigned", label: "Assigned" },
  { key: "archived", label: "Archived" },
];

/* ---------------- Page ---------------- */
export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [convos, setConvos] = useState([]);
  const [messages, setMessages] = useState({});
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // Composer
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // File[]
  const [typing, setTyping] = useState(false);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setConvos(MOCK_CONVOS);
      setMessages(MOCK_MESSAGES);
      setLoading(false);
      setSelectedId(1);
    }, 600);
  }, []);

  const filtered = useMemo(() => {
    let list = convos.slice();
    if (tab === "unread") list = list.filter(c => c.unread > 0);
    if (tab === "assigned") list = list.filter(c => c.assignedTo && c.assignedTo !== "—");
    if (tab === "archived") list = list.filter(c => c.status === "archived");
    if (tab !== "archived") list = list.filter(c => c.status !== "archived");
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => [c.name, c.last, c.assignedTo].join(" ").toLowerCase().includes(s));
    }
    // pinned first, then recent
    return list.sort((a,b) => (b.pinned - a.pinned) || new Date(b.at) - new Date(a.at));
  }, [convos, tab, search]);

  const selected = convos.find(c => c.id === selectedId) || null;
  const thread = (selected && messages[selected.id]) || [];

  useEffect(() => {
    // scroll to bottom on thread change/new message
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedId, thread.length]);

  /* ---------------- Actions ---------------- */
  const openConvo = (id) => {
    setSelectedId(id);
    setConvos(list => list.map(c => c.id === id ? { ...c, unread: 0 } : c));
  };

  const send = () => {
    if (!selected || (!text.trim() && files.length === 0)) return;
    const now = new Date().toISOString();
    const myMsg = { id: "m" + Date.now(), from: "coach", text: text.trim(), at: now, files: [...files] };
    setMessages(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] || []), myMsg] }));
    setConvos(prev => prev.map(c => c.id === selected.id ? { ...c, last: text || (files[0]?.name ?? "Attachment"), at: now } : c));
    setText("");
    setFiles([]);
    // simulate client typing & reply
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply = { id: "r" + Date.now(), from: "client", text: "Got it, thanks!", at: new Date().toISOString() };
      setMessages(prev => ({ ...prev, [selected.id]: [...(prev[selected.id] || []), reply] }));
    }, 1200);
  };

  const togglePin = () => setConvos(prev => prev.map(c => c.id === selected.id ? { ...c, pinned: !c.pinned } : c));
  const toggleArchive = () => setConvos(prev => prev.map(c => c.id === selected.id ? { ...c, status: c.status === "archived" ? "open" : "archived" } : c));
  const markUnread = () => setConvos(prev => prev.map(c => c.id === selected.id ? { ...c, unread: 1 } : c));

  /* ---------------- UI ---------------- */
  return (
    <div className="h-[calc(100dvh-80px)] grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
      {/* Left: conversations */}
      <div className="card-glow p-3 flex flex-col min-h-0">
        <PageHeader
          icon={MessageSquare}
          title="Messages"
          subtitle="Chat with clients, share updates, and keep coaching tight."
          actions={
            <div className="hidden lg:flex items-center gap-2">
              <ToolbarButton icon={Users} variant="secondary" onClick={()=>alert('Bulk assign stub')}>Assign</ToolbarButton>
            </div>
          }
        />
        <div className="mt-3">
          <SearchInput value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search clients or messages…" />
        </div>
        <div className="mt-3">
          <TabsPill tabs={TABS} active={tab} onChange={setTab} id="messages-tabs" />
        </div>

        <div className="mt-3 flex-1 overflow-auto">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_,i)=>(
                <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No conversations" subtitle="Try another filter or start a new chat." />
          ) : (
            <ul className="space-y-1">
              {filtered.map(c => (
                <li key={c.id}>
                  <button
                    onClick={()=>openConvo(c.id)}
                    className={`w-full text-left rounded-xl px-3 py-3 border transition ${
                      c.id === selectedId ? "bg-indigo-50 border-indigo-200" : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex gap-3">
                      <Avatar name={c.name} size={44} dot={c.online ? "online" : null} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-xs text-slate-500">{timeAgo(c.at)}</div>
                        </div>
                        <div className="text-xs text-slate-600 truncate">{c.last}</div>
                        <div className="mt-1 flex items-center gap-2">
                          {c.unread > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{c.unread} new</span>}
                          {c.assignedTo && c.assignedTo !== "—" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Assigned: {c.assignedTo}</span>}
                          {c.status === "archived" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Archived</span>}
                          {c.pinned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pinned</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right: thread */}
      <div className="card-glow flex flex-col min-h-0">
        {/* Thread header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          {selected ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={selected.name} size={40} dot={selected.online ? "online" : null} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{selected.name}</div>
                  <div className="text-xs text-slate-500 truncate">{selected.role} · {selected.assignedTo !== "—" ? `Assigned to ${selected.assignedTo}` : "Unassigned"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <IconBtn onClick={togglePin} title={selected.pinned ? "Unpin" : "Pin"}>
                  {selected.pinned ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                </IconBtn>
                <IconBtn onClick={markUnread} title="Mark unread">
                  <BellOff className="w-4 h-4" />
                </IconBtn>
                <IconBtn onClick={toggleArchive} title={selected.status === "archived" ? "Unarchive" : "Archive"}>
                  {selected.status === "archived" ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </IconBtn>
              </div>
            </>
          ) : (
            <div className="text-slate-500 text-sm">Pick a conversation</div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_,i)=>(
                <div key={i} className={`h-8 w-3/4 ${i%2? "ml-auto" : ""} rounded-xl bg-slate-100 animate-pulse`} />
              ))}
            </div>
          ) : !selected ? (
            <div className="p-6"><EmptyState title="No conversation selected" subtitle="Choose someone from the left list." /></div>
          ) : thread.length === 0 ? (
            <div className="p-6"><EmptyState title="No messages yet" subtitle="Say hello to start the chat." /></div>
          ) : (
            <>
              {thread.map((m, idx) => (
                <MessageBubble key={m.id} me={m.from === "coach"} text={m.text} at={m.at} files={m.files} grouped={grouped(thread, idx)} />
              ))}
              {typing && (
                <div className="flex items-center gap-2">
                  <Avatar name={selected.name} size={28} />
                  <div className="px-3 py-2 rounded-2xl bg-slate-100">
                    <TypingDots />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-end gap-2">
            <button
              onClick={()=>fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 grid place-content-center"
              title="Attach"
            >
              <Paperclip className="w-4 h-4 text-slate-600" />
            </button>
            <AutoGrowTextarea
              id="composer"
              value={text}
              onChange={(e)=>setText(e.target.value)}
              minRows={1}
              maxRows={6}
              placeholder="Write a message…"
              className="flex-1"
              onKeyDown={(e)=>{ if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            />
            <input ref={fileInputRef} type="file" className="hidden" multiple onChange={(e)=>setFiles(Array.from(e.target.files || []))} />
            <ToolbarButton onClick={send} icon={Send}>Send</ToolbarButton>
          </div>
          {/* attachments preview */}
          {files.length > 0 && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {files.map((f, i)=> (
                <span key={i} className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white">{f.name}</span>
              ))}
              <button onClick={()=>setFiles([])} className="text-xs text-slate-500 hover:underline">Clear</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Local UI bits ---------------- */

function IconBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 grid place-content-center"
    >
      {children}
    </button>
  );
}

function MessageBubble({ me, text, at, files = [], grouped }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={`max-w-[80%] ${me ? "ml-auto" : ""}`}
    >
      <div className={`px-3 py-2 rounded-2xl shadow-sm border ${me ? "bg-gradient-to-tr from-indigo-600 to-blue-500 text-white border-transparent" : "bg-white border-slate-200"}`}>
        {text ? <div className="whitespace-pre-wrap">{text}</div> : null}
        {files.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((f,i)=>(
              <span key={i} className={`text-[10px] px-2 py-1 rounded-md ${me? "bg-white/20" : "bg-slate-100"}`}>{f.name}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className={`mt-1 text-[10px] ${me ? "text-right" : ""} text-slate-500`}>{formatTime(at)}</div>
    </motion.div>
  );
}

function grouped(arr, idx) {
  const prev = arr[idx-1];
  if (!prev) return false;
  return prev.from === arr[idx].from && Math.abs(new Date(arr[idx].at) - new Date(prev.at)) < 5*60*1000;
}

/* ---------------- Utils ---------------- */
function timeAgo(iso) {
  const d = new Date(iso), now = new Date();
  const s = Math.floor((now - d)/1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s/60); if (m < 60) return `${m}m`;
  const h = Math.floor(m/60); if (h < 24) return `${h}h`;
  const days = Math.floor(h/24); if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}
function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
