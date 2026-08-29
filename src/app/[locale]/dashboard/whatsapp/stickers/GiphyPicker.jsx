'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

async function fetchGiphy(apiKey, query) {
	const endpoint = query
		? `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=24&rating=pg`
		: `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=24&rating=pg`;
	const response = await fetch(endpoint);
	if (!response.ok) throw new Error('Giphy request failed');
	const data = await response.json();
	return Array.isArray(data?.data) ? data.data : [];
}

async function fetchTenor(apiKey, query) {
	const endpoint = query
		? `https://tenor.googleapis.com/v2/search?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=24&media_filter=gif`
		: `https://tenor.googleapis.com/v2/featured?key=${encodeURIComponent(apiKey)}&limit=24&media_filter=gif`;
	const response = await fetch(endpoint);
	if (!response.ok) throw new Error('Tenor request failed');
	const data = await response.json();
	return Array.isArray(data?.results) ? data.results : [];
}

function normalizeItems(source, rows) {
	if (source === 'giphy') {
		return rows
			.map(row => ({
				id: row.id,
				preview: row.images?.fixed_width_small?.url || row.images?.preview_gif?.url,
				url: row.images?.original?.url || row.images?.downsized?.url,
			}))
			.filter(item => item.preview && item.url);
	}
	return rows
		.map(row => {
			const media = row.media_formats || {};
			return {
				id: row.id,
				preview: media.tinygif?.url || media.gif?.url,
				url: media.gif?.url || media.mediumgif?.url,
			};
		})
		.filter(item => item.preview && item.url);
}

export default function GiphyPicker({ ar = false, apiKey = '', tenorKey = '', onPick }) {
	const [query, setQuery] = useState('');
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [busyId, setBusyId] = useState(null);
	const source = apiKey ? 'giphy' : 'tenor';
	const key = apiKey || tenorKey;

	useEffect(() => {
		if (!key) return undefined;
		let cancelled = false;
		const timer = setTimeout(async () => {
			setLoading(true);
			try {
				const rows =
					source === 'giphy'
						? await fetchGiphy(key, query.trim())
						: await fetchTenor(key, query.trim());
				if (!cancelled) setItems(normalizeItems(source, rows));
			} catch {
				if (!cancelled) {
					setItems([]);
					toast.error(ar ? 'تعذر تحميل الـ GIF' : 'Could not load GIFs');
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}, 280);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [ar, key, query, source]);

	const pick = async item => {
		if (!item?.url || !onPick) return;
		setBusyId(item.id);
		try {
			const response = await fetch(item.url);
			if (!response.ok) throw new Error('download failed');
			const blob = await response.blob();
			const file = new File([blob], `gif-${item.id}.gif`, {
				type: blob.type || 'image/gif',
			});
			await onPick(file);
		} catch {
			toast.error(ar ? 'تعذر إرسال الـ GIF' : 'Could not send GIF');
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
				<Search size={14} className="text-slate-400" />
				<input
					value={query}
					onChange={event => setQuery(event.target.value)}
					placeholder={ar ? 'ابحث عن GIF…' : 'Search GIFs…'}
					className="min-w-0 flex-1 bg-transparent text-sm outline-none"
				/>
				{loading ? <Loader2 size={14} className="animate-spin text-slate-400" /> : null}
			</div>
			<div className="grid min-h-0 flex-1 grid-cols-3 gap-1 overflow-y-auto p-2">
				{items.map(item => (
					<button
						key={item.id}
						type="button"
						disabled={Boolean(busyId)}
						onClick={() => void pick(item)}
						className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={item.preview} alt="" className="h-full w-full object-cover" />
						{busyId === item.id ? (
							<span className="absolute inset-0 grid place-items-center bg-black/40">
								<Loader2 size={16} className="animate-spin text-white" />
							</span>
						) : null}
					</button>
				))}
			</div>
		</div>
	);
}
