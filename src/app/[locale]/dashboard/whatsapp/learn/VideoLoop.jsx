'use client';

/*
 * Practice loop under the day's YouTube video: pick a part (from → to, or "5 min from here"),
 * how many times to hear it, and the player repeats it and stops by itself.
 * Talks to the embedded iframe through the YouTube IFrame API (loaded only when the loop opens).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Crosshair, Minus, Play, Plus, Repeat, Square, X } from 'lucide-react';
import toast from 'react-hot-toast';
import './video-loop.css';
import { MAX_REPS, cleanLoop, fmtClock, minuteTicks, parseClock, parseStep, pieceCount, pieceOf, pieceProgress, pieceTick, readLoop, saveLoop, snapMinute } from './video-loop';

let ytApi = null;
/** The YouTube IFrame API, loaded once per page. */
function loadYouTubeApi() {
	if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
	if (window.YT?.Player) return Promise.resolve(window.YT);
	if (!ytApi) {
		ytApi = new Promise((resolve, reject) => {
			const prev = window.onYouTubeIframeAPIReady;
			window.onYouTubeIframeAPIReady = () => {
				prev?.();
				resolve(window.YT);
			};
			const s = document.createElement('script');
			s.src = 'https://www.youtube.com/iframe_api';
			s.async = true;
			s.onerror = () => {
				ytApi = null;
				reject(new Error('YouTube API failed to load'));
			};
			document.head.appendChild(s);
		});
	}
	return ytApi;
}

/** A soft two-note chime when all rounds are done. */
function chime() {
	try {
		const ctx = new (window.AudioContext || window.webkitAudioContext)();
		[660, 880].forEach((f, i) => {
			const o = ctx.createOscillator();
			const g = ctx.createGain();
			o.type = 'sine';
			o.frequency.value = f;
			const t0 = ctx.currentTime + i * 0.18;
			g.gain.setValueAtTime(0.0001, t0);
			g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
			g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
			o.connect(g).connect(ctx.destination);
			o.start(t0);
			o.stop(t0 + 0.55);
		});
		setTimeout(() => ctx.close().catch(() => {}), 1200);
	} catch {
		/* no audio */
	}
}

const DEFAULT_LOOP = { from: 0, to: 300, reps: 3, step: 0 };
/** 5 → "5s", 90 → "1:30" */
const fmtStep = s => (s < 60 ? `${s}s` : fmtClock(s));

