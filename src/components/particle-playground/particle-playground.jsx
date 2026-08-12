'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Download,
	Images,
	Redo2,
	RotateCcw,
	Sparkles,
	Undo2,
	Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetUploader } from './asset-uploader';
import { ParticleCanvas } from './particle-canvas';
import { ControlsPanel } from './controls-panel';
import { MorphTimeline } from './morph-timeline';
import { CodePreview } from './code-preview';
import { SessionManager } from './session-manager';
import { LibraryModal } from './library-modal';
import { ImagePrepGuide } from './image-prep-guide';
import {
	DEFAULT_PARTICLE_CONFIG,
	createAssetMeta,
	createEmptyScene,
} from '@/lib/particle-playground/particle-config';
import { BUILTIN_PRESETS } from '@/lib/particle-playground/particle-presets';
import {
	ACCEPTED_EXTENSIONS,
	getAssetType,
	getExtension,
	sanitizeFilename,
	uniqueFilename,
} from '@/lib/particle-playground/asset-utils';
import { sampleAssetFromUrl } from '@/lib/particle-playground/image-sampler';
import {
	createMorphController,
	getEase,
} from '@/lib/particle-playground/morph-engine';
import {
	SESSION_LS_KEY,
	createBlankSession,
	serializeSession,
	pushHistory,
} from '@/lib/particle-playground/session-store';
import {
	loadPreferredSettings,
	savePreferredSettings,
} from '@/lib/particle-playground/settings-storage';
import {
	cloneAssetsForHistory,
	createUndoStack,
	stripMorphSamples,
} from '@/lib/particle-playground/undo-history';

function assetSrc(asset) {
	if (!asset) return '';
	return asset.objectUrl || asset.url || '';
}

function isAcceptedFile(file) {
	if (!file) return false;
	const ext = getExtension(file.name || '');
	if (ACCEPTED_EXTENSIONS.includes(ext)) return true;
	const type = file.type || '';
	return (
		type.startsWith('image/') ||
		type.includes('gltf') ||
		type === 'application/octet-stream'
	);
}

