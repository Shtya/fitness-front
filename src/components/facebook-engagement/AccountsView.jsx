'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, RefreshCw, Unplug, Users } from 'lucide-react';
import { useLocale } from 'next-intl';
import toast from 'react-hot-toast';
import { FaFacebook } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiErrorMessage, fbEngagementApi } from '@/lib/facebook-engagement/fb-engagement-api';
import { fbKeys, useFbConfig, useFbConnections, useFbMutation } from './fb-hooks';
import { useFbT } from './fb-i18n';
import {
	ConfirmDialog,
	EmptyState,
	ErrorState,
	FbDialog,
	Field,
	ghostButtonClass,
	inputClass,
	outlineButtonClass,
	PageAvatar,
	Panel,
	SkeletonList,
	StatusBadge,
	Tag,
	useFbFormat,
} from './fb-ui';

const OAUTH_CHANNEL = 'fb-engagement-oauth';
const POPUP_FEATURES = 'popup=yes,width=620,height=760';

function openChannel() {
	return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(OAUTH_CHANNEL);
}

function notifyOpener(message) {
	const channel = openChannel();
	channel?.postMessage(message);
	channel?.close();
	window.close();
}

/**
 * Facebook redirects back here with a one-time claim in the URL hash. The page that receives it
 * redeems it with the current session; a popup then tells the opener tab and closes itself.
 */
function useOAuthReturn(complete) {
	const t = useFbT();
	const handled = useRef(false);

	useEffect(() => {
		if (handled.current) return;
		const url = new URL(window.location.href);
		const status = url.searchParams.get('facebook');
		if (!status) return;
		handled.current = true;

		const claim = new URLSearchParams(url.hash.slice(1)).get('fbclaim');
		const popup = url.searchParams.get('popup') === '1';
		window.history.replaceState(null, '', url.pathname);

		if (status === 'error' || !claim) {
			const message = url.searchParams.get('error') || t('oauthFailed');
			if (popup) notifyOpener({ type: 'error', message });
			else toast.error(message);
			return;
		}

		complete.mutate(claim, {
			onSuccess: (connection) => {
				const pages = connection.accounts?.length ?? 0;
				if (popup) notifyOpener({ type: 'connected', pages });
				else toast.success(t('connectedPagesN', { n: pages }));
			},
			onError: (error) => {
				const message = apiErrorMessage(error, t('oauthFailed'));
				if (popup) notifyOpener({ type: 'error', message });
				else toast.error(message);
			},
		});
	}, [complete, t]);
}

function useOAuthPopupListener() {
	const t = useFbT();
	const queryClient = useQueryClient();
	useEffect(() => {
		const channel = openChannel();
		if (!channel) return undefined;
		channel.onmessage = (event) => {
			if (event.data?.type === 'connected') {
				queryClient.invalidateQueries({ queryKey: fbKeys.root });
				toast.success(t('connectedPagesN', { n: event.data.pages }));
			} else if (event.data?.type === 'error') {
				toast.error(event.data.message || t('oauthFailed'));
			}
		};
		return () => channel.close();
	}, [queryClient, t]);
}

