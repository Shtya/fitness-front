'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import {
	Menu,
	X,
	BarChart2,
	ChefHat,
	Bell,
	UserCircle,
	LogOut,
	Dumbbell,
	MessageCircle,
	CalendarDays,
	UtensilsCrossed,
	Mail,
	Globe,
	ClipboardList,
	Settings,
	Calculator,
} from 'lucide-react';

const COPY = {
	en: {
		workouts: 'Workouts',
		chat: 'Chat',
		workspace: 'Workspace',
		nutrition: 'Nutrition',
		notifications: 'Inbox',
		settings: 'Settings',
		calculator: 'Calculator',
		profile: 'Profile',
		stats: 'Stats',
		report: 'Report',
		recipes: 'Recipes',
		reminders: 'Reminders',
		openMenu: 'Open menu',
		closeMenu: 'Close menu',
		logout: 'Log out',
	},
	ar: {
		workouts: 'تماريني',
		chat: 'المحادثات',
		workspace: 'المساحة',
		nutrition: 'التغذية',
		notifications: 'التنبيهات',
		settings: 'الإعدادات',
		calculator: 'الحاسبة',
		profile: 'حسابي',
		stats: 'إحصائياتي',
		report: 'التقرير',
		recipes: 'الوصفات',
		reminders: 'التذكيرات',
		openMenu: 'فتح القائمة',
		closeMenu: 'إغلاق القائمة',
		logout: 'خروج',
	},
};

const BAR_TABS = [
	{ key: 'workouts', href: '/dashboard/my/workouts', icon: Dumbbell, label: 'workouts' },
	{ key: 'chat', href: '/dashboard/chat', icon: MessageCircle, label: 'chat' },
	{ key: 'workspace', href: '/workspace', icon: CalendarDays, label: 'workspace' },
	{ key: 'nutrition', href: '/dashboard/my/nutrition', icon: UtensilsCrossed, label: 'nutrition' },
];

const RADIAL = [
	{ key: 'notifications', href: '/dashboard/notifications', icon: Mail, label: 'notifications' },
	{ key: 'settings', href: '/dashboard/my/profile', icon: Settings, label: 'settings' },
	{ key: 'calculator', href: '/dashboard/calculator', icon: Calculator, label: 'calculator' },
	{ key: 'profile', href: '/dashboard/my/profile', icon: UserCircle, label: 'profile' },
	{ key: 'stats', href: '/dashboard/my/stats', icon: BarChart2, label: 'stats' },
	{ key: 'report', href: '/dashboard/my/report', icon: ClipboardList, label: 'report' },
	{ key: 'recipes', href: '/dashboard/my/recipes', icon: ChefHat, label: 'recipes' },
	{ key: 'reminders', href: '/dashboard/reminders', icon: Bell, label: 'reminders' },
];

const RADIAL_R = 136;
const LIFT = 150;

function stripLocale(pathname) {
	return pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
}

function activeKey(path) {
	if (path.startsWith('/dashboard/my/workouts')) return 'workouts';
	if (path.startsWith('/dashboard/chat')) return 'chat';
	if (path.startsWith('/workspace')) return 'workspace';
	if (path.startsWith('/dashboard/my/nutrition')) return 'nutrition';
	return '';
}

