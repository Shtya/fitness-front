'use client';

import { useMemo, useState } from 'react';
import { Copy, Download, Check } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
	generateReactCode,
	generateNextCode,
	generateVanillaCode,
	generateFullComponent,
	generateConfigJson,
} from '@/lib/particle-playground/export-code';

export function ExportModal({ open, onOpenChange, config, src, scene }) {
	const [copied, setCopied] = useState('');
	const codes = useMemo(
		() => ({
			react: generateReactCode(config, src),
			next: generateNextCode(config, src),
			vanilla: generateVanillaCode(config, src),
			component: generateFullComponent(config, src),
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
			<DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden border-zinc-800 bg-[#0d0d10] text-zinc-100">
				<DialogHeader>
					<DialogTitle className="font-[family-name:var(--font-space-grotesk)] text-lg">
						Export Particle Code
					</DialogTitle>
				</DialogHeader>
				<Tabs defaultValue="next">
					<TabsList className="bg-zinc-900">
						<TabsTrigger value="react">React</TabsTrigger>
						<TabsTrigger value="next">Next.js</TabsTrigger>
						<TabsTrigger value="vanilla">Vanilla</TabsTrigger>
						<TabsTrigger value="component">Export Component</TabsTrigger>
					</TabsList>
					{['react', 'next', 'vanilla', 'component'].map((key) => (
						<TabsContent key={key} value={key} className="space-y-3">
							<pre className="max-h-[48vh] overflow-auto rounded-lg border border-zinc-800 bg-black/40 p-3 text-[11px] leading-relaxed text-emerald-100/90">
								{codes[key]}
							</pre>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									size="sm"
									className="gap-1.5 bg-zinc-100 text-zinc-950 hover:bg-white"
									onClick={() => copy(key)}
								>
									{copied === key ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
									Copy Code
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="gap-1.5 border-zinc-700"
									onClick={() => download('json', 'particle-scene.json')}
								>
									<Download className="h-3.5 w-3.5" />
									Download Config
								</Button>
								{key === 'component' ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="gap-1.5 border-zinc-700"
										onClick={() => download('component', 'MyParticleHero.jsx')}
									>
										<Download className="h-3.5 w-3.5" />
										Download Component
									</Button>
								) : null}
							</div>
						</TabsContent>
					))}
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
