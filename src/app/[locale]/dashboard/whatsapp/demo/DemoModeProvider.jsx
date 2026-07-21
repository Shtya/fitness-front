'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { asList, demoApi } from './demo-api';
import { createDemoEventScheduler } from './demo-event-scheduler';
import { rawDemoId } from './demo-read-model';

const DEFAULT_SETTINGS = {
	enabled: false,
	activeProfileId: null,
	randomSeed: 'whatsapp-demo',
	featureFlags: {
		useFakeContacts: true,
		useFakeTyping: true,
		useFakeMessages: true,
		overlayRealChats: false,
		randomTyping: false,
		randomDelays: false,
		hideDemoBadge: false,
	},
};

const EMPTY_DATA = {
	contacts: [],
	conversations: [],
	messagesByConversation: {},
	events: [],
};

const DemoModeContext = createContext(null);

function entity(payload) {
	return payload?.item || payload?.data || payload;
}

function normalizeSettings(payload) {
	const value = entity(payload) || {};
	return {
		...DEFAULT_SETTINGS,
		...value,
		activeProfileId: value.activeProfileId || value.active_profile_id || null,
		randomSeed: value.randomSeed || value.random_seed || DEFAULT_SETTINGS.randomSeed,
		featureFlags: {
			...DEFAULT_SETTINGS.featureFlags,
			...(value.flags || value.featureFlags || value.feature_flags || {}),
		},
	};
}

function conversationKey(value) {
	return rawDemoId(value?.id || value);
}

