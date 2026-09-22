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

function clamp01(n) {
	return Math.max(0, Math.min(1, n));
}

function rangeScore(value, goodLo, goodHi, failLo, failHi) {
	if (!Number.isFinite(value)) return 0;
	if (value >= goodLo && value <= goodHi) return 1;
	if (value < goodLo) {
		if (value <= failLo) return 0;
		return (value - failLo) / (goodLo - failLo);
	}
	if (value >= failHi) return 0;
	return (failHi - value) / (failHi - goodHi);
}

export function evaluatePose(landmarks, variant, zoom = 1) {
	if (!landmarks?.length) return { ok: false, issue: 'noPerson', score: 0 };

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
	const visAvg = core.reduce((sum, pt) => sum + (pt?.v || 0), 0) / core.length;
	const visPart = clamp01((visAvg - 0.15) / 0.55);

	if (core.some((pt) => !pt)) return { ok: false, issue: 'noPerson', score: Math.round(visPart * 12) };

	const xs = [lS, rS, lH, rH, lA, rA];
	const xInside = xs.reduce((sum, pt) => {
		if (pt.x >= 0.08 && pt.x <= 0.92) return sum + 1;
		if (pt.x < 0.08) return sum + rangeScore(pt.x, 0.08, 1, -0.1, 1);
		return sum + rangeScore(pt.x, 0, 0.92, 0, 1.1);
	}, 0) / xs.length;

	const headPart = rangeScore(nose.y, 0.1, 0.28, 0.0, 0.48);
	const footY = Math.max(lA.y, rA.y, lHeel?.y || 0, rHeel?.y || 0);
	const feetPart = rangeScore(footY, 0.72, 0.9, 0.5, 1.02);

	const midX = (lH.x + rH.x) / 2;
	const centerPart = rangeScore(Math.abs(midX - 0.5), 0, 0.12, 0, 0.42);

	let extraPart = 1;
	let extraIssue = null;
	if (variant === 'front') {
		const levelPart = rangeScore(Math.abs(lS.y - rS.y), 0, 0.05, 0, 0.16);
		const hipW = Math.abs(lH.x - rH.x) || 0.01;
		const wristSpread = Math.abs((lW?.x || midX) - (rW?.x || midX));
		const armsPart = lW?.v > 0.3 && rW?.v > 0.3
			? clamp01((wristSpread / hipW - 0.85) / 0.5)
			: 0.45;
		extraPart = (levelPart + armsPart) / 2;
		if (armsPart < 0.55) extraIssue = 'arms';
		else if (levelPart < 0.55) extraIssue = 'center';
	} else {
		const hipW = Math.abs(lH.x - rH.x);
		const shoulderW = Math.abs(lS.x - rS.x);
		const sidePart = (rangeScore(hipW, 0, 0.14, 0, 0.36) + rangeScore(shoulderW, 0, 0.16, 0, 0.4)) / 2;
		extraPart = sidePart;
		if (sidePart < 0.55) extraIssue = 'side';
	}

	const parts = [
		visPart * 0.18,
		xInside * 0.14,
		headPart * 0.22,
		feetPart * 0.22,
		centerPart * 0.12,
		extraPart * 0.12,
	];
	const score = Math.round(clamp01(parts.reduce((a, b) => a + b, 0)) * 100);

	let issue = null;
	if (visPart < 0.45 || core.some((pt) => pt.v < 0.35)) issue = 'notFull';
	else if (headPart < 0.55 && nose.y < 0.1) issue = 'head';
	else if (feetPart < 0.55 && footY > 0.9) issue = 'feet';
	else if (headPart < 0.55 || feetPart < 0.55) issue = 'tooFar';
	else if (xInside < 0.55) issue = 'notFull';
	else if (centerPart < 0.55) issue = 'center';
	else if (extraIssue) issue = extraIssue;

	const ok = score >= 86
		&& headPart >= 0.72
		&& feetPart >= 0.72
		&& visPart >= 0.55
		&& !['head', 'feet', 'notFull', 'noPerson'].includes(issue || '');

	return { ok, issue: ok ? null : issue || 'notFull', score };
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
	const [score, setScore] = useState(0);
	const hitsRef = useRef(0);
	const scoreRef = useRef(0);

	useEffect(() => {
		if (!enabled) {
			setAligned(false);
			setIssue('noPerson');
			setScore(0);
			hitsRef.current = 0;
			scoreRef.current = 0;
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
					scoreRef.current = scoreRef.current * 0.55 + next.score * 0.45;
					setAligned(hitsRef.current >= 4);
					setIssue(next.ok ? null : next.issue);
					setScore(Math.round(scoreRef.current));
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

	return { aligned, issue, score };
}
