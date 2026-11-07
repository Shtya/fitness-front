'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
	Archive,
	ArchiveRestore,
	ArrowDown,
	ArrowUp,
	ChevronDown,
	Copy,
	Image as ImageIcon,
	Loader2,
	MessageSquare,
	Mic,
	Pin,
	Plus,
	RefreshCw,
	Trash2,
	UserRound,
	Video,
	BellOff,
	CircleDashed,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatChatBubbleTime, formatIosStatusTime } from './capture';
import { addMinutesToClock, dateKeyDaysAgo, resolveMessageDays, toDateKey } from './chat-dates';
import { resolveChatAvatarSrc } from './assets';
import { resolveBubbleTime } from './defaults';
import { resolveFakeChatMediaUrl, shortMediaPath, uploadFakeChatImage } from './media-url';

const field =
	'box-border h-[30px] w-full min-w-0 rounded-lg border border-[#d1d7db] bg-[#f6f7f8] px-2 text-xs text-[#111b21] outline-none focus:border-[#1dab61] dark:border-[#2a3942] dark:bg-[#0b141a] dark:text-[#e9edef]';
const small = 'text-[10.5px] font-semibold text-[#667781]';
const iconBtn =
	'grid h-[26px] w-[26px] shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 text-[#54656f] hover:bg-[#e9edef] dark:text-[#aebac1] dark:hover:bg-[#2a3942]';
const pillBtn =
	'inline-flex h-[28px] cursor-pointer items-center justify-center gap-1 rounded-lg border border-[#d1d7db] bg-white px-2 text-[11px] font-bold text-[#111b21] hover:bg-[#f0f2f5] dark:border-[#2a3942] dark:bg-[#111b21] dark:text-[#e9edef]';
const pillOn = 'border-[#1dab61] bg-[#d9fdd3] text-[#075e54] dark:bg-[#005c4b]/50 dark:text-[#21c063]';
const card =
	'flex min-w-0 shrink-0 flex-col gap-2 rounded-[10px] border border-[#e9edef] bg-white p-2.5 dark:border-[#222d34] dark:bg-[#111b21]';
const heading = 'm-0 text-[11px] font-extrabold uppercase tracking-wide text-[#667781]';

const TYPE_ICONS = { text: MessageSquare, voice: Mic, image: ImageIcon, video: Video, ticket: ImageIcon };
const QUOTE_COLORS = ['#078d70', '#c0522a', '#7f66ff', '#027eb5', '#d42a66'];
const REACTIONS = ['', '❤️', '👍', '😂', '😮', '😢', '🙏'];

function Field({ label, children, className = '' }) {
	return (
		<label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
			<span className={small}>{label}</span>
			{children}
		</label>
	);
}

function Toggle({ on, onChange, children, title }) {
	return (
		<button type="button" title={title} className={cn(pillBtn, on && pillOn)} onClick={() => onChange(!on)} aria-pressed={on}>
			{children}
		</button>
	);
}

/** Uploads a picked picture and hands back its short path. */
function UploadButton({ ar, onUploaded, children, className = '' }) {
	const [busy, setBusy] = useState(false);
	const onChange = async event => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		setBusy(true);
		try {
			const url = await uploadFakeChatImage(file);
			onUploaded(shortMediaPath(url) || url);
		} catch (error) {
			toast.error(error?.message || (ar ? 'تعذر رفع الصورة' : 'Could not upload image'));
		} finally {
			setBusy(false);
		}
	};
	return (
		<label className={cn(pillBtn, className)}>
			<input className="hidden" type="file" accept="image/*" onChange={event => void onChange(event)} />
			{busy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
			{children}
		</label>
	);
}

function DayPicker({ ar, value, onChange }) {
	const today = dateKeyDaysAgo(0);
	const yesterday = dateKeyDaysAgo(1);
	const twoDays = dateKeyDaysAgo(2);
	const options = [
		{ key: today, label: ar ? 'النهاردة' : 'Today' },
		{ key: yesterday, label: ar ? 'امبارح' : 'Yesterday' },
		{ key: twoDays, label: ar ? 'من يومين' : '2 days ago' },
	];
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1">
			{options.map(option => (
				<button
					key={option.key}
					type="button"
					className={cn(pillBtn, 'h-[26px]', value === option.key && pillOn)}
					onClick={() => onChange(option.key)}
				>
					{option.label}
				</button>
			))}
			<input
				type="date"
				className={cn(field, 'h-[26px] w-[118px]')}
				value={value || ''}
				onChange={event => onChange(event.target.value)}
				aria-label={ar ? 'تاريخ' : 'Date'}
			/>
		</div>
	);
}

function messageSummary(message, ar) {
	if (message.type === 'voice') return `${ar ? 'فويس' : 'Voice'} ${message.duration || ''}`;
	if (message.type === 'video') return message.caption || (ar ? 'فيديو' : 'Video');
	if (message.type === 'image' || message.type === 'ticket') return message.caption || (ar ? 'صورة' : 'Photo');
	return '';
}

