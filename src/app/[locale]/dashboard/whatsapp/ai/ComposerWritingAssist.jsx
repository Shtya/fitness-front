'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	ArrowDownToLine,
	Check,
	Copy,
	Languages,
	Loader2,
	Mic,
	PenLine,
	RotateCcw,
	SpellCheck,
	Square,
	X,
} from 'lucide-react';
import {
	createTranscription,
	getStoredTranscriptionProvider,
	transcriptionErrorMessage,
} from '../../transcript/transcription-client';
import {
	buildVoiceNoteFile,
	createVoiceMediaRecorder,
	getVoiceMediaStream,
} from '../whatsapp-voice-recorder';
import { whatsappAiApi } from './whatsapp-ai-api';

const PANEL_WIDTH = 420;
const VIEWPORT_PAD = 12;
const MAX_RECORD_SECONDS = 120;

const MODES = [
	{
		id: 'dictate_to_en',
		icon: Mic,
		en: { label: 'Speak', hint: 'Say it in Arabic, get a clean English message.' },
		ar: { label: 'بالصوت', hint: 'اتكلم بالعربي وخد رسالة إنجليزي مظبوطة.' },
	},
	{
		id: 'ar_to_en',
		icon: Languages,
		en: { label: 'Translate', hint: 'Turn Arabic text into natural English.' },
		ar: { label: 'ترجمة', hint: 'حوّل النص العربي لإنجليزي طبيعي.' },
	},
	{
		id: 'en_polish',
		icon: SpellCheck,
		en: { label: 'Fix', hint: 'Correct grammar and spelling, keep your words.' },
		ar: { label: 'تصحيح', hint: 'يصلّح النحو والإملاء ويحافظ على كلامك.' },
	},
	{
		id: 'en_stronger',
		icon: PenLine,
		en: { label: 'Strengthen', hint: 'Clearer, more confident wording.' },
		ar: { label: 'أقوى', hint: 'صياغة أوضح وأقوى.' },
	},
];

function errorMessage(error, fallback) {
	const value = error?.response?.data?.message || error?.message || fallback;
	return Array.isArray(value) ? value.join(', ') : String(value);
}

