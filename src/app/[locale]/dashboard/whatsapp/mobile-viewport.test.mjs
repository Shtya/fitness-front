import test from 'node:test';
import assert from 'node:assert/strict';
import { isEditableElement, measureKeyboard, KEYBOARD_MIN_PX } from './mobile-viewport.js';

test('measureKeyboard reports a closed keyboard when the visible area matches the layout', () => {
	assert.deepEqual(measureKeyboard({ layoutHeight: 844, viewportHeight: 844 }), {
		open: false,
		inset: 0,
		visibleHeight: 844,
	});
});

test('measureKeyboard ignores small changes such as the Safari toolbar collapsing', () => {
	const result = measureKeyboard({ layoutHeight: 844, viewportHeight: 844 - 80 });
	assert.equal(result.open, false);
	assert.equal(result.inset, 80);
});

test('measureKeyboard detects an iPhone keyboard and returns the visible height', () => {
	const result = measureKeyboard({ layoutHeight: 844, viewportHeight: 508 });
	assert.equal(result.open, true);
	assert.equal(result.inset, 336);
	assert.equal(result.visibleHeight, 508);
});

test('measureKeyboard subtracts the panned offset so a scrolled page is not double counted', () => {
	const result = measureKeyboard({ layoutHeight: 844, viewportHeight: 508, offsetTop: 300 });
	assert.equal(result.inset, 36);
	assert.equal(result.open, false);
});

test('measureKeyboard treats the threshold as open and handles bad input', () => {
	assert.equal(measureKeyboard({ layoutHeight: 800, viewportHeight: 800 - KEYBOARD_MIN_PX }).open, true);
	assert.equal(measureKeyboard({ layoutHeight: undefined, viewportHeight: NaN }).open, false);
});

test('isEditableElement only accepts fields that raise a keyboard', () => {
	assert.equal(isEditableElement({ tagName: 'TEXTAREA' }), true);
	assert.equal(isEditableElement({ tagName: 'INPUT', type: 'search' }), true);
	assert.equal(isEditableElement({ tagName: 'INPUT', type: 'checkbox' }), false);
	assert.equal(isEditableElement({ tagName: 'INPUT', type: 'text', readOnly: true }), false);
	assert.equal(isEditableElement({ tagName: 'DIV', isContentEditable: true }), true);
	assert.equal(isEditableElement({ tagName: 'BUTTON' }), false);
	assert.equal(isEditableElement(null), false);
});
