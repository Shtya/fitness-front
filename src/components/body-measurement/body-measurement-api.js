import api from '@/utils/axios';

export async function fetchBodyMeasurements(userId) {
	const { data } = await api.get(`/users/${userId}/body-measurements`);
	return data;
}

export async function fetchLatestBodyMeasurement(userId) {
	const { data } = await api.get(`/users/${userId}/body-measurements/latest`);
	return data;
}

export async function analyzeBodyMeasurements(userId, { frontBlob, sideBlob, height }) {
	const form = new FormData();
	form.append('height', String(height));
	form.append('front', frontBlob, 'front.jpg');
	form.append('side', sideBlob, 'side.jpg');
	const { data } = await api.post(`/users/${userId}/body-measurements/analyze`, form, {
		timeout: 120000,
	});
	return data;
}

export async function saveBodyMeasurements(userId, payload) {
	const { data } = await api.post(`/users/${userId}/body-measurements`, payload);
	return data;
}

export async function replaceBodyMeasurements(userId, payload) {
	const { data } = await api.put(`/users/${userId}/body-measurements`, {
		...payload,
		replaceExisting: true,
	});
	return data;
}
