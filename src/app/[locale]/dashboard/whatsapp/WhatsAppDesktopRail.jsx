'use client';

import {
	BarChart3,
	Forward,
	LayoutGrid,
	Mails,
	MessageCircle,
	Moon,
	PanelLeftClose,
	PanelLeftOpen,
	Radio,
	Settings,
	Smartphone,
	Sparkles,
	Sun,
	User,
	Users,
	Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaWhatsapp } from 'react-icons/fa';
import { useSidebarChrome } from '@/components/molecules/SidebarChromeContext';

/**
 * Tooltip for the footer dock. The rail scrolls (overflow: auto), which clips anything
 * drawn outside it, so one tooltip is rendered on <body> and placed beside whichever
 * [data-tip] button is hovered (after a short delay) or keyboard-focused (at once).
 * Buttons keep their aria-label, so the tooltip is visual only (aria-hidden).
 */
function useDockTooltip(rtl) {
	const [tip, setTip] = useState(null);
	const timerRef = useRef(0);

	const hide = useCallback(() => {
		window.clearTimeout(timerRef.current);
		setTip(current => (current ? { ...current, visible: false } : current));
	}, []);

	const show = useCallback(
		(element, immediate) => {
			window.clearTimeout(timerRef.current);
			const rect = element.getBoundingClientRect();
			const next = {
				text: element.dataset.tip,
				x: rtl ? rect.left - 12 : rect.right + 12,
				y: rect.top + rect.height / 2,
			};
			if (!next.text) return;
			if (immediate) {
				setTip({ ...next, visible: true });
				return;
			}
			setTip(current => ({ ...next, visible: Boolean(current?.visible) }));
			timerRef.current = window.setTimeout(() => {
				setTip(current => (current ? { ...current, visible: true } : current));
			}, 300);
		},
		[rtl],
	);

	useEffect(() => {
		if (!tip?.visible) return undefined;
		window.addEventListener('scroll', hide, true);
		window.addEventListener('resize', hide);
		return () => {
			window.removeEventListener('scroll', hide, true);
			window.removeEventListener('resize', hide);
		};
	}, [tip?.visible, hide]);

	useEffect(() => () => window.clearTimeout(timerRef.current), []);

	const target = event => {
		const element = event.target?.closest?.('[data-tip]');
		return element && event.currentTarget.contains(element) ? element : null;
	};

	const handlers = {
		onPointerOver: event => {
			if (event.pointerType === 'touch') return;
			const element = target(event);
			if (element) show(element, false);
		},
		onPointerOut: event => {
			const element = target(event);
			if (element && !element.contains(event.relatedTarget)) hide();
		},
		onPointerDown: hide,
		onFocus: event => {
			const element = target(event);
			if (element?.matches?.(':focus-visible')) show(element, true);
		},
		onBlur: hide,
		onKeyDown: event => {
			if (event.key === 'Escape') hide();
		},
	};

	const node =
		tip && typeof document !== 'undefined'
			? createPortal(
					<div
						className={`wa-dock-tip${tip.visible ? ' is-visible' : ''}${rtl ? ' is-rtl' : ''}`}
						aria-hidden="true"
						style={rtl ? { top: tip.y, right: window.innerWidth - tip.x } : { top: tip.y, left: tip.x }}
					>
						{tip.text}
					</div>,
					document.body,
				)
			: null;

	return { handlers, node };
}

/**
 * Desktop left rail — compact WhatsApp Web-style navigation.
 * Hidden below 769px so the phone UI stays unchanged.
 */
