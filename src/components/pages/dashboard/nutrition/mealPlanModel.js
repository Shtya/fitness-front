import * as yup from 'yup';

export const DAY_KEYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
export const UNITS = ['g', 'mg', 'count'];

const hhmmRegex = /^$|^([01]\d|2[0-3]):([0-5]\d)$/;
const emptyToNull = (value, original) => (original === '' || original == null ? null : value);

const normalizeUnit = u => (u === 'mg' ? 'mg' : u === 'count' ? 'count' : 'g');
const normalizeTime = v => {
	const s = String(v ?? '').trim();
	const m = s.match(/^(\d{1,2}):(\d{2})/);
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
};
const coerceNum = (v, d = 0) => {
	const n = Number(v);
	return Number.isFinite(n) ? n : d;
};
const numOrNull = v => (v == null || v === '' ? null : coerceNum(v, null));

export const toDecimalInput = v => String(v ?? '')
	.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
	.replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
	.replace(/[,،٫]/g, '.')
	.replace(/[^\d.]/g, '')
	.replace(/(\..*)\./g, '$1');

export const blankItem = () => ({ name: '', type: 'food', id: null, sourceId: null, quantity: null, unit: 'g', calories: 0, alternative: null, alternatives: [] });
export const blankAlternative = () => ({ name: '', type: 'food', id: null, quantity: null, unit: 'g', calories: 0 });
export const blankSupplement = () => ({ name: '', time: '', bestWith: '' });
export const blankMeal = title => ({ title, time: '', items: [blankItem()], supplements: [] });
export const emptyOverrides = () => Object.fromEntries(DAY_KEYS.map(k => [k, []]));

export function buildPlanSchema(t) {
	const altSchema = yup.object().shape({
		name: yup.string().trim().default(''),
		type: yup.string().oneOf(['food', 'recipe']).default('food'),
		id: yup.string().nullable(),
		unit: yup.string().oneOf(UNITS).default('g'),
		quantity: yup.number().transform(emptyToNull).nullable(),
		calories: yup.number().transform(emptyToNull).min(0).nullable(),
	});

	const itemSchema = yup.object().shape({
		name: yup.string().trim().required(t('validation.required')),
		type: yup.string().oneOf(['food', 'recipe']).default('food'),
		id: yup.string().nullable(),
		unit: yup.string().oneOf(UNITS).default('g'),
		quantity: yup.number().transform(emptyToNull).typeError(t('validation.number')).min(0, t('validation.min')).nullable(),
		calories: yup.number().transform(emptyToNull).typeError(t('validation.number')).min(0, t('validation.min')).required(t('validation.required')),
		alternative: yup.object().nullable().shape({
			name: yup.string().trim().default(''),
			type: yup.string().oneOf(['food', 'recipe']).default('food'),
			id: yup.string().nullable(),
			unit: yup.string().oneOf(UNITS).default('g'),
			quantity: yup.number().nullable(),
			calories: yup.number().min(0).default(0),
		}),
		alternatives: yup.array().of(altSchema).default([]),
	});

	const supplementSchema = yup.object().shape({
		name: yup.string().trim().required(t('validation.required')),
		time: yup.string().transform(v => (v == null ? '' : v)).matches(hhmmRegex, t('validation.hhmm')).nullable(),
		bestWith: yup.string().trim().nullable(),
	});

	const mealSchema = yup.object().shape({
		title: yup.string().trim().required(t('validation.required')),
		time: yup.string().transform(v => (v == null ? '' : v)).matches(hhmmRegex, t('validation.hhmm')).nullable(),
		items: yup.array().of(itemSchema).min(1, t('validation.add_item')),
		supplements: yup.array().of(supplementSchema),
	});

	return yup.object().shape({
		name: yup.string().trim().required(t('validation.plan_name_required')),
		description: yup.string().trim().nullable(),
		baseMeals: yup.array().of(mealSchema).min(1, t('validation.add_meal')),
		customizeDays: yup.boolean(),
		dayOverrides: yup.object().shape(Object.fromEntries(DAY_KEYS.map(k => [k, yup.array().of(mealSchema)]))),
	});
}

/* ─────────────────────────── Mapping ─────────────────────────── */
function sanitizeItem(it) {
	const alt = it?.alternative;
	const hasAlt = alt && String(alt?.name ?? '').trim();
	const resolvedId = it?.sourceId ?? it?.id ?? null;
	return {
		name: it?.name ?? '',
		type: it?.type === 'recipe' || it?.itemType === 'recipe' ? 'recipe' : 'food',
		id: resolvedId,
		sourceId: resolvedId,
		unit: normalizeUnit(it?.unit),
		quantity: numOrNull(it?.quantity),
		calories: coerceNum(it?.calories),
		alternative: hasAlt
			? { name: String(alt.name).trim(), type: alt?.type === 'recipe' ? 'recipe' : 'food', id: alt?.id ?? null, quantity: numOrNull(alt.quantity), unit: normalizeUnit(alt.unit), calories: coerceNum(alt.calories) }
			: null,
		alternatives: Array.isArray(it?.alternatives)
			? it.alternatives.map(a => ({
				name: a?.name ?? '',
				type: a?.type === 'recipe' || a?.itemType === 'recipe' ? 'recipe' : 'food',
				id: a?.id ?? a?.sourceId ?? null,
				quantity: numOrNull(a?.quantity),
				unit: normalizeUnit(a?.unit),
				calories: numOrNull(a?.calories),
			}))
			: [],
	};
}

