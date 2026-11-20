import test from 'node:test';
import assert from 'node:assert/strict';
import {
	applyWhiteBalance,
	averageRegion,
	deltaE2000,
	describeColor,
	exposureWarning,
	hexToLab,
	labToRgb,
	medianColor,
	nearestNamedColor,
	rgbToHex,
	whiteBalanceGains,
} from './color.js';
import { avoidCombos, scorePair, suggestOutfits } from './match.js';
import { hemAdvice, hemFromIndex, hemIndex, skinToneFromSample, topAdvice } from './advice.js';
import { outfitsFromWardrobe, shoppingCheck } from './wardrobe.js';
import { HEM_LENGTHS, HEM_TABLE, PALETTE, PANTS_FITS, SHOE_TYPES } from '../config/outfit-config.js';

const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

test('sRGB → Lab matches reference values and round-trips', () => {
	const white = hexToLab('#FFFFFF');
	assert.ok(near(white.L, 100, 0.01) && near(white.a, 0, 0.01) && near(white.b, 0, 0.01));
	const red = hexToLab('#FF0000');
	assert.ok(near(red.L, 53.24, 0.05) && near(red.a, 80.09, 0.1) && near(red.b, 67.2, 0.1));
	for (const hex of ['#1F2A44', '#D9C6A5', '#556B2F', '#B3242B']) {
		assert.equal(rgbToHex(labToRgb(hexToLab(hex))), hex);
	}
});

test('CIEDE2000 matches the Sharma et al. reference pairs', () => {
	// Pairs 1, 7 and 17 from Sharma, Wu & Dalal (2005), table 1.
	assert.ok(near(deltaE2000({ L: 50, a: 2.6772, b: -79.7751 }, { L: 50, a: 0, b: -82.7485 }), 2.0425, 1e-4));
	assert.ok(near(deltaE2000({ L: 50, a: 0, b: 0 }, { L: 50, a: -1, b: 2 }), 2.3669, 1e-4));
	assert.ok(near(deltaE2000({ L: 50, a: 2.5, b: 0 }, { L: 73, a: 25, b: -18 }), 27.1492, 1e-4));
	assert.equal(deltaE2000({ L: 40, a: 10, b: 10 }, { L: 40, a: 10, b: 10 }), 0);
});

test('snaps a colour to the nearest named clothing colour', () => {
	assert.equal(nearestNamedColor('#1E2B46').color.id, 'navy');
	assert.equal(nearestNamedColor('#DAC7A4').color.id, 'beige');
	assert.equal(nearestNamedColor('#57702F').color.id, 'olive');
	const d = describeColor('#1E2B46');
	assert.equal(d.family, 'cool');
	assert.equal(d.base, true);
	assert.equal(d.lightness, 'veryDark');
	assert.equal(PALETTE.length >= 60, true);
	for (const color of PALETTE) assert.ok(color.names.en && color.names.ar, `${color.id} has names`);
});

test('region average, median of taps, white reference and exposure warnings', () => {
	const w = 20;
	const h = 20;
	const data = new Uint8ClampedArray(w * h * 4);
	for (let i = 0; i < w * h; i += 1) data.set([100, 50, 200, 255], i * 4);
	data.set([255, 255, 255, 255], (10 * w + 10) * 4); // one hot pixel
	const avg = averageRegion(data, w, h, 10, 10, 9);
	assert.ok(near(avg.r, 100 + 155 / 81, 0.01));
	assert.deepEqual(medianColor([{ r: 10, g: 10, b: 10 }, { r: 200, g: 20, b: 20 }, { r: 20, g: 30, b: 15 }]), { r: 20, g: 20, b: 15 });
	const gains = whiteBalanceGains({ r: 240, g: 220, b: 180 });
	const corrected = applyWhiteBalance({ r: 240, g: 220, b: 180 }, gains);
	assert.ok(near(corrected.r, corrected.g, 0.5) && near(corrected.g, corrected.b, 0.5));
	assert.equal(whiteBalanceGains({ r: 20, g: 20, b: 20 }), null);
	assert.equal(exposureWarning({ r: 10, g: 12, b: 9, clippedShare: 0 }), 'dark');
	assert.equal(exposureWarning({ r: 250, g: 250, b: 250, clippedShare: 0.6 }), 'glare');
	assert.equal(exposureWarning({ r: 120, g: 100, b: 90, clippedShare: 0 }), null);
});

