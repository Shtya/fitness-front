/** Static assets for Fake Chat iPhone XR preview (from /public/fake-chat). */
export const FC_ASSETS = {
	arrowLeft: '/fake-chat/arrow-left.png',
	battery: '/fake-chat/battery.png',
	bottomActions: '/fake-chat/bottom-actions.png',
	callVideo: '/fake-chat/call-video.png',
	cellNetwork: '/fake-chat/cell-network.png',
	phone: '/fake-chat/phone.png',
	wifi: '/fake-chat/wifi.png',
	wallpaper: '/fake-chat/Wallpaper.png',
	/** Meta AI FAB (color rings) + white chat-bubble plate behind it. */
	metaAi: '/fake-chat/ai-assistent.png',
	metaAiBubble: '/fake-chat/popup-msg-left.png',
	/** iOS-style switch (off) for Contact Info → Lock chat. */
	switchOff: '/fake-chat/switch.png',
	tabUpdates: '/fake-chat/bottom-bar-actions/updates.png',
	tabCalls: '/fake-chat/bottom-bar-actions/phone.png',
	/** Filenames are swapped vs content — chats.png = people, communities.png = bubbles. */
	tabCommunities: '/fake-chat/bottom-bar-actions/chats.png',
	tabChats: '/fake-chat/bottom-bar-actions/communities.png',
	infoVoice: '/fake-chat/avatar-info/ui/voice.png',
	infoVideo: '/fake-chat/avatar-info/ui/video.png',
	infoSearch: '/fake-chat/avatar-info/ui/search.png',
	infoMedia: '/fake-chat/avatar-info/ui/media.png',
	infoStorage: '/fake-chat/avatar-info/ui/storage.png',
	infoKept: '/fake-chat/avatar-info/ui/kept.png',
	infoNotifications: '/fake-chat/avatar-info/ui/notifications.png',
	infoTheme: '/fake-chat/avatar-info/ui/theme.png',
	infoSavePhotos: '/fake-chat/avatar-info/ui/save-photos.png',
	infoDisappearing: '/fake-chat/avatar-info/ui/disappearing.png',
	infoTranscript: '/fake-chat/avatar-info/ui/transcript.png',
	infoLockChat: '/fake-chat/avatar-info/ui/lock-chat.png',
	infoPrivacy: '/fake-chat/avatar-info/ui/privacy.png',
	infoEncryption: '/fake-chat/avatar-info/ui/encryption.png',
	infoAddGroup: '/fake-chat/avatar-info/ui/add-group.png',
	/** iOS 7 Popcorn notification (from Zedge sample). */
	tonePopcorn: '/fake-chat/tones/popcorn.mp3',
	/** Pixel-perfect thread chrome crops (status+nav / composer+home). */
	threadHeaderChrome: '/fake-chat/thread-header-chrome.jpg',
	threadComposer: '/fake-chat/thread-composer.png',
};

export const LIST_AVATARS = {
	m5zoon: '/fake-chat/list-avatars/m5zoon.png',
	youNote: '/fake-chat/list-avatars/you-note.png',
	attendance: '/fake-chat/list-avatars/attendance.png',
	mohamed: '/fake-chat/list-avatars/mohamed.png',
	noor: '/fake-chat/list-avatars/noor.png',
	nurseconnect: '/fake-chat/list-avatars/nurseconnect.png',
	qatar: '/fake-chat/list-avatars/qatar.png',
	nour: '/fake-chat/list-avatars/nour.png',
	cloudilic: '/fake-chat/list-avatars/cloudilic.png',
	zoozo: '/fake-chat/list-avatars/zoozo.png',
	abdou: '/fake-chat/list-avatars/abdou.png',
	adam: '/fake-chat/list-avatars/adam.png',
	mybro: '/fake-chat/list-avatars/mybro.png',
	hazem: '/fake-chat/list-avatars/hazem.png',
	whatsapp: '/fake-chat/list-avatars/whatsapp.png',
	marrmora: '/fake-chat/list-avatars/marrmora.png',
	family: '/fake-chat/list-avatars/family.png',
	yousef: '/fake-chat/list-avatars/yousef.png',
	youTab: '/fake-chat/list-avatars/you-tab.png',
};

/** Pixelated extract stubs — never show; use gradient + SVG instead. */
export const BAD_STUB_AVATARS = new Set([
	'/fake-chat/list-avatars/avatar-user.png',
	'/fake-chat/list-avatars/avatar-group.png',
	'/fake-chat/list-avatars/unknown-number.png',
	'/fake-chat/list-avatars/number-072.png',
	'/fake-chat/list-avatars/number-155.png',
	'/fake-chat/list-avatars/number-643.png',
	'/fake-chat/list-avatars/hellocreator.png',
	'/fake-chat/list-avatars/offers.png',
	'/fake-chat/list-avatars/image.png',
]);

export function isBadStubAvatar(src) {
	const s = String(src || '').trim();
	return !s || BAD_STUB_AVATARS.has(s);
}

/**
 * Real photo URL only. Empty → AvatarCircle draws WA gradient + clean SVG stub
 * (user vs group) — never the old pixelated avatar-user/group PNGs.
 */
export function resolveChatAvatarSrc(chat) {
	const src = String(chat?.avatar || '').trim();
	if (isBadStubAvatar(src)) return '';
	return src;
}

export function resolveChatAvatarKind(chat) {
	if (chat?.avatarKind === 'group') return 'group';
	if (chat?.metaAi || chat?.whatsapp || chat?.avatarKind === 'whatsapp') return 'user';
	return 'user';
}