function MessageDetails({ ar, message, day, onUpdate, chatName }) {
	const mine = message.side === 'out';
	const quoteKind = message.story ? 'story' : message.reply ? 'message' : 'none';
	const setQuoteKind = kind => {
		if (kind === 'story') {
			onUpdate({ reply: null, story: message.story || { kind: 'photo', text: 'Photo', src: '' } });
		} else if (kind === 'message') {
			onUpdate({ story: null, reply: message.reply || { author: mine ? chatName : 'You', text: '', color: QUOTE_COLORS[0] } });
		} else {
			onUpdate({ story: null, reply: null });
		}
	};
	const patchStory = patch => onUpdate({ story: { ...message.story, ...patch } });
	const patchReply = patch => onUpdate({ reply: { ...message.reply, ...patch } });

	return (
		<div className="flex flex-col gap-2 border-t border-[#e9edef] pt-2 dark:border-[#2a3942]">
			<Field label={ar ? 'اليوم' : 'Day'}>
				<DayPicker ar={ar} value={day} onChange={date => onUpdate({ date })} />
			</Field>

			{mine ? (
				<Field label={ar ? 'علامة الاستلام' : 'Ticks'}>
					<select className={field} value={message.ticks || 'read'} onChange={event => onUpdate({ ticks: event.target.value })}>
						<option value="sent">{ar ? 'صح واحدة' : 'Sent'}</option>
						<option value="delivered">{ar ? 'صحين رمادي' : 'Delivered'}</option>
						<option value="read">{ar ? 'صحين أزرق' : 'Read'}</option>
					</select>
				</Field>
			) : null}

			{message.type === 'voice' ? (
				<div className="flex flex-wrap items-end gap-1.5">
					<Field label={ar ? 'المدة' : 'Length'} className="w-[64px]">
						<input className={field} value={message.duration || ''} onChange={event => onUpdate({ duration: event.target.value })} placeholder="0:08" />
					</Field>
					<Toggle on={Boolean(message.played)} onChange={played => onUpdate({ played })}>
						{ar ? 'اتسمع' : 'Played'}
					</Toggle>
					<Toggle on={Boolean(message.transcribe)} onChange={transcribe => onUpdate({ transcribe })}>
						Transcribe
					</Toggle>
				</div>
			) : null}

			{message.type === 'image' || message.type === 'video' || message.type === 'ticket' ? (
				<>
					<div className="flex flex-wrap items-end gap-1.5">
						<UploadButton ar={ar} onUploaded={src => onUpdate({ src })}>
							{message.type === 'video' ? (ar ? 'صورة الفيديو' : 'Thumbnail') : ar ? 'الصورة' : 'Picture'}
						</UploadButton>
						{message.type === 'video' ? (
							<>
								<Field label={ar ? 'المدة' : 'Length'} className="w-[64px]">
									<input className={field} value={message.duration || ''} onChange={event => onUpdate({ duration: event.target.value })} placeholder="0:15" />
								</Field>
								<Toggle on={Boolean(message.hd)} onChange={hd => onUpdate({ hd })}>
									HD
								</Toggle>
							</>
						) : null}
						<Toggle on={Boolean(message.forward)} onChange={forward => onUpdate({ forward })}>
							{ar ? 'زر التحويل' : 'Forward'}
						</Toggle>
					</div>
					<Field label={ar ? 'تعليق' : 'Caption'}>
						<input className={field} dir="auto" value={message.caption || ''} onChange={event => onUpdate({ caption: event.target.value })} />
					</Field>
				</>
			) : null}

			<Field label={ar ? 'رد على' : 'Replying to'}>
				<div className="grid grid-cols-3 gap-1">
					{[
						{ id: 'none', label: ar ? 'لا شيء' : 'Nothing' },
						{ id: 'message', label: ar ? 'رسالة' : 'Message' },
						{ id: 'story', label: ar ? 'ستوري' : 'Story' },
					].map(option => (
						<button key={option.id} type="button" className={cn(pillBtn, quoteKind === option.id && pillOn)} onClick={() => setQuoteKind(option.id)}>
							{option.label}
						</button>
					))}
				</div>
			</Field>

			{message.story ? (
				<div className="grid grid-cols-2 gap-1.5">
					<Field label={ar ? 'ستوري مين' : 'Whose story'}>
						<input className={field} dir="auto" value={message.story.author ?? ''} onChange={event => patchStory({ author: event.target.value })} placeholder={mine ? chatName : 'You'} />
					</Field>
					<Field label={ar ? 'نوعها' : 'Type'}>
						<select
							className={field}
							value={message.story.kind || 'photo'}
							onChange={event => patchStory({ kind: event.target.value, text: event.target.value === 'video' ? 'Video' : 'Photo' })}
						>
							<option value="photo">{ar ? 'صورة' : 'Photo'}</option>
							<option value="video">{ar ? 'فيديو' : 'Video'}</option>
						</select>
					</Field>
					<Field label={ar ? 'النص' : 'Text'}>
						<input className={field} dir="auto" value={message.story.text || ''} onChange={event => patchStory({ text: event.target.value })} />
					</Field>
					<div className="flex items-end">
						<UploadButton ar={ar} className="w-full" onUploaded={src => patchStory({ src })}>
							{ar ? 'صورة الستوري' : 'Story picture'}
						</UploadButton>
					</div>
				</div>
			) : null}

			{message.reply ? (
				<div className="grid grid-cols-2 gap-1.5">
					<Field label={ar ? 'الاسم' : 'Name'}>
						<input className={field} dir="auto" value={message.reply.author || ''} onChange={event => patchReply({ author: event.target.value })} />
					</Field>
					<Field label={ar ? 'نوعها' : 'Type'}>
						<select className={field} value={message.reply.kind || 'text'} onChange={event => patchReply({ kind: event.target.value })}>
							<option value="text">{ar ? 'نص' : 'Text'}</option>
							<option value="voice">{ar ? 'فويس' : 'Voice'}</option>
						</select>
					</Field>
					<Field label={ar ? 'النص' : 'Text'} className="col-span-2">
						<input className={field} dir="auto" value={message.reply.text || ''} onChange={event => patchReply({ text: event.target.value })} placeholder={message.reply.kind === 'voice' ? 'Voice message (0:08)' : ''} />
					</Field>
					<div className="col-span-2 flex items-center gap-1.5">
						{QUOTE_COLORS.map(color => (
							<button
								key={color}
								type="button"
								aria-label={color}
								onClick={() => patchReply({ color })}
								className={cn('h-5 w-5 cursor-pointer rounded-full border-2', (message.reply.color || QUOTE_COLORS[0]) === color ? 'border-[#111b21] dark:border-white' : 'border-transparent')}
								style={{ background: color }}
							/>
						))}
					</div>
				</div>
			) : null}

			<Field label={ar ? 'رياكشن' : 'Reaction'}>
				<div className="flex flex-wrap gap-1">
					{REACTIONS.map(reaction => (
						<button
							key={reaction || 'none'}
							type="button"
							className={cn(pillBtn, 'h-[26px] min-w-[32px]', (message.reaction || '') === reaction && pillOn)}
							onClick={() => onUpdate({ reaction })}
						>
							{reaction || '—'}
						</button>
					))}
				</div>
			</Field>
		</div>
	);
}

