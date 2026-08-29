import { extApi, getConfig, saveConfig } from './shared/api.js';
import { t } from './shared/i18n.js';

const browserApi = globalThis.browser || globalThis.chrome;
const MENU_ID = 'so7ba-translate';

async function ensureContextMenu() {
	try {
		await browserApi.contextMenus.remove(MENU_ID);
	} catch {
		/* missing is fine */
	}
	try {
		await browserApi.contextMenus.create({
			id: MENU_ID,
			title: 'Translate with So7baFit',
			contexts: ['selection'],
		});
	} catch (err) {
		console.warn('[so7ba-translator] contextMenus.create', err);
	}
}

browserApi.runtime.onInstalled.addListener(() => {
	void ensureContextMenu();
});

browserApi.runtime.onStartup?.addListener?.(() => {
	void ensureContextMenu();
});

browserApi.contextMenus.onClicked.addListener(async (info, tab) => {
	if (info.menuItemId !== MENU_ID || !tab?.id) return;
	await sendToTab(tab.id, { type: 'TRANSLATE_TEXT', text: info.selectionText || '' });
});

browserApi.commands.onCommand.addListener(async (command) => {
	if (command !== 'translate-selection') return;
	const [tab] = await browserApi.tabs.query({ active: true, currentWindow: true });
	if (tab?.id) await sendToTab(tab.id, { type: 'TRANSLATE_SELECTION' });
});

browserApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	handle(message)
		.then(sendResponse)
		.catch((err) => sendResponse({ error: err.message || String(err) }));
	return true;
});

async function sendToTab(tabId, payload) {
	try {
		await browserApi.tabs.sendMessage(tabId, payload);
	} catch {
		await browserApi.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
		await browserApi.tabs.sendMessage(tabId, payload);
	}
}

async function handle(message) {
	const cfg = await getConfig();
	switch (message?.type) {
		case 'GET_STATE':
			return { cfg, labels: labels(cfg.locale) };
		case 'LOOKUP':
			return extApi.lookup(message.payload);
		case 'SAVE_WORD':
			return extApi.saveWord(message.payload);
		case 'DELETE_WORD':
			return extApi.deleteWord(message.id);
		case 'RECENT':
			return extApi.recent();
		case 'WORDS':
			return extApi.words(message.q);
		case 'ME':
			return extApi.me();
		case 'CONNECT': {
			const session = await extApi.exchange(message.code);
			await saveConfig({
				accessToken: session.accessToken,
				refreshToken: session.refreshToken,
				user: session.user,
			});
			return { ok: true, user: session.user };
		}
		case 'DISCONNECT':
			await saveConfig({ accessToken: '', refreshToken: '', user: null });
			return { ok: true };
		case 'SAVE_SETTINGS':
			await saveConfig(message.payload);
			if (cfg.accessToken) {
				try {
					await extApi.saveSettings(message.payload);
				} catch {
					/* local still saved */
				}
			}
			return { ok: true };
		default:
			return { error: t(cfg.locale, 'error') };
	}
}

function labels(locale) {
	return {
		translate: t(locale, 'translate'),
		save: t(locale, 'save'),
		saved: t(locale, 'saved'),
		saving: t(locale, 'saving'),
		saveFailed: t(locale, 'saveFailed'),
		openWebsite: t(locale, 'openWebsite'),
		loading: t(locale, 'loading'),
		error: t(locale, 'error'),
		needLogin: t(locale, 'needLogin'),
		speak: t(locale, 'speak'),
	};
}
