/**
 * Lightweight undo/redo stack for Particle Studio snapshots.
 *
 * past tip = latest committed state. Undo peeks the previous tip.
 */

export function createUndoStack({ limit = 50 } = {}) {
	/** @type {any[]} */
	let past = [];
	/** @type {any[]} */
	let future = [];
	let applying = false;
	let lastFingerprint = '';

	const fingerprint = (snap) => {
		try {
			return JSON.stringify({
				selectedId: snap.selectedId,
				currentIndex: snap.currentIndex,
				config: snap.config,
				assets: (snap.assets || []).map((a) => ({
					id: a.id,
					name: a.name,
					url: a.url,
					filename: a.filename,
				})),
				morphTargets: (snap.morphTargets || []).map((t) => ({
					id: t.id,
					assetId: t.assetId,
					name: t.name,
					url: t.url,
				})),
			});
		} catch {
			return String(Date.now());
		}
	};

	const cloneSnap = (snap) => {
		try {
			return JSON.parse(JSON.stringify(snap));
		} catch {
			return snap;
		}
	};

	return {
		get applying() {
			return applying;
		},
		setApplying(value) {
			applying = !!value;
		},
		canUndo() {
			return past.length >= 2;
		},
		canRedo() {
			return future.length > 0;
		},
		clear() {
			past = [];
			future = [];
			lastFingerprint = '';
		},
		/**
		 * Push a snapshot if it differs from the tip.
		 * @param {any} snapshot
		 * @param {{ force?: boolean }} [opts]
		 */
		push(snapshot, opts = {}) {
			if (applying) return false;
			const fp = fingerprint(snapshot);
			if (!opts.force && fp === lastFingerprint) return false;
			past.push(cloneSnap(snapshot));
			if (past.length > limit) past.shift();
			future = [];
			lastFingerprint = fp;
			return true;
		},
		undo() {
			if (past.length < 2) return null;
			const tip = past.pop();
			future.push(tip);
			const prev = past[past.length - 1];
			lastFingerprint = fingerprint(prev);
			return cloneSnap(prev);
		},
		redo() {
			if (!future.length) return null;
			const next = future.pop();
			past.push(next);
			lastFingerprint = fingerprint(next);
			return cloneSnap(next);
		},
	};
}

/** Strip heavy morph sample buffers before storing history. */
export function stripMorphSamples(morphTargets = []) {
	return morphTargets.map(({ sample, ...rest }) => ({ ...rest }));
}

export function cloneAssetsForHistory(assets = []) {
	return assets.map((a) => ({ ...a }));
}