test('navy pants: neutral light tops win, brown shoes, belt matches shoes, socks match pants', () => {
	const outfits = suggestOutfits({ locks: { pants: '#1F2A44' }, occasion: 'casual', weather: 'mild', shoeType: 'loafers' });
	assert.ok(outfits.length >= 6 && outfits.length <= 8);
	assert.ok(outfits.every((o, i) => i === 0 || outfits[i - 1].score >= o.score), 'ranked');
	const tops = outfits.map(o => o.slots.shirt.id);
	assert.ok(tops.some(id => ['white', 'off-white', 'beige', 'light-grey', 'cream', 'ecru', 'stone', 'sky-blue', 'powder-blue'].includes(id)));
	assert.ok(!tops.includes('black'), 'navy + black is not suggested as a top');
	assert.ok(!tops.includes('midnight'), 'navy on navy (no depth gap) is not suggested');
	assert.ok(['white', 'off-white', 'cream', 'ecru', 'light-grey', 'beige', 'stone'].includes(tops[0]), `best top is a light neutral, got ${tops[0]}`);
	for (const o of outfits) {
		assert.ok(['brown', 'cognac', 'dark-brown', 'tan'].includes(o.slots.shoes.id), `brown shoes, got ${o.slots.shoes.id}`);
		assert.equal(o.slots.belt.id, o.slots.shoes.id);
		assert.equal(o.slots.socks.id, 'navy');
		assert.equal(o.slots.strap.id, o.slots.belt.id);
		assert.ok(o.score >= 30 && o.score <= 99);
	}
	assert.deepEqual(suggestOutfits({ locks: { pants: '#1F2A44' } }), suggestOutfits({ locks: { pants: '#1F2A44' } }), 'deterministic');
});

test('grey pants get black leather shoes for work; white sneakers when chosen', () => {
	const work = suggestOutfits({ locks: { pants: '#8E8E8E' }, occasion: 'work', shoeType: 'derby' });
	assert.ok(work.every(o => o.slots.shoes.id === 'black'));
	const casual = suggestOutfits({ locks: { pants: '#8E8E8E' }, occasion: 'casual', shoeType: 'whiteSneakers' });
	assert.ok(casual.every(o => o.slots.shoes.id === 'white'));
});

test('fashion rules: small lightness gap, loud clash, navy + black, disliked colours', () => {
	const navy = describeColor('#1F2A44');
	const black = describeColor('#111111');
	assert.ok(scorePair(black, navy).warnings.includes('navyBlack'));
	const red = describeColor('#B3242B');
	const royal = describeColor('#2A52BE');
	assert.ok(scorePair(red, royal).warnings.includes('loudClash'));
	const charcoal = describeColor('#36454F');
	assert.ok(scorePair(describeColor('#5A6E8C'), charcoal).warnings.includes('smallGap'));
	const withDislike = suggestOutfits({ locks: { pants: '#1F2A44' }, profile: { disliked: ['white'] } });
	assert.ok(!withDislike.some(o => o.slots.shirt.id === 'white'));
	const avoid = avoidCombos({ locks: { pants: '#1F2A44' } });
	assert.ok(avoid.length >= 2 && avoid.length <= 3);
	assert.ok(avoid.every(a => a.warning));
});

test('locking the top solves the pants; a locked clashing shoe is flagged', () => {
	const outfits = suggestOutfits({ locks: { shirt: '#F7F7F5' } });
	assert.ok(outfits.length >= 6);
	assert.ok(outfits.every(o => o.slots.shirt.id === 'white' && o.slots.pants));
	const clash = suggestOutfits({ locks: { pants: '#1F2A44', shoes: '#111111' }, shoeType: 'derby' });
	assert.ok(clash.every(o => o.warnings.includes('shoesClash')));
});

