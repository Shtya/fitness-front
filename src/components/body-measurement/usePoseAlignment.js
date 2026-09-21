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

function poseFitsGuide(landmarks, variant) {
	if (!landmarks?.length) return false;
	const nose = landmarks[0];
	const lS = landmarks[11];
	const rS = landmarks[12];
	const lW = landmarks[15];
	const rW = landmarks[16];
	const lH = landmarks[23];
	const rH = landmarks[24];
	const lA = landmarks[27];
	const rA = landmarks[28];
	const core = [nose, lS, rS, lH, rH, lA, rA];
	if (core.some((p) => vis(p) < 0.4)) return false;

	if (nose.y < 0.03 || nose.y > 0.3) return false;
	const ankleY = (lA.y + rA.y) / 2;
	if (ankleY < 0.7 || ankleY > 0.99) return false;

	const midX = (lH.x + rH.x) / 2;
	if (Math.abs(midX - 0.5) > 0.2) return false;

	if (variant === 'front') {
		if (Math.abs(lS.y - rS.y) > 0.09) return false;
		const hipW = Math.abs(lH.x - rH.x);
		const wristSpread = Math.abs(lW.x - rW.x);
		if (vis(lW) > 0.35 && vis(rW) > 0.35 && wristSpread < hipW * 1.08) return false;
		return true;
	}

	const hipW = Math.abs(lH.x - rH.x);
	const shoulderW = Math.abs(lS.x - rS.x);
	return hipW < 0.2 && shoulderW < 0.22;
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

export default function usePoseAlignment(videoRef, { enabled, variant }) {
	const [aligned, setAligned] = useState(false);
	const hitsRef = useRef(0);

	useEffect(() => {
		if (!enabled) {
			setAligned(false);
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
					const ok = poseFitsGuide(pose, variant);
					hitsRef.current = ok ? Math.min(hitsRef.current + 1, 6) : Math.max(hitsRef.current - 1, 0);
					setAligned(hitsRef.current >= 3);
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
	}, [enabled, variant, videoRef]);

	return aligned;
}
