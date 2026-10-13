import test from 'node:test';
import assert from 'node:assert/strict';
import {
	extensionForMimeType,
	fallbackMediaBaseName,
	isAppleMobileDevice,
	isStandaloneDisplay,
	mediaFileName,
	saveFilesToDevice,
	shouldSaveViaShareSheet,
	toMediaFile,
} from './wa-save-file.js';

const IPHONE_UA =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
	'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36';
const MAC_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';

function fakeDom() {
	const appended = [];
	const revoked = [];
	const created = [];
	const doc = {
		body: {
			appendChild(node) {
				appended.push(node);
				node.parentNode = this;
			},
		},
		createElement(tag) {
			const node = {
				tag,
				style: {},
				clicked: 0,
				removed: false,
				click() {
					this.clicked += 1;
					this.clickedWhileAttached = Boolean(this.parentNode);
				},
				remove() {
					this.removed = true;
					this.parentNode = null;
				},
			};
			return node;
		},
	};
	const url = {
		createObjectURL(file) {
			const href = `blob:test/${created.length}`;
			created.push({ href, file });
			return href;
		},
		revokeObjectURL(href) {
			revoked.push(href);
		},
	};
	return { doc, url, appended, revoked, created };
}

function iphoneNav({ share, canShare = () => true } = {}) {
	return { userAgent: IPHONE_UA, platform: 'iPhone', maxTouchPoints: 5, share, canShare };
}

test('file names keep the original name and gain the extension iOS needs', () => {
	assert.equal(mediaFileName('report.pdf', 'application/pdf'), 'report.pdf');
	assert.equal(mediaFileName('photo', 'image/jpeg'), 'photo.jpg');
	assert.equal(mediaFileName('clip.MOV', 'video/quicktime'), 'clip.MOV');
	assert.equal(mediaFileName('عقد الإيجار.docx', ''), 'عقد الإيجار.docx');
	assert.equal(mediaFileName('../../etc/passwd', 'text/plain'), 'passwd.txt');
	assert.equal(mediaFileName('a:b*c?.png', 'image/png'), 'a_b_c_.png');
	assert.equal(mediaFileName('...hidden', 'text/plain'), 'hidden.txt');
	assert.equal(mediaFileName('archive.tar.gz', 'application/gzip'), 'archive.tar.gz');
});

test('unnamed media get WhatsApp-style names with the right extension', () => {
	const sentAt = new Date(2026, 9, 13, 9, 49, 12);
	assert.equal(fallbackMediaBaseName('image', sentAt), 'WhatsApp Image 2026-10-13 at 09.49.12');
	assert.equal(
		mediaFileName('', 'image/jpeg', { kind: 'image', sentAt }),
		'WhatsApp Image 2026-10-13 at 09.49.12.jpg',
	);
	assert.equal(mediaFileName('', 'video/mp4', { kind: 'video' }), 'WhatsApp Video.mp4');
	assert.equal(mediaFileName(null, 'audio/ogg; codecs=opus', { kind: 'ptt' }), 'WhatsApp Audio.ogg');
	assert.equal(mediaFileName('', '', { kind: 'document' }), 'WhatsApp Document');
	assert.equal(fallbackMediaBaseName('image', 'not a date'), 'WhatsApp Image');
});

test('long names are capped without losing the extension', () => {
	const name = mediaFileName(`${'x'.repeat(300)}.pdf`, 'application/pdf');
	assert.ok(name.length <= 120);
	assert.ok(name.endsWith('.pdf'));
});

test('extension lookup ignores mime parameters and case', () => {
	assert.equal(extensionForMimeType('Audio/OGG; codecs=opus'), 'ogg');
	assert.equal(extensionForMimeType('application/x-unknown'), '');
});

test('toMediaFile keeps the original bytes and the real type', async () => {
	const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
	const blob = new Blob([bytes], { type: 'image/jpeg' });
	const file = toMediaFile(blob, { fileName: '', mimeType: 'image/png', kind: 'image' });
	assert.equal(file.type, 'image/jpeg');
	assert.equal(file.name, 'WhatsApp Image.jpg');
	assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);

	const untyped = new Blob([bytes], { type: 'application/octet-stream' });
	const typed = toMediaFile(untyped, { fileName: 'scan', mimeType: 'application/pdf' });
	assert.equal(typed.type, 'application/pdf');
	assert.equal(typed.name, 'scan.pdf');
	assert.equal(typed.size, bytes.length);
});

test('Apple mobile detection covers iPhone and iPadOS desktop mode only', () => {
	assert.equal(isAppleMobileDevice({ userAgent: IPHONE_UA }), true);
	assert.equal(
		isAppleMobileDevice({ userAgent: MAC_UA, platform: 'MacIntel', maxTouchPoints: 5 }),
		true,
	);
	assert.equal(
		isAppleMobileDevice({ userAgent: MAC_UA, platform: 'MacIntel', maxTouchPoints: 0 }),
		false,
	);
	assert.equal(isAppleMobileDevice({ userAgent: ANDROID_UA, platform: 'Linux' }), false);
	assert.equal(isAppleMobileDevice(null), false);
});

