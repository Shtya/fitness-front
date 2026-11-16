import test from 'node:test';
import assert from 'node:assert/strict';
import { getVoiceSpeed, nextVoiceSpeed, setVoiceSpeed } from './workspace/wa-voice-speed.js';

test('voice speed starts at 1x and cycles 1 → 1.5 → 2 → 1', () => {
	assert.equal(getVoiceSpeed(), 1);
	assert.equal(nextVoiceSpeed(1), 1.5);
	assert.equal(nextVoiceSpeed(1.5), 2);
	assert.equal(nextVoiceSpeed(2), 1);
});

test('the speed picked on one voice note is what the next one reads', () => {
	setVoiceSpeed(1.5);
	assert.equal(getVoiceSpeed(), 1.5);
	setVoiceSpeed(3); // not an offered speed: back to 1x
	assert.equal(getVoiceSpeed(), 1);
});