function MessageRow({ ar, message, day, expanded, onExpand, onUpdate, onRemove, onMove, chatName }) {
	const Icon = TYPE_ICONS[message.type] || MessageSquare;
	const mine = message.side === 'out';
	return (
		<li className="flex min-w-0 flex-col gap-2 rounded-lg bg-[#f6f7f8] p-1.5 dark:bg-[#0b141a]">
			<div className="flex min-w-0 items-center gap-1">
				<button
					type="button"
					title={ar ? 'بدّل المرسل' : 'Switch sender'}
					className={cn('grid h-[26px] w-[26px] shrink-0 cursor-pointer place-items-center rounded-md border-0 text-[10px] font-extrabold', mine ? 'bg-[#d9fdd3] text-[#075e54]' : 'bg-white text-[#54656f] ring-1 ring-[#d1d7db]')}
					onClick={() => onUpdate({ side: mine ? 'in' : 'out', ticks: mine ? 'none' : 'read' })}
				>
					{mine ? (ar ? 'أنا' : 'Me') : <UserRound size={13} />}
				</button>
				{message.type === 'text' ? (
					<input
						className={cn(field, 'h-[26px] flex-1')}
						dir="auto"
						value={message.text || ''}
						onChange={event => onUpdate({ text: event.target.value })}
						aria-label={ar ? 'نص الرسالة' : 'Message text'}
					/>
				) : (
					<button type="button" className={cn(field, 'flex h-[26px] flex-1 cursor-pointer items-center gap-1 text-start')} onClick={onExpand}>
						<Icon size={12} className="shrink-0" />
						<span className="truncate" dir="auto">
							{messageSummary(message, ar)}
						</span>
					</button>
				)}
				<input
					className={cn(field, 'h-[26px] w-[66px] shrink-0 px-1 text-center text-[11px]')}
					dir="ltr"
					value={resolveBubbleTime(message)}
					onChange={event => onUpdate({ time: event.target.value })}
					aria-label={ar ? 'الوقت' : 'Time'}
				/>
				<button type="button" className={iconBtn} onClick={onExpand} aria-expanded={expanded} aria-label={ar ? 'تفاصيل' : 'Details'}>
					<ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
				</button>
				<button type="button" className={cn(iconBtn, 'text-[#e35d6a] dark:text-[#e35d6a]')} onClick={onRemove} aria-label={ar ? 'حذف' : 'Delete'}>
					<Trash2 size={13} />
				</button>
			</div>
			{expanded ? (
				<>
					<div className="flex items-center gap-1">
						<button type="button" className={pillBtn} onClick={() => onMove(-1)}>
							<ArrowUp size={12} />
							{ar ? 'فوق' : 'Up'}
						</button>
						<button type="button" className={pillBtn} onClick={() => onMove(1)}>
							<ArrowDown size={12} />
							{ar ? 'تحت' : 'Down'}
						</button>
					</div>
					<MessageDetails ar={ar} message={message} day={day} onUpdate={onUpdate} chatName={chatName} />
				</>
			) : null}
		</li>
	);
}

