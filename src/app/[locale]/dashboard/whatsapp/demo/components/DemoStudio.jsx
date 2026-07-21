'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, Edit3, MessageCircle, Plus, Trash2, User } from 'lucide-react';
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
import DemoMessageEditor from './DemoMessageEditor';
import FakeContactDialog from './FakeContactDialog';

function contactIdOf(conversation) {
	return String(conversation.contactId || conversation.contact_id || conversation.contact?.id || '');
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
				name:
					selectedOverlay.overrides?.displayName ||
					labels.realOverlay,
			}
		: demo.data.contacts.find(contact => String(contact.id) === String(selectedContactId)) || null;
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

	const saveContact = async payload => {
		if (editingContact) {
			await demo.updateContact(editingContact.id, payload);
		} else {
			const created = await demo.createContact(payload);
			setSelectedContactId(created.id);
			setSelectedOverlayId(null);
		}
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

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					dir={labels.dir}
					className="h-[92vh] max-h-[900px] max-w-[min(1200px,calc(100%-1rem))] grid-rows-[auto_1fr] overflow-hidden p-0"
				>
					<DialogHeader className="border-b border-slate-200 px-5 py-4 pe-16 dark:border-slate-700">
						<DialogTitle>{labels.studio}</DialogTitle>
						<DialogDescription>{labels.studioHint}</DialogDescription>
						{activeProfile && (
							<form
								onSubmit={async event => {
									event.preventDefault();
									if (!profileName.trim()) return;
									await demo.updateProfile(activeProfile.id, { name: profileName.trim() });
								}}
								className="flex max-w-md gap-2 pt-1"
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
					<div className="grid min-h-0 grid-cols-1 overflow-hidden min-[769px]:grid-cols-[280px_1fr]">
						<aside className="min-h-0 overflow-y-auto border-b border-slate-200 p-3 min-[769px]:border-b-0 min-[769px]:border-e dark:border-slate-700">
							{realAccountId && realConversations.length > 0 && (
								<div className="mb-4 space-y-2 rounded-xl border border-violet-200 p-2 dark:border-violet-900">
									<p className="text-xs font-black">{labels.realOverlays}</p>
									<div className="flex gap-1">
										<select
											value={selectedRealConversationId}
											onChange={event => setSelectedRealConversationId(event.target.value)}
											className="h-8 min-w-0 flex-1 rounded border bg-transparent px-1 text-xs"
										>
											<option value="">{labels.selectRealChat}</option>
											{realConversations.map(conversation => (
												<option key={conversation.id} value={conversation.id}>
													{conversation.contact?.name ||
														conversation.contact?.phone ||
														conversation.name ||
														conversation.id}
												</option>
											))}
										</select>
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
										<div key={overlay.id} className="flex items-center gap-1 rounded-lg bg-violet-50 p-1 dark:bg-violet-950/30">
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
							<div className="mb-3 flex items-center justify-between gap-2">
								<h3 className="font-black">{labels.contacts}</h3>
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
												className={`flex items-center gap-2 rounded-xl border p-2 ${
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
														style={{ backgroundColor: contact.avatarColor || '#10b981' }}
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
						</aside>
						<main className="min-h-0 overflow-y-auto p-4">
							{!selectedContact || !selectedConversation ? (
								<div className="grid min-h-72 place-items-center text-center text-sm text-slate-400">
									<div>
										<MessageCircle className="mx-auto mb-2" />
										{labels.selectContact}
									</div>
								</div>
							) : (
								<div className="space-y-5">
									<section>
										<h3 className="mb-2 font-black">{labels.conversationSettings}</h3>
										<DemoConversationSettings
											conversation={selectedConversation}
											labels={labels}
											onSave={payload =>
												demo.updateConversation(selectedConversation.id, payload)
											}
										/>
									</section>
									<section>
										<h3 className="mb-2 font-black">{labels.messages}</h3>
										<DemoMessageEditor
											message={editingMessage}
											messages={selectedMessages}
											labels={labels}
											onSave={saveMessage}
											onCancel={() => setEditingMessage(null)}
										/>
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
									<section>
										<h3 className="mb-2 font-black">{labels.events}</h3>
										<DemoEventQueue
											events={demo.data.events}
											conversations={queueConversations}
											labels={labels}
											onCreate={demo.createEvent}
											onDelete={demo.deleteEvent}
										/>
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
		</>
	);
}
