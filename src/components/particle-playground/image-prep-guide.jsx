'use client';

import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	IMAGE_PREP_PROMPT,
	IMAGE_PREP_OPTIONS,
	buildImagePrepPrompt,
} from '@/lib/particle-playground/image-prep-prompt';
import { cn } from '@/lib/utils';

export function ImagePrepGuide() {
	const [copied, setCopied] = useState(false);
	const [selected, setSelected] = useState(['enhance']);

	const finalPrompt = useMemo(
		() => buildImagePrepPrompt(IMAGE_PREP_PROMPT, selected),
		[selected],
	);

	const toggle = (id) => {
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const copyPrompt = async () => {
		try {
			await navigator.clipboard.writeText(finalPrompt);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			window.prompt('Copy this prompt:', finalPrompt);
		}
	};

	return (
		<div className="rounded-xl border border-zinc-700/90 bg-zinc-950 p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
			<div className="mb-2 flex items-center justify-between gap-2">
				<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
					ChatGPT prompt
				</p>
				<Button
					type="button"
					size="sm"
					className="h-7 gap-1 bg-white px-2.5 text-[10px] font-semibold text-zinc-950 hover:bg-zinc-100"
					onClick={copyPrompt}
				>
					{copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
					{copied ? 'Copied' : 'Copy'}
				</Button>
			</div>

			<p className="mb-1.5 text-[10px] text-zinc-500">Extras — فعّل اللي محتاجه</p>
			<div className="mb-2 grid grid-cols-2 gap-1.5">
				{IMAGE_PREP_OPTIONS.map((opt) => {
					const active = selected.includes(opt.id);
					return (
						<button
							key={opt.id}
							type="button"
							title={opt.hint}
							onClick={() => toggle(opt.id)}
							className={cn(
								'rounded-lg border px-2.5 py-2 text-left transition',
								active
									? 'border-emerald-300 bg-emerald-400 text-zinc-950 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]'
									: 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800',
							)}
						>
							<span className="block text-[11px] font-bold leading-none">{opt.label}</span>
							<span
								className={cn(
									'mt-1 block text-[9px] leading-snug',
									active ? 'text-zinc-800' : 'text-zinc-500',
								)}
							>
								{opt.hint}
							</span>
						</button>
					);
				})}
			</div>

			<pre className="max-h-72 overflow-auto rounded-lg border border-zinc-800 bg-black/60 p-2.5 text-[10px] leading-relaxed text-zinc-300">
				{finalPrompt}
			</pre>
		</div>
	);
}