function Composer({ ar, messages, onAdd, onDayChange }) {
	const [side, setSide] = useState('in');
	const [text, setText] = useState('');
	const [dayChoice, setDayChoice] = useState('');
	const [time, setTime] = useState('');
	const last = messages[messages.length - 1];
	const lastDay = resolveMessageDays(messages)[messages.length - 1] || '';
	const day = dayChoice || lastDay || toDateKey();
	// Moving to a later day starts from now; the same day continues a minute after the last message.
	const suggestedTime =
		dayChoice && dayChoice !== lastDay
			? formatChatBubbleTime()
			: last
				? addMinutesToClock(resolveBubbleTime(last), 1)
				: formatChatBubbleTime();
	const stamp = () => ({ side, time: time.trim() || suggestedTime, date: day, ticks: side === 'out' ? 'read' : 'none' });
	const reset = () => {
		setText('');
		setTime('');
		setDayChoice('');
		onDayChange?.();
	};
	const add = extra => {
		onAdd({ ...stamp(), ...extra });
		reset();
	};
	const addText = () => {
		if (!text.trim()) return;
		add({ type: 'text', text: text.trim() });
	};
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex min-w-0 items-center gap-1">
				<div className="grid shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-[#e9edef] p-0.5 dark:bg-[#1f2c34]">
					<button type="button" className={cn('h-[26px] cursor-pointer rounded-md border-0 px-2 text-[11px] font-bold', side === 'in' ? 'bg-white text-[#111b21] shadow-sm' : 'bg-transparent text-[#667781]')} onClick={() => setSide('in')}>
						{ar ? 'وارد' : 'In'}
					</button>
					<button type="button" className={cn('h-[26px] cursor-pointer rounded-md border-0 px-2 text-[11px] font-bold', side === 'out' ? 'bg-[#d9fdd3] text-[#075e54] shadow-sm' : 'bg-transparent text-[#667781]')} onClick={() => setSide('out')}>
						{ar ? 'أنا' : 'Me'}
					</button>
				</div>
				<input
					className={cn(field, 'flex-1')}
					dir="auto"
					value={text}
					onChange={event => setText(event.target.value)}
					onKeyDown={event => {
						if (event.key === 'Enter') {
							event.preventDefault();
							addText();
						}
					}}
					placeholder={ar ? 'اكتب وEnter…' : 'Type and press Enter…'}
				/>
				<input
					className={cn(field, 'w-[66px] shrink-0 px-1 text-center text-[11px]')}
					dir="ltr"
					value={time}
					onChange={event => setTime(event.target.value)}
					placeholder={suggestedTime}
					aria-label={ar ? 'الوقت' : 'Time'}
				/>
			</div>
			<DayPicker ar={ar} value={day} onChange={setDayChoice} />
			<div className="grid grid-cols-4 gap-1">
				<button type="button" className={pillBtn} onClick={() => add({ type: 'voice', duration: '0:08' })}>
					<Mic size={12} />
					{ar ? 'فويس' : 'Voice'}
				</button>
				<UploadButton ar={ar} onUploaded={src => add({ type: 'image', src, caption: text.trim() })}>
					{ar ? 'صورة' : 'Photo'}
				</UploadButton>
				<UploadButton ar={ar} onUploaded={src => add({ type: 'video', src, duration: '0:15', hd: true, caption: text.trim() })}>
					{ar ? 'فيديو' : 'Video'}
				</UploadButton>
				<button
					type="button"
					className={pillBtn}
					title={ar ? 'رسالة بتعلق على ستوري' : 'A message commenting on a story'}
					onClick={() => add({ type: 'text', text: text.trim() || (ar ? 'تحفة 🔥' : 'Love this 🔥'), story: { kind: 'photo', text: 'Photo', src: '' } })}
				>
					<CircleDashed size={12} />
					{ar ? 'ستوري' : 'Story'}
				</button>
			</div>
		</div>
	);
}

function StatusCard({ ar, status, onStatus }) {
	return (
		<details className={card}>
			<summary className={cn(heading, 'cursor-pointer select-none')}>
				{ar ? 'شريط الموبايل' : 'Phone status bar'} · {status.time}
			</summary>
			<div className="mt-1 grid grid-cols-3 gap-1.5">
				<Field label={ar ? 'الوقت' : 'Time'}>
					<input className={field} dir="ltr" value={status.time} onChange={event => onStatus({ time: event.target.value, manualTime: true })} />
				</Field>
				<Field label={ar ? 'البطارية %' : 'Battery %'}>
					<input className={field} type="number" min={1} max={100} value={status.battery} onChange={event => onStatus({ battery: Number(event.target.value) || 1 })} />
				</Field>
				<Field label={ar ? 'الشبكة 0-4' : 'Signal 0-4'}>
					<input className={field} type="number" min={0} max={4} value={status.signal ?? 4} onChange={event => onStatus({ signal: Math.max(0, Math.min(4, Number(event.target.value) || 0)) })} />
				</Field>
			</div>
			<div className="flex flex-wrap gap-1">
				<button type="button" className={cn(pillBtn, !status.manualTime && pillOn)} onClick={() => onStatus({ manualTime: false, time: formatIosStatusTime() })}>
					{ar ? 'الوقت الحالي' : 'Live clock'}
				</button>
				<Toggle on={status.wifi !== false} onChange={wifi => onStatus({ wifi })}>
					Wi-Fi
				</Toggle>
				<Toggle on={status.dualSim !== false} onChange={dualSim => onStatus({ dualSim })}>
					{ar ? 'خطين' : 'Dual SIM'}
				</Toggle>
			</div>
		</details>
	);
}