const sanitizeSupplement = s => ({ name: s?.name ?? '', time: normalizeTime(s?.time), bestWith: s?.bestWith ? String(s.bestWith) : '' });

export const cloneMeals = (meals = []) => (meals || []).map(m => ({
	title: m?.title ?? '',
	time: normalizeTime(m?.time),
	items: (m?.items || []).map(sanitizeItem),
	supplements: (m?.supplements || []).map(sanitizeSupplement),
}));

const toServerMeals = (meals = []) => cloneMeals(meals).map(m => ({ ...m, time: m.time || null }));

const legacyFoodsToMeals = (foods = []) => (foods?.length ? [{ title: 'Meal', time: '', items: foods, supplements: [] }] : []);
export const dayMealsOf = day => (day?.meals?.length ? day.meals : legacyFoodsToMeals(day?.foods));

const signature = meals => JSON.stringify(toServerMeals(meals));

export function planToFormValues(plan, defaultMealTitle) {
	const fallback = [blankMeal(defaultMealTitle)];
	if (!plan) {
		return { name: '', description: '', notesList: [], baseMeals: fallback, customizeDays: false, dayOverrides: emptyOverrides() };
	}

	const days = (plan.days || []).map(d => ({ key: String(d.day || '').toLowerCase(), meals: dayMealsOf(d) })).filter(d => d.meals.length);
	const counts = new Map();
	for (const d of days) {
		d.sig = signature(d.meals);
		counts.set(d.sig, (counts.get(d.sig) || 0) + 1);
	}
	const baseSig = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
	const baseDay = days.find(d => d.sig === baseSig);

	const dayOverrides = emptyOverrides();
	for (const d of days) {
		if (d.sig !== baseSig && DAY_KEYS.includes(d.key)) dayOverrides[d.key] = cloneMeals(d.meals);
	}
	const hasOverrides = DAY_KEYS.some(k => dayOverrides[k].length);

	return {
		name: plan.name || '',
		description: plan.desc || plan.description || '',
		notesList: String(plan.notes || '').split('\n').map(s => s.trim()).filter(Boolean),
		baseMeals: baseDay ? cloneMeals(baseDay.meals) : fallback,
		customizeDays: hasOverrides,
		dayOverrides,
	};
}

export function formToPayload(data, notes) {
	const dayOverrides = {};
	if (data.customizeDays) {
		for (const k of DAY_KEYS) {
			const meals = data?.dayOverrides?.[k] || [];
			if (meals.length) dayOverrides[k] = { day: k, meals: toServerMeals(meals), supplements: [] };
		}
	}
	return {
		name: data.name,
		description: data.description || '',
		notes: notes.join('\n'),
		baseMeals: toServerMeals(data.baseMeals),
		customizeDays: !!data.customizeDays,
		dayOverrides: Object.keys(dayOverrides).length ? dayOverrides : undefined,
	};
}

export const mealKcal = meal => (meal?.items || []).reduce((sum, it) => sum + coerceNum(it?.calories), 0);
export const mealsKcal = meals => (meals || []).reduce((sum, m) => sum + mealKcal(m), 0);

/* ─────────────────────────── AI ─────────────────────────── */
export function buildAiPrompt(userText) {
	return `Return ONLY valid JSON matching exactly:
{"name":"Plan Name","description":"Short description","notes":["bullet 1"],"meals":[{"title":"Meal 1","time":"08:00","items":[{"name":"Oats","quantity":80,"calories":320,"unit":"g"}],"supplements":[{"name":"Multivitamin","time":"08:30","bestWith":"water"}]}]}
Rules: 24h HH:MM for time (or empty string). Items ONLY: name, quantity, calories, unit ("g"|"mg"|"count"). Return VALID JSON without markdown fences.
User description: ${userText}`;
}

const stripFence = s => {
	const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
	return m ? m[1] : s;
};

export function parseAiPlan(raw) {
	const isPlan = v => v && typeof v === 'object' && (v.meals || v.name);
	if (isPlan(raw)) return raw;
	const content = raw?.content ?? raw?.choices?.[0]?.message?.content ?? raw;
	if (isPlan(content)) return content;
	if (typeof content === 'string') {
		try {
			const parsed = JSON.parse(stripFence(content.trim()));
			if (parsed && typeof parsed === 'object') return parsed;
		} catch {
			return null;
		}
	}
	return null;
}

export const aiMealsToForm = (meals, defaultTitle) => (Array.isArray(meals) ? meals : []).map(m => ({
	title: m?.title || defaultTitle,
	time: normalizeTime(m?.time),
	items: (m?.items || []).map(it => ({
		...blankItem(),
		name: String(it?.name || '').trim(),
		quantity: numOrNull(it?.quantity),
		calories: coerceNum(it?.calories),
		unit: normalizeUnit(it?.unit),
	})),
	supplements: (m?.supplements || []).map(sanitizeSupplement),
}));

export function getErr(errors, path) {
	let cur = errors;
	for (const s of path.split('.')) cur = cur?.[s];
	return typeof cur?.message === 'string' ? cur.message : undefined;
}