export default function WhatsAppDesktopRail({
	activeTab,
	onSelect,
	labels = {},
	unreadCount = 0,
	channelUnreadCount = 0,
	locale = 'en',
	onOpenSettings,
	onOpenProfile,
	avatarUrl = '',
	connected = false,
	showSettings = true,
	showAccounts = true,
	showReports = true,
	showBoard = true,
	showFakeChat = true,
	showAutoForward = true,
	darkMode = false,
	onToggleDarkMode,
	onSwitchLocale,
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const { focusMode, setFocusMode, hideEdgeDock } = useSidebarChrome();
	const dockTip = useDockTooltip(ar);

	const primaryItems = [
		{
			id: 'chats',
			label: labels.chats || (ar ? 'محادثات' : 'Chats'),
			icon: MessageCircle,
			badge: unreadCount,
		},
		{
			id: 'channels',
			label: labels.channels || (ar ? 'قنوات' : 'Channels'),
			icon: Radio,
			badge: channelUnreadCount,
		},
		{
			id: 'emails',
			label: labels.emails || (ar ? 'إيميلات' : 'Emails'),
			icon: Mails,
		},
		{
			id: 'statuses',
			label: labels.updates || (ar ? 'تحديثات' : 'Updates'),
			icon: Zap,
		},
		{
			id: 'groups',
			label: labels.groups || labels.communities || (ar ? 'مجموعات' : 'Groups'),
			icon: Users,
		},
	];

	const utilityItems = [
		showAccounts
			? {
					id: 'accounts',
					label: labels.accounts || (ar ? 'حسابات' : 'Accounts'),
					icon: Smartphone,
				}
			: null,
		showReports
			? {
					id: 'reports',
					label: labels.reports || (ar ? 'تقارير' : 'Reports'),
					icon: BarChart3,
				}
			: null,
		showBoard
			? {
					id: 'board',
					label: ar ? 'مهام' : 'Tasks',
					icon: LayoutGrid,
				}
			: null,
		showFakeChat
			? {
					id: 'fakeChat',
					label: labels.fakeChat || (ar ? 'شات وهمي' : 'Fake chat'),
					icon: Sparkles,
				}
			: null,
		showAutoForward
			? {
					id: 'autoForward',
					label: labels.autoForward || (ar ? 'تحويل تلقائي' : 'Auto-forward'),
					icon: Forward,
				}
			: null,
	].filter(Boolean);

	const sidebarToggleLabel = focusMode
		? ar
			? 'إظهار القائمة'
			: 'Show menu'
		: ar
			? 'إخفاء القائمة'
			: 'Hide menu';

	const itemClass = active =>
		`wa-desktop-rail__item group relative flex h-12 w-14 max-[1050px]:w-12 flex-col items-center justify-center gap-0.5 rounded-lg border-0 bg-transparent text-[10px] font-semibold transition-colors ${
			active ? 'is-active' : ''
		}`;

	const renderItem = item => {
		const Icon = item.icon;
		const active = activeTab === item.id;
		const badge =
			item.badge > 0 ? (item.badge > 99 ? '99+' : String(item.badge)) : null;
		return (
			<button
				key={item.id}
				type="button"
				className={itemClass(active)}
				onClick={() => onSelect(item.id)}
				aria-current={active ? 'page' : undefined}
				title={item.label}
			>
				<span className="wa-desktop-rail__icon-wrap">
					<span className="wa-desktop-rail__icon" aria-hidden="true">
						<Icon size={20} strokeWidth={1.75} />
					</span>
					{badge ? (
						<span className="wa-desktop-rail__badge" aria-label={`${badge} unread`}>
							{badge}
						</span>
					) : null}
				</span>
				<span className="wa-desktop-rail__label max-w-[52px] truncate text-center text-[10px] font-semibold leading-tight">
					{item.label}
				</span>
			</button>
		);
	};

	return (
		<aside
			className="wa-desktop-rail relative z-[5] hidden w-[64px] max-[1050px]:w-[58px] shrink-0 flex-col items-center min-[769px]:flex"
			aria-label={ar ? 'تنقل واتساب' : 'WhatsApp navigation'}
		>
			<div
				className="wa-desktop-rail__logo grid h-12 w-full place-items-center"
				title="WhatsApp"
				aria-hidden="true"
			>
				<FaWhatsapp size={22} />
			</div>

			<nav className="wa-desktop-rail__items flex w-full flex-col items-center gap-0.5 px-1">
				{hideEdgeDock ? (
					<button
						type="button"
						className={`wa-desktop-rail__sidebar-toggle ${itemClass(!focusMode)}`}
						onClick={() => setFocusMode(v => !v)}
						aria-label={sidebarToggleLabel}
						title={sidebarToggleLabel}
						aria-pressed={!focusMode}
					>
						<span className="wa-desktop-rail__icon-wrap relative inline-flex">
							<span className="wa-desktop-rail__icon grid place-items-center">
								{focusMode ? (
									<PanelLeftOpen size={20} strokeWidth={1.75} className="rtl:scale-x-[-1]" />
								) : (
									<PanelLeftClose size={20} strokeWidth={1.75} className="rtl:scale-x-[-1]" />
								)}
							</span>
						</span>
						<span className="wa-desktop-rail__label max-w-[52px] truncate text-center text-[10px] font-semibold leading-tight">
							{ar ? 'قائمة' : 'Menu'}
						</span>
					</button>
				) : null}
				{primaryItems.map(renderItem)}
				{utilityItems.length > 0 ? (
					<div className="wa-desktop-rail__divider my-1 h-px w-6" aria-hidden="true" />
				) : null}
				{utilityItems.map(renderItem)}
			</nav>

			<div className="wa-desktop-rail__spacer min-h-2 flex-1" aria-hidden="true" />

			<div className="wa-desktop-rail__footer wa-ui-rail-foot" {...dockTip.handlers}>
				{dockTip.node}
				{/* One matching set: theme, language and settings share the same square button. */}
				<div className="wa-rf" role="group" aria-label={ar ? 'تفضيلات' : 'Preferences'}>
					{typeof onToggleDarkMode === 'function' ? (
						<button
							type="button"
							role="switch"
							aria-checked={darkMode}
							className={`wa-rf__btn is-theme${darkMode ? ' is-dark' : ''}`}
							onClick={onToggleDarkMode}
							aria-label={labels.darkMode || (ar ? 'الوضع الداكن' : 'Dark mode')}
							// Styled tooltip (also shown on keyboard focus); the name comes from aria-label.
							data-tip={
								darkMode
									? labels.lightMode || (ar ? 'التبديل إلى الوضع الفاتح' : 'Switch to light mode')
									: labels.darkMode || (ar ? 'التبديل إلى الوضع الداكن' : 'Switch to dark mode')
							}
						>
							<Sun size={19} strokeWidth={1.9} className="wa-rf__theme-icon is-sun" aria-hidden="true" />
							<Moon size={18} strokeWidth={1.9} className="wa-rf__theme-icon is-moon" aria-hidden="true" />
						</button>
					) : null}
					{typeof onSwitchLocale === 'function' ? (
						<button
							type="button"
							className="wa-rf__btn is-locale"
							onClick={() => onSwitchLocale(ar ? 'en' : 'ar')}
							aria-label={
								ar
									? labels.switchToEnglish || 'Switch to English'
									: labels.switchToArabic || 'التبديل إلى العربية'
							}
							data-tip={ar ? labels.switchToEnglish || 'English' : labels.switchToArabic || 'العربية'}
						>
							<span className={`wa-rf__glyph${ar ? ' is-latin' : ' is-arabic'}`} aria-hidden="true">
								{ar ? 'EN' : 'ع'}
							</span>
						</button>
					) : null}
					{showSettings ? (
						<button
							type="button"
							className={`wa-rf__btn is-settings${activeTab === 'settings' ? ' is-active' : ''}`}
							onClick={() => (onOpenSettings ? onOpenSettings() : onSelect('settings'))}
							aria-label={labels.settings || (ar ? 'الإعدادات' : 'Settings')}
							aria-current={activeTab === 'settings' ? 'page' : undefined}
							data-tip={labels.settings || (ar ? 'الإعدادات' : 'Settings')}
						>
							<Settings size={19} strokeWidth={1.9} aria-hidden="true" />
						</button>
					) : null}
				</div>
				<span className="wa-ui-rail-foot__divider" aria-hidden="true" />
				<button
					type="button"
					className={`wa-desktop-rail__avatar-btn wa-ui-rail-avatar${
						activeTab === 'profile' ? ' is-active' : ''
					}${connected ? ' is-online' : ''}`}
					onClick={onOpenProfile}
					aria-label={
						connected
							? ar
								? 'الملف الشخصي، متصل'
								: 'Profile, connected'
							: ar
								? 'الملف الشخصي'
								: 'Profile'
					}
					aria-current={activeTab === 'profile' ? 'page' : undefined}
					data-tip={ar ? 'الملف الشخصي' : 'Profile'}
				>
					<span className="wa-desktop-rail__avatar wa-ui-rail-avatar__img">
						{avatarUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={avatarUrl} alt="" className="size-full object-cover" />
						) : (
							<span className="wa-desktop-rail__avatar-fallback grid size-full place-items-center">
								<User size={18} strokeWidth={1.9} aria-hidden="true" />
							</span>
						)}
					</span>
					{/* Online dot sits on the button (not inside the clipped avatar). */}
					{connected ? <span className="wa-desktop-rail__online-dot" aria-hidden="true" /> : null}
				</button>
			</div>
		</aside>
	);
}
