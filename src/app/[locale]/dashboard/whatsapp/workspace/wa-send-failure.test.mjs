import test from 'node:test';
import assert from 'node:assert/strict';
import { explainSendFailure, sendFailureKind } from './wa-send-failure.js';

test('no connection and timeouts read as such, without repeating the raw text', () => {
	const offline = explainSendFailure({ sendError: 'No connection to the server', sendErrorCode: 'offline' });
	assert.equal(offline.kind, 'offline');
	assert.equal(offline.detail, null);
	assert.equal(sendFailureKind({ sendError: 'The request timed out', sendErrorCode: 'timeout' }), 'timeout');
});

test('no answer while online reads as an unreachable server', () => {
	assert.equal(sendFailureKind({ sendError: 'No connection to the server', sendErrorCode: 'unreachable' }), 'unreachable');
	assert.equal(sendFailureKind({ sendError: 'No connection to the server' }), 'unreachable');
});

test('a disconnected number is recognised from the server text', () => {
	assert.equal(sendFailureKind({ sendError: 'WhatsApp account is not connected', sendErrorCode: 400 }), 'disconnected');
	assert.equal(sendFailureKind({ sendError: 'Session closed', sendErrorCode: 500 }), 'disconnected');
});

test('HTTP statuses map to their causes and keep the server text as detail', () => {
	assert.equal(sendFailureKind({ sendError: 'Forbidden', sendErrorCode: 403 }), 'auth');
	assert.equal(sendFailureKind({ sendError: 'Not found', sendErrorCode: 404 }), 'notFound');
	assert.equal(sendFailureKind({ sendError: 'Payload too large', sendErrorCode: 413 }), 'tooLarge');
	assert.equal(sendFailureKind({ sendError: 'Slow down', sendErrorCode: 429 }), 'rateLimited');
	assert.equal(sendFailureKind({ sendError: 'text must be a string', sendErrorCode: 400 }), 'invalid');
	const server = explainSendFailure({ sendError: 'Internal server error', sendErrorCode: 500 });
	assert.equal(server.kind, 'server');
	assert.equal(server.detail, 'Internal server error');
	assert.equal(server.code, 500);
});

test('a message WhatsApp marked failed (no reason) explains the usual causes', () => {
	const info = explainSendFailure({ status: 'failed' });
	assert.equal(info.kind, 'rejected');
	assert.equal(info.detail, null);
	assert.match(info.fix, /connected/);
});

test('Arabic copy', () => {
	const info = explainSendFailure({ status: 'failed' }, true);
	assert.match(info.title, /واتساب/);
});
