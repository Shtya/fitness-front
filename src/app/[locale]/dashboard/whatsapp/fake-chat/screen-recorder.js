/**
 * Records one element of this tab as a video: the browser shares the current tab and, where
 * Region Capture exists (Chrome/Edge), the stream is cropped to the element. Elsewhere the whole
 * tab is recorded.
 */
export function canRecordScreen() {
	return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia) && typeof MediaRecorder !== 'undefined';
}

export async function startElementRecording(element, { fps = 30 } = {}) {
	if (!canRecordScreen()) throw new Error('Screen recording is not supported in this browser');
	const stream = await navigator.mediaDevices.getDisplayMedia({
		video: { frameRate: fps, displaySurface: 'browser' },
		audio: false,
		preferCurrentTab: true,
		selfBrowserSurface: 'include',
	});
	const [track] = stream.getVideoTracks();
	let cropped = false;
	if (element && typeof window !== 'undefined' && window.CropTarget && typeof track.cropTo === 'function') {
		try {
			const target = await window.CropTarget.fromElement(element);
			await track.cropTo(target);
			cropped = true;
		} catch {
			cropped = false;
		}
	}
	const mimeType =
		['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type =>
			MediaRecorder.isTypeSupported(type),
		) || '';
	const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined);
	const chunks = [];
	recorder.ondataavailable = event => {
		if (event.data?.size) chunks.push(event.data);
	};
	const stopped = new Promise(resolve => {
		recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' }));
	});
	recorder.start(250);
	const stop = async () => {
		if (recorder.state !== 'inactive') recorder.stop();
		const blob = await stopped;
		stream.getTracks().forEach(item => item.stop());
		return { blob, ext: String(blob.type).includes('mp4') ? 'mp4' : 'webm' };
	};
	return { stop, cropped, track };
}
