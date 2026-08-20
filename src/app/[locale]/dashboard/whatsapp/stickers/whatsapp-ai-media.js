import api from '@/utils/axios';

const MAX_REFERENCE_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = /image\/(webp|png|jpeg|jpg|gif)/i;

export function validateAiReferenceFile(file, ar = false) {
	if (!file) return null;
	const type = String(file.type || '').toLowerCase();
	if (type && !IMAGE_TYPES.test(type) && !type.startsWith('image/')) {
		return ar ? 'المرجع لازم يكون صورة' : 'Reference must be an image';
	}
	if (file.size > MAX_REFERENCE_BYTES) {
		return ar ? 'الصورة كبيرة جدًا (حد أقصى 15MB)' : 'Image is too large (15MB max)';
	}
	return null;
}

export async function fileFromAiMediaResponse(data) {
	const mimeType = String(data?.mimeType || 'image/png').split(';')[0];
	const fileName = data?.fileName || 'ai-media.png';
	const res = await fetch(`data:${mimeType};base64,${data.base64}`);
	const blob = await res.blob();
	return new File([blob], fileName, { type: mimeType });
}

export async function listWhatsAppAiModels(accountId) {
	const { data } = await api.get(`/whatsapp/accounts/${accountId}/ai-media/models`);
	return data;
}

export async function generateWhatsAppAiMedia({
	accountId,
	kind,
	prompt,
	model,
	file,
	stickerId,
	seed,
	signal,
}) {
	const form = new FormData();
	form.append('kind', kind);
	form.append('prompt', prompt);
	if (model) form.append('model', model);
	if (seed != null) form.append('seed', String(seed));
	if (stickerId) form.append('stickerId', stickerId);
	if (file) form.append('file', file);
	const { data } = await api.post(`/whatsapp/accounts/${accountId}/ai-media/generate`, form, {
		signal,
		timeout: 120000,
	});
	const generated = await fileFromAiMediaResponse(data);
	return { file: generated, meta: data };
}
