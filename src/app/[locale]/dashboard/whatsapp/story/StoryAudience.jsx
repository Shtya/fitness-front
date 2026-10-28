'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
	Check,
	Eye,
	EyeOff,
	Loader2,
	RefreshCw,
	Search,
	ShieldCheck,
	Smartphone,
	UserCheck,
	UserMinus,
	UserPlus,
	UsersRound,
	X,
} from 'lucide-react';
import api from '@/utils/axios';
import './wa-story-audience.css';

const LIST_LIMIT = 2500;
const PEEK_SIZE = 240;

const COPY = {
	en: {
		title: 'Who can see my stories',
		subtitle: 'Applies to every story you publish from here.',
		modes: {
			contacts: ['My contacts', 'Everyone in your chats and contacts'],
			except: ['My contacts except…', 'Everyone, minus the people you hide'],
			only: ['Only share with…', 'Just the people you pick'],
		},
		search: 'Search name or number',
		book: { all: 'All', saved: 'Saved', profile: 'Profile name', numbers: 'Numbers' },
		filters: { all: 'All', seeing: 'Can see', hidden: 'Hidden' },
		seeing: count => `${count.toLocaleString()} ${count === 1 ? 'person' : 'people'} will see your stories`,
		savedGroup: count => `${count.toLocaleString()} saved on your phone`,
		profileGroup: count => `${count.toLocaleString()} not saved · showing their WhatsApp name`,
		numbersGroup: count => `${count.toLocaleString()} numbers with no name`,
		selectAll: 'Select all',
		clear: 'Clear',
		hiddenBadge: 'Hidden',
		numberBadge: 'Number',
		addedBadge: 'Added',
		addNumber: 'Add number',
		addPlaceholder: 'Number with country code, e.g. +20 10 1234 5678',
		addSubmit: 'Add',
		addSuggest: digits => `Add +${digits} so they can see your stories`,
		addInvalid: 'Enter the full number with the country code',
		addDone: 'Added. Save to keep it.',
		addExists: 'Already in your list',
		viewPhoto: 'View photo',
		more: count => `Showing the first ${LIST_LIMIT}. Search to find the other ${count.toLocaleString()}.`,
		empty: 'No one matches this search.',
		loadError: 'Could not load your contacts.',
		retry: 'Retry',
		cancel: 'Cancel',
		save: 'Save',
		saved: 'Story audience saved',
		pickOne: 'Pick at least one person',
		saveError: 'Could not save the story audience',
	},
	ar: {
		title: 'مين يقدر يشوف حالتي',
		subtitle: 'بيتطبق على كل ستوري تنشره من هنا.',
		modes: {
			contacts: ['جهات اتصالي', 'كل اللي عندك في الشاتات وجهات الاتصال'],
			except: ['جهات اتصالي ما عدا…', 'الكل، ما عدا اللي تخفيهم'],
			only: ['المشاركة مع…', 'بس الناس اللي تختارهم'],
		},
		search: 'ابحث باسم أو رقم',
		book: { all: 'الكل', saved: 'المحفوظين', profile: 'باسم البروفايل', numbers: 'أرقام بس' },
		filters: { all: 'الكل', seeing: 'هيشوفوها', hidden: 'مخفيين' },
		seeing: count => `${count.toLocaleString('ar-EG')} شخص هيشوف الستوري بتاعتك`,
		savedGroup: count => `${count.toLocaleString('ar-EG')} محفوظين على الموبايل`,
		profileGroup: count => `${count.toLocaleString('ar-EG')} مش محفوظين · ظاهرين باسم الواتساب بتاعهم`,
		numbersGroup: count => `${count.toLocaleString('ar-EG')} رقم من غير أي اسم`,
		selectAll: 'تحديد الكل',
		clear: 'إلغاء التحديد',
		hiddenBadge: 'مخفي',
		numberBadge: 'رقم',
		addedBadge: 'مضاف',
		addNumber: 'إضافة رقم',
		addPlaceholder: 'الرقم بكود الدولة، مثلاً ‎+20 10 1234 5678',
		addSubmit: 'إضافة',
		addSuggest: digits => `ضيف ‎+${digits} عشان يشوف الستوري بتاعتك`,
		addInvalid: 'اكتب الرقم كامل بكود الدولة',
		addDone: 'اتضاف. دوس حفظ عشان يتثبت.',
		addExists: 'موجود بالفعل في القايمة',
		viewPhoto: 'عرض الصورة',
		more: count => `معروض أول ${LIST_LIMIT}. ابحث عشان توصل لباقي ${count.toLocaleString('ar-EG')}.`,
		empty: 'مفيش حد بالبحث ده.',
		loadError: 'مقدرناش نحمّل جهات الاتصال.',
		retry: 'حاول تاني',
		cancel: 'إلغاء',
		save: 'حفظ',
		saved: 'اتحفظ جمهور الستوري',
		pickOne: 'اختار شخص واحد على الأقل',
		saveError: 'مقدرناش نحفظ جمهور الستوري',
	},
};

