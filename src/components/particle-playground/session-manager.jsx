'use client';

import { useMemo, useState } from 'react';
import {
	FolderOpen,
	History,
	Plus,
	Trash2,
	Check,
	Clock3,
	Copy,
	Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { formatSessionTime } from '@/lib/particle-playground/session-store';
import { cn } from '@/lib/utils';

async function fetchSessionJson(item) {
	const id = item.id || item.filename?.replace(/\.json$/, '');
	const res = await fetch(`/api/particle-playground/sessions?id=${encodeURIComponent(id)}`);
	const data = await res.json();
	if (!res.ok || !data.session) throw new Error(data.error || 'Failed to load session');
	return data.session;
}

export function SessionManager({
	session,
	sessions = [],
	history = [],
	saving = false,
	onSave,
	onNew,
	onLoad,
	onDelete,
	onRename,
}) {
	const [open, setOpen] = useState(false);
	const [tab, setTab] = useState('sessions');
	const [nameDraft, setNameDraft] = useState('');

	const sorted = useMemo(
		() =>
			[...sessions].sort((a, b) =>
				String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
			),
		[sessions],
	);

	const downloadSession = async (item) => {
		try {
			const full = await fetchSessionJson(item);
			const blob = new Blob([JSON.stringify(full, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${full.id || item.id || 'session'}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			window.alert(error.message);
		}
	};

	const copySession = async (item) => {
		try {
			const full = await fetchSessionJson(item);
			await navigator.clipboard.writeText(JSON.stringify(full, null, 2));
		} catch (error) {
			window.alert(error.message);
		}
	};

	return (
		<>
			<div className="flex items-center gap-1.5">
				<div className="hidden max-w-[160px] truncate rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-[11px] text-zinc-300 sm:block">
					<span className="text-zinc-600">Session · </span>
					{session?.name || 'Untitled'}
					{saving ? <span className="text-zinc-600"> · saving…</span> : null}
				</div>
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="h-8 border-zinc-700 text-xs text-zinc-100 hover:bg-zinc-900 hover:text-white"
					onClick={() => {
						setNameDraft(session?.name || '');
						setTab('sessions');
						setOpen(true);
					}}
					title="Sessions"
				>
					<FolderOpen className="mr-1.5 h-3.5 w-3.5" />
					Sessions
				</Button>
				<Button
					type="button"
					size="sm"
					variant="ghost"
					className="h-8 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white"
					onClick={() => onNew?.()}
					title="New session"
				>
					<Plus className="mr-1.5 h-3.5 w-3.5" />
					New
				</Button>
			</div>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden border-zinc-800 bg-[#0d0d10] text-zinc-100">
					<DialogHeader>
						<DialogTitle className="font-[family-name:var(--font-space-grotesk)]">
							Sessions
						</DialogTitle>
					</DialogHeader>

					<div className="flex gap-2 border-b border-zinc-800 pb-3">
						<button
							type="button"
							className={cn(
								'rounded-md px-3 py-1.5 text-xs font-medium',
								tab === 'sessions'
									? 'bg-white text-zinc-950'
									: 'text-zinc-300 hover:bg-zinc-900 hover:text-white',
							)}
							onClick={() => setTab('sessions')}
						>
							Saved sessions
						</button>
						<button
							type="button"
							className={cn(
								'rounded-md px-3 py-1.5 text-xs font-medium',
								tab === 'history'
									? 'bg-white text-zinc-950'
									: 'text-zinc-300 hover:bg-zinc-900 hover:text-white',
							)}
							onClick={() => setTab('history')}
						>
							Current history
						</button>
					</div>

					{tab === 'sessions' ? (
						<div className="space-y-4 pt-3">
							<div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
								<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
									Current session · auto-saves
								</p>
								<div className="mt-2 flex flex-wrap gap-2">
									<Input
										value={nameDraft}
										onChange={(e) => setNameDraft(e.target.value)}
										placeholder="Session name"
										className="h-9 flex-1 border-zinc-800 bg-black/40 text-sm"
									/>
									<Button
										type="button"
										size="sm"
										className="h-9 bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
										onClick={() => {
											const next = nameDraft.trim() || session?.name || 'Untitled Session';
											onRename?.(next);
											onSave?.(next);
										}}
									>
										Rename
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										className="h-9 border-zinc-700"
										onClick={() => {
											onNew?.();
											setOpen(false);
										}}
									>
										<Plus className="mr-1 h-3.5 w-3.5" />
										Start new
									</Button>
								</div>
							</div>

							<div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
								{sorted.length === 0 ? (
									<p className="rounded-xl border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
										No saved sessions yet. Keep working — changes auto-save.
									</p>
								) : (
									sorted.map((item) => {
										const active = item.id === session?.id;
										return (
											<div
												key={item.id || item.filename}
												className={cn(
													'rounded-xl border p-3',
													active
														? 'border-emerald-400/40 bg-emerald-400/5'
														: 'border-zinc-800 bg-zinc-950/50',
												)}
											>
												<div className="flex items-start gap-3">
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2">
															<p className="truncate text-sm font-medium text-zinc-100">
																{item.name}
															</p>
															{active ? (
																<span className="rounded bg-emerald-400 px-1.5 py-0.5 text-[9px] font-bold uppercase text-zinc-950">
																	Loaded
																</span>
															) : null}
														</div>
														<p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
															<Clock3 className="h-3 w-3" />
															{formatSessionTime(item.updatedAt || item.createdAt)}
														</p>
														<p className="mt-0.5 text-[11px] text-zinc-600">
															{item.assetCount || 0} assets · {item.historyCount || 0}{' '}
															actions
														</p>
													</div>
													<div className="flex shrink-0 gap-1">
														<Button
															type="button"
															size="sm"
															className="h-8 bg-zinc-100 text-xs text-zinc-950 hover:bg-white"
															onClick={async () => {
																await onLoad?.(item);
																setOpen(false);
															}}
														>
															{active ? (
																<>
																	<Check className="mr-1 h-3 w-3" /> Loaded
																</>
															) : (
																'Load'
															)}
														</Button>
														<Button
															type="button"
															size="sm"
															variant="ghost"
															className="h-8 px-2 text-zinc-400"
															title="Copy JSON"
															onClick={() => copySession(item)}
														>
															<Copy className="h-3.5 w-3.5" />
														</Button>
														<Button
															type="button"
															size="sm"
															variant="ghost"
															className="h-8 px-2 text-zinc-400"
															title="Download JSON"
															onClick={() => downloadSession(item)}
														>
															<Download className="h-3.5 w-3.5" />
														</Button>
														<Button
															type="button"
															size="sm"
															variant="ghost"
															className="h-8 px-2 text-red-400"
															onClick={() => onDelete?.(item)}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													</div>
												</div>
											</div>
										);
									})
								)}
							</div>
						</div>
					) : (
						<div className="max-h-[55vh] space-y-2 overflow-y-auto pt-3 pr-1">
							{!history?.length ? (
								<p className="rounded-xl border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
									No actions recorded in this session yet.
								</p>
							) : (
								[...history].reverse().map((entry, idx) => (
									<div
										key={`${entry.at}-${idx}`}
										className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2"
									>
										<div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-600">
											<History className="h-3 w-3" />
											{entry.type}
											<span className="ml-auto normal-case tracking-normal text-zinc-600">
												{formatSessionTime(entry.at)}
											</span>
										</div>
										<p className="mt-1 text-sm text-zinc-200">{entry.message}</p>
									</div>
								))
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
