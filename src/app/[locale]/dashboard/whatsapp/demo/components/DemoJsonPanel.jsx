'use client';

import { useState } from 'react';
import { Braces, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DemoInfoTip from './DemoInfoTip';

export default function DemoJsonPanel({
	labels,
	title,
	hint,
	example,
	exampleLabel,
	onSubmit,
	disabled,
	compact = false,
}) {
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const loadExample = () => {
		setText(JSON.stringify(example, null, 2));
		setError('');
		setSuccess('');
	};

	const submit = async event => {
		event.preventDefault();
		setError('');
		setSuccess('');
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch {
			setError(labels.invalidJson);
			return;
		}
		setBusy(true);
		try {
			await onSubmit(parsed);
			setSuccess(labels.jsonApplied);
			if (!compact) setText('');
		} catch (submitError) {
			setError(
				submitError?.response?.data?.message ||
					submitError?.message ||
					labels.invalidJson,
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<form
			onSubmit={submit}
			className={`space-y-2 rounded-xl border border-dashed border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/40 p-3 dark:border-[var(--color-primary-900)] dark:bg-[var(--color-primary-950)]/20 ${
				compact ? '' : ''
			}`}
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<Braces size={14} className="text-[var(--color-primary-500)]" />
					<span className="text-xs font-black text-slate-700 dark:text-slate-200">
						{title || labels.jsonMode}
					</span>
					<DemoInfoTip text={hint || labels.jsonModeHint} />
				</div>
				{example != null && (
					<Button type="button" variant="outline" size="sm" onClick={loadExample}>
						<Sparkles />
						{exampleLabel || labels.loadExample}
					</Button>
				)}
			</div>
			<textarea
				value={text}
				onChange={event => setText(event.target.value)}
				rows={compact ? 6 : 8}
				dir="ltr"
				spellCheck={false}
				placeholder='{ "…": "…" }'
				disabled={disabled || busy}
				className="w-full resize-y rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] leading-relaxed outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-100)] dark:border-slate-700 dark:bg-slate-900"
			/>
			{error && (
				<p className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-600 dark:border-rose-900 dark:bg-rose-950/20">
					{error}
				</p>
			)}
			{success && (
				<p className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20">
					{success}
				</p>
			)}
			<div className="flex justify-end">
				<Button type="submit" size="sm" disabled={disabled || busy || !text.trim()}>
					{busy ? <Loader2 className="animate-spin" /> : <Braces />}
					{busy ? labels.importing : labels.applyJson}
				</Button>
			</div>
		</form>
	);
}
