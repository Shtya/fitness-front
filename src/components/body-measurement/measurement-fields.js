export const MEASUREMENT_FIELDS = [
	{ key: 'height', kind: 'height' },
	{ key: 'shoulderWidth', kind: 'width' },
	{ key: 'chest', kind: 'circ' },
	{ key: 'waist', kind: 'circ' },
	{ key: 'hips', kind: 'circ' },
	{ key: 'upperArm', kind: 'circ' },
	{ key: 'thigh', kind: 'circ' },
	{ key: 'inseam', kind: 'length' },
];

export function emptyEstimates(height = '') {
	return {
		height: height === '' ? '' : height,
		shoulderWidth: '',
		chest: '',
		waist: '',
		hips: '',
		upperArm: '',
		thigh: '',
		inseam: '',
		unit: 'cm',
		confidence: {},
	};
}

export function fromApiEstimates(estimates = {}, fallbackHeight) {
	const next = emptyEstimates(fallbackHeight);
	for (const { key } of MEASUREMENT_FIELDS) {
		const value = estimates[key];
		next[key] = value == null || value === '' ? '' : String(value);
	}
	next.unit = estimates.unit || 'cm';
	next.confidence = estimates.confidence || {};
	return next;
}

export function toSavePayload(values, { source = 'ai', confidence, replaceExisting = false, date } = {}) {
	const num = (v) => {
		if (v === '' || v == null) return null;
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	};
	return {
		date: date || new Date().toISOString().slice(0, 10),
		height: num(values.height),
		shoulderWidth: num(values.shoulderWidth),
		chest: num(values.chest),
		waist: num(values.waist),
		hips: num(values.hips),
		upperArm: num(values.upperArm),
		thigh: num(values.thigh),
		inseam: num(values.inseam),
		unit: values.unit || 'cm',
		source,
		confidence: confidence || values.confidence || null,
		replaceExisting,
	};
}
