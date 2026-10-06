const GM_TOKENS = ['--gm-paper', '--gm-line', '--gm-ink', '--gm-ink-soft', '--gm-muted', '--gm-faint', '--gm-shadow-3'];

// Portaled menus render under <body>, outside `.dashboard-icy` where the --gm-* tokens live.
export function readGmTokens(el) {
	if (!el || typeof window === 'undefined') return {};
	const cs = window.getComputedStyle(el);
	const vars = {};
	for (const key of GM_TOKENS) {
		const v = cs.getPropertyValue(key).trim();
		if (v) vars[key] = v;
	}
	return vars;
}