function ConnectionCard({ connection, onSync, syncing, onDisconnect }) {
	const t = useFbT();
	const format = useFbFormat();
	const missingScope = connection.method === 'oauth' && !connection.scopes?.includes('pages_manage_engagement');

	return (
		<Panel bodyClassName="p-0">
			<div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
				<div className="flex min-w-0 items-center gap-3">
					<span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#1877F2]/10 text-[#1877F2]">
						{connection.method === 'oauth' ? <FaFacebook className="size-5" aria-hidden /> : <KeyRound className="size-5" aria-hidden />}
					</span>
					<div className="min-w-0">
						<p className="flex flex-wrap items-center gap-2">
							<span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
								{connection.displayName || t('unnamedConnection')}
							</span>
							<StatusBadge status={connection.status} />
							<Tag>{connection.method === 'oauth' ? t('methodOauth') : t('methodToken')}</Tag>
						</p>
						<p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
							{connection.lastSyncedAt ? t('syncedAt', { time: format.relative(connection.lastSyncedAt) }) : t('neverSynced')}
							{connection.tokenExpiresAt && <> · {t('expiresAt', { time: format.dateTime(connection.tokenExpiresAt) })}</>}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Button size="sm" variant="ghost" className={ghostButtonClass} onClick={onSync} disabled={syncing}>
						<RefreshCw className={cn(syncing && 'animate-spin')} aria-hidden />
						{t('sync')}
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className={cn(ghostButtonClass, 'hover:text-rose-600 dark:hover:text-rose-400')}
						onClick={onDisconnect}
					>
						<Unplug aria-hidden />
						{t('disconnect')}
					</Button>
				</div>
			</div>

			{(connection.lastError || missingScope) && (
				<div className="mx-5 mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
					<AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
					<span>{connection.lastError || t('missingEngagementScope')}</span>
				</div>
			)}

			{connection.accounts.length === 0 ? (
				<p className="border-t border-slate-100 px-5 py-4 text-[13px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
					{t('noPagesOnConnection')}
				</p>
			) : (
				<ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
					{connection.accounts.map((account) => (
						<li key={account.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
							<PageAvatar account={account} />
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-slate-900 dark:text-white">{account.name}</p>
								<p className="truncate text-xs text-slate-500 dark:text-slate-400">
									{[account.category, account.tasks?.length ? account.tasks.join(', ') : null].filter(Boolean).join(' · ') || '—'}
								</p>
								{account.lastError && <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">{account.lastError}</p>}
							</div>
							<div className="flex flex-wrap items-center gap-2">
								{account.canPublishComments ? (
									<Tag tone="emerald">
										<CheckCircle2 className="size-3" aria-hidden />
										{t('canPublish')}
									</Tag>
								) : (
									<Tag tone="amber">
										<AlertTriangle className="size-3" aria-hidden />
										{t('missingPermission')}
									</Tag>
								)}
								<StatusBadge status={account.status} />
							</div>
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}

export default function AccountsView() {
	const t = useFbT();
	const locale = useLocale();
	const config = useFbConfig();
	const connections = useFbConnections();
	const [tokenOpen, setTokenOpen] = useState(false);
	const [token, setToken] = useState('');
	const [disconnecting, setDisconnecting] = useState(null);
	const [opening, setOpening] = useState(false);

	const complete = useFbMutation((claim) => fbEngagementApi.completeOAuth(claim), { silentError: true });
	const connectToken = useFbMutation((value) => fbEngagementApi.connectWithToken(value), {
		success: (connection) => t('connectedPagesN', { n: connection.accounts?.length ?? 0 }),
		onSuccess: () => {
			setToken('');
			setTokenOpen(false);
		},
	});
	const sync = useFbMutation((id) => fbEngagementApi.syncConnection(id), { success: t('syncDone') });
	const disconnect = useFbMutation((id) => fbEngagementApi.disconnect(id), {
		success: t('disconnected'),
		onSuccess: () => setDisconnecting(null),
	});

	useOAuthReturn(complete);
	useOAuthPopupListener();

	const oauthConfigured = Boolean(config.data?.oauthConfigured);

	const connectWithFacebook = async () => {
		const popup = window.open('', OAUTH_CHANNEL, POPUP_FEATURES);
		setOpening(true);
		try {
			const { url } = await fbEngagementApi.oauthUrl(locale);
			if (popup && !popup.closed) {
				popup.location.href = url;
				popup.focus();
			} else {
				window.location.assign(url);
			}
		} catch (error) {
			popup?.close();
			toast.error(apiErrorMessage(error, t('oauthFailed')));
		} finally {
			setOpening(false);
		}
	};

	const closeTokenDialog = (open) => {
		setTokenOpen(open);
		if (!open) setToken('');
	};

	const items = connections.data ?? [];

	return (
		<div className="space-y-5">
			<Panel
				title={t('connectTitle')}
				description={t('connectHint')}
				actions={
					<>
						<Button variant="outline" className={outlineButtonClass} onClick={() => setTokenOpen(true)}>
							<KeyRound aria-hidden />
							{t('useAccessToken')}
						</Button>
						<Button
							onClick={connectWithFacebook}
							disabled={!oauthConfigured || opening || complete.isPending}
							className="bg-[#1877F2] hover:bg-[#166FE5]"
							title={oauthConfigured ? undefined : t('oauthNotConfigured')}
						>
							{opening || complete.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <FaFacebook aria-hidden />}
							{t('connectWithFacebook')}
						</Button>
					</>
				}
			>
				{config.isLoading ? (
					<SkeletonList rows={1} />
				) : config.isError ? (
					<ErrorState error={config.error} onRetry={() => config.refetch()} />
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						<div
							className={cn(
								'flex items-start gap-3 rounded-xl p-3 text-[13px] leading-6',
								oauthConfigured
									? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200'
									: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
							)}
						>
							{oauthConfigured ? (
								<CheckCircle2 className="mt-1 size-4 shrink-0" aria-hidden />
							) : (
								<AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden />
							)}
							<span>{oauthConfigured ? t('oauthReady') : t('oauthNotConfigured')}</span>
						</div>
						<dl className="space-y-2 text-xs">
							<div>
								<dt className="font-medium text-slate-500 dark:text-slate-400">{t('requiredPermissions')}</dt>
								<dd className="mt-1 flex flex-wrap gap-1">
									{config.data.scopes.map((scope) => (
										<Tag key={scope} className="font-mono">{scope}</Tag>
									))}
								</dd>
							</div>
							<div>
								<dt className="font-medium text-slate-500 dark:text-slate-400">{t('redirectUri')}</dt>
								<dd className="mt-1 break-all font-mono text-slate-700 dark:text-slate-300" dir="ltr">{config.data.redirectUri}</dd>
							</div>
						</dl>
					</div>
				)}
			</Panel>

			{connections.isLoading ? (
				<SkeletonList rows={3} />
			) : connections.isError ? (
				<ErrorState error={connections.error} onRetry={() => connections.refetch()} />
			) : items.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
					<EmptyState icon={Users} title={t('noConnections')} description={t('noConnectionsHint')} />
				</div>
			) : (
				<div className="space-y-4">
					{items.map((connection) => (
						<ConnectionCard
							key={connection.id}
							connection={connection}
							syncing={sync.isPending && sync.variables === connection.id}
							onSync={() => sync.mutate(connection.id)}
							onDisconnect={() => setDisconnecting(connection)}
						/>
					))}
				</div>
			)}

			<FbDialog
				open={tokenOpen}
				onOpenChange={closeTokenDialog}
				title={t('tokenTitle')}
				description={t('tokenHint')}
				footer={
					<>
						<Button variant="ghost" className={ghostButtonClass} onClick={() => closeTokenDialog(false)}>
							{t('cancel')}
						</Button>
						<Button onClick={() => connectToken.mutate(token.trim())} disabled={token.trim().length < 20 || connectToken.isPending}>
							{connectToken.isPending && <Loader2 className="animate-spin" aria-hidden />}
							{t('connect')}
						</Button>
					</>
				}
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (token.trim().length >= 20) connectToken.mutate(token.trim());
					}}
				>
					<Field label={t('accessToken')} htmlFor="fb-access-token" hint={t('tokenStorageHint')}>
						<input
							id="fb-access-token"
							type="password"
							value={token}
							onChange={(event) => setToken(event.target.value)}
							autoComplete="off"
							spellCheck={false}
							className={cn(inputClass, 'font-mono')}
							dir="ltr"
						/>
					</Field>
				</form>
			</FbDialog>

			<ConfirmDialog
				open={Boolean(disconnecting)}
				onOpenChange={(open) => !open && setDisconnecting(null)}
				title={t('disconnectTitle', { name: disconnecting?.displayName || t('unnamedConnection') })}
				description={t('disconnectHint')}
				confirmLabel={t('disconnect')}
				loading={disconnect.isPending}
				onConfirm={() => disconnect.mutate(disconnecting.id)}
			/>
		</div>
	);
}
