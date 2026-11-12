// Staff limited to their assigned chats keep an unread count of their own, apart from the
// account's (the owner's). These decide which of the two a live event touches for this viewer.

/** Whether a `conversation_read` event clears this viewer's badge. */
export function readEventClearsViewer(payload, { seesWholeAccount, viewerUserId }) {
	const scope = payload?.scope;
	const mine = Boolean(viewerUserId) && String(payload?.userId || '') === String(viewerUserId);
	if (seesWholeAccount) {
		// No scope: read on the phone or an older server, which clears the account's count.
		if (scope === undefined) return true;
		return scope === 'account' || scope === 'both' || (scope === 'assignee' && mine);
	}
	return mine && (scope === 'assignee' || scope === 'both');
}

/** A `conversation_updated` payload with the unread count that belongs to this viewer. */
export function unreadPayloadForViewer(payload, { seesWholeAccount }) {
	if (!payload || typeof payload !== 'object') return payload;
	const { assigneeUnreadCount, ...rest } = payload;
	if (seesWholeAccount) return rest;
	const { unreadCount: _accountUnread, ...withoutAccount } = rest;
	return assigneeUnreadCount != null
		? { ...withoutAccount, unreadCount: assigneeUnreadCount }
		: withoutAccount;
}
