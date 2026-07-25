'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	Braces,
	CheckCheck,
	Edit3,
	FileJson,
	Layers,
	MessageCircle,
	Plus,
	Sparkles,
	Trash2,
	User,
	Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { useDemoMode } from '../DemoModeProvider';
import DemoConversationSettings from './DemoConversationSettings';
import DemoEventQueue from './DemoEventQueue';
import DemoInfoTip from './DemoInfoTip';
import DemoJsonImportDialog from './DemoJsonImportDialog';
import DemoJsonPanel from './DemoJsonPanel';
import DemoMessageEditor from './DemoMessageEditor';
import DemoModeTabs from './DemoModeTabs';
import DemoSelect from './DemoSelect';
import FakeContactDialog from './FakeContactDialog';

function contactIdOf(conversation) {
	return String(conversation.contactId || conversation.contact_id || conversation.contact?.id || '');
}

function SectionHeader({ title, hint, icon: Icon }) {
	return (
		<div className="flex min-w-0 flex-1 items-start gap-2">
			{Icon ? (
				<span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
					<Icon size={14} />
				</span>
			) : null}
			<div className="min-w-0">
				<div className="flex items-center gap-1.5">
					<h3 className="font-black text-slate-900 dark:text-white">{title}</h3>
					<DemoInfoTip text={hint} />
				</div>
				{hint ? <p className="mt-0.5 text-xs leading-snug text-slate-400">{hint}</p> : null}
			</div>
		</div>
	);
}

