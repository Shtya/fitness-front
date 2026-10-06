const tint = (c, pct) => ({
	background: `color-mix(in srgb, ${c} ${pct}%, var(--gm-paper))`,
	boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c} 18%, transparent)`,
});

const MAP = {
	green: { ...tint('var(--gm-ok)', 16), color: 'var(--gm-ok)' },
	amber: { ...tint('var(--gm-warn)', 16), color: 'var(--gm-warn)' },
	red: { ...tint('var(--gm-danger)', 14), color: 'var(--gm-danger)' },
	violet: { ...tint('var(--color-secondary-500)', 14), color: 'var(--color-secondary-700)' },
	blue: { ...tint('var(--color-primary-500)', 12), color: 'var(--color-primary-700)' },
	emerald: { ...tint('var(--gm-ok)', 16), color: 'var(--gm-ok)' },
	sky: { ...tint('var(--color-primary-500)', 12), color: 'var(--color-primary-700)' },
	pink: { ...tint('var(--color-secondary-400)', 16), color: 'var(--color-secondary-700)' },
	slate: { background: 'color-mix(in srgb, var(--gm-muted) 14%, var(--gm-paper))', color: 'var(--gm-ink-soft)', boxShadow: 'inset 0 0 0 1px var(--gm-line)' },
	primary: { ...tint('var(--color-primary-500)', 12), color: 'var(--color-primary-700)' },
};

export default function GmBadge({ children, color = 'slate', dot = false, icon = null }) {
	return (
		<span
			className='inline-flex max-w-full min-h-6 items-center gap-1.5 truncate rounded-full px-2.5 text-[11px] font-semibold'
			style={MAP[color] || MAP.slate}
		>
			{dot ? <span className='size-1.5 rounded-full bg-current opacity-90' /> : null}
			{icon}
			{children}
		</span>
	);
}
