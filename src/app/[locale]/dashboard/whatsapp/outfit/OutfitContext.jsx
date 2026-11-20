'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import toast from 'react-hot-toast';
import { DEFAULT_BODY, FIT_TO_PANTS_FIT, SUBCATEGORIES } from './config/outfit-config.js';
import { describeColor } from './engine/color.js';
import { applyFeedback, itemHex, outfitItemList, profileWithFeedback } from './engine/stylist.js';
import { markWorn } from './engine/planner.js';
import { STORE_KEYS, useLocalStore } from './hooks/useLocalStore.js';
import { isArabic } from './outfit-ui.js';
import { putItems, useKv, useWardrobeItems } from './wardrobe/db.js';
import { renderCollage, sendToMyWhatsApp, shareImage } from './wardrobe/share.js';
import { useExplain, useItemName } from './ui/OutfitCard.jsx';

const Ctx = createContext(null);
const EMPTY_PROFILE = {};
const DEFAULT_PREFS = { colorBlind: false, onDeviceOnly: false };
const EMPTY_FEEDBACK = { pairs: {}, items: {}, colors: {}, outfits: {} };

/** Owned outfit → mannequin slots + shape hints. */
export function ownedToPreview(outfit) {
	const slots = {};
	let topSlot = 'shirt';
	let fit = 'slim';
	let shoeType;
	let pantsType;
	let topLoose = false;
	for (const piece of outfitItemList(outfit)) {
		const sub = SUBCATEGORIES[piece.subcategory] || {};
		const hex = itemHex(piece);
		const value = { hex, id: describeColor(hex)?.id };
		if (piece.category === 'top' || (piece.category === 'onepiece' && sub.slot === 'shirt')) {
			topSlot = sub.slot === 'tshirt' ? 'tshirt' : 'shirt';
			slots[topSlot] = value;
			topLoose = piece.fit === 'oversized' || piece.fit === 'relaxed';
		} else if (piece.category === 'bottom') {
			slots.pants = value;
			fit = FIT_TO_PANTS_FIT[piece.fit] || 'straight';
			if (piece.subcategory === 'cargo') fit = 'cargo';
			if (piece.subcategory === 'joggers') fit = 'jogger';
			pantsType = sub.pantsType;
		} else if (piece.category === 'outerwear' || piece.subcategory === 'suit') {
			slots.jacket = value;
			if (piece.subcategory === 'suit') {
				slots.pants = value;
				slots.shirt ||= { hex: '#F7F7F5', id: 'white' };
			}
		} else if (piece.category === 'shoes') {
			slots.shoes = value;
			shoeType = sub.shoeType;
		} else if (piece.category === 'belt') slots.belt = value;
		else if (piece.category === 'watch') slots.strap = value;
		else if (piece.category === 'socks') slots.socks = value;
	}
	if (slots.pants && !slots.socks) slots.socks = slots.pants;
	return { slots, topSlot, fit, shoeType, pantsType, topLoose, score: outfit.score, owned: true };
}

export function OutfitProvider({ locale, accountId, accountPhone, children }) {
	const t = useTranslations('outfitMatcher');
	const ar = isArabic(locale);
	const { items, loaded } = useWardrobeItems();
	const [profile, setProfile] = useLocalStore(STORE_KEYS.profile, EMPTY_PROFILE);
	const [body, setBody] = useLocalStore('wa.outfit.body.v1', DEFAULT_BODY);
	const [prefs, setPrefs] = useLocalStore(STORE_KEYS.prefs, DEFAULT_PREFS);
	const [feedback, setFeedback] = useKv('feedback', EMPTY_FEEDBACK);
	const [section, setSection] = useState('match');
	const [preview, setPreview] = useState(null);
	const explain = useExplain(locale);
	const nameOf = useItemName(locale);

	const colorBlind = Boolean(prefs?.colorBlind);
	const scoringProfile = useMemo(() => profileWithFeedback(profile || {}, feedback || {}), [profile, feedback]);

	const previewOutfit = useCallback(outfit => {
		setPreview(ownedToPreview(outfit));
		setSection('match');
		if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	const wear = useCallback(
		async outfit => {
			const updated = outfitItemList(outfit).map(piece => markWorn(piece));
			await putItems(updated);
			const toLaundry = updated.filter(piece => piece.status === 'laundry').length;
			toast.success(toLaundry ? t('laundry.wornToast', { count: toLaundry }) : t('stylist.wornToast'));
		},
		[t],
	);

	const rate = useCallback(
		(outfit, liked) => {
			setFeedback(prev => {
				const next = applyFeedback(prev || EMPTY_FEEDBACK, outfit, liked);
				next.outfits = { ...(prev?.outfits || {}), [outfit.id]: liked ? 'up' : 'down' };
				return next;
			});
			toast.success(liked ? t('stylist.likedToast') : t('stylist.dislikedToast'));
		},
		[setFeedback, t],
	);

	const collageFor = useCallback(
		outfit =>
			renderCollage(outfit, {
				nameOf,
				title: t('title'),
				lines: (outfit.why || []).slice(0, 2).map(explain).filter(Boolean),
				rtl: ar,
			}),
		[nameOf, explain, t, ar],
	);

	const captionFor = useCallback(
		outfit => {
			const pieces = outfitItemList(outfit).map(nameOf).join(' + ');
			const reason = (outfit.why || []).map(explain).find(Boolean) || '';
			return `${t('share.captionTitle')} (${outfit.score}/100)\n${pieces}\n${reason}`;
		},
		[nameOf, explain, t],
	);

	const share = useCallback(
		async outfit => {
			const blob = await collageFor(outfit);
			const result = await shareImage(blob, captionFor(outfit), t('title'));
			if (result === 'fallback') toast(t('wardrobe.shareFailed'));
		},
		[collageFor, captionFor, t],
	);

	const canSendToMe = Boolean(accountId && String(accountPhone || '').replace(/\D/g, '').length >= 7);
	const send = useCallback(
		async outfit => {
			if (!canSendToMe) {
				toast.error(t('share.noAccount'));
				return;
			}
			const pending = toast.loading(t('share.sending'));
			try {
				const blob = await collageFor(outfit);
				await sendToMyWhatsApp({ accountId, phone: accountPhone, blob, caption: captionFor(outfit) });
				toast.success(t('share.sent'), { id: pending });
			} catch {
				toast.error(t('share.sendFailed'), { id: pending });
			}
		},
		[canSendToMe, accountId, accountPhone, collageFor, captionFor, t],
	);

	const value = useMemo(
		() => ({
			locale,
			ar,
			items,
			loaded,
			profile: profile || EMPTY_PROFILE,
			setProfile,
			scoringProfile,
			body: body || DEFAULT_BODY,
			setBody,
			prefs: prefs || DEFAULT_PREFS,
			setPrefs,
			colorBlind,
			feedback: feedback || EMPTY_FEEDBACK,
			section,
			setSection,
			preview,
			setPreview,
			previewOutfit,
			wear,
			rate,
			share,
			send,
			canSendToMe,
			accountId,
			accountPhone,
			nameOf,
			explain,
			captionFor,
		}),
		[locale, ar, items, loaded, profile, setProfile, scoringProfile, body, setBody, prefs, setPrefs, colorBlind, feedback, section, preview, previewOutfit, wear, rate, share, send, canSendToMe, accountId, accountPhone, nameOf, explain, captionFor],
	);
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOutfit() {
	const value = useContext(Ctx);
	if (!value) throw new Error('useOutfit outside OutfitProvider');
	return value;
}
