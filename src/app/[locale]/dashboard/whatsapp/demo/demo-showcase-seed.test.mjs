import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { buildDemoPdf, buildShowcaseScript, buildVoiceWav, seedShowcaseProfile } from './demo-showcase-seed.js';

function fakeApi({ failOnMessage = -1 } = {}) {
	const calls = { contacts: [], conversations: [], messages: [], events: [], uploads: [], deleted: [] };
	let messageCount = 0;
	return {
		calls,
		createProfile: async payload => ({ id: randomUUID(), ...payload }),
		uploadMedia: async (profileId, file) => {
			const id = randomUUID();
			calls.uploads.push({ id, profileId, file });
			return { id };
		},
		createContact: async (profileId, payload) => {
			const id = randomUUID();
			calls.contacts.push({ id, profileId, payload });
			return { id };
		},
		createConversation: async (profileId, payload) => {
			const id = randomUUID();
			calls.conversations.push({ id, profileId, payload });
			return { id };
		},
		createMessage: async (conversationId, payload) => {
			if (messageCount === failOnMessage) throw new Error('boom');
			messageCount += 1;
			const id = randomUUID();
			calls.messages.push({ id, conversationId, payload });
			return { id };
		},
		createEvent: async (profileId, payload) => {
			calls.events.push({ profileId, payload });
			return { id: randomUUID() };
		},
		deleteProfile: async id => {
			calls.deleted.push(id);
			return { ok: true };
		},
	};
}

const makeFile = asset => ({ asset });

test('showcase script covers every bubble type in both languages', () => {
	for (const locale of ['ar', 'en']) {
		const script = buildShowcaseScript(locale);
		const specs = script.contacts.flatMap(contact => contact.messages);
		const types = new Set(specs.map(spec => spec.type || 'text'));
		for (const type of ['text', 'image', 'video', 'ptt', 'document', 'location', 'live_location', 'sticker', 'contacts']) {
			assert.ok(types.has(type), `${locale} is missing ${type}`);
		}
		assert.ok(specs.some(spec => spec.deleted));
		assert.ok(specs.some(spec => spec.forwarded));
		assert.ok(specs.some(spec => spec.edited));
		assert.ok(specs.some(spec => spec.status === 'failed'));
		assert.ok(specs.some(spec => spec.reactions?.length));
		assert.ok(specs.some(spec => Number.isInteger(spec.reply)));
		assert.ok(script.contacts.some(contact => contact.conversation.group));
		assert.ok(script.contacts.some(contact => contact.conversation.archived));
		assert.ok(script.contacts.some(contact => contact.conversation.muted));
		for (const spec of specs) {
			if (spec.media) assert.ok(script.assets[spec.media], `asset ${spec.media} exists`);
			if (Number.isInteger(spec.reply)) assert.ok(spec.reply >= 0);
		}
		for (const contact of script.contacts) assert.match(contact.phone, /^\+2010000001\d\d$/);
		assert.equal(new Set(script.contacts.map(contact => contact.phone)).size, script.contacts.length);
	}
	assert.match(buildShowcaseScript('ar').contacts[0].name, /[\u0600-\u06ff]/);
	assert.doesNotMatch(buildShowcaseScript('en').contacts[0].name, /[\u0600-\u06ff]/);
});

test('generated pdf has a valid header, xref offsets and trailer', () => {
	const pdf = buildDemoPdf(['Title (draft)', 'Line two']);
	assert.ok(pdf.startsWith('%PDF-1.4\n'));
	assert.ok(pdf.trimEnd().endsWith('%%EOF'));
	const startxref = Number(pdf.match(/startxref\n(\d+)/)[1]);
	assert.ok(pdf.slice(startxref).startsWith('xref'));
	const offsets = [...pdf.matchAll(/^(\d{10}) 00000 n $/gm)].map(match => Number(match[1]));
	assert.equal(offsets.length, 5);
	offsets.forEach((offset, index) => assert.ok(pdf.slice(offset).startsWith(`${index + 1} 0 obj`)));
	assert.ok(pdf.includes('(Title \\(draft\\)) Tj'));
});

