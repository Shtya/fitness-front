'use client';

import {
	BarChart3,
	LayoutGrid,
	Mails,
	MessageCircle,
	PanelLeftClose,
	PanelLeftOpen,
	Radio,
	Settings,
	Smartphone,
	User,
	Users,
	Zap,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { useSidebarChrome } from '@/components/molecules/SidebarChromeContext';

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
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const { focusMode, setFocusMode, hideEdgeDock } = useSidebarChrome();

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

			<div className="wa-desktop-rail__footer flex w-full flex-col items-center gap-2.5 pb-2.5">
				{showSettings ? (
					<button
						type="button"
						className={`wa-desktop-rail__settings ${
							activeTab === 'settings' ? 'is-active' : ''
						}`}
						onClick={() => (onOpenSettings ? onOpenSettings() : onSelect('settings'))}
						aria-label={labels.settings || (ar ? 'الإعدادات' : 'Settings')}
						aria-current={activeTab === 'settings' ? 'page' : undefined}
						title={labels.settings || (ar ? 'الإعدادات' : 'Settings')}
					>
						<Settings size={18} strokeWidth={1.75} />
					</button>
				) : null}
				<button
					type="button"
					className={`wa-desktop-rail__avatar-btn relative rounded-full ${
						activeTab === 'profile' ? 'is-active' : ''
					}`}
					onClick={onOpenProfile}
					aria-label={ar ? 'الملف الشخصي' : 'Profile'}
					aria-current={activeTab === 'profile' ? 'page' : undefined}
					title={ar ? 'الملف الشخصي' : 'Profile'}
				>
					<span className="wa-desktop-rail__avatar relative grid size-8 place-items-center overflow-hidden rounded-full">
						{avatarUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={avatarUrl} alt="" className="size-full object-cover" />
						) : (
							<span className="wa-desktop-rail__avatar-fallback grid size-full place-items-center">
								<User size={15} strokeWidth={2} />
							</span>
						)}
						{connected ? (
							<span className="wa-desktop-rail__online-dot absolute end-0 bottom-0 size-2 rounded-full" />
						) : null}
					</span>
				</button>
			</div>
		</aside>
	);
}