function ChatDetails({ ar, messenger, chat, list, onActiveChat, onList, onThread, onPickAvatar, onOpenContact }) {
	return (
		<details className={card}>
			<summary className={cn(heading, 'cursor-pointer select-none')}>{ar ? 'تفاصيل الشات والصور' : 'Chat details and pictures'}</summary>
			<div className="mt-1 grid grid-cols-2 gap-1.5">
				<Field label={ar ? 'الرقم' : 'Phone'}>
					<input className={field} dir="ltr" value={chat.phone || ''} onChange={event => onActiveChat({ phone: event.target.value })} />
				</Field>
				<Field label={ar ? 'الاسم (~)' : 'About (~)'}>
					<input className={field} dir="auto" value={chat.about || ''} onChange={event => onActiveChat({ about: event.target.value })} />
				</Field>
				<Field label={ar ? 'تحت الاسم' : 'Under the name'} className="col-span-2">
					<input className={field} dir="auto" value={chat.subtitle || ''} onChange={event => onActiveChat({ subtitle: event.target.value })} placeholder="tap for contact info" />
				</Field>
			</div>
			<div className="flex flex-wrap gap-1">
				{messenger ? (
					<>
						<Toggle on={Boolean(chat.storyRing)} onChange={storyRing => onActiveChat({ storyRing })}>
							{ar ? 'حلقة الستوري' : 'Story ring'}
						</Toggle>
						<Toggle on={Boolean(chat.verified)} onChange={verified => onActiveChat({ verified })}>
							{ar ? 'موثق' : 'Verified'}
						</Toggle>
						<Toggle on={Boolean(chat.seenAvatar)} onChange={seenAvatar => onActiveChat({ seenAvatar })}>
							{ar ? 'صورة شوهد' : 'Seen photo'}
						</Toggle>
						<Toggle on={Boolean(chat.callButton)} onChange={callButton => onActiveChat({ callButton })}>
							{ar ? 'زر مكالمة' : 'Call button'}
						</Toggle>
						<Toggle on={Boolean(chat.request)} onChange={request => onActiveChat({ request })}>
							{ar ? 'في الطلبات' : 'In requests'}
						</Toggle>
					</>
				) : (
					<Toggle on={Boolean(chat.firstContact)} onChange={firstContact => onActiveChat({ firstContact, showEncryptionNotice: firstContact })}>
						{ar ? 'رقم جديد' : 'New number'}
					</Toggle>
				)}
				<Toggle on={Boolean(chat.archived)} onChange={archived => onActiveChat({ archived })}>
					{ar ? 'في الأرشيف' : 'Archived'}
				</Toggle>
				<Toggle on={Boolean(chat.disappearing)} onChange={disappearing => onActiveChat({ disappearing })}>
					{ar ? 'رسائل مؤقتة' : 'Disappearing'}
				</Toggle>
				<Toggle on={Boolean(chat.showJumpDown)} onChange={showJumpDown => onActiveChat({ showJumpDown })}>
					{ar ? 'سهم لتحت' : 'Jump button'}
				</Toggle>
				<Toggle on={chat.avatarKind === 'group'} onChange={group => onActiveChat({ avatarKind: group ? 'group' : '' })}>
					{ar ? 'جروب' : 'Group'}
				</Toggle>
			</div>
			{chat.firstContact ? (
				<Field label={ar ? 'الدولة' : 'Country'}>
					<input className={field} value={chat.country || ''} onChange={event => onActiveChat({ country: event.target.value })} placeholder="Egypt" />
				</Field>
			) : null}
			<div className="grid grid-cols-3 gap-1">
				<label className={pillBtn}>
					<input className="hidden" type="file" accept="image/*" onChange={event => onPickAvatar('contactAvatar', event)} />
					{ar ? 'صورته' : 'Their photo'}
				</label>
				<label className={pillBtn}>
					<input className="hidden" type="file" accept="image/*" onChange={event => onPickAvatar('selfAvatar', event)} />
					{ar ? 'صورتي' : 'My photo'}
				</label>
				<label className={pillBtn}>
					<input className="hidden" type="file" accept="image/*" onChange={event => onPickAvatar('wallpaper', event)} />
					{ar ? 'الخلفية' : 'Wallpaper'}
				</label>
			</div>
			<div className="flex flex-wrap gap-1">
				<button type="button" className={pillBtn} onClick={onOpenContact}>
					{ar ? 'افتح المعلومات' : 'Open info'}
				</button>
				{list.selfAvatar ? (
					<button type="button" className={pillBtn} onClick={() => onList({ selfAvatar: '' })}>
						{ar ? 'شيل صورتي' : 'Remove my photo'}
					</button>
				) : null}
				<button type="button" className={pillBtn} onClick={() => onThread({ wallpaper: '' })}>
					{ar ? 'الخلفية الأصلية' : 'Default wallpaper'}
				</button>
			</div>
		</details>
	);
}

function ContactInfoCard({ ar, chat, onActiveChat }) {
	const info = chat.info || {};
	const rows = [
		['mediaCount', ar ? 'الوسائط' : 'Media'],
		['storage', ar ? 'المساحة' : 'Storage'],
		['keptMessages', ar ? 'المحفوظة' : 'Kept'],
		['disappearing', ar ? 'المؤقتة' : 'Disappearing'],
		['saveToPhotos', ar ? 'حفظ للصور' : 'Save to Photos'],
		['advancedPrivacy', ar ? 'الخصوصية' : 'Privacy'],
	];
	return (
		<section className={card}>
			<h3 className={heading}>{ar ? 'صفحة المعلومات' : 'Info page'}</h3>
			<div className="grid grid-cols-2 gap-1.5">
				{rows.map(([key, label]) => (
					<Field key={key} label={label}>
						<input className={field} value={info[key] || ''} onChange={event => onActiveChat({ [key]: event.target.value })} />
					</Field>
				))}
			</div>
			<Field label={ar ? 'لغة التفريغ' : 'Transcript language'}>
				<input className={field} value={info.transcriptLanguage || ''} onChange={event => onActiveChat({ transcriptLanguage: event.target.value })} />
			</Field>
			<Toggle on={Boolean(info.lockChat)} onChange={lockChat => onActiveChat({ lockChat })}>
				{ar ? 'قفل الشات' : 'Lock chat'}
			</Toggle>
		</section>
	);
}