export default function DemoStudio({
	open,
	onOpenChange,
	labels,
	realAccountId,
	realConversations = [],
}) {
	const demo = useDemoMode();
	const [selectedContactId, setSelectedContactId] = useState(null);
	const [contactDialogOpen, setContactDialogOpen] = useState(false);
	const [editingContact, setEditingContact] = useState(null);
	const [editingMessage, setEditingMessage] = useState(null);
	const [selectedOverlayId, setSelectedOverlayId] = useState(null);
	const [selectedRealConversationId, setSelectedRealConversationId] = useState('');
	const [importOpen, setImportOpen] = useState(false);
	const [contactMode, setContactMode] = useState('form');
	const [conversationMode, setConversationMode] = useState('form');
	const [messageMode, setMessageMode] = useState('form');
	const [eventMode, setEventMode] = useState('form');
	const activeProfile = demo.profiles.find(
		profile => String(profile.id) === String(demo.settings.activeProfileId),
	);
	const [profileName, setProfileName] = useState('');

	useEffect(() => {
		setProfileName(activeProfile?.name || activeProfile?.label || '');
	}, [activeProfile?.id, activeProfile?.label, activeProfile?.name]);

	const fakeConversations = useMemo(
		() =>
			demo.data.conversations.filter(
				item => (item.sourceType || item.source_type) !== 'real_overlay',
			),
		[demo.data.conversations],
	);
	const overlayConversations = useMemo(
		() =>
			demo.data.conversations.filter(
				item => (item.sourceType || item.source_type) === 'real_overlay',
			),
		[demo.data.conversations],
	);
	const selectedOverlay =
		overlayConversations.find(item => String(item.id) === String(selectedOverlayId)) || null;
	const selectedContact = selectedOverlay
		? {
				name: selectedOverlay.overrides?.displayName || labels.realOverlay,
			}
		: demo.data.contacts.find(contact => String(contact.id) === String(selectedContactId)) ||
			null;
	const selectedConversation =
		selectedOverlay ||
		fakeConversations.find(
			conversation => contactIdOf(conversation) === String(selectedContactId),
		) ||
		null;
	const selectedMessages = selectedConversation
		? demo.data.messagesByConversation[String(selectedConversation.id)] || []
		: [];
	const queueConversations = demo.data.conversations.map(conversation => {
		const contact = demo.data.contacts.find(
			item => String(item.id) === contactIdOf(conversation),
		);
		return {
			...conversation,
			contactName:
				contact?.name ||
				contact?.displayName ||
				contact?.phone ||
				conversation.overrides?.displayName,
		};
	});

	const realChatOptions = realConversations.map(conversation => ({
		value: String(conversation.id),
		label:
			conversation.contact?.name ||
			conversation.contact?.phone ||
			conversation.name ||
			String(conversation.id),
	}));

	const saveContact = async payload => {
		if (editingContact) {
			await demo.updateContact(editingContact.id, payload);
		} else {
			const created = await demo.createContact(payload);
			setSelectedContactId(created.id);
			setSelectedOverlayId(null);
		}
	};

	const applyContactJson = async parsed => {
		const payload = {
			name: String(parsed?.name || '').trim(),
			phone: parsed?.phone || null,
			about: parsed?.about || null,
			avatarColor: parsed?.avatarColor || null,
			verified: Boolean(parsed?.verified),
			presenceStatus: parsed?.presenceStatus || 'offline',
			lastSeenAt: parsed?.lastSeenAt ? new Date(parsed.lastSeenAt).toISOString() : null,
		};
		if (!payload.name) throw new Error(labels.invalidJson);
		await saveContact(payload);
	};

	const removeContact = async contact => {
		if (!window.confirm(labels.confirmDeleteContact)) return;
		await demo.deleteContact(contact.id);
		if (String(selectedContactId) === String(contact.id)) setSelectedContactId(null);
	};

	const saveMessage = async payload => {
		if (!selectedConversation) return;
		if (editingMessage) {
			await demo.updateMessage(selectedConversation.id, editingMessage.id, payload);
			setEditingMessage(null);
		} else {
			await demo.createMessage(selectedConversation.id, payload);
		}
	};

	const applyMessageJson = async parsed => {
		if (!selectedConversation) return;
		const direction = parsed?.direction === 'outbound' ? 'outbound' : 'inbound';
		await saveMessage({
			type: parsed?.type || 'text',
			text: parsed?.text ?? null,
			direction,
			status:
				parsed?.status || (direction === 'outbound' ? 'sent' : 'delivered'),
			timestamp: parsed?.timestamp
				? new Date(parsed.timestamp).toISOString()
				: new Date().toISOString(),
			showReadReceipt: parsed?.showReadReceipt ?? true,
			forwarded: Boolean(parsed?.forwarded),
			deletedMode: parsed?.deletedMode || 'none',
			replyToId: parsed?.replyToId || null,
			location: parsed?.location || null,
			reactions: Array.isArray(parsed?.reactions)
				? parsed.reactions.map(emoji =>
						typeof emoji === 'string' ? { emoji, actorKey: 'contact' } : emoji,
					)
				: [],
			mediaFile: null,
		});
	};

	const applyConversationJson = async parsed => {
		if (!selectedConversation) return;
		await demo.updateConversation(selectedConversation.id, {
			pinned: Boolean(parsed?.pinned),
			archived: Boolean(parsed?.archived),
			unreadCount: Math.max(0, Number(parsed?.unreadCount) || 0),
			mutedUntil: parsed?.mutedUntil ? new Date(parsed.mutedUntil).toISOString() : null,
		});
	};

	const applyEventJson = async parsed => {
		const conversationId = parsed?.conversationId || selectedConversation?.id;
		if (!conversationId) throw new Error(labels.selectConversation);
		const eventType = parsed?.eventType || 'typing';
		await demo.createEvent({
			conversationId,
			eventType,
			delayMs: Math.max(0, Number(parsed?.delayMs) || 0),
			durationMs: parsed?.infinite ? null : Math.max(0, Number(parsed?.durationMs) || 0),
			scheduledAt: parsed?.scheduledAt ? new Date(parsed.scheduledAt).toISOString() : null,
			infinite: Boolean(parsed?.infinite),
			randomize: Boolean(parsed?.randomize),
			enabled: parsed?.enabled !== false,
			payload:
				parsed?.payload ||
				(eventType === 'incoming_message'
					? {
							text: parsed?.text || '',
							status: 'delivered',
							unreadCount: Math.max(0, Number(parsed?.unreadCount) || 1),
							notification: Boolean(parsed?.notification),
							moveToTop: parsed?.moveToTop !== false,
							typingBefore: Boolean(parsed?.typingBefore),
						}
					: { active: parsed?.active !== false }),
		});
	};

	const removeMessage = async message => {
		if (!window.confirm(labels.confirmDeleteMessage)) return;
		await demo.deleteMessage(selectedConversation.id, message.id);
		if (String(editingMessage?.id) === String(message.id)) setEditingMessage(null);
	};

	const addRealOverlay = async () => {
		const realConversation = realConversations.find(
			item => String(item.id) === String(selectedRealConversationId),
		);
		if (!realConversation) return;
		const created = await demo.createRealOverlay({ realAccountId, realConversation });
		setSelectedOverlayId(created.id);
		setSelectedContactId(null);
		setSelectedRealConversationId('');
	};

	const removeOverlay = async overlay => {
		if (!window.confirm(labels.confirmDeleteOverlay)) return;
		await demo.deleteConversation(overlay.id);
		if (String(selectedOverlayId) === String(overlay.id)) setSelectedOverlayId(null);
	};

	const guideItems = [
		{ icon: Users, text: labels.studioGuideContacts },
		{ icon: Layers, text: labels.studioGuideOverlays },
		{ icon: MessageCircle, text: labels.studioGuideMessages },
		{ icon: Sparkles, text: labels.studioGuideEvents },
		{ icon: Braces, text: labels.studioGuideJson },
	];

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					dir={labels.dir}
					className="h-[92vh] max-h-[900px] max-w-[min(1200px,calc(100%-1rem))] grid-rows-[auto_1fr] overflow-hidden p-0"
				>
					<DialogHeader className="border-b border-slate-200 bg-gradient-to-br from-[var(--color-primary-50)] via-white to-transparent px-5 py-4 pe-16 dark:border-slate-700 dark:from-[var(--color-primary-950)]/40 dark:via-slate-900">
						<div className="flex flex-wrap items-start justify-between gap-3">
							<div>
								<div className="flex items-center gap-1.5">
									<DialogTitle className="text-base">{labels.studio}</DialogTitle>
									<DemoInfoTip text={labels.studioHint} />
								</div>
								<DialogDescription className="mt-1 max-w-2xl">
									{labels.studioHint}
								</DialogDescription>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setImportOpen(true)}
							>
								<FileJson />
								{labels.importJson}
							</Button>
						</div>
						{activeProfile && (
							<form
								onSubmit={async event => {
									event.preventDefault();
									if (!profileName.trim()) return;
									await demo.updateProfile(activeProfile.id, { name: profileName.trim() });
								}}
								className="flex max-w-md gap-2 pt-2"
							>
								<input
									aria-label={labels.profileName}
									value={profileName}
									onChange={event => setProfileName(event.target.value)}
									className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
								/>
								<Button type="submit" size="sm" disabled={!profileName.trim()}>
									{labels.save}
								</Button>
							</form>
						)}
					</DialogHeader>
					<div className="grid min-h-0 grid-cols-1 overflow-hidden min-[769px]:grid-cols-[300px_1fr]">
						<aside className="min-h-0 space-y-4 overflow-y-auto border-b border-slate-200 p-3 min-[769px]:border-b-0 min-[769px]:border-e dark:border-slate-700">
							{/* Guide */}
							<div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-700 dark:bg-slate-800/40">
								<p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
									{labels.studioGuideTitle}
								</p>
								<ul className="space-y-1.5">
									{guideItems.map(item => (
										<li key={item.text} className="flex gap-2 text-[11px] leading-snug text-slate-500">
											<item.icon size={13} className="mt-0.5 shrink-0 text-[var(--color-primary-500)]" />
											<span>{item.text}</span>
										</li>
									))}
								</ul>
							</div>

							{realAccountId && realConversations.length > 0 && (
								<div className="space-y-2 rounded-xl border border-[var(--color-secondary-200)] bg-[var(--color-secondary-50)]/40 p-2.5 dark:border-[var(--color-secondary-900)] dark:bg-[var(--color-secondary-950)]/20">
									<div className="flex items-center gap-1.5">
										<p className="text-xs font-black">{labels.realOverlays}</p>
										<DemoInfoTip text={labels.realOverlaysHint} />
									</div>
									<div className="flex gap-1">
										<DemoSelect
											value={selectedRealConversationId}
											onValueChange={setSelectedRealConversationId}
											placeholder={labels.selectRealChat}
											allowEmpty
											emptyLabel={labels.selectRealChat}
											options={realChatOptions}
											className="h-8 flex-1"
										/>
										<Button
											type="button"
											size="icon-sm"
											disabled={!selectedRealConversationId}
											onClick={addRealOverlay}
											aria-label={labels.addOverlay}
										>
											<Plus />
										</Button>
									</div>
									{overlayConversations.map(overlay => (
										<div
											key={overlay.id}
											className="flex items-center gap-1 rounded-lg bg-white/80 p-1 dark:bg-slate-900/60"
										>
											<button
												type="button"
												onClick={() => {
													setSelectedOverlayId(overlay.id);
													setSelectedContactId(null);
												}}
												className="min-w-0 flex-1 truncate px-1 text-start text-xs font-bold"
											>
												{overlay.overrides?.displayName || labels.realOverlay}
											</button>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												onClick={() => removeOverlay(overlay)}
											>
												<Trash2 />
											</Button>
										</div>
									))}
								</div>
							)}

							<div>
								<div className="mb-2 flex items-center justify-between gap-2">
									<div className="flex items-center gap-1.5">
										<h3 className="font-black">{labels.contacts}</h3>
										<DemoInfoTip text={labels.contactsHint} />
									</div>
									<div className="flex items-center gap-1">
										<DemoModeTabs
											labels={labels}
											mode={contactMode}
											onChange={setContactMode}
										/>
										<Button
											type="button"
											size="icon-sm"
											onClick={() => {
												setEditingContact(null);
												setContactDialogOpen(true);
											}}
											aria-label={labels.createContact}
										>
											<Plus />
										</Button>
									</div>
								</div>

								{contactMode === 'json' && (
									<div className="mb-3">
										<DemoJsonPanel
											labels={labels}
											title={labels.contactJsonTitle}
											hint={labels.contactJsonHint}
											example={labels.contactJsonExample}
											onSubmit={applyContactJson}
											compact
										/>
									</div>
								)}

								{demo.data.contacts.length === 0 ? (
									<p className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-400">
										{labels.noContacts}
									</p>
								) : (
									<div className="space-y-1">
										{demo.data.contacts.map(contact => {
											const active = String(contact.id) === String(selectedContactId);
											return (
												<div
													key={contact.id}
													className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${
														active
															? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'
															: 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
													}`}
												>
													<button
														type="button"
														onClick={() => {
															setSelectedContactId(contact.id);
															setSelectedOverlayId(null);
														}}
														className="flex min-w-0 flex-1 items-center gap-2 text-start"
													>
														<span
															className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-white"
															style={{
																backgroundColor: contact.avatarColor || '#10b981',
															}}
														>
															{contact.avatarUrl || contact.avatar_url ? (
																<img
																	src={contact.avatarUrl || contact.avatar_url}
																	alt=""
																	className="h-full w-full object-cover"
																/>
															) : (
																<User size={16} />
															)}
														</span>
														<span className="min-w-0">
															<span className="block truncate text-sm font-bold">
																{contact.name || contact.displayName}
																{contact.verified ? ' ✓' : ''}
															</span>
															<span className="block truncate text-[11px] text-slate-400">
																{contact.phone || contact.waId}
															</span>
														</span>
													</button>
													<Button
														type="button"
														variant="ghost"
														size="icon-sm"
														onClick={() => {
															setEditingContact(contact);
															setContactDialogOpen(true);
														}}
													>
														<Edit3 />
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="icon-sm"
														onClick={() => removeContact(contact)}
													>
														<Trash2 />
													</Button>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</aside>
						<main className="min-h-0 overflow-y-auto p-4">
							{!selectedContact || !selectedConversation ? (
								<div className="grid min-h-72 place-items-center text-center">
									<div className="max-w-sm rounded-2xl border border-dashed border-slate-200 p-8 dark:border-slate-700">
										<MessageCircle className="mx-auto mb-3 text-slate-300" size={32} />
										<p className="text-sm font-bold text-slate-500">{labels.selectContact}</p>
										<p className="mt-1 text-xs text-slate-400">{labels.contactsHint}</p>
									</div>
								</div>
							) : (
								<div className="space-y-5">
									<section className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
										<div className="mb-2 flex flex-wrap items-start justify-between gap-2">
											<SectionHeader
												title={labels.conversationSettings}
												hint={labels.conversationSettingsHint}
												icon={Layers}
											/>
											<DemoModeTabs
												labels={labels}
												mode={conversationMode}
												onChange={setConversationMode}
											/>
										</div>
										{conversationMode === 'json' ? (
											<DemoJsonPanel
												labels={labels}
												title={labels.conversationJsonTitle}
												hint={labels.conversationJsonHint}
												example={labels.conversationJsonExample}
												onSubmit={applyConversationJson}
												compact
											/>
										) : (
											<DemoConversationSettings
												conversation={selectedConversation}
												labels={labels}
												onSave={payload =>
													demo.updateConversation(selectedConversation.id, payload)
												}
											/>
										)}
									</section>

									<section className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
										<div className="mb-2 flex flex-wrap items-start justify-between gap-2">
											<SectionHeader
												title={labels.messages}
												hint={labels.messagesHint}
												icon={MessageCircle}
											/>
											<DemoModeTabs
												labels={labels}
												mode={messageMode}
												onChange={setMessageMode}
											/>
										</div>
										{messageMode === 'json' ? (
											<DemoJsonPanel
												labels={labels}
												title={labels.messageJsonTitle}
												hint={labels.messageJsonHint}
												example={labels.messageJsonExample}
												onSubmit={applyMessageJson}
												compact
											/>
										) : (
											<DemoMessageEditor
												message={editingMessage}
												messages={selectedMessages}
												labels={labels}
												onSave={saveMessage}
												onCancel={() => setEditingMessage(null)}
											/>
										)}
										<div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
											{selectedMessages.length === 0 ? (
												<p className="rounded-xl border border-dashed p-4 text-center text-xs text-slate-400">
													{labels.noMessages}
												</p>
											) : (
												[...selectedMessages]
													.sort(
														(a, b) =>
															new Date(a.providerTimestamp || a.created_at).getTime() -
															new Date(b.providerTimestamp || b.created_at).getTime(),
													)
													.map(message => (
														<div
															key={message.id}
															className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700"
														>
															<div className="min-w-0 flex-1">
																<p className="whitespace-pre-wrap text-sm">{message.text}</p>
																<div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
																	<span>
																		{message.direction === 'inbound'
																			? labels.inbound
																			: labels.outbound}
																	</span>
																	<span>
																		{new Date(
																			message.providerTimestamp ||
																				message.timestamp ||
																				message.created_at ||
																				message.createdAt,
																		).toLocaleString()}
																	</span>
																	<span className="inline-flex items-center gap-1">
																		{labels.statuses[message.status] || message.status}
																		{message.status === 'read' && <CheckCheck size={12} />}
																	</span>
																</div>
															</div>
															<Button
																type="button"
																variant="ghost"
																size="icon-sm"
																onClick={() => setEditingMessage(message)}
															>
																<Edit3 />
															</Button>
															<Button
																type="button"
																variant="ghost"
																size="icon-sm"
																onClick={() => removeMessage(message)}
															>
																<Trash2 />
															</Button>
														</div>
													))
											)}
										</div>
									</section>

									<section className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
										<div className="mb-2 flex flex-wrap items-start justify-between gap-2">
											<SectionHeader
												title={labels.events}
												hint={labels.eventsHint}
												icon={Sparkles}
											/>
											<DemoModeTabs
												labels={labels}
												mode={eventMode}
												onChange={setEventMode}
											/>
										</div>
										{eventMode === 'json' ? (
											<DemoJsonPanel
												labels={labels}
												title={labels.eventJsonTitle}
												hint={labels.eventJsonHint}
												example={{
													...labels.eventJsonExample,
													conversationId: selectedConversation?.id,
												}}
												onSubmit={applyEventJson}
												compact
											/>
										) : (
											<DemoEventQueue
												events={demo.data.events}
												conversations={queueConversations}
												labels={labels}
												defaultConversationId={selectedConversation?.id}
												onCreate={demo.createEvent}
												onDelete={demo.deleteEvent}
											/>
										)}
									</section>
								</div>
							)}
						</main>
					</div>
				</DialogContent>
			</Dialog>
			<FakeContactDialog
				open={contactDialogOpen}
				onOpenChange={setContactDialogOpen}
				contact={editingContact}
				labels={labels}
				onSave={saveContact}
			/>
			<DemoJsonImportDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				labels={labels}
				onImport={demo.importProfileData}
			/>
		</>
	);
}
