'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { filterComposerMentionCandidates, findComposerMentionQuery, formatWhatsAppPhone, messageTextPresentation } from '../whatsapp-utils';
import { buildCompletionModel, rememberSentText, suggestCompletion } from '../wa-autocomplete';
import { getChatDraft, setChatDraft } from './wa-chat-drafts';

/**
 * Inline completion (grey suggested words + Tab) is off: it kept finishing words you did not
 * mean. Set to true to bring it back; nothing else depends on it.
 */
const INLINE_COMPLETION_ENABLED = false;


/** Long text grows the field (like WhatsApp) up to ~40% of the window, then it scrolls. */
function fitComposerHeight(node) {
	const max = Math.max(112, Math.min(320, Math.round((window.innerHeight || 800) * 0.4)));
	node.style.height = 'auto';
	const next = Math.min(node.scrollHeight, max);
	node.style.height = `${next}px`;
	node.style.maxHeight = `${max}px`;
	node.style.overflowY = node.scrollHeight > max ? 'auto' : 'hidden';
}

export function IsolatedComposerTextarea({
	apiRef,
	draftRef,
	/** The open chat: its unsent text is saved under this key and comes back when you return. */
	draftKey = '',
	onHasTextChange,
	placeholder,
	ariaLabel,
	onTyping,
	onEnterSubmit,
	onPaste,
	mentionCandidates = null,
	mentionLoading = false,
	onMentionOpen,
	locale = 'en',
	disabled = false,
	completionMessages = null,
}) {
	const [draft, setDraft] = useState('');
	const textareaRef = useRef(null);
	const ghostRef = useRef(null);
	const [ghost, setGhost] = useState('');
	// Word model for inline completion: this chat (your own lines weigh more) plus
	// what you have sent before, kept in this browser.
	const completionModel = useMemo(
		() =>
			INLINE_COMPLETION_ENABLED &&
			buildCompletionModel(
				(Array.isArray(completionMessages) ? completionMessages.slice(-300) : []).map(message => ({
					text: typeof message?.text === 'string' ? message.text : '',
					weight: message?.direction === 'outbound' ? 2 : 0.7,
				})),
			),
		[completionMessages],
	);
	const pickedMentionsRef = useRef([]);
	const mentionQueryRef = useRef(null);
	const [mentionQuery, setMentionQueryState] = useState(null);
	const [mentionIndex, setMentionIndex] = useState(0);
	const setMentionQuery = useCallback(next => {
		const current = mentionQueryRef.current;
		if (!next || current?.start !== next.start || current?.query !== next.query) {
			setMentionIndex(0);
		}
		mentionQueryRef.current = next;
		setMentionQueryState(next);
	}, []);
	const [mentionAnchor, setMentionAnchor] = useState(null);
	const mentionsEnabled = Array.isArray(mentionCandidates);
	const draftKeyRef = useRef(draftKey);

	const apply = useCallback(
		next => {
			const current = String(draftRef.current || '');
			const value = typeof next === 'function' ? next(current) : next;
			const text = String(value ?? '');
			draftRef.current = text;
			setDraft(text);
			setChatDraft(draftKeyRef.current, text);
			onHasTextChange?.(Boolean(text.trim()));
			if (!text) {
				pickedMentionsRef.current = [];
				setMentionQuery(null);
			}
			requestAnimationFrame(() => {
				const node = textareaRef.current;
				if (!node) return;
				fitComposerHeight(node);
			});
		},
		[draftRef, onHasTextChange, setMentionQuery],
	);

	// Switching chats: the text typed so far already sits under the previous key (saved on every
	// change), so only load the new chat's draft. Mentions and the grey suggestion belonged to
	// the old text.
	useLayoutEffect(() => {
		if (draftKeyRef.current === draftKey && draftRef.current === getChatDraft(draftKey)) return;
		draftKeyRef.current = draftKey;
		pickedMentionsRef.current = [];
		setMentionQuery(null);
		setGhost('');
		apply(getChatDraft(draftKey));
	}, [draftKey, apply, draftRef, setMentionQuery]);

	useLayoutEffect(() => {
		apiRef.current = {
			getDraft: () => String(draftRef.current || ''),
			// The workspace clears the field after a send: learn what was just sent.
			setDraft: next => {
				const previous = String(draftRef.current || '');
				apply(next);
				setGhost('');
				if (INLINE_COMPLETION_ENABLED && previous.trim() && !String(draftRef.current || '').trim()) {
					rememberSentText(previous);
				}
			},
			focus: () => {
				const node = textareaRef.current;
				if (!node || node.disabled) return;
				node.focus({ preventScroll: true });
				const end = node.value.length;
				node.setSelectionRange(end, end);
			},
			getMentions: () => [...pickedMentionsRef.current],
		};
		const api = apiRef.current;
		return () => {
			if (apiRef.current === api) apiRef.current = null;
		};
	}, [apiRef, apply, draftRef]);

	// Ghost text only when the caret sits at the very end with nothing selected.
	const refreshGhost = useCallback(
		node => {
			if (!INLINE_COMPLETION_ENABLED || !node || node.disabled) {
				setGhost('');
				return;
			}
			const value = node.value;
			const atEnd = node.selectionStart === value.length && node.selectionEnd === value.length;
			setGhost(atEnd && !mentionQueryRef.current ? suggestCompletion(completionModel, value) : '');
		},
		[completionModel],
	);

	const acceptGhost = () => {
		if (!ghost) return false;
		const node = textareaRef.current;
		const next = `${String(draftRef.current || '')}${ghost}`;
		apply(next);
		setGhost('');
		requestAnimationFrame(() => {
			if (!node) return;
			node.setSelectionRange(next.length, next.length);
			refreshGhost(node);
		});
		onTyping?.();
		return true;
	};

	// The mirror behind the textarea has to match its box and type exactly, or the
	// grey text drifts off the end of the line.
	useLayoutEffect(() => {
		const node = textareaRef.current;
		const mirror = ghostRef.current;
		if (!ghost || !node || !mirror) return;
		const style = window.getComputedStyle(node);
		for (const prop of [
			'fontFamily',
			'fontSize',
			'fontWeight',
			'fontStyle',
			'letterSpacing',
			'wordSpacing',
			'lineHeight',
			'textAlign',
			'direction',
			'textIndent',
			'paddingTop',
			'paddingRight',
			'paddingBottom',
			'paddingLeft',
			'borderTopWidth',
			'borderRightWidth',
			'borderBottomWidth',
			'borderLeftWidth',
		]) {
			mirror.style[prop] = style[prop];
		}
		mirror.scrollTop = node.scrollTop;
	}, [ghost, draft]);

	const mentionMatches = useMemo(
		() =>
			mentionsEnabled && mentionQuery
				? filterComposerMentionCandidates(mentionCandidates, mentionQuery.query)
				: [],
		[mentionCandidates, mentionQuery, mentionsEnabled],
	);
	const mentionOpen =
		mentionsEnabled && Boolean(mentionQuery) && (mentionMatches.length > 0 || mentionLoading);

	const syncMentionQuery = useCallback(
		node => {
			if (!mentionsEnabled || !node) {
				setMentionQuery(null);
				return;
			}
			const next = findComposerMentionQuery(node.value, node.selectionStart ?? node.value.length);
			if (next && !mentionQueryRef.current) onMentionOpen?.();
			setMentionQuery(next);
			if (next) {
				const rect = node.getBoundingClientRect();
				setMentionAnchor({ left: rect.left, top: rect.top, width: rect.width });
			}
		},
		[mentionsEnabled, onMentionOpen, setMentionQuery],
	);

	useEffect(() => {
		if (!mentionsEnabled) setMentionQuery(null);
	}, [mentionsEnabled, setMentionQuery]);

	const pickMention = candidate => {
		const node = textareaRef.current;
		const query = mentionQuery;
		if (!candidate || !query) return;
		const current = String(draftRef.current || '');
		const insert = `@${candidate.label} `;
		const next = `${current.slice(0, query.start)}${insert}${current.slice(query.end)}`;
		pickedMentionsRef.current = [
			...pickedMentionsRef.current.filter(item => item.waId !== candidate.waId),
			{ label: candidate.label, waId: candidate.waId },
		];
		apply(next);
		setMentionQuery(null);
		const caret = query.start + insert.length;
		requestAnimationFrame(() => {
			if (!node) return;
			node.focus();
			node.setSelectionRange(caret, caret);
		});
	};

	const presentation = messageTextPresentation(draft);
	const ar = locale === 'ar';

	return (
		<span className={`wa-ghost-wrap${ghost ? ' has-ghost' : ''}`}>
			{ghost ? (
				<div ref={ghostRef} className="wa-ghost" aria-hidden="true" dir={presentation.dir}>
					<span className="wa-ghost__typed">{draft}</span>
					<span className="wa-ghost__hint">{ghost}</span>
					<kbd className="wa-ghost__key">Tab</kbd>
				</div>
			) : null}
			<textarea
				ref={textareaRef}
				disabled={disabled}
				aria-label={ariaLabel}
				aria-autocomplete={mentionsEnabled ? 'list' : 'inline'}
				aria-expanded={mentionsEnabled ? mentionOpen : undefined}
				value={draft}
				onChange={event => {
					apply(event.target.value);
					syncMentionQuery(event.target);
					refreshGhost(event.target);
					onTyping?.();
				}}
				onClick={event => {
					syncMentionQuery(event.currentTarget);
					refreshGhost(event.currentTarget);
				}}
				onScroll={event => {
					if (ghostRef.current) ghostRef.current.scrollTop = event.currentTarget.scrollTop;
				}}
				onBlur={() => {
					setGhost('');
					window.setTimeout(() => setMentionQuery(null), 150);
				}}
				onFocus={event => refreshGhost(event.currentTarget)}
				onPaste={onPaste}
				onKeyDown={event => {
					if (ghost && !mentionOpen && !event.nativeEvent.isComposing) {
						const ltr = window.getComputedStyle(event.currentTarget).direction !== 'rtl';
						if (
							(event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) ||
							(event.key === (ltr ? 'ArrowRight' : 'ArrowLeft') && !event.shiftKey)
						) {
							event.preventDefault();
							acceptGhost();
							return;
						}
						if (event.key === 'Escape') {
							event.preventDefault();
							setGhost('');
							return;
						}
					}
					if (mentionOpen && !event.nativeEvent.isComposing) {
						if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
							event.preventDefault();
							const step = event.key === 'ArrowDown' ? 1 : -1;
							const size = Math.max(1, mentionMatches.length);
							setMentionIndex(current => (current + step + size) % size);
							return;
						}
						if ((event.key === 'Enter' || event.key === 'Tab') && mentionMatches.length) {
							event.preventDefault();
							pickMention(mentionMatches[Math.min(mentionIndex, mentionMatches.length - 1)]);
							return;
						}
						if (event.key === 'Escape') {
							event.preventDefault();
							setMentionQuery(null);
							return;
						}
					}
					// Ctrl/Cmd + Enter: a new line at the caret (textareas do not insert one on their own).
					if (
						event.key === 'Enter' &&
						(event.ctrlKey || event.metaKey) &&
						!event.altKey &&
						!event.nativeEvent.isComposing
					) {
						event.preventDefault();
						const node = event.currentTarget;
						const current = String(draftRef.current ?? node.value ?? '');
						const start = node.selectionStart ?? current.length;
						const end = node.selectionEnd ?? start;
						apply(`${current.slice(0, start)}\n${current.slice(end)}`);
						const caret = start + 1;
						requestAnimationFrame(() => {
							node.focus();
							node.setSelectionRange(caret, caret);
						});
						return;
					}
					if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
						event.preventDefault();
						onEnterSubmit?.(event);
					}
				}}
				onKeyUp={event => {
					if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
						syncMentionQuery(event.currentTarget);
						refreshGhost(event.currentTarget);
					}
				}}
				rows={1}
				dir={presentation.dir}
				lang={presentation.lang}
				style={presentation.style}
				placeholder={placeholder}
				className={`wa-composer-input min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 leading-5 outline-none ${presentation.className || ''}`}
			/>
			{mentionOpen && mentionAnchor && typeof document !== 'undefined'
				? createPortal(
						<div
							role="listbox"
							aria-label={ar ? 'منشن عضو' : 'Mention a member'}
							dir={ar ? 'rtl' : 'ltr'}
							className="fixed z-[80] max-h-64 overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-2xl dark:border-white/10 dark:bg-[#233138]"
							style={{
								left: Math.max(8, mentionAnchor.left - 8),
								bottom: Math.max(8, window.innerHeight - mentionAnchor.top + 10),
								width: Math.min(360, Math.max(240, mentionAnchor.width + 16), window.innerWidth - 16),
							}}
							onMouseDown={event => event.preventDefault()}
						>
							{mentionMatches.length === 0 ? (
								<div className="px-3 py-2.5 text-[13px] text-[#667781] dark:text-[#8696A0]">
									{ar ? 'جاري تحميل الأعضاء…' : 'Loading members…'}
								</div>
							) : (
								mentionMatches.map((candidate, index) => (
									<button
										key={candidate.waId}
										type="button"
										role="option"
										aria-selected={index === mentionIndex}
										onMouseEnter={() => setMentionIndex(index)}
										onClick={() => pickMention(candidate)}
										className={`flex w-full items-center gap-3 px-3 py-2 text-start ${
											index === mentionIndex ? 'bg-[#F0F2F5] dark:bg-[#182229]' : ''
										}`}
									>
										<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#DFE5E7] text-sm font-semibold text-[#54656F] dark:bg-[#6A7175] dark:text-white">
											{String(candidate.label || '?').replace(/^\+/, '').slice(0, 1).toUpperCase()}
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-[14.5px] text-[#111B21] dark:text-[#E9EDEF]">
												{candidate.label}
											</span>
											{candidate.name && candidate.phone ? (
												<span className="block truncate text-[12.5px] text-[#667781] dark:text-[#8696A0]" dir="ltr">
													{formatWhatsAppPhone(candidate.phone)}
												</span>
											) : null}
										</span>
										{candidate.isAdmin ? (
											<span className="shrink-0 rounded bg-[#D9FDD3] px-1.5 py-0.5 text-[11px] text-[#008069] dark:bg-[#005C4B] dark:text-[#E9EDEF]">
												{ar ? 'مشرف' : 'Admin'}
											</span>
										) : null}
									</button>
								))
							)}
						</div>,
						document.body,
					)
				: null}
		</span>
	);
}
