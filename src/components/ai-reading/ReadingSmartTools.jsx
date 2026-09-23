'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
	Focus,
	Headphones,
	Layers,
	Sparkles,
	X,
	ChevronLeft,
	ChevronRight,
	Play,
	Pause,
	Square,
	MessageSquare,
	Loader2,
	Check,
	BookOpenCheck,
	MapPin,
} from 'lucide-react';
import {
	bionicNodes,
	buildFlashcardsFromBook,
	estimateMinutesLeft,
	findLastHighlight,
	findPageIndexForHighlight,
	focusBlocksFromPage,
	splitSentences,
	ttsLangFor,
} from '@/lib/ai-reading/reading-smart';

export function SmartResumeBanner({ book, pages, pageIndex, theme, t, onResume, onResumePin, onDismiss }) {
	const pin = book?.progress?.pin;
	const last = useMemo(() => findLastHighlight(book), [book]);
	const targetIdx = useMemo(() => findPageIndexForHighlight(pages, last), [pages, last]);
	const pinIdx = useMemo(() => {
		if (!pin?.pageId || !pages?.length) return -1;
		return pages.findIndex(p => p.page.id === pin.pageId);
	}, [pin, pages]);
	const mins = estimateMinutesLeft(pages, pageIndex);
	const hasPin = Boolean(pin && pinIdx >= 0);
	const hasHighlight = Boolean(last && targetIdx >= 0);

	return (
		<div className="mb-5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: theme.muted }}>
			<span className="tabular-nums opacity-80">{t('reading.minsLeft', { minutes: mins })}</span>
			{hasPin && (
				<>
					<span className="opacity-30">·</span>
					<button
						type="button"
						onClick={() => onResumePin?.(pin)}
						className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
						style={{ color: theme.accent }}
					>
						<MapPin size={11} />
						{t('reading.resumePin')}
					</button>
				</>
			)}
			{!hasPin && hasHighlight && (
				<>
					<span className="opacity-30">·</span>
					<button
						type="button"
						onClick={() => onResume(targetIdx, last)}
						className="font-semibold underline-offset-2 hover:underline"
						style={{ color: theme.accent }}
					>
						{t('reading.resumeCta')}
					</button>
				</>
			)}
			{(hasPin || hasHighlight) && onDismiss && (
				<button type="button" onClick={onDismiss} className="opacity-40 hover:opacity-70" aria-label="Dismiss">
					<X size={12} />
				</button>
			)}
		</div>
	);
}

export function GlossaryStrip({ words, theme, t, onJump }) {
	const list = (words || []).slice(0, 16);
	if (!list.length) return null;
	return (
		<div className="mb-6">
			<p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider opacity-40">{t('reading.glossary')}</p>
			<div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{list.map(w => (
					<button
						key={w.id || w.word}
						type="button"
						onClick={() => onJump?.(w)}
						className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium"
						style={{ background: `${theme.ink}08`, color: theme.ink }}
						title={w.meaning || w.translation}
					>
						<span>{w.word}</span>
						{w.translation ? <span className="opacity-45">· {w.translation}</span> : null}
					</button>
				))}
			</div>
		</div>
	);
}

