/**
 * WhatsApp / iOS-style message notification tones (Web Audio).
 * Most tones are synthesized approximations of Apple Modern SMS alerts.
 * Popcorn uses a real sample (iOS 7 Popcorn) from public/fake-chat/tones/.
 * Sample source: https://www.zedge.net/ringtones/780c6cd4-5848-309b-bfed-a816bf02714d
 */

/** @typedef {{ id: string, label: string, labelAr: string }} ToneMeta */

/** Bundled MP3 samples (prefer over synthesis when present). */
export const TONE_SAMPLE_URLS = Object.freeze({
	popcorn: '/fake-chat/tones/popcorn.mp3',
});

/** @type {ToneMeta[]} */
export const WHATSAPP_MESSAGE_TONES = [
	{ id: 'tri-tone', label: 'Tri-tone (Default)', labelAr: 'Tri-tone (افتراضي)' },
	{ id: 'note', label: 'Note', labelAr: 'Note' },
	{ id: 'aurora', label: 'Aurora', labelAr: 'Aurora' },
	{ id: 'bamboo', label: 'Bamboo', labelAr: 'Bamboo' },
	{ id: 'chord', label: 'Chord', labelAr: 'Chord' },
	{ id: 'circles', label: 'Circles', labelAr: 'Circles' },
	{ id: 'complete', label: 'Complete', labelAr: 'Complete' },
	{ id: 'hello', label: 'Hello', labelAr: 'Hello' },
	{ id: 'input', label: 'Input', labelAr: 'Input' },
	{ id: 'keys', label: 'Keys', labelAr: 'Keys' },
	{ id: 'popcorn', label: 'Popcorn (iOS)', labelAr: 'Popcorn (iOS)' },
	{ id: 'pulse', label: 'Pulse', labelAr: 'Pulse' },
	{ id: 'synth', label: 'Synth', labelAr: 'Synth' },
	{ id: 'bell', label: 'Bell', labelAr: 'Bell' },
	{ id: 'glass', label: 'Glass', labelAr: 'Glass' },
	{ id: 'harp', label: 'Harp', labelAr: 'Harp' },
	{ id: 'xylophone', label: 'Xylophone', labelAr: 'Xylophone' },
];

let sharedCtx = null;
let masterGainNode = null;
/** User volume 0–1 (default loud for demos). */
let masterVolume = 0.9;
/** @type {Map<string, AudioBuffer>} */
const sampleCache = new Map();
/** @type {Map<string, Promise<AudioBuffer|null>>} */
const sampleLoading = new Map();

function getCtx() {
	if (typeof window === 'undefined') return null;
	const AC = window.AudioContext || window.webkitAudioContext;
	if (!AC) return null;
	if (!sharedCtx || sharedCtx.state === 'closed') {
		sharedCtx = new AC();
		masterGainNode = sharedCtx.createGain();
		masterGainNode.gain.value = masterVolume;
		masterGainNode.connect(sharedCtx.destination);
	}
	return sharedCtx;
}

function masterOut(ctx) {
	if (!masterGainNode || masterGainNode.context !== ctx) {
		masterGainNode = ctx.createGain();
		masterGainNode.gain.value = masterVolume;
		masterGainNode.connect(ctx.destination);
	}
	return masterGainNode;
}

/**
 * @param {number} level 0–1
 */
export function setToneVolume(level) {
	masterVolume = Math.max(0, Math.min(1, Number(level) || 0));
	const ctx = getCtx();
	if (ctx && masterGainNode) {
		masterGainNode.gain.setTargetAtTime(masterVolume, ctx.currentTime, 0.02);
	}
}

export function getToneVolume() {
	return masterVolume;
}

async function loadSample(toneId) {
	const url = TONE_SAMPLE_URLS[toneId];
	if (!url) return null;
	if (sampleCache.has(toneId)) return sampleCache.get(toneId);
	if (sampleLoading.has(toneId)) return sampleLoading.get(toneId);

	const ctx = getCtx();
	if (!ctx) return null;

	const job = (async () => {
		try {
			const res = await fetch(url, { cache: 'force-cache' });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const raw = await res.arrayBuffer();
			const buffer = await ctx.decodeAudioData(raw.slice(0));
			sampleCache.set(toneId, buffer);
			return buffer;
		} catch (error) {
			console.warn(`[tones] failed to load ${toneId}`, error);
			return null;
		} finally {
			sampleLoading.delete(toneId);
		}
	})();

	sampleLoading.set(toneId, job);
	return job;
}

/**
 * Play a decoded sample through the master gain.
 * @returns {number} duration seconds
 */
function playSampleBuffer(ctx, buffer, when = ctx.currentTime + 0.02) {
	const src = ctx.createBufferSource();
	src.buffer = buffer;
	src.connect(masterOut(ctx));
	src.start(when);
	return buffer.duration || 1;
}

function tone(ctx, freq, start, dur, type = 'sine', gain = 0.55) {
	const o = ctx.createOscillator();
	const g = ctx.createGain();
	o.type = type;
	o.frequency.setValueAtTime(freq, start);
	g.gain.setValueAtTime(0.0001, start);
	g.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + 0.008);
	g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.02, dur));
	o.connect(g);
	g.connect(masterOut(ctx));
	o.start(start);
	o.stop(start + dur + 0.03);
}

function chord(ctx, freqs, start, dur, type = 'triangle', gain = 0.35) {
	freqs.forEach((f, i) => tone(ctx, f, start + i * 0.01, dur, type, gain));
}

/** Synthetic fallback if the Popcorn MP3 fails to load. */
function schedulePopcornFallback(ctx, t0) {
	const motif = [
		[880, 0.09],
		[784, 0.09],
		[880, 0.09],
		[659, 0.09],
		[523, 0.09],
		[659, 0.09],
		[440, 0.18],
	];
	let t = t0;
	motif.forEach(([freq, dur]) => {
		tone(ctx, freq, t, dur * 0.92, 'triangle', 0.72);
		tone(ctx, freq * 2, t, dur * 0.55, 'sine', 0.18);
		t += dur + 0.018;
	});
	return t - t0 + 0.05;
}

