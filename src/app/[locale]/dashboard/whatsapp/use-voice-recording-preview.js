'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { buildVoicePreviewUrl } from './whatsapp-voice-recorder';

function clampRatio(value) {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.min(1, Math.max(0, n));
}

export function useVoiceRecordingPreview({
	mediaRecorderRef,
	recordingChunksRef,
	setRecordingPaused,
	labels = {},
}) {
	const voicePreviewAudioRef = useRef(null);
	const voicePreviewUrlRef = useRef(null);
	const [voicePreviewActive, setVoicePreviewActive] = useState(false);
	const [voicePreviewPlaying, setVoicePreviewPlaying] = useState(false);
	const [voicePreviewProgress, setVoicePreviewProgress] = useState(0);
	const [voicePreviewCurrentTime, setVoicePreviewCurrentTime] = useState(0);
	const [voicePreviewDuration, setVoicePreviewDuration] = useState(0);

	const syncProgressFromAudio = useCallback(() => {
		const audio = voicePreviewAudioRef.current;
		if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
		const current = Math.min(audio.duration, Math.max(0, audio.currentTime || 0));
		setVoicePreviewCurrentTime(current);
		setVoicePreviewProgress(current / audio.duration);
	}, []);

	const attachPreviewAudio = useCallback(
		audio => {
			audio.onloadedmetadata = () => {
				if (Number.isFinite(audio.duration) && audio.duration > 0) {
					setVoicePreviewDuration(audio.duration);
				}
				syncProgressFromAudio();
			};
			audio.ontimeupdate = () => syncProgressFromAudio();
			audio.onended = () => {
				setVoicePreviewPlaying(false);
				syncProgressFromAudio();
			};
			audio.onerror = () => {
				toast.error(labels.recordingPreviewFailed || 'Could not play preview');
			};
		},
		[labels, syncProgressFromAudio],
	);

	const clearVoicePreview = useCallback(() => {
		const audio = voicePreviewAudioRef.current;
		if (audio) {
			audio.pause();
			audio.onloadedmetadata = null;
			audio.ontimeupdate = null;
			audio.onended = null;
			audio.onerror = null;
			audio.src = '';
			voicePreviewAudioRef.current = null;
		}
		if (voicePreviewUrlRef.current) {
			URL.revokeObjectURL(voicePreviewUrlRef.current);
			voicePreviewUrlRef.current = null;
		}
		setVoicePreviewActive(false);
		setVoicePreviewPlaying(false);
		setVoicePreviewProgress(0);
		setVoicePreviewCurrentTime(0);
		setVoicePreviewDuration(0);
	}, []);

	const ensurePreviewAudio = useCallback(async () => {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === 'inactive') return null;

		if (recorder.state === 'recording') {
			if (typeof recorder.requestData === 'function') recorder.requestData();
			recorder.pause();
			setRecordingPaused(true);
			await new Promise(resolve => setTimeout(resolve, 40));
		}

		const chunks = recordingChunksRef.current;
		if (!chunks?.length) {
			toast.error(labels.recordingPreviewEmpty || 'Nothing recorded yet');
			return null;
		}

		if (voicePreviewAudioRef.current && voicePreviewUrlRef.current) {
			return voicePreviewAudioRef.current;
		}

		const url = buildVoicePreviewUrl(chunks, recorder);
		if (!url) {
			toast.error(labels.recordingPreviewEmpty || 'Nothing recorded yet');
			return null;
		}

		voicePreviewUrlRef.current = url;
		const audio = new Audio(url);
		voicePreviewAudioRef.current = audio;
		attachPreviewAudio(audio);
		return audio;
	}, [
		attachPreviewAudio,
		labels,
		mediaRecorderRef,
		recordingChunksRef,
		setRecordingPaused,
	]);

	const toggleVoicePreview = useCallback(async () => {
		const recorder = mediaRecorderRef.current;
		if (!recorder || recorder.state === 'inactive') return;

		try {
			if (voicePreviewActive && voicePreviewAudioRef.current) {
				const audio = voicePreviewAudioRef.current;
				if (voicePreviewPlaying) {
					audio.pause();
					setVoicePreviewPlaying(false);
					syncProgressFromAudio();
					return;
				}
				await audio.play();
				setVoicePreviewPlaying(true);
				syncProgressFromAudio();
				return;
			}

			const audio = await ensurePreviewAudio();
			if (!audio) return;

			setVoicePreviewActive(true);
			if (Number.isFinite(audio.duration) && audio.duration > 0) {
				setVoicePreviewDuration(audio.duration);
			}
			await audio.play();
			setVoicePreviewPlaying(true);
			syncProgressFromAudio();
		} catch {
			toast.error(labels.recordingPreviewFailed || 'Could not play preview');
			clearVoicePreview();
		}
	}, [
		clearVoicePreview,
		ensurePreviewAudio,
		labels,
		mediaRecorderRef,
		syncProgressFromAudio,
		voicePreviewActive,
		voicePreviewPlaying,
	]);

	const seekVoicePreview = useCallback(
		ratio => {
			const audio = voicePreviewAudioRef.current;
			if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
			const nextRatio = clampRatio(ratio);
			audio.currentTime = nextRatio * audio.duration;
			syncProgressFromAudio();
		},
		[syncProgressFromAudio],
	);

	useEffect(() => () => clearVoicePreview(), [clearVoicePreview]);

	return {
		voicePreviewActive,
		voicePreviewPlaying,
		voicePreviewProgress,
		voicePreviewCurrentTime,
		voicePreviewDuration,
		clearVoicePreview,
		toggleVoicePreview,
		seekVoicePreview,
	};
}