export function ReadingToolsRail({
	theme,
	t,
	focusOn,
	listenOn,
	bionicOn,
	difficulty,
	onToggleFocus,
	onToggleListen,
	onToggleBionic,
	onDifficulty,
	onOpenFlashcards,
	onOpenCoach,
	compact = false,
}) {
	const tip = id => {
		if (id === 'original') return t('reading.diffOriginalHint');
		if (id === 'simplify') return t('reading.diffSimplifyHint');
		return t('reading.diffEli5Hint');
	};

	const iconBtn = (active, onClick, Icon, label) => (
		<button
			type="button"
			onClick={onClick}
			title={label}
			aria-label={label}
			className="inline-flex h-8 w-8 items-center justify-center rounded-full transition"
			style={{
				background: active ? `${theme.accent}20` : 'transparent',
				color: active ? theme.accent : theme.ink,
				opacity: active ? 1 : 0.55,
			}}
		>
			<Icon size={15} strokeWidth={2} />
		</button>
	);

	return (
		<div className={`flex items-center ${compact ? 'justify-between gap-2' : 'flex-wrap gap-1.5'}`}>
			<div className="flex shrink-0 items-center">
				{iconBtn(focusOn, onToggleFocus, Focus, t('reading.focus'))}
				{iconBtn(listenOn, onToggleListen, Headphones, t('reading.listen'))}
				<span className="hidden sm:contents">
					{iconBtn(bionicOn, onToggleBionic, Sparkles, t('reading.bionic'))}
					{iconBtn(false, onOpenFlashcards, Layers, t('reading.flashcards'))}
					{iconBtn(false, onOpenCoach, BookOpenCheck, t('reading.coach'))}
				</span>
			</div>
			<div
				className="inline-flex min-w-0 max-w-full items-center overflow-x-auto rounded-full p-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				style={{ background: `${theme.ink}08` }}
				title={t('reading.diffHint')}
			>
				{[
					['original', t('reading.diffOriginal')],
					['simplify', t('reading.diffSimplify')],
					['eli5', t('reading.diffEli5')],
				].map(([id, label]) => (
					<button
						key={id}
						type="button"
						onClick={() => onDifficulty(id)}
						title={tip(id)}
						className="shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold sm:px-2.5"
						style={{
							background: difficulty === id ? theme.accent : 'transparent',
							color: difficulty === id ? '#fff' : theme.ink,
							opacity: difficulty === id ? 1 : 0.65,
						}}
					>
						{label}
					</button>
				))}
			</div>
		</div>
	);
}

