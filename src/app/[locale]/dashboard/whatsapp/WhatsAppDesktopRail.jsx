'use client';

import {
	BarChart3,
	Bell,
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
 * Desktop left rail — WhatsApp Web reference layout.
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
	showNotifications = true,
	showReports = true,
}) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const { focusMode, setFocusMode, hideEdgeDock } = useSidebarChrome();

	const primaryItems = [
		{
			id: 'chats',
			label: labels.chats || (ar ? 'المحادثات' : 'Chats'),
			icon: MessageCircle,
			badge: unreadCount,
		},
		{
			id: 'channels',
			label: labels.channels || (ar ? 'القنوات' : 'Channels'),
			icon: Radio,
			badge: channelUnreadCount,
		},
		{
			id: 'statuses',
			label: labels.updates || (ar ? 'التحديثات' : 'Updates'),
			icon: Zap,
		},
		{
			id: 'groups',
			label: labels.groups || labels.communities || (ar ? 'المجموعات' : 'Groups'),
			icon: Users,
		},
	];

	const utilityItems = [
		showAccounts
			? {
					id: 'accounts',
					label: labels.accounts || (ar ? 'الحسابات' : 'Accounts'),
					icon: Smartphone,
				}
			: null,
		showNotifications
			? {
					id: 'notifications',
					label: labels.notifications || (ar ? 'الإشعارات' : 'Notifications'),
					icon: Bell,
				}
			: null,
		showReports
			? {
					id: 'reports',
					label: labels.reports || (ar ? 'التقارير' : 'Reports'),
					icon: BarChart3,
				}
			: null,
	].filter(Boolean);

	const sidebarToggleLabel = focusMode
		? ar
			? 'إظهار القائمة'
			: 'Show sidebar'
		: ar
			? 'إخفاء القائمة'
			: 'Hide sidebar';

	const renderItem = item => {
		const Icon = item.icon;
		const active = activeTab === item.id;
		const badge =
			item.badge > 0 ? (item.badge > 99 ? '99+' : String(item.badge)) : null;
		return (
			<button
				key={item.id}
				type="button"
				className={`wa-desktop-rail__item group relative flex h-[70px] w-[76px] max-[1050px]:w-[62px] flex-col items-center justify-center gap-1.5 rounded-[10px] border-0 bg-transparent text-[11px] font-semibold text-[#41515a] transition-colors hover:bg-[#f0f2f5] ${
					active ? 'is-active bg-[#e7f7ef] text-[#00a884]' : ''
				}`}
				onClick={() => onSelect(item.id)}
				aria-current={active ? 'page' : undefined}
			>
				<span className="wa-desktop-rail__icon-wrap relative inline-flex items-center justify-center">
					<span className="wa-desktop-rail__icon grid place-items-center text-current">
						<Icon size={25} strokeWidth={1.7} />
					</span>
					{badge ? (
						<span className="wa-desktop-rail__badge absolute -end-1 top-[-7px] grid min-h-6 min-w-6 place-items-center rounded-[13px] border-2 border-white bg-[#25d366] px-1.5 text-[12px] font-bold leading-none text-white">
							{badge}
						</span>
					) : null}
				</span>
				<span className="wa-desktop-rail__label max-w-[72px] truncate text-center text-[11px] font-semibold leading-[14px]">
					{item.label}
				</span>
			</button>
		);
	};

	return (
		<aside
			className="wa-desktop-rail relative z-[5] hidden w-[84px] max-[1050px]:w-[70px] shrink-0 flex-col items-center border-e border-[#e5e9eb] bg-white min-[769px]:flex"
			aria-label={ar ? 'تنقل واتساب' : 'WhatsApp navigation'}
		>
			<div
				className="wa-desktop-rail__logo grid h-[74px] w-full place-items-center text-[#00a884]"
				title="WhatsApp"
				aria-hidden="true"
			>
				<FaWhatsapp size={30} />
			</div>

			<nav className="wa-desktop-rail__items flex w-full flex-col items-center gap-1">
				{hideEdgeDock ? (
					<button
						type="button"
						className={`wa-desktop-rail__item wa-desktop-rail__sidebar-toggle group relative flex h-[70px] w-[76px] max-[1050px]:w-[62px] flex-col items-center justify-center gap-1.5 rounded-[10px] border-0 bg-transparent text-[11px] font-semibold text-[#41515a] transition-colors hover:bg-[#f0f2f5] ${
							focusMode ? '' : 'is-active bg-[#e7f7ef] text-[#00a884]'
						}`}
						onClick={() => setFocusMode(v => !v)}
						aria-label={sidebarToggleLabel}
						title={sidebarToggleLabel}
						aria-pressed={!focusMode}
					>
						<span className="wa-desktop-rail__icon-wrap relative inline-flex">
							<span className="wa-desktop-rail__icon grid place-items-center">
								{focusMode ? (
									<PanelLeftOpen size={25} strokeWidth={1.7} className="rtl:scale-x-[-1]" />
								) : (
									<PanelLeftClose size={25} strokeWidth={1.7} className="rtl:scale-x-[-1]" />
								)}
							</span>
						</span>
						<span className="wa-desktop-rail__label max-w-[72px] truncate text-center text-[11px] font-semibold leading-[14px]">
							{ar ? 'القائمة' : 'Menu'}
						</span>
					</button>
				) : null}
				{primaryItems.map(renderItem)}
				{utilityItems.length > 0 ? (
					<div className="wa-desktop-rail__divider my-1 h-px w-7 bg-[#e4e7ec]" aria-hidden="true" />
				) : null}
				{utilityItems.map(renderItem)}
			</nav>

			<div className="wa-desktop-rail__spacer min-h-4 flex-1" aria-hidden="true" />

			<div className="wa-desktop-rail__footer flex w-full flex-col items-center gap-4 pb-3.5">
				{showSettings ? (
					<button
						type="button"
						className={`grid size-6 place-items-center border-0 bg-transparent p-0 text-[#17232a] transition-colors hover:text-[#00a884] ${
							activeTab === 'settings' ? 'text-[#00a884]' : ''
						}`}
						onClick={() => (onOpenSettings ? onOpenSettings() : onSelect('settings'))}
						aria-label={labels.settings || (ar ? 'الإعدادات' : 'Settings')}
						aria-current={activeTab === 'settings' ? 'page' : undefined}
						title={labels.settings || (ar ? 'الإعدادات' : 'Settings')}
					>
						<Settings size={21} strokeWidth={1.7} />
					</button>
				) : null}
				<button
					type="button"
					className={`wa-desktop-rail__avatar-btn relative ${
						activeTab === 'profile' ? 'ring-2 ring-[#00a884] ring-offset-2' : ''
					}`}
					onClick={onOpenProfile}
					aria-label={ar ? 'الملف الشخصي' : 'Profile'}
					aria-current={activeTab === 'profile' ? 'page' : undefined}
				>
					<span className="wa-desktop-rail__avatar relative grid size-[38px] place-items-center overflow-hidden rounded-full border border-[#ddd] bg-[#f0f2f5]">
						{avatarUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={avatarUrl} alt="" className="size-full object-cover" />
						) : (
							<span className="wa-desktop-rail__avatar-fallback grid size-full place-items-center text-[#667781]">
								<User size={18} strokeWidth={2} />
							</span>
						)}
						{connected ? (
							<span className="wa-desktop-rail__online-dot absolute end-0 bottom-0 size-[9px] rounded-full border-2 border-white bg-[#25d366]" />
						) : null}
					</span>
				</button>
			</div>
		</aside>
	);
}