export default function VideoLoop({ c, iframeRef, videoId }) {
	const L = c.en.loop;
	const [open, setOpen] = useState(false);
	const [loop, setLoop] = useState(() => readLoop(videoId) || DEFAULT_LOOP);
	const [fromTxt, setFromTxt] = useState(fmtClock(loop.from));
	const [toTxt, setToTxt] = useState(fmtClock(loop.to));
	const [run, setRun] = useState(null); // { round } while looping
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const [now, setNow] = useState({ t: 0, dur: 0 });
	const player = useRef(null);
	const loopRef = useRef(loop);
	const runRef = useRef(run);
	loopRef.current = loop;
	runRef.current = run;

	useEffect(() => {
		setFromTxt(fmtClock(loop.from));
		setToTxt(fmtClock(loop.to));
	}, [loop.from, loop.to]);

	// Attach the API to the iframe the first time the loop opens.
	useEffect(() => {
		if (!open || player.current || !iframeRef.current) return;
		let cancelled = false;
		loadYouTubeApi()
			.then(YT => {
				if (cancelled || !iframeRef.current) return;
				player.current = new YT.Player(iframeRef.current, {
					events: {
						onReady: () => !cancelled && setReady(true),
					},
				});
			})
			.catch(() => !cancelled && setFailed(true));
		return () => {
			cancelled = true;
		};
	}, [open, iframeRef]);

	// Forget the player with the video. (No destroy(): it would remove the iframe React owns.)
	useEffect(
		() => () => {
			player.current = null;
		},
		[],
	);

	const finish = useCallback(() => {
		const l = loopRef.current;
		player.current?.pauseVideo?.();
		setRun(null);
		chime();
		toast.success(L.done(l.reps));
	}, [L]);

	// Watch the clock: repeat the part, then stop.
	useEffect(() => {
		if (!ready) return;
		const id = setInterval(() => {
			const p = player.current;
			if (!p?.getCurrentTime) return;
			const t = Number(p.getCurrentTime()) || 0;
			const dur = Number(p.getDuration?.()) || 0;
			setNow(n => (Math.abs(n.t - t) < 0.05 && n.dur === dur ? n : { t, dur }));
			const r = runRef.current;
			if (!r) return;
			const next = pieceTick({ ...loopRef.current, round: r.round, seg: r.seg || 0 }, t);
			if (next.do === 'seek') {
				p.seekTo(next.at, true);
				setRun({ round: next.round, seg: next.seg });
			} else if (next.do === 'stop') finish();
		}, 200);
		return () => clearInterval(id);
	}, [ready, finish]);

	const commit = useCallback(
		next => {
			const l = cleanLoop(next, now.dur);
			setLoop(l);
			saveLoop(videoId, l);
			return l;
		},
		[now.dur, videoId],
	);

	const start = (l = loopRef.current) => {
		const p = player.current;
		if (!p?.seekTo) return;
		p.seekTo(l.from, true);
		p.playVideo();
		setRun({ round: 1, seg: 0 });
	};
	const stop = () => {
		player.current?.pauseVideo?.();
		setRun(null);
	};

	const readField = (txt, key) => {
		const v = parseClock(txt);
		if (v == null) {
			setFromTxt(fmtClock(loop.from));
			setToTxt(fmtClock(loop.to));
			return;
		}
		commit({ ...loop, [key]: v });
	};

	const setReps = n => commit({ ...loop, reps: Math.min(MAX_REPS, Math.max(0, n)) });
	const [stepTxt, setStepTxt] = useState(loop.step ? fmtStep(loop.step) : '5s');
	const readStep = txt => {
		const v = parseStep(txt);
		if (v == null || v === 0) {
			setStepTxt(loop.step ? fmtStep(loop.step) : '5s');
			return;
		}
		setStepTxt(fmtStep(v));
		commit({ ...loop, step: v });
	};
	const pieces = pieceCount(loop);

	const len = Math.max(1, loop.to - loop.from);
	// until the player tells us the length, draw a timeline a bit longer than the part
	const dur = now.dur || Math.max(600, loop.to + 120);
	const inRound = run ? Math.min(len, Math.max(0, now.t - loop.from)) : 0;

	if (!open) {
		return (
			<button type="button" className="en-link-btn en-loop-open" onClick={() => setOpen(true)}>
				<Repeat size={13} aria-hidden />
				{L.open}
			</button>
		);
	}

	return (
		<div className={`en-loop${run ? ' is-running' : ''}`}>
			<div className="en-loop__head">
				<span className="en-loop__badge" aria-hidden>
					<Repeat size={15} />
				</span>
				<b>{L.title}</b>
				<small>{!ready && !failed ? L.connecting : failed ? L.failed : L.hint}</small>
				<button type="button" className="en-loop__x" onClick={() => (stop(), setOpen(false))} aria-label={L.close} title={L.close}>
					<X size={15} />
				</button>
			</div>

			{/* the whole video: drag the two handles, they settle on each minute */}
			<LoopTimeline
				L={L}
				loop={loop}
				dur={dur}
				t={now.dur ? now.t : null}
				onDrag={l => setLoop(l)}
				onDrop={l => commit(l)}
			/>

			<div className="en-loop__row">
				<div className="en-loop__time">
					<span>{L.from}</span>
					<input dir="ltr" value={fromTxt} onChange={e => setFromTxt(e.target.value)} onBlur={e => readField(e.target.value, 'from')} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} aria-label={L.from} inputMode="numeric" />
					<button type="button" onClick={() => commit({ ...loop, from: now.t, to: loop.to > now.t ? loop.to : now.t + len })} disabled={!ready} title={L.useNow} aria-label={L.useNow}>
						<Crosshair size={14} />
					</button>
				</div>
				<ArrowRight size={15} className="en-loop__arrow" aria-hidden />
				<div className="en-loop__time">
					<span>{L.to}</span>
					<input dir="ltr" value={toTxt} onChange={e => setToTxt(e.target.value)} onBlur={e => readField(e.target.value, 'to')} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} aria-label={L.to} inputMode="numeric" />
					<button type="button" onClick={() => commit({ ...loop, to: now.t })} disabled={!ready || now.t <= loop.from} title={L.useNow} aria-label={L.useNow}>
						<Crosshair size={14} />
					</button>
				</div>
				<div className="en-loop__reps">
					<span>{L.repeat}</span>
					<button type="button" onClick={() => setReps(loop.reps === 0 ? MAX_REPS : loop.reps - 1)} aria-label={L.less}>
						<Minus size={13} />
					</button>
					<b dir="ltr">{loop.reps ? `${loop.reps}×` : '∞'}</b>
					<button type="button" onClick={() => setReps(loop.reps >= MAX_REPS ? 0 : loop.reps + 1)} aria-label={L.more}>
						<Plus size={13} />
					</button>
				</div>
				<div className="en-loop__gap" role="radiogroup" aria-label={L.mode}>
					<span>{L.mode}</span>
					<button type="button" role="radio" aria-checked={!loop.step} className={!loop.step ? 'is-on' : ''} onClick={() => !run && commit({ ...loop, step: 0 })} disabled={Boolean(run)}>
						{L.wholePart}
					</button>
					<button type="button" role="radio" aria-checked={Boolean(loop.step)} className={loop.step ? 'is-on' : ''} onClick={() => !run && !loop.step && commit({ ...loop, step: parseStep(stepTxt) || 5 })} disabled={Boolean(run)}>
						{L.pieces}
					</button>
					{loop.step ? (
						<input dir="ltr" value={stepTxt} onChange={e => setStepTxt(e.target.value)} onBlur={e => readStep(e.target.value)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()} aria-label={L.pieceLen} title={L.pieceHint} disabled={Boolean(run)} />
					) : null}
				</div>
				{run ? (
					<button type="button" className="lrn-btn en-loop__go is-stop" onClick={stop}>
						<Square size={14} aria-hidden />
						{L.stop}
					</button>
				) : (
					<button type="button" className="lrn-btn is-primary en-loop__go" onClick={() => start()} disabled={!ready}>
						<Play size={14} aria-hidden />
						{L.start}
					</button>
				)}
			</div>

			{loop.step && !run ? <p className="en-loop__plan">{L.piecesPlan(fmtStep(loop.step), loop.reps, pieces)}</p> : null}

			{run ? (
				<div className="en-loop__status" role="status" aria-live="polite">
					<span>
						{loop.step ? `${L.piece(run.seg + 1, pieces)} · ` : ''}
						{loop.reps ? L.round(run.round, loop.reps) : L.roundOpen(run.round)}
					</span>
					<span dir="ltr">
						{loop.step ? `${fmtClock(pieceOf(loop, run.seg).a)} → ${fmtClock(pieceOf(loop, run.seg).b)}` : `${fmtClock(inRound)} / ${fmtClock(len)}`}
					</span>
					<i className="en-loop__bar">
						<i style={{ width: `${pieceProgress({ ...loop, round: run.round, seg: run.seg }, now.t) * 100}%` }} />
					</i>
				</div>
			) : null}
		</div>
	);
}