export function DemoModeProvider({ children }) {
	const [settings, setSettings] = useState(DEFAULT_SETTINGS);
	const [profiles, setProfiles] = useState([]);
	const [data, setData] = useState(EMPTY_DATA);
	const [runtime, setRuntime] = useState({ conversations: {} });
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const activeProfileIdRef = useRef(null);
	const completedEventIdsRef = useRef(new Set());
	const scheduledProfileRef = useRef(null);
	const mediaObjectUrlsRef = useRef(new Set());

	const revokeMediaObjectUrls = useCallback(() => {
		mediaObjectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
		mediaObjectUrlsRef.current.clear();
	}, []);

	const loadProfileData = useCallback(async profileId => {
		if (!profileId) {
			revokeMediaObjectUrls();
			setData(EMPTY_DATA);
			return EMPTY_DATA;
		}
		const [contactsPayload, conversationsPayload, eventsPayload] = await Promise.all([
			demoApi.listContacts(profileId),
			demoApi.listConversations(profileId),
			demoApi.listEvents(profileId),
		]);
		revokeMediaObjectUrls();
		const contacts = await Promise.all(
			asList(contactsPayload).map(async contact => {
				const attachmentId =
					contact.photoAttachmentId ||
					contact.photo_attachment_id ||
					contact.photoAttachment?.id;
				if (!attachmentId) return contact;
				try {
					const blob = await demoApi.getMedia(attachmentId);
					const avatarUrl = URL.createObjectURL(blob);
					mediaObjectUrlsRef.current.add(avatarUrl);
					return { ...contact, avatarUrl };
				} catch {
					return contact;
				}
			}),
		);
		const conversations = asList(conversationsPayload);
		const events = asList(eventsPayload);
		const messageEntries = await Promise.all(
			conversations.map(async conversation => {
				try {
					const messages = asList(await demoApi.listMessages(conversation.id));
					return [String(conversation.id), messages];
				} catch {
					return [String(conversation.id), []];
				}
			}),
		);
		const next = {
			contacts,
			conversations,
			events,
			messagesByConversation: Object.fromEntries(messageEntries),
		};
		if (activeProfileIdRef.current === String(profileId)) setData(next);
		return next;
	}, [revokeMediaObjectUrls]);

	useEffect(() => revokeMediaObjectUrls, [revokeMediaObjectUrls]);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError('');
		try {
			const [settingsPayload, profilesPayload] = await Promise.all([
				demoApi.getSettings(),
				demoApi.listProfiles(),
			]);
			const nextSettings = normalizeSettings(settingsPayload);
			const nextProfiles = asList(profilesPayload);
			const activeProfileId =
				nextSettings.activeProfileId || nextProfiles.find(profile => profile.isActive)?.id || null;
			const activeProfile = nextProfiles.find(
				profile => String(profile.id) === String(activeProfileId),
			);
			activeProfileIdRef.current = activeProfileId ? String(activeProfileId) : null;
			setProfiles(nextProfiles);
			setSettings({
				...nextSettings,
				activeProfileId,
				randomSeed: activeProfile?.randomSeed || nextSettings.randomSeed,
			});
			await loadProfileData(activeProfileId);
		} catch (requestError) {
			setError(
				requestError?.response?.data?.message ||
					requestError?.message ||
					'Could not load Demo Mode.',
			);
		} finally {
			setLoading(false);
		}
	}, [loadProfileData]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const updateSettings = useCallback(async patch => {
		setSaving(true);
		setError('');
		try {
			const payload = {
				...patch,
				flags: patch.featureFlags,
			};
			delete payload.featureFlags;
			const responseValue = entity(await demoApi.updateSettings(payload)) || {};
			setSettings(current => {
				return normalizeSettings({
					...current,
					...patch,
					...responseValue,
					featureFlags: {
						...current.featureFlags,
						...(patch.featureFlags || {}),
						...(responseValue.flags || {}),
						...(responseValue.featureFlags || responseValue.feature_flags || {}),
					},
				});
			});
			return responseValue;
		} catch (requestError) {
			setError(requestError?.response?.data?.message || 'Could not save Demo Mode settings.');
			throw requestError;
		} finally {
			setSaving(false);
		}
	}, []);

	const setEnabled = useCallback(
		enabled => updateSettings({ enabled: Boolean(enabled) }),
		[updateSettings],
	);

	const setFeatureFlag = useCallback(
		(key, enabled) =>
			updateSettings({
				featureFlags: { ...settings.featureFlags, [key]: Boolean(enabled) },
			}),
		[settings.featureFlags, updateSettings],
	);

	const activateProfile = useCallback(
		async profileId => {
			setSaving(true);
			setError('');
			try {
				const activated = entity(await demoApi.activateProfile(profileId)) || {};
				activeProfileIdRef.current = String(profileId);
				const profile = profiles.find(item => String(item.id) === String(profileId));
				setSettings(current =>
					normalizeSettings({
						...current,
						...activated,
						activeProfileId: profileId,
						randomSeed: profile?.randomSeed || current.randomSeed,
					}),
				);
				setProfiles(current =>
					current.map(profile => ({ ...profile, isActive: String(profile.id) === String(profileId) })),
				);
				setRuntime({ conversations: {} });
				await loadProfileData(profileId);
			} catch (requestError) {
				setError(requestError?.response?.data?.message || 'Could not activate demo profile.');
				throw requestError;
			} finally {
				setSaving(false);
			}
		},
		[loadProfileData, profiles],
	);

	const createProfile = useCallback(
		async payload => {
			const created = entity(await demoApi.createProfile(payload));
			setProfiles(current => [...current, created]);
			await activateProfile(created.id);
			return created;
		},
		[activateProfile],
	);

	const updateProfile = useCallback(async (id, payload) => {
		const updated = entity(await demoApi.updateProfile(id, payload));
		setProfiles(current =>
			current.map(profile => (String(profile.id) === String(id) ? { ...profile, ...updated } : profile)),
		);
		return updated;
	}, []);

	const cloneProfile = useCallback(
		async id => {
			const cloned = entity(await demoApi.cloneProfile(id));
			setProfiles(current => [...current, cloned]);
			await activateProfile(cloned.id);
			return cloned;
		},
		[activateProfile],
	);

	const deleteProfile = useCallback(async id => {
		await demoApi.deleteProfile(id);
		setProfiles(current => current.filter(profile => String(profile.id) !== String(id)));
		if (activeProfileIdRef.current === String(id)) {
			activeProfileIdRef.current = null;
			setSettings(current => ({ ...current, activeProfileId: null, enabled: false }));
			setData(EMPTY_DATA);
			setRuntime({ conversations: {} });
		}
	}, []);

	const refreshActiveProfile = useCallback(
		() => loadProfileData(activeProfileIdRef.current),
		[loadProfileData],
	);

	const createContact = useCallback(
		async payload => {
			const profileId = activeProfileIdRef.current;
			if (!profileId) throw new Error('Select a demo profile first.');
			const { photoFile, ...contactPayload } = payload;
			let attachmentId = null;
			let contact = null;
			try {
				if (photoFile) {
					const attachment = entity(await demoApi.uploadMedia(profileId, photoFile));
					attachmentId = attachment.id;
					contactPayload.photoAttachmentId = attachmentId;
				}
				contact = entity(await demoApi.createContact(profileId, contactPayload));
				const conversations = asList(await demoApi.listConversations(profileId));
				const hasConversation = conversations.some(
					conversation =>
						String(conversation.contactId || conversation.contact_id) === String(contact.id),
				);
				if (!hasConversation) {
					await demoApi.createConversation(profileId, {
						contactId: contact.id,
						sourceType: 'fake',
					});
				}
				await refreshActiveProfile();
				return contact;
			} catch (error) {
				if (contact?.id) {
					await demoApi.deleteContact(profileId, contact.id).catch(() => {});
				} else if (attachmentId) {
					await demoApi.deleteMedia(attachmentId).catch(() => {});
				}
				throw error;
			}
		},
		[refreshActiveProfile],
	);

	const updateContact = useCallback(async (id, payload) => {
		const profileId = activeProfileIdRef.current;
		if (!profileId) throw new Error('Select a demo profile first.');
		const { photoFile, ...contactPayload } = payload;
		let uploadedAttachmentId = null;
		if (photoFile) {
			const attachment = entity(await demoApi.uploadMedia(profileId, photoFile));
			uploadedAttachmentId = attachment.id;
			contactPayload.photoAttachmentId = uploadedAttachmentId;
		}
		let updated;
		try {
			updated = entity(
				await demoApi.updateContact(profileId, rawDemoId(id), contactPayload),
			);
		} catch (error) {
			if (uploadedAttachmentId) {
				await demoApi.deleteMedia(uploadedAttachmentId).catch(() => {});
			}
			throw error;
		}
		if (photoFile) {
			const avatarUrl = URL.createObjectURL(photoFile);
			mediaObjectUrlsRef.current.add(avatarUrl);
			updated.avatarUrl = avatarUrl;
		}
		setData(current => ({
			...current,
			contacts: current.contacts.map(contact =>
				String(contact.id) === String(rawDemoId(id)) ? { ...contact, ...updated } : contact,
			),
		}));
		return updated;
	}, []);

	const deleteContact = useCallback(
		async id => {
			const profileId = activeProfileIdRef.current;
			if (!profileId) throw new Error('Select a demo profile first.');
			await demoApi.deleteContact(profileId, rawDemoId(id));
			await refreshActiveProfile();
		},
		[refreshActiveProfile],
	);

	const createRealOverlay = useCallback(
		async ({ realAccountId, realConversation }) => {
			const profileId = activeProfileIdRef.current;
			if (!profileId) throw new Error('Select a demo profile first.');
			if (!realAccountId || !realConversation?.id) {
				throw new Error('A real account and conversation are required.');
			}
			const created = entity(
				await demoApi.createConversation(profileId, {
					sourceType: 'real_overlay',
					realAccountId,
					realConversationId: realConversation.id,
					overrides: {
						displayName:
							realConversation.contact?.name ||
							realConversation.contact?.phone ||
							realConversation.name ||
							String(realConversation.id),
					},
				}),
			);
			await refreshActiveProfile();
			return created;
		},
		[refreshActiveProfile],
	);

	const deleteConversation = useCallback(
		async id => {
			const profileId = activeProfileIdRef.current;
			if (!profileId) throw new Error('Select a demo profile first.');
			await demoApi.deleteConversation(profileId, rawDemoId(id));
			await refreshActiveProfile();
		},
		[refreshActiveProfile],
	);

	const updateConversation = useCallback(async (id, payload) => {
		const profileId = activeProfileIdRef.current;
		if (!profileId) throw new Error('Select a demo profile first.');
		const rawId = rawDemoId(id);
		const updated = entity(
			await demoApi.updateConversation(profileId, rawId, payload),
		);
		setData(current => ({
			...current,
			conversations: current.conversations.map(conversation =>
				String(conversation.id) === String(rawId)
					? { ...conversation, ...updated }
					: conversation,
			),
		}));
		return updated;
	}, []);

	const createMessage = useCallback(async (conversationId, payload) => {
		const rawId = rawDemoId(conversationId);
		const profileId = activeProfileIdRef.current;
		if (!profileId) throw new Error('Select a demo profile first.');
		const { mediaFile, ...messagePayload } = payload;
		let attachmentId = null;
		let created;
		try {
			if (mediaFile) {
				const attachment = entity(await demoApi.uploadMedia(profileId, mediaFile));
				attachmentId = attachment.id;
				messagePayload.attachmentIds = [attachmentId];
				messagePayload.type = attachment.kind || messagePayload.type;
			}
			created = entity(await demoApi.createMessage(rawId, messagePayload));
		} catch (error) {
			if (attachmentId) await demoApi.deleteMedia(attachmentId).catch(() => {});
			throw error;
		}
		setData(current => ({
			...current,
			messagesByConversation: {
				...current.messagesByConversation,
				[rawId]: [...(current.messagesByConversation[rawId] || []), created],
			},
		}));
		return created;
	}, []);

	const updateMessage = useCallback(async (conversationId, id, payload) => {
		const rawConversationId = rawDemoId(conversationId);
		const rawId = rawDemoId(id);
		const { mediaFile: _mediaFile, ...messagePayload } = payload;
		const updated = entity(await demoApi.updateMessage(rawConversationId, rawId, messagePayload));
		setData(current => ({
			...current,
			messagesByConversation: Object.fromEntries(
				Object.entries(current.messagesByConversation).map(([conversationId, messages]) => [
					conversationId,
					messages.map(message =>
						String(message.id) === String(rawId) ? { ...message, ...updated } : message,
					),
				]),
			),
		}));
		return updated;
	}, []);

	const deleteMessage = useCallback(async (conversationId, id) => {
		const rawConversationId = rawDemoId(conversationId);
		const rawId = rawDemoId(id);
		await demoApi.deleteMessage(rawConversationId, rawId);
		setData(current => ({
			...current,
			messagesByConversation: Object.fromEntries(
				Object.entries(current.messagesByConversation).map(([conversationId, messages]) => [
					conversationId,
					messages.filter(message => String(message.id) !== String(rawId)),
				]),
			),
		}));
	}, []);

	const createEvent = useCallback(async payload => {
		const profileId = activeProfileIdRef.current;
		if (!profileId) throw new Error('Select a demo profile first.');
		const created = entity(await demoApi.createEvent(profileId, payload));
		setData(current => ({ ...current, events: [...current.events, created] }));
		return created;
	}, []);

	const deleteEvent = useCallback(async id => {
		const profileId = activeProfileIdRef.current;
		if (!profileId) throw new Error('Select a demo profile first.');
		await demoApi.deleteEvent(profileId, rawDemoId(id));
		setData(current => ({
			...current,
			events: current.events.filter(event => String(event.id) !== String(rawDemoId(id))),
		}));
	}, []);

	const applyRuntimeEvent = useCallback(event => {
		const targetId = conversationKey(
			event.conversationId ||
				event.demoConversationId ||
				event.payload?.conversationId ||
				event.payload?.demoConversationId,
		);
		if (!targetId) return;
		const type = event.type || event.eventType;
		const payload = event.payload || event;
		setRuntime(current => {
			const previous = current.conversations[targetId] || {};
			let nextConversation = previous;
			if (type === 'typing') {
				nextConversation = { ...previous, typing: payload.active !== false };
			} else if (type === 'recording') {
				nextConversation = { ...previous, recording: payload.active !== false };
			} else if (type === 'incoming_message') {
				const timestamp =
					payload.providerTimestamp || payload.timestamp || new Date().toISOString();
				const message = {
					id: payload.messageId || `runtime-${event.id || Date.now()}`,
					type: 'text',
					text: payload.text || payload.message || '',
					direction: 'inbound',
					status: payload.status || 'delivered',
					providerTimestamp: timestamp,
					created_at: timestamp,
					runtimeOnly: true,
				};
				nextConversation = {
					...previous,
					typing: false,
					recording: false,
					messages: [...(previous.messages || []), message],
					lastMessageAt: timestamp,
					preserveOrder: payload.moveToTop === false,
					unreadCount:
						Math.max(0, Number(previous.unreadCount) || 0) +
						Math.max(0, Number(payload.unreadCount) || 1),
				};
			}
			return {
				...current,
				conversations: { ...current.conversations, [targetId]: nextConversation },
			};
		});
		if (
			type === 'incoming_message' &&
			payload.notification &&
			typeof Notification !== 'undefined' &&
			Notification.permission === 'granted'
		) {
			new Notification(payload.title || 'WhatsApp Demo', {
				body: payload.text || payload.message || '',
				tag: `whatsapp-demo-${targetId}`,
			});
		}
	}, []);

	const markRuntimeRead = useCallback(conversation => {
		const targetId = conversationKey(
			typeof conversation === 'string'
				? conversation
				: conversation?.demoOverlayId || conversation?.rawDemoId,
		);
		if (!targetId) return;
		setRuntime(current => {
			const previous = current.conversations[targetId];
			if (!previous || Number(previous.unreadCount) === 0) return current;
			return {
				...current,
				conversations: {
					...current.conversations,
					[targetId]: { ...previous, unreadCount: 0 },
				},
			};
		});
	}, []);

	useEffect(() => {
		if (
			!settings.enabled ||
			!settings.activeProfileId ||
			(settings.featureFlags.useFakeTyping === false &&
				settings.featureFlags.useFakeMessages === false)
		) {
			completedEventIdsRef.current.clear();
			scheduledProfileRef.current = null;
			setRuntime({ conversations: {} });
			return undefined;
		}
		const profileKey = String(settings.activeProfileId);
		if (scheduledProfileRef.current !== profileKey) {
			completedEventIdsRef.current.clear();
			scheduledProfileRef.current = profileKey;
		}
		const pendingEvents = data.events.filter(event => {
			if (completedEventIdsRef.current.has(String(event.id))) return false;
			const eventType = event.eventType || event.type;
			if (eventType === 'incoming_message') {
				return settings.featureFlags.useFakeMessages !== false;
			}
			return settings.featureFlags.useFakeTyping !== false;
		});
		const scheduler = createDemoEventScheduler({
			events: pendingEvents.map(event => ({
				...event,
				randomize:
					event.randomize ||
					settings.featureFlags.randomDelays === true ||
					((event.eventType || event.type) === 'typing' &&
						settings.featureFlags.randomTyping === true),
			})),
			randomSeed: settings.randomSeed,
			onEvent: event => {
				completedEventIdsRef.current.add(String(event.id));
				applyRuntimeEvent(event);
			},
		});
		return () => scheduler.stop();
	}, [
		applyRuntimeEvent,
		data.events,
		settings.activeProfileId,
		settings.enabled,
		settings.featureFlags.useFakeMessages,
		settings.featureFlags.useFakeTyping,
		settings.featureFlags.randomDelays,
		settings.featureFlags.randomTyping,
		settings.randomSeed,
	]);

	const value = useMemo(
		() => ({
			settings,
			profiles,
			data,
			runtime,
			loading,
			saving,
			error,
			refresh,
			refreshActiveProfile,
			updateSettings,
			setEnabled,
			setFeatureFlag,
			activateProfile,
			createProfile,
			updateProfile,
			cloneProfile,
			deleteProfile,
			createContact,
			updateContact,
			deleteContact,
			createRealOverlay,
			updateConversation,
			deleteConversation,
			createMessage,
			updateMessage,
			deleteMessage,
			createEvent,
			deleteEvent,
			applyRuntimeEvent,
			markRuntimeRead,
		}),
		[
			activateProfile,
			applyRuntimeEvent,
			createContact,
			createEvent,
			createMessage,
			createProfile,
			data,
			deleteContact,
			createRealOverlay,
			updateConversation,
			deleteConversation,
			deleteEvent,
			deleteMessage,
			deleteProfile,
			error,
			loading,
			markRuntimeRead,
			profiles,
			refresh,
			refreshActiveProfile,
			runtime,
			saving,
			setEnabled,
			setFeatureFlag,
			settings,
			updateMessage,
			updateProfile,
			cloneProfile,
			updateSettings,
		],
	);

	return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
	const context = useContext(DemoModeContext);
	if (!context) throw new Error('useDemoMode must be used inside DemoModeProvider.');
	return context;
}
