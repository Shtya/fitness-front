import api from '@/utils/axios';
import { targetsFromProfile } from '@/lib/calorie-engine';

export async function fetchCalculations() {
	const { data } = await api.get('/calorie-calculations');
	return Array.isArray(data) ? data : [];
}

export async function saveCalculation(profile, name) {
	const targets = targetsFromProfile(profile);
	if (!targets) return null;
	const body = {
		name: String(name || '').trim() || `${profile.weight || ''} kg`,
		sex: profile.sex === 'female' ? 'female' : 'male',
		age: Number(profile.age),
		height: Number(profile.height),
		weight: Number(profile.weight),
		activity: String(profile.activity || '1.55'),
		goal: String(profile.goal || '0'),
		targets,
	};
	if (profile.bodyFat !== '' && profile.bodyFat != null) body.bodyFat = Number(profile.bodyFat);
	const { data } = await api.post('/calorie-calculations', body);
	return data;
}

export function upsertDeviceProfile() {
	return null;
}
