'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	AlertTriangle,
	Bell,
	ExternalLink,
	Filter,
	Heart,
	KeyRound,
	Loader2,
	MessageCircle,
	Plus,
	RefreshCw,
	Search,
	ThumbsUp,
	Trash2,
	X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FaFacebook } from 'react-icons/fa';
import { apiErrorMessage, fbEngagementApi } from '@/lib/facebook-engagement/fb-engagement-api';

const OAUTH_CHANNEL = 'fb-engagement-oauth';
const POPUP_FEATURES = 'popup=yes,width=620,height=760';
const FB_WINDOW_NAME = 'so7ba-facebook-personal';
const FB_PREFS_KEY = 'wa-facebook-personal-prefs:v1';
const FB_HOME = 'https://www.facebook.com/';

/**
 * Facebook refuses to render inside third-party iframes (X-Frame-Options / CSP).
 * Personal feed, likes, and comments therefore run in a reusable named window —
 * the same real Facebook session — while this tab keeps custom filters/shortcuts.
 */

function readPrefs() {
	if (typeof window === 'undefined') return defaultPrefs();
	try {
		const raw = window.localStorage.getItem(FB_PREFS_KEY);
		if (!raw) return defaultPrefs();
		const parsed = JSON.parse(raw);
		return {
			...defaultPrefs(),
			...parsed,
			people: Array.isArray(parsed?.people) ? parsed.people : [],
			shortcuts: Array.isArray(parsed?.shortcuts) ? parsed.shortcuts : defaultPrefs().shortcuts,
		};
	} catch {
		return defaultPrefs();
	}
}

function defaultPrefs() {
	return {
		mode: 'personal', // personal | pages
		people: [],
		shortcuts: [
			{ id: 'feed', labelEn: 'News Feed', labelAr: 'الأخبار', url: 'https://www.facebook.com/' },
			{ id: 'friends', labelEn: 'Friends', labelAr: 'الأصدقاء', url: 'https://www.facebook.com/friends' },
			{ id: 'watch', labelEn: 'Watch', labelAr: 'Watch', url: 'https://www.facebook.com/watch' },
			{
				id: 'notifications',
				labelEn: 'Notifications',
				labelAr: 'الإشعارات',
				url: 'https://www.facebook.com/notifications',
			},
			{
				id: 'messages',
				labelEn: 'Messages',
				labelAr: 'الرسائل',
				url: 'https://www.facebook.com/messages',
			},
		],
	};
}

function writePrefs(prefs) {
	try {
		window.localStorage.setItem(FB_PREFS_KEY, JSON.stringify(prefs));
	} catch {
		/* ignore quota */
	}
}

function openFacebookWindow(url = FB_HOME) {
	const href = String(url || FB_HOME).trim() || FB_HOME;
	const features =
		'popup=yes,noopener=no,width=1100,height=860,left=80,top=40,menubar=no,toolbar=yes,location=yes,status=yes,resizable=yes,scrollbars=yes';
	const win = window.open(href, FB_WINDOW_NAME, features);
	if (!win) return null;
	try {
		win.focus();
	} catch {
		/* cross-origin after navigation */
	}
	return win;
}

function formatWhen(value, ar) {
	if (!value) return '';
	const time = Date.parse(String(value));
	if (!Number.isFinite(time)) return '';
	try {
		return new Intl.DateTimeFormat(ar ? 'ar' : 'en', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(time));
	} catch {
		return new Date(time).toLocaleString();
	}
}

function Avatar({ src, name }) {
	const letter = String(name || 'F')
		.trim()
		.charAt(0)
		.toUpperCase();
	return (
		<span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1877F2]/15 text-sm font-bold text-[#1877F2]">
			{src ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={src} alt="" className="size-full object-cover" />
			) : (
				letter
			)}
		</span>
	);
}

function friendSearchUrl(name) {
	const q = encodeURIComponent(String(name || '').trim());
	return `https://www.facebook.com/search/people/?q=${q}`;
}