test('seeding creates contacts, chats, ordered messages, replies and events', async () => {
	const api = fakeApi();
	const now = Date.parse('2026-10-13T12:00:00.000Z');
	const progress = [];
	const result = await seedShowcaseProfile({ api, locale: 'ar', now, makeFile, onProgress: p => progress.push(p) });
	const script = buildShowcaseScript('ar');
	const messageTotal = script.contacts.reduce((sum, contact) => sum + contact.messages.length, 0);

	assert.equal(api.calls.contacts.length, script.contacts.length);
	assert.equal(api.calls.conversations.length, script.contacts.length);
	assert.equal(api.calls.messages.length, messageTotal);
	assert.equal(api.calls.events.length, script.events.length);
	assert.equal(progress.at(-1).done, result.total);
	assert.equal(progress.at(-1).total, result.total);
	assert.deepEqual(api.calls.deleted, []);

	for (const contact of api.calls.contacts) assert.ok(contact.payload.photoAttachmentId);
	const group = api.calls.conversations.find(conversation => conversation.payload.overrides.type === 'group');
	assert.ok(group);
	const groupMessages = api.calls.messages.filter(message => message.conversationId === group.id);
	assert.ok(groupMessages.some(message => message.payload.metadata?.senderName));
	assert.ok(groupMessages.some(message => message.payload.metadata?.sharedContact?.phones?.length));

	const ids = new Set(api.calls.messages.map(message => message.id));
	const replies = api.calls.messages.filter(message => message.payload.replyToId);
	assert.ok(replies.length >= 2);
	for (const reply of replies) {
		assert.ok(ids.has(reply.payload.replyToId));
		const target = api.calls.messages.find(message => message.id === reply.payload.replyToId);
		assert.equal(target.conversationId, reply.conversationId);
		assert.ok(Date.parse(target.payload.timestamp) < Date.parse(reply.payload.timestamp));
	}

	const usedAttachments = api.calls.messages.flatMap(message => message.payload.attachmentIds);
	assert.equal(new Set(usedAttachments).size, usedAttachments.length, 'each upload is attached once');
	const deleted = api.calls.messages.find(message => message.payload.deletedMode === 'for_everyone');
	assert.equal(deleted.payload.text, null);
	for (const message of api.calls.messages) assert.ok(Date.parse(message.payload.timestamp) < now);
	for (const event of api.calls.events) assert.ok(event.payload.conversationId);
});

test('synthesized voice note is a valid, deterministic, audible 16-bit WAV', () => {
	const wav = buildVoiceWav({ seconds: 2, pitch: 150, seed: 3 });
	const view = new DataView(wav.buffer);
	const ascii = (start, end) => String.fromCharCode(...wav.slice(start, end));
	assert.equal(ascii(0, 4), 'RIFF');
	assert.equal(ascii(8, 12), 'WAVE');
	assert.equal(ascii(36, 40), 'data');
	assert.equal(view.getUint32(24, true), 16000);
	assert.equal(view.getUint32(40, true), 2 * 16000 * 2);
	assert.equal(wav.length, 44 + 2 * 16000 * 2);
	let peak = 0;
	let silent = 0;
	for (let offset = 44; offset < wav.length; offset += 2) {
		const sample = Math.abs(view.getInt16(offset, true));
		peak = Math.max(peak, sample);
		if (sample < 50) silent += 1;
	}
	assert.ok(peak > 20000 && peak <= 0x7fff, `peak ${peak}`);
	assert.ok(silent > 1000, 'has pauses between syllables');
	assert.deepEqual(buildVoiceWav({ seconds: 2, pitch: 150, seed: 3 }), wav);
});

test('a media file the browser cannot load degrades only that message to text', async () => {
	const api = fakeApi();
	const result = await seedShowcaseProfile({
		api,
		locale: 'en',
		makeFile: asset => {
			if (asset.kind === 'voice') throw new Error('blocked by download manager');
			return { asset };
		},
	});
	assert.deepEqual(api.calls.deleted, []);
	assert.equal(result.skippedMedia, 3);
	const voiceSpecs = buildShowcaseScript('en').contacts.flatMap(c => c.messages).filter(m => m.type === 'ptt');
	assert.equal(voiceSpecs.length, 3);
	const fallbacks = api.calls.messages.filter(m => m.payload.text?.startsWith('🎤 Voice message'));
	assert.equal(fallbacks.length, 3);
	for (const message of fallbacks) {
		assert.equal(message.payload.type, 'text');
		assert.deepEqual(message.payload.attachmentIds, []);
	}
});

test('a failure removes the half-built profile and rethrows', async () => {
	const api = fakeApi({ failOnMessage: 4 });
	await assert.rejects(seedShowcaseProfile({ api, locale: 'en', makeFile }), /boom/);
	assert.equal(api.calls.deleted.length, 1);
});