export default function ParticlePlayground() {
	const preferred = useMemo(() => loadPreferredSettings(), []);
	const blank = useMemo(
		() => createBlankSession('Untitled Session', preferred),
		[preferred],
	);
	const [sessionMeta, setSessionMeta] = useState(() => ({
		id: blank.id,
		name: blank.name,
		createdAt: blank.createdAt,
		history: blank.history,
	}));
	const [sessions, setSessions] = useState([]);
	const [sessionSaving, setSessionSaving] = useState(false);
	const [assets, setAssets] = useState([]);
	const [selectedId, setSelectedId] = useState(null);
	const [config, setConfig] = useState(() => ({ ...preferred }));
	const [morphTargets, setMorphTargets] = useState([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [progress, setProgress] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [busy, setBusy] = useState(false);
	const [savedPresets, setSavedPresets] = useState([]);
	const [morphCloud, setMorphCloud] = useState(null);
	const [rebuildKey, setRebuildKey] = useState(0);
	const [status, setStatus] = useState('');
	const [dragging, setDragging] = useState(false);
	const [codeOpen, setCodeOpen] = useState(false);
	const [libraryOpen, setLibraryOpen] = useState(false);
	const [hydrated, setHydrated] = useState(false);

	const morphRef = useRef(createMorphController());
	const rafRef = useRef(0);
	const playStartRef = useRef(0);
	const progressRef = useRef(0);
	const dragDepthRef = useRef(0);
	const fileInputRef = useRef(null);
	const saveTimerRef = useRef(0);
	const settingsTimerRef = useRef(0);
	const skipAutosaveRef = useRef(true);
	const undoStackRef = useRef(createUndoStack({ limit: 50 }));
	const undoTimerRef = useRef(0);
	const needsMorphRestoreRef = useRef(false);
	const rebuildMorphRef = useRef(null);
	const [historyUi, setHistoryUi] = useState({ canUndo: false, canRedo: false });

	const syncHistoryUi = useCallback(() => {
		const stack = undoStackRef.current;
		setHistoryUi({ canUndo: stack.canUndo(), canRedo: stack.canRedo() });
	}, []);

	const takeSnapshot = useCallback(
		() => ({
			config: { ...config },
			assets: cloneAssetsForHistory(assets),
			morphTargets: stripMorphSamples(morphTargets),
			selectedId,
			currentIndex,
			playing: false,
			progress: 0,
		}),
		[config, assets, morphTargets, selectedId, currentIndex],
	);

	const applySnapshot = useCallback(
		(snap) => {
			if (!snap) return;
			const stack = undoStackRef.current;
			stack.setApplying(true);
			needsMorphRestoreRef.current = Array.isArray(snap.morphTargets) && snap.morphTargets.length > 0;
			setConfig({ ...DEFAULT_PARTICLE_CONFIG, ...(snap.config || {}) });
			setAssets(Array.isArray(snap.assets) ? snap.assets.map((a) => ({ ...a })) : []);
			setMorphTargets(
				Array.isArray(snap.morphTargets)
					? snap.morphTargets.map((t) => ({ ...t }))
					: [],
			);
			setSelectedId(snap.selectedId || null);
			setCurrentIndex(snap.currentIndex || 0);
			setProgress(0);
			progressRef.current = 0;
			setPlaying(false);
			setMorphCloud(null);
			setRebuildKey((k) => k + 1);
			setStatus('History restored');
			window.setTimeout(() => {
				stack.setApplying(false);
				syncHistoryUi();
				if (needsMorphRestoreRef.current) {
					needsMorphRestoreRef.current = false;
					rebuildMorphRef.current?.();
				}
			}, 80);
		},
		[syncHistoryUi],
	);

	const pushUndoSnapshot = useCallback(
		(opts = {}) => {
			const stack = undoStackRef.current;
			if (stack.applying) return;
			const pushed = stack.push(takeSnapshot(), opts);
			if (pushed) syncHistoryUi();
		},
		[takeSnapshot, syncHistoryUi],
	);

	const undo = useCallback(() => {
		const stack = undoStackRef.current;
		const prev = stack.undo();
		if (!prev) return;
		applySnapshot(prev);
		syncHistoryUi();
	}, [applySnapshot, syncHistoryUi]);

	const redo = useCallback(() => {
		const stack = undoStackRef.current;
		const next = stack.redo();
		if (!next) return;
		applySnapshot(next);
		syncHistoryUi();
	}, [applySnapshot, syncHistoryUi]);

	const selectedAsset = useMemo(
		() => assets.find((a) => a.id === selectedId) || null,
		[assets, selectedId],
	);

	const activeSrc = useMemo(() => {
		if (morphTargets.length > 0) {
			const target = morphTargets[0];
			const asset = assets.find((a) => a.id === target?.assetId);
			return assetSrc(asset) || assetSrc(selectedAsset);
		}
		return assetSrc(selectedAsset);
	}, [assets, morphTargets, selectedAsset]);

	const allPresets = useMemo(
		() => [
			...BUILTIN_PRESETS,
			...savedPresets.map((p) => ({
				id: p.filename || p.name,
				name: p.name,
				config: p.config || p,
				filename: p.filename,
				raw: p,
			})),
		],
		[savedPresets],
	);

	const scenePayload = useMemo(
		() => ({
			...createEmptyScene(selectedAsset?.name || 'Particle Scene'),
			assets: assets.map(({ objectUrl, ...rest }) => rest),
			morphTargets: morphTargets.map(({ sample, ...rest }) => rest),
			config,
			timeline: { playing, currentIndex, progress },
		}),
		[assets, morphTargets, config, playing, currentIndex, progress],
	);

	const patchConfig = useCallback((partial) => {
		setConfig((prev) => {
			const next = { ...prev, ...partial };
			window.clearTimeout(settingsTimerRef.current);
			settingsTimerRef.current = window.setTimeout(() => {
				savePreferredSettings(next);
			}, 250);
			return next;
		});
	}, []);

	const logAction = useCallback((type, message, extra = {}) => {
		setSessionMeta((prev) => ({
			...prev,
			history: pushHistory(prev.history, type, message, extra),
		}));
		setStatus(message);
	}, []);

	const buildSessionPayload = useCallback(
		(nameOverride) =>
			serializeSession({
				id: sessionMeta.id,
				name: nameOverride || sessionMeta.name,
				createdAt: sessionMeta.createdAt,
				selectedId,
				assets,
				config,
				morphTargets,
				timeline: { playing, currentIndex, progress },
				history: sessionMeta.history,
			}),
		[
			sessionMeta,
			selectedId,
			assets,
			config,
			morphTargets,
			playing,
			currentIndex,
			progress,
		],
	);

	const refreshSessions = useCallback(async () => {
		try {
			const res = await fetch('/api/particle-playground/sessions');
			const data = await res.json();
			if (res.ok) setSessions(data.sessions || []);
		} catch {
			/* ignore */
		}
	}, []);

	const saveSession = useCallback(
		async (nameOverride) => {
			setSessionSaving(true);
			try {
				const payload = buildSessionPayload(nameOverride);
				if (nameOverride) {
					setSessionMeta((prev) => ({ ...prev, name: nameOverride }));
				}
				const res = await fetch('/api/particle-playground/sessions', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || 'Failed to save session');
				try {
					localStorage.setItem(SESSION_LS_KEY, payload.id);
				} catch {
					/* ignore */
				}
				await refreshSessions();
				setStatus(`Session saved · ${payload.name}`);
				return payload;
			} catch (error) {
				setStatus(error.message);
				return null;
			} finally {
				setSessionSaving(false);
			}
		},
		[buildSessionPayload, refreshSessions],
	);

	const applySession = useCallback((session) => {
		skipAutosaveRef.current = true;
		undoStackRef.current.clear();
		syncHistoryUi();
		setSessionMeta({
			id: session.id,
			name: session.name || 'Untitled Session',
			createdAt: session.createdAt || new Date().toISOString(),
			history: Array.isArray(session.history) ? session.history : [],
		});
		setAssets(Array.isArray(session.assets) ? session.assets : []);
		setSelectedId(session.selectedId || session.assets?.[0]?.id || null);
		setConfig({ ...DEFAULT_PARTICLE_CONFIG, ...(session.config || {}) });
		setMorphTargets(Array.isArray(session.morphTargets) ? session.morphTargets : []);
		setMorphCloud(null);
		setPlaying(false);
		setCurrentIndex(session.timeline?.currentIndex || 0);
		setProgress(session.timeline?.progress || 0);
		progressRef.current = session.timeline?.progress || 0;
		setRebuildKey((k) => k + 1);
		try {
			localStorage.setItem(SESSION_LS_KEY, session.id);
		} catch {
			/* ignore */
		}
		setTimeout(() => {
			skipAutosaveRef.current = false;
			pushUndoSnapshot({ force: true });
		}, 800);
	}, [syncHistoryUi, pushUndoSnapshot]);

	const loadSession = useCallback(
		async (item) => {
			try {
				const id = item.id || item.filename?.replace(/\.json$/, '');
				const res = await fetch(
					`/api/particle-playground/sessions?id=${encodeURIComponent(id)}`,
				);
				const data = await res.json();
				if (!res.ok || !data.session) throw new Error(data.error || 'Failed to load session');
				applySession(data.session);
				setStatus(`Loaded session · ${data.session.name}`);
			} catch (error) {
				setStatus(error.message);
			}
		},
		[applySession],
	);

	const newSession = useCallback(async () => {
		const shouldSave = window.confirm(
			'Save current session before starting a new one?',
		);
		if (shouldSave) await saveSession();

		const next = createBlankSession(
			`Session ${new Date().toLocaleString()}`,
			loadPreferredSettings(),
		);
		applySession(next);

		setSessionSaving(true);
		try {
			const payload = serializeSession({
				...next,
				selectedId: null,
				assets: [],
				config: next.config,
				morphTargets: [],
				timeline: { playing: false, currentIndex: 0, progress: 0 },
			});
			await fetch('/api/particle-playground/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			try {
				localStorage.setItem(SESSION_LS_KEY, payload.id);
			} catch {
				/* ignore */
			}
			await refreshSessions();
			setStatus(`New session · ${payload.name}`);
		} catch (error) {
			setStatus(error.message);
		} finally {
			setSessionSaving(false);
		}
	}, [saveSession, applySession, refreshSessions]);

	const deleteSession = useCallback(
		async (item) => {
			if (!window.confirm(`Delete session "${item.name}"?`)) return;
			const filename = item.filename || `${item.id}.json`;
			await fetch(
				`/api/particle-playground/sessions?filename=${encodeURIComponent(filename)}`,
				{ method: 'DELETE' },
			);
			if (item.id === sessionMeta.id) {
				const next = createBlankSession('Untitled Session');
				applySession(next);
			}
			await refreshSessions();
			setStatus(`Deleted ${item.name}`);
		},
		[sessionMeta.id, applySession, refreshSessions],
	);

	const refreshAssets = useCallback(async () => {
		try {
			const res = await fetch('/api/particle-playground/assets');
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to list assets');
			setAssets((prev) => {
				const localOnly = prev.filter(
					(a) => a.objectUrl && !a.url?.startsWith('/particle-assets/'),
				);
				const mapped = (data.assets || []).map((a) =>
					createAssetMeta({
						id: `file-${a.url}`,
						name: a.name,
						filename: a.filename,
						url: a.url,
						type: a.type,
						count: config.count,
					}),
				);
				const byUrl = new Map(mapped.map((a) => [a.url, a]));
				for (const local of localOnly) {
					if (!byUrl.has(local.url)) mapped.unshift(local);
				}
				return mapped;
			});
		} catch (error) {
			setStatus(error.message);
		}
	}, [config.count]);

	const refreshPresets = useCallback(async () => {
		try {
			const res = await fetch('/api/particle-playground/presets');
			const data = await res.json();
			if (res.ok) setSavedPresets(data.presets || []);
		} catch {
			/* ignore */
		}
	}, []);

	useEffect(() => {
		refreshAssets();
		refreshPresets();
		refreshSessions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				let restored = false;
				const activeId = localStorage.getItem(SESSION_LS_KEY);
				if (activeId) {
					const res = await fetch(
						`/api/particle-playground/sessions?id=${encodeURIComponent(activeId)}`,
					);
					const data = await res.json();
					if (!cancelled && res.ok && data.session) {
						applySession(data.session);
						setStatus(`Restored session · ${data.session.name}`);
						restored = true;
					}
				}
				if (!cancelled && !restored) {
					skipAutosaveRef.current = false;
				}
			} catch {
				if (!cancelled) skipAutosaveRef.current = false;
			} finally {
				if (!cancelled) setHydrated(true);
			}
		})();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Always keep preferred settings in localStorage for next visits / new sessions
	useEffect(() => {
		if (!hydrated) return undefined;
		window.clearTimeout(settingsTimerRef.current);
		settingsTimerRef.current = window.setTimeout(() => {
			savePreferredSettings(config);
		}, 300);
		return () => window.clearTimeout(settingsTimerRef.current);
	}, [config, hydrated]);

	// Debounced auto-save to JSON sessions folder
	useEffect(() => {
		if (!hydrated || skipAutosaveRef.current) return undefined;
		window.clearTimeout(saveTimerRef.current);
		saveTimerRef.current = window.setTimeout(() => {
			saveSession();
		}, 1200);
		return () => window.clearTimeout(saveTimerRef.current);
	}, [
		hydrated,
		sessionMeta.name,
		sessionMeta.history,
		assets,
		selectedId,
		config,
		morphTargets,
		currentIndex,
		progress,
		saveSession,
	]);

	// Auto-select first asset so canvas isn't empty when library has files
	useEffect(() => {
		if (!selectedId && assets.length > 0) {
			setSelectedId(assets[0].id);
			setStatus(`Previewing ${assets[0].name}`);
		}
	}, [assets, selectedId]);

	const uploadFiles = useCallback(
		async (files) => {
			const list = Array.from(files || []).filter(isAcceptedFile);
			if (!list.length) {
				setStatus('Unsupported file. Use PNG, SVG, JPG, WebP, GIF, or GLB.');
				return;
			}
			setBusy(true);
			try {
				for (const file of list) {
					const objectUrl = URL.createObjectURL(file);
					const temp = createAssetMeta({
						name: sanitizeFilename(file.name.replace(/\.[^.]+$/, '')) || 'asset',
						filename: file.name || `pasted-${Date.now()}.png`,
						url: objectUrl,
						objectUrl,
						type: getAssetType(file.name || 'pasted.png'),
						count: config.count,
					});
					setAssets((prev) => [temp, ...prev]);
					setSelectedId(temp.id);

					const form = new FormData();
					form.append('file', file);
					const res = await fetch('/api/particle-playground/assets', {
						method: 'POST',
						body: form,
					});
					const data = await res.json();
					if (!res.ok) throw new Error(data.error || 'Upload failed');

					setAssets((prev) =>
						prev.map((a) =>
							a.id === temp.id
								? {
										...a,
										...createAssetMeta({
											id: temp.id,
											name: data.asset.name,
											filename: data.asset.filename,
											url: data.asset.url,
											type: data.asset.type,
											count: config.count,
											objectUrl,
										}),
									}
								: a,
						),
					);
					setStatus(`Ready · ${data.asset.filename}`);
					setSessionMeta((prev) => ({
						...prev,
						history: pushHistory(
							prev.history,
							'upload',
							`Uploaded ${data.asset.filename}`,
						),
					}));
				}
			} catch (error) {
				setStatus(error.message);
			} finally {
				setBusy(false);
			}
		},
		[config.count],
	);

	const loadUrl = useCallback(
		async (url) => {
			setBusy(true);
			setStatus('');
			try {
				const temp = createAssetMeta({
					name: sanitizeFilename(url.split('/').pop() || 'remote'),
					filename: url.split('/').pop() || 'remote.png',
					url,
					type: 'image',
					count: config.count,
				});
				setAssets((prev) => [temp, ...prev]);
				setSelectedId(temp.id);

				const res = await fetch('/api/particle-playground/assets', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ url }),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || 'Unable to load image.');
				setAssets((prev) =>
					prev.map((a) =>
						a.id === temp.id
							? createAssetMeta({
									id: temp.id,
									name: data.asset.name,
									filename: data.asset.filename,
									url: data.asset.url,
									type: data.asset.type,
									count: config.count,
								})
							: a,
					),
				);
				setStatus(`Loaded ${data.asset.filename}`);
				setSessionMeta((prev) => ({
					...prev,
					history: pushHistory(prev.history, 'url', `Loaded URL ${data.asset.filename}`),
				}));
			} catch (error) {
				setStatus(
					error.message ||
						'Unable to load image. The server may not allow cross-origin access. Try downloading the image into particle-assets instead.',
				);
			} finally {
				setBusy(false);
			}
		},
		[config.count],
	);

	const deleteAsset = useCallback(
		async (id) => {
			const asset = assets.find((a) => a.id === id);
			if (!asset) return;
			if (asset.url?.startsWith('/particle-assets/')) {
				await fetch(`/api/particle-playground/assets?url=${encodeURIComponent(asset.url)}`, {
					method: 'DELETE',
				});
			}
			// Keep objectUrl alive so Undo can restore a deleted local asset.
			setAssets((prev) => {
				const next = prev.filter((a) => a.id !== id);
				if (selectedId === id) setSelectedId(next[0]?.id || null);
				return next;
			});
			setMorphTargets((prev) => prev.filter((t) => t.assetId !== id));
		},
		[assets, selectedId],
	);

	const ensureMorphSample = useCallback(
		async (asset) => {
			const src = assetSrc(asset);
			if (!src) return null;
			if (asset.type === 'model') return null;
			return sampleAssetFromUrl(src, config.count, {
				alphaThreshold: config.alphaThreshold,
				brightness: config.brightness,
				contrast: config.contrast,
				invertAlpha: config.invertAlpha,
				imageScale: config.imageScale,
				crispText: !!config.crispText,
				rasterSize: config.rasterSize,
				sampleJitter: config.sampleJitter,
			});
		},
		[config],
	);

	const addMorphTarget = useCallback(async () => {
		const asset = selectedAsset;
		if (!asset) {
			setStatus('Select an asset first');
			return;
		}
		try {
			const sample = await ensureMorphSample(asset);
			const target = {
				id: `morph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				assetId: asset.id,
				name: asset.name,
				url: assetSrc(asset),
				sample,
			};
			setMorphTargets((prev) => {
				const next = [...prev, target];
				morphRef.current.setTargets(next);
				return next;
			});
			setStatus(`Morph target added · ${asset.name}`);
			setSessionMeta((prev) => ({
				...prev,
				history: pushHistory(prev.history, 'morph', `Added morph target ${asset.name}`),
			}));
		} catch (error) {
			setStatus(error.message);
		}
	}, [selectedAsset, ensureMorphSample]);

	const rebuildMorphSamples = useCallback(async () => {
		const next = [];
		for (const target of morphTargets) {
			const asset = assets.find((a) => a.id === target.assetId);
			if (!asset) continue;
			try {
				const sample = await ensureMorphSample(asset);
				next.push({ ...target, sample, url: assetSrc(asset), name: asset.name });
			} catch {
				next.push(target);
			}
		}
		setMorphTargets(next);
		morphRef.current.setTargets(next);
		setRebuildKey((k) => k + 1);
		setStatus('Particles rebuilt');
	}, [morphTargets, assets, ensureMorphSample]);

	rebuildMorphRef.current = rebuildMorphSamples;

	useEffect(() => {
		morphRef.current.setTargets(morphTargets);
	}, [morphTargets]);

	useEffect(() => {
		if (!playing || morphTargets.length < 2) return undefined;
		const ease = getEase(config.morphEasing);
		const segment = Math.max(config.morphDuration || 2, 0.2);
		const delay = Math.max(config.morphDelay || 0, 0);
		const max = morphTargets.length - 1;
		playStartRef.current = performance.now() - progressRef.current * segment * 1000;

		const tick = (now) => {
			const elapsed = (now - playStartRef.current) / 1000;
			const cycle = max * segment + delay * max;
			const tCycle = cycle > 0 ? elapsed % cycle : 0;
			const raw = tCycle / segment;
			const i0 = Math.min(Math.floor(raw), max);
			const local = Math.min(1, raw - i0);
			const eased = ease(local);
			const continuous = Math.min(max, i0 + eased);
			progressRef.current = continuous;
			setProgress(continuous);
			setCurrentIndex(Math.round(continuous));
			const cloud = morphRef.current.getCloudAt(continuous);
			if (cloud) setMorphCloud(cloud);
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafRef.current);
	}, [playing, morphTargets, config.morphDuration, config.morphEasing, config.morphDelay]);

	const goIndex = useCallback(
		(index) => {
			if (!morphTargets.length) return;
			const next = Math.max(0, Math.min(morphTargets.length - 1, index));
			setCurrentIndex(next);
			setProgress(next);
			progressRef.current = next;
			const cloud = morphRef.current.getCloudAt(next);
			if (cloud) setMorphCloud(cloud);
		},
		[morphTargets],
	);

	const clearSessionContent = useCallback(() => {
		const ok = window.confirm(
			'هتمسح الـ assets والـ morph من السيشن الحالية عشان تبدأ فاضي على نفس السيشن. متأكد؟',
		);
		if (!ok) return;
		setAssets((prev) => {
			for (const asset of prev) {
				if (asset.objectUrl) URL.revokeObjectURL(asset.objectUrl);
			}
			return [];
		});
		setSelectedId(null);
		setMorphTargets([]);
		setMorphCloud(null);
		setPlaying(false);
		setProgress(0);
		setCurrentIndex(0);
		progressRef.current = 0;
		setRebuildKey((k) => k + 1);
		setSessionMeta((prev) => ({
			...prev,
			history: pushHistory(prev.history, 'reset', 'Cleared session content'),
		}));
		setStatus('Session cleared — upload a new asset');
	}, []);

	const saveScene = useCallback(async () => {
		const name =
			window.prompt('Scene name', selectedAsset?.name || 'particle-scene') ||
			'particle-scene';
		const res = await fetch('/api/particle-playground/presets', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				name,
				filename: `${uniqueFilename(name).replace(/\.[^.]+$/, '')}.json`,
				...scenePayload,
				name,
			}),
		});
		const data = await res.json();
		if (!res.ok) {
			setStatus(data.error || 'Save failed');
			return;
		}
		setStatus(`Saved preset ${data.filename}`);
		setSessionMeta((prev) => ({
			...prev,
			history: pushHistory(prev.history, 'preset', `Saved preset ${data.filename}`),
		}));
		refreshPresets();
	}, [scenePayload, selectedAsset, refreshPresets]);

	// Global drag & drop
	useEffect(() => {
		const hasFiles = (e) =>
			Array.from(e.dataTransfer?.types || []).includes('Files');

		const onDragEnter = (e) => {
			if (!hasFiles(e)) return;
			e.preventDefault();
			dragDepthRef.current += 1;
			setDragging(true);
		};
		const onDragOver = (e) => {
			if (!hasFiles(e)) return;
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
		};
		const onDragLeave = (e) => {
			if (!hasFiles(e)) return;
			e.preventDefault();
			dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
			if (dragDepthRef.current === 0) setDragging(false);
		};
		const onDrop = (e) => {
			e.preventDefault();
			dragDepthRef.current = 0;
			setDragging(false);
			const files = Array.from(e.dataTransfer?.files || []);
			if (files.length) uploadFiles(files);
		};

		window.addEventListener('dragenter', onDragEnter);
		window.addEventListener('dragover', onDragOver);
		window.addEventListener('dragleave', onDragLeave);
		window.addEventListener('drop', onDrop);
		return () => {
			window.removeEventListener('dragenter', onDragEnter);
			window.removeEventListener('dragover', onDragOver);
			window.removeEventListener('dragleave', onDragLeave);
			window.removeEventListener('drop', onDrop);
		};
	}, [uploadFiles]);

	// Ctrl/Cmd+V paste image
	useEffect(() => {
		const onPaste = async (e) => {
			const tag = e.target?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
			const items = Array.from(e.clipboardData?.items || []);
			const imageItems = items.filter((item) => item.type?.startsWith('image/'));
			if (!imageItems.length) return;
			e.preventDefault();
			const files = [];
			for (const item of imageItems) {
				const blob = item.getAsFile();
				if (!blob) continue;
				const ext = item.type.includes('png')
					? 'png'
					: item.type.includes('jpeg')
						? 'jpg'
						: item.type.includes('webp')
							? 'webp'
							: item.type.includes('gif')
								? 'gif'
								: 'png';
				files.push(
					new File([blob], `pasted-${Date.now()}.${ext}`, {
						type: item.type || 'image/png',
					}),
				);
			}
			if (files.length) {
				setStatus('Pasted image from clipboard');
				uploadFiles(files);
			}
		};
		window.addEventListener('paste', onPaste);
		return () => window.removeEventListener('paste', onPaste);
	}, [uploadFiles]);

	useEffect(() => {
		if (!hydrated) return undefined;
		if (undoStackRef.current.applying) return undefined;
		window.clearTimeout(undoTimerRef.current);
		undoTimerRef.current = window.setTimeout(() => {
			pushUndoSnapshot();
		}, 400);
		return () => window.clearTimeout(undoTimerRef.current);
	}, [config, assets, morphTargets, selectedId, currentIndex, hydrated, pushUndoSnapshot]);

	useEffect(() => {
		const onKey = (e) => {
			const tag = e.target?.tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

			const mod = e.ctrlKey || e.metaKey;
			if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
				e.preventDefault();
				undo();
				return;
			}
			if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
				e.preventDefault();
				redo();
				return;
			}

			if (e.code === 'Space') {
				e.preventDefault();
				setPlaying((p) => !p);
			} else if (e.key === 's' || e.key === 'S') {
				e.preventDefault();
				saveSession();
			} else if (e.key === 'e' || e.key === 'E') {
				setCodeOpen(true);
			} else if (e.key === 'l' || e.key === 'L') {
				setLibraryOpen(true);
			} else if (e.key === 'Delete' && selectedId) {
				deleteAsset(selectedId);
			} else if (e.key === 'ArrowLeft') {
				goIndex(currentIndex - 1);
			} else if (e.key === 'ArrowRight') {
				goIndex(currentIndex + 1);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [saveSession, selectedId, deleteAsset, goIndex, currentIndex, undo, redo]);

	const libraryProps = {
		assets,
		selectedId,
		particleCount: config.count,
		onSelect: (id) => {
			setSelectedId(id);
			const asset = assets.find((a) => a.id === id);
			if (asset) setStatus(`Previewing ${asset.name}`);
		},
		onRename: (id, name) =>
			setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, name } : a))),
		onDelete: deleteAsset,
		onDuplicate: (id) => {
			const asset = assets.find((a) => a.id === id);
			if (!asset) return;
			const copy = createAssetMeta({
				...asset,
				id: undefined,
				name: `${asset.name} copy`,
			});
			setAssets((prev) => [copy, ...prev]);
			setSelectedId(copy.id);
		},
	};

	return (
		<div
			dir="ltr"
			className="fixed inset-0 z-[120] flex h-[100dvh] w-full flex-col overflow-hidden bg-[#070708] text-zinc-100 font-[family-name:var(--font-space-grotesk)]"
		>
			{dragging ? (
				<div className="pointer-events-none absolute inset-0 z-[200] flex items-center justify-center bg-emerald-950/50 backdrop-blur-sm">
					<div className="rounded-3xl border-2 border-dashed border-emerald-300/70 bg-zinc-950/90 px-10 py-12 text-center shadow-2xl">
						<Upload className="mx-auto mb-3 h-8 w-8 text-emerald-300" />
						<p className="text-lg font-semibold text-emerald-100">Drop to add asset</p>
						<p className="mt-1 text-sm text-emerald-200/70">PNG, SVG, JPG, WebP, GIF, GLB</p>
					</div>
				</div>
			) : null}

			<input
				ref={fileInputRef}
				type="file"
				accept={ACCEPTED_EXTENSIONS.join(',')}
				multiple
				className="hidden"
				onChange={(e) => {
					const files = Array.from(e.target.files || []);
					if (files.length) uploadFiles(files);
					e.target.value = '';
				}}
			/>

			<header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800/90 px-4">
				<div className="flex min-w-0 items-center gap-2.5">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/30">
						<Sparkles className="h-4 w-4 text-emerald-400" />
					</div>
					<div className="min-w-0">
						<h1 className="text-sm font-semibold tracking-wide">Particle Studio</h1>
						<p className="truncate text-[11px] text-zinc-500">
							{status || `${sessionMeta.name} · auto-save`}
						</p>
					</div>
				</div>
				<div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
					<div className="mr-1 flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/80 p-0.5">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-7 w-8 px-0 text-zinc-300 hover:bg-zinc-900 hover:text-white disabled:opacity-35"
							onClick={undo}
							disabled={!historyUi.canUndo}
							title="Undo (Ctrl+Z)"
						>
							<Undo2 className="h-3.5 w-3.5" />
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="h-7 w-8 px-0 text-zinc-300 hover:bg-zinc-900 hover:text-white disabled:opacity-35"
							onClick={redo}
							disabled={!historyUi.canRedo}
							title="Redo (Ctrl+Y)"
						>
							<Redo2 className="h-3.5 w-3.5" />
						</Button>
					</div>
					<SessionManager
						session={sessionMeta}
						sessions={sessions}
						history={sessionMeta.history}
						saving={sessionSaving}
						onSave={(name) => saveSession(name)}
						onNew={newSession}
						onLoad={loadSession}
						onDelete={deleteSession}
						onRename={(name) => {
							setSessionMeta((prev) => ({ ...prev, name }));
							logAction('rename', `Renamed session to ${name}`);
						}}
					/>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="h-8 border-zinc-700 text-xs text-zinc-100 hover:bg-zinc-900 hover:text-white"
						onClick={() => setLibraryOpen(true)}
						title="Library (L)"
					>
						<Images className="mr-1.5 h-3.5 w-3.5" />
						Library
						{assets.length ? (
							<span className="ml-1 rounded bg-zinc-800 px-1.5 text-[10px] text-zinc-300">
								{assets.length}
							</span>
						) : null}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="h-8 border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-100 hover:bg-emerald-500/20 hover:text-white"
						onClick={() => setCodeOpen(true)}
						title="Copy / Download animation package (E)"
					>
						<Download className="mr-1.5 h-3.5 w-3.5" />
						Export
					</Button>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						className="h-8 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
						onClick={clearSessionContent}
						title="Clear current session content"
					>
						<RotateCcw className="mr-1.5 h-3.5 w-3.5" />
						Reset
					</Button>
				</div>
			</header>

			<div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
				<aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-r border-zinc-800/90 p-3">
					<AssetUploader busy={busy} onUploadFiles={uploadFiles} onLoadUrl={loadUrl} />
					<ImagePrepGuide />
				</aside>

				<section className="flex min-h-0 flex-col p-3">
					<div className="min-h-0 flex-1">
						<ParticleCanvas
							src={activeSrc}
							config={config}
							morphCloud={morphCloud}
							rebuildKey={rebuildKey}
							hasAssets={assets.length > 0}
							onPickFirstAsset={() => {
								if (assets[0]) {
									setSelectedId(assets[0].id);
									setStatus(`Previewing ${assets[0].name}`);
								} else {
									setLibraryOpen(true);
								}
							}}
							onUploadClick={() => fileInputRef.current?.click()}
							onError={(err) => setStatus(err?.message || 'Load error')}
						/>
					</div>
				</section>

				<aside className="min-h-0 overflow-hidden border-l border-zinc-800/90">
					<ControlsPanel
						config={config}
						onChange={patchConfig}
						onRebuild={rebuildMorphSamples}
						presets={allPresets}
						onApplyPreset={(preset) => {
							const next = preset.config || preset;
							setConfig((prev) => ({ ...prev, ...next }));
							if (preset.raw?.assets) setAssets(preset.raw.assets);
							if (preset.raw?.morphTargets) setMorphTargets(preset.raw.morphTargets);
							logAction('preset', `Applied preset: ${preset.name}`);
							setRebuildKey((k) => k + 1);
						}}
						onSavePreset={saveScene}
						onDeletePreset={async () => {
							const filename = window.prompt(
								'Preset filename to delete (e.g. futuristic.json)',
							);
							if (!filename) return;
							await fetch(
								`/api/particle-playground/presets?filename=${encodeURIComponent(filename)}`,
								{ method: 'DELETE' },
							);
							refreshPresets();
						}}
					/>
				</aside>
			</div>

			<MorphTimeline
				targets={morphTargets}
				currentIndex={currentIndex}
				playing={playing}
				progress={progress}
				config={config}
				onChangeConfig={patchConfig}
				onPlayPause={() => setPlaying((p) => !p)}
				onRestart={() => {
					setPlaying(false);
					goIndex(0);
					setTimeout(() => setPlaying(true), 30);
				}}
				onPrev={() => goIndex(currentIndex - 1)}
				onNext={() => goIndex(currentIndex + 1)}
				onReorder={(next) => {
					setMorphTargets(next);
					morphRef.current.setTargets(next);
				}}
				onAddTarget={addMorphTarget}
				onSelectTarget={goIndex}
				onRemoveTarget={(id) =>
					setMorphTargets((prev) => {
						const next = prev.filter((t) => t.id !== id);
						morphRef.current.setTargets(next);
						return next;
					})
				}
			/>

			<LibraryModal
				open={libraryOpen}
				onOpenChange={setLibraryOpen}
				{...libraryProps}
			/>

			<CodePreview
				open={codeOpen}
				onOpenChange={setCodeOpen}
				config={config}
				src={activeSrc || '/particle-assets/svg/demo-logo.svg'}
				scene={scenePayload}
			/>
		</div>
	);
}
