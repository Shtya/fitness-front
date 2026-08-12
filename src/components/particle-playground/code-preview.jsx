'use client';

import { useMemo, useState } from 'react';
import { Check, Code2, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	generateReactCode,
	generateNextCode,
	generateVanillaCode,
	generateFullComponent,
	generateStandalonePackage,
	generateConfigJson,
} from '@/lib/particle-playground/export-code';

const TAB_META = [
	{ key: 'next', label: 'Next.js', file: 'ParticleHero.jsx' },
	{ key: 'react', label: 'React', file: 'ParticleHero.jsx' },
	{ key: 'component', label: 'Component', file: 'MyParticleHero.jsx' },
	{ key: 'full', label: 'Full Package', file: 'PARTICLE_INSTALL.txt' },
];

export function CodePreview({ open, onOpenChange, config, src, scene }) {
	const [copied, setCopied] = useState('');
	const codes = useMemo(
		() => ({
			react: generateReactCode(config, src),
			next: generateNextCode(config, src),
			component: generateFullComponent(config, src),
			full: generateStandalonePackage(config, src),
			json: generateConfigJson(scene),
		}),
		[config, src, scene],
	);

	const copy = async (key) => {
		await navigator.clipboard.writeText(codes[key]);
		setCopied(key);
		setTimeout(() => setCopied(''), 1200);
	};

	const download = (key, filename) => {
		const blob = new Blob([codes[key]], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[88vh] max-w-3xl overflow-hidden border-zinc-700 bg-[#0d0d10] text-zinc-100">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-zinc-50">
						<Code2 className="h-4 w-4 text-emerald-400" />
						Generated Code
					</DialogTitle>
					<p className="text-xs text-zinc-400">
						الـ React/Next snippets صغيرة للاستخدام السريع. تاب{' '}
						<span className="text-emerald-300">Full Package</span> فيها خطوات التثبيت + الكود الكامل.
					</p>
				</DialogHeader>
				<Tabs defaultValue="full">
					<TabsList className="h-auto flex-wrap gap-1 bg-zinc-900 p-1">
						{TAB_META.map((tab) => (
							<TabsTrigger
								key={tab.key}
								value={tab.key}
								className="rounded-md px-3 py-1.5 text-xs text-zinc-300 data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow-none"
							>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
					{TAB_META.map((tab) => (
						<TabsContent key={tab.key} value={tab.key} className="space-y-3">
							{tab.key === 'full' ? (
								<p className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px] leading-relaxed text-emerald-100/90">
									ده الـ package الكبير: تعليمات نسخ{' '}
									<code className="text-emerald-300">ParticleObject.jsx</code> (المحرك الكبير) +
									تثبيت three + كومبوننت الهيرو بكل الإعدادات الحالية.
								</p>
							) : null}
							<pre className="max-h-[46vh] overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-100">
								{codes[tab.key]}
							</pre>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									size="sm"
									className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100"
									onClick={() => copy(tab.key)}
								>
									{copied === tab.key ? (
										<Check className="h-3.5 w-3.5" />
									) : (
										<Copy className="h-3.5 w-3.5" />
									)}
									Copy Code
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="gap-1.5 border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-900 hover:text-white"
									onClick={() => download(tab.key, tab.file)}
								>
									<Download className="h-3.5 w-3.5" />
									Download
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="gap-1.5 border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-900 hover:text-white"
									onClick={() => download('json', 'particle-scene.json')}
								>
									<Download className="h-3.5 w-3.5" />
									Download Config
								</Button>
							</div>
						</TabsContent>
					))}
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
