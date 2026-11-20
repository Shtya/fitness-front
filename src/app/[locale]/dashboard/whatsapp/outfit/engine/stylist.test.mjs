import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFeedback, buildOutfits, goesBestWith, outfitItemList, scoreOwnedOutfit, versatility } from './stylist.js';
import { costPerWear, findDuplicates, gapAnalysis, markWashed, markWorn, overDuplicated, tripCapsule, wardrobeStats, weekPlan } from './planner.js';
import { dHash, dominantColors, hammingHex, reconcileColor } from './pixels.js';
import { normalizeAnalysis, normalizeChat, AnalyzeRequest } from './schemas.js';

const item = (id, category, subcategory, hex, extra = {}) => ({ id, category, subcategory, colors: { primary: { hex } }, pattern: 'solid', fit: 'regular', seasons: [], status: 'clean', ...extra });

const wardrobe = [
	item('t-white', 'top', 'oxford', '#F7F7F5', { formality: 3 }),
	item('t-sky', 'top', 'oxford', '#9EC5E6', { formality: 3 }),
	item('t-black-tee', 'top', 'tshirt', '#151515', { formality: 1 }),
	item('t-olive-tee', 'top', 'tshirt', '#556B2F', { formality: 1, fit: 'oversized' }),
	item('b-navy-chino', 'bottom', 'chinos', '#1F2A44', { fit: 'slim' }),
	item('b-beige-chino', 'bottom', 'chinos', '#D9C6A5', { fit: 'slim' }),
	item('b-jeans', 'bottom', 'jeans', '#2F4A6D', { fit: 'slim' }),
	item('b-cargo', 'bottom', 'cargo', '#556B2F', { fit: 'relaxed' }),
	item('s-white-sneak', 'shoes', 'sneakers', '#F5F5F5'),
	item('s-brown-loafer', 'shoes', 'loafers', '#6B4423'),
	item('s-black-derby', 'shoes', 'derby', '#141414'),
	item('o-navy-jacket', 'outerwear', 'jacket', '#1F2A44', { seasons: ['mild', 'cold'] }),
	item('belt-brown', 'belt', 'belt', '#6B4423'),
	item('belt-black', 'belt', 'belt', '#151515'),
];

test('builds complete outfits only from owned, clean items, ranked and deterministic', () => {
	const outfits = buildOutfits(wardrobe, { occasion: 'casual', weather: 'mild' });
	assert.ok(outfits.length >= 5);
	const ids = new Set(wardrobe.map(i => i.id));
	for (const outfit of outfits) {
		for (const piece of outfitItemList(outfit)) assert.ok(ids.has(piece.id));
		assert.ok(outfit.items.top && outfit.items.bottom && outfit.items.shoes);
		assert.ok(outfit.why.length >= 1, 'every outfit explains why');
	}
	assert.ok(outfits.every((o, i) => i === 0 || outfits[i - 1].score >= o.score));
	assert.deepEqual(buildOutfits(wardrobe, { occasion: 'casual' }).map(o => o.id), buildOutfits(wardrobe, { occasion: 'casual' }).map(o => o.id));
	const dirty = wardrobe.map(i => (i.id === 't-white' ? { ...i, status: 'laundry' } : i));
	assert.ok(!buildOutfits(dirty, {}).some(o => o.items.top.id === 't-white'), 'laundry items are not suggested');
});

test('formal occasion prefers leather shoes; belt follows the shoes', () => {
	const [best] = buildOutfits(wardrobe, { occasion: 'formal', weather: 'mild' });
	assert.ok(['s-brown-loafer', 's-black-derby'].includes(best.items.shoes.id), best.items.shoes.id);
	if (best.items.belt) assert.equal(best.items.belt.id, best.items.shoes.id === 's-black-derby' ? 'belt-black' : 'belt-brown');
	const sneakersFormal = scoreOwnedOutfit({ top: wardrobe[0], bottom: wardrobe[4], shoes: wardrobe[8] }, { occasion: 'formal' });
	assert.ok(sneakersFormal.watchOut.some(w => w.key === 'stylist.watch.sneakersFormal'));
});

test('anchors: "match this" keeps the chosen pieces in every outfit', () => {
	const cargo = wardrobe.find(i => i.id === 'b-cargo');
	const outfits = buildOutfits(wardrobe, { occasion: 'casual' }, { anchors: [cargo] });
	assert.ok(outfits.length >= 2);
	assert.ok(outfits.every(o => o.items.bottom.id === 'b-cargo'));
	const loose = scoreOwnedOutfit({ top: wardrobe[3], bottom: cargo, shoes: wardrobe[8] }, { occasion: 'casual' });
	assert.ok(loose.watchOut.some(w => w.key === 'stylist.watch.bothLoose'), 'oversized top + relaxed cargo is flagged');
});

test('two bold patterns are penalised; cold weather wants a layer', () => {
	const checks = { ...wardrobe[0], id: 'checks', pattern: 'checks' };
	const print = { ...wardrobe[4], id: 'print', pattern: 'print' };
	const clash = scoreOwnedOutfit({ top: checks, bottom: print }, {});
	const calm = scoreOwnedOutfit({ top: checks, bottom: wardrobe[4] }, {});
	assert.ok(clash.score < calm.score);
	const [cold] = buildOutfits(wardrobe, { occasion: 'casual', weather: 'cold' });
	assert.ok(cold.items.outerwear, 'cold outfit includes the jacket');
});