/**
 * The video's timeline with two handles (start / end of the part). Drag them left or right;
 * each settles on the nearest whole minute. Tap the line to move the closer handle there.
 * Arrow keys move a focused handle by a minute.
 */
function LoopTimeline({ L, loop, dur, t, onDrag, onDrop }) {
	const rail = useRef(null);
	const [drag, setDrag] = useState(null); // 'from' | 'to'
	const cur = useRef(loop);
	cur.current = loop;
	const end = Math.max(60, Math.floor(dur));
	const pct = v => `${Math.min(100, Math.max(0, (v / end) * 100))}%`;
	// handles this close would cover each other's time: show one bubble "from – to"
	const close = (loop.to - loop.from) / end < 0.14;
	const timeAt = x => {
		const r = rail.current.getBoundingClientRect();
		return ((x - r.left) / Math.max(1, r.width)) * end;
	};
	const place = (which, raw, l = cur.current) => {
		let v = snapMinute(raw, end);
		if (which === 'from') v = Math.max(0, Math.min(v, l.to - 60));
		else v = Math.min(end, Math.max(v, l.from + 60));
		return { ...l, [which]: v };
	};
	const moveTo = (which, raw, done) => {
		const l = place(which, raw);
		if (l[which] !== cur.current[which]) {
			cur.current = l;
			onDrag(l);
			navigator.vibrate?.(4);
		}
		if (done) onDrop(cur.current);
	};

	const down = which => e => {
		e.preventDefault();
		e.stopPropagation();
		e.currentTarget.focus();
		e.currentTarget.setPointerCapture?.(e.pointerId);
		setDrag(which);
	};
	const move = which => e => drag === which && moveTo(which, timeAt(e.clientX), false);
	const up = which => () => {
		if (drag !== which) return;
		setDrag(null);
		onDrop(cur.current);
	};
	const railDown = e => {
		const v = timeAt(e.clientX);
		const which = Math.abs(v - loop.from) <= Math.abs(v - loop.to) ? 'from' : 'to';
		moveTo(which, v, true);
	};
	const key = which => e => {
		const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 60 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -60 : 0;
		if (!step) return;
		e.preventDefault();
		moveTo(which, loop[which] + step, true);
	};

	return (
		<div className={`en-tl${drag ? ' is-drag' : ''}${close ? ' is-close' : ''}`} dir="ltr">
			{close ? (
				<span className="en-tl__both" style={{ left: pct((loop.from + loop.to) / 2), transform: `translateX(-${(loop.from + loop.to) / 2 / end < 0.06 ? 8 : (loop.from + loop.to) / 2 / end > 0.94 ? 92 : 50}%)` }} aria-hidden>
					{fmtClock(loop.from)} – {fmtClock(loop.to)}
				</span>
			) : null}
			<div className="en-tl__rail" ref={rail} onPointerDown={railDown}>
				<span className="en-tl__part" style={{ left: pct(loop.from), width: `calc(${pct(loop.to)} - ${pct(loop.from)})` }} />
				{/* piece by piece: a thin mark where each piece starts */}
				{loop.step > 0 && pieceCount(loop) <= 80
					? Array.from({ length: pieceCount(loop) - 1 }, (_, k) => <span key={k} className="en-tl__cut" style={{ left: pct(loop.from + (k + 1) * loop.step) }} />)
					: null}
				{t != null ? <span className="en-tl__now" style={{ left: pct(t) }} /> : null}
			</div>
			{['from', 'to'].map(w => (
				<button
					key={w}
					type="button"
					role="slider"
					className={`en-tl__knob is-${w}${drag === w ? ' is-active' : ''}`}
					style={{ left: pct(loop[w]) }}
					aria-label={L[w]}
					aria-valuemin={0}
					aria-valuemax={end}
					aria-valuenow={loop[w]}
					aria-valuetext={fmtClock(loop[w])}
					onPointerDown={down(w)}
					onPointerMove={move(w)}
					onPointerUp={up(w)}
					onPointerCancel={up(w)}
					onKeyDown={key(w)}
				>
					<span className="en-tl__tip">{fmtClock(loop[w])}</span>
				</button>
			))}
			<div className="en-tl__ticks" aria-hidden>
				{minuteTicks(end).map(k => (
					<span key={k.t} className={`${k.label ? 'is-label' : ''}${k.t >= loop.from && k.t <= loop.to ? ' is-in' : ''}`} style={{ left: pct(k.t) }}>
						{k.label ? <em>{Math.round(k.t / 60)}</em> : null}
					</span>
				))}
			</div>
		</div>
	);
}
