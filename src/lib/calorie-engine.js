/** Same Mifflin–St Jeor path the site calculator uses. */

export const ACTIVITY_MULTIPLIERS = [
	{ id: '1.2', level: 'sedentary' },
	{ id: '1.375', level: 'light' },
	{ id: '1.55', level: 'moderate' },
	{ id: '1.725', level: 'active' },
	{ id: '1.9', level: 'athlete' },
];

export const GOAL_PERCENTS = ['-20', '-10', '0', '+10', '+20'];

export function toNumber(value, fallback = 0) {
	if (value === '' || value == null) return fallback;
	const n = Number(String(value).replace(/,/g, '.'));
	return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}

export function ageFromBirth(iso) {
	if (!iso) return '';
	const born = new Date(iso);
	if (Number.isNaN(born.getTime())) return '';
	const now = new Date();
	let age = now.getFullYear() - born.getFullYear();
	const month = now.getMonth() - born.getMonth();
	if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age -= 1;
	return age > 0 && age < 120 ? String(age) : '';
}

export function bmrMifflin({ sex, weightKg, heightCm, age }) {
	if (!sex || !weightKg || !heightCm || !age) return 0;
	const sexOffset = sex === 'male' ? 5 : -161;
	return 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;
}

export function activityLevelFromMultiplier(id) {
	return ACTIVITY_MULTIPLIERS.find(row => row.id === String(id))?.level || 'moderate';
}

/**
 * @returns {null | { caloriesTarget: number, proteinPerDay: number, carbsPerDay: number, fatsPerDay: number, FiberTarget: number, activityLevel: string }}
 */
export function targetsFromProfile(profile = {}) {
	const sex = profile.sex === 'female' ? 'female' : profile.sex === 'male' ? 'male' : '';
	const age = toNumber(profile.age, 0);
	const height = toNumber(profile.height, 0);
	const weight = toNumber(profile.weight, 0);
	const bodyFat = clamp(toNumber(profile.bodyFat, 0), 0, 70);
	const activity = ACTIVITY_MULTIPLIERS.some(row => row.id === String(profile.activity)) ? String(profile.activity) : '1.55';
	const goal = GOAL_PERCENTS.includes(String(profile.goal)) ? String(profile.goal) : '0';
	if (!sex || !age || !height || !weight) return null;

	const bmr = bmrMifflin({ sex, weightKg: weight, heightCm: height, age });
	const tdee = bmr * parseFloat(activity);
	const targetCalories = tdee * (1 + parseFloat(goal) / 100);
	const lean = bodyFat ? weight * (1 - bodyFat / 100) : weight;
	const protein = clamp(2.2 * lean, 80, 250);
	const fat = clamp(0.9 * lean, 40, 140);
	const carbs = Math.max(0, (targetCalories - protein * 4 - fat * 9) / 4);

	return {
		caloriesTarget: Math.round(targetCalories),
		proteinPerDay: Math.round(protein),
		carbsPerDay: Math.round(carbs),
		fatsPerDay: Math.round(fat),
		FiberTarget: Math.round(targetCalories / 80),
		activityLevel: activityLevelFromMultiplier(activity),
	};
}

function firstNumber(value) {
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	if (value && typeof value === 'object') {
		if ('value' in value) return firstNumber(value.value);
		return '';
	}
	const match = String(value ?? '').replace(/,/g, '.').match(/-?\d+(?:\.\d+)?/);
	return match ? match[0] : '';
}

function sexFrom(value) {
	const text = String(value ?? '').toLowerCase();
	if (/female|woman|أنث|انث|ست|بنت/.test(text)) return 'female';
	if (/male|man|ذكر|رجل/.test(text)) return 'male';
	return '';
}

const ANSWER_HINTS = [
	['height', /height|tall|طول|قامه|قامة|هايت/i],
	['age', /(^|[^a-z])age([^a-z]|$)|عمر|السن/i],
	['sex', /gender|sex|جنس/i],
	['bodyFat', /body\s*fat|دهون/i],
	['weight', /weight|وزن/i],
];

/** Pull weight, height, age, sex, and body fat out of form answers. */
export function bodyFromAnswers(answers, seed = {}) {
	return bodyFromReport({ customAnswers: answers && typeof answers === 'object' ? answers : {} }, seed);
}

/** Pull weight and any height / age / sex / body-fat answers off a weekly report. */
export function bodyFromReport(report, seed = {}) {
	const body = {
		sex: seed.sex || '',
		age: seed.age || '',
		height: seed.height || '',
		weight: seed.weight || '',
		bodyFat: seed.bodyFat || '',
	};
	const weight = firstNumber(report?.measurements?.weight);
	if (weight) body.weight = weight;

	const answers = report?.customAnswers && typeof report.customAnswers === 'object' ? report.customAnswers : {};
	for (const [key, value] of Object.entries(answers)) {
		for (const [field, pattern] of ANSWER_HINTS) {
			if (!pattern.test(String(key))) continue;
			if (field === 'sex') body.sex = sexFrom(value) || body.sex;
			else {
				const n = firstNumber(value);
				if (!n) continue;
				if (field === 'height' && Number(n) > 0 && Number(n) < 3) body.height = String(Math.round(Number(n) * 100));
				else body[field] = n;
			}
		}
	}
	return body;
}
