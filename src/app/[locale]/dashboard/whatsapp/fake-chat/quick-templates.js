import { formatChatBubbleTime, nextId } from './capture';
import { dateKeyDaysAgo } from './chat-dates';
import { DEFAULT_CHAT_INFO, listFieldsFromMessages } from './defaults';

/** One-click starting points. Names are invented; everything stays editable afterwards. */
export const CHAT_TEMPLATES = [
	{ id: 'blank', ar: 'فاضي', en: 'Blank' },
	{ id: 'friend', ar: 'صديق · على يومين', en: 'Friend · over 2 days' },
	{ id: 'support', ar: 'خدمة عملاء', en: 'Customer support' },
	{ id: 'voice', ar: 'فويسات', en: 'Voice notes' },
	{ id: 'story', ar: 'رد على ستوري', en: 'Story replies' },
	{ id: 'media', ar: 'صور وفيديو', en: 'Photos and video' },
	{ id: 'unknown', ar: 'رقم جديد', en: 'New number' },
	{ id: 'group', ar: 'جروب', en: 'Group' },
];

function clockMinutesAgo(minutes, now) {
	return formatChatBubbleTime(new Date(now.getTime() - minutes * 60_000));
}

/** Builds the messages of a template; `when(minutesAgo, daysAgo)` stamps each one. */
function templateContent(id, when) {
	const say = (side, text, stamp, extra = {}) => ({ side, type: 'text', text, ...stamp, ...extra });
	const voice = (side, duration, stamp, extra = {}) => ({ side, type: 'voice', duration, ...stamp, ...extra });
	switch (id) {
		case 'friend':
			return {
				name: 'Karim Hassan',
				messages: [
					say('in', 'ازيك عامل ايه؟', when(40, 2)),
					say('out', 'الحمدلله تمام، وانت؟', when(35, 2)),
					say('in', 'هنتقابل امتى؟', when(90, 1)),
					say('out', 'بكره ان شاء الله', when(80, 1)),
					say('in', 'تمام مستنيك 👍', when(6, 0), { reaction: '❤️' }),
				],
			};
		case 'support':
			return {
				name: 'Mona Adel',
				messages: [
					say('in', 'السلام عليكم، عايزة أعرف تفاصيل الاشتراك', when(20, 0)),
					say('out', 'وعليكم السلام، أكيد. تحبي شهري ولا سنوي؟', when(18, 0)),
					say('in', 'شهري', when(15, 0)),
					say('out', 'تمام، هبعتلك التفاصيل حالا', when(14, 0), {
						reply: { author: 'Mona Adel', text: 'شهري', color: '#078d70' },
					}),
				],
			};
		case 'voice':
			return {
				name: 'Omar Fathy',
				messages: [
					voice('out', '0:08', when(30, 0)),
					say('in', 'تمام سمعته', when(28, 0)),
					voice('in', '0:51', when(25, 0), { played: true, transcribe: true }),
					voice('out', '0:07', when(10, 0), { played: true }),
				],
			};
		case 'story':
			return {
				name: 'Laila Samir',
				messages: [
					say('in', 'الصورة دي تحفة 🔥', when(30, 0), { story: { kind: 'photo', text: 'Photo', src: '' } }),
					say('out', 'تسلمي ❤️', when(28, 0)),
					say('out', 'فين الحتة دي؟', when(12, 0), { story: { kind: 'video', text: 'Video', src: '' } }),
					voice('in', '0:12', when(8, 0), {
						transcribe: true,
						reply: { author: 'You', text: 'فين الحتة دي؟', color: '#078d70' },
					}),
				],
			};
		case 'media':
			return {
				name: 'Youssef Nabil',
				messages: [
					say('in', 'ابعتلي الفيديو', when(30, 0)),
					{ side: 'out', type: 'video', src: '', duration: '0:15', hd: true, forward: true, ...when(25, 0) },
					{ side: 'in', type: 'image', src: '', caption: '', forward: true, ...when(20, 0) },
				],
			};
		case 'unknown':
			return {
				name: '+20 100 000 0000',
				phone: '+20 100 000 0000',
				about: '~Sama',
				firstContact: true,
				country: 'Egypt',
				showEncryptionNotice: true,
				messages: [say('in', 'السلام عليكم، حضرتك متاح؟', when(3, 0))],
			};
		case 'group':
			return {
				name: 'Team Group',
				avatarKind: 'group',
				subtitle: 'Sara, Ali, You',
				messages: [
					say('in', 'Sara: الاجتماع الساعة 5', when(30, 0)),
					say('out', 'تمام', when(25, 0)),
				],
			};
		default:
			return { name: 'New chat', messages: [] };
	}
}

export function buildTemplateChat(templateId, now = new Date()) {
	const when = (minutesAgo, daysAgo) => ({
		time: clockMinutesAgo(minutesAgo, now),
		date: dateKeyDaysAgo(daysAgo, now),
	});
	const { messages: rawMessages, ...fields } = templateContent(templateId, when);
	const messages = rawMessages.map(message => ({
		id: nextId('m'),
		ticks: message.side === 'out' ? 'read' : 'none',
		...message,
	}));
	return {
		id: nextId('c'),
		avatar: '',
		avatarKind: '',
		phone: '',
		about: '',
		subtitle: '',
		unread: 0,
		storyRing: false,
		timeGreen: false,
		metaAi: false,
		whatsapp: false,
		pinned: false,
		muted: false,
		disappearing: false,
		info: { ...DEFAULT_CHAT_INFO },
		...fields,
		...listFieldsFromMessages(messages, now),
		messages,
	};
}
