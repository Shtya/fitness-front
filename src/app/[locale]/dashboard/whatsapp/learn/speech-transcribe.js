/*
 * Speech-to-text for a speaking recording, through the app's own transcription service
 * (/transcriptions — Whisper / Groq / Deepgram, whichever is set up). Used when the browser has no
 * working live recogniser (Brave, Firefox) or heard nothing.
 * The service keeps a history record; we delete it so practice clips don't fill the Transcript page.
 */

import api from '@/utils/axios';

const extOf = type => (/ogg/.test(type) ? 'ogg' : /mp4|aac|m4a/.test(type) ? 'm4a' : /wav/.test(type) ? 'wav' : /mpeg|mp3/.test(type) ? 'mp3' : 'webm');

export async function transcribeClip(blob) {
	if (!blob?.size) throw new Error('No audio');
	const file = new File([blob], `speaking-practice.${extOf(blob.type || '')}`, { type: blob.type || 'audio/webm' });
	const form = new FormData();
	form.append('file', file);
	form.append('language', 'en');
	const { data } = await api.post('/transcriptions', form, { timeout: 180000 });
	if (data?.id) api.delete(`/transcriptions/${data.id}`).catch(() => undefined);
	return String(data?.text || '')
		.replace(/\s+/g, ' ')
		.trim();
}
