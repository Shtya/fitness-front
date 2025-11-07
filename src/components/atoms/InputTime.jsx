// components/TimeField.jsx
"use client";

import React, {
	useEffect,
	useMemo,
	useRef,
	useState,
	useCallback,
	useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, X } from "lucide-react";
import { useTranslations } from "next-intl";

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const pad = (n) => String(n).padStart(2, "0");

export function TimeField({
	labelKey = "timeField.label",
	name = "time",
	value,
	onChange,
	className = "",
	error,
	minuteStep = 5,
	showLabel = true
}) {
	const t = useTranslations();

	const [open, setOpen] = useState(false);
	const [tempH, setTempH] = useState("08");
	const [tempM, setTempM] = useState("00");
	const rootRef = useRef(null);
	const panelRef = useRef(null);
	const [mounted, setMounted] = useState(false);

	const [placement, setPlacement] = useState({
		top: 0,
		left: 0,
		width: 360,
		maxHeight: 320,
		where: "bottom",
	});

	useEffect(() => setMounted(true), []);

	useEffect(() => {
		const v = (value || "").trim();
		if (hhmmRegex.test(v)) {
			const [h, m] = v.split(":");
			setTempH(pad(Number(h)));
			setTempM(pad(Number(m)));
		}
	}, [value]);

	// Outside click: use pointerdown for better reliability
	useEffect(() => {
		const onDoc = (e) => {
			if (!open) return;
			const root = rootRef.current;
			const panel = panelRef.current;
			if (!root) return;
			const insideTrigger = root.contains(e.target);
			const insidePanel = panel ? panel.contains(e.target) : false;
			if (!insideTrigger && !insidePanel) setOpen(false);
		};
		document.addEventListener("pointerdown", onDoc);
		return () => document.removeEventListener("pointerdown", onDoc);
	}, [open]);

	// Keyboard handling
	useEffect(() => {
		const onKey = (e) => {
			if (!open) return;
			if (e.key === "Escape") setOpen(false);
			if (e.key === "Enter") {
				commit(tempH, tempM);
				setOpen(false);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, tempH, tempM]);

	const commit = useCallback(
		(h = tempH, m = tempM) => {
			const val = `${pad(Number(h))}:${pad(Number(m))}`;
			onChange?.(val);
		},
		[onChange, tempH, tempM]
	);

	const onManual = (e) => {
		const v = e?.target?.value ?? e;
		onChange?.(v);
	};

	const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
	const minutes = useMemo(
		() => Array.from({ length: Math.floor(60 / minuteStep) }, (_, i) => pad(i * minuteStep)),
		[minuteStep]
	);

	const isValid = useMemo(() => (value ? hhmmRegex.test(value) : true), [value]);
	const selectedDisplay = useMemo(
		() => (value && hhmmRegex.test(value) ? value : `${tempH}:${tempM}`),
		[value, tempH, tempM]
	);

	// Viewport-aware placement
	const measureAndPlace = useCallback(() => {
		if (!open) return;
		const triggerEl = rootRef.current?.querySelector("input");
		const panelEl = panelRef.current;
		if (!triggerEl || !panelEl) return;

		const margin = 8;
		const vw = document.documentElement.clientWidth;
		const vh = document.documentElement.clientHeight;
		const r = triggerEl.getBoundingClientRect();

		const desiredWidth = Math.min(360, Math.max(350, r.width));

		// Prepare for measurement
		const prev = {
			width: panelEl.style.width,
			maxHeight: panelEl.style.maxHeight,
			visibility: panelEl.style.visibility,
			position: panelEl.style.position,
			top: panelEl.style.top,
			left: panelEl.style.left,
		};
		panelEl.style.width = `${desiredWidth}px`;
		panelEl.style.maxHeight = "unset";
		panelEl.style.visibility = "hidden";
		panelEl.style.position = "fixed";
		panelEl.style.top = "0";
		panelEl.style.left = "-9999px";

		const panelHeight = panelEl.scrollHeight;

		const spaceBelow = vh - r.bottom - margin;
		const spaceAbove = r.top - margin;

		let where = "bottom";
		let top = r.bottom + margin;
		let maxHeight = panelHeight;

		if (panelHeight <= spaceBelow) {
			where = "bottom";
			top = r.bottom + margin;
			maxHeight = Math.min(panelHeight, spaceBelow);
		} else if (panelHeight <= spaceAbove) {
			where = "top";
			top = Math.max(margin, r.top - margin - panelHeight);
			maxHeight = Math.min(panelHeight, spaceAbove);
		} else {
			if (spaceBelow >= spaceAbove) {
				where = "bottom";
				top = r.bottom + margin;
				maxHeight = Math.max(140, spaceBelow);
			} else {
				where = "top";
				top = Math.max(margin, r.top - margin - Math.max(140, spaceAbove));
				maxHeight = Math.max(140, spaceAbove);
			}
		}

		let left = r.left;
		const rightOverflow = left + desiredWidth + margin - vw;
		if (rightOverflow > 0) left = Math.max(margin, left - rightOverflow);
		if (left < margin) left = margin;

		setPlacement({
			top: Math.round(top),
			left: Math.round(left),
			width: Math.round(desiredWidth),
			maxHeight: Math.round(maxHeight),
			where,
		});

		// Restore temp styles
		panelEl.style.width = prev.width;
		panelEl.style.maxHeight = prev.maxHeight;
		panelEl.style.visibility = prev.visibility;
		panelEl.style.position = prev.position;
		panelEl.style.top = prev.top;
		panelEl.style.left = prev.left;
	}, [open]);

	// Defer measurement until the panel is actually mounted & painted
	useEffect(() => {
		if (!open) return;
		let raf = requestAnimationFrame(() => {
			// a second rAF ensures layout is settled
			raf = requestAnimationFrame(() => measureAndPlace());
		});
		return () => cancelAnimationFrame(raf);
	}, [open, measureAndPlace]);

	// Keep in sync on scroll/resize
	useEffect(() => {
		if (!open) return;
		const reflow = () => measureAndPlace();
		window.addEventListener("scroll", reflow, true);
		window.addEventListener("resize", reflow);
		return () => {
			window.removeEventListener("scroll", reflow, true);
			window.removeEventListener("resize", reflow);
		};
	}, [open, measureAndPlace]);

	const Panel = (
		<AnimatePresence>
			{open && (
				<motion.div
					ref={panelRef}
					initial={{ opacity: 0, y: placement.where === "bottom" ? -4 : 4, scale: 0.98 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: placement.where === "bottom" ? -4 : 4, scale: 0.98 }}
					transition={{ type: "spring", stiffness: 320, damping: 26 }}
					style={{
						position: "fixed",
						top: placement.top,
						left: placement.left,
						width: placement.width,
						zIndex: 9999,
					}}
					className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-200/70"
				>
					<div className="bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 px-4 py-3 text-white">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Clock className="size-4 opacity-95" />
								<p className="text-[13px] font-medium tracking-wide">{t("timeField.choose")}</p>
							</div>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="rounded-md p-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
								aria-label={t("timeField.close")}
							>
								<X className="size-4" />
							</button>
						</div> 
					</div>

					<div className="bg-white/95 backdrop-blur-sm" style={{ maxHeight: placement.maxHeight }}>
						<div className=" grid grid-cols-2 gap-4 px-4 py-4">
							<div>
								<div className="mb-1.5 text-xs font-medium text-slate-700">{t("timeField.hour")}</div>
								<div className=" grid max-h-40 grid-cols-6 gap-1">
									{hours.map((h) => {
										const active = h === tempH;
										return (
											<button
												key={h}
												type="button"
												onClick={() => {
													setTempH(h);
													commit(h, tempM);
												}}
												className={[
													"h-7 cursor-pointer hover:scale-[0.9] duration-300 rounded-lg border text-xs font-medium transition-all focus:outline-none focus:ring-4",
													active
														? "border-transparent text-white shadow bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 focus:ring-indigo-100"
														: "border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-100",
												].join(" ")}
											>
												{h}
											</button>
										);
									})}
								</div>
							</div>

							<div>
								<div className="mb-1.5 text-xs font-medium text-slate-700">{t("timeField.minutes")}</div>
								<div className="grid max-h-40 grid-cols-6 gap-1 ">
									{minutes.map((m) => {
										const active = m === tempM;
										return (
											<button
												key={m}
												type="button"
												onClick={() => {
													setTempM(m);
													commit(tempH, m);
												}}
												className={[
													"h-7 cursor-pointer hover:scale-[0.9] duration-300  rounded-lg border text-xs font-medium transition-all focus:outline-none focus:ring-4",
													active
														? "border-transparent text-white shadow bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 focus:ring-indigo-100"
														: "border-slate-200 text-slate-700 hover:bg-slate-50 focus:ring-slate-100",
												].join(" ")}
											>
												{m}
											</button>
										);
									})}
								</div>
							</div>
						</div>

						<div className="flex items-center justify-between border-t border-slate-100 bg-white/90 px-4 py-3 text-xs">
							<div className="text-slate-600">
								{t("timeField.selected")}:{" "}
								<span className="font-semibold text-slate-800">{selectedDisplay}</span>
							</div>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-white shadow-sm transition focus:outline-none focus:ring-4 bg-gradient-to-br from-indigo-600 via-indigo-500/90 to-blue-600 focus:ring-indigo-100"
							>
								{t("timeField.done")}
							</button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);

	return (
		<div ref={rootRef} className={`relative ${className}`}>
			{showLabel && <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
				{t(labelKey)}
			</label>}

			<div className="relative">
				<input
					id={name}
					name={name}
					value={value || ""}
					onChange={onManual}
					onPointerDown={() => setOpen(true)}  // <— open early to avoid races
					onFocus={() => setOpen(true)}
					onClick={() => setOpen(true)}
					placeholder={t("timeField.placeholder")}
					className={[
						"w-full rounded-xl border bg-white/95 px-3.5 py-2.5 pe-10 text-sm shadow-sm",
						"border-slate-200 placeholder:text-slate-400",
						"focus:outline-none focus:ring-4 focus:ring-indigo-100",
						!isValid || error ? "border-rose-300 focus:ring-rose-100" : "",
						"disabled:opacity-60",
						"transition-colors",
					].join(" ")}
					aria-invalid={!isValid || !!error}
					aria-describedby={!isValid || error ? `${name}-error` : undefined}
				/>
				<button
					type="button"
					aria-label={t("timeField.openPicker")}
					onPointerDown={() => setOpen((s) => !s)} // <— toggles before click
					className="absolute inset-y-0 end-0 grid w-10 place-items-center text-slate-500 hover:text-slate-700"
				>
					<Clock className="size-5" />
				</button>
			</div>

			{!isValid || error ? (
				<p id={`${name}-error`} className="mt-1 text-xs text-rose-600">
					{error || t("timeField.invalid")}
				</p>
			) : null}

			{mounted ? createPortal(Panel, document.body) : null}
		</div>
	);
}
