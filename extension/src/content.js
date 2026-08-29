const browserApi = globalThis.browser || globalThis.chrome;
const HOST_ID = 'so7ba-translator-host';

let root = null;
let card = null;
let chip = null;
let chipTimer = null;

function ensureRoot() {
	if (root) return root;
	document.getElementById(HOST_ID)?.remove();
	const host = document.createElement('div');
	host.id = HOST_ID;
	host.style.position = 'fixed';
	host.style.zIndex = '2147483646';
	host.style.top = '0';
	host.style.left = '0';
	document.documentElement.appendChild(host);
	root = host.attachShadow({ mode: 'closed' });
	root.appendChild(styleTag());
	return root;
}

browserApi.runtime.onMessage.addListener((message) => {
	if (message?.type === 'TRANSLATE_TEXT') translate(message.text);
	if (message?.type === 'TRANSLATE_SELECTION') translate(selectedText());
});

document.addEventListener(
	'dblclick',
	async (event) => {
		const st = await getState();
		if (!st?.cfg?.doubleClickEnabled) return;
		if (event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
		const text = selectedText() || wordAtPoint(event.clientX, event.clientY);
		if (text) translate(text, event.clientX, event.clientY);
	},
	true,
);

document.addEventListener(
	'mouseup',
	async (event) => {
		const st = await getState();
		if (!st?.cfg?.selectionEnabled) return;
		if (event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
		window.clearTimeout(chipTimer);
		chipTimer = window.setTimeout(() => {
			const text = selectedText();
			if (!text) {
				chip?.remove();
				chip = null;
				return;
			}
			showChip(event.clientX, event.clientY, text, st.labels);
		}, 120);
	},
	true,
);

function showChip(x, y, text, labels) {
	const mount = ensureRoot();
	chip?.remove();
	chip = document.createElement('button');
	chip.type = 'button';
	chip.textContent = labels?.translate || 'Translate';
	chip.setAttribute('style', chipCss(x, y));
	chip.addEventListener('mousedown', (event) => {
		event.preventDefault();
		event.stopPropagation();
	});
	chip.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		chip.remove();
		chip = null;
		translate(text, x, y);
	});
	mount.appendChild(chip);
}

async function translate(raw, x, y) {
	const text = String(raw || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 500);
	if (!text) return;
	const st = await getState();
	const pos = clamp(x, y);
	paint(st, { status: 'loading', text }, pos);
	try {
		if (!st.cfg.accessToken) {
			paint(st, { status: 'needLogin', text }, pos);
			return;
		}
		const data = await browserApi.runtime.sendMessage({
			type: 'LOOKUP',
			payload: {
				text,
				sourceLang: st.cfg.sourceLang,
				targetLang: st.cfg.targetLang,
				sourceUrl: location.href,
				sourceTitle: document.title,
			},
		});
		if (data?.error) throw new Error(data.error);
		paint(st, { status: 'ok', text, data }, pos);
	} catch (err) {
		paint(st, { status: 'error', text, error: err.message }, pos);
	}
}

function paint(st, model, pos) {
	const mount = ensureRoot();
	card?.remove();
	card = document.createElement('div');
	card.setAttribute('style', cardCss(pos.left, pos.top));
	card.setAttribute(
		'dir',
		st.cfg.locale === 'ar' || /[\u0600-\u06FF]/.test(model.text || '') ? 'rtl' : 'ltr',
	);
	const labels = st.labels || {};
	if (model.status === 'loading') {
		card.innerHTML = `<div class="title">${esc(model.text)}</div><div class="muted">${esc(labels.loading)}</div>`;
	} else if (model.status === 'needLogin') {
		card.innerHTML = `<div class="muted">${esc(labels.needLogin)}</div>`;
	} else if (model.status === 'error') {
		card.innerHTML = `<div class="muted">${esc(model.error || labels.error)}</div>`;
	} else {
		const data = model.data || {};
		const speakLang = data.sourceLang === 'ar' ? 'ar-SA' : 'en-US';
		card.innerHTML = `
			<div class="title">${esc(data.text || model.text)}</div>
			<div class="translation">${esc(data.translation || '')}</div>
			${data.pronunciation ? `<div class="muted">${esc(data.pronunciation)}</div>` : ''}
			${data.partOfSpeech ? `<div class="tag">${esc(data.partOfSpeech)}</div>` : ''}
			${data.example ? `<div class="example">${esc(data.example)}</div>` : ''}
			${data.cached ? `<div class="muted">⚡</div>` : ''}
			<div class="row">
				<button class="btn" type="button" data-act="save">${esc(data.saved ? labels.saved : labels.save)}</button>
				<button class="btn" type="button" data-act="speak">${esc(labels.speak || 'Listen')}</button>
				<button class="btn primary" type="button" data-act="open">${esc(labels.openWebsite)}</button>
			</div>
			<div class="muted status" data-status></div>
		`;
		const statusEl = card.querySelector('[data-status]');
		const saveBtn = card.querySelector('[data-act="save"]');
		saveBtn?.addEventListener('click', async () => {
			if (data.saved) return;
			saveBtn.disabled = true;
			saveBtn.textContent = labels.saving || 'Saving…';
			try {
				const saved = await browserApi.runtime.sendMessage({
					type: 'SAVE_WORD',
					payload: {
						text: data.text || model.text,
						translation: data.translation,
						sourceLang: data.sourceLang,
						targetLang: data.targetLang,
						pronunciation: data.pronunciation,
						partOfSpeech: data.partOfSpeech,
						example: data.example,
						sourceUrl: location.href,
						sourceTitle: document.title,
					},
				});
				if (saved?.error) throw new Error(saved.error);
				data.saved = true;
				data.savedId = saved?.id || null;
				data.websitePath = saved?.websitePath || data.websitePath;
				saveBtn.textContent = labels.saved;
				if (statusEl) statusEl.textContent = '';
			} catch (err) {
				saveBtn.disabled = false;
				saveBtn.textContent = labels.save;
				if (statusEl) statusEl.textContent = err.message || labels.saveFailed || 'Could not save';
			}
		});
		card.querySelector('[data-act="speak"]')?.addEventListener('click', () => {
			speakText(data.text || model.text, speakLang);
		});
		card.querySelector('[data-act="open"]')?.addEventListener('click', () => {
			const path = data.websitePath || '/dashboard/web-translator';
			window.open(`${st.cfg.webBase}${path.startsWith('/') ? path : `/${path}`}`, '_blank', 'noopener');
		});
	}
	mount.appendChild(card);
	document.addEventListener('click', dismiss, true);
}

