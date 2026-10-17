import assert from 'node:assert/strict';
import {
	loadCustomDuas,
	loadFavorites,
	loadProgress,
	saveCustomDuas,
	saveFavorites,
	saveProgress,
} from './adhkar-storage.js';

const mem = new Map();
globalThis.window = {
	localStorage: {
		getItem: key => (mem.has(key) ? mem.get(key) : null),
		setItem: (key, value) => mem.set(key, String(value)),
		removeItem: key => mem.delete(key),
	},
};

const userId = 'test-user';
saveCustomDuas(userId, [{ id: 'c1', text: 'رب اغفر لي', count: 1 }]);
assert.equal(loadCustomDuas(userId).length, 1);
assert.equal(loadCustomDuas(userId)[0].text, 'رب اغفر لي');

saveProgress(userId, { 'm-kursi': 1 });
assert.equal(loadProgress(userId)['m-kursi'], 1);

const fav = new Set(['m-kursi']);
saveFavorites(userId, fav);
assert.equal(loadFavorites(userId).has('m-kursi'), true);

console.log('adhkar-storage.spec: ok');
