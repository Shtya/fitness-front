'use client';

import { useEffect, useRef } from 'react';

/** World size every canvas game draws in; scaled to the element (and device pixels) on each frame. */
export const WORLD = 400;

/**
 * Smooth fixed-world loop: `update(dt)` with dt in seconds (clamped so a hiccup can't teleport
 * things), then `draw(ctx)` in a 400×400 world. Runs only while `running` is true.
 */
export function useCanvasLoop(canvasRef, { running, update, draw }) {
	const fns = useRef({ update, draw });
	fns.current = { update, draw };

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return undefined;
		const ctx = canvas.getContext('2d');
		let raf = 0;
		let last = 0;

		const frame = now => {
			const size = canvas.clientWidth;
			const dpr = window.devicePixelRatio || 1;
			const px = Math.round(size * dpr);
			if (canvas.width !== px) {
				canvas.width = px;
				canvas.height = px;
			}
			const dt = last ? Math.min(0.033, (now - last) / 1000) : 0;
			last = now;
			if (running && dt) fns.current.update(dt);
			ctx.setTransform((size * dpr) / WORLD, 0, 0, (size * dpr) / WORLD, 0, 0);
			fns.current.draw(ctx);
			if (running) raf = requestAnimationFrame(frame);
		};

		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	}, [canvasRef, running]);
}

export function readTheme(el) {
	const cs = getComputedStyle(el);
	const v = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
	return {
		board: v('--wg-board', '#eef1ed'),
		grid: v('--wg-grid', '#e6eae4'),
		ink: v('--wg-ink', '#111b21'),
		muted: v('--wg-muted', '#667781'),
		accent: v('--wg-accent', '#25d366'),
		strong: v('--wg-accent-strong', '#128c4f'),
		danger: v('--wg-danger', '#f15c6d'),
		paper: v('--wg-paper', '#ffffff'),
	};
}

/** Pointer x (0..WORLD) relative to the canvas. */
export function worldX(event, canvas) {
	const r = canvas.getBoundingClientRect();
	return ((event.clientX - r.left) / r.width) * WORLD;
}