test('warm undertone lifts earthy tops near the face', () => {
	const pants = describeColor('#1F2A44');
	const rust = describeColor('#A0461F');
	assert.ok(scorePair(rust, pants, { profile: { undertone: 'warm' } }).score > scorePair(rust, pants, { profile: { undertone: 'cool' } }).score);
});

test('shirt vs t-shirt verdicts', () => {
	assert.equal(topAdvice({ pantsType: 'trousers', occasion: 'formal' }).verdict, 'shirt');
	assert.equal(topAdvice({ pantsType: 'trousers', occasion: 'formal' }).tuck, 'tuck');
	assert.equal(topAdvice({ pantsType: 'joggers', occasion: 'gym', weather: 'hot' }).verdict, 'tshirt');
	assert.equal(topAdvice({ pantsType: 'chinos', occasion: 'casual', weather: 'mild' }).verdict, 'either');
	assert.ok(topAdvice({ pantsType: 'jeans' }).alternatives.length >= 2);
});

test('hem table covers every shoe × fit, and the advice follows it', () => {
	for (const shoe of SHOE_TYPES) {
		for (const fit of PANTS_FITS) {
			const cell = HEM_TABLE[shoe][fit];
			assert.ok(cell && HEM_LENGTHS.includes(cell.best), `${shoe} × ${fit}`);
			assert.ok(!cell.avoid.includes(cell.best));
		}
	}
	assert.equal(hemAdvice({ shoeType: 'whiteSneakers', fit: 'slim' }).best, 'none');
	assert.equal(hemAdvice({ shoeType: 'chunkySneakers', fit: 'wide' }).best, 'slight');
	assert.equal(hemAdvice({ shoeType: 'chunkySneakers', fit: 'slim', hem: 'cropped' }).status, 'avoid');
	assert.ok(hemAdvice({ shoeType: 'chunkySneakers', fit: 'slim', hem: 'cropped' }).never.includes('tightCroppedChunky'));
	assert.ok(hemAdvice({ shoeType: 'derby', fit: 'slim', hem: 'full' }).never.includes('dragging'));
	assert.equal(hemFromIndex(hemIndex('cropped')), 'cropped');
});

test('skin tone from a selfie sample', () => {
	assert.equal(skinToneFromSample({ r: 241, g: 214, b: 196 }).tone, 'fair');
	assert.equal(skinToneFromSample({ r: 92, g: 60, b: 42 }).tone, 'dark');
	assert.equal(skinToneFromSample({ r: 198, g: 152, b: 110 }).undertone, 'warm');
});

test('wardrobe: outfits only from saved pieces, and shopping mode', () => {
	const pieces = [
		{ id: 'p1', category: 'pants', hex: '#1F2A44', formality: 2, seasons: ['mild'] },
		{ id: 'p2', category: 'pants', hex: '#D9C6A5', formality: 2, seasons: ['mild', 'hot'] },
		{ id: 't1', category: 'shirt', hex: '#F7F7F5', formality: 2, seasons: ['mild', 'hot'] },
		{ id: 't2', category: 'tshirt', hex: '#556B2F', formality: 1, seasons: ['mild'] },
		{ id: 's1', category: 'shoes', hex: '#6B4423', formality: 2, seasons: ['mild'] },
	];
	const today = outfitsFromWardrobe(pieces, { occasion: 'casual', weather: 'mild' });
	assert.ok(today.length >= 1 && today.length <= 3);
	assert.ok(today.every(o => pieces.includes(o.pieces.pants) && pieces.includes(o.pieces.top)));
	const shop = shoppingCheck({ category: 'shirt', hex: '#F5F5F3' }, pieces, { occasion: 'casual' });
	assert.equal(shop.duplicates.length, 1, 'a white shirt is already owned');
	assert.ok(shop.matches >= 1);
	assert.ok(shop.outfits.length >= 1);
});
