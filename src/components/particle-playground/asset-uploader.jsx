'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, Link2, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ACCEPT_ATTR } from '@/lib/particle-playground/asset-utils';

export function AssetUploader({ onUploadFiles, onLoadUrl, busy }) {
	const inputRef = useRef(null);
	const [url, setUrl] = useState('');
	const [dragging, setDragging] = useState(false);

	const onDrop = useCallback(
		(e) => {
			e.preventDefault();
			e.stopPropagation();
			setDragging(false);
			const files = Array.from(e.dataTransfer.files || []);
			if (files.length) onUploadFiles?.(files);
		},
		[onUploadFiles],
	);

	return (
		<div className="space-y-3">
			<div
				onDragOver={(e) => {
					e.preventDefault();
					e.stopPropagation();
					setDragging(true);
				}}
				onDragLeave={(e) => {
					e.preventDefault();
					setDragging(false);
				}}
				onDrop={onDrop}
				className={[
					'rounded-xl border border-dashed px-3 py-6 text-center transition',
					dragging
						? 'border-emerald-400/70 bg-emerald-400/10 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]'
						: 'border-emerald-400/25 bg-zinc-950/80 hover:border-emerald-400/45',
				].join(' ')}
			>
				<div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/10 ring-1 ring-emerald-400/30">
					<Upload className="h-4 w-4 text-emerald-400" />
				</div>
				<p className="text-sm font-semibold text-zinc-50">Drop logo here</p>
				<p className="mt-1 text-[11px] text-zinc-500">PNG · SVG · JPG · WebP · GIF · GLB</p>
				<p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-zinc-900/80 px-2 py-1 text-[10px] text-zinc-400">
					<ClipboardPaste className="h-3 w-3" />
					or <kbd className="rounded bg-zinc-800 px-1 font-mono text-[10px] text-zinc-200">Ctrl</kbd>
					+
					<kbd className="rounded bg-zinc-800 px-1 font-mono text-[10px] text-zinc-200">V</kbd>
				</p>
				<Button
					type="button"
					size="sm"
					disabled={busy}
					className="mt-4 h-9 w-full bg-emerald-400 text-xs font-semibold text-zinc-950 hover:bg-emerald-300"
					onClick={() => inputRef.current?.click()}
				>
					{busy ? 'Uploading…' : 'Upload Asset'}
				</Button>
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPT_ATTR}
					multiple
					className="hidden"
					onChange={(e) => {
						const files = Array.from(e.target.files || []);
						if (files.length) onUploadFiles?.(files);
						e.target.value = '';
					}}
				/>
			</div>

			<div className="flex gap-1.5">
				<Input
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="https://…/logo.png"
					className="h-9 border-zinc-800 bg-zinc-950 text-xs text-zinc-200"
					onKeyDown={(e) => {
						if (e.key === 'Enter' && url.trim()) {
							onLoadUrl?.(url.trim());
							setUrl('');
						}
					}}
				/>
				<Button
					type="button"
					size="sm"
					variant="outline"
					disabled={busy || !url.trim()}
					className="h-9 border-zinc-800 px-2.5 text-zinc-300"
					title="Load URL"
					onClick={() => {
						onLoadUrl?.(url.trim());
						setUrl('');
					}}
				>
					<Link2 className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}
