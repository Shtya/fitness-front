'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, FolderDown, Package } from 'lucide-react';
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
	generateFullComponent,
	generateStandalonePackage,
	generateConfigJson,
	generatePortableFiles,
	generatePortableClipboard,
} from '@/lib/particle-playground/export-code';
import {
	downloadPackageFolder,
	PACKAGE_FOLDER_NAME,
} from '@/lib/particle-playground/save-files';

const TAB_META = [
	{ key: 'package', label: 'Ready Package', file: `${PACKAGE_FOLDER_NAME}.zip` },
	{ key: 'next', label: 'Next.js', file: 'ParticleHero.jsx' },
	{ key: 'react', label: 'React', file: 'ParticleHero.jsx' },
	{ key: 'component', label: 'Component', file: 'MyParticleHero.jsx' },
	{ key: 'full', label: 'Install Guide', file: 'PARTICLE_INSTALL.txt' },
];

function triggerDownload(blob, filename) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}

export function CodePreview({ open, onOpenChange, config, src, scene }) {
	const [copied, setCopied] = useState('');
	const [engineSource, setEngineSource] = useState('');
	const [engineError, setEngineError] = useState('');
	const [busy, setBusy] = useState(false);
	const [saveNote, setSaveNote] = useState('');

	useEffect(() => {
		if (!open) return undefined;
		let cancelled = false;
		setEngineError('');
		setSaveNote('');
		(async () => {
			try {
				const res = await fetch('/api/particle-playground/export-engine');
				const text = await res.text();
				if (!res.ok) {
					throw new Error(text || 'Failed to load engine');
				}
				if (!cancelled) setEngineSource(text);
			} catch (err) {
				if (!cancelled) {
					setEngineSource('');
					setEngineError(err?.message || 'Unable to load ParticleObject.jsx');
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [open]);

	const portableFiles = useMemo(
		() => generatePortableFiles(config, src, scene, engineSource),
		[config, src, scene, engineSource],
	);

	const codes = useMemo(
		() => ({
			react: generateReactCode(config, src),
			next: generateNextCode(config, src),
			component: generateFullComponent(config, src),
			full: generateStandalonePackage(config, src),
			package: generatePortableClipboard(portableFiles),
			json: generateConfigJson(scene),
		}),
		[config, src, scene, portableFiles],
	);

	const copy = async (key) => {
		await navigator.clipboard.writeText(codes[key]);
		setCopied(key);
		setTimeout(() => setCopied(''), 1400);
	};

	const copyPackage = async () => {
		await navigator.clipboard.writeText(codes.package);
		setCopied('package');
		setTimeout(() => setCopied(''), 1400);
	};

	const downloadText = (key, filename) => {
		triggerDownload(new Blob([codes[key]], { type: 'text/plain;charset=utf-8' }), filename);
	};

	const downloadFolder = async () => {
		if (!engineSource) {
			setEngineError('Engine not loaded yet — wait a moment and try again.');
			return;
		}
		setBusy(true);
		setSaveNote('');
		setEngineError('');
		try {
			downloadPackageFolder(portableFiles, PACKAGE_FOLDER_NAME);
			setSaveNote(
				`اتحمّل ${PACKAGE_FOLDER_NAME}.zip — فكّه وهتلاقي فولدر فيه كل الملفات (المحرك + الهيرو + INSTALL + JSON).`,
			);
		} catch (err) {
			setEngineError(err?.message || 'Could not download folder');
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden border-zinc-700 bg-[#0d0d10] text-zinc-100">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-space-grotesk)] text-zinc-50">
						<Package className="h-4 w-4 text-emerald-400" />
						Export Animation
					</DialogTitle>
					<p className="text-xs leading-relaxed text-zinc-400">
						انسخ أو نزّل الأنيميشن بإعدادات الـ Studio الحالية — محرك{' '}
						<code className="text-emerald-300">ParticleObject.jsx</code> + كومبوننت جاهز
						تحطه في أي مشروع وتعدّل عليه بحرية.
					</p>
				</DialogHeader>

				<div className="flex flex-wrap gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/5 p-3">
					<Button
						type="button"
						size="sm"
						className="gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100"
						onClick={copyPackage}
						disabled={!engineSource}
					>
						{copied === 'package' ? (
							<Check className="h-3.5 w-3.5" />
						) : (
							<Copy className="h-3.5 w-3.5" />
						)}
						Copy Package
					</Button>
					<Button
						type="button"
						size="sm"
						className="gap-1.5 bg-sky-400 text-zinc-950 hover:bg-sky-300"
						onClick={downloadFolder}
						disabled={busy || !engineSource}
						title="Download particle-animation folder with all files inside"
					>
						<FolderDown className="h-3.5 w-3.5" />
						{busy ? 'Preparing…' : 'Download Folder'}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="gap-1.5 border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-900 hover:text-white"
						onClick={() => downloadText('json', 'particle-scene.json')}
					>
						<Download className="h-3.5 w-3.5" />
						Config JSON
					</Button>
					{engineError ? (
						<p className="w-full text-[11px] text-rose-300">{engineError}</p>
					) : !engineSource ? (
						<p className="w-full text-[11px] text-zinc-500">Loading engine file…</p>
					) : (
						<p className="w-full text-[11px] text-emerald-200/80">
							<strong className="font-semibold text-sky-200">Download Folder</strong> ينزّل
							فولدر <code className="text-sky-100">{PACKAGE_FOLDER_NAME}</code> وجواه
							الملفات مباشرة (من غير فولدرات جوّه بعض): ParticleObject.jsx ·
							MyParticleHero.jsx · INSTALL.md · particle-scene.json
						</p>
					)}
					{saveNote ? (
						<p className="w-full text-[11px] text-sky-200">{saveNote}</p>
					) : null}
				</div>

				<Tabs defaultValue="package">
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
							{tab.key === 'package' ? (
								<p className="rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
									معاينة الحزمة. اضغط{' '}
									<span className="text-sky-300">Download Folder</span> عشان ينزّل
									الفولدر بكل الملفات اللي بتستخدمها الأنيميشن.
								</p>
							) : null}
							<pre className="max-h-[40vh] overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-100">
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
								{tab.key === 'package' ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="gap-1.5 border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-900 hover:text-white"
										onClick={downloadFolder}
										disabled={busy || !engineSource}
									>
										<FolderDown className="h-3.5 w-3.5" />
										Download Folder
									</Button>
								) : (
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="gap-1.5 border-zinc-600 bg-transparent text-zinc-100 hover:bg-zinc-900 hover:text-white"
										onClick={() => downloadText(tab.key, tab.file)}
									>
										<Download className="h-3.5 w-3.5" />
										Download
									</Button>
								)}
							</div>
						</TabsContent>
					))}
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
