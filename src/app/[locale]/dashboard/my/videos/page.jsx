"use client";

import { useEffect, useMemo, useState } from "react";

const CATEGORIES = ["All", "Gym", "Anatomy", "Nutrition", "Mobility", "Other"];

function TopBar({ title, subtitle }) {
  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          {subtitle ? <p className="text-sm text-zinc-400">{subtitle}</p> : null}
        </div>
        <a
          href="/admin"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
        >
          Admin
        </a>
      </div>
    </div>
  );
}

function VideoCard({ v }) {
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
        <h3 className="line-clamp-1 font-semibold">{v.title}</h3>
        <p className="line-clamp-2 text-sm text-zinc-400">{v.description}</p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-zinc-200">
            {v.category === "Anatomy" ? "Anatomy (التشريح)" : v.category}
          </span>
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
          className="inline-flex w-full items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
        >
          Watch
        </a>
      </div>
    </div>
  );
}

export default function ClientPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("All");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const data = await res.json();
      setVideos((data.videos || []).filter((v) => v.isPublic));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (cat === "All") return videos;
    return videos.filter((v) => v.category === cat);
  }, [videos, cat]);

  return (
    <div className="min-h-screen">
      <TopBar title="Videos" subtitle="Gym • التشريح • Nutrition • Mobility" />

      <div className="mx-auto max-w-lg px-4 py-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-zinc-300">
            Choose a category to learn about the gym, anatomy (التشريح), and training.
          </p>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${
                  cat === c
                    ? "bg-white text-zinc-900"
                    : "border border-white/10 bg-white/5 text-zinc-200"
                }`}
              >
                {c === "Anatomy" ? "Anatomy (التشريح)" : c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-zinc-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-zinc-300">
            No videos available.
          </div>
        ) : (
          <div className="mt-4 grid gap-4">
            {filtered.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