export default function ClientFloatingBar({ user }) {
	const locale = useLocale();
	const copy = COPY[locale] || COPY.en;
	const isRTL = locale === 'ar';
	const fullPath = usePathname() || '/';
	const pathname = stripLocale(fullPath);
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [threadOpen, setThreadOpen] = useState(false);
	const current = activeKey(pathname);
	const tabs = isRTL ? BAR_TABS : [...BAR_TABS].reverse();

	const items = useMemo(
		() => RADIAL.map((item, i) => {
			const angle = ((-90 + i * (360 / RADIAL.length)) * Math.PI) / 180;
			return {
				...item,
				x: Math.cos(angle) * RADIAL_R,
				y: Math.sin(angle) * RADIAL_R,
			};
		}),
		[],
	);

	useEffect(() => {
		const root = document.documentElement;
		const sync = () => setThreadOpen(root.dataset.chatThread === '1');
		sync();
		const obs = new MutationObserver(sync);
		obs.observe(root, { attributes: true, attributeFilter: ['data-chat-thread'] });
		return () => obs.disconnect();
	}, []);

	const go = href => {
		setOpen(false);
		const prefix = `/${locale}`;
		router.push(`${prefix}${href}`);
	};

	const logout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			localStorage.removeItem('user');
			localStorage.removeItem('accessToken');
			localStorage.removeItem('refreshToken');
		} catch {}
		router.push(`/${locale}/auth`);
	};

	const switchLang = () => {
		const next = locale === 'ar' ? 'en' : 'ar';
		document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
		document.documentElement.lang = next;
		document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
		const segs = fullPath.split('/').filter(Boolean);
		if (segs[0] === 'en' || segs[0] === 'ar') segs[0] = next;
		else segs.unshift(next);
		router.push(`/${segs.join('/')}`);
		setOpen(false);
	};

	const name = user?.name || copy.profile;
	const initials = String(name).trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'U';

	if (threadOpen) return null;

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-0 z-[140000]" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
			<AnimatePresence>
				{open && (
					<motion.button
						type="button"
						aria-label={copy.closeMenu}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setOpen(false)}
						className="pointer-events-auto fixed inset-0 bg-[rgba(232,237,245,0.72)] backdrop-blur-md"
					/>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: 28, scale: 0.92 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 18, scale: 0.94 }}
						transition={{ type: 'spring', stiffness: 280, damping: 24 }}
						className="pointer-events-auto absolute inset-x-0 mx-auto w-[min(92vw,380px)] rounded-[26px] border border-white/80 bg-[#eef2f9] px-5 pb-4 pt-5 text-center shadow-[6px_8px_18px_rgba(100,116,139,0.35)]"
						style={{ bottom: LIFT + RADIAL_R + 96 }}
					>
						<div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-[var(--color-primary-500)] text-sm font-black text-white shadow-[4px_6px_12px_color-mix(in_srgb,var(--color-primary-700)_45%,transparent)]">
							{initials}
						</div>
						<p className="truncate text-sm font-black text-slate-800">{name}</p>
						{user?.email ? <p className="truncate text-[11px] text-slate-500">{user.email}</p> : null}
						<div className="mt-3 flex items-center justify-center gap-2">
							<button type="button" onClick={switchLang} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white bg-white px-3 text-xs font-bold text-slate-700 shadow-sm">
								<Globe size={14} />
								{locale === 'ar' ? 'EN' : 'عربي'}
							</button>
							<button type="button" onClick={logout} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-rose-500 px-3 text-xs font-bold text-white shadow-sm">
								<LogOut size={14} />
								{copy.logout}
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className="pointer-events-none relative mx-auto h-[60px] w-[min(calc(100vw-20px),350px)]">
				<motion.div
					animate={open ? { opacity: 0, scale: 0.86, y: 16 } : { opacity: 1, scale: 1, y: 0 }}
					transition={{ duration: 0.22 }}
					className="pointer-events-auto flex h-[60px] items-center rounded-full border border-white/90 bg-[#eef2f9] px-3.5 shadow-[7px_9px_16px_rgba(100,116,139,0.42)]"
					style={{ borderBottomColor: 'rgba(100,116,139,0.22)' }}
				>
					<div className="flex flex-1 items-center justify-evenly">
						{tabs.slice(0, 2).map(tab => (
							<BarButton key={tab.key} tab={tab} label={copy[tab.label]} active={current === tab.key && !open} onPress={() => go(tab.href)} />
						))}
					</div>
					<div className="w-[82px] shrink-0" />
					<div className="flex flex-1 items-center justify-evenly">
						{tabs.slice(2, 4).map(tab => (
							<BarButton key={tab.key} tab={tab} label={copy[tab.label]} active={current === tab.key && !open} onPress={() => go(tab.href)} />
						))}
					</div>
				</motion.div>

				<div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2">
					<motion.div animate={{ y: open ? -LIFT : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 22 }} className="relative grid h-[58px] w-[58px] place-items-center">
						{items.map((item, i) => {
							const Icon = item.icon;
							return (
								<motion.button
									key={item.key}
									type="button"
									aria-label={copy[item.label]}
									onClick={() => go(item.href)}
									initial={false}
									animate={open ? { x: item.x, y: item.y, opacity: 1, scale: 1 } : { x: 0, y: 0, opacity: 0, scale: 0.4 }}
									transition={{ type: 'spring', stiffness: 320, damping: 22, delay: open ? i * 0.03 : 0 }}
									className="pointer-events-auto absolute grid h-12 w-12 place-items-center rounded-full border border-white/80 text-white shadow-[3px_4px_10px_rgba(15,23,42,0.28)]"
									style={{ background: 'var(--color-primary-500)', pointerEvents: open ? 'auto' : 'none' }}
								>
									<Icon size={18} strokeWidth={2.2} />
									<span className="absolute top-full mt-1 whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold text-slate-700 shadow-sm">
										{copy[item.label]}
									</span>
								</motion.button>
							);
						})}
						<button
							type="button"
							onClick={() => setOpen(v => !v)}
							aria-expanded={open}
							aria-label={open ? copy.closeMenu : copy.openMenu}
							className="pointer-events-auto relative z-[3] grid h-[58px] w-[58px] place-items-center rounded-full text-white shadow-[5px_7px_14px_color-mix(in_srgb,var(--color-primary-700)_50%,transparent)]"
							style={{ background: 'var(--color-primary-500)' }}
						>
							<motion.span animate={{ rotate: open ? 135 : 0, scale: open ? 0.2 : 1, opacity: open ? 0 : 1 }} className="absolute">
								<Menu size={20} strokeWidth={2.4} />
							</motion.span>
							<motion.span animate={{ rotate: open ? 0 : -135, scale: open ? 1 : 0.2, opacity: open ? 1 : 0 }} className="absolute">
								<X size={20} strokeWidth={2.6} />
							</motion.span>
						</button>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

function BarButton({ tab, label, active, onPress }) {
	const Icon = tab.icon;
	return (
		<button
			type="button"
			onClick={onPress}
			aria-label={label}
			aria-current={active ? 'page' : undefined}
			className="grid h-11 w-11 place-items-center"
		>
			<span
				className="grid h-[42px] w-[42px] place-items-center rounded-full border shadow-[4px_5px_10px_rgba(100,116,139,0.35)] transition-transform"
				style={{
					background: active ? 'var(--color-primary-500)' : '#eef2f9',
					color: active ? '#fff' : 'var(--color-primary-400)',
					transform: active ? 'translateY(-6px)' : undefined,
					borderColor: active ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.9)',
				}}
			>
				<Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
			</span>
		</button>
	);
}