function ChatListRow({ ar, chat, active, onOpen, onEdit, onRemove, onDuplicate, onPickAvatar }) {
	const [open, setOpen] = useState(false);
	const avatar = resolveChatAvatarSrc(chat);
	return (
		<li className={cn('flex min-w-0 flex-col gap-1.5 rounded-lg bg-[#f6f7f8] p-1.5 dark:bg-[#0b141a]', active && 'ring-1 ring-[#1dab61]')}>
			<div className="flex min-w-0 items-center gap-1">
				<label className="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-full bg-[#cfd8dc]" title={ar ? 'غيّر الصورة' : 'Change photo'}>
					<input className="hidden" type="file" accept="image/*" onChange={event => onPickAvatar(chat.id, event)} />
					{avatar ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={resolveFakeChatMediaUrl(avatar)} alt="" className="h-full w-full object-cover" />
					) : null}
				</label>
				<input className={cn(field, 'h-[26px] flex-1')} dir="auto" value={chat.name} onChange={event => onEdit({ name: event.target.value })} aria-label={ar ? 'الاسم' : 'Name'} />
				<input
					className={cn(field, 'h-[26px] w-[38px] shrink-0 px-0.5 text-center')}
					type="number"
					min={0}
					value={chat.unread || 0}
					onChange={event => onEdit({ unread: Number(event.target.value) || 0 })}
					title={ar ? 'غير مقروء' : 'Unread'}
				/>
				<button type="button" className={cn(iconBtn, chat.pinned && 'bg-[#d9fdd3] text-[#075e54]')} onClick={() => onEdit({ pinned: !chat.pinned })} aria-pressed={Boolean(chat.pinned)} aria-label="Pin">
					<Pin size={13} />
				</button>
				<button type="button" className={cn(iconBtn, chat.muted && 'bg-[#d9fdd3] text-[#075e54]')} onClick={() => onEdit({ muted: !chat.muted })} aria-pressed={Boolean(chat.muted)} aria-label="Mute">
					<BellOff size={13} />
				</button>
				<button
					type="button"
					className={cn(iconBtn, chat.archived && 'bg-[#d9fdd3] text-[#075e54]')}
					onClick={() => onEdit({ archived: !chat.archived })}
					aria-pressed={Boolean(chat.archived)}
					title={chat.archived ? (ar ? 'رجّعه من الأرشيف' : 'Unarchive') : ar ? 'أرشفة' : 'Archive'}
				>
					{chat.archived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
				</button>
				<button type="button" className={iconBtn} onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={ar ? 'تفاصيل' : 'Details'}>
					<ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
				</button>
			</div>
			{open ? (
				<div className="grid grid-cols-2 gap-1.5">
					<Field label={ar ? 'آخر رسالة' : 'Last message'} className="col-span-2">
						<input className={field} dir="auto" value={chat.preview || ''} onChange={event => onEdit({ preview: event.target.value })} />
					</Field>
					<Field label={ar ? 'الوقت' : 'Time'}>
						<input className={field} dir="ltr" value={chat.time || ''} onChange={event => onEdit({ time: event.target.value })} />
					</Field>
					<Field label={ar ? 'العلامة' : 'Ticks'}>
						<select className={field} value={chat.ticks || ''} onChange={event => onEdit({ ticks: event.target.value })}>
							<option value="">{ar ? 'بدون' : 'None'}</option>
							<option value="sent">{ar ? 'صح واحدة' : 'Sent'}</option>
							<option value="delivered">{ar ? 'صحين رمادي' : 'Delivered'}</option>
							<option value="read">{ar ? 'صحين أزرق' : 'Read'}</option>
						</select>
					</Field>
					<div className="col-span-2 flex flex-wrap gap-1">
						<button type="button" className={pillBtn} onClick={onOpen}>
							{ar ? 'افتح الشات' : 'Open chat'}
						</button>
						<button type="button" className={pillBtn} onClick={onDuplicate}>
							<Copy size={12} />
							{ar ? 'نسخة' : 'Duplicate'}
						</button>
						<button type="button" className={cn(pillBtn, 'text-[#b42318]')} onClick={onRemove}>
							<Trash2 size={12} />
							{ar ? 'حذف' : 'Delete'}
						</button>
					</div>
				</div>
			) : null}
		</li>
	);
}

