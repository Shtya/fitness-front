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
	UsersRound,
	X,
} from 'lucide-react';
import api from '@/utils/axios';
import './wa-story-audience.css';

const LIST_LIMIT = 2500;

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
		book: { all: 'All', saved: 'Saved', numbers: 'Numbers' },
		filters: { all: 'All', seeing: 'Can see', hidden: 'Hidden' },
		seeing: count => `${count.toLocaleString()} ${count === 1 ? 'person' : 'people'} will see your stories`,
		savedGroup: count => `${count.toLocaleString()} saved on your phone`,
		numbersGroup: count => `${count.toLocaleString()} unsaved numbers`,
		selectAll: 'Select all',
		clear: 'Clear',
		hiddenBadge: 'Hidden',
		numberBadge: 'Number',
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
		book: { all: 'الكل', saved: 'المحفوظين', numbers: 'الأرقام' },
		filters: { all: 'الكل', seeing: 'هيشوفوها', hidden: 'مخفيين' },
		seeing: count => `${count.toLocaleString('ar-EG')} شخص هيشوف الستوري بتاعتك`,
		savedGroup: count => `${count.toLocaleString('ar-EG')} محفوظين على الموبايل`,
		numbersGroup: count => `${count.toLocaleString('ar-EG')} رقم مش محفوظ`,
		selectAll: 'تحديد الكل',
		clear: 'إلغاء التحديد',
		hiddenBadge: 'مخفي',
		numberBadge: 'رقم',
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
	const clean = String(label || '').replace(/^\+/, '').trim();
	return (clean.charAt(0) || '?').toUpperCase();
}

function isSavedPerson(person) {
	if (typeof person?.saved === 'boolean') return person.saved;
	return Boolean(String(person?.name || '').trim());
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
	}, [open]);

	useEffect(() => {
		if (!open) return undefined;
		const onKey = event => {
			if (event.key === 'Escape' && !saving) onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose, saving]);

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
			if (book === 'saved' && !isSavedPerson(person)) return false;
			if (book === 'numbers' && isSavedPerson(person)) return false;
			if (filter === 'seeing' && !sees(person.waId)) return false;
			if (filter === 'hidden' && sees(person.waId)) return false;
			if (!term) return true;
			if (String(person.name || '').toLowerCase().includes(term)) return true;
			return digits.length >= 3 && person.phone.includes(digits);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.people, search, book, filter, mode, exceptIds, onlyIds]);

	const bookCounts = useMemo(() => {
		let saved = 0;
		let numbers = 0;
		for (const person of state.people) {
			if (isSavedPerson(person)) saved += 1;
			else numbers += 1;
		}
		return { saved, numbers };
	}, [state.people]);

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
	const savedShown = shown.filter(isSavedPerson);
	const numberShown = shown.filter(person => !isSavedPerson(person));

	const renderPerson = person => {
		const on = sees(person.waId);
		const label = personLabel(person);
		const saved = isSavedPerson(person);
		return (
			<li key={person.waId}>
				<button
					type="button"
					role="checkbox"
					aria-checked={on}
					className={`wa-sa__person${on ? '' : ' is-hidden'}${saved ? '' : ' is-number'}`}
					onClick={() => toggle(person.waId)}
				>
					<span className="wa-sa__avatar" aria-hidden="true">
						{person.avatarUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={person.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
						) : (
							initials(label)
						)}
					</span>
					<span className="wa-sa__person-meta">
						<span className="wa-sa__person-name wa-privacy-identity" dir="auto">{label}</span>
						{person.name ? <span className="wa-sa__person-phone" dir="ltr">+{person.phone}</span> : null}
					</span>
					{!on ? (
						<span className="wa-sa__badge">
							<EyeOff size={12} strokeWidth={2.4} aria-hidden="true" />
							{t.hiddenBadge}
						</span>
					) : saved ? null : (
						<span className="wa-sa__badge is-number">{t.numberBadge}</span>
					)}
					<span className={`wa-sa__check${on ? ' is-on' : ''}`} aria-hidden="true">
						{on ? <Check size={13} strokeWidth={3} /> : null}
					</span>
				</button>
			</li>
		);
	};

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
								className={`wa-sa__mode${active ? ' is-active' : ''}`}
								onClick={() => setMode(id)}
							>
								<span className="wa-sa__mode-icon" aria-hidden="true">
									<Icon size={18} strokeWidth={2.1} />
								</span>
								<span className="min-w-0">
									<span className="wa-sa__mode-label">{label}</span>
									<span className="wa-sa__mode-hint">{hint}</span>
								</span>
								<span className="wa-sa__radio" aria-hidden="true">{active ? <Check size={12} strokeWidth={3} /> : null}</span>
							</button>
						);
					})}
				</div>

				<div className="wa-sa__summary">
					<Eye size={15} strokeWidth={2.2} aria-hidden="true" />
					<span>{state.loading ? '…' : t.seeing(seeingCount)}</span>
				</div>

				<div className="wa-sa__tools">
					<label className="wa-sa__search">
						<Search size={15} strokeWidth={2.2} aria-hidden="true" />
						<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t.search} aria-label={t.search} />
					</label>
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
								{label}
								{id === 'saved' ? <em>{bookCounts.saved}</em> : null}
								{id === 'numbers' ? <em>{bookCounts.numbers}</em> : null}
								{id === 'all' ? <em>{state.people.length}</em> : null}
							</button>
						))}
					</div>
					<div className="wa-sa__tools-row">
						<div className="wa-sa__filters" role="tablist">
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
						<div className="wa-sa__state"><p>{t.empty}</p></div>
					) : book === 'all' && savedShown.length && numberShown.length ? (
						<>
							<p className="wa-sa__group">{t.savedGroup(savedShown.length)}</p>
							<ul>{savedShown.map(renderPerson)}</ul>
							<p className="wa-sa__group">{t.numbersGroup(numberShown.length)}</p>
							<ul>{numberShown.map(renderPerson)}</ul>
						</>
					) : (
						<ul>{shown.map(renderPerson)}</ul>
					)}
					{matches.length > LIST_LIMIT ? <p className="wa-sa__more">{t.more(matches.length - LIST_LIMIT)}</p> : null}
				</div>

				<footer className="wa-sa__foot">
					<button type="button" className="wa-sa__btn" onClick={onClose} disabled={saving}>{t.cancel}</button>
					<button type="button" className="wa-sa__btn is-primary" onClick={save} disabled={saving || state.loading || Boolean(state.error)}>
						{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.6} />}
						{t.save}
					</button>
				</footer>
			</div>
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
