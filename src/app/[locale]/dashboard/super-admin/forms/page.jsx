"use client"

import { useState, useCallback, useEffect } from "react";
import api from "@/utils/axios";

const STATUS_CONFIG = {
  new: {
    label: "New",
    labelAr: "جديد",
    dot: "bg-[var(--color-primary-400)]",
    badge: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border border-[var(--color-primary-200)]",
    ring: "ring-[var(--color-primary-300)]",
  },
  in_progress: {
    label: "In Progress",
    labelAr: "قيد المعالجة",
    dot: "bg-amber-400",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    ring: "ring-amber-300",
  },
  resolved: {
    label: "Resolved",
    labelAr: "تم الحل",
    dot: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    ring: "ring-emerald-300",
  },
  closed: {
    label: "Closed",
    labelAr: "مغلق",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    ring: "ring-slate-300",
  },
};
 
function parseDescription(description) {
  if (!description) return {};
  const lines = description.split("\n");
  const result = {};
  lines.forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (key && value) result[key] = value;
    }
  });
  return result;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--color-primary-100)] bg-white p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 rounded-full bg-[var(--color-primary-100)]" />
        <div className="h-6 w-16 rounded-full bg-[var(--color-primary-50)]" />
      </div>
      <div className="h-5 w-3/4 rounded-full bg-slate-100" />
      <div className="h-3 w-full rounded-full bg-slate-100" />
      <div className="h-3 w-5/6 rounded-full bg-slate-100" />
      <div className="flex gap-2 pt-1">
        <div className="h-4 w-32 rounded-full bg-slate-100" />
        <div className="h-4 w-24 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

 

function StatusDropdown({ id, current, onChange }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[current] || STATUS_CONFIG.new;

  return (
    <div className=" z-[100] relative" id={`status-dropdown-${id}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-2 ring-offset-1 ${cfg.badge} ${cfg.ring} transition-all duration-150`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
        <svg className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-[1000] mt-1 right-0 min-w-[140px] rounded-xl border border-[var(--color-primary-100)] bg-white shadow-xl shadow-[var(--color-primary-100)] py-1 overflow-hidden">
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <button
              key={key}
              onClick={() => {
                onChange(id, key);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-[var(--color-primary-50)] transition-colors ${key === current ? "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]" : "text-slate-700"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${val.dot}`} />
              {val.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ item, onStatusChange  }) {
  const parsed = parseDescription(item.description);
  const usageType = parsed["نوع الاستخدام"] || parsed["Usage Type"] || null;
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      data-aos="fade-up"
      data-aos-duration="400"
      id={`submission-${item.id}`}
      className="group relative rounded-2xl border border-[var(--color-primary-100)] bg-white hover:border-[var(--color-primary-200)] hover:shadow-lg hover:shadow-[var(--color-primary-50)] transition-all duration-200 "
    >
       
      <div className="p-4 sm:p-5">
        {/* Header row */}
        <div className=" relative flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
              {item.name?.charAt(0) || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
              <p className="text-xs text-slate-400 truncate">{item.email}</p>
            </div>
          </div>
          <StatusDropdown id={item.id} current={item.status} onChange={onStatusChange} />
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          {item.phone && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <svg className="w-3 h-3 flex-shrink-0 text-[var(--color-primary-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span dir="ltr">{item.phone}</span>
            </span>
          )}
          {usageType && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <svg className="w-3 h-3 flex-shrink-0 text-[var(--color-secondary-400)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {usageType}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {formatDate(item.created_at)}
          </span>
        </div>

        {/* Description expand */}
        {item.description && (
          <div>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-[var(--color-primary-500)] hover:text-[var(--color-primary-700)] font-medium transition-colors mb-1"
            >
              <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {expanded ? "Hide details" : "Show details"}
            </button>
            {expanded && (
              <div className="rounded-xl bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] p-3 text-xs text-slate-600 md: leading-relaxed whitespace-pre-wrap font-mono">
                {item.description}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function StatsBar({ items }) {
  const counts = Object.keys(STATUS_CONFIG).reduce((acc, k) => {
    acc[k] = items.filter((i) => i.status === k).length;
    return acc;
  }, {});

  return (
    <div id="stats-bar" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6" data-aos="fade-up" data-aos-duration="400">
      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
        <div key={key} className="rounded-2xl border border-[var(--color-primary-100)] bg-white p-3 flex items-center gap-3">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${cfg.badge} flex-shrink-0`}>
            {counts[key] ?? 0}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">{cfg.label}</p>
            <p className="text-[10px] text-slate-400">{cfg.labelAr}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ContactSubmissions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/feedback", {
        params: {
          skip: 0,
          take: 100,
          category: "contact",
          status: statusFilter || undefined,
        },
      });
      if (data?.success) {
        setItems(data.data || []);
      } else if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to load contact forms", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleStatusChange = async (id, nextStatus) => {
    try {
      await api.patch(`/feedback/${id}/status`, { status: nextStatus });
      await fetchSubmissions();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q) ||
      item.phone?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div id="contact-submissions-page" className="min-h-screen ">
       

      <div className="  mx-auto px-4 py-6 sm:py-10">

        {/* Page Header */}
        <header id="page-header" className="mb-6" data-aos="fade-down" data-aos-duration="500">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--color-gradient-from)] to-[var(--color-gradient-to)] flex items-center justify-center shadow-md shadow-[var(--color-primary-200)]">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 md: leading-tight">Contact Submissions</h1>
              <p className="text-xs text-slate-400">Manage incoming contact form requests</p>
            </div>
          </div>
        </header>

        {/* Stats */}
        {!loading && items.length > 0 && <StatsBar items={items} />}

        {/* Filters */}
        <div id="filters-bar" className="flex flex-col sm:flex-row gap-2 mb-5" data-aos="fade-up" data-aos-duration="400" data-aos-delay="50">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--color-primary-100)] bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] focus:border-[var(--color-primary-300)] transition-all"
            />
          </div>

          {/* Status filter */}
          <div className="relative sm:w-44">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none pl-9 pr-8 py-2 rounded-xl border border-[var(--color-primary-100)] bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)] transition-all"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchSubmissions}
            disabled={loading}
            className="flex-shrink-0 h-9 w-9 rounded-xl border border-[var(--color-primary-100)] bg-white flex items-center justify-center text-[var(--color-primary-500)] hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-200)] transition-all disabled:opacity-50"
            title="Refresh"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-slate-400 mb-3 px-0.5" data-aos="fade-in">
            {filtered.length} {filtered.length === 1 ? "submission" : "submissions"}{search ? " matching your search" : ""}
          </p>
        )}

        {/* Content */}
        <main id="submissions-list">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div id="empty-state" className="flex flex-col items-center justify-center py-16 text-center" data-aos="fade-up">
              <div className="h-14 w-14 rounded-2xl bg-[var(--color-primary-50)] border border-[var(--color-primary-100)] flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--color-primary-300)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No submissions found</p>
              <p className="text-xs text-slate-400">{search ? "Try adjusting your search or filter" : "No contact form submissions yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => (
                <SubmissionCard key={item.id} item={item} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}