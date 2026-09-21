let audioCtx;

function ctx() {
	if (typeof window === 'undefined') return null;
	const Ctor = window.AudioContext || window.webkitAudioContext;
	if (!Ctor) return null;
	if (!audioCtx) audioCtx = new Ctor();
	if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => undefined);
	return audioCtx;
}

export function playCountdownTick() {
	const ac = ctx();
	if (!ac) return;
	const t0 = ac.currentTime;
	const osc = ac.createOscillator();
	const gain = ac.createGain();
	osc.type = 'sine';
	osc.frequency.setValueAtTime(880, t0);
	gain.gain.setValueAtTime(0.0001, t0);
	gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.01);
	gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
	osc.connect(gain);
	gain.connect(ac.destination);
	osc.start(t0);
	osc.stop(t0 + 0.1);
}

export function playShutterSound() {
	const ac = ctx();
	if (!ac) return;
	const t0 = ac.currentTime;
	const sampleRate = ac.sampleRate;
	const length = Math.floor(sampleRate * 0.05);
	const buffer = ac.createBuffer(1, length, sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < length; i += 1) {
		data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.07));
	}
	const noise = ac.createBufferSource();
	noise.buffer = buffer;
	const filter = ac.createBiquadFilter();
	filter.type = 'highpass';
	filter.frequency.value = 1400;
	const noiseGain = ac.createGain();
	noiseGain.gain.setValueAtTime(0.45, t0);
	noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
	noise.connect(filter);
	filter.connect(noiseGain);
	noiseGain.connect(ac.destination);
	noise.start(t0);

	const osc = ac.createOscillator();
	const oscGain = ac.createGain();
	osc.type = 'triangle';
	osc.frequency.setValueAtTime(190, t0);
	oscGain.gain.setValueAtTime(0.22, t0);
	oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
	osc.connect(oscGain);
	oscGain.connect(ac.destination);
	osc.start(t0);
	osc.stop(t0 + 0.09);
}
