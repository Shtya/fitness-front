'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, CalendarRange, Settings2, ShieldCheck, Shirt, Sparkles, Wand2 } from 'lucide-react';
import { OutfitProvider, useOutfit } from './OutfitContext.jsx';
import MatchStudio from './sections/MatchStudio.jsx';
import Closet from './sections/Closet.jsx';
import Stylist from './sections/Stylist.jsx';
import Plan from './sections/Plan.jsx';
import './outfit.css';

const PHONE_QUERY = '(max-width: 767px)';
function usePhone() {
	return useSyncExternalStore(
		listener => {
			const mq = window.matchMedia(PHONE_QUERY);
			mq.addEventListener('change', listener);
			return () => mq.removeEventListener('change', listener);
		},
		() => window.matchMedia(PHONE_QUERY).matches,
		() => false,
	);
}

const SECTIONS = [
	{ id: 'match', icon: Sparkles },
	{ id: 'closet', icon: Shirt },
	{ id: 'stylist', icon: Wand2 },
	{ id: 'plan', icon: CalendarRange },
];

export default function WhatsAppOutfitTab({ locale = 'en', onExit, accountId, accountPhone }) {
	return (
		<OutfitProvider locale={locale} accountId={accountId} accountPhone={accountPhone}>
			<OutfitShell onExit={onExit} />
		</OutfitProvider>
	);
}

function OutfitShell({ onExit }) {
	const t = useTranslations('outfitMatcher');
	const { ar, section, setSection, items, prefs, setPrefs } = useOutfit();
	const phone = usePhone();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const menuRef = useRef(null);
	const laundry = items.filter(i => i.status === 'laundry').length;

	useEffect(() => {
		if (!settingsOpen) return undefined;
		const close = event => {
			if (!menuRef.current?.contains(event.target)) setSettingsOpen(false);
		};
		const esc = event => event.key === 'Escape' && setSettingsOpen(false);
		document.addEventListener('pointerdown', close);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', close);
			document.removeEventListener('keydown', esc);
		};
	}, [settingsOpen]);

	const nav = (
		<nav className={phone ? 'wa-of-bottomnav' : 'wa-of-topnav'} aria-label={t('title')}>
			{SECTIONS.map(({ id, icon: Icon }) => (
				<button key={id} type="button" className="wa-of-navbtn" aria-current={section === id ? 'page' : undefined} data-active={section === id || undefined} onClick={() => setSection(id)}>
					<span className="wa-of-navicon">
						<Icon size={phone ? 22 : 17} aria-hidden="true" />
						{id === 'plan' && laundry ? <span className="wa-of-dot" aria-hidden="true" /> : null}
					</span>
					<span>{t(`nav.${id}`)}</span>
				</button>
			))}
		</nav>
	);

	return (
		<div className="wa-of" dir={ar ? 'rtl' : 'ltr'} data-phone={phone || undefined}>
			<header className="wa-of-header">
				{phone && onExit ? (
					<button type="button" onClick={onExit} aria-label={t('back')} className="wa-of-icon-btn">
						<ArrowRight size={22} className={ar ? '' : 'wa-of-flip'} aria-hidden="true" />
					</button>
				) : null}
				<div className="wa-of-header-title">
					<h1>{t('title')}</h1>
					<p className="wa-of-muted wa-of-hide-sm">{t(`nav.${section}Hint`)}</p>
				</div>
				{!phone ? nav : null}
				<div className="wa-of-menu-wrap" ref={menuRef}>
					<button type="button" className="wa-of-icon-btn" aria-haspopup="true" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(v => !v)} aria-label={t('settings.title')} title={t('settings.title')}>
						<Settings2 size={20} aria-hidden="true" />
					</button>
					{settingsOpen ? (
						<div className="wa-of-menu wa-of-menu-wide" role="dialog" aria-label={t('settings.title')}>
							<label className="wa-of-toggle">
								<input type="checkbox" checked={Boolean(prefs.colorBlind)} onChange={event => setPrefs(prev => ({ ...(prev || {}), colorBlind: event.target.checked }))} />
								<span>
									<span className="wa-of-toggle-title">{t('colorBlind')}</span>
									<span className="wa-of-muted">{t('colorBlindHint')}</span>
								</span>
							</label>
							<label className="wa-of-toggle">
								<input type="checkbox" checked={Boolean(prefs.onDeviceOnly)} onChange={event => setPrefs(prev => ({ ...(prev || {}), onDeviceOnly: event.target.checked }))} />
								<span>
									<span className="wa-of-toggle-title">{t('add.onDevice')}</span>
									<span className="wa-of-muted">{t('settings.onDeviceHint')}</span>
								</span>
							</label>
							<p className="wa-of-privacy">
								<ShieldCheck size={16} aria-hidden="true" />
								<span>{t('privacyNote')}</span>
							</p>
						</div>
					) : null}
				</div>
			</header>

			<main className="wa-of-main" data-section={section}>
				{section === 'match' ? <MatchStudio /> : null}
				{section === 'closet' ? <Closet /> : null}
				{section === 'stylist' ? <Stylist /> : null}
				{section === 'plan' ? <Plan /> : null}
			</main>

			{phone ? nav : null}
		</div>
	);
}
