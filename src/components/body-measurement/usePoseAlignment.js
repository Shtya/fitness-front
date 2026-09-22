'use client';

import { useEffect, useRef, useState } from 'react';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

function vis(lm) {
	if (!lm) return 0;
	if (lm.visibility != null) return lm.visibility;
	if (lm.presence != null) return lm.presence;
	return 0;
}

function toCrop(lm, zoom) {
	const z = Math.max(1, Number(zoom) || 1);
	const inset = (1 - 1 / z) / 2;
	return {
		x: (lm.x - inset) * z,
		y: (lm.y - inset) * z,
		v: vis(lm),
	};
}

export function evaluatePose(landmarks, variant, zoom = 1) {
	if (!landmarks?.length) return { ok: false, issue: 'noPerson' };

	const p = (i) => (landmarks[i] ? toCrop(landmarks[i], zoom) : null);
	const nose = p(0);
	const lS = p(11);
	const rS = p(12);
	const lW = p(15);
	const rW = p(16);
	const lH = p(23);
	const rH = p(24);
	const lA = p(27);
	const rA = p(28);
	const lHeel = p(29);
	const rHeel = p(30);

	const core = [nose, lS, rS, lH, rH, lA, rA];
	if (core.some((pt) => !pt || pt.v < 0.4)) return { ok: false, issue: 'notFull' };

	if ([lS, rS, lH, rH, lA, rA].some((pt) => pt.x < 0.06 || pt.x > 0.94)) {
		return { ok: false, issue: 'notFull' };
	}

	if (nose.y < 0.1) return { ok: false, issue: 'head' };
	if (nose.y > 0.28) return { ok: false, issue: 'tooFar' };

	const footY = Math.max(lA.y, rA.y, lHeel?.y || 0, rHeel?.y || 0);
	if (footY > 0.9) return { ok: false, issue: 'feet' };
	if (footY < 0.72) return { ok: false, issue: 'tooFar' };

	const midX = (lH.x + rH.x) / 2;
	if (Math.abs(midX - 0.5) > 0.18) return { ok: false, issue: 'center' };

	if (variant === 'front') {
		if (Math.abs(lS.y - rS.y) > 0.09) return { ok: false, issue: 'center' };
		const hipW = Math.abs(lH.x - rH.x);
		const wristSpread = Math.abs((lW?.x || 0) - (rW?.x || 0));
		if (lW?.v > 0.35 && rW?.v > 0.35 && wristSpread < hipW * 1.08) {
			return { ok: false, issue: 'arms' };
		}
		return { ok: true, issue: null };
	}

	const hipW = Math.abs(lH.x - rH.x);
	const shoulderW = Math.abs(lS.x - rS.x);
	if (hipW > 0.2 || shoulderW > 0.22) return { ok: false, issue: 'side' };
	return { ok: true, issue: null };
}

let landmarkerPromise;

async function getLandmarker() {
	if (!landmarkerPromise) {
		landmarkerPromise = (async () => {
			const vision = await import('@mediapipe/tasks-vision');
			const files = await vision.FilesetResolver.forVisionTasks(WASM);
			try {
				return await vision.PoseLandmarker.createFromOptions(files, {
					baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
					runningMode: 'VIDEO',
					numPoses: 1,
				});
			} catch {
				return vision.PoseLandmarker.createFromOptions(files, {
					baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
					runningMode: 'VIDEO',
					numPoses: 1,
				});
			}
		})().catch((err) => {
			landmarkerPromise = null;
			throw err;
		});
	}
	return landmarkerPromise;
}

export default function usePoseAlignment(videoRef, { enabled, variant, zoom = 1 }) {
	const [aligned, setAligned] = useState(false);
	const [issue, setIssue] = useState('noPerson');
	const hitsRef = useRef(0);

	useEffect(() => {
		if (!enabled) {
			setAligned(false);
			setIssue('noPerson');
			hitsRef.current = 0;
			return undefined;
		}

		let cancelled = false;
		let raf = 0;
		let last = 0;

		(async () => {
			let landmarker;
			try {
				landmarker = await getLandmarker();
			} catch {
				return;
			}
			if (cancelled) return;

			const loop = () => {
				if (cancelled) return;
				raf = window.requestAnimationFrame(loop);
				const video = videoRef.current;
				if (!video || video.readyState < 2) return;
				const now = performance.now();
				if (now - last < 140) return;
				last = now;
				try {
					const result = landmarker.detectForVideo(video, now);
					const pose = result?.landmarks?.[0];
					const next = evaluatePose(pose, variant, zoom);
					hitsRef.current = next.ok ? Math.min(hitsRef.current + 1, 8) : Math.max(hitsRef.current - 2, 0);
					setAligned(hitsRef.current >= 4);
					setIssue(next.ok ? null : next.issue);
				} catch {
					/* keep last state */
				}
			};
			raf = window.requestAnimationFrame(loop);
		})();

		return () => {
			cancelled = true;
			window.cancelAnimationFrame(raf);
		};
	}, [enabled, variant, videoRef, zoom]);

	return { aligned, issue };
}
