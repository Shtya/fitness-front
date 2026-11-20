'use client';

/**
 * Sharing an outfit: a compact collage image (drawn locally from your item photos), the Web
 * Share API with a wa.me fallback, and "send to my WhatsApp" through the dashboard's own
 * WhatsApp account (upload media → open your own chat → send the image with a caption).
 */
import api from '@/utils/axios';
import { itemHex, outfitItemList } from '../engine/stylist.js';
import { getImage } from './db.js';
import { loadImage } from './photo.js';

function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

/** 1080×1350 collage: up to 4 piece photos (or colour tiles), names, score and 1-line reasons. */
export async function renderCollage(outfit, { nameOf, title, lines = [], rtl = false }) {
	const W = 1080;
	const H = 1350;
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#F6F5F2';
	ctx.fillRect(0, 0, W, H);
	const pieces = outfitItemList(outfit).filter(p => ['outerwear', 'onepiece', 'top', 'bottom', 'shoes'].includes(p.category)).slice(0, 4);
	const cols = 2;
	const gap = 24;
	const cell = (W - gap * 3) / cols;
	for (let i = 0; i < pieces.length; i += 1) {
		const piece = pieces[i];
		const x = gap + (i % cols) * (cell + gap);
		const y = gap + Math.floor(i / cols) * (cell + gap);
		ctx.save();
		roundRect(ctx, x, y, cell, cell, 28);
		ctx.clip();
		ctx.fillStyle = itemHex(piece) || '#ddd';
		ctx.fillRect(x, y, cell, cell);
		const blob = await getImage(piece.id, 'medium').catch(() => null);
		if (blob) {
			const img = await loadImage(blob).catch(() => null);
			if (img) {
				const s = Math.max(cell / img.width, cell / img.height);
				ctx.drawImage(img, x + (cell - img.width * s) / 2, y + (cell - img.height * s) / 2, img.width * s, img.height * s);
			}
		}
		ctx.restore();
		ctx.fillStyle = 'rgba(17,27,33,0.72)';
		roundRect(ctx, x + 16, y + cell - 70, cell - 32, 54, 18);
		ctx.fill();
		ctx.fillStyle = '#fff';
		ctx.font = '600 30px system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif';
		ctx.textAlign = 'center';
		ctx.direction = rtl ? 'rtl' : 'ltr';
		ctx.fillText(nameOf(piece).slice(0, 34), x + cell / 2, y + cell - 33);
	}
	const textTop = gap * 3 + cell * 2 + 10;
	ctx.textAlign = rtl ? 'right' : 'left';
	ctx.direction = rtl ? 'rtl' : 'ltr';
	const tx = rtl ? W - 48 : 48;
	ctx.fillStyle = '#111B21';
	ctx.font = '800 44px system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif';
	ctx.fillText(`${title}  ·  ${outfit.score}/100`, tx, textTop + 20);
	ctx.font = '400 30px system-ui, -apple-system, "Segoe UI", Tahoma, sans-serif';
	ctx.fillStyle = '#3B4A54';
	lines.slice(0, 2).forEach((line, i) => ctx.fillText(line.slice(0, 70), tx, textTop + 80 + i * 44));
	return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function download(blob, name = 'outfit.png') {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Web Share (with the image) → fallback: save the image and open WhatsApp with the text. */
export async function shareImage(blob, text, title) {
	const file = blob ? new File([blob], 'outfit.png', { type: 'image/png' }) : null;
	try {
		if (file && navigator.canShare?.({ files: [file] })) {
			await navigator.share({ files: [file], text, title });
			return 'shared';
		}
	} catch (error) {
		if (error?.name === 'AbortError') return 'cancelled';
	}
	if (blob) download(blob);
	window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
	return 'fallback';
}

/** Send the collage to your own WhatsApp chat via the connected dashboard account. */
export async function sendToMyWhatsApp({ accountId, phone, blob, caption }) {
	const digits = String(phone || '').replace(/\D/g, '');
	if (!accountId || digits.length < 7) throw new Error('no-account');
	const form = new FormData();
	form.append('file', new File([blob], 'outfit.png', { type: 'image/png' }));
	form.append('fileName', 'outfit.png');
	const { data: uploaded } = await api.post(`/whatsapp/accounts/${accountId}/media`, form, { timeout: 120_000 });
	const { data: chat } = await api.post(`/whatsapp/accounts/${accountId}/conversations/open`, { chatId: digits, title: null });
	if (!chat?.id || !uploaded?.fileId) throw new Error('send-failed');
	await api.post(`/whatsapp/conversations/${chat.id}/messages`, {
		type: 'image',
		fileId: uploaded.fileId,
		fileName: 'outfit.png',
		caption: caption.slice(0, 900),
		clientMessageId: `outfit:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
	});
	return chat.id;
}

/** Schedule a text reminder of tomorrow's planned outfit in your own chat (existing scheduler). */
export async function scheduleTomorrow({ accountId, phone, text, at }) {
	const digits = String(phone || '').replace(/\D/g, '');
	if (!accountId || digits.length < 7) throw new Error('no-account');
	const { data: chat } = await api.post(`/whatsapp/accounts/${accountId}/conversations/open`, { chatId: digits, title: null });
	if (!chat?.id) throw new Error('send-failed');
	await api.post(`/whatsapp/accounts/${accountId}/message-schedules`, {
		text: text.slice(0, 1500),
		conversationIds: [chat.id],
		scheduleKind: 'once',
		scheduledAt: at.toISOString(),
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo',
		clientMessageId: `outfit-plan:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
	});
}