const MODE_ICONS = { contacts: UsersRound, except: UserMinus, only: UserCheck };

function personLabel(person) {
	return person.name || `+${person.phone}`;
}

function initials(label) {
	// First real letter or digit: charAt(0) would split an emoji or a styled
	// Unicode letter in half and show "�".
	const first = Array.from(String(label || '')).find(char => /[\p{L}\p{N}]/u.test(char));
	return (first || '?').toUpperCase();
}

/*
 * Profile pictures. Stored URLs are WhatsApp CDN links that expire, and many people
 * have none stored, so rows that come on screen without a working image ask the backend
 * for the current one. Results (including "no photo") are cached for the page's lifetime,
 * and only a few requests run at once so a fast scroll does not flood WhatsApp.
 */
const avatarCache = new Map();
const avatarInFlight = new Map();
const avatarQueue = [];
let avatarActive = 0;
const AVATAR_CONCURRENCY = 3;

function pumpAvatarQueue() {
	while (avatarActive < AVATAR_CONCURRENCY && avatarQueue.length) {
		const job = avatarQueue.shift();
		avatarActive += 1;
		api
			.post(`/whatsapp/accounts/${job.accountId}/statuses/audience/avatar`, { waId: job.waId, quality: job.quality })
			.then(({ data }) => data?.avatarUrl || null)
			.catch(() => null)
			.then(url => {
				avatarActive -= 1;
				job.resolve(url);
				pumpAvatarQueue();
			});
	}
}

function fetchAvatar(accountId, waId, quality = 'preview') {
	const key = `${quality}:${accountId}:${waId}`;
	if (avatarCache.has(key)) return Promise.resolve(avatarCache.get(key));
	if (!avatarInFlight.has(key)) {
		const promise = new Promise(resolve => {
			avatarQueue.push({ accountId, waId, quality, resolve });
			pumpAvatarQueue();
		}).then(url => {
			avatarCache.set(key, url);
			avatarInFlight.delete(key);
			return url;
		});
		avatarInFlight.set(key, promise);
	}
	return avatarInFlight.get(key);
}

let avatarObserver = null;
const avatarWatchers = new Map();

function watchVisible(element, onVisible) {
	if (typeof IntersectionObserver === 'undefined') {
		onVisible();
		return () => {};
	}
	if (!avatarObserver) {
		// Ancestors' scroll clipping counts, so this fires only for rows actually in the list's view.
		avatarObserver = new IntersectionObserver(
			entries => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					avatarWatchers.get(entry.target)?.();
				}
			},
			{ rootMargin: '200px 0px' },
		);
	}
	avatarWatchers.set(element, onVisible);
	avatarObserver.observe(element);
	return () => {
		avatarWatchers.delete(element);
		avatarObserver?.unobserve(element);
	};
}

/**
 * Photo laid over a row's initials slot. Shows nothing until a real image has loaded,
 * so a dead link or a hidden photo leaves the initials instead of a broken-image icon.
 */
