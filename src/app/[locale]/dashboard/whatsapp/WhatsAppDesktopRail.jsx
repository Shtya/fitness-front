'use client';

import {
	BarChart3,
	Bell,
	MessageCircle,
	Settings,
	Smartphone,
	Users,
	Zap,
} from 'lucide-react';

/**
 * Desktop-only left rail matching the provided WhatsApp Web HTML mock.
 * Hidden below 769px so the phone UI stays unchanged.
 *
 * Primary: Chats / Updates / Groups
 * Utility (below): Accounts / Notifications / Reports
 * Footer: Settings + profile
 * (Calls stays mobile-only.)
 */
export default function WhatsAppDesktopRail({
	activeTab,
	onSelect,
	labels = {},
	unreadCount = 0,
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
	const primaryItems = [
		{
			id: 'chats',
			label: labels.chats || (ar ? 'المحادثات' : 'Chats'),
			icon: MessageCircle,
			badge: unreadCount,
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

	const renderItem = item => {
		const Icon = item.icon;
		const active = activeTab === item.id;
		const badge =
			item.badge > 0 ? (item.badge > 99 ? '99+' : String(item.badge)) : null;
		return (
			<button
				key={item.id}
				type="button"
				className={`wa-desktop-rail__item ${active ? 'is-active' : ''}`}
				onClick={() => onSelect(item.id)}
				aria-current={active ? 'page' : undefined}
			>
				<span className="wa-desktop-rail__icon-wrap">
					<span className="wa-desktop-rail__icon">
						<Icon size={20} strokeWidth={active ? 2.4 : 2} />
					</span>
					{badge ? <span className="wa-desktop-rail__badge">{badge}</span> : null}
				</span>
				<span className="wa-desktop-rail__label">{item.label}</span>
			</button>
		);
	};

	return (
		<aside
			className="wa-desktop-rail hidden min-[769px]:flex"
			aria-label={ar ? 'تنقل واتساب' : 'WhatsApp navigation'}
		>
			<div className="wa-desktop-rail__items">
				{primaryItems.map(renderItem)}
				{utilityItems.length > 0 ? (
					<div className="wa-desktop-rail__divider" aria-hidden="true" />
				) : null}
				{utilityItems.map(renderItem)}
			</div>
			<div className="wa-desktop-rail__footer">
				{showSettings ? (
					<button
						type="button"
						className={`wa-desktop-rail__item ${activeTab === 'settings' ? 'is-active' : ''}`}
						onClick={() => (onOpenSettings ? onOpenSettings() : onSelect('settings'))}
						aria-label={labels.settings || (ar ? 'الإعدادات' : 'Settings')}
						aria-current={activeTab === 'settings' ? 'page' : undefined}
					>
						<span className="wa-desktop-rail__icon-wrap">
							<span className="wa-desktop-rail__icon">
								<Settings size={20} strokeWidth={activeTab === 'settings' ? 2.4 : 2} />
							</span>
						</span>
						<span className="wa-desktop-rail__label">
							{labels.settings || (ar ? 'إعدادات' : 'Settings')}
						</span>
					</button>
				) : null}
				<button
					type="button"
					className="wa-desktop-rail__avatar-btn"
					onClick={onOpenProfile}
					aria-label={ar ? 'الملف الشخصي' : 'Profile'}
				>
					<span className="wa-desktop-rail__avatar">
						{avatarUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={avatarUrl} alt="" />
						) : (
							<span className="wa-desktop-rail__avatar-fallback" />
						)}
						{connected ? <span className="wa-desktop-rail__online-dot" /> : null}
					</span>
					<span className="wa-desktop-rail__label">
						{ar ? 'الشخصية' : labels.profile || 'Profile'}
					</span>
				</button>
			</div>
		</aside>
	);
}