/** Play patterns that evoke each classic alert. */
function scheduleTone(ctx, id, t0) {
	switch (id) {
		case 'tri-tone':
			tone(ctx, 880, t0, 0.12, 'sine', 0.7);
			tone(ctx, 1174.7, t0 + 0.14, 0.12, 'sine', 0.65);
			tone(ctx, 1396.9, t0 + 0.28, 0.18, 'sine', 0.6);
			return 0.55;
		case 'note':
			tone(ctx, 1046.5, t0, 0.22, 'triangle', 0.75);
			tone(ctx, 1318.5, t0 + 0.08, 0.28, 'sine', 0.45);
			return 0.45;
		case 'aurora':
			tone(ctx, 523.25, t0, 0.35, 'sine', 0.55);
			tone(ctx, 659.25, t0 + 0.1, 0.35, 'sine', 0.5);
			tone(ctx, 783.99, t0 + 0.2, 0.4, 'sine', 0.45);
			return 0.7;
		case 'bamboo':
			tone(ctx, 698.46, t0, 0.08, 'triangle', 0.55);
			tone(ctx, 830.61, t0 + 0.1, 0.08, 'triangle', 0.5);
			tone(ctx, 987.77, t0 + 0.2, 0.12, 'triangle', 0.48);
			return 0.4;
		case 'chord':
			chord(ctx, [523.25, 659.25, 783.99], t0, 0.45, 'triangle', 0.4);
			return 0.55;
		case 'circles':
			tone(ctx, 440, t0, 0.15, 'sine', 0.55);
			tone(ctx, 554.37, t0 + 0.16, 0.15, 'sine', 0.5);
			tone(ctx, 659.25, t0 + 0.32, 0.2, 'sine', 0.45);
			tone(ctx, 554.37, t0 + 0.5, 0.2, 'sine', 0.4);
			return 0.8;
		case 'complete':
			chord(ctx, [523.25, 659.25, 783.99, 1046.5], t0, 0.5, 'sine', 0.32);
			return 0.6;
		case 'hello':
			tone(ctx, 392, t0, 0.18, 'triangle', 0.6);
			tone(ctx, 523.25, t0 + 0.16, 0.22, 'triangle', 0.55);
			tone(ctx, 659.25, t0 + 0.34, 0.28, 'sine', 0.5);
			return 0.7;
		case 'input':
			tone(ctx, 1200, t0, 0.06, 'triangle', 0.5);
			tone(ctx, 900, t0 + 0.07, 0.08, 'triangle', 0.45);
			return 0.22;
		case 'keys':
			tone(ctx, 1568, t0, 0.05, 'triangle', 0.55);
			tone(ctx, 1318.5, t0 + 0.06, 0.05, 'triangle', 0.5);
			tone(ctx, 1760, t0 + 0.12, 0.08, 'triangle', 0.48);
			return 0.28;
		case 'popcorn':
			return schedulePopcornFallback(ctx, t0);
		case 'pulse':
			tone(ctx, 220, t0, 0.12, 'sine', 0.65);
			tone(ctx, 220, t0 + 0.18, 0.12, 'sine', 0.6);
			tone(ctx, 329.63, t0 + 0.36, 0.2, 'sine', 0.55);
			return 0.65;
		case 'synth':
			tone(ctx, 440, t0, 0.2, 'sawtooth', 0.28);
			tone(ctx, 554.37, t0 + 0.15, 0.25, 'sawtooth', 0.24);
			tone(ctx, 659.25, t0 + 0.3, 0.3, 'sawtooth', 0.2);
			return 0.7;
		case 'bell':
			tone(ctx, 1046.5, t0, 0.5, 'sine', 0.6);
			tone(ctx, 2093, t0, 0.35, 'sine', 0.22);
			return 0.55;
		case 'glass':
			tone(ctx, 1568, t0, 0.35, 'sine', 0.55);
			tone(ctx, 3136, t0, 0.25, 'sine', 0.18);
			return 0.45;
		case 'harp':
			tone(ctx, 659.25, t0, 0.15, 'triangle', 0.5);
			tone(ctx, 783.99, t0 + 0.08, 0.15, 'triangle', 0.45);
			tone(ctx, 987.77, t0 + 0.16, 0.18, 'triangle', 0.4);
			tone(ctx, 1174.7, t0 + 0.24, 0.22, 'triangle', 0.35);
			return 0.55;
		case 'xylophone':
			tone(ctx, 1046.5, t0, 0.1, 'triangle', 0.6);
			tone(ctx, 1318.5, t0 + 0.12, 0.1, 'triangle', 0.55);
			tone(ctx, 1568, t0 + 0.24, 0.12, 'triangle', 0.5);
			return 0.45;
		default:
			tone(ctx, 880, t0, 0.12, 'sine', 0.7);
			tone(ctx, 1174.7, t0 + 0.14, 0.12, 'sine', 0.65);
			tone(ctx, 1396.9, t0 + 0.28, 0.18, 'sine', 0.6);
			return 0.55;
	}
}

/**
 * Play one notification tone.
 * @param {string} toneId
 * @param {{ volume?: number }} [opts] optional 0–1 override for this play
 * @returns {Promise<number>} approximate duration in ms
 */
export async function playWhatsAppTone(toneId = 'tri-tone', opts = {}) {
	const ctx = getCtx();
	if (!ctx) throw new Error('Audio not supported');
	if (ctx.state === 'suspended') await ctx.resume();
	if (opts.volume != null) setToneVolume(opts.volume);

	if (TONE_SAMPLE_URLS[toneId]) {
		const buffer = await loadSample(toneId);
		if (buffer) {
			const seconds = playSampleBuffer(ctx, buffer);
			return Math.round(seconds * 1000);
		}
	}

	const t0 = ctx.currentTime + 0.02;
	const seconds = scheduleTone(ctx, toneId, t0);
	return Math.round(seconds * 1000);
}

/**
 * Interval helper: convert UI unit + value to milliseconds.
 * @param {number} value
 * @param {'seconds'|'minutes'} unit
 */
export function intervalToMs(value, unit) {
	const n = Math.max(1, Number(value) || 1);
	return unit === 'minutes' ? n * 60_000 : n * 1_000;
}
