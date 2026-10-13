'use client';

import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
	AlertCircle,
	AlertTriangle,
	BadgeCheck,
	BookUser,
	Briefcase,
	CheckCircle2,
	CircleSlash,
	Clock,
	CloudOff,
	HelpCircle,
	Info,
	Loader2,
	Merge,
	MessageCircle,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	User,
	UserPlus,
	X,
} from 'lucide-react';
import api from '@/utils/axios';
import {
	apiErrorCode,
	apiErrorMessage,
	canRetrySync,
	canStartChatFor,
	contactInitials,
	countryOptions,
	duplicateContactFrom,
	precheckPhone,
	profileRows,
	syncErrorText,
	syncTone,
} from './wa-contacts';

const PAGE_SIZE = 30;

const COPY = {
	en: {
		title: 'Contacts',
		subtitle: 'Look up a number, save it, and start a WhatsApp chat.',
		lookupLabel: 'Phone number',
		lookupPlaceholder: '+20 100 123 4567',
		lookup: 'Check',
		countryAuto: 'Country: from my WhatsApp number',
		addContact: 'Add contact',
		notConnected:
			'This WhatsApp account is offline. Numbers show “Unable to verify” and WhatsApp contact changes wait until it reconnects.',
		noUse: 'You can view contacts, but you need send access to look up, add or change them.',
		registered: 'On WhatsApp',
		notRegistered: 'Not on WhatsApp',
		unknown: 'Unable to verify',
		profileName: 'WhatsApp profile name',
		profileNameHint: 'Set by the person. It is not a verified name.',
		about: 'About',
		category: 'Business category',
		description: 'Business description',
		email: 'Email',
		website: 'Website',
		address: 'Address',
		business: 'WhatsApp Business',
		pictureHidden: 'Profile photo is hidden or not set.',
		pictureError: 'The profile photo could not be loaded.',
		aboutHidden: 'About is hidden or not set.',
		lastSeenNote: 'Last seen is not shown: WhatsApp only shares it with people the user allows.',
		savedAs: 'Saved as',
		notSaved: 'Not in your contacts',
		save: 'Save contact',
		editName: 'Edit name',
		startChat: 'Start chat',
		chatDisabledNotRegistered: 'This number has no WhatsApp account, so a chat cannot be started.',
		chatDisabledUnknown: 'WhatsApp could not confirm this number. Try again when the account is connected.',
		name: 'Name',
		namePlaceholder: 'Contact name',
		useProfileName: 'Use profile name',
		notes: 'Notes',
		notesPlaceholder: 'Optional notes, only visible here',
		syncToWhatsApp: 'Also save to the WhatsApp account’s contacts',
		syncHint: 'Your phone is asked to add it to its address book as well; WhatsApp does not confirm that step.',
		cancel: 'Cancel',
		saveChanges: 'Save',
		saved: 'Contact saved',
		updated: 'Contact updated',
		deleted: 'Contact deleted',
		alreadySaved: 'This number is already saved — showing the existing contact.',
		listTitle: 'Saved contacts',
		listAll: 'All numbers',
		listSaved: 'Saved',
		filter: 'Filter by name or number',
		empty: 'No saved contacts yet. Check a number above or add one.',
		emptySearch: 'No contacts match this search.',
		loadMore: 'Load more',
		retry: 'Retry',
		loadFailed: 'Could not load contacts',
		delete: 'Delete',
		deleteConfirm: 'Delete this contact from this app?',
		deleteAlsoWhatsApp: 'Also remove it from the WhatsApp account’s contacts',
		removeFailed: 'WhatsApp did not confirm the removal, so the contact was kept. You can retry.',
		syncNow: 'Save to WhatsApp',
		syncRetry: 'Retry sync',
		openingChat: 'Opening chat…',
		duplicatesTitle: 'Duplicate contacts',
		duplicatesHint: 'These saved contacts share the same number.',
		mergeInto: 'Merge into',
		merged: 'Contacts merged',
		sourceManual: 'Added here',
		sourceLookup: 'From lookup',
		sourceWhatsapp: 'From WhatsApp',
		sync: {
			not_requested: 'Saved in this app only',
			pending: 'Waiting to sync',
			syncing: 'Syncing…',
			synced: 'Saved in WhatsApp',
			failed: 'Sync failed',
			unsupported: 'Cannot sync',
		},
		syncedHint: 'WhatsApp confirmed this contact. The phone address book copy is requested, not confirmed.',
		syncErrors: {
			NOT_CONNECTED: 'WhatsApp account is not connected. It will be retried when it reconnects.',
			INTEGRATION_UNSUPPORTED: 'The connected WhatsApp integration cannot change WhatsApp contacts.',
			NO_PHONE: 'This contact has no phone number.',
			NOT_ON_WHATSAPP: 'This number is not on WhatsApp, so WhatsApp cannot store it.',
			NAME_REQUIRED: 'Add a name before saving to WhatsApp.',
			APP_STATE_KEYS: 'WhatsApp has not shared contact-sync keys with this linked device yet. Retry after the phone finishes syncing.',
			TIMEOUT: 'WhatsApp did not confirm the change in time.',
			CONNECTION_DROPPED: 'The WhatsApp connection dropped before the change was confirmed.',
			REJECTED: 'WhatsApp rejected the contact change.',
			UNVERIFIED: 'WhatsApp could not verify this number yet.',
		},
		errors: {
			PHONE_REQUIRED: 'Enter a phone number.',
			PHONE_INVALID: 'This is not a valid phone number.',
			PHONE_NEEDS_COUNTRY_CODE: 'Add the country code (for example +20) or choose a country.',
			NAME_REQUIRED: 'Enter a name.',
		},
	},
	ar: {
		title: 'جهات الاتصال',
		subtitle: 'ابحث عن رقم، احفظه، وابدأ شات واتساب.',
		lookupLabel: 'رقم الموبايل',
		lookupPlaceholder: '+20 100 123 4567',
		lookup: 'تحقق',
		countryAuto: 'الدولة: حسب رقم واتساب بتاعي',
		addContact: 'إضافة جهة اتصال',
		notConnected:
			'حساب واتساب ده مش متصل. الأرقام هتظهر "تعذر التحقق" وتعديلات جهات اتصال واتساب هتستنى لحد ما يرجع يتصل.',
		noUse: 'تقدر تشوف جهات الاتصال، لكن محتاج صلاحية الإرسال عشان تبحث أو تضيف أو تعدل.',
		registered: 'على واتساب',
		notRegistered: 'مش على واتساب',
		unknown: 'تعذر التحقق',
		profileName: 'اسم الملف الشخصي على واتساب',
		profileNameHint: 'الشخص هو اللي كاتبه، ومش اسم موثّق.',
		about: 'الحالة (About)',
		category: 'نوع النشاط',
		description: 'وصف النشاط',
		email: 'الإيميل',
		website: 'الموقع',
		address: 'العنوان',
		business: 'واتساب بيزنس',
		pictureHidden: 'صورة البروفايل مخفية أو مش موجودة.',
		pictureError: 'تعذر تحميل صورة البروفايل.',
		aboutHidden: 'الحالة مخفية أو مش مكتوبة.',
		lastSeenNote: 'آخر ظهور مش بيظهر: واتساب بيشاركه بس مع اللي الشخص سامحلهم.',
		savedAs: 'محفوظ باسم',
		notSaved: 'مش في جهات اتصالك',
		save: 'حفظ جهة الاتصال',
		editName: 'تعديل الاسم',
		startChat: 'ابدأ شات',
		chatDisabledNotRegistered: 'الرقم ده مالوش حساب واتساب، فمينفعش تبدأ شات.',
		chatDisabledUnknown: 'واتساب ماقدرش يأكد الرقم ده. جرّب تاني لما الحساب يتصل.',
		name: 'الاسم',
		namePlaceholder: 'اسم جهة الاتصال',
		useProfileName: 'استخدم اسم البروفايل',
		notes: 'ملاحظات',
		notesPlaceholder: 'ملاحظات اختيارية، بتظهر هنا بس',
		syncToWhatsApp: 'احفظها كمان في جهات اتصال حساب واتساب',
		syncHint: 'الموبايل بيتطلب منه يضيفها لدفتر العناوين كمان، وواتساب مش بيأكد الخطوة دي.',
		cancel: 'إلغاء',
		saveChanges: 'حفظ',
		saved: 'تم حفظ جهة الاتصال',
		updated: 'تم تحديث جهة الاتصال',
		deleted: 'تم حذف جهة الاتصال',
		alreadySaved: 'الرقم ده محفوظ قبل كده — بنعرضلك جهة الاتصال الموجودة.',
		listTitle: 'جهات الاتصال المحفوظة',
		listAll: 'كل الأرقام',
		listSaved: 'المحفوظة',
		filter: 'فلترة بالاسم أو الرقم',
		empty: 'مفيش جهات اتصال محفوظة لسه. تحقق من رقم فوق أو ضيف واحدة.',
		emptySearch: 'مفيش جهات اتصال مطابقة.',
		loadMore: 'تحميل المزيد',
		retry: 'إعادة المحاولة',
		loadFailed: 'تعذر تحميل جهات الاتصال',
		delete: 'حذف',
		deleteConfirm: 'تحذف جهة الاتصال دي من التطبيق؟',
		deleteAlsoWhatsApp: 'احذفها كمان من جهات اتصال حساب واتساب',
		removeFailed: 'واتساب ماأكدش الحذف، فجهة الاتصال اتسابت. تقدر تعيد المحاولة.',
		syncNow: 'احفظ في واتساب',
		syncRetry: 'إعادة المزامنة',
		openingChat: 'جاري فتح الشات…',
		duplicatesTitle: 'جهات اتصال مكررة',
		duplicatesHint: 'جهات الاتصال دي ليها نفس الرقم.',
		mergeInto: 'ادمج في',
		merged: 'تم الدمج',
		sourceManual: 'متضافة هنا',
		sourceLookup: 'من البحث',
		sourceWhatsapp: 'من واتساب',
		sync: {
			not_requested: 'محفوظة في التطبيق بس',
			pending: 'مستنية المزامنة',
			syncing: 'جاري المزامنة…',
			synced: 'محفوظة في واتساب',
			failed: 'فشلت المزامنة',
			unsupported: 'مينفعش تتزامن',
		},
		syncedHint: 'واتساب أكد جهة الاتصال. نسخة دفتر عناوين الموبايل متطلوبة بس مش متأكدة.',
		syncErrors: {
			NOT_CONNECTED: 'حساب واتساب مش متصل. هنعيد المحاولة لما يرجع يتصل.',
			INTEGRATION_UNSUPPORTED: 'ربط واتساب الحالي مايقدرش يعدّل جهات اتصال واتساب.',
			NO_PHONE: 'جهة الاتصال دي مالهاش رقم.',
			NOT_ON_WHATSAPP: 'الرقم ده مش على واتساب، فواتساب مايقدرش يحفظه.',
			NAME_REQUIRED: 'ضيف اسم الأول قبل الحفظ في واتساب.',
			APP_STATE_KEYS: 'واتساب لسه ماشاركش مفاتيح مزامنة جهات الاتصال مع الجهاز المربوط. جرّب تاني بعد ما الموبايل يخلص مزامنة.',
			TIMEOUT: 'واتساب ماأكدش التعديل في الوقت المحدد.',
			CONNECTION_DROPPED: 'اتصال واتساب اتقطع قبل ما التعديل يتأكد.',
			REJECTED: 'واتساب رفض تعديل جهة الاتصال.',
			UNVERIFIED: 'واتساب لسه ماأكدش الرقم ده.',
		},
		errors: {
			PHONE_REQUIRED: 'اكتب رقم الموبايل.',
			PHONE_INVALID: 'الرقم ده مش صحيح.',
			PHONE_NEEDS_COUNTRY_CODE: 'ضيف كود الدولة (مثلاً +20) أو اختار الدولة.',
			NAME_REQUIRED: 'اكتب الاسم.',
		},
	},
};