function PagesMode({ locale, ar, copy }) {
	const [home, setHome] = useState(null);
	const [feed, setFeed] = useState([]);
	const [stories, setStories] = useState([]);
	const [storiesNote, setStoriesNote] = useState('');
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [opening, setOpening] = useState(false);
	const [tokenOpen, setTokenOpen] = useState(false);
	const [token, setToken] = useState('');
	const [connectingToken, setConnectingToken] = useState(false);
	const [panel, setPanel] = useState('feed');
	const [pageId, setPageId] = useState('');
	const [author, setAuthor] = useState('');
	const [query, setQuery] = useState('');
	const [applied, setApplied] = useState({ pageId: '', author: '', q: '' });
	const [error, setError] = useState('');

	const loadAll = useCallback(
		async ({ soft = false } = {}) => {
			if (soft) setRefreshing(true);
			else setLoading(true);
			setError('');
			try {
				const homeData = await fbEngagementApi.home();
				setHome(homeData);
				if (!homeData.connected) {
					setFeed([]);
					setStories([]);
					setStoriesNote('');
					return;
				}
				const [feedData, storiesData] = await Promise.all([
					fbEngagementApi.homeFeed({
						accountId: applied.pageId || undefined,
						author: applied.author || undefined,
						q: applied.q || undefined,
					}),
					fbEngagementApi.homeStories({ accountId: applied.pageId || undefined }),
				]);
				setFeed(Array.isArray(feedData?.items) ? feedData.items : []);
				setStories(Array.isArray(storiesData?.items) ? storiesData.items : []);
				setStoriesNote(storiesData?.note || '');
			} catch (err) {
				const message = apiErrorMessage(err, copy.loading);
				setError(message);
				if (!soft) toast.error(message);
			} finally {
				setLoading(false);
				setRefreshing(false);
			}
		},
		[applied, copy.loading],
	);

	useEffect(() => {
		void loadAll();
	}, [loadAll]);

	useEffect(() => {
		if (typeof BroadcastChannel === 'undefined') return undefined;
		const channel = new BroadcastChannel(OAUTH_CHANNEL);
		channel.onmessage = (event) => {
			if (event.data?.type === 'connected') {
				toast.success(
					ar
						? `تم الربط · ${event.data.pages || 0} صفحة`
						: `Connected · ${event.data.pages || 0} page(s)`,
				);
				void loadAll({ soft: true });
			} else if (event.data?.type === 'error') {
				toast.error(event.data.message || copy.login);
			}
		};
		return () => channel.close();
	}, [ar, copy.login, loadAll]);

	const applyFilters = useCallback(
		(next = {}) => {
			const page = next.pageId !== undefined ? next.pageId : pageId;
			const authorValue = next.author !== undefined ? next.author : author;
			const qValue = next.q !== undefined ? next.q : query;
			if (next.pageId !== undefined) setPageId(next.pageId);
			setApplied({ pageId: page, author: authorValue, q: qValue });
		},
		[author, pageId, query],
	);

	const connectWithFacebook = async () => {
		const popup = window.open('', OAUTH_CHANNEL, POPUP_FEATURES);
		setOpening(true);
		try {
			const { url } = await fbEngagementApi.oauthUrl(locale);
			if (popup && !popup.closed) {
				popup.location.href = url;
				popup.focus();
			} else {
				window.location.assign(url);
			}
		} catch (err) {
			popup?.close();
			toast.error(apiErrorMessage(err, copy.login));
		} finally {
			setOpening(false);
		}
	};

	const connectWithToken = async () => {
		const value = token.trim();
		if (!value) return;
		setConnectingToken(true);
		try {
			const connection = await fbEngagementApi.connectWithToken(value);
			toast.success(
				ar
					? `تم الربط · ${connection.accounts?.length || 0} صفحة`
					: `Connected · ${connection.accounts?.length || 0} page(s)`,
			);
			setToken('');
			setTokenOpen(false);
			await loadAll({ soft: true });
		} catch (err) {
			toast.error(apiErrorMessage(err, copy.token));
		} finally {
			setConnectingToken(false);
		}
	};

	if (loading && !home) {
		return (
			<div className="grid min-h-[40vh] place-items-center gap-2 text-sm text-slate-500">
				<Loader2 className="size-5 animate-spin text-[#1877F2]" aria-hidden />
				{copy.loading}
			</div>
		);
	}

	const connected = Boolean(home?.connected);
	const pages = home?.pages || [];

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-4 py-2 dark:border-white/10">
				{connected ? (
					<button
						type="button"
						onClick={() => void loadAll({ soft: true })}
						disabled={refreshing}
						className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
					>
						<RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
						{copy.refresh}
					</button>
				) : null}
				<button
					type="button"
					onClick={() => setTokenOpen(true)}
					className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
				>
					<KeyRound className="size-3.5" aria-hidden />
					{copy.token}
				</button>
				<button
					type="button"
					onClick={() => void connectWithFacebook()}
					disabled={opening || !home?.oauthConfigured}
					className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
				>
					{opening ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <FaFacebook className="size-3.5" aria-hidden />}
					{copy.loginPages}
				</button>
			</div>

			{connected ? (
				<div className="flex flex-wrap gap-2 border-b border-black/5 px-4 py-2 dark:border-white/10">
					{[
						{ id: 'feed', label: copy.feed },
						{ id: 'stories', label: copy.stories },
						{ id: 'people', label: copy.people },
					].map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setPanel(tab.id)}
							className={`rounded-full px-3 py-1 text-xs font-semibold ${
								panel === tab.id
									? 'bg-[#1877F2] text-white'
									: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			) : null}

			{connected && panel === 'feed' ? (
				<div className="flex flex-wrap items-center gap-2 border-b border-black/5 px-4 py-2 dark:border-white/10">
					<select
						value={pageId}
						onChange={(event) => {
							setPageId(event.target.value);
							applyFilters({ pageId: event.target.value });
						}}
						className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
					>
						<option value="">{copy.filterPage}</option>
						{pages.map((page) => (
							<option key={page.id} value={page.id}>
								{page.name}
							</option>
						))}
					</select>
					<input
						value={author}
						onChange={(event) => setAuthor(event.target.value)}
						placeholder={copy.filterAuthor}
						className="min-w-[9rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
					/>
					<input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={copy.search}
						className="min-w-[9rem] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
					/>
					<button
						type="button"
						onClick={() => applyFilters()}
						className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
					>
						{copy.apply}
					</button>
				</div>
			) : null}

			<div className="min-h-0 flex-1 overflow-y-auto nice-scroll p-4">
				{error ? (
					<div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>
				) : null}
				{!connected ? (
					<p className="text-center text-sm text-slate-500">{copy.connectPagesHint}</p>
				) : null}
				{connected && panel === 'feed' ? (
					feed.length === 0 ? (
						<p className="py-8 text-center text-sm text-slate-500">{copy.emptyFeed}</p>
					) : (
						<ul className="mx-auto flex max-w-2xl flex-col gap-3">
							{feed.map((post) => (
								<li
									key={`${post.accountId}:${post.externalId}`}
									className="overflow-hidden rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-[#111b21]"
								>
									<div className="flex items-center gap-3 px-4 py-3">
										<Avatar src={post.authorPictureUrl || post.pagePictureUrl} name={post.authorName || post.pageName} />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-semibold">{post.authorName || post.pageName}</p>
											<p className="truncate text-[11px] text-slate-500">
												{[post.pageName, formatWhen(post.publishedAt, ar)].filter(Boolean).join(' · ')}
											</p>
										</div>
										{post.permalinkUrl ? (
											<a
												href={post.permalinkUrl}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1877F2]"
											>
												<ExternalLink className="size-3" aria-hidden />
												{copy.openPost}
											</a>
										) : null}
									</div>
									{post.message ? (
										<p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-6" dir="auto">
											{post.message}
										</p>
									) : null}
									{post.imageUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={post.imageUrl} alt="" className="max-h-[28rem] w-full object-cover" />
									) : null}
									<div className="flex gap-4 border-t border-black/5 px-4 py-2 text-[11px] text-slate-500 dark:border-white/10">
										<span className="inline-flex items-center gap-1">
											<ThumbsUp className="size-3" aria-hidden />
											{post.reactionsCount || 0}
										</span>
										<span className="inline-flex items-center gap-1">
											<MessageCircle className="size-3" aria-hidden />
											{post.commentsCount || 0}
										</span>
									</div>
								</li>
							))}
						</ul>
					)
				) : null}
				{connected && panel === 'stories' ? (
					stories.length === 0 ? (
						<p className="py-8 text-center text-sm text-slate-500">{storiesNote || copy.emptyStories}</p>
					) : (
						<ul className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3">
							{stories.map((story) => (
								<li key={story.id} className="rounded-2xl border border-black/5 bg-white p-3 dark:border-white/10 dark:bg-[#111b21]">
									<p className="truncate text-xs font-semibold">{story.pageName}</p>
									<p className="text-[10px] text-slate-500">{formatWhen(story.createdAt, ar)}</p>
								</li>
							))}
						</ul>
					)
				) : null}
				{connected && panel === 'people' ? (
					<ul className="mx-auto max-w-2xl divide-y divide-slate-100 overflow-hidden rounded-2xl border border-black/5 bg-white dark:divide-slate-800 dark:border-white/10 dark:bg-[#111b21]">
						{pages.map((page) => (
							<li key={page.id} className="flex items-center gap-3 px-4 py-3">
								<Avatar src={page.pictureUrl} name={page.name} />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold">{page.name}</p>
									<p className="truncate text-xs text-slate-500">{page.category || page.externalId}</p>
								</div>
								<button
									type="button"
									onClick={() => {
										setPanel('feed');
										applyFilters({ pageId: page.id });
									}}
									className="rounded-lg bg-[#1877F2]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#1877F2]"
								>
									{copy.feed}
								</button>
							</li>
						))}
					</ul>
				) : null}
			</div>

			{tokenOpen ? (
				<div className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl dark:bg-[#111b21]">
						<h3 className="text-sm font-bold">{copy.token}</h3>
						<textarea
							value={token}
							onChange={(event) => setToken(event.target.value)}
							rows={4}
							placeholder={copy.tokenPlaceholder}
							className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:bg-slate-950"
						/>
						<div className="mt-3 flex justify-end gap-2">
							<button type="button" onClick={() => setTokenOpen(false)} className="px-3 py-2 text-xs font-semibold">
								{copy.cancel}
							</button>
							<button
								type="button"
								onClick={() => void connectWithToken()}
								disabled={connectingToken || !token.trim()}
								className="rounded-lg bg-[#1877F2] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
							>
								{copy.connectToken}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

function PersonalMode({ ar, copy }) {
	const [prefs, setPrefs] = useState(defaultPrefs);
	const [ready, setReady] = useState(false);
	const [iframeBlocked, setIframeBlocked] = useState(true);
	const [draftName, setDraftName] = useState('');
	const [draftUrl, setDraftUrl] = useState('');
	const [filterText, setFilterText] = useState('');
	const [windowOpen, setWindowOpen] = useState(false);
	const fbWindowRef = useRef(null);

	useEffect(() => {
		setPrefs(readPrefs());
		setReady(true);
	}, []);

	useEffect(() => {
		if (!ready) return;
		writePrefs(prefs);
	}, [prefs, ready]);

	useEffect(() => {
		const timer = window.setInterval(() => {
			const win = fbWindowRef.current;
			setWindowOpen(Boolean(win && !win.closed));
		}, 1200);
		return () => window.clearInterval(timer);
	}, []);

	const openFb = useCallback((url) => {
		const win = openFacebookWindow(url || FB_HOME);
		if (!win) {
			toast.error(copy.popupBlocked);
			return;
		}
		fbWindowRef.current = win;
		setWindowOpen(true);
	}, [copy.popupBlocked]);

	const filteredPeople = useMemo(() => {
		const needle = filterText.trim().toLowerCase();
		const people = prefs.people || [];
		if (!needle) return people;
		return people.filter((person) => String(person.name || '').toLowerCase().includes(needle));
	}, [filterText, prefs.people]);

	const addPerson = () => {
		const name = draftName.trim();
		if (!name) return;
		const url = draftUrl.trim() || friendSearchUrl(name);
		const id = `p_${Date.now().toString(36)}`;
		setPrefs((current) => ({
			...current,
			people: [{ id, name, url }, ...current.people],
		}));
		setDraftName('');
		setDraftUrl('');
	};

	const removePerson = (id) => {
		setPrefs((current) => ({
			...current,
			people: current.people.filter((person) => person.id !== id),
		}));
	};

	if (!ready) {
		return (
			<div className="grid min-h-[40vh] place-items-center">
				<Loader2 className="size-5 animate-spin text-[#1877F2]" aria-hidden />
			</div>
		);
	}

	return (
		<div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
			<aside className="flex min-h-0 flex-col border-b border-black/5 bg-white dark:border-white/10 dark:bg-[#111b21] lg:border-b-0 lg:border-e">
				<div className="shrink-0 space-y-3 border-b border-black/5 px-4 py-3 dark:border-white/10">
					<button
						type="button"
						onClick={() => openFb(FB_HOME)}
						className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] px-3 py-2.5 text-sm font-bold text-white"
					>
						<FaFacebook className="size-4" aria-hidden />
						{windowOpen ? copy.focusFacebook : copy.openFacebook}
					</button>
					<p className="text-[11px] leading-5 text-slate-500">{copy.personalHint}</p>
					<div className="flex flex-wrap gap-1.5">
						{(prefs.shortcuts || []).map((item) => (
							<button
								key={item.id}
								type="button"
								onClick={() => openFb(item.url)}
								className="rounded-full bg-[#1877F2]/10 px-2.5 py-1 text-[11px] font-semibold text-[#1877F2]"
							>
								{ar ? item.labelAr : item.labelEn}
							</button>
						))}
					</div>
				</div>

				<div className="shrink-0 space-y-2 border-b border-black/5 px-4 py-3 dark:border-white/10">
					<p className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
						<Filter className="size-3.5" aria-hidden />
						{copy.customFilters}
					</p>
					<input
						value={filterText}
						onChange={(event) => setFilterText(event.target.value)}
						placeholder={copy.filterPeople}
						className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
					/>
					<div className="flex gap-2">
						<input
							value={draftName}
							onChange={(event) => setDraftName(event.target.value)}
							placeholder={copy.friendName}
							className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
						/>
						<button
							type="button"
							onClick={addPerson}
							className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-2 text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
						>
							<Plus className="size-3.5" aria-hidden />
							{copy.add}
						</button>
					</div>
					<input
						value={draftUrl}
						onChange={(event) => setDraftUrl(event.target.value)}
						placeholder={copy.friendUrlOptional}
						className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
					/>
				</div>

				<ul className="min-h-0 flex-1 overflow-y-auto nice-scroll p-2">
					{filteredPeople.length === 0 ? (
						<li className="px-2 py-6 text-center text-xs text-slate-500">{copy.noPeople}</li>
					) : (
						filteredPeople.map((person) => (
							<li key={person.id} className="mb-1 flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/60">
								<button
									type="button"
									onClick={() => openFb(person.url || friendSearchUrl(person.name))}
									className="min-w-0 flex-1 text-start"
								>
									<p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{person.name}</p>
									<p className="truncate text-[10px] text-slate-500">{person.url}</p>
								</button>
								<button
									type="button"
									onClick={() => removePerson(person.id)}
									className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
									aria-label={copy.remove}
								>
									<Trash2 className="size-3.5" aria-hidden />
								</button>
							</li>
						))
					)}
				</ul>
			</aside>

			<section className="relative flex min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-[#111b21]">
					<div>
						<p className="text-sm font-bold text-slate-900 dark:text-white">{copy.personalStage}</p>
						<p className="text-[11px] text-slate-500">{copy.iframeBlocked}</p>
					</div>
					<div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
						<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
							<ThumbsUp className="size-3" aria-hidden />
							{copy.canLike}
						</span>
						<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
							<MessageCircle className="size-3" aria-hidden />
							{copy.canComment}
						</span>
						<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
							<Heart className="size-3" aria-hidden />
							{copy.canReact}
						</span>
						<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
							<Bell className="size-3" aria-hidden />
							{copy.canNotify}
						</span>
					</div>
				</div>

				{/* Attempted embed kept for clarity; Facebook blocks it — stage shows fallback + open CTA. */}
				{iframeBlocked ? (
					<div className="grid min-h-0 flex-1 place-items-center p-6">
						<div className="max-w-lg rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-[#111b21]">
							<span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#1877F2] text-white">
								<FaFacebook className="size-7" aria-hidden />
							</span>
							<h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{copy.openFacebook}</h3>
							<p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.personalBody}</p>
							<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
								<button
									type="button"
									onClick={() => openFb(FB_HOME)}
									className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-bold text-white"
								>
									<ExternalLink className="size-4" aria-hidden />
									{copy.openFacebook}
								</button>
								<button
									type="button"
									onClick={() => setIframeBlocked(false)}
									className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700"
								>
									{copy.tryIframe}
								</button>
							</div>
							<p className="mt-3 flex items-start gap-2 text-start text-[11px] leading-5 text-amber-700 dark:text-amber-200">
								<AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
								{copy.iframeBlocked}
							</p>
						</div>
					</div>
				) : (
					<div className="relative min-h-0 flex-1">
						<iframe
							title="Facebook"
							src={FB_HOME}
							className="h-full w-full border-0 bg-white"
							sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
							referrerPolicy="no-referrer"
							onLoad={() => {
								/* Most browsers leave a blank frame when Facebook refuses embedding. */
							}}
						/>
						<div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/70 px-3 py-2 text-xs text-white">
							<span>{copy.iframeLikelyBlank}</span>
							<button
								type="button"
								onClick={() => {
									setIframeBlocked(true);
									openFb(FB_HOME);
								}}
								className="rounded-lg bg-[#1877F2] px-2.5 py-1 font-semibold"
							>
								{copy.openFacebook}
							</button>
							<button
								type="button"
								onClick={() => setIframeBlocked(true)}
								className="rounded-lg bg-white/15 p-1"
								aria-label={copy.cancel}
							>
								<X className="size-3.5" aria-hidden />
							</button>
						</div>
					</div>
				)}
			</section>
		</div>
	);
}

export default function WhatsAppFacebookTab({ locale = 'en' }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const [mode, setMode] = useState('personal');

	useEffect(() => {
		const prefs = readPrefs();
		if (prefs.mode === 'pages' || prefs.mode === 'personal') setMode(prefs.mode);
	}, []);

	const setModePersist = (next) => {
		setMode(next);
		const prefs = readPrefs();
		writePrefs({ ...prefs, mode: next });
	};

	const copy = useMemo(
		() =>
			ar
				? {
						title: 'فيسبوك',
						personal: 'حسابي الشخصي',
						pages: 'صفحاتي (API)',
						openFacebook: 'فتح فيسبوك وتسجيل الدخول',
						focusFacebook: 'الرجوع لنافذة فيسبوك',
						personalHint:
							'فيسبوك الحقيقي يفتح في نافذة ثابتة من المنصة. لوج إن، فيد الأصدقاء، لايك، وتعليق — جوّه فيسبوك نفسه.',
						personalBody:
							'علشان تشوف بوستات أصحابك وتعمل لايك/كومنت زي الموبايل، افتح الحساب الشخصي من الزر. اللوحة على الشمال فلاتر وتخصيص سريع ليك.',
						personalStage: 'مساحة الحساب الشخصي',
						iframeBlocked:
							'فيسبوك بيمنع عرضه جوه iframe من أي موقع تاني (X-Frame-Options). النافذة المخصصة هي البديل السلس والرسمي.',
						iframeLikelyBlank: 'غالبًا الإطار فاضي لأن فيسبوك رافض التضمين.',
						tryIframe: 'جرّب iframe (غالبًا فاضي)',
						popupBlocked: 'المتصفح منع النافذة. اسمح بالـ popups للمنصة.',
						customFilters: 'فلاتر وتخصيص',
						filterPeople: 'فلتر الأسماء…',
						friendName: 'اسم صديق',
						friendUrlOptional: 'رابط البروفايل (اختياري)',
						add: 'إضافة',
						remove: 'حذف',
						noPeople: 'ضيف أصحابك اللي بتتابعهم كتير عشان تفتحهم بضغطة.',
						canLike: 'لايك',
						canComment: 'تعليق',
						canReact: 'ريأكشن',
						canNotify: 'إشعارات',
						loginPages: 'ربط صفحات',
						token: 'ربط بتوكن',
						refresh: 'تحديث',
						feed: 'المنشورات',
						stories: 'الستوريز',
						people: 'الصفحات',
						filterPage: 'كل الصفحات',
						filterAuthor: 'فلتر بالاسم…',
						search: 'ابحث في النص…',
						apply: 'تطبيق',
						emptyFeed: 'مفيش منشورات.',
						emptyStories: 'مفيش ستوريز.',
						connectPagesHint: 'ربط صفحات الأعمال عبر Facebook Login / توكن.',
						tokenPlaceholder: 'Page أو User access token',
						connectToken: 'ربط',
						cancel: 'إلغاء',
						openPost: 'فتح',
						loading: 'جاري التحميل…',
					}
				: {
						title: 'Facebook',
						personal: 'My personal account',
						pages: 'My Pages (API)',
						openFacebook: 'Open Facebook & sign in',
						focusFacebook: 'Focus Facebook window',
						personalHint:
							'Real Facebook opens in a fixed window from this app. Login, friends feed, like, and comment happen inside Facebook itself.',
						personalBody:
							'To see friends’ posts and like/comment normally, open your personal account. The left panel keeps your custom filters and shortcuts.',
						personalStage: 'Personal account stage',
						iframeBlocked:
							'Facebook blocks embedding in third-party iframes (X-Frame-Options). A dedicated window is the smooth, supported approach.',
						iframeLikelyBlank: 'This frame is usually blank because Facebook refuses embedding.',
						tryIframe: 'Try iframe (likely blank)',
						popupBlocked: 'Popup blocked. Allow popups for this site.',
						customFilters: 'Filters & customization',
						filterPeople: 'Filter names…',
						friendName: 'Friend name',
						friendUrlOptional: 'Profile URL (optional)',
						add: 'Add',
						remove: 'Remove',
						noPeople: 'Add friends you check often for one-click open.',
						canLike: 'Like',
						canComment: 'Comment',
						canReact: 'React',
						canNotify: 'Alerts',
						loginPages: 'Connect Pages',
						token: 'Use token',
						refresh: 'Refresh',
						feed: 'Posts',
						stories: 'Stories',
						people: 'Pages',
						filterPage: 'All pages',
						filterAuthor: 'Filter by name…',
						search: 'Search text…',
						apply: 'Apply',
						emptyFeed: 'No posts.',
						emptyStories: 'No stories.',
						connectPagesHint: 'Connect business Pages via Facebook Login / token.',
						tokenPlaceholder: 'Page or User access token',
						connectToken: 'Connect',
						cancel: 'Cancel',
						openPost: 'Open',
						loading: 'Loading…',
					},
		[ar],
	);

	return (
		<div className="wa-facebook-tab flex h-full min-h-0 flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
			<header className="shrink-0 border-b border-black/5 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#111b21]">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<span className="grid size-10 place-items-center rounded-xl bg-[#1877F2] text-white">
							<FaFacebook className="size-5" aria-hidden />
						</span>
						<div className="min-w-0">
							<h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{copy.title}</h2>
							<p className="truncate text-xs text-slate-500">
								{mode === 'personal' ? copy.personal : copy.pages}
							</p>
						</div>
					</div>
					<div className="flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">
						<button
							type="button"
							onClick={() => setModePersist('personal')}
							className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
								mode === 'personal' ? 'bg-[#1877F2] text-white' : 'text-slate-600 dark:text-slate-300'
							}`}
						>
							{copy.personal}
						</button>
						<button
							type="button"
							onClick={() => setModePersist('pages')}
							className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
								mode === 'pages' ? 'bg-[#1877F2] text-white' : 'text-slate-600 dark:text-slate-300'
							}`}
						>
							{copy.pages}
						</button>
					</div>
				</div>
			</header>

			{mode === 'personal' ? <PersonalMode ar={ar} copy={copy} /> : <PagesMode locale={locale} ar={ar} copy={copy} />}
		</div>
	);
}
