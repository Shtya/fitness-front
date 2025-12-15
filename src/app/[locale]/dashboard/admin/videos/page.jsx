"use client";

import { useEffect, useMemo, useState } from "react";

const CATEGORIES = ["Gym", "Anatomy", "Nutrition", "Mobility", "Other"];

function TopBar({ title, subtitle, right }) {
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle ? <p className="text-sm text-zinc-400">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </div>
  );
}

function VideoCard({ v, actions }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm">
      <div className="aspect-video w-full bg-zinc-900">
        {v.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.thumbnail} alt={v.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-500">
            No thumbnail
          </div>
        )}
      </div>

      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-1 font-semibold">{v.title}</h3>
            <p className="line-clamp-2 text-sm text-zinc-400">{v.description}</p>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-200">
            {v.category}
          </span>

          {v.isPublic ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200">
              Public
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-200">
              Hidden
            </span>
          )}

          {(v.tags || []).slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-200">
              #{t}
            </span>
          ))}
        </div>

        <a
          href={v.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          Watch
        </a>
      </div>
    </div>
  );
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-zinc-400">
              Admin manages everything. Client sees only Public videos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
        <div className="mt-4 flex items-center justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [showHidden, setShowHidden] = useState(true);

  // modal + form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [category, setCategory] = useState("Gym");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const data = await res.json();
      setVideos(data.videos || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setUrl("");
    setThumbnail("");
    setCategory("Gym");
    setTags("");
    setIsPublic(true);
    setOpen(true);
  }

  function openEdit(v) {
    setEditing(v);
    setTitle(v.title || "");
    setDescription(v.description || "");
    setUrl(v.url || "");
    setThumbnail(v.thumbnail || "");
    setCategory(v.category || "Gym");
    setTags((v.tags || []).join(", "));
    setIsPublic(!!v.isPublic);
    setOpen(true);
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return videos.filter((v) => {
      if (!showHidden && !v.isPublic) return false;
      if (cat !== "All" && v.category !== cat) return false;
      if (!query) return true;
      const hay = `${v.title} ${v.description} ${v.category} ${(v.tags || []).join(" ")}`.toLowerCase();
      return hay.includes(query);
    });
  }, [videos, q, cat, showHidden]);

  async function save() {
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        url: url.trim(),
        thumbnail: thumbnail.trim() || undefined,
        category,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isPublic,
      };

      if (editing?.id) {
        await fetch("/api/videos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editing, ...payload }),
        });
      } else {
        await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    await fetch("/api/videos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  }

  return (
    <div className="min-h-screen">
      <TopBar
        title="Admin • Videos"
        subtitle="Add / edit / hide videos (Gym + التشريح + ...)"
        right={
          <>
            <a
              href="/client"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Open Client Page
            </a>
            <button
              onClick={openAdd}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
            >
              + Add Video
            </button>
          </>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="text-sm text-zinc-300">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, tags, تشريح..."
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-300">Category</label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 outline-none focus:border-white/20"
            >
              <option value="All">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 md:col-span-3">
            <button
              onClick={() => setShowHidden((s) => !s)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              {showHidden ? "Showing hidden" : "Hiding hidden"}
            </button>
            <div className="ml-auto text-sm text-zinc-400">
              {filtered.length} / {videos.length}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-zinc-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-300">
            No videos found.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((v) => (
              <VideoCard
                key={v.id}
                v={v}
                actions={
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(v)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(v.id)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                    >
                      Delete
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Video" : "Add Video"}
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              disabled={saving || !title.trim() || !url.trim()}
              onClick={save}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
              placeholder="مثال: التشريح - عضلات الصدر"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
              placeholder="Short explanation..."
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Video URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
              placeholder="https://youtube.com/..."
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Thumbnail (optional)</label>
            <input
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
              placeholder="https://image..."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm text-zinc-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 outline-none focus:border-white/20"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm text-zinc-300">Visibility</label>
              <button
                onClick={() => setIsPublic((p) => !p)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left hover:bg-white/10"
              >
                {isPublic ? "Public (client can see)" : "Hidden (admin only)"}
              </button>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm text-zinc-300">Tags (comma separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-white/20"
              placeholder="تشريح, عضلات, beginner"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
