'use client';

import { useState } from 'react';
import { FileJson, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import DemoInfoTip from './DemoInfoTip';

const EXAMPLE = [
	{
		name: 'أحمد مصطفى',
		phone: '+201551495772',
		about: 'عضو صالة رياضية',
		verified: true,
		presenceStatus: 'online',
		conversation: { pinned: true, unreadCount: 1 },
		messages: [
			{
				direction: 'inbound',
				text: 'السلام عليكم، عايز أعرف مواعيد حصص الكارديو',
				status: 'read',
			},
			{
				direction: 'outbound',
				text: 'أهلاً بيك! الحصص من الساعة 6 الصبح لحد 11 بالليل يومياً',
				status: 'read',
			},
		],
		events: [
			{ eventType: 'typing', delayMs: 2000, durationMs: 3000 },
			{
				eventType: 'incoming_message',
				delayMs: 6000,
				text: 'تمام شكراً، هسجل حصة بكرة الصبح',
			},
		],
	},
];

function fillTemplate(template, values) {
	return template.replace(/\{(\w+)\}/g, (match, key) =>
		Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
	);
}

export default function DemoJsonImportDialog({ open, onOpenChange, labels, onImport }) {
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const [parseError, setParseError] = useState('');
	const [result, setResult] = useState(null);

	const loadExample = () => {
		setText(JSON.stringify(EXAMPLE, null, 2));
		setParseError('');
		setResult(null);
	};

	const submit = async event => {
		event.preventDefault();
		setParseError('');
		setResult(null);
		let parsed;
		try {
			parsed = JSON.parse(text);
		} catch {
			setParseError(labels.invalidJson);
			return;
		}
		setBusy(true);
		try {
			const summary = await onImport(parsed);
			setResult(summary);
		} catch (importError) {
			if (importError?.code === 'EMPTY_JSON_LIST') {
				setParseError(labels.emptyJsonList);
			} else {
				setParseError(
					importError?.response?.data?.message || importError?.message || labels.invalidJson,
				);
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={value => {
				onOpenChange(value);
				if (!value) {
					setText('');
					setParseError('');
					setResult(null);
				}
			}}
		>
			<DialogContent dir={labels.dir} className="max-w-2xl">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileJson size={18} className="text-[var(--color-primary-500)]" />
						{labels.importJsonTitle}
						<DemoInfoTip text={labels.importJsonHint} />
					</DialogTitle>
					<DialogDescription>{labels.importJsonHint}</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-3">
					<div className="flex items-start gap-2 rounded-lg bg-[var(--color-secondary-50)] p-2.5 text-xs leading-relaxed text-[var(--color-secondary-900)] dark:bg-[var(--color-secondary-950)]/20 dark:text-[var(--color-secondary-200)]">
						<p className="min-w-0 flex-1">{labels.importJsonSchemaHint}</p>
						<DemoInfoTip text={labels.importJsonSchemaHint} />
					</div>
					<div className="flex items-center justify-between gap-2">
						<label className="text-xs font-bold" htmlFor="demo-json-import-input">
							{labels.jsonInputLabel}
						</label>
						<Button type="button" variant="outline" size="sm" onClick={loadExample}>
							<Sparkles />
							{labels.loadExample}
						</Button>
					</div>
					<textarea
						id="demo-json-import-input"
						value={text}
						onChange={event => setText(event.target.value)}
						rows={14}
						dir="ltr"
						spellCheck={false}
						placeholder='[{"name": "...", "messages": [{"direction": "inbound", "text": "..."}]}]'
						className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs outline-none focus:border-[var(--color-primary-400)] focus:ring-2 focus:ring-[var(--color-primary-100)] dark:border-slate-700 dark:bg-slate-900"
					/>
					{parseError && (
						<p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-600 dark:border-rose-900 dark:bg-rose-950/20">
							{parseError}
						</p>
					)}
					{result && (
						<div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300">
							<p className="font-bold">
								{fillTemplate(labels.importSuccess, {
									contacts: result.contacts,
									messages: result.messages,
									events: result.events,
								})}
							</p>
							{result.errors.length > 0 && (
								<div>
									<p className="font-bold text-amber-700 dark:text-amber-400">
										{labels.importErrors}
									</p>
									<ul className="list-inside list-disc">
										{result.errors.map((message, index) => (
											<li key={index}>{message}</li>
										))}
									</ul>
								</div>
							)}
						</div>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							{labels.close}
						</Button>
						<Button type="submit" disabled={busy || !text.trim()}>
							{busy ? <Loader2 className="animate-spin" /> : <FileJson />}
							{busy ? labels.importing : labels.import}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