function AudienceAvatar({ accountId, person, dim, label, viewLabel, onPeek, onUnpeek, onOpen }) {
	const cacheKey = `preview:${accountId}:${person.waId}`;
	const [url, setUrl] = useState(() => (avatarCache.has(cacheKey) ? avatarCache.get(cacheKey) : person.avatarUrl || null));
	const [loaded, setLoaded] = useState(false);
	const [asked, setAsked] = useState(() => avatarCache.has(cacheKey));
	const sentinelRef = useRef(null);

	// No usable link yet (none stored, or the stored one failed): ask once, when on screen.
	useEffect(() => {
		if (asked || url) return undefined;
		const element = sentinelRef.current;
		if (!element) return undefined;
		let alive = true;
		const stop = watchVisible(element, () => {
			stop();
			setAsked(true);
			fetchAvatar(accountId, person.waId).then(fresh => {
				if (!alive) return;
				setLoaded(false);
				setUrl(fresh);
			});
		});
		return () => {
			alive = false;
			stop();
		};
	}, [accountId, person.waId, url, asked]);

	// A dead link clears the url, which sends the effect above for a fresh one, once.
	const failed = () => {
		setLoaded(false);
		setUrl(null);
	};

	return (
		<>
			<span ref={sentinelRef} className="wa-sa__avatar-sentinel" aria-hidden="true" />
			{url ? (
				<button
					type="button"
					className={`wa-sa__avatar is-photo${loaded ? ' is-loaded' : ''}${dim ? ' is-dim' : ''}`}
					tabIndex={loaded ? 0 : -1}
					onMouseEnter={event => loaded && onPeek(url, event.currentTarget)}
					onMouseLeave={onUnpeek}
					onFocus={event => loaded && onPeek(url, event.currentTarget)}
					onBlur={onUnpeek}
					onClick={() => loaded && onOpen(url)}
					aria-label={`${viewLabel}: ${label}`}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={failed} />
				</button>
			) : null}
		</>
	);
}

/** saved = in the phonebook, profile = only their own WhatsApp name, number = no name at all. */
function personKind(person) {
	if (person?.kind === 'saved' || person?.kind === 'profile' || person?.kind === 'number') return person.kind;
	if (person?.saved) return 'saved';
	return String(person?.name || '').trim() ? 'profile' : 'number';
}

/** Digits of a typed phone number as a WhatsApp JID, or null when it cannot be one. */
function phoneToWaId(value) {
	const digits = String(value || '').replace(/\D/g, '').replace(/^00/, '');
	return digits.length >= 8 && digits.length <= 15 ? `${digits}@s.whatsapp.net` : null;
}

/** Mode + count from the saved account settings, for the summary chip (no network). */
export function storyAudienceSummary(account, override = null) {
	const capabilities = account?.providerCapabilities || {};
	const mode = override?.mode || capabilities['story.audienceMode'] || 'contacts';
	const waIds = override?.waIds || capabilities['story.audienceWaIds'];
	return { mode, count: Array.isArray(waIds) ? waIds.length : 0 };
}

export function storyAudienceLabel(summary, locale = 'en') {
	const ar = locale === 'ar';
	if (summary.mode === 'except') {
		return ar ? `جهات اتصالي ما عدا ${summary.count}` : `My contacts except ${summary.count}`;
	}
	if (summary.mode === 'only') {
		return ar ? `${summary.count} شخص بس` : `Only ${summary.count} ${summary.count === 1 ? 'person' : 'people'}`;
	}
	return ar ? 'كل جهات اتصالي' : 'All my contacts';
}

