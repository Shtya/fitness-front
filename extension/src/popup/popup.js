import { t } from '../shared/i18n.js';

const browserApi = globalThis.browser || globalThis.chrome;
const app = document.getElementById('app');
let searchTimer = null;

init();

async function init() {
	const state = await browserApi.runtime.sendMessage({ type: 'GET_STATE' });
	render(state);
}

function render(state) {
	const locale = state.cfg.locale || 'en';
	document.documentElement.lang = locale;
	document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
	const user = state.cfg.user;
	app.innerHTML = `
		<div class="header">
			<div class="logo">S</div>
			<div>
				<h1>So7baFit</h1>
				<p class="sub">${user ? t(locale, 'connected') : t(locale, 'notConnected')}</p>
			</div>
		</div>
		<div class="card">
			${
				user
					? `<p><b>${escapeHtml(user.name || user.email || '')}</b></p><p class="sub">${escapeHtml(user.email || '')}</p>
				<button class="btn" id="out">${t(locale, 'signOut')}</button>`
					: `
				<label>${t(locale, 'pairingCode')}</label>
				<input id="code" maxlength="12" placeholder="ABCD2345" autocomplete="off" />
				<div style="height:8px"></div>
				<button class="btn primary" id="connect">${t(locale, 'connect')}</button>
				<p class="error" id="err"></p>`
			}
		</div>
		<div class="card">
			<div class="row">
				<div>
					<label>${t(locale, 'source')}</label>
					<select id="source">
						<option value="auto">${t(locale, 'auto')}</option>
						<option value="en">${t(locale, 'english')}</option>
						<option value="ar">${t(locale, 'arabic')}</option>
					</select>
				</div>
				<div>
					<label>${t(locale, 'target')}</label>
					<select id="target">
						<option value="ar">${t(locale, 'arabic')}</option>
						<option value="en">${t(locale, 'english')}</option>
					</select>
				</div>
			</div>
			<label class="toggle"><span>${t(locale, 'uiLanguage')}</span>
				<select id="locale" style="width:120px"><option value="en">EN</option><option value="ar">AR</option></select>
			</label>
			<label class="toggle"><span>${t(locale, 'doubleClick')}</span><input id="dbl" type="checkbox" /></label>
			<label class="toggle"><span>${t(locale, 'selectionChip')}</span><input id="sel" type="checkbox" /></label>
		</div>
		<div class="card" id="lists">
			${
				user
					? `<input id="search" placeholder="${escapeHtml(t(locale, 'search'))}" />
				<div id="list-body"><p class="empty">${t(locale, 'empty')}</p></div>`
					: `<p class="empty">${t(locale, 'needLogin')}</p>`
			}
		</div>
	`;
	app.querySelector('#source').value = state.cfg.sourceLang || 'auto';
	app.querySelector('#target').value = state.cfg.targetLang || 'ar';
	app.querySelector('#locale').value = locale;
	app.querySelector('#dbl').checked = state.cfg.doubleClickEnabled !== false;
	app.querySelector('#sel').checked = state.cfg.selectionEnabled !== false;

	app.querySelector('#connect')?.addEventListener('click', async () => {
		const code = app.querySelector('#code').value.trim();
		const err = app.querySelector('#err');
		try {
			const res = await browserApi.runtime.sendMessage({ type: 'CONNECT', code });
			if (res?.error) throw new Error(res.error);
			init();
		} catch (e) {
			err.textContent = e.message || t(locale, 'error');
		}
	});
	app.querySelector('#out')?.addEventListener('click', async () => {
		await browserApi.runtime.sendMessage({ type: 'DISCONNECT' });
		init();
	});
	['source', 'target', 'locale', 'dbl', 'sel'].forEach((id) => {
		app.querySelector(`#${id}`).addEventListener('change', saveSettings);
	});
	const search = app.querySelector('#search');
	if (search) {
		search.addEventListener('input', () => {
			window.clearTimeout(searchTimer);
			searchTimer = window.setTimeout(() => loadLists(locale, search.value.trim()), 220);
		});
	}
	if (user) loadLists(locale, '');
}

async function saveSettings() {
	await browserApi.runtime.sendMessage({
		type: 'SAVE_SETTINGS',
		payload: {
			sourceLang: app.querySelector('#source').value,
			targetLang: app.querySelector('#target').value,
			locale: app.querySelector('#locale').value,
			doubleClickEnabled: app.querySelector('#dbl').checked,
			selectionEnabled: app.querySelector('#sel').checked,
		},
	});
	init();
}

async function loadLists(locale, q) {
	const body = document.getElementById('list-body');
	if (!body) return;
	try {
		const [recent, words] = await Promise.all([
			browserApi.runtime.sendMessage({ type: 'RECENT' }),
			browserApi.runtime.sendMessage({ type: 'WORDS', q }),
		]);
		if (recent?.error || words?.error) throw new Error(recent?.error || words?.error);
		const rec = recent?.items || [];
		const saved = words?.items || [];
		body.innerHTML = `
			<p class="sub">${t(locale, 'recent')}</p>
			${rec.slice(0, 5).map((item) => row(item, locale, false)).join('') || `<p class="empty">${t(locale, 'empty')}</p>`}
			<p class="sub" style="margin-top:10px">${t(locale, 'savedWords')}</p>
			${saved.slice(0, 12).map((item) => row(item, locale, true)).join('') || `<p class="empty">${t(locale, 'empty')}</p>`}
		`;
		body.querySelectorAll('[data-del]').forEach((btn) => {
			btn.addEventListener('click', async () => {
				const id = btn.getAttribute('data-del');
				btn.disabled = true;
				const res = await browserApi.runtime.sendMessage({ type: 'DELETE_WORD', id });
				if (res?.error) {
					btn.disabled = false;
					return;
				}
				loadLists(locale, document.getElementById('search')?.value?.trim() || '');
			});
		});
		body.querySelectorAll('[data-speak]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const text = btn.getAttribute('data-speak') || '';
				const lang = btn.getAttribute('data-lang') === 'ar' ? 'ar-SA' : 'en-US';
				if (!text || !globalThis.speechSynthesis) return;
				globalThis.speechSynthesis.cancel();
				const utter = new SpeechSynthesisUtterance(text);
				utter.lang = lang;
				globalThis.speechSynthesis.speak(utter);
			});
		});
	} catch {
		body.innerHTML = `<p class="empty">${t(locale, 'error')}</p>`;
	}
}

function row(item, locale, canDelete) {
	const id = item.id || item.wordId || '';
	return `<div class="item">
		<div class="item-main">
			<b dir="auto">${escapeHtml(item.text)}</b>
			<span dir="auto">${escapeHtml(item.translation)}</span>
		</div>
		<div class="item-actions">
			<button type="button" class="icon-btn" data-speak="${escapeHtml(item.text)}" data-lang="${escapeHtml(item.sourceLang || 'en')}" title="${escapeHtml(t(locale, 'speak'))}">♪</button>
			${canDelete && id ? `<button type="button" class="icon-btn danger" data-del="${escapeHtml(id)}" title="${escapeHtml(t(locale, 'delete'))}">×</button>` : ''}
		</div>
	</div>`;
}

function escapeHtml(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
