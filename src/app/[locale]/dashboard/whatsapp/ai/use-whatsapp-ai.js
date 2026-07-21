'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { whatsappAiApi } from './whatsapp-ai-api';

const DEFAULT_SETTINGS = {
	enabled: false,
	provider: 'dragify-free',
	model: 'auto',
	systemPrompt:
		'You are a helpful customer support assistant. Suggest replies only and never claim that a message was sent.',
	promptPresets: [],
	activePromptId: null,
	persona: '',
	language: 'auto',
	tone: 'professional',
	suggestionCount: 3,
	contextMessageLimit: 20,
};

function errorMessage(error, fallback) {
	const value = error?.response?.data?.message || error?.message || fallback;
	return Array.isArray(value) ? value.join(', ') : String(value);
}

function uuidOrUndefined(value) {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
		String(value || ''),
	)
		? value
		: undefined;
}

function settingsPayload(settings) {
	return {
		enabled: Boolean(settings.enabled),
		provider: settings.provider || 'dragify-free',
		model: String(settings.model || 'auto'),
		systemPrompt: settings.systemPrompt || undefined,
		promptPresets: Array.isArray(settings.promptPresets)
			? settings.promptPresets.slice(0, 20).map(preset => ({
				id: preset.id,
				name: String(preset.name || '').trim(),
				prompt: String(preset.prompt || '').trim(),
			}))
			: [],
		activePromptId: settings.activePromptId ?? null,
		persona: settings.persona || undefined,
		language: settings.language || 'auto',
		tone: settings.tone || 'professional',
		suggestionCount: Number(settings.suggestionCount) || 3,
		contextMessageLimit: Number(settings.contextMessageLimit) || 20,
	};
}

export function useWhatsAppAi({
	accountId,
	conversationId,
	messages = [],
	allowSuggestions = true,
}) {
	const [settings, setSettings] = useState(DEFAULT_SETTINGS);
	const [settingsLoading, setSettingsLoading] = useState(false);
	const [settingsSaving, setSettingsSaving] = useState(false);
	const [settingsError, setSettingsError] = useState('');
	const [suggestions, setSuggestions] = useState([]);
	const [suggestionsLoading, setSuggestionsLoading] = useState(false);
	const [suggestionsError, setSuggestionsError] = useState('');
	const settingsRequestRef = useRef(0);
	const suggestionRequestRef = useRef(0);
	const suggestionAbortRef = useRef(null);

	const contextThroughMessageId = useMemo(() => {
		for (let index = messages.length - 1; index >= 0; index -= 1) {
			const id = uuidOrUndefined(messages[index]?.id);
			if (id) return id;
		}
		return undefined;
	}, [messages]);

	const loadSettings = useCallback(async () => {
		const requestId = ++settingsRequestRef.current;
		if (!accountId) {
			setSettings(DEFAULT_SETTINGS);
			setSettingsLoading(false);
			return DEFAULT_SETTINGS;
		}
		const controller = new AbortController();
		setSettingsLoading(true);
		setSettingsError('');
		try {
			const loaded = await whatsappAiApi.getSettings(accountId, controller.signal);
			if (settingsRequestRef.current !== requestId) return null;
			const normalized = { ...DEFAULT_SETTINGS, ...(loaded || {}) };
			setSettings(normalized);
			return normalized;
		} catch (error) {
			if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return null;
			if (settingsRequestRef.current === requestId) {
				setSettings(DEFAULT_SETTINGS);
				setSettingsError(errorMessage(error, 'Could not load AI settings.'));
			}
			return null;
		} finally {
			if (settingsRequestRef.current === requestId) setSettingsLoading(false);
		}
	}, [accountId]);

	useEffect(() => {
		void loadSettings();
		return () => {
			settingsRequestRef.current += 1;
		};
	}, [loadSettings]);

	const saveSettings = useCallback(
		async patch => {
			if (!accountId) return null;
			setSettingsSaving(true);
			setSettingsError('');
			try {
				const saved = await whatsappAiApi.updateSettings(
					accountId,
					settingsPayload({ ...settings, ...patch }),
				);
				const normalized = { ...DEFAULT_SETTINGS, ...(saved || {}) };
				setSettings(normalized);
				if (!normalized.enabled) {
					suggestionAbortRef.current?.abort();
					setSuggestions([]);
					setSuggestionsError('');
				}
				return normalized;
			} catch (error) {
				setSettingsError(errorMessage(error, 'Could not save AI settings.'));
				throw error;
			} finally {
				setSettingsSaving(false);
			}
		},
		[accountId, settings],
	);

	const loadSuggestions = useCallback(async () => {
		const requestId = ++suggestionRequestRef.current;
		suggestionAbortRef.current?.abort();
		if (!conversationId || !allowSuggestions || !settings.enabled) {
			setSuggestions([]);
			setSuggestionsError('');
			setSuggestionsLoading(false);
			return null;
		}
		const controller = new AbortController();
		suggestionAbortRef.current = controller;
		setSuggestionsLoading(true);
		setSuggestionsError('');
		try {
			const result = await whatsappAiApi.generateSuggestions(
				conversationId,
				{
					...(contextThroughMessageId ? { contextThroughMessageId } : {}),
				},
				controller.signal,
			);
			if (suggestionRequestRef.current !== requestId) return null;
			const items = Array.isArray(result?.suggestions)
				? result.suggestions.filter(item => typeof item === 'string' && item.trim())
				: [];
			setSuggestions(items);
			if (!items.length) setSuggestionsError('AI returned no reply suggestions.');
			return result;
		} catch (error) {
			if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return null;
			if (suggestionRequestRef.current === requestId) {
				setSuggestions([]);
				setSuggestionsError(errorMessage(error, 'Could not generate reply suggestions.'));
			}
			return null;
		} finally {
			if (suggestionRequestRef.current === requestId) setSuggestionsLoading(false);
		}
	}, [
		allowSuggestions,
		contextThroughMessageId,
		conversationId,
		settings.activePromptId,
		settings.enabled,
	]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			void loadSuggestions();
		}, 250);
		return () => {
			window.clearTimeout(timer);
			suggestionAbortRef.current?.abort();
		};
	}, [loadSuggestions]);

	return {
		settings,
		settingsLoading,
		settingsSaving,
		settingsError,
		saveSettings,
		selectPrompt: activePromptId => saveSettings({ activePromptId }),
		reloadSettings: loadSettings,
		suggestions,
		suggestionsLoading,
		suggestionsError,
		regenerateSuggestions: loadSuggestions,
	};
}

