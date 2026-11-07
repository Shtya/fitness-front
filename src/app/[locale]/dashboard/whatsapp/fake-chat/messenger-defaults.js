import { formatChatBubbleTime, nextId } from './capture';
import { dateKeyDaysAgo } from './chat-dates';
import { createDefaultStudioState, listFieldsFromMessages } from './defaults';

/** Starting content for the Messenger mockup. Names are invented; everything is editable. */
export function createMessengerDefaultState(now = new Date()) {
	const base = createDefaultStudioState(now);
	const clock = minutesAgo => formatChatBubbleTime(new Date(now.getTime() - minutesAgo * 60_000));
	const stamp = (minutesAgo, daysAgo = 0) => ({ time: clock(minutesAgo), date: dateKeyDaysAgo(daysAgo, now) });
	const say = (side, text, when, extra = {}) => ({
		id: nextId('m'),
		side,
		type: 'text',
		text,
		ticks: side === 'out' ? 'read' : 'none',
		...when,
		...extra,
	});
	const firstMessages = [
		say('in', 'كنت مستنيك تيجي', stamp(420, 1)),
		{ id: nextId('m'), side: 'out', type: 'voice', duration: '0:10', ticks: 'read', ...stamp(390, 1) },
		{ id: nextId('m'), side: 'out', type: 'voice', duration: '0:06', ticks: 'read', ...stamp(389, 1) },
		say('in', 'تمام يا صديقي', stamp(370, 1)),
		say('in', 'تسلم يارب', stamp(369, 1), { reaction: '❤️' }),
		say('out', 'إن شاء الله', stamp(32, 0)),
	];
	const row = (id, name, messages, extra = {}) => ({
		id,
		name,
		avatar: '',
		avatarKind: '',
		phone: '',
		about: '',
		subtitle: '',
		unread: 0,
		info: base.list.chats[0]?.info,
		...listFieldsFromMessages(messages, now),
		messages,
		...extra,
	});
	const chats = [
		row('mg1', 'Sara Mahmoud', firstMessages, {
			storyRing: true,
			seenAvatar: true,
			verified: true,
			subtitle: 'Turn on Active Status',
		}),
		row('mg2', 'Mariam ❤️', [say('in', 'The audio call ended.', stamp(50, 0))]),
		row('mg3', 'Nagah Sadek', [say('in', 'Nagah sent an attachment.', stamp(420, 0))], { unread: 1, callButton: true }),
		row('mg4', 'Marketplace', [], { preview: '', time: 'Fri', avatarKind: '' }),
		row('mg5', 'Hossam Hassan', [say('in', 'هكلمك بكرة', stamp(90, 3))], { unread: 2 }),
		row('rq1', 'Nora Samy', [say('in', 'السلام عليكم ورحمة الله وبركاته', stamp(60, 90))], { request: true }),
		row('rq2', 'Zahra Abd Elrhman', [say('in', 'Zahra sent an attachment.', stamp(60, 120))], { request: true }),
	];
	return {
		...base,
		screen: 'list',
		activeChatId: 'mg1',
		list: {
			...base.list,
			title: 'messenger',
			searchPlaceholder: 'Ask Meta AI or search',
			unreadBadge: 13,
			groupsCount: 2,
			backCount: 30,
			chatsBadge: '30+',
			fbBadge: 5,
			peopleDot: true,
			notificationsDot: true,
			menuDot: true,
			selfAvatar: '',
			showSearch: true,
			layoutV2: true,
			chats,
			stories: [
				{ id: 'st1', name: 'نور', avatar: '', note: '' },
				{ id: 'st2', name: 'سمير', avatar: '', note: 'لا حول ولا قوة إلا بالله' },
				{ id: 'st3', name: 'محمود', avatar: '', note: '' },
			],
			selfNote: 'Current vibe...',
			suggestions: [],
		},
		thread: { ...base.thread, messages: firstMessages },
	};
}