function formatSeconds(total) {
	const safe = Math.max(0, Math.floor(Number(total) || 0));
	const minutes = Math.floor(safe / 60);
	const seconds = safe % 60;
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function clampPanelPosition(rect) {
	const width = Math.min(PANEL_WIDTH, Math.max(280, window.innerWidth - VIEWPORT_PAD * 2));
	let left = rect.right - width;
	left = Math.min(left, window.innerWidth - width - VIEWPORT_PAD);
	left = Math.max(VIEWPORT_PAD, left);
	const gap = 8;
	const spaceAbove = rect.top - VIEWPORT_PAD;
	const placeAbove = spaceAbove >= 300 || spaceAbove >= window.innerHeight - rect.bottom;
	if (placeAbove) {
		return {
			left,
			width,
			bottom: window.innerHeight - rect.top + gap,
			maxHeight: Math.max(260, Math.min(680, spaceAbove - gap)),
		};
	}
	return {
		left,
		width,
		top: rect.bottom + gap,
		maxHeight: Math.max(260, Math.min(680, window.innerHeight - rect.bottom - VIEWPORT_PAD - gap)),
	};
}

export default function ComposerWritingAssist({
	locale = 'en',
	conversationId,
	draft = '',
	getDraft,
	disabled = false,
	onApply,
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const [open, setOpen] = useState(false);
	const [mode, setMode] = useState('ar_to_en');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);
	const [position, setPosition] = useState(null);
	const [copied, setCopied] = useState(false);
	const [meaningText, setMeaningText] = useState('');
	const [recording, setRecording] = useState(false);
	const [recordSecs, setRecordSecs] = useState(0);
	const [transcribing, setTranscribing] = useState(false);
	const abortRef = useRef(null);
	const rootRef = useRef(null);
	const buttonRef = useRef(null);
	const panelRef = useRef(null);
	const meaningRef = useRef(null);
	const chunksRef = useRef([]);
	const recorderRef = useRef(null);
	const streamRef = useRef(null);
	const recordTimerRef = useRef(null);
	const recordSecsRef = useRef(0);
	const stopRecordingRef = useRef(null);

	const readDraft = () => {
		if (typeof getDraft === 'function') return String(getDraft() || '');
		return String(draft || '');
	};

	const copy = useMemo(
		() =>
			ar
				? {
						title: 'مساعد الكتابة',
						subtitle: 'مفيش حاجة بتتبعت غير لما تضغط «استخدم».',
						yourText: 'رسالتك',
						yourTextVoice: 'كلامك بالعربي',
						placeholder: 'اكتب رسالتك هنا…',
						placeholderVoice: 'اضغط الميكروفون واتكلم، أو اكتب بنفسك…',
						fromDraft: 'هات المسودة',
						clear: 'مسح',
						record: 'تسجيل',
						stop: 'إيقاف',
						recording: 'بيسجّل',
						transcribing: 'بيحوّل الصوت لنص…',
						result: 'النسخة الإنجليزي',
						resultPolish: 'النسخة المصحّحة',
						resultStronger: 'النسخة الأقوى',
						changes: 'اللي اتغيّر',
						run: 'حسّن الرسالة',
						running: 'بيكتب…',
						use: 'استخدم في الرسالة',
						again: 'نسخة تانية',
						copy: 'نسخ',
						copied: 'اتنسخ',
						open: 'مساعد الكتابة',
						micDenied: 'اسمح بالميكروفون من إعدادات المتصفح',
						micUnsupported: 'التسجيل مش مدعوم في المتصفح ده',
						noAudio: 'مفيش صوت اتسجّل',
						noTranscript: 'ما قدرناش نطلع نص من التسجيل',
						shortcut: 'للتشغيل',
					}
				: {
						title: 'Writing assist',
						subtitle: 'Nothing is sent until you press “Use”.',
						yourText: 'Your message',
						yourTextVoice: 'What you said, in Arabic',
						placeholder: 'Type your message here…',
						placeholderVoice: 'Tap the mic and speak, or type it yourself…',
						fromDraft: 'Use draft',
						clear: 'Clear',
						record: 'Record',
						stop: 'Stop',
						recording: 'Recording',
						transcribing: 'Turning speech into text…',
						result: 'English version',
						resultPolish: 'Corrected version',
						resultStronger: 'Stronger version',
						changes: 'What changed',
						run: 'Rewrite',
						running: 'Writing…',
						use: 'Use in message',
						again: 'Try another',
						copy: 'Copy',
						copied: 'Copied',
						open: 'Writing assist',
						micDenied: 'Allow microphone access in your browser settings',
						micUnsupported: 'Recording is not supported in this browser',
						noAudio: 'No audio was recorded',
						noTranscript: 'Could not get text from the recording',
						shortcut: 'to run',
					},
		[ar],
	);

	const updatePosition = useCallback(() => {
		const rect = buttonRef.current?.getBoundingClientRect();
		if (!rect) return;
		setPosition(clampPanelPosition(rect));
	}, []);

	const cleanupStream = useCallback(() => {
		if (recordTimerRef.current) {
			window.clearInterval(recordTimerRef.current);
			recordTimerRef.current = null;
		}
		const stream = streamRef.current;
		streamRef.current = null;
		if (stream) {
			for (const track of stream.getTracks()) {
				try {
					track.stop();
				} catch {
					/* ignore */
				}
			}
		}
		recorderRef.current = null;
	}, []);

	const stopRecording = useCallback(() => {
		const recorder = recorderRef.current;
		if (!recorder || recorder.state === 'inactive') {
			cleanupStream();
			setRecording(false);
			return;
		}
		try {
			recorder.stop();
		} catch {
			cleanupStream();
			setRecording(false);
		}
	}, [cleanupStream]);
	stopRecordingRef.current = stopRecording;

	const finishRecording = useCallback(
		async (chunks, recorder, seconds) => {
			cleanupStream();
			setRecording(false);
			const file = buildVoiceNoteFile(chunks, recorder, seconds);
			if (!file) {
				setError(copy.noAudio);
				return;
			}
			setTranscribing(true);
			setError('');
			try {
				const data = await createTranscription({
					file,
					provider: getStoredTranscriptionProvider(),
					language: 'ar',
				});
				const text = String(data?.text || data?.transcript || '')
					.replace(/\s+/g, ' ')
					.trim();
				if (!text) {
					setError(copy.noTranscript);
					return;
				}
				setMeaningText(current => {
					const prev = String(current || '').trim();
					return prev ? `${prev} ${text}`.trim() : text;
				});
				setMode('dictate_to_en');
				setResult(null);
				requestAnimationFrame(() => {
					updatePosition();
					meaningRef.current?.focus?.();
				});
			} catch (err) {
				setError(
					transcriptionErrorMessage(
						err,
						ar ? 'تعذر تحويل الصوت إلى نص' : 'Could not transcribe the recording',
					),
				);
			} finally {
				setTranscribing(false);
			}
		},
		[ar, cleanupStream, copy.noAudio, copy.noTranscript, updatePosition],
	);

	const startRecording = async () => {
		if (disabled || recording || transcribing || loading) return;
		if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
			setError(copy.micUnsupported);
			return;
		}
		setError('');
		setResult(null);
		try {
			const stream = await getVoiceMediaStream();
			streamRef.current = stream;
			const recorder = createVoiceMediaRecorder(stream);
			chunksRef.current = [];
			recordSecsRef.current = 0;
			setRecordSecs(0);
			recorder.ondataavailable = event => {
				if (event.data?.size) chunksRef.current.push(event.data);
			};
			recorder.onstop = () => {
				const chunks = chunksRef.current.slice();
				const secs = recordSecsRef.current;
				chunksRef.current = [];
				void finishRecording(chunks, recorder, secs);
			};
			recorderRef.current = recorder;
			recorder.start(250);
			setRecording(true);
			setMode('dictate_to_en');
			recordTimerRef.current = window.setInterval(() => {
				recordSecsRef.current += 1;
				setRecordSecs(recordSecsRef.current);
				if (recordSecsRef.current >= MAX_RECORD_SECONDS) {
					stopRecordingRef.current?.();
				}
			}, 1000);
			requestAnimationFrame(updatePosition);
		} catch (err) {
			cleanupStream();
			const denied =
				err?.name === 'NotAllowedError' ||
				err?.name === 'PermissionDeniedError' ||
				/permission|denied|NotAllowed/i.test(String(err?.message || ''));
			setError(denied ? copy.micDenied : errorMessage(err, copy.micUnsupported));
		}
	};

	useEffect(() => {
		if (!open) return undefined;
		updatePosition();
		const onPointer = event => {
			const target = event.target;
			if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
			if (recording) return;
			setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') {
				if (recording) stopRecording();
				else setOpen(false);
			}
		};
		window.addEventListener('resize', updatePosition);
		window.addEventListener('scroll', updatePosition, true);
		document.addEventListener('pointerdown', onPointer);
		document.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('resize', updatePosition);
			window.removeEventListener('scroll', updatePosition, true);
			document.removeEventListener('pointerdown', onPointer);
			document.removeEventListener('keydown', onKey);
		};
	}, [open, recording, stopRecording, updatePosition]);

	useEffect(
		() => () => {
			abortRef.current?.abort();
			if (recorderRef.current && recorderRef.current.state !== 'inactive') {
				try {
					recorderRef.current.onstop = null;
					recorderRef.current.stop();
				} catch {
					/* ignore */
				}
			}
			cleanupStream();
		},
		[cleanupStream],
	);

	// What you see is what gets rewritten: the box opens holding the current draft.
	const openPanel = () => {
		const draftNow = readDraft().trim();
		setMeaningText(current => (String(current || '').trim() ? current : draftNow));
		setOpen(true);
		requestAnimationFrame(updatePosition);
	};

	const clearAll = () => {
		abortRef.current?.abort();
		if (recording) stopRecording();
		setMeaningText('');
		setResult(null);
		setError('');
		setCopied(false);
		setRecordSecs(0);
		requestAnimationFrame(() => meaningRef.current?.focus?.());
	};

	const fillFromDraft = () => {
		const text = readDraft().trim();
		if (!text) return;
		setMeaningText(text);
		setResult(null);
		setError('');
		requestAnimationFrame(() => meaningRef.current?.focus?.());
	};

	const sourceText = () => String(meaningText || '').trim() || readDraft().trim();

	const runAssist = async () => {
		const text = sourceText();
		if (!conversationId || !text || loading || disabled || recording || transcribing) return;
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;
		setLoading(true);
		setError('');
		setResult(null);
		try {
			const data = await whatsappAiApi.writingAssist(conversationId, { text, mode }, controller.signal);
			setResult(data);
			requestAnimationFrame(updatePosition);
		} catch (err) {
			if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
			setError(errorMessage(err, ar ? 'تعذر تحسين النص' : 'Could not improve the draft'));
		} finally {
			setLoading(false);
		}
	};

	const applyResult = () => {
		const text = String(result?.finalText || '').trim();
		if (!text) return;
		onApply?.(text);
		setOpen(false);
		setResult(null);
		setMeaningText('');
		setError('');
	};

	const draftText = readDraft().trim();
	const sourceTrimmed = String(meaningText || '').trim();
	const words = sourceTrimmed ? sourceTrimmed.split(/\s+/).length : 0;
	const activeMode = MODES.find(item => item.id === mode) || MODES[0];
	const activeCopy = ar ? activeMode.ar : activeMode.en;
	const isVoice = mode === 'dictate_to_en';
	const finalText = String(result?.finalText || '').trim();
	const busy = loading || recording || transcribing;
	const resultLabel =
		mode === 'en_polish' ? copy.resultPolish : mode === 'en_stronger' ? copy.resultStronger : copy.result;
	const showDraftButton = draftText && draftText !== sourceTrimmed;

	const copyResult = async () => {
		if (!finalText) return;
		try {
			await navigator.clipboard.writeText(finalText);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1400);
		} catch {
			/* clipboard blocked */
		}
	};

	const panel =
		open && position && typeof document !== 'undefined'
			? createPortal(
					<div
						ref={panelRef}
						className="wa-wa"
						style={{
							left: position.left,
							width: position.width,
							...(position.bottom != null ? { bottom: position.bottom } : { top: position.top }),
							maxHeight: position.maxHeight,
						}}
						role="dialog"
						aria-label={copy.title}
						dir={ar ? 'rtl' : 'ltr'}
						onKeyDown={event => {
							if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
								event.preventDefault();
								if (finalText) applyResult();
								else void runAssist();
							}
						}}
					>
						<header className="wa-wa__head">
							<div className="min-w-0">
								<h2 className="wa-wa__title">{copy.title}</h2>
								<p className="wa-wa__subtitle">{copy.subtitle}</p>
							</div>
							<button
								type="button"
								onClick={() => {
									if (recording) stopRecording();
									setOpen(false);
								}}
								className="wa-wa__icon-btn"
								aria-label={ar ? 'إغلاق' : 'Close'}
							>
								<X size={17} strokeWidth={2} />
							</button>
						</header>

						<div className="wa-wa__tabs" role="tablist" aria-label={copy.title}>
							{MODES.map(item => {
								const labels = ar ? item.ar : item.en;
								const Icon = item.icon;
								const active = mode === item.id;
								return (
									<button
										key={item.id}
										type="button"
										role="tab"
										aria-selected={active}
										disabled={busy}
										onClick={() => {
											setMode(item.id);
											setResult(null);
											setError('');
										}}
										className={`wa-wa__tab${active ? ' is-active' : ''}`}
									>
										<Icon size={15} strokeWidth={2} aria-hidden="true" />
										{labels.label}
									</button>
								);
							})}
						</div>
						<p className="wa-wa__mode-hint">{activeCopy.hint}</p>

						<div
							className="wa-wa__body wa-ui-scroll nice-scroll"
							style={{ maxHeight: Math.max(160, (position.maxHeight || 520) - 172) }}
						>
							<div className={`wa-wa__field${recording ? ' is-recording' : ''}`}>
								<div className="wa-wa__field-head">
									<span className="wa-wa__field-label">{isVoice ? copy.yourTextVoice : copy.yourText}</span>
									<span className="wa-wa__field-tools">
										{showDraftButton ? (
											<button type="button" className="wa-wa__link" onClick={fillFromDraft} disabled={busy}>
												<ArrowDownToLine size={13} strokeWidth={2} />
												{copy.fromDraft}
											</button>
										) : null}
										{sourceTrimmed ? (
											<button type="button" className="wa-wa__link" onClick={clearAll} disabled={busy && !recording}>
												{copy.clear}
											</button>
										) : null}
									</span>
								</div>
								<textarea
									ref={meaningRef}
									value={meaningText}
									onChange={event => {
										setMeaningText(event.target.value);
										setResult(null);
									}}
									rows={4}
									dir="auto"
									placeholder={isVoice ? copy.placeholderVoice : copy.placeholder}
									disabled={recording || transcribing}
									className="wa-wa__textarea"
								/>
								<div className="wa-wa__field-foot">
									{isVoice ? (
										recording ? (
											<button type="button" className="wa-wa__rec is-live" onClick={stopRecording}>
												<Square size={12} strokeWidth={0} fill="currentColor" />
												{copy.stop}
												<span className="wa-wa__rec-time">{formatSeconds(recordSecs)}</span>
											</button>
										) : (
											<button
												type="button"
												className="wa-wa__rec"
												onClick={() => void startRecording()}
												disabled={disabled || transcribing || loading}
											>
												{transcribing ? (
													<Loader2 size={14} className="animate-spin" />
												) : (
													<Mic size={14} strokeWidth={2.2} />
												)}
												{transcribing ? copy.transcribing : copy.record}
											</button>
										)
									) : (
										<span />
									)}
									<span className="wa-wa__count">
										{words ? `${words} ${ar ? 'كلمة' : words === 1 ? 'word' : 'words'}` : ''}
									</span>
								</div>
							</div>

							{error ? (
								<p className="wa-wa__error" role="alert">
									{error}
								</p>
							) : null}

							{loading ? (
								<div className="wa-wa__result is-loading" aria-busy="true">
									<span className="wa-wa__result-label">{resultLabel}</span>
									<span className="wa-wa__line" />
									<span className="wa-wa__line" />
									<span className="wa-wa__line is-short" />
								</div>
							) : null}

							{finalText && !loading ? (
								<section className="wa-wa__result" aria-live="polite">
									<div className="wa-wa__result-head">
										<span className="wa-wa__result-label">{resultLabel}</span>
										<button type="button" onClick={() => void copyResult()} className="wa-wa__link">
											{copied ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={2} />}
											{copied ? copy.copied : copy.copy}
										</button>
									</div>
									<p className="wa-wa__final" dir="auto">
										{finalText}
									</p>
									{Array.isArray(result.notes) && result.notes.length ? (
										<div className="wa-wa__changes">
											<p className="wa-wa__changes-title">{copy.changes}</p>
											<ul>
												{result.notes.map(note => (
													<li key={note}>{note}</li>
												))}
											</ul>
										</div>
									) : null}
								</section>
							) : null}
						</div>

						<footer className="wa-wa__foot">
							{finalText && !loading ? (
								<>
									<button type="button" onClick={() => void runAssist()} className="wa-wa__secondary" disabled={busy}>
										<RotateCcw size={14} strokeWidth={2} />
										{copy.again}
									</button>
									<button type="button" onClick={applyResult} className="wa-wa__primary">
										{copy.use}
									</button>
								</>
							) : (
								<>
									<span className="wa-wa__shortcut">
										<kbd>Ctrl</kbd> <kbd>Enter</kbd> {copy.shortcut}
									</span>
									<button
										type="button"
										disabled={disabled || busy || !sourceText()}
										onClick={() => void runAssist()}
										className="wa-wa__primary"
									>
										{loading ? <Loader2 size={15} className="animate-spin" /> : null}
										{loading ? copy.running : copy.run}
									</button>
								</>
							)}
						</footer>
					</div>,
					document.body,
				)
			: null;

	return (
		<div ref={rootRef} className="wa-writing-assist relative shrink-0">
			<button
				ref={buttonRef}
				type="button"
				disabled={disabled}
				title={copy.open}
				aria-label={copy.open}
				aria-expanded={open}
				onClick={() => {
					if (open) setOpen(false);
					else openPanel();
				}}
				className={`wa-input-action wa-composer-tool--desktop disabled:opacity-40${open ? ' is-active' : ''}`}
			>
				<Languages size={18} strokeWidth={2.1} />
			</button>
			{panel}
		</div>
	);
}