test('goes best with, versatility, feedback', () => {
	const best = goesBestWith(wardrobe[4], wardrobe, {});
	assert.ok(best.length >= 3 && best.length <= 6);
	assert.ok(best.every(entry => entry.item.id !== 'b-navy-chino'));
	const counts = versatility(wardrobe, {});
	assert.ok(counts.get('t-white') > 0);
	const outfit = buildOutfits(wardrobe, {})[0];
	const fb = applyFeedback({}, outfit, false);
	const before = scoreOwnedOutfit(outfit.items, {}).score;
	const after = scoreOwnedOutfit(outfit.items, { feedback: fb }).score;
	assert.ok(after < before, '👎 lowers the same outfit');
});

test('week plan never repeats a top or bottom; trip capsule; gaps; duplicates', () => {
	const plan = weekPlan(wardrobe, { occasion: 'casual' }, { days: 4, start: Date.UTC(2026, 10, 20) });
	assert.equal(plan.length, 4);
	const used = plan.filter(d => d.outfit).flatMap(d => [d.outfit.items.top?.id, d.outfit.items.bottom?.id]);
	assert.equal(new Set(used).size, used.length);
	assert.equal(plan[0].date, '2026-11-20');
	const capsule = tripCapsule(wardrobe, { weather: 'mild' }, { days: 3, occasions: ['casual', 'work'] });
	assert.ok(capsule.pieces.length >= 3 && capsule.pieces.length < wardrobe.length);
	assert.ok(capsule.outfits.length >= 3);
	const gaps = gapAnalysis(wardrobe, { occasion: 'casual' });
	assert.ok(gaps.length >= 1 && gaps.length <= 3);
	assert.ok(!gaps.some(g => g.subcategory === 'oxford' && g.color === 'white'), 'does not suggest what you own');
	const dupes = findDuplicates(item('new', 'top', 'oxford', '#F5F5F3'), wardrobe);
	assert.deepEqual(dupes.map(d => d.id), ['t-white']);
	assert.equal(overDuplicated([...wardrobe, item('w2', 'top', 'oxford', '#F4F4F2'), item('w3', 'top', 'oxford', '#F6F6F4')]).length, 1);
});

test('laundry: a top goes to laundry after 1 wear; pants after 3; washing resets', () => {
	let tee = markWorn(wardrobe[2], Date.UTC(2026, 10, 20));
	assert.equal(tee.status, 'laundry');
	assert.equal(tee.lastWorn, '2026-11-20');
	tee = markWashed(tee);
	assert.equal(tee.status, 'clean');
	let pants = wardrobe[4];
	pants = markWorn(markWorn(pants));
	assert.equal(pants.status, 'clean');
	pants = markWorn(pants);
	assert.equal(pants.status, 'laundry');
	assert.equal(pants.timesWorn, 3);
	assert.equal(costPerWear({ price: 900, timesWorn: 3 }), 300);
	const stats = wardrobeStats(wardrobe);
	assert.equal(stats.total, wardrobe.length);
	assert.equal(stats.byCategory.top, 4);
});

test('pixels: k-means finds the garment colour over a white background; dHash', () => {
	const w = 60;
	const h = 60;
	const data = new Uint8ClampedArray(w * h * 4);
	for (let y = 0; y < h; y += 1) {
		for (let x = 0; x < w; x += 1) {
			const garment = x > 12 && x < 48 && y > 8 && y < 52;
			data.set(garment ? [31, 42, 68, 255] : [245, 245, 243, 255], (y * w + x) * 4);
		}
	}
	const [first] = dominantColors(data, w, h);
	assert.equal(first.hex, '#1F2A44');
	assert.ok(first.share > 0.9);
	assert.equal(reconcileColor('#B03030', '#1F2A44').source, 'pixels');
	assert.equal(reconcileColor('#1E2B45', '#1F2A44').source, 'ai');
	const gray = Array.from({ length: 72 }, (_, i) => (i * 37) % 255);
	const hash = dHash(gray);
	assert.equal(hash.length, 16);
	assert.equal(hammingHex(hash, hash), 0);
});

test('zod: analysis is normalised; chat drops invented item ids', () => {
	const analysis = normalizeAnalysis({
		isClothing: true,
		category: 'top',
		categoryConfidence: 1.4,
		subcategory: 'jeans',
		subcategoryConfidence: 0.9,
		primaryHex: '2f4a6d',
		primaryConfidence: 0.8,
		secondaryHex: ['#2F4A6D', '#ffffff', 'nope', '#000'],
		pattern: 'solid',
		patternConfidence: 0.9,
		fabric: 'denim',
		fabricConfidence: 0.9,
		fit: 'slim',
		fitConfidence: 0.4,
		sleeveLength: 'na',
		pantsLength: 'full',
		formality: 7,
		formalityConfidence: 0.7,
		seasons: ['mild', 'mild', 'cold'],
		seasonsConfidence: 0.6,
		styleTags: ['classic'],
		details: ['<b>five pockets</b>'],
	});
	assert.equal(analysis.category, 'bottom', 'sub-category wins');
	assert.equal(analysis.primaryHex, '#2F4A6D');
	assert.deepEqual(analysis.secondaryHex, ['#FFFFFF', '#000000']);
	assert.equal(analysis.formality, 5);
	assert.equal(analysis.confidence.category, 1);
	assert.deepEqual(analysis.seasons, ['mild', 'cold']);
	assert.ok(!analysis.details[0].includes('<'));
	assert.throws(() => normalizeAnalysis({ category: 'spaceship' }));
	const chat = normalizeChat({ answer: 'Try these', outfits: [{ title: 'A', itemIds: ['t-white', 'fake-1'], reason: 'r' }, { title: 'B', itemIds: ['ghost'], reason: 'x' }], tips: [] }, wardrobe.map(i => i.id));
	assert.equal(chat.outfits.length, 1);
	assert.deepEqual(chat.outfits[0].itemIds, ['t-white']);
	assert.equal(chat.dropped, 2);
	assert.equal(AnalyzeRequest.safeParse({ image: 'x', mediaType: 'image/gif' }).success, false);
});
