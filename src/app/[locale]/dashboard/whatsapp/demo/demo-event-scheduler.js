function hashSeed(seed) {
	let hash = 2166136261;
	for (const character of String(seed ?? 'demo')) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

export function createSeededRandom(seed) {
	let state = hashSeed(seed) || 1;
	return () => {
		state ^= state << 13;
		state ^= state >>> 17;
		state ^= state << 5;
		return (state >>> 0) / 4294967296;
	};
}

function eventTime(event, startedAt, random) {
	const explicit = event.scheduledAt || event.runAt || event.executeAt;
	if (explicit) return new Date(explicit).getTime();
	const jitter = Math.max(0, Number(event.jitterMs) || 0);
	const randomJitter = jitter ? Math.floor(random() * (jitter + 1)) : 0;
	return startedAt + Math.max(0, Number(event.delayMs) || 0) + randomJitter;
}

export function prepareScheduledEvents(events, randomSeed, startedAt = Date.now()) {
	const random = createSeededRandom(randomSeed);
	return (events || [])
		.filter(event => event && event.enabled !== false)
		.flatMap((event, index) => {
			const eventType = event.eventType || event.type;
			const baseKey = String(event.id || `${index}:${eventType}`);
			const runAt = eventTime(event, startedAt, random);
			const randomFactor = event.randomize ? 0.65 + random() * 0.7 : 1;
			const duration = Math.max(
				0,
				Math.round((Number(event.durationMs) || 0) * randomFactor),
			);
			const start = {
				...event,
				eventType,
				_schedulerKey: baseKey,
				_runAt: runAt,
			};
			const scheduled = [start];
			if (
				['typing', 'recording'].includes(eventType) &&
				!event.infinite &&
				duration > 0 &&
				event.payload?.active !== false
			) {
				scheduled.push({
					...event,
					id: `${baseKey}:stop`,
					eventType,
					payload: { ...(event.payload || {}), active: false },
					_schedulerKey: `${baseKey}:stop`,
					_runAt: runAt + duration,
				});
			}
			if (eventType === 'incoming_message' && event.payload?.typingBefore) {
				scheduled.unshift({
					...event,
					id: `${baseKey}:typing`,
					eventType: 'typing',
					payload: { active: true },
					_schedulerKey: `${baseKey}:typing`,
					_runAt: Math.max(startedAt, runAt - Math.max(1000, duration || 2000)),
				});
			}
			return scheduled;
		})
		.filter(event => Number.isFinite(event._runAt))
		.sort((a, b) => a._runAt - b._runAt || a._schedulerKey.localeCompare(b._schedulerKey));
}

export function createDemoEventScheduler({
	events,
	randomSeed,
	onEvent,
	now = () => Date.now(),
	setTimer = (callback, delay) => setTimeout(callback, delay),
	clearTimer = timer => clearTimeout(timer),
}) {
	let timer = null;
	let stopped = false;
	const completed = new Set();
	const queue = prepareScheduledEvents(events, randomSeed, now());

	const scheduleNext = () => {
		if (stopped) return;
		const next = queue.find(event => !completed.has(event._schedulerKey));
		if (!next) return;
		const delay = Math.max(0, next._runAt - now());
		timer = setTimer(() => {
			timer = null;
			if (stopped) return;
			completed.add(next._schedulerKey);
			onEvent(next);
			scheduleNext();
		}, delay);
	};

	scheduleNext();

	return {
		stop() {
			stopped = true;
			if (timer !== null) clearTimer(timer);
			timer = null;
		},
		getPendingCount() {
			return queue.length - completed.size;
		},
	};
}
