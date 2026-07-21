import { isDemoId, resolveConversationSource } from './demo-read-model.js';

export class DemoRoutingError extends Error {
	constructor(message, code = 'DEMO_ROUTING_BLOCKED') {
		super(message);
		this.name = 'DemoRoutingError';
		this.code = code;
	}
}

export function assertSafeRealWriteId(id) {
	if (!id || isDemoId(id)) {
		throw new DemoRoutingError(
			'Synthetic or missing conversation id was blocked from the WhatsApp API.',
			'UNSAFE_REAL_WRITE_ID',
		);
	}
	return id;
}

export async function routeMessageCommand({
	demoEnabled,
	conversation,
	demoCommand,
	realCommand,
}) {
	const source = resolveConversationSource(conversation);
	const id = conversation?.id;

	if (!demoEnabled) {
		assertSafeRealWriteId(id);
		if (typeof realCommand !== 'function') {
			throw new DemoRoutingError('The production message command is unavailable.');
		}
		return realCommand({ conversationId: id, conversation });
	}

	if (!['demo', 'real_overlay'].includes(source)) {
		throw new DemoRoutingError(
			`Demo Mode blocked a write for source "${source}".`,
			'UNKNOWN_DEMO_SOURCE',
		);
	}
	if (typeof demoCommand !== 'function') {
		throw new DemoRoutingError('The Demo Mode message command is unavailable.');
	}
	return demoCommand({
		conversationId:
			source === 'real_overlay'
				? conversation.demoOverlayId
				: conversation.rawDemoId,
		conversation,
		source,
	});
}

export function canRouteDemoWrite(demoEnabled, conversation) {
	if (!conversation) return false;
	if (!demoEnabled) return !isDemoId(conversation.id);
	return ['demo', 'real_overlay'].includes(resolveConversationSource(conversation));
}