const TONE_CLASS = {
	ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
	info: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900',
	warn: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
	error: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
	muted: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

const SYNC_ICON = {
	not_requested: CloudOff,
	pending: Clock,
	syncing: Loader2,
	synced: CheckCircle2,
	failed: AlertCircle,
	unsupported: CircleSlash,
};

const inputClass =
	'h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const primaryButton =
	'inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1DAB61] px-4 text-sm font-bold text-white transition hover:bg-[#179c57] disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
	'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:text-emerald-300';
const iconButton =
	'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white';

const contactsKey = accountId => ['whatsapp', 'contacts', accountId];

function Avatar({ url, name, size = 44 }) {
	const [failed, setFailed] = useState(false);
	useEffect(() => setFailed(false), [url]);
	const initials = contactInitials(name, '');
	return (
		<span
			className="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
			style={{ width: size, height: size }}
			aria-hidden="true"
		>
			{initials || <User size={Math.round(size * 0.45)} />}
			{url && !failed ? (
				<img
					src={url}
					alt=""
					loading="lazy"
					referrerPolicy="no-referrer"
					onError={() => setFailed(true)}
					className="absolute inset-0 h-full w-full object-cover"
				/>
			) : null}
		</span>
	);
}

function Pill({ tone = 'muted', icon: Icon, spin = false, title, children }) {
	return (
		<span
			title={title}
			className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-4 ring-1 ring-inset ${TONE_CLASS[tone]}`}
		>
			{Icon ? <Icon size={12} className={`shrink-0 ${spin ? 'animate-spin' : ''}`} aria-hidden="true" /> : null}
			<span className="min-w-0 break-words">{children}</span>
		</span>
	);
}

function RegistrationPill({ status, copy }) {
	if (status === 'registered') return <Pill tone="ok" icon={BadgeCheck}>{copy.registered}</Pill>;
	if (status === 'not_registered') return <Pill tone="error" icon={CircleSlash}>{copy.notRegistered}</Pill>;
	return <Pill tone="warn" icon={HelpCircle}>{copy.unknown}</Pill>;
}

function SyncPill({ contact, copy }) {
	const status = contact?.sync?.status || 'not_requested';
	const title =
		status === 'synced' ? copy.syncedHint : syncErrorText(contact?.sync, copy.syncErrors) || undefined;
	return (
		<Pill tone={syncTone(status)} icon={SYNC_ICON[status]} spin={status === 'syncing'} title={title}>
			{copy.sync[status] || status}
		</Pill>
	);
}

function sourceLabel(source, copy) {
	if (source === 'manual') return copy.sourceManual;
	if (source === 'lookup') return copy.sourceLookup;
	return copy.sourceWhatsapp;
}

function PhoneText({ phone, className = '' }) {
	if (!phone) return null;
	return (
		<span dir="ltr" className={`font-mono tabular-nums ${className}`}>
			{phone.international || phone.e164 || phone.digits}
		</span>
	);
}

function FieldError({ children }) {
	if (!children) return null;
	return (
		<p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
			<AlertCircle size={12} aria-hidden="true" />
			{children}
		</p>
	);
}

function ContactForm({
	copy,
	initialName = '',
	initialNotes = '',
	suggestedName = '',
	showPhone = false,
	countries,
	defaultCountry,
	showSync = true,
	syncDefault = false,
	pending,
	error,
	onSubmit,
	onCancel,
	submitLabel,
}) {
	const [phone, setPhone] = useState('');
	const [country, setCountry] = useState(defaultCountry || '');
	const [name, setName] = useState(initialName);
	const [notes, setNotes] = useState(initialNotes);
	const [sync, setSync] = useState(syncDefault);
	const [localError, setLocalError] = useState('');

	const submit = event => {
		event.preventDefault();
		if (showPhone) {
			const check = precheckPhone(phone, country || undefined);
			if (!check.ok) {
				setLocalError(copy.errors[check.code] || copy.errors.PHONE_INVALID);
				return;
			}
		}
		if (!name.trim()) {
			setLocalError(copy.errors.NAME_REQUIRED);
			return;
		}
		setLocalError('');
		onSubmit({
			...(showPhone ? { phone, ...(country ? { defaultCountry: country } : {}) } : {}),
			name: name.trim(),
			notes: notes.trim(),
			...(showSync ? { syncToWhatsApp: sync } : {}),
		});
	};

	return (
		<form onSubmit={submit} className="flex flex-col gap-3" noValidate>
			{showPhone ? (
				<div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)]">
					<label className="flex min-w-0 flex-col gap-1">
						<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{copy.lookupLabel}</span>
						<input
							type="tel"
							inputMode="tel"
							autoComplete="tel"
							dir="ltr"
							value={phone}
							onChange={event => setPhone(event.target.value)}
							placeholder={copy.lookupPlaceholder}
							className={inputClass}
						/>
					</label>
					<CountrySelect copy={copy} countries={countries} value={country} onChange={setCountry} />
				</div>
			) : null}
			<label className="flex flex-col gap-1">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{copy.name}</span>
				<input
					value={name}
					maxLength={200}
					onChange={event => setName(event.target.value)}
					placeholder={copy.namePlaceholder}
					className={inputClass}
					autoFocus={!showPhone}
				/>
			</label>
			{suggestedName && !name ? (
				<button
					type="button"
					onClick={() => setName(suggestedName)}
					className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-slate-800 dark:text-slate-300"
				>
					{copy.useProfileName}: <bdi>{suggestedName}</bdi>
				</button>
			) : null}
			<label className="flex flex-col gap-1">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400">{copy.notes}</span>
				<textarea
					value={notes}
					maxLength={2000}
					rows={2}
					onChange={event => setNotes(event.target.value)}
					placeholder={copy.notesPlaceholder}
					className={`${inputClass} h-auto resize-y py-2`}
				/>
			</label>
			{showSync ? (
				<label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
					<input
						type="checkbox"
						checked={sync}
						onChange={event => setSync(event.target.checked)}
						className="mt-0.5 h-4 w-4 accent-[#1DAB61]"
					/>
					<span>
						{copy.syncToWhatsApp}
						<span className="block text-xs text-slate-400">{copy.syncHint}</span>
					</span>
				</label>
			) : null}
			<FieldError>{localError || error}</FieldError>
			<div className="flex flex-wrap justify-end gap-2">
				{onCancel ? (
					<button type="button" onClick={onCancel} className={secondaryButton}>
						{copy.cancel}
					</button>
				) : null}
				<button type="submit" disabled={pending} className={primaryButton}>
					{pending ? <Loader2 size={16} className="animate-spin" /> : null}
					{submitLabel}
				</button>
			</div>
		</form>
	);
}

function CountrySelect({ copy, countries, value, onChange }) {
	return (
		<label className="flex min-w-0 flex-col gap-1">
			<span className="text-xs font-bold text-slate-500 dark:text-slate-400">&nbsp;</span>
			<select
				value={value}
				onChange={event => onChange(event.target.value)}
				className={`${inputClass} pe-8`}
				aria-label={copy.countryAuto}
			>
				<option value="">{copy.countryAuto}</option>
				{countries.map(item => (
					<option key={item.code} value={item.code}>
						{item.name} ({item.dial})
					</option>
				))}
			</select>
		</label>
	);
}

function LookupCard({ copy, lookup, canUse, onSave, onUpdate, onStartChat, starting, saving, saveError, onClose }) {
	const [mode, setMode] = useState(null);
	const contact = lookup.contact;
	const profile = lookup.profile;
	const status = lookup.registration.status;
	const pictureUrl =
		profile?.picture?.status === 'available' ? profile.picture.url : contact?.avatarUrl || null;
	const title = contact?.isSaved ? contact.displayName : null;
	const rows = profileRows(lookup).filter(row => row.key !== 'pushName');
	const canChat = canStartChatFor(lookup);

	useEffect(() => setMode(null), [lookup]);

	return (
		<section
			aria-live="polite"
			className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
		>
			<div className="flex items-start gap-3">
				<Avatar url={pictureUrl} name={title || ''} size={64} />
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="min-w-0 truncate text-base font-black text-slate-900 dark:text-white">
							{title ? <bdi>{title}</bdi> : <PhoneText phone={lookup.phone} />}
						</h3>
						<RegistrationPill status={status} copy={copy} />
						{profile?.business?.status === 'available' ? (
							<Pill tone="info" icon={Briefcase}>{copy.business}</Pill>
						) : null}
					</div>
					{title ? <PhoneText phone={lookup.phone} className="text-sm text-slate-500 dark:text-slate-400" /> : null}
					<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
						{contact?.isSaved ? (
							<>
								{copy.savedAs} <bdi className="font-semibold">{contact.displayName}</bdi>
							</>
						) : (
							copy.notSaved
						)}
					</p>
					{contact?.isSaved ? (
						<div className="mt-1.5">
							<SyncPill contact={contact} copy={copy} />
						</div>
					) : null}
				</div>
				<button type="button" onClick={onClose} className={iconButton} aria-label={copy.cancel}>
					<X size={16} />
				</button>
			</div>

			{status === 'unknown' ? (
				<p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
					<AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
					{lookup.registration.message || copy.chatDisabledUnknown}
				</p>
			) : null}

			{status === 'registered' ? (
				<dl className="mt-3 grid gap-2 text-sm">
					{profile?.pushName ? (
						<div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
							<dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{copy.profileName}</dt>
							<dd className="font-semibold text-slate-900 dark:text-white">
								<bdi>{profile.pushName}</bdi>
							</dd>
							<dd className="text-[11px] text-slate-400">{copy.profileNameHint}</dd>
						</div>
					) : null}
					{rows.map((row, index) => (
						<div key={`${row.key}-${index}`} className="flex flex-col gap-0.5 px-1">
							<dt className="text-xs font-bold text-slate-500 dark:text-slate-400">{copy[row.key]}</dt>
							<dd className="break-words text-slate-800 dark:text-slate-100">
								{row.key === 'website' ? (
									<a
										href={/^https?:\/\//i.test(row.value) ? row.value : `https://${row.value}`}
										target="_blank"
										rel="noopener noreferrer nofollow"
										dir="ltr"
										className="text-emerald-700 underline dark:text-emerald-300"
									>
										{row.value}
									</a>
								) : (
									<bdi>{row.value}</bdi>
								)}
							</dd>
						</div>
					))}
					<ul className="flex flex-col gap-1 px-1 text-xs text-slate-400">
						{profile?.picture?.status === 'hidden' ? <li>{copy.pictureHidden}</li> : null}
						{profile?.picture?.status === 'error' ? <li>{copy.pictureError}</li> : null}
						{profile?.about?.status === 'hidden' ? <li>{copy.aboutHidden}</li> : null}
						<li className="flex items-center gap-1">
							<Info size={11} aria-hidden="true" />
							{copy.lastSeenNote}
						</li>
					</ul>
				</dl>
			) : null}

			{mode ? (
				<div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
					<ContactForm
						copy={copy}
						initialName={mode === 'edit' ? contact?.localName || contact?.displayName || '' : ''}
						initialNotes={mode === 'edit' ? contact?.notes || '' : ''}
						suggestedName={mode === 'save' ? profile?.pushName || '' : ''}
						showSync={mode === 'save' ? status === 'registered' : false}
						pending={saving}
						error={saveError}
						submitLabel={copy.saveChanges}
						onCancel={() => setMode(null)}
						onSubmit={values => (mode === 'edit' ? onUpdate(contact, values) : onSave(values))}
					/>
				</div>
			) : (
				<div className="mt-4 flex flex-wrap items-center gap-2">
					{contact?.isSaved ? (
						<button type="button" disabled={!canUse} onClick={() => setMode('edit')} className={secondaryButton}>
							<Pencil size={15} />
							{copy.editName}
						</button>
					) : (
						<button type="button" disabled={!canUse} onClick={() => setMode('save')} className={secondaryButton}>
							<UserPlus size={15} />
							{copy.save}
						</button>
					)}
					<button
						type="button"
						disabled={!canUse || !canChat || starting}
						onClick={() => onStartChat({ phone: lookup.phone.e164 })}
						className={`${primaryButton} ms-auto`}
						aria-describedby={canChat ? undefined : 'wa-contact-chat-reason'}
					>
						{starting ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
						{starting ? copy.openingChat : copy.startChat}
					</button>
					{!canChat ? (
						<p id="wa-contact-chat-reason" className="w-full text-end text-xs text-slate-500 dark:text-slate-400">
							{status === 'not_registered' ? copy.chatDisabledNotRegistered : copy.chatDisabledUnknown}
						</p>
					) : null}
				</div>
			)}
		</section>
	);
}

