export const easeFunctions = {
	linear: (t) => t,
	'power2.inOut': (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
	'power2.out': (t) => 1 - (1 - t) * (1 - t),
	'power2.in': (t) => t * t,
	'power3.inOut': (t) =>
		t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
	'sine.inOut': (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

export function getEase(name = 'power2.inOut') {
	return easeFunctions[name] || easeFunctions['power2.inOut'];
}

export function lerpClouds(from, to, t) {
	const count = Math.min(
		from.positions.length,
		to.positions.length,
	);
	const positions = new Float32Array(count);
	const colors = new Float32Array(count);
	const u = Math.max(0, Math.min(1, t));
	for (let i = 0; i < count; i++) {
		positions[i] = from.positions[i] + (to.positions[i] - from.positions[i]) * u;
		colors[i] = from.colors[i] + (to.colors[i] - from.colors[i]) * u;
	}
	return { positions, colors, shades: from.shades };
}

export function createMorphController() {
	let targets = [];

	return {
		get targets() {
			return targets;
		},
		setTargets(next = []) {
			targets = Array.isArray(next) ? next : [];
		},
		getCloudAt(progress) {
			if (!targets.length) return null;
			if (targets.length === 1) return targets[0].sample || null;
			const max = targets.length - 1;
			const clamped = Math.max(0, Math.min(max, progress));
			const i0 = Math.floor(clamped);
			const i1 = Math.min(max, i0 + 1);
			const local = clamped - i0;
			const a = targets[i0]?.sample;
			const b = targets[i1]?.sample;
			if (!a) return null;
			if (!b || i0 === i1) return a;
			return lerpClouds(a, b, local);
		},
		indexAt(progress) {
			if (!targets.length) return 0;
			return Math.max(0, Math.min(targets.length - 1, Math.round(progress)));
		},
		nextIndex(current) {
			if (!targets.length) return 0;
			return (current + 1) % targets.length;
		},
		prevIndex(current) {
			if (!targets.length) return 0;
			return (current - 1 + targets.length) % targets.length;
		},
	};
}