export function FocusModeOverlay({
	page,
	theme,
	t,
	bionic,
	index,
	onIndex,
	onClose,
	isRTL,
}) {
	const blocks = useMemo(() => focusBlocksFromPage(page), [page]);
	const current = blocks[index] || blocks[0];
	const text = current?._focusText || '';

	useEffect(() => {
		const onKey = e => {
			if (e.key === 'Escape') onClose();
			if (e.key === 'ArrowRight' || e.key === 'j') onIndex(Math.min(blocks.length - 1, index + (isRTL ? -1 : 1)));
			if (e.key === 'ArrowLeft' || e.key === 'k') onIndex(Math.max(0, index + (isRTL ? 1 : -1)));
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [blocks.length, index, isRTL, onClose, onIndex]);

	if (!blocks.length) {
		return (
			<div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
				<p className="rounded-2xl bg-white px-4 py-3 text-sm">{t('reading.focusEmpty')}</p>
			</div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-[65] flex flex-col"
			style={{ background: theme.bg, color: theme.ink }}
		>
			<div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${theme.ink}12` }}>
				<p className="text-xs font-bold uppercase tracking-wider opacity-50">
					{t('reading.focus')} · {index + 1}/{blocks.length}
				</p>
				<button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
					<X size={16} />
				</button>
			</div>
			<div className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
				<div
					className="max-w-2xl text-xl leading-relaxed sm:text-2xl"
					dir={isRTL ? 'rtl' : 'ltr'}
					style={{ textAlign: isRTL ? 'right' : 'left' }}
				>
					{bionic ? (
						bionicNodes(text).map(n => (
							<span key={n.key}>
								<strong style={{ fontWeight: 700 }}>{n.bold}</strong>
								{n.rest}
							</span>
						))
					) : (
						text
					)}
				</div>
			</div>
			<div className="flex items-center justify-center gap-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
				<button
					type="button"
					disabled={index <= 0}
					onClick={() => onIndex(index - 1)}
					className="rounded-full p-3 disabled:opacity-30"
					style={{ background: `${theme.ink}10` }}
				>
					<ChevronLeft size={18} />
				</button>
				<button
					type="button"
					disabled={index >= blocks.length - 1}
					onClick={() => onIndex(index + 1)}
					className="rounded-full p-3 disabled:opacity-30"
					style={{ background: `${theme.ink}10` }}
				>
					<ChevronRight size={18} />
				</button>
			</div>
		</motion.div>
	);
}

export function ListenBar({
	text,
	theme,
	t,
	lang,
	activeSentence,
	setActiveSentence,
	playing,
	setPlaying,
	onClose,
}) {
	const sentences = useMemo(() => splitSentences(text), [text]);
	const utterRef = useRef(null);
	const idxRef = useRef(0);

	const stop = () => {
		window.speechSynthesis?.cancel();
		utterRef.current = null;
		setPlaying(false);
	};

	const speakFrom = startIdx => {
		if (!window.speechSynthesis || !sentences.length) return;
		window.speechSynthesis.cancel();
		idxRef.current = startIdx;
		setActiveSentence(startIdx);
		setPlaying(true);

		const speakNext = () => {
			const i = idxRef.current;
			if (i >= sentences.length) {
				setPlaying(false);
				setActiveSentence(-1);
				return;
			}
			const u = new SpeechSynthesisUtterance(sentences[i]);
			u.lang = ttsLangFor(sentences[i], lang);
			u.rate = 0.95;
			u.onend = () => {
				idxRef.current = i + 1;
				speakNext();
			};
			u.onerror = () => {
				setPlaying(false);
			};
			utterRef.current = u;
			setActiveSentence(i);
			window.speechSynthesis.speak(u);
		};
		speakNext();
	};

	useEffect(() => () => stop(), []);

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-[58] border-t px-3 py-3 shadow-2xl"
			style={{
				background: theme.paper,
				borderColor: `${theme.ink}12`,
				paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
				color: theme.ink,
			}}
		>
			<div className="mx-auto flex max-w-3xl items-center gap-2">
				<button
					type="button"
					onClick={() => (playing ? stop() : speakFrom(Math.max(0, activeSentence)))}
					className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-white"
					style={{ background: theme.accent }}
				>
					{playing ? <Pause size={14} /> : <Play size={14} />}
					{playing ? t('reading.listenPause') : t('reading.listenPlay')}
				</button>
				<button type="button" onClick={stop} className="rounded-full p-2 hover:bg-black/5" title={t('reading.listenStop')}>
					<Square size={14} />
				</button>
				<p className="min-w-0 flex-1 truncate text-[11px] opacity-60">
					{activeSentence >= 0 && sentences[activeSentence]
						? sentences[activeSentence]
						: t('reading.listenHint')}
				</p>
				<button type="button" onClick={() => { stop(); onClose(); }} className="rounded-full p-2 hover:bg-black/5">
					<X size={14} />
				</button>
			</div>
			{activeSentence >= 0 && sentences[activeSentence] && (
				<p
					className="mx-auto mt-2 max-w-3xl rounded-xl px-3 py-2 text-sm leading-relaxed"
					style={{ background: `${theme.accent}14` }}
				>
					{sentences[activeSentence]}
				</p>
			)}
		</div>
	);
}

export function InlineAskModal({ theme, t, passage, busy, result, question, setQuestion, onAsk, onClose }) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center"
			onClick={onClose}
		>
			<motion.div
				initial={{ y: 20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				exit={{ y: 12, opacity: 0 }}
				onClick={e => e.stopPropagation()}
				className="max-h-[min(88vh,640px)] w-full max-w-lg overflow-y-auto rounded-3xl border p-4 shadow-2xl sm:p-5"
				style={{ background: theme.paper, borderColor: `${theme.ink}12`, color: theme.ink }}
			>
				<div className="mb-3 flex items-start justify-between gap-2">
					<div>
						<p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
							<MessageSquare size={13} /> {t('reading.inlineAsk')}
						</p>
						<p className="mt-1 text-xs opacity-55">{t('reading.inlineAskHint')}</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5">
						<X size={16} />
					</button>
				</div>
				<div className="mb-3 max-h-28 overflow-y-auto rounded-2xl px-3 py-2 text-xs opacity-70" style={{ background: `${theme.ink}08` }}>
					{passage}
				</div>
				<textarea
					value={question}
					onChange={e => setQuestion(e.target.value)}
					rows={2}
					placeholder={t('reading.inlineAskPlaceholder')}
					className="mb-3 w-full rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none"
				/>
				<button
					type="button"
					disabled={busy || !question.trim()}
					onClick={onAsk}
					className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
					style={{ background: theme.accent }}
				>
					{busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
					{busy ? t('common.working') : t('reading.ask')}
				</button>
				{result && (
					<div className="mt-3 rounded-2xl p-3 text-sm" style={{ background: `${theme.accent}12` }}>
						<p>{result.answer}</p>
						{result.suggestedAction && (
							<p className="mt-2 text-xs font-semibold opacity-80">
								{t('reading.suggestedAction')}: {result.suggestedAction}
							</p>
						)}
					</div>
				)}
			</motion.div>
		</motion.div>
	);
}

export function FlashcardsModal({ book, theme, t, onClose }) {
	const cards = useMemo(() => buildFlashcardsFromBook(book), [book]);
	const [i, setI] = useState(0);
	const [flipped, setFlipped] = useState(false);
	const card = cards[i];

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center"
			onClick={onClose}
		>
			<motion.div
				onClick={e => e.stopPropagation()}
				className="w-full max-w-md rounded-3xl border p-5 shadow-2xl"
				style={{ background: theme.paper, borderColor: `${theme.ink}12`, color: theme.ink }}
			>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-sm font-bold uppercase tracking-wider">{t('reading.flashcards')}</h2>
					<button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5">
						<X size={16} />
					</button>
				</div>
				{!card ? (
					<p className="py-10 text-center text-sm opacity-60">{t('reading.flashcardsEmpty')}</p>
				) : (
					<>
						<p className="mb-2 text-[10px] font-bold uppercase tracking-wider opacity-45">
							{i + 1}/{cards.length} · {card.source}
						</p>
						<button
							type="button"
							onClick={() => setFlipped(f => !f)}
							className="flex min-h-[160px] w-full flex-col items-center justify-center rounded-2xl px-4 py-6 text-center text-base font-medium"
							style={{ background: `${theme.accent}12` }}
						>
							{flipped ? card.back : card.front}
							<span className="mt-3 text-[10px] font-semibold uppercase opacity-40">
								{flipped ? t('reading.flashBack') : t('reading.flashFront')}
							</span>
						</button>
						<div className="mt-4 flex justify-between gap-2">
							<button
								type="button"
								disabled={i <= 0}
								onClick={() => {
									setI(x => x - 1);
									setFlipped(false);
								}}
								className="rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-30"
								style={{ background: `${theme.ink}10` }}
							>
								{t('reading.prev')}
							</button>
							<button
								type="button"
								disabled={i >= cards.length - 1}
								onClick={() => {
									setI(x => x + 1);
									setFlipped(false);
								}}
								className="rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-30"
								style={{ background: `${theme.ink}10` }}
							>
								{t('reading.next')}
							</button>
						</div>
					</>
				)}
			</motion.div>
		</motion.div>
	);
}

export function CoachModal({ theme, t, busy, data, onRun, onSave, onClose }) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-3 sm:items-center"
			onClick={onClose}
		>
			<motion.div
				onClick={e => e.stopPropagation()}
				className="max-h-[min(88vh,640px)] w-full max-w-lg overflow-y-auto rounded-3xl border p-5 shadow-2xl"
				style={{ background: theme.paper, borderColor: `${theme.ink}12`, color: theme.ink }}
			>
				<div className="mb-3 flex items-start justify-between">
					<div>
						<p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: theme.accent }}>
							{t('reading.coach')}
						</p>
						<p className="mt-1 text-xs opacity-55">{t('reading.coachHint')}</p>
					</div>
					<button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-black/5">
						<X size={16} />
					</button>
				</div>
				{!data && (
					<button
						type="button"
						disabled={busy}
						onClick={onRun}
						className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
						style={{ background: theme.accent }}
					>
						{busy ? <Loader2 size={15} className="animate-spin" /> : <BookOpenCheck size={15} />}
						{busy ? t('common.working') : t('reading.coachRun')}
					</button>
				)}
				{data && (
					<div className="space-y-3">
						<p className="text-[10px] font-bold uppercase tracking-wider opacity-50">{t('reading.coachQuestions')}</p>
						<ol className="list-decimal space-y-2 ps-5 text-sm">
							{(data.questions || []).map((q, i) => (
								<li key={i}>{q}</li>
							))}
						</ol>
						{data.action && (
							<div className="rounded-2xl px-3 py-2 text-sm" style={{ background: `${theme.accent}14` }}>
								<p className="text-[10px] font-bold uppercase tracking-wider opacity-50">{t('reading.coachAction')}</p>
								<p className="mt-1 font-semibold">{data.action}</p>
							</div>
						)}
						<button
							type="button"
							onClick={onSave}
							className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold text-white"
							style={{ background: theme.accent }}
						>
							<Check size={15} /> {t('reading.coachSave')}
						</button>
					</div>
				)}
			</motion.div>
		</motion.div>
	);
}

export function ListenSentenceHighlight({ sentence, theme }) {
	if (!sentence) return null;
	return (
		<div
			className="pointer-events-none fixed bottom-24 start-1/2 z-[57] max-w-lg -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-sm shadow-lg"
			style={{ background: theme.paper, color: theme.ink, boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}
		>
			{sentence}
		</div>
	);
}
