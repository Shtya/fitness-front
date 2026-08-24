'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Link2, Loader2, Phone, QrCode, Smartphone } from 'lucide-react';
import PhoneField from '@/components/atoms/PhoneField';

const RESEND_SECONDS = 60;

function pairingChars(code) {
	return String(code || '')
		.replace(/[^a-zA-Z0-9]/g, '')
		.toUpperCase()
		.split('')
		.slice(0, 8);
}

export function WhatsAppRestoreProgress({ labels, account, syncProgress, conversationCount }) {
	const connected = account?.status === 'connected';
	const hydrated = Boolean(account?.initialHydratedAt);
	const hasChats = conversationCount > 0 || hydrated;
	const pct = Math.max(0, Math.min(100, Number(syncProgress) || (connected && hydrated ? 100 : connected ? 55 : 18)));
	const steps = [
		{ id: 'phone', label: labels.restorePhoneVerified, done: connected || Boolean(account?.phoneNumber) },
		{ id: 'session', label: labels.restoreSessionRestored, done: connected },
		{ id: 'chats', label: labels.restoreChatsRestored, done: hasChats },
		{ id: 'contacts', label: labels.restoreContactsRestored, done: hasChats },
	];
	return (
		<div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
			<p className="text-sm font-black text-slate-900 dark:text-white">{labels.connectingWhatsApp}</p>
			<ul className="mt-3 space-y-2">
				{steps.map(step => (
					<li key={step.id} className="flex items-center gap-2 text-sm">
						<span
							className={`flex h-5 w-5 items-center justify-center rounded-full ${
								step.done
									? 'bg-emerald-500 text-white'
									: 'border border-slate-300 text-slate-400 dark:border-slate-600'
							}`}
						>
							{step.done ? <Check size={12} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
						</span>
						<span className={step.done ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-500'}>
							{step.label}
						</span>
					</li>
				))}
			</ul>
			<p className="mt-4 text-xs font-bold text-slate-500">{labels.restoreLoadingMessages}</p>
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
				<div
					className="h-full rounded-full bg-[var(--color-primary-500)] transition-[width] duration-500"
					style={{ width: `${Math.max(8, pct)}%` }}
				/>
			</div>
			<p className="mt-1 text-end text-[11px] font-bold tabular-nums text-slate-500">{Math.round(pct)}%</p>
			<p className="mt-2 text-center text-xs font-semibold text-slate-400">{labels.restoreAlmostReady}</p>
		</div>
	);
}

export default function WhatsAppAccountLinkPanel({
	labels,
	account,
	linkMode,
	onSelectMode,
	linkPhoneNumber,
	onLinkPhoneNumberChange,
	phoneValid,
	phoneTouched,
	accountBusy,
	qr,
	pairingCode,
	canManage,
	onConnectQr,
	onConnectPhone,
	onChangePhone,
	syncProgress = 0,
	conversationCount = 0,
}) {
	const [secondsLeft, setSecondsLeft] = useState(0);
	const [phoneError, setPhoneError] = useState('');

	useEffect(() => {
		if (!pairingCode) {
			setSecondsLeft(0);
			return undefined;
		}
		setSecondsLeft(RESEND_SECONDS);
		const timer = setInterval(() => {
			setSecondsLeft(current => (current <= 1 ? 0 : current - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [pairingCode]);

	const chars = useMemo(() => pairingChars(pairingCode), [pairingCode]);
	const displayPhone = String(linkPhoneNumber || account?.phoneNumber || '').trim();

	if (!canManage) return null;

	const restoring =
		accountBusy &&
		!qr &&
		!pairingCode &&
		['connecting', 'qr_pending'].includes(account?.status) &&
		(Boolean(account?.lastConnectedAt) || Boolean(account?.initialHydratedAt));

	if (restoring) {
		return (
			<WhatsAppRestoreProgress
				labels={labels}
				account={account}
				syncProgress={syncProgress}
				conversationCount={conversationCount}
			/>
		);
	}

	if (!linkMode) {
		return (
			<div className="mx-auto max-w-sm space-y-3">
				<p className="text-center text-sm font-black text-slate-900 dark:text-white">
					{labels.connectWhatsApp}
				</p>
				<button
					type="button"
					onClick={() => onSelectMode('qr')}
					className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-start transition-all hover:border-[var(--color-primary-300)] hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
				>
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-50)] text-[var(--color-primary-600)] dark:bg-slate-700">
						<QrCode size={18} />
					</span>
					<span>
						<span className="block text-sm font-black text-slate-900 dark:text-white">
							<Link2 size={14} className="me-1 inline -mt-0.5" />
							{labels.linkDeviceTitle}
						</span>
						<span className="mt-0.5 block text-xs text-slate-500">{labels.linkDeviceHint}</span>
					</span>
				</button>
				<button
					type="button"
					onClick={() => onSelectMode('phone')}
					className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-start transition-all hover:border-[var(--color-primary-300)] hover:shadow-sm dark:border-slate-700 dark:bg-slate-800"
				>
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-secondary-50)] text-[var(--color-secondary-600)] dark:bg-slate-700">
						<Smartphone size={18} />
					</span>
					<span>
						<span className="block text-sm font-black text-slate-900 dark:text-white">
							<Phone size={14} className="me-1 inline -mt-0.5" />
							{labels.phoneConnectTitle}
						</span>
						<span className="mt-0.5 block text-xs text-slate-500">{labels.phoneConnectHint}</span>
					</span>
				</button>
			</div>
		);
	}

	if (linkMode === 'phone' && pairingCode) {
		return (
			<div className="mx-auto max-w-sm text-center">
				<p className="text-sm font-black text-slate-900 dark:text-white">{labels.verifyPhoneTitle}</p>
				<p className="mt-1 text-xs text-slate-500">
					{labels.verifyPhoneSent}
					{displayPhone ? (
						<span className="mt-1 block font-bold text-slate-700 dark:text-slate-200" dir="ltr">
							{displayPhone}
						</span>
					) : null}
				</p>
				<div className="mt-4 flex justify-center gap-1.5" dir="ltr">
					{(chars.length ? chars : Array.from({ length: 8 })).map((ch, index) => (
						<span
							key={`${ch}-${index}`}
							className="flex h-11 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white font-mono text-lg font-black text-slate-900 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
						>
							{ch || '·'}
						</span>
					))}
				</div>
				<p className="mx-auto mt-4 max-w-xs text-xs text-slate-500">{labels.pairingCodeHint}</p>
				<p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-amber-600">
					<Loader2 size={14} className="animate-spin" />
					{labels.waitingPhoneConfirm}
				</p>
				<div className="mt-4 space-y-2">
					<p className="text-xs text-slate-500">{labels.didntReceiveCode}</p>
					<button
						type="button"
						disabled={accountBusy || secondsLeft > 0}
						onClick={() => onConnectPhone()}
						className="text-sm font-bold text-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-40"
					>
						{secondsLeft > 0
							? String(labels.resendIn || '').replace('{seconds}', String(secondsLeft))
							: labels.resendCode}
					</button>
					<button
						type="button"
						onClick={onChangePhone}
						className="block w-full text-xs font-semibold text-slate-500 underline-offset-2 hover:underline"
					>
						{labels.changePhoneNumber}
					</button>
				</div>
			</div>
		);
	}

	if (linkMode === 'phone') {
		return (
			<form
				className="mx-auto max-w-sm space-y-3"
				onSubmit={event => {
					event.preventDefault();
					if (!phoneValid) {
						setPhoneError(labels.phoneNumberInvalid);
						return;
					}
					setPhoneError('');
					onConnectPhone();
				}}
			>
				<PhoneField
					label={labels.phoneConnectTitle}
					value={linkPhoneNumber}
					onChange={value => {
						onLinkPhoneNumberChange(value);
						setPhoneError('');
					}}
					error={phoneError || (phoneTouched && !phoneValid ? labels.phoneNumberInvalid : '')}
					required
					disabled={accountBusy}
				/>
				<button
					type="submit"
					disabled={accountBusy || !phoneValid}
					className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-500)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{accountBusy ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
					{labels.sendPairingCode}
				</button>
				<button
					type="button"
					onClick={() => onSelectMode(null)}
					className="w-full text-xs font-semibold text-slate-500"
				>
					{labels.connectWhatsApp}
				</button>
				{phoneTouched && !phoneValid && (
					<p className="flex items-center gap-1.5 text-xs text-rose-600">
						<AlertCircle size={13} className="shrink-0" />
						{labels.phoneNumberInvalid}
					</p>
				)}
			</form>
		);
	}

	return (
		<div className="mx-auto max-w-sm text-center">
			<button
				type="button"
				onClick={() => onSelectMode(null)}
				className="mb-3 text-xs font-semibold text-slate-500"
			>
				{labels.connectWhatsApp}
			</button>
			{!qr && !accountBusy && (
				<button
					type="button"
					onClick={onConnectQr}
					className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary-500)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--color-primary-600)]"
				>
					<QrCode size={16} />
					{labels.linkDeviceTitle}
				</button>
			)}
			{accountBusy && !qr && (
				<div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800">
					<Loader2 size={16} className="animate-spin text-[var(--color-primary-500)]" />
					{labels.generatingQr}
				</div>
			)}
			{qr ? (
				<>
					<div className="mb-4 flex items-center justify-center gap-2">
						<span className="relative flex h-2 w-2">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
							<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
						</span>
						<p className="text-sm font-black">{labels.scanQr}</p>
					</div>
					<div className="relative mx-auto w-fit rounded-2xl bg-white p-4 shadow-[0_20px_50px_-15px_rgba(37,211,102,0.35)] dark:bg-slate-800">
						<span className="absolute -start-1.5 -top-1.5 h-6 w-6 rounded-tl-xl border-s-4 border-t-4 border-[var(--color-primary-500)]" />
						<span className="absolute -end-1.5 -top-1.5 h-6 w-6 rounded-tr-xl border-e-4 border-t-4 border-[var(--color-primary-500)]" />
						<span className="absolute -start-1.5 -bottom-1.5 h-6 w-6 rounded-bl-xl border-b-4 border-s-4 border-[var(--color-secondary-500)]" />
						<span className="absolute -end-1.5 -bottom-1.5 h-6 w-6 rounded-br-xl border-b-4 border-e-4 border-[var(--color-secondary-500)]" />
						{String(qr).startsWith('data:image') ? (
							<img src={qr} alt="WhatsApp QR" className="aspect-square w-52 rounded-lg" />
						) : (
							<p className="max-w-52 break-all text-xs">{qr}</p>
						)}
					</div>
					<p className="mx-auto mt-4 max-w-xs text-xs text-slate-500">{labels.scanQrHint}</p>
				</>
			) : null}
		</div>
	);
}