test('standalone detection covers iOS home-screen apps and display-mode', () => {
	assert.equal(isStandaloneDisplay({ navigator: { standalone: true } }), true);
	assert.equal(
		isStandaloneDisplay({ navigator: {}, matchMedia: () => ({ matches: true }) }),
		true,
	);
	assert.equal(
		isStandaloneDisplay({ navigator: {}, matchMedia: () => ({ matches: false }) }),
		false,
	);
	assert.equal(isStandaloneDisplay(null), false);
});

test('iPhone saves through the Share Sheet with real File objects', async () => {
	const dom = fakeDom();
	const shared = [];
	const nav = iphoneNav({
		share: async data => {
			shared.push(data);
		},
	});
	const file = new File([new Uint8Array([1, 2, 3])], 'a.jpg', { type: 'image/jpeg' });
	const result = await saveFilesToDevice([file], { nav, ...dom });
	assert.deepEqual(result, { status: 'shared' });
	assert.equal(shared.length, 1);
	assert.equal(shared[0].files[0], file);
	assert.equal(dom.appended.length, 0);
});

test('the Share Sheet opens inside the same tap, before any await', () => {
	const dom = fakeDom();
	let sharedSynchronously = false;
	const nav = iphoneNav({
		share: () => {
			sharedSynchronously = true;
			return Promise.resolve();
		},
	});
	const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
	const pending = saveFilesToDevice([file], { nav, ...dom });
	assert.equal(sharedSynchronously, true);
	return pending;
});

test('closing the Share Sheet is a cancel, not a failure or a download', async () => {
	const dom = fakeDom();
	const nav = iphoneNav({
		share: async () => {
			throw Object.assign(new Error('cancel'), { name: 'AbortError' });
		},
	});
	const result = await saveFilesToDevice([new File(['x'], 'a.png')], { nav, ...dom });
	assert.deepEqual(result, { status: 'cancelled' });
	assert.equal(dom.appended.length, 0);
});

test('an expired tap activation asks for a fresh tap instead of failing silently', async () => {
	const dom = fakeDom();
	const nav = iphoneNav({
		share: async () => {
			throw Object.assign(new Error('gesture'), { name: 'NotAllowedError' });
		},
	});
	const result = await saveFilesToDevice([new File(['x'], 'a.mp4')], { nav, ...dom });
	assert.deepEqual(result, { status: 'needs-gesture' });
	assert.equal(dom.appended.length, 0);
});

test('other Share Sheet errors fall back to a normal download', async () => {
	const dom = fakeDom();
	const nav = iphoneNav({
		share: async () => {
			throw Object.assign(new Error('bad'), { name: 'DataError' });
		},
	});
	const result = await saveFilesToDevice([new File(['x'], 'a.zip')], { nav, ...dom });
	assert.deepEqual(result, { status: 'downloaded' });
	assert.equal(dom.appended.length, 1);
});

test('iPhone without file sharing support falls back to a download', async () => {
	const dom = fakeDom();
	const nav = iphoneNav({ share: async () => {}, canShare: () => false });
	const result = await saveFilesToDevice([new File(['x'], 'a.bin')], { nav, ...dom });
	assert.deepEqual(result, { status: 'downloaded' });
});

test('desktop and Android download with an attached anchor and a delayed revoke', async () => {
	const dom = fakeDom();
	let shareCalls = 0;
	const nav = {
		userAgent: ANDROID_UA,
		platform: 'Linux',
		share: async () => {
			shareCalls += 1;
		},
		canShare: () => true,
	};
	const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
	const result = await saveFilesToDevice([file], { nav, ...dom });
	assert.deepEqual(result, { status: 'downloaded' });
	assert.equal(shareCalls, 0);
	const anchor = dom.appended[0];
	assert.equal(anchor.download, 'notes.txt');
	assert.equal(anchor.clicked, 1);
	assert.equal(anchor.clickedWhileAttached, true);
	assert.equal(anchor.removed, true);
	assert.equal(dom.created[0].file, file);
	assert.deepEqual(dom.revoked, [], 'blob URL must outlive the click');
});

test('share sheet routing needs both an Apple device and file sharing support', () => {
	const files = [new File(['x'], 'a.jpg')];
	assert.equal(shouldSaveViaShareSheet(iphoneNav({ share: () => {} }), files), true);
	assert.equal(shouldSaveViaShareSheet({ userAgent: IPHONE_UA }, files), false);
	assert.equal(
		shouldSaveViaShareSheet(
			iphoneNav({
				share: () => {},
				canShare: () => {
					throw new TypeError('bad');
				},
			}),
			files,
		),
		false,
	);
});

test('saving nothing is rejected', async () => {
	await assert.rejects(saveFilesToDevice([], { nav: {}, ...fakeDom() }));
});
