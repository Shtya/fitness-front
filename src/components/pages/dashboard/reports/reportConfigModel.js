import { arrayMove } from '@dnd-kit/sortable';

export const FIELD_TYPES = ['boolean', 'text', 'number', 'textarea', 'select', 'rating'];
export const DAYS_OF_WEEK = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
export const BUILTIN_SECTIONS = ['diet', 'training', 'measurements', 'photos'];

export const BUILTIN_FIELD_KEYS = {
	diet: ['hungry', 'mentalComfort', 'foodTooMuch', 'dietDeviation', 'wantSpecific'],
	training: ['cardioAdherence', 'intensityOk', 'daysDeviation', 'shapeChange', 'fitnessChange', 'sleepEnough', 'sleepHours', 'programNotes'],
	measurements: ['weight', 'waist', 'chest', 'hips', 'arms', 'thighs'],
	photos: ['front', 'back', 'left', 'right'],
};

export const BUILTIN_FIELD_LABEL_KEYS = {
	hungry: 'weekly.diet.hungry',
	mentalComfort: 'weekly.diet.comfort',
	foodTooMuch: 'weekly.diet.tooMuch',
	dietDeviation: 'weekly.diet.deviation.title',
	wantSpecific: 'weekly.diet.wantSpecific.title',
	cardioAdherence: 'weekly.cardioAdherence',
	intensityOk: 'weekly.training.intensityOk',
	daysDeviation: 'weekly.training.daysDeviation',
	shapeChange: 'weekly.training.shape',
	fitnessChange: 'weekly.training.fitness',
	sleepEnough: 'weekly.training.sleepEnough',
	sleepHours: 'weekly.training.sleepHours',
	programNotes: 'weekly.training.notes.title',
	weight: 'weekly.measurements.weight',
	waist: 'weekly.measurements.waist',
	chest: 'weekly.measurements.chest',
	hips: 'weekly.measurements.hips',
	arms: 'weekly.measurements.arms',
	thighs: 'weekly.measurements.thighs',
	front: 'weekly.photos.front',
	back: 'weekly.photos.back',
	left: 'weekly.photos.left',
	right: 'weekly.photos.right',
};

const OFF_BY_DEFAULT = new Set(['hips', 'arms', 'thighs', 'left', 'right']);
const DEFAULT_TYPES = { shapeChange: 'rating', fitnessChange: 'rating', sleepHours: 'number', programNotes: 'textarea' };

export const isBuiltinGroup = id => BUILTIN_SECTIONS.includes(id);

const defaultFieldsOf = sk =>
	Object.fromEntries(
		BUILTIN_FIELD_KEYS[sk].map(key => [
			key,
			{
				enabled: !OFF_BY_DEFAULT.has(key),
				required: key === 'cardioAdherence',
				type: sk === 'measurements' ? 'number' : DEFAULT_TYPES[key] || 'boolean',
			},
		]),
	);

export function buildDefaultConfig({ initialMessage, reminderMessage }) {
	return {
		groupOrder: [...BUILTIN_SECTIONS],
		sections: Object.fromEntries(BUILTIN_SECTIONS.map(sk => [sk, { enabled: true, customFields: [], fields: defaultFieldsOf(sk) }])),
		customGroups: [],
		notifications: { enabled: true, dayOfWeek: 'SU', sendTime: '09:00', reminderAfterDays: 2, maxReminders: 3, initialMessage, reminderMessage },
	};
}

function deepMerge(target, source) {
	const out = { ...target };
	for (const key of Object.keys(source || {})) {
		const value = source[key];
		out[key] = value && typeof value === 'object' && !Array.isArray(value) ? deepMerge(target?.[key] || {}, value) : value;
	}
	return out;
}

export function normalizeConfig(raw, defaults) {
	const merged = deepMerge(defaults, raw && typeof raw === 'object' ? raw : {});
	const customGroups = Array.isArray(merged.customGroups) ? merged.customGroups.filter(g => g?.id) : [];
	const known = new Set([...BUILTIN_SECTIONS, ...customGroups.map(g => g.id)]);
	const order = (Array.isArray(merged.groupOrder) ? merged.groupOrder : BUILTIN_SECTIONS).filter((id, i, arr) => known.has(id) && arr.indexOf(id) === i);
	customGroups.forEach(g => { if (!order.includes(g.id)) order.push(g.id); });

	const sections = { ...merged.sections };
	BUILTIN_SECTIONS.forEach(sk => {
		const sec = sections[sk] || {};
		sections[sk] = {
			...sec,
			enabled: order.includes(sk) ? sec.enabled !== false : false,
			customFields: Array.isArray(sec.customFields) ? sec.customFields : [],
		};
	});

	return {
		...merged,
		groupOrder: order,
		sections,
		customGroups: customGroups.map(g => ({ ...g, fields: Array.isArray(g.fields) ? g.fields : [] })),
	};
}