/** Everything on one short panel: pick a chat, edit its messages, details stay folded. */
export default function QuickEditor({
	ar,
	app = 'whatsapp',
	state,
	activeChat,
	messages,
	onStatus,
	onList,
	onListChat,
	onActiveChat,
	onThread,
	onAddMessage,
	onUpdateMessage,
	onRemoveMessage,
	onMoveMessage,
	onOpenChat,
	onRemoveChat,
	onDuplicateChat,
	onOpenContact,
	onPickAvatar,
	onPickListAvatar,
	onSyncInbox,
	onSyncAvatars,
	syncingAvatars,
	canSync,
	listEditMode,
	onToggleListEdit,
}) {
	const [expandedId, setExpandedId] = useState('');
	const days = useMemo(() => resolveMessageDays(messages), [messages]);
	const list = state.list;
	const screen = state.screen;
	const messenger = app === 'messenger';
	const rowsOnScreen = screen === 'list' || screen === 'archived' || screen === 'requests';
	const archivedChats = list.chats.filter(chat => chat.archived);
	const rowChats =
		screen === 'requests'
			? list.chats.filter(chat => chat.request)
			: messenger
				? list.chats.filter(chat => !chat.request)
				: screen === 'archived'
					? archivedChats
					: list.chats.filter(chat => !chat.archived);

	return (
		<>
			{!rowsOnScreen && activeChat ? (
				<section className={card}>
					<div className="flex min-w-0 items-center gap-1">
						<select className={cn(field, 'flex-1')} value={activeChat.id} onChange={event => onOpenChat(event.target.value)} aria-label={ar ? 'الشات' : 'Chat'}>
							{list.chats.map(chat => (
								<option key={chat.id} value={chat.id}>
									{chat.name}
								</option>
							))}
						</select>
						<button type="button" className={iconBtn} onClick={() => onDuplicateChat(activeChat.id)} title={ar ? 'نسخة من الشات' : 'Duplicate chat'}>
							<Copy size={13} />
						</button>
						<button type="button" className={cn(iconBtn, 'text-[#e35d6a] dark:text-[#e35d6a]')} onClick={() => onRemoveChat(activeChat.id)} title={ar ? 'حذف الشات' : 'Delete chat'}>
							<Trash2 size={13} />
						</button>
					</div>
					<div className="grid grid-cols-[1fr_72px] gap-1.5">
						<Field label={ar ? 'الاسم' : 'Name'}>
							<input className={field} dir="auto" value={activeChat.name || ''} onChange={event => onActiveChat({ name: event.target.value })} />
						</Field>
						<Field label={ar ? 'رقم الرجوع' : 'Back count'}>
							<input className={field} type="number" min={0} value={list.unreadBadge || 0} onChange={event => onList({ unreadBadge: Number(event.target.value) || 0 })} />
						</Field>
					</div>
				</section>
			) : null}

			{screen === 'thread' && activeChat ? (
				<section className={card}>
					<h3 className={heading}>
						{ar ? 'الرسائل' : 'Messages'} · {messages.length}
					</h3>
					<ul className="m-0 flex list-none flex-col gap-1 p-0">
						{messages.map((message, index) => (
							<MessageRow
								key={message.id}
								ar={ar}
								message={message}
								day={days[index]}
								chatName={activeChat.name}
								expanded={expandedId === message.id}
								onExpand={() => setExpandedId(current => (current === message.id ? '' : message.id))}
								onUpdate={patch => onUpdateMessage(message.id, patch)}
								onRemove={() => onRemoveMessage(message.id)}
								onMove={delta => onMoveMessage(message.id, delta)}
							/>
						))}
					</ul>
					<Composer ar={ar} messages={messages} onAdd={onAddMessage} />
				</section>
			) : null}

			{screen === 'contact' && activeChat ? <ContactInfoCard ar={ar} chat={activeChat} onActiveChat={onActiveChat} /> : null}

			{!rowsOnScreen && activeChat ? (
				<ChatDetails
					messenger={messenger}
					ar={ar}
					chat={activeChat}
					list={list}
					onActiveChat={onActiveChat}
					onList={onList}
					onThread={onThread}
					onPickAvatar={onPickAvatar}
					onOpenContact={onOpenContact}
				/>
			) : null}

			{rowsOnScreen ? (
				<>
					{screen === 'list' ? (
						<section className={card}>
							<h3 className={heading}>{ar ? 'الأرقام' : 'Counters'}</h3>
							{messenger ? (
								<>
									<div className="grid grid-cols-4 gap-1">
										{[
											['unreadBadge', 'Unread'],
											['groupsCount', 'Groups'],
											['backCount', ar ? 'الرجوع' : 'Back'],
											['fbBadge', 'Facebook'],
										].map(([key, label]) => (
											<Field key={key} label={label}>
												<input className={cn(field, 'px-1 text-center')} type="number" min={0} value={list[key] || 0} onChange={event => onList({ [key]: Number(event.target.value) || 0 })} />
											</Field>
										))}
									</div>
									<div className="grid grid-cols-2 gap-1">
										<Field label={ar ? 'بادج الشاتات' : 'Chats badge'}>
											<input className={field} value={list.chatsBadge || ''} onChange={event => onList({ chatsBadge: event.target.value })} placeholder="30+" />
										</Field>
										<Field label={ar ? 'نوتة ستوريك' : 'Your note'}>
											<input className={field} dir="auto" value={list.selfNote || ''} onChange={event => onList({ selfNote: event.target.value })} />
										</Field>
									</div>
									<div className="flex flex-wrap gap-1">
										<Toggle on={Boolean(list.peopleDot)} onChange={peopleDot => onList({ peopleDot })}>People ●</Toggle>
										<Toggle on={Boolean(list.notificationsDot)} onChange={notificationsDot => onList({ notificationsDot })}>Notifications ●</Toggle>
										<Toggle on={Boolean(list.menuDot)} onChange={menuDot => onList({ menuDot })}>Menu ●</Toggle>
									</div>
									<label className={pillBtn}>
										<input className="hidden" type="file" accept="image/*" onChange={event => onPickAvatar('selfAvatar', event)} />
										{ar ? 'صورتي' : 'My photo'}
									</label>
								</>
							) : (
								<>
									<div className="grid grid-cols-5 gap-1">
										{[
											['unreadBadge', 'Unread'],
											['callsBadge', 'Calls'],
											['favouritesCount', 'Fav'],
											['groupsCount', 'Groups'],
											['archivedCount', 'Archived'],
										].map(([key, label]) => (
											<Field key={key} label={label}>
												<input
													className={cn(field, 'px-1 text-center')}
													type="number"
													min={0}
													value={key === 'archivedCount' && archivedChats.length ? archivedChats.length : list[key] || 0}
													disabled={key === 'archivedCount' && archivedChats.length > 0}
													title={key === 'archivedCount' && archivedChats.length ? (ar ? 'بيتحسب من الشاتات المؤرشفة' : 'Counted from archived chats') : undefined}
													onChange={event => onList({ [key]: Number(event.target.value) || 0 })}
												/>
											</Field>
										))}
									</div>
									<div className="flex flex-wrap gap-1">
										<Toggle on={Boolean(list.showSearch)} onChange={showSearch => onList({ showSearch })}>
											{ar ? 'البحث والفلاتر' : 'Search and chips'}
										</Toggle>
										<Toggle on={Boolean(list.hidePhoneNumbers)} onChange={hidePhoneNumbers => onList({ hidePhoneNumbers })}>
											{ar ? 'إخفاء الأرقام' : 'Hide numbers'}
										</Toggle>
										<Toggle on={Boolean(list.showSuggestions)} onChange={showSuggestions => onList({ showSuggestions })}>
											{ar ? 'اقتراحات' : 'Suggestions'}
										</Toggle>
										<Toggle on={listEditMode} onChange={onToggleListEdit}>
											{ar ? 'تعديل على الشاشة' : 'Edit on screen'}
										</Toggle>
									</div>
								</>
							)}
						</section>
					) : null}
					{messenger && screen === 'list' ? (
						<section className={card}>
							<h3 className={heading}>{ar ? 'الستوريز' : 'Stories'}</h3>
							<ul className="m-0 flex list-none flex-col gap-1 p-0">
								{(list.stories || []).map(story => {
									const patchStory = patch =>
										onList({ stories: list.stories.map(item => (item.id === story.id ? { ...item, ...patch } : item)) });
									return (
										<li key={story.id} className="flex min-w-0 items-center gap-1">
											<UploadButton ar={ar} className="w-[30px] shrink-0 px-0" onUploaded={avatar => patchStory({ avatar })} />
											<input className={cn(field, 'h-[26px] w-[84px] shrink-0')} dir="auto" value={story.name} onChange={event => patchStory({ name: event.target.value })} aria-label={ar ? 'الاسم' : 'Name'} />
											<input className={cn(field, 'h-[26px] flex-1')} dir="auto" value={story.note || ''} onChange={event => patchStory({ note: event.target.value })} placeholder={ar ? 'نوتة' : 'Note'} />
											<button type="button" className={cn(iconBtn, 'text-[#e35d6a] dark:text-[#e35d6a]')} onClick={() => onList({ stories: list.stories.filter(item => item.id !== story.id) })} aria-label={ar ? 'حذف' : 'Delete'}>
												<Trash2 size={13} />
											</button>
										</li>
									);
								})}
							</ul>
							<button type="button" className={pillBtn} onClick={() => onList({ stories: [...(list.stories || []), { id: `st-${Date.now()}`, name: ar ? 'اسم' : 'Name', avatar: '', note: '' }] })}>
								<Plus size={12} />
								{ar ? 'ستوري' : 'Story'}
							</button>
						</section>
					) : null}
					<section className={card}>
						<h3 className={heading}>
							{screen === 'archived' ? (ar ? 'الأرشيف' : 'Archived') : screen === 'requests' ? (ar ? 'الطلبات' : 'Requests') : ar ? 'الشاتات' : 'Chats'} · {rowChats.length}
						</h3>
						{screen === 'archived' && !rowChats.length ? (
							<p className="m-0 text-xs text-[#667781]">
								{ar ? 'مفيش شاتات مؤرشفة. افتح تاب القائمة ودوس أيقونة الأرشيف جنب أي شات.' : 'No archived chats. On the List tab, press the archive icon next to a chat.'}
							</p>
						) : null}
						<ul className="m-0 flex list-none flex-col gap-1 p-0">
							{rowChats.map(chat => (
								<ChatListRow
									key={chat.id}
									ar={ar}
									chat={chat}
									active={chat.id === state.activeChatId}
									onOpen={() => onOpenChat(chat.id)}
									onEdit={patch => onListChat(chat.id, patch)}
									onRemove={() => onRemoveChat(chat.id)}
									onDuplicate={() => onDuplicateChat(chat.id)}
									onPickAvatar={onPickListAvatar}
								/>
							))}
						</ul>
						{!messenger && screen === 'list' ? (
							<details>
								<summary className={cn(small, 'cursor-pointer select-none')}>{ar ? 'من الشاتات الحقيقية' : 'From live chats'}</summary>
								<div className="mt-1 flex flex-wrap gap-1">
									<button type="button" className={pillBtn} disabled={!canSync} onClick={onSyncInbox}>
										<RefreshCw size={12} />
										{ar ? 'Sync القائمة' : 'Sync list'}
									</button>
									<button type="button" className={pillBtn} disabled={!canSync || syncingAvatars} onClick={onSyncAvatars}>
										{syncingAvatars ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
										{ar ? 'الصور' : 'Photos'}
									</button>
								</div>
							</details>
						) : null}
					</section>
				</>
			) : null}

			<StatusCard ar={ar} status={state.status} onStatus={onStatus} />
		</>
	);
}
