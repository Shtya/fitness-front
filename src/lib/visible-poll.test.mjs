import assert from 'node:assert/strict';
import test from 'node:test';
import { createVisiblePoller } from './visible-poll.js';

function fakeEnv() {
	let now = 0;
	let seq = 0;
	const timeouts = new Map();
	const intervals = new Map();
	const listeners = new Map();
	const doc = {
		visibilityState: 'visible',
		addEventListener: (name, fn) => listeners.set(name, fn),
		removeEventListener: name => listeners.delete(name),
	};
	const timers = {
		setTimeout: (fn, ms) => (timeouts.set(++seq, { fn, at: now + ms }), seq),
		clearTimeout: id => timeouts.delete(id),
		setInterval: (fn, ms) => (intervals.set(++seq, { fn, ms, next: now + ms }), seq),
		clearInterval: id => intervals.delete(id),
	};
	async function advance(ms) {
		const end = now + ms;
		for (;;) {
			const due = [
				...[...timeouts].map(([id, t]) => ({ id, at: t.at, kind: 't', t })),
				...[...intervals].map(([id, t]) => ({ id, at: t.next, kind: 'i', t })),
			]
				.filter(d => d.at <= end)
				.sort((a, b) => a.at - b.at)[0];
			if (!due) break;
			now = due.at;
			if (due.kind === 't') timeouts.delete(due.id);
			else due.t.next += due.t.ms;
			due.t.fn();
			await flush();
		}
		now = end;
	}
	const setHidden = hidden => {
		doc.visibilityState = hidden ? 'hidden' : 'visible';
		listeners.get('visibilitychange')?.();
	};
	return { doc, timers, advance, setHidden, listeners };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('collapses a burst of requests into one load', async () => {
	const env = fakeEnv();
	let calls = 0;
	const poller = createVisiblePoller({
		load: async () => void calls++,
		intervalMs: 120_000,
		debounceMs: 1000,
		doc: env.doc,
		timers: env.timers,
	});
	poller.start();
	await flush();
	assert.equal(calls, 1);
	for (let i = 0; i < 50; i += 1) poller.request();
	await env.advance(1000);
	assert.equal(calls, 2);
	poller.stop();
});

test('skips interval ticks while hidden and catches up once on return', async () => {
	const env = fakeEnv();
	let calls = 0;
	const poller = createVisiblePoller({
		load: async () => void calls++,
		intervalMs: 1000,
		debounceMs: 100,
		doc: env.doc,
		timers: env.timers,
	});
	poller.start();
	await flush();
	assert.equal(calls, 1);
	env.setHidden(true);
	await env.advance(10_000);
	poller.request();
	await env.advance(1000);
	assert.equal(calls, 1);
	env.setHidden(false);
	await env.advance(100);
	assert.equal(calls, 2);
	poller.stop();
});

test('never overlaps loads; a request during flight reruns once', async () => {
	const env = fakeEnv();
	let calls = 0;
	let active = 0;
	let maxActive = 0;
	let release;
	const poller = createVisiblePoller({
		load: async () => {
			calls += 1;
			active += 1;
			maxActive = Math.max(maxActive, active);
			await new Promise(resolve => (release = resolve));
			active -= 1;
		},
		intervalMs: 120_000,
		doc: env.doc,
		timers: env.timers,
	});
	poller.start();
	void poller.run();
	void poller.run();
	void poller.run();
	release();
	await flush();
	release();
	await flush();
	assert.equal(calls, 2);
	assert.equal(maxActive, 1);
	poller.stop();
});

test('immediate:false waits for the first interval tick', async () => {
	const env = fakeEnv();
	let calls = 0;
	const poller = createVisiblePoller({
		load: async () => void calls++,
		intervalMs: 2500,
		immediate: false,
		doc: env.doc,
		timers: env.timers,
	});
	poller.start();
	await flush();
	assert.equal(calls, 0);
	await env.advance(2500);
	assert.equal(calls, 1);
	poller.stop();
});

test('stop removes the interval, pending debounce and visibility listener', async () => {
	const env = fakeEnv();
	let calls = 0;
	const poller = createVisiblePoller({
		load: async () => void calls++,
		intervalMs: 1000,
		debounceMs: 100,
		doc: env.doc,
		timers: env.timers,
	});
	poller.start();
	await flush();
	poller.request();
	poller.stop();
	await env.advance(10_000);
	assert.equal(calls, 1);
	assert.equal(env.listeners.has('visibilitychange'), false);
});