export const configSignature = config => JSON.stringify(config);

const isOn = f => f?.enabled !== false;

export function countActiveQuestions(config) {
	let n = 0;
	BUILTIN_SECTIONS.forEach(sk => {
		const sec = config.sections?.[sk];
		if (!sec?.enabled) return;
		Object.values(sec.fields || {}).forEach(f => { if (isOn(f) && !f.removed) n++; });
		(sec.customFields || []).forEach(f => { if (isOn(f)) n++; });
	});
	(config.customGroups || []).forEach(g => {
		if (g.enabled !== false) (g.fields || []).forEach(f => { if (isOn(f)) n++; });
	});
	return n;
}

let seq = 0;
const uid = prefix => `${prefix}_${Date.now().toString(36)}${(++seq).toString(36)}`;

export const newCustomField = () => ({ id: uid('cf'), label: '', type: 'text', required: false, enabled: true, placeholder: '', options: [] });
export const newCustomGroup = label => ({ id: uid('grp'), label, enabled: true, fields: [] });

export function resolveCustomAnswers(answers, config) {
	if (!answers || typeof answers !== 'object') return [];
	const index = new Map();
	BUILTIN_SECTIONS.forEach(sk => (config?.sections?.[sk]?.customFields || []).forEach(f => index.set(`${sk}_${f.id}`, { group: sk, field: f })));
	(config?.customGroups || []).forEach(g => (g.fields || []).forEach(f => index.set(`grp_${g.id}_${f.id}`, { group: g.label || '', field: f })));
	return Object.entries(answers)
		.filter(([, v]) => v !== null && v !== undefined && v !== '')
		.map(([key, value]) => ({ key, value, ...(index.get(key) || { group: null, field: null }) }));
}

export function createConfigActions(setConfig) {
	const customKey = id => (isBuiltinGroup(id) ? 'customFields' : 'fields');
	const mapGroup = (c, id, fn) =>
		isBuiltinGroup(id)
			? { ...c, sections: { ...c.sections, [id]: fn(c.sections[id] || {}) } }
			: { ...c, customGroups: c.customGroups.map(g => (g.id === id ? fn(g) : g)) };
	const mapCustom = (id, fn) => setConfig(c => mapGroup(c, id, g => ({ ...g, [customKey(id)]: fn(g[customKey(id)] || []) })));
	const patchBuiltin = (id, key, patch) =>
		setConfig(c => mapGroup(c, id, g => ({ ...g, fields: { ...g.fields, [key]: { ...(g.fields?.[key] || {}), ...patch } } })));

	return {
		setGroupEnabled: (id, enabled) => setConfig(c => mapGroup(c, id, g => ({ ...g, enabled }))),
		renameGroup: (id, label) => setConfig(c => mapGroup(c, id, g => ({ ...g, label }))),
		addField: (id, field) => mapCustom(id, list => [...list, field]),
		patchCustomField: (id, fieldId, patch) => mapCustom(id, list => list.map(f => (f.id === fieldId ? { ...f, ...patch } : f))),
		removeCustomField: (id, fieldId) => mapCustom(id, list => list.filter(f => f.id !== fieldId)),
		moveCustomField: (id, from, to) => mapCustom(id, list => arrayMove(list, from, to)),
		patchBuiltinField: patchBuiltin,
		removeBuiltinField: (id, key) => patchBuiltin(id, key, { enabled: false, required: false, removed: true }),
		restoreBuiltinFields: id =>
			setConfig(c => mapGroup(c, id, g => ({
				...g,
				fields: Object.fromEntries(Object.entries(g.fields || {}).map(([k, f]) => [k, f?.removed ? { ...f, removed: false, enabled: true } : f])),
			}))),
		addGroup: group => setConfig(c => ({ ...c, customGroups: [...c.customGroups, group], groupOrder: [...c.groupOrder, group.id] })),
		removeGroup: id =>
			setConfig(c => {
				const groupOrder = c.groupOrder.filter(k => k !== id);
				return isBuiltinGroup(id)
					? { ...c, groupOrder, sections: { ...c.sections, [id]: { ...c.sections[id], enabled: false } } }
					: { ...c, groupOrder, customGroups: c.customGroups.filter(g => g.id !== id) };
			}),
		restoreGroup: id =>
			setConfig(c => ({ ...c, groupOrder: [...c.groupOrder, id], sections: { ...c.sections, [id]: { ...c.sections[id], enabled: true } } })),
		moveGroup: (from, to) => setConfig(c => ({ ...c, groupOrder: arrayMove(c.groupOrder, from, to) })),
		setNotif: patch => setConfig(c => ({ ...c, notifications: { ...c.notifications, ...patch } })),
	};
}
