/**
 * "Rest is over" chime, synthesised once into a WAV (no file to download, works offline).
 *
 * A soft bell arpeggio (A major: A5 → C#6 → E6, then a higher A6) with a short attack and a
 * long, gentle decay, played twice. An <audio> element plays it rather than Web Audio: on iOS
 * Web Audio is muted by the ring/silent switch, media playback is not.
 */
const SAMPLE_RATE = 44100;
const NOTES = [
	// [frequency Hz, start s, gain]
	[880.0, 0.0, 0.55],
	[1108.73, 0.14, 0.5],
	[1318.51, 0.28, 0.5],
	[1760.0, 0.46, 0.38],
	[880.0, 1.35, 0.5],
	[1108.73, 1.49, 0.45],
	[1318.51, 1.63, 0.45],
	[1760.0, 1.81, 0.34],
];
const LENGTH_S = 3.2;

let cachedUrl = null;

function synthesise() {
	const total = Math.floor(SAMPLE_RATE * LENGTH_S);
	const samples = new Float32Array(total);
	for (const [freq, start, gain] of NOTES) {
		const from = Math.floor(start * SAMPLE_RATE);
		for (let i = from; i < total; i += 1) {
			const t = (i - from) / SAMPLE_RATE;
			const attack = Math.min(1, t / 0.006);
			const decay = Math.exp(-t / 0.42);
			if (decay < 0.0005) break;
			// Fundamental plus two quiet bell partials.
			const tone =
				Math.sin(2 * Math.PI * freq * t) +
				0.22 * Math.sin(2 * Math.PI * freq * 2.01 * t) * Math.exp(-t / 0.18) +
				0.08 * Math.sin(2 * Math.PI * freq * 3.02 * t) * Math.exp(-t / 0.1);
			samples[i] += gain * attack * decay * tone;
		}
	}
	let peak = 0;
	for (const s of samples) peak = Math.max(peak, Math.abs(s));
	const scale = peak > 0 ? 0.85 / peak : 1;

	const buffer = new ArrayBuffer(44 + total * 2);
	const view = new DataView(buffer);
	const ascii = (offset, text) => {
		for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
	};
	ascii(0, 'RIFF');
	view.setUint32(4, 36 + total * 2, true);
	ascii(8, 'WAVE');
	ascii(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, SAMPLE_RATE, true);
	view.setUint32(28, SAMPLE_RATE * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	ascii(36, 'data');
	view.setUint32(40, total * 2, true);
	for (let i = 0; i < total; i += 1) {
		view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i] * scale)) * 0x7fff, true);
	}
	return new Blob([buffer], { type: 'audio/wav' });
}

/** Object URL of the chime (built on first use). */
export function restChimeUrl() {
	if (typeof window === 'undefined') return '';
	if (!cachedUrl) cachedUrl = URL.createObjectURL(synthesise());
	return cachedUrl;
}

/**
 * iOS only lets an <audio> element play later if it played once inside a tap. Call this from
 * the Start button: it plays silently for a moment and rewinds.
 */
export function unlockAudio(el) {
	if (!el) return;
	try {
		if (!el.src) el.src = restChimeUrl();
		el.muted = true;
		const p = el.play();
		const reset = () => {
			el.pause();
			el.currentTime = 0;
			el.muted = false;
		};
		if (p?.then) p.then(reset).catch(() => { el.muted = false; });
		else reset();
	} catch {
		/* ignore */
	}
}