export function StoryAudienceDialog({ open, accountId, locale = 'en', onClose, onSaved }) {
	const ar = locale === 'ar';
	const t = COPY[ar ? 'ar' : 'en'];
	const [state, setState] = useState({ loading: true, error: '', people: [] });
	const [mode, setMode] = useState('contacts');
	const [exceptIds, setExceptIds] = useState(() => new Set());
	const [onlyIds, setOnlyIds] = useState(() => new Set());
	const [extraIds, setExtraIds] = useState(() => new Set());
	const [adding, setAdding] = useState(false);
	const [addValue, setAddValue] = useState('');
	const [peek, setPeek] = useState(null);
	const [viewer, setViewer] = useState(null);
	const peekTimer = useRef(0);
	const [search, setSearch] = useState('');
	const [book, setBook] = useState('all');
	const [filter, setFilter] = useState('all');
	const [saving, setSaving] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);
	const requestRef = useRef(0);

	useEffect(() => {
		if (!open || !accountId) return undefined;
		const request = ++requestRef.current;
		setState(current => ({ ...current, loading: true, error: '' }));
		api
			.get(`/whatsapp/accounts/${accountId}/statuses/audience`, { timeout: 30000 })
			.then(({ data }) => {
				if (request !== requestRef.current) return;
				const saved = Array.isArray(data?.waIds) ? data.waIds : [];
				setMode(data?.mode || 'contacts');
				setExceptIds(new Set(data?.mode === 'except' ? saved : []));
				setOnlyIds(new Set(data?.mode === 'only' ? saved : []));
				setExtraIds(new Set(Array.isArray(data?.extraWaIds) ? data.extraWaIds : []));
				setState({ loading: false, error: '', people: Array.isArray(data?.people) ? data.people : [] });
			})
			.catch(error => {
				if (request !== requestRef.current) return;
				setState({ loading: false, error: error?.response?.data?.message || t.loadError, people: [] });
			});
		return () => {
			requestRef.current += 1;
		};
	}, [open, accountId, reloadKey, t.loadError]);

	useEffect(() => {
		if (!open) return;
		setSearch('');
		setBook('all');
		setFilter('all');
		setAdding(false);
		setAddValue('');
		setViewer(null);
		setPeek(null);
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key !== 'Escape') return;
			// Escape closes the photo first, then the dialog.
			if (viewer) setViewer(null);
			else if (!saving) onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose, saving, viewer]);

	useEffect(() => () => clearTimeout(peekTimer.current), []);

	// Large preview beside the avatar, after a short hover so skimming the list stays quiet.
	const showPeek = (url, element) => {
		clearTimeout(peekTimer.current);
		peekTimer.current = setTimeout(() => {
			const rect = element.getBoundingClientRect();
			const size = PEEK_SIZE;
			const gap = 12;
			const fitsAfter = ar ? rect.left - gap - size >= 8 : rect.right + gap + size <= window.innerWidth - 8;
			const left = ar === fitsAfter ? rect.left - gap - size : rect.right + gap;
			const top = Math.min(Math.max(8, rect.top + rect.height / 2 - size / 2), window.innerHeight - size - 8);
			setPeek({ url, left: Math.max(8, left), top });
		}, 220);
	};

	const hidePeek = () => {
		clearTimeout(peekTimer.current);
		setPeek(null);
	};

	// Opens on the thumb right away, then swaps in the full-resolution photo when it arrives.
	const openViewer = (person, url) => {
		hidePeek();
		setViewer({ ...person, avatarUrl: url });
		fetchAvatar(accountId, person.waId, 'full').then(full => {
			if (full) setViewer(current => (current?.waId === person.waId ? { ...current, avatarUrl: full } : current));
		});
	};

	const sees = waId => (mode === 'only' ? onlyIds.has(waId) : mode === 'except' ? !exceptIds.has(waId) : true);

	const seeingCount = useMemo(() => {
		if (mode === 'only') return onlyIds.size;
		if (mode === 'except') return state.people.filter(person => !exceptIds.has(person.waId)).length;
		return state.people.length;
	}, [mode, onlyIds, exceptIds, state.people]);

	const matches = useMemo(() => {
		const term = search.trim().toLowerCase();
		const digits = search.replace(/\D/g, '');
		return state.people.filter(person => {
			if (book !== 'all' && personKind(person) !== book) return false;
			if (filter === 'seeing' && !sees(person.waId)) return false;
			if (filter === 'hidden' && sees(person.waId)) return false;
			if (!term) return true;
			if (String(person.name || '').toLowerCase().includes(term)) return true;
			if (String(person.profileName || '').toLowerCase().includes(term)) return true;
			return digits.length >= 3 && person.phone.includes(digits);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.people, search, book, filter, mode, exceptIds, onlyIds]);

	const bookCounts = useMemo(() => {
		const counts = { all: state.people.length, saved: 0, profile: 0, numbers: 0 };
		for (const person of state.people) {
			const kind = personKind(person);
			counts[kind === 'number' ? 'numbers' : kind] += 1;
		}
		return counts;
	}, [state.people]);

	const addNumber = raw => {
		const waId = phoneToWaId(raw);
		if (!waId) {
			toast.error(t.addInvalid);
			return;
		}
		const phone = waId.replace(/@.*$/, '');
		const exists = state.people.some(person => person.waId === waId);
		if (!exists) {
			setState(current => ({
				...current,
				people: [{ waId, phone, name: null, avatarUrl: null, kind: 'number', added: true }, ...current.people],
			}));
			setExtraIds(current => new Set(current).add(waId));
		}
		// Whatever the mode, the number just added should end up able to see the stories.
		if (mode === 'only') setOnlyIds(current => new Set(current).add(waId));
		else
			setExceptIds(current => {
				const next = new Set(current);
				next.delete(waId);
				return next;
			});
		setBook('all');
		setFilter('all');
		setSearch(phone);
		setAddValue('');
		setAdding(false);
		toast.success(exists ? t.addExists : t.addDone);
	};

	const toggle = waId => {
		if (mode === 'only') {
			setOnlyIds(current => {
				const next = new Set(current);
				if (next.has(waId)) next.delete(waId);
				else next.add(waId);
				return next;
			});
			return;
		}
		// Unticking someone under "My contacts" is the same as hiding them.
		if (mode === 'contacts') setMode('except');
		setExceptIds(current => {
			const next = new Set(current);
			if (next.has(waId)) next.delete(waId);
			else next.add(waId);
			return next;
		});
	};

	const setAllVisible = visible => {
		const ids = matches.map(person => person.waId);
		if (mode === 'only') {
			setOnlyIds(current => {
				const next = new Set(current);
				for (const id of ids) visible ? next.add(id) : next.delete(id);
				return next;
			});
			return;
		}
		if (mode === 'contacts' && !visible) setMode('except');
		setExceptIds(current => {
			const next = new Set(current);
			for (const id of ids) visible ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const save = async () => {
		const effectiveMode = mode === 'except' && !exceptIds.size ? 'contacts' : mode;
		const waIds = effectiveMode === 'only' ? [...onlyIds] : effectiveMode === 'except' ? [...exceptIds] : [];
		if (effectiveMode === 'only' && !waIds.length) {
			toast.error(t.pickOne);
			return;
		}
		setSaving(true);
		try {
			const { data } = await api.put(`/whatsapp/accounts/${accountId}/statuses/audience`, {
				mode: effectiveMode,
				waIds,
				// An added number someone then unticks is dropped instead of lingering as hidden.
				extraWaIds: [...extraIds].filter(sees),
			});
			toast.success(t.saved);
			onSaved?.({ mode: data?.mode || effectiveMode, waIds: data?.waIds || waIds });
			onClose?.();
		} catch (error) {
			toast.error(error?.response?.data?.message || t.saveError);
		} finally {
			setSaving(false);
		}
	};

	if (!open || typeof document === 'undefined') return null;

	const shown = matches.slice(0, LIST_LIMIT);
	const groups = [
		['saved', t.savedGroup],
		['profile', t.profileGroup],
		['number', t.numbersGroup],
	]
		.map(([kind, title]) => ({ kind, title, people: shown.filter(person => personKind(person) === kind) }))
		.filter(group => group.people.length);
	const searchWaId = phoneToWaId(search);
	const canAddSearch = Boolean(searchWaId) && !state.people.some(person => person.waId === searchWaId);

	const renderPerson = person => {
		const on = sees(person.waId);
		const label = personLabel(person);
		const kind = personKind(person);
		return (
			<li key={person.waId} className="wa-sa__row">
				<button
					type="button"
					role="checkbox"
					aria-checked={on}
					className={`wa-sa__person${on ? '' : ' is-hidden'} is-${kind}`}
					onClick={() => toggle(person.waId)}
				>
					{/* Initials always sit here; a loaded photo is laid over them as its own button. */}
					<span className="wa-sa__avatar" aria-hidden="true">
						{initials(label)}
					</span>
					<span className="wa-sa__person-meta">
						{/* bdi keeps an Arabic name on the row's start edge instead of flipping to the far side. */}
						<span className="wa-sa__person-name wa-privacy-identity">
							{/* WhatsApp marks a name the person picked for themselves with a tilde. */}
							{kind === 'profile' ? <span className="wa-sa__tilde" aria-hidden="true">~</span> : null}
							<bdi>{label}</bdi>
						</span>
						{person.name ? <span className="wa-sa__person-phone" dir="ltr">+{person.phone}</span> : null}
					</span>
					{person.added ? (
						<span className="wa-sa__badge is-added">
							<UserPlus size={12} strokeWidth={2.4} aria-hidden="true" />
							{t.addedBadge}
						</span>
					) : null}
					{!on ? (
						<span className="wa-sa__badge">
							<EyeOff size={12} strokeWidth={2.4} aria-hidden="true" />
							{t.hiddenBadge}
						</span>
					) : kind === 'number' && !person.added ? (
						<span className="wa-sa__badge is-number">{t.numberBadge}</span>
					) : null}
					<span className={`wa-sa__check${on ? ' is-on' : ''}`} aria-hidden="true">
						{on ? <Check size={13} strokeWidth={3} /> : null}
					</span>
				</button>
				<AudienceAvatar
					accountId={accountId}
					person={person}
					dim={!on}
					label={label}
					viewLabel={t.viewPhoto}
					onPeek={showPeek}
					onUnpeek={hidePeek}
					onOpen={url => openViewer(person, url)}
				/>
			</li>
		);
	};

	const viewerLabel = viewer ? personLabel(viewer) : '';

	return createPortal(
		<div className="wa-sa" role="presentation" onMouseDown={event => event.target === event.currentTarget && !saving && onClose?.()}>
			<div className="wa-sa__panel" role="dialog" aria-modal="true" aria-labelledby="wa-sa-title" dir={ar ? 'rtl' : 'ltr'}>
				<header className="wa-sa__head">
					<span className="wa-sa__head-icon" aria-hidden="true">
						<ShieldCheck size={20} strokeWidth={2.1} />
					</span>
					<div className="min-w-0 flex-1">
						<h2 id="wa-sa-title" className="wa-sa__title">{t.title}</h2>
						<p className="wa-sa__subtitle">{t.subtitle}</p>
					</div>
					<button type="button" className="wa-sa__close" onClick={onClose} disabled={saving} aria-label={t.cancel}>
						<X size={18} />
					</button>
				</header>

				<div className="wa-sa__modes" role="radiogroup" aria-label={t.title}>
					{Object.entries(t.modes).map(([id, [label, hint]]) => {
						const Icon = MODE_ICONS[id];
						const active = mode === id;
						return (
							<button
								key={id}
								type="button"
								role="radio"
								aria-checked={active}
								title={hint}
								className={`wa-sa__mode${active ? ' is-active' : ''}`}
								onClick={() => setMode(id)}
							>
								<span className="wa-sa__mode-top">
									<span className="wa-sa__mode-icon" aria-hidden="true">
										<Icon size={16} strokeWidth={2.2} />
									</span>
									<span className="wa-sa__radio" aria-hidden="true">{active ? <Check size={11} strokeWidth={3.2} /> : null}</span>
								</span>
								<span className="wa-sa__mode-label">{label}</span>
								<span className="wa-sa__mode-hint">{hint}</span>
							</button>
						);
					})}
				</div>

				<div className="wa-sa__tools">
					<div className="wa-sa__search-row">
						<label className="wa-sa__search">
							<Search size={16} strokeWidth={2.2} aria-hidden="true" />
							<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t.search} aria-label={t.search} />
							{search ? (
								<button type="button" className="wa-sa__search-clear" onClick={() => setSearch('')} aria-label={t.clear}>
									<X size={14} strokeWidth={2.4} />
								</button>
							) : null}
						</label>
						<button
							type="button"
							className={`wa-sa__add-toggle${adding ? ' is-active' : ''}`}
							onClick={() => setAdding(value => !value)}
							disabled={state.loading || Boolean(state.error)}
							aria-expanded={adding}
						>
							<UserPlus size={16} strokeWidth={2.2} aria-hidden="true" />
							<span>{t.addNumber}</span>
						</button>
					</div>
					{adding ? (
						<form
							className="wa-sa__add"
							onSubmit={event => {
								event.preventDefault();
								addNumber(addValue);
							}}
						>
							<span className="wa-sa__add-plus" aria-hidden="true">+</span>
							<input
								type="tel"
								inputMode="tel"
								dir="ltr"
								autoFocus
								value={addValue}
								onChange={event => setAddValue(event.target.value)}
								placeholder={t.addPlaceholder}
								aria-label={t.addNumber}
							/>
							<button type="submit" className="wa-sa__btn is-primary" disabled={!addValue.trim()}>
								{t.addSubmit}
							</button>
						</form>
					) : null}
					<div className="wa-sa__filters is-book" role="tablist" aria-label={t.book.all}>
						{Object.entries(t.book).map(([id, label]) => (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={book === id}
								className={`wa-sa__filter${book === id ? ' is-active' : ''}`}
								onClick={() => setBook(id)}
							>
								<span className="wa-sa__filter-label">{label}</span>
								<em>{bookCounts[id].toLocaleString(ar ? 'ar-EG' : undefined)}</em>
							</button>
						))}
					</div>
				</div>

				<div className="wa-sa__listbar">
					<div className="wa-sa__filters is-small" role="tablist">
						{Object.entries(t.filters).map(([id, label]) => (
							<button
								key={id}
								type="button"
								role="tab"
								aria-selected={filter === id}
								className={`wa-sa__filter${filter === id ? ' is-active' : ''}`}
								onClick={() => setFilter(id)}
							>
								{label}
							</button>
						))}
					</div>
					<div className="wa-sa__bulk">
						<button type="button" onClick={() => setAllVisible(true)} disabled={!matches.length}>{t.selectAll}</button>
						<button type="button" onClick={() => setAllVisible(false)} disabled={!matches.length}>{t.clear}</button>
					</div>
				</div>

				<div className="wa-sa__list" aria-busy={state.loading}>
					{state.loading ? (
						<div className="wa-sa__state"><Loader2 size={20} className="animate-spin" /></div>
					) : state.error ? (
						<div className="wa-sa__state">
							<p>{state.error}</p>
							<button type="button" className="wa-sa__btn" onClick={() => setReloadKey(key => key + 1)}>{t.retry}</button>
						</div>
					) : !shown.length ? (
						<div className="wa-sa__state">
							<p>{t.empty}</p>
							{canAddSearch ? (
								<button type="button" className="wa-sa__btn is-primary" onClick={() => addNumber(search)}>
									<UserPlus size={15} strokeWidth={2.4} aria-hidden="true" />
									{t.addSuggest(searchWaId.replace(/@.*$/, ''))}
								</button>
							) : null}
						</div>
					) : groups.length > 1 ? (
						groups.map(group => (
							<section key={group.kind}>
								<p className="wa-sa__group">{group.title(group.people.length)}</p>
								<ul>{group.people.map(renderPerson)}</ul>
							</section>
						))
					) : (
						<ul>{shown.map(renderPerson)}</ul>
					)}
					{matches.length > LIST_LIMIT ? <p className="wa-sa__more">{t.more(matches.length - LIST_LIMIT)}</p> : null}
				</div>

				<footer className="wa-sa__foot">
					<div className="wa-sa__summary">
						<Eye size={15} strokeWidth={2.2} aria-hidden="true" />
						<span>{state.loading ? '…' : t.seeing(seeingCount)}</span>
					</div>
					<button type="button" className="wa-sa__btn" onClick={onClose} disabled={saving}>{t.cancel}</button>
					<button type="button" className="wa-sa__btn is-primary" onClick={save} disabled={saving || state.loading || Boolean(state.error)}>
						{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.6} />}
						{t.save}
					</button>
				</footer>
			</div>

			{peek ? (
				<div className="wa-sa__peek" style={{ left: peek.left, top: peek.top }} aria-hidden="true">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={peek.url} alt="" referrerPolicy="no-referrer" />
				</div>
			) : null}

			{viewer ? (
				<div
					className="wa-sa__viewer"
					role="dialog"
					aria-modal="true"
					aria-label={viewerLabel}
					dir={ar ? 'rtl' : 'ltr'}
					onMouseDown={event => {
						event.stopPropagation();
						if (event.target === event.currentTarget) setViewer(null);
					}}
				>
					<div className="wa-sa__viewer-bar">
						<span className="wa-sa__viewer-who">
							<b className="wa-privacy-identity"><bdi>{viewerLabel}</bdi></b>
							{viewer.name ? <small dir="ltr">+{viewer.phone}</small> : null}
						</span>
						<button type="button" className="wa-sa__viewer-close" onClick={() => setViewer(null)} aria-label={t.cancel}>
							<X size={20} />
						</button>
					</div>
					{viewer.avatarUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							className="wa-sa__viewer-img"
							src={viewer.avatarUrl}
							alt={viewerLabel}
							referrerPolicy="no-referrer"
							onError={() => setViewer(current => (current ? { ...current, avatarUrl: null } : current))}
						/>
					) : (
						<span className="wa-sa__viewer-empty" aria-hidden="true">{initials(viewerLabel)}</span>
					)}
				</div>
			) : null}
		</div>,
		document.body,
	);
}

/**
 * Top of the Updates pane: your own story at a glance, who it reaches, and a manual
 * pull for stories posted from the phone that have not shown up yet.
 */
export function MyStoryBar({
	locale = 'en',
	avatarUrl = '',
	label = '',
	ownCount = 0,
	latestLabel = '',
	audienceSummary,
	syncing = false,
	onOpenOwn,
	onAudience,
	onSync,
}) {
	const ar = locale === 'ar';
	const hasStory = ownCount > 0;
	return (
		<section className="wa-msb" aria-label={ar ? 'حالتي' : 'My status'}>
			<button
				type="button"
				className={`wa-msb__me${hasStory ? ' has-story' : ''}`}
				onClick={hasStory ? onOpenOwn : onAudience}
				aria-label={ar ? 'حالتي' : 'My status'}
			>
				<span className="wa-msb__ring" aria-hidden="true">
					<span className="wa-msb__avatar">
						{avatarUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={avatarUrl} alt="" />
						) : (
							initials(label || 'Me')
						)}
					</span>
				</span>
				<span className="wa-msb__meta">
					<span className="wa-msb__title">{ar ? 'حالتي' : 'My status'}</span>
					<span className="wa-msb__sub">
						{hasStory
							? `${ownCount} ${ar ? 'ستوري' : ownCount === 1 ? 'story' : 'stories'}${latestLabel ? ` · ${latestLabel}` : ''}`
							: ar
								? 'مفيش ستوري في آخر 24 ساعة'
								: 'Nothing posted in the last 24 hours'}
					</span>
				</span>
			</button>

			<div className="wa-msb__actions">
				<button type="button" className="wa-msb__chip" onClick={onAudience}>
					<Eye size={15} strokeWidth={2.2} aria-hidden="true" />
					<span className="wa-msb__chip-text">
						<small>{ar ? 'مين يشوفها' : 'Who can see'}</small>
						<b>{storyAudienceLabel(audienceSummary || { mode: 'contacts', count: 0 }, locale)}</b>
					</span>
				</button>
				<button
					type="button"
					className="wa-msb__chip is-sync"
					onClick={onSync}
					disabled={syncing}
					title={ar ? 'نزّلت ستوري من الموبايل ومش ظاهرة؟ اسحبها من هنا.' : 'Posted from your phone and not showing? Pull it here.'}
				>
					{syncing ? (
						<RefreshCw size={15} strokeWidth={2.2} className="animate-spin" aria-hidden="true" />
					) : (
						<Smartphone size={15} strokeWidth={2.2} aria-hidden="true" />
					)}
					<span className="wa-msb__chip-text">
						<small>{ar ? 'من الموبايل' : 'From phone'}</small>
						<b>{syncing ? (ar ? 'بنزامن…' : 'Syncing…') : ar ? 'مزامنة الآن' : 'Sync now'}</b>
					</span>
				</button>
			</div>
		</section>
	);
}