function speakText(text, lang) {
	if (!text || !globalThis.speechSynthesis) return;
	globalThis.speechSynthesis.cancel();
	const utter = new SpeechSynthesisUtterance(String(text));
	utter.lang = lang || 'en-US';
	globalThis.speechSynthesis.speak(utter);
}

function dismiss(event) {
	const host = document.getElementById(HOST_ID);
	if (host && (event.composedPath?.().includes(host) || host.contains(event.target))) return;
	card?.remove();
	chip?.remove();
	card = null;
	chip = null;
	document.removeEventListener('click', dismiss, true);
}

function getState() {
	return browserApi.runtime.sendMessage({ type: 'GET_STATE' });
}

function selectedText() {
	return String(window.getSelection?.()?.toString() || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 500);
}

/** Cross-browser word under cursor (no Range.expand). */
function wordAtPoint(x, y) {
	const caret =
		document.caretRangeFromPoint?.(x, y) ||
		(typeof document.caretPositionFromPoint === 'function'
			? (() => {
					const pos = document.caretPositionFromPoint(x, y);
					if (!pos?.offsetNode) return null;
					const range = document.createRange();
					range.setStart(pos.offsetNode, pos.offset);
					range.setEnd(pos.offsetNode, pos.offset);
					return range;
				})()
			: null);
	if (!caret?.startContainer) return '';
	const node = caret.startContainer;
	if (node.nodeType !== Node.TEXT_NODE) return '';
	const value = String(node.textContent || '');
	const index = Math.min(caret.startOffset, value.length);
	if (!value || !/\S/.test(value)) return '';
	const re = /[\p{L}\p{N}\u0600-\u06FF'-]+/gu;
	let match;
	while ((match = re.exec(value)) !== null) {
		if (index >= match.index && index <= match.index + match[0].length) {
			return match[0].trim();
		}
	}
	return '';
}

function clamp(x, y) {
	return {
		left: Math.min(window.innerWidth - 340, Math.max(12, (x ?? 24) + 12)),
		top: Math.min(window.innerHeight - 220, Math.max(12, (y ?? 24) + 12)),
	};
}

function styleTag() {
	const el = document.createElement('style');
	el.textContent = `
		.title { font-weight: 800; font-size: 14px; color: #111827; font-family: Inter, "Segoe UI", Tahoma, sans-serif; }
		.translation { margin-top: 4px; font-size: 18px; font-weight: 800; color: #4f46e5; font-family: Inter, "Segoe UI", Tahoma, sans-serif; }
		.muted { margin-top: 6px; font-size: 12px; color: #6b7280; font-family: Inter, "Segoe UI", Tahoma, sans-serif; }
		.tag { display: inline-flex; margin-top: 8px; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-size: 11px; font-weight: 700; }
		.example { margin-top: 8px; font-size: 12px; color: #334155; line-height: 1.5; font-family: Inter, "Segoe UI", Tahoma, sans-serif; }
		.row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
		.btn { border: 1px solid #e5e7eb; background: #fff; border-radius: 10px; height: 32px; padding: 0 10px; font-size: 12px; font-weight: 700; cursor: pointer; }
		.btn:disabled { opacity: 0.6; cursor: default; }
		.btn.primary { border: 0; color: #fff; background: linear-gradient(90deg, #6366f1, #3b82f6); }
		.status { color: #b91c1c; min-height: 1em; }
	`;
	return el;
}

function cardCss(left, top) {
	return `position:fixed;left:${left}px;top:${top}px;width:300px;padding:14px;border-radius:18px;background:#fff;box-shadow:0 16px 40px rgba(15,23,42,.18);border:1px solid #e5e7eb;`;
}

function chipCss(x, y) {
	return `position:fixed;left:${Math.min(window.innerWidth - 120, x)}px;top:${Math.max(8, y - 36)}px;height:28px;padding:0 10px;border:0;border-radius:999px;background:linear-gradient(90deg,#6366f1,#3b82f6);color:#fff;font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 8px 20px rgba(79,70,229,.35);`;
}

function esc(value) {
	return String(value || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
