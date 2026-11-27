'use client';

/*
 * Listening settings for every "Listen" button in Learn: voice, accent, speed and real word
 * recordings. Saved on this device (english-audio.js), so it applies everywhere at once.
 */
import { useEffect, useRef, useState } from 'react';
import { AudioLines, Play, Square, X } from 'lucide-react';
import { GOOGLE_ONLINE, TTS_EVENT, englishVoices, getTtsSettings, naturalVoice, setTtsSettings, speak, stopSpeaking } from './english-audio';

export default function ListenSettings({ c }) {
	const [open, setOpen] = useState(false);
	const [settings, setSettings] = useState(() => (typeof window === 'undefined' ? null : getTtsSettings()));
	const [voices, setVoices] = useState([]);
	const wrap = useRef(null);

	useEffect(() => {
		const sync = () => setSettings(getTtsSettings());
		const loadVoices = () => setVoices(englishVoices());
		sync();
		loadVoices();
		window.addEventListener(TTS_EVENT, sync);
		window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
		return () => {
			window.removeEventListener(TTS_EVENT, sync);
			window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
		};
	}, []);

	useEffect(() => {
		if (!open) return undefined;
		setVoices(englishVoices());
		const away = e => {
			if (!wrap.current?.contains(e.target)) setOpen(false);
		};
		const esc = e => e.key === 'Escape' && setOpen(false);
		document.addEventListener('pointerdown', away);
		document.addEventListener('keydown', esc);
		return () => {
			document.removeEventListener('pointerdown', away);
			document.removeEventListener('keydown', esc);
		};
	}, [open]);

	if (!settings) return null;
	const set = patch => setSettings(setTtsSettings(patch));
	const natural = voices.filter(v => v.natural);
	const other = voices.filter(v => !v.natural);
	const hasNatural = Boolean(naturalVoice(settings.accent));
	const speedLabel = `${Math.round(settings.rate * 100)}%`;

	return (
		<div className="en-tts" ref={wrap}>
			<button
				type="button"
				className={`lrn-icon-btn${open ? ' is-on' : ''}`}
				onClick={() => setOpen(v => !v)}
				aria-haspopup="dialog"
				aria-expanded={open}
				title={c.en.ttsSettings}
				aria-label={c.en.ttsSettings}
			>
				<AudioLines size={16} />
			</button>
			{open ? (
				<div className="en-tts__pop" role="dialog" aria-label={c.en.ttsSettings}>
					<div className="en-tts__head">
						<b>{c.en.ttsSettings}</b>
						<button type="button" className="en-tts__x" onClick={() => setOpen(false)} aria-label="Close">
							<X size={15} />
						</button>
					</div>

					<label className="en-tts__field">
						<span>{c.en.ttsVoice}</span>
						<select value={settings.voice} onChange={e => set({ voice: e.target.value })}>
							<option value="auto">{c.en.ttsAuto}</option>
							<option value={GOOGLE_ONLINE}>{c.en.ttsGoogle}</option>
							{natural.length ? (
								<optgroup label={c.en.ttsNatural}>
									{natural.map(v => (
										<option key={v.name} value={v.name}>
											{v.name} · {v.lang}
										</option>
									))}
								</optgroup>
							) : null}
							{other.length ? (
								<optgroup label={c.en.ttsOther}>
									{other.map(v => (
										<option key={v.name} value={v.name}>
											{v.name} · {v.lang}
										</option>
									))}
								</optgroup>
							) : null}
						</select>
					</label>
					{settings.voice === 'auto' && !hasNatural ? <p className="en-tts__note">{c.en.ttsNoNatural}</p> : null}

					<div className="en-tts__field">
						<span>{c.en.ttsAccent}</span>
						<div className="en-tts__seg" role="radiogroup" aria-label={c.en.ttsAccent}>
							{[
								['US', 'US'],
								['GB', 'UK'],
							].map(([value, label]) => (
								<button key={value} type="button" role="radio" aria-checked={settings.accent === value} className={settings.accent === value ? 'is-on' : ''} onClick={() => set({ accent: value })}>
									{label}
								</button>
							))}
						</div>
					</div>

					<label className="en-tts__field">
						<span>
							{c.en.ttsSpeed} <b className="en-tts__val">{speedLabel}</b>
						</span>
						<input type="range" min="0.6" max="1.4" step="0.05" value={settings.rate} onChange={e => set({ rate: Number(e.target.value) })} aria-valuetext={speedLabel} />
						<span className="en-tts__scale" aria-hidden>
							<small>{c.en.ttsSlower}</small>
							<small>{c.en.ttsFaster}</small>
						</span>
					</label>

					<label className="en-tts__check">
						<input type="checkbox" checked={settings.recordings} onChange={e => set({ recordings: e.target.checked })} />
						<span>
							<b>{c.en.ttsRecordings}</b>
							<small>{c.en.ttsRecordingsHint}</small>
						</span>
					</label>

					<div className="en-tts__foot">
						<button type="button" className="lrn-btn is-primary" onClick={() => speak(c.en.ttsSample)}>
							<Play size={14} aria-hidden />
							{c.en.ttsTest}
						</button>
						<button type="button" className="lrn-btn" onClick={() => stopSpeaking()} aria-label="Stop" title="Stop">
							<Square size={13} aria-hidden />
						</button>
					</div>
				</div>
			) : null}
		</div>
	);
}