function ContactRow({ copy, contact, canUse, onStartChat, startingId, onUpdate, onRemove, onSync, busy }) {
	const [mode, setMode] = useState(null);
	const [alsoWhatsApp, setAlsoWhatsApp] = useState(contact.sync.status === 'synced');
	const name = contact.displayName;
	const syncStatus = contact.sync.status;
	const canSyncNow = syncStatus === 'not_requested' || canRetrySync(contact);

	return (
		<li className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 [contain-intrinsic-size:auto_76px] [content-visibility:auto] dark:border-slate-800 dark:bg-slate-900/60">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				<Avatar url={contact.avatarUrl} name={name || ''} size={44} />
				<div className="min-w-0 flex-1 basis-[11rem]">
					<p className="truncate text-sm font-bold text-slate-900 dark:text-white">
						{name ? <bdi>{name}</bdi> : <PhoneText phone={contact.phone} />}
					</p>
					{name ? <PhoneText phone={contact.phone} className="block truncate text-xs text-slate-500 dark:text-slate-400" /> : null}
					<div className="mt-1 flex flex-wrap items-center gap-1.5">
						{contact.isSaved ? <SyncPill contact={contact} copy={copy} /> : null}
						{contact.registration.status === 'not_registered' ? (
							<Pill tone="error" icon={CircleSlash}>{copy.notRegistered}</Pill>
						) : null}
						<span className="text-[11px] text-slate-400">{sourceLabel(contact.source, copy)}</span>
					</div>
				</div>
				<div className="ms-auto flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						className={iconButton}
						disabled={!canUse || startingId === contact.id || contact.registration.status === 'not_registered'}
						onClick={() => onStartChat({ contactId: contact.id }, contact.id)}
						title={contact.registration.status === 'not_registered' ? copy.chatDisabledNotRegistered : copy.startChat}
						aria-label={copy.startChat}
					>
						{startingId === contact.id ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
					</button>
					{contact.isSaved ? (
						<>
							<button
								type="button"
								className={iconButton}
								disabled={!canUse}
								onClick={() => setMode(mode === 'edit' ? null : 'edit')}
								title={copy.editName}
								aria-label={copy.editName}
							>
								<Pencil size={16} />
							</button>
							<button
								type="button"
								className={iconButton}
								disabled={!canUse || busy || !canSyncNow || syncStatus === 'syncing'}
								onClick={() => onSync(contact)}
								title={syncStatus === 'not_requested' ? copy.syncNow : copy.syncRetry}
								aria-label={syncStatus === 'not_requested' ? copy.syncNow : copy.syncRetry}
							>
								<RefreshCw size={16} />
							</button>
							<button
								type="button"
								className={`${iconButton} hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30`}
								disabled={!canUse}
								onClick={() => setMode(mode === 'delete' ? null : 'delete')}
								title={copy.delete}
								aria-label={copy.delete}
							>
								<Trash2 size={16} />
							</button>
						</>
					) : (
						<button
							type="button"
							className={iconButton}
							disabled={!canUse}
							onClick={() => setMode(mode === 'edit' ? null : 'edit')}
							title={copy.save}
							aria-label={copy.save}
						>
							<UserPlus size={16} />
						</button>
					)}
				</div>
			</div>
			{contact.sync.error && ['failed', 'pending', 'unsupported'].includes(syncStatus) ? (
				<p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
					<Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
					<bdi>{syncErrorText(contact.sync, copy.syncErrors)}</bdi>
				</p>
			) : null}
			{contact.notes && mode !== 'edit' ? (
				<p className="mt-1.5 line-clamp-2 whitespace-pre-line text-xs text-slate-500 dark:text-slate-400">
					<bdi>{contact.notes}</bdi>
				</p>
			) : null}
			{mode === 'edit' ? (
				<div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
					<ContactForm
						copy={copy}
						initialName={contact.localName || ''}
						initialNotes={contact.notes || ''}
						suggestedName={contact.whatsappName || ''}
						showSync={!['synced', 'pending', 'syncing', 'failed'].includes(syncStatus)}
						pending={busy}
						submitLabel={copy.saveChanges}
						onCancel={() => setMode(null)}
						onSubmit={values => onUpdate(contact, values, () => setMode(null))}
					/>
				</div>
			) : null}
			{mode === 'delete' ? (
				<div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
					<p className="font-semibold text-slate-800 dark:text-slate-100">{copy.deleteConfirm}</p>
					{['synced', 'failed'].includes(syncStatus) ? (
						<label className="flex cursor-pointer items-center gap-2 text-slate-700 dark:text-slate-200">
							<input
								type="checkbox"
								checked={alsoWhatsApp}
								onChange={event => setAlsoWhatsApp(event.target.checked)}
								className="h-4 w-4 accent-rose-600"
							/>
							{copy.deleteAlsoWhatsApp}
						</label>
					) : null}
					<div className="flex justify-end gap-2">
						<button type="button" onClick={() => setMode(null)} className={secondaryButton}>
							{copy.cancel}
						</button>
						<button
							type="button"
							disabled={busy}
							onClick={() =>
								onRemove(contact, ['synced', 'failed'].includes(syncStatus) && alsoWhatsApp, () => setMode(null))
							}
							className="inline-flex h-10 items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
						>
							{busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
							{copy.delete}
						</button>
					</div>
				</div>
			) : null}
		</li>
	);
}

function RowSkeleton() {
	return (
		<li className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800" aria-hidden="true">
			<span className="h-11 w-11 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
			<span className="flex flex-1 flex-col gap-2">
				<span className="h-3 w-2/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
				<span className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
			</span>
		</li>
	);
}

export default function ContactsPanel({ accountId, locale = 'en', canUse = false, onOpenConversation }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const copy = ar ? COPY.ar : COPY.en;
	const queryClient = useQueryClient();
	const countries = useMemo(() => countryOptions(ar ? 'ar' : 'en'), [ar]);

	const [phone, setPhone] = useState('');
	const [country, setCountry] = useState('');
	const [lookupError, setLookupError] = useState('');
	const [lookup, setLookup] = useState(null);
	const [adding, setAdding] = useState(false);
	const [formError, setFormError] = useState('');
	const [filter, setFilter] = useState('');
	const [search, setSearch] = useState('');
	const [scope, setScope] = useState('saved');
	const [startingId, setStartingId] = useState(null);

	useEffect(() => {
		const timer = window.setTimeout(() => setSearch(filter.trim()), 300);
		return () => window.clearTimeout(timer);
	}, [filter]);

	useEffect(() => {
		setLookup(null);
		setLookupError('');
		setAdding(false);
	}, [accountId]);

	const base = `/whatsapp/accounts/${accountId}/contacts`;
	const errorText = (error, fallback) => copy.errors[apiErrorCode(error)] || apiErrorMessage(error, fallback);

	const capabilities = useQuery({
		queryKey: [...contactsKey(accountId), 'capabilities'],
		enabled: Boolean(accountId),
		staleTime: 30_000,
		queryFn: async () => (await api.get(`${base}/capabilities`)).data,
	});

	const list = useInfiniteQuery({
		queryKey: [...contactsKey(accountId), 'list', scope, search],
		enabled: Boolean(accountId),
		initialPageParam: 1,
		queryFn: async ({ pageParam }) =>
			(
				await api.get(base, {
					params: { page: pageParam, limit: PAGE_SIZE, scope, ...(search ? { search } : {}) },
				})
			).data,
		getNextPageParam: last => (last && last.page * last.limit < last.total ? last.page + 1 : undefined),
		refetchInterval: query => {
			const pages = query.state.data?.pages || [];
			const waiting = pages.some(page =>
				(page.items || []).some(item => ['pending', 'syncing'].includes(item.sync?.status)),
			);
			return waiting ? 15_000 : false;
		},
	});

	const duplicates = useQuery({
		queryKey: [...contactsKey(accountId), 'duplicates'],
		enabled: Boolean(accountId) && canUse,
		queryFn: async () => (await api.get(`${base}/duplicates`)).data,
	});

	const contacts = useMemo(
		() => (list.data?.pages || []).flatMap(page => page.items || []),
		[list.data],
	);
	const total = list.data?.pages?.[0]?.total ?? 0;
	const canListAll = Boolean(list.data?.pages?.[0]?.canListAll);

	const refresh = () => queryClient.invalidateQueries({ queryKey: contactsKey(accountId) });
	const syncLookupContact = contact => {
		setLookup(current =>
			current && contact && current.phone?.digits === contact.phone?.digits ? { ...current, contact } : current,
		);
	};

	const lookupMutation = useMutation({
		mutationFn: async payload => (await api.post(`${base}/lookup`, payload)).data,
		onSuccess: data => {
			setLookup(data);
			setLookupError('');
		},
		onError: error => {
			setLookup(null);
			setLookupError(errorText(error, ar ? 'تعذر التحقق من الرقم' : 'Could not check this number'));
		},
	});

	const createMutation = useMutation({
		mutationFn: async payload => (await api.post(base, payload)).data,
		onSuccess: contact => {
			toast.success(copy.saved);
			setFormError('');
			setAdding(false);
			syncLookupContact(contact);
			refresh();
		},
		onError: error => {
			const existing = duplicateContactFrom(error);
			if (existing) {
				toast(copy.alreadySaved, { icon: 'ℹ️' });
				setAdding(false);
				setLookup(current =>
					current && current.phone?.digits === existing.phone?.digits
						? { ...current, contact: existing }
						: {
								phone: existing.phone,
								registration: { status: existing.registration?.status || 'unknown', message: null },
								profile: null,
								contact: existing,
								canStartChat: existing.registration?.status === 'registered',
							},
				);
				return;
			}
			setFormError(errorText(error, ar ? 'تعذر الحفظ' : 'Could not save the contact'));
		},
	});

	const updateMutation = useMutation({
		mutationFn: async ({ id, ...payload }) => (await api.patch(`${base}/${id}`, payload)).data,
		onSuccess: contact => {
			toast.success(copy.updated);
			syncLookupContact(contact);
			refresh();
		},
		onError: error => toast.error(errorText(error, ar ? 'تعذر التحديث' : 'Could not update the contact')),
	});

	const removeMutation = useMutation({
		mutationFn: async ({ id, removeFromWhatsApp }) =>
			(await api.delete(`${base}/${id}`, { params: removeFromWhatsApp ? { removeFromWhatsApp: 1 } : {} })).data,
		onSuccess: (result, variables) => {
			if (result?.removed) {
				toast.success(copy.deleted);
				setLookup(current => (current?.contact?.id === variables.id ? { ...current, contact: null } : current));
			} else {
				toast.error(copy.removeFailed);
			}
			refresh();
		},
		onError: error => toast.error(errorText(error, ar ? 'تعذر الحذف' : 'Could not delete the contact')),
	});

	const syncMutation = useMutation({
		mutationFn: async id => (await api.post(`${base}/${id}/sync`)).data,
		onSuccess: contact => {
			const status = contact?.sync?.status;
			if (status === 'synced') toast.success(copy.sync.synced);
			else if (status === 'failed' || status === 'unsupported') {
				toast.error(syncErrorText(contact.sync, copy.syncErrors) || copy.sync[status]);
			}
			else toast(copy.sync[status] || status);
			syncLookupContact(contact);
			refresh();
		},
		onError: error => toast.error(errorText(error, copy.sync.failed)),
	});

	const mergeMutation = useMutation({
		mutationFn: async ({ keepId, duplicateIds }) => (await api.post(`${base}/${keepId}/merge`, { duplicateIds })).data,
		onSuccess: () => {
			toast.success(copy.merged);
			refresh();
		},
		onError: error => toast.error(errorText(error, ar ? 'تعذر الدمج' : 'Could not merge')),
	});

	const startChatMutation = useMutation({
		mutationFn: async payload => (await api.post(`${base}/start-chat`, payload)).data,
		onSuccess: data => {
			const conversation = data?.conversation;
			if (conversation?.id && typeof onOpenConversation === 'function') {
				onOpenConversation(conversation.id, conversation);
			}
		},
		onError: error => {
			const code = apiErrorCode(error);
			if (code === 'NOT_ON_WHATSAPP') toast.error(copy.chatDisabledNotRegistered);
			else if (code === 'UNABLE_TO_VERIFY') toast.error(copy.chatDisabledUnknown);
			else toast.error(errorText(error, ar ? 'تعذر فتح الشات' : 'Could not open the chat'));
		},
		onSettled: () => setStartingId(null),
	});

	const startChat = (payload, rowId = 'lookup') => {
		setStartingId(rowId);
		startChatMutation.mutate(payload);
	};

	const submitLookup = event => {
		event.preventDefault();
		const check = precheckPhone(phone, country || undefined);
		if (!check.ok) {
			setLookupError(copy.errors[check.code] || copy.errors.PHONE_INVALID);
			return;
		}
		setLookupError('');
		lookupMutation.mutate({ phone, ...(country ? { defaultCountry: country } : {}) });
	};

	const offline = capabilities.data && !capabilities.data.connected;
	const busy = updateMutation.isPending || removeMutation.isPending || syncMutation.isPending;
	const duplicateGroups = duplicates.data?.groups || [];

	return (
		<div className="wa-dk mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-6" dir={ar ? 'rtl' : 'ltr'}>
			<header className="flex items-start gap-3">
				<span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1DAB61] text-white max-[768px]:hidden">
					<BookUser size={20} />
				</span>
				<div className="min-w-0 flex-1">
					{/* Phones already show the tab title in the WhatsApp header. */}
					<h2 className="text-lg font-black text-slate-900 dark:text-white max-[768px]:sr-only">{copy.title}</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
				</div>
				<button
					type="button"
					onClick={() => {
						setAdding(current => !current);
						setFormError('');
					}}
					disabled={!canUse}
					className={`${primaryButton} shrink-0`}
					aria-expanded={adding}
				>
					{adding ? <X size={16} /> : <Plus size={16} />}
					<span className="max-[420px]:sr-only">{copy.addContact}</span>
				</button>
			</header>

			{!canUse ? (
				<p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
					<Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
					{copy.noUse}
				</p>
			) : null}
			{offline ? (
				<p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
					<CloudOff size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
					{copy.notConnected}
				</p>
			) : null}

			{adding ? (
				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
					<h3 className="mb-3 text-sm font-black text-slate-800 dark:text-slate-100">{copy.addContact}</h3>
					<ContactForm
						copy={copy}
						showPhone
						countries={countries}
						defaultCountry={country}
						pending={createMutation.isPending}
						error={formError}
						submitLabel={copy.saveChanges}
						onCancel={() => setAdding(false)}
						onSubmit={values => createMutation.mutate({ ...values, source: 'manual' })}
					/>
				</section>
			) : null}

			<form
				onSubmit={submitLookup}
				className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
				noValidate
			>
				<label htmlFor="wa-contact-lookup" className="mb-1.5 block text-xs font-bold text-slate-500 dark:text-slate-400">
					{copy.lookupLabel}
				</label>
				<div className="flex flex-col gap-2 sm:flex-row">
					<div className="relative min-w-0 flex-1">
						<Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
						<input
							id="wa-contact-lookup"
							type="tel"
							inputMode="tel"
							autoComplete="tel"
							dir="ltr"
							value={phone}
							onChange={event => {
								setPhone(event.target.value);
								if (lookupError) setLookupError('');
							}}
							placeholder={copy.lookupPlaceholder}
							disabled={!canUse}
							className={`${inputClass} h-12 ps-9 text-base`}
							aria-invalid={Boolean(lookupError)}
							aria-describedby={lookupError ? 'wa-contact-lookup-error' : undefined}
						/>
					</div>
					<select
						value={country}
						onChange={event => setCountry(event.target.value)}
						disabled={!canUse}
						className={`${inputClass} h-12 sm:w-56`}
						aria-label={copy.countryAuto}
					>
						<option value="">{copy.countryAuto}</option>
						{countries.map(item => (
							<option key={item.code} value={item.code}>
								{item.name} ({item.dial})
							</option>
						))}
					</select>
					<button type="submit" disabled={!canUse || lookupMutation.isPending} className={`${primaryButton} h-12 px-5`}>
						{lookupMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
						{copy.lookup}
					</button>
				</div>
				<div id="wa-contact-lookup-error" className="mt-2">
					<FieldError>{lookupError}</FieldError>
				</div>
			</form>

			{lookupMutation.isPending && !lookup ? (
				<div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800" aria-busy="true">
					<span className="h-16 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
					<span className="flex flex-1 flex-col gap-2">
						<span className="h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
						<span className="h-3 w-1/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
					</span>
				</div>
			) : null}

			{lookup ? (
				<LookupCard
					copy={copy}
					lookup={lookup}
					canUse={canUse}
					saving={createMutation.isPending || updateMutation.isPending}
					saveError={formError}
					starting={startingId === 'lookup'}
					onClose={() => setLookup(null)}
					onStartChat={payload => startChat(payload, 'lookup')}
					onSave={values =>
						createMutation.mutate({
							...values,
							phone: lookup.phone.e164,
							source: 'lookup',
						})
					}
					onUpdate={(contact, values) => updateMutation.mutate({ id: contact.id, ...values })}
				/>
			) : null}

			{duplicateGroups.length ? (
				<section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
					<h3 className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-200">
						<Merge size={16} aria-hidden="true" />
						{copy.duplicatesTitle}
					</h3>
					<p className="mb-3 text-xs text-amber-800 dark:text-amber-300">{copy.duplicatesHint}</p>
					<ul className="flex flex-col gap-2">
						{duplicateGroups.map(group => (
							<li key={group.phone?.digits} className="flex flex-col gap-2 rounded-xl bg-white p-3 dark:bg-slate-900">
								<PhoneText phone={group.phone} className="text-xs text-slate-500" />
								<div className="flex flex-wrap gap-2">
									{group.contacts.map(item => (
										<button
											key={item.id}
											type="button"
											disabled={mergeMutation.isPending}
											onClick={() =>
												mergeMutation.mutate({
													keepId: item.id,
													duplicateIds: group.contacts.filter(other => other.id !== item.id).map(other => other.id),
												})
											}
											className={secondaryButton}
										>
											<Merge size={14} />
											{copy.mergeInto} <bdi className="font-bold">{item.displayName}</bdi>
										</button>
									))}
								</div>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<section className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<h3 className="me-auto text-sm font-black text-slate-700 dark:text-slate-200">
						{scope === 'all' ? copy.listAll : copy.listTitle}
						{list.data ? <span className="ms-1 font-semibold text-slate-400">({total})</span> : null}
					</h3>
					{canListAll ? (
						<div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
							{[
								['saved', copy.listSaved],
								['all', copy.listAll],
							].map(([key, label]) => (
								<button
									key={key}
									type="button"
									role="tab"
									aria-selected={scope === key}
									onClick={() => setScope(key)}
									className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
										scope === key
											? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
											: 'text-slate-500'
									}`}
								>
									{label}
								</button>
							))}
						</div>
					) : null}
				</div>
				<div className="relative">
					<Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
					<input
						type="search"
						value={filter}
						onChange={event => setFilter(event.target.value)}
						placeholder={copy.filter}
						className={`${inputClass} ps-9`}
						aria-label={copy.filter}
					/>
				</div>

				{list.isLoading ? (
					<ul className="flex flex-col gap-2" aria-busy="true">
						{[0, 1, 2, 3].map(item => (
							<RowSkeleton key={item} />
						))}
					</ul>
				) : list.isError ? (
					<div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
						<span>{apiErrorMessage(list.error, copy.loadFailed)}</span>
						<button type="button" onClick={() => list.refetch()} className="font-bold underline">
							{copy.retry}
						</button>
					</div>
				) : !contacts.length ? (
					<div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
						<BookUser size={28} aria-hidden="true" />
						{search ? copy.emptySearch : copy.empty}
					</div>
				) : (
					<ul className="flex flex-col gap-2">
						{contacts.map(contact => (
							<ContactRow
								key={contact.id}
								copy={copy}
								contact={contact}
								canUse={canUse}
								busy={busy}
								startingId={startingId}
								onStartChat={startChat}
								onSync={item => syncMutation.mutate(item.id)}
								onUpdate={(item, values, done) =>
									updateMutation.mutate({ id: item.id, ...values }, { onSuccess: () => done?.() })
								}
								onRemove={(item, removeFromWhatsApp, done) =>
									removeMutation.mutate(
										{ id: item.id, removeFromWhatsApp },
										{ onSuccess: result => result?.removed && done?.() },
									)
								}
							/>
						))}
					</ul>
				)}
				{list.hasNextPage ? (
					<button
						type="button"
						onClick={() => list.fetchNextPage()}
						disabled={list.isFetchingNextPage}
						className={`${secondaryButton} self-center`}
					>
						{list.isFetchingNextPage ? <Loader2 size={16} className="animate-spin" /> : null}
						{copy.loadMore}
					</button>
				) : null}
			</section>
		</div>
	);
}
