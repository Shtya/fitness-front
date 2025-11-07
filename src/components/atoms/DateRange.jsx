"use client";

import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, RotateCcw, X } from "lucide-react";
const Flatpickr = dynamic(() => import("react-flatpickr"), { ssr: false });
import "flatpickr/dist/themes/airbnb.css";
import { Arabic as flatpickrAr } from "flatpickr/dist/l10n/ar.js";

const cn = (...c) => c.filter(Boolean).join(" ");

function fmtISO(d) {
	if (!d) return null;
	const dt = new Date(d);
	return Number.isNaN(dt) ? null : dt.toISOString().slice(0, 10);
}
function startOfMonth(dt = new Date()) {
	return new Date(dt.getFullYear(), dt.getMonth(), 1);
}
function endOfMonth(dt = new Date()) {
	return new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
}
function addDays(d, n) {
	const dt = new Date(d);
	dt.setDate(dt.getDate() + n);
	return dt;
}

export function DateRangeControl({
	labelKey = "label",
	from,               // "YYYY-MM-DD" | null
	to,                 // "YYYY-MM-DD" | null
	onChange,           // ({from, to}) => void
	min = null,         // "YYYY-MM-DD" | Date | null
	max = null,         // "YYYY-MM-DD" | Date | null
	className = "",
	showPresets = true,
}) {
	const t = useTranslations("dateRange");
	const lang = useLocale();
	const isRTL = useMemo(() => {
		const base = (lang || "").split("-")[0].toLowerCase();
		return ["ar", "fa", "ur", "he"].includes(base);
	}, [lang]);

	const [open, setOpen] = useState(false);
	const wrapRef = useRef(null);

	const fromDate = useMemo(() => (from ? new Date(from) : null), [from]);
	const toDate = useMemo(() => (to ? new Date(to) : null), [to]);

	// Close presets popover on outside click
	useEffect(() => {
		function onDoc(e) {
			if (!wrapRef.current) return;
			if (!wrapRef.current.contains(e.target)) setOpen(false);
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, []);

	const today = useMemo(() => new Date(), []);
	const presets = useMemo(
		() => [
			{
				key: "last7",
				label: t("presets.last7"),
				from: fmtISO(addDays(today, -6)),
				to: fmtISO(today),
			},
			{
				key: "last30",
				label: t("presets.last30"),
				from: fmtISO(addDays(today, -29)),
				to: fmtISO(today),
			},
			{
				key: "thisMonth",
				label: t("presets.thisMonth"),
				from: fmtISO(startOfMonth(today)),
				to: fmtISO(endOfMonth(today)),
			},
			{
				key: "today",
				label: t("presets.today"),
				from: fmtISO(today),
				to: fmtISO(today),
			},
		],
		[t, today]
	);

	function commitRange(selectedDates /* Array<Date> */) {
		const f = selectedDates[0] ? fmtISO(selectedDates[0]) : null;
		const tto = selectedDates[1]
			? fmtISO(selectedDates[1])
			: selectedDates[0]
				? fmtISO(selectedDates[0])
				: null; // single-day
		onChange?.({ from: f, to: tto });
	}

	function clearRange() {
		onChange?.({ from: null, to: null });
	}

	// Flatpickr options
	const options = useMemo(
		() => ({
			mode: "range",
			dateFormat: "Y-m-d",
			altInput: true,
			altFormat: "d M Y",
			defaultDate: [fromDate, toDate].filter(Boolean),
			minDate: min || undefined,
			maxDate: max || undefined,
			locale: isRTL ? flatpickrAr : undefined,
			clickOpens: true,
			wrap: false,
			disableMobile: true,
		}),
		[fromDate, toDate, min, max, isRTL]
	);

	return (
		<div ref={wrapRef} dir={isRTL ? "rtl" : "ltr"} className={cn("relative", className)}>
			{/* Control bar */}
			<div
				className={cn(
					"group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2",
					"shadow-sm hover:shadow transition",
					"focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-300"
				)}
				role="group"
				aria-label={t(labelKey)}
			>
				<span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
					<span className="h-6 w-6 rounded-lg bg-indigo-50 ring-1 ring-indigo-100 grid place-items-center">
						<Calendar className="h-3.5 w-3.5 text-indigo-600" />
					</span>
					{t(labelKey)}
				</span>

				<div className="h-5 w-px bg-slate-200 mx-1" />

				{/* Flatpickr input */}
				<div className="relative">
					<Flatpickr
						options={options}
						value={[fromDate, toDate].filter(Boolean)}
						onChange={commitRange}
						// placeholder — remove it to avoid showing on the original input
						onReady={(_, __, instance) => {
							wrapRef.current?.setAttribute("data-has-alt", "1");
							if (instance?.altInput) {
								instance.altInput.placeholder = t("placeholder");     // put placeholder on alt input
								instance.altInput.classList.add("date-alt");           // optional: style hook
							}
						}}
						onOpen={(_, __, instance) => {
							if (instance?.altInput && !instance.altInput.placeholder) {
								instance.altInput.placeholder = t("placeholder");
							}
						}}
						className={cn(
							" w-[170px] flatpickr-input !border-0 !bg-transparent !outline-none text-sm text-slate-800"
						)}
					/>

				</div>

				{/* Presets trigger */}
				{showPresets && (
					<>
						<div className="h-5 w-px bg-slate-200 mx-1" />
						<button
							type="button"
							onClick={() => setOpen((s) => !s)}
							className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
							aria-haspopup="menu"
							aria-expanded={open}
						>
							{t("presets.label")}
							<ChevronDown className="h-3.5 w-3.5" />
						</button>
					</>
				)}

				{/* Clear */}
				<button
					type="button"
					onClick={clearRange}
					className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
					aria-label={t("clear")}
				>
					<X className="h-3.5 w-3.5" />
					{t("clear")}
				</button>
			</div>

			{/* Presets popover */}
			{open && showPresets && (
				<div
					role="menu"
					className={cn(
						"absolute z-30 mt-2 w-[300px] rounded-lg border border-slate-200 bg-white shadow-lg p-2"
					)}
					style={isRTL ? { right: 0 } : { left: 0 }}
				>
					<div className="px-2 pb-1 pt-2 text-xs font-medium text-slate-500">
						{t("presets.title")}
					</div>
					<ul className="space-y-1">
						{presets.map((p) => (
							<li key={p.key}>
								<button
									type="button"
									onClick={() => {
										onChange?.({ from: p.from, to: p.to });
										setOpen(false);
									}}
									className={cn(
										"w-full text-left rounded-lg px-3 py-2 text-sm",
										"hover:bg-indigo-50 hover:text-indigo-700",
										"flex items-center justify-between"
									)}
								>
									<span>{p.label}</span>
									<span className="text-xs text-slate-500 tabular-nums">
										{p.from} → {p.to}
									</span>
								</button>
							</li>
						))}
					</ul>

					<div className="mt-2 border-t border-slate-200 pt-2 flex items-center justify-between">
						<button
							type="button"
							onClick={() => {
								const f = fmtISO(today);
								onChange?.({ from: f, to: f });
								setOpen(false);
							}}
							className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
						>
							<RotateCcw className="h-3.5 w-3.5" />
							{t("presets.today")}
						</button>
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
						>
							{t("close")}
						</button>
					</div>
				</div>
			)}

			{/* Flatpickr theming overrides */}
			<style jsx global>{`
        .flatpickr-calendar {
          border-radius: 16px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 25px rgba(2, 6, 23, 0.08) !important;
          overflow: hidden !important;
        }
        .flatpickr-months {
          background: linear-gradient(180deg, #eef2ff 0%, #ffffff 70%) !important;
        }
        .flatpickr-current-month .flatpickr-monthDropdown-months,
        .flatpickr-current-month input.cur-year {
          font-weight: 600 !important;
          color: #0f172a !important;
        }
        .flatpickr-weekday {
          color: #475569 !important;
          font-weight: 600 !important;
        }
        .flatpickr-day {
          border-radius: 10px !important;
        }
        .flatpickr-day.selected,
        .flatpickr-day.startRange,
        .flatpickr-day.endRange {
          color: #fff !important;
          box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.25) inset !important;
        }
        .flatpickr-day.inRange {
          background: rgba(99, 102, 241, 0.08) !important;
          color: #0f172a !important;
        }
        .flatpickr-day:hover {
          background: #eef2ff !important;
        }
        .flatpickr-day.disabled,
        .flatpickr-day.prevMonthDay,
        .flatpickr-day.nextMonthDay {
          color: #cbd5e1 !important;
        }
        /* Calendar respects container dir */
        [dir="rtl"] .flatpickr-calendar {
          direction: rtl;
        }

				[data-has-alt] > .flatpickr-input {
						display: none !important;
					}
					/* Style the alt input created by flatpickr */
					.date-alt {
						border: 0 !important;
						background: transparent !important;
						outline: none !important;
						font-size: 0.875rem !important;   /* text-sm */
						color: #0f172a !important;        /* slate-900 */
					}
					.date-alt::placeholder { color: #94a3b8 !important; } /* slate-400 */
      `}</style>
		</div>
	);
}
