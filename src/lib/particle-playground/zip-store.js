/**
 * Minimal ZIP (store / no compression) for browser downloads.
 * Enough for shipping a small animation package.
 */

function crc32(buf) {
	let c = ~0;
	for (let i = 0; i < buf.length; i++) {
		c ^= buf[i];
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
		}
	}
	return ~c >>> 0;
}

function u16(n) {
	const b = new Uint8Array(2);
	new DataView(b.buffer).setUint16(0, n, true);
	return b;
}

function u32(n) {
	const b = new Uint8Array(4);
	new DataView(b.buffer).setUint32(0, n >>> 0, true);
	return b;
}

function concat(chunks) {
	const total = chunks.reduce((n, c) => n + c.length, 0);
	const out = new Uint8Array(total);
	let o = 0;
	for (const c of chunks) {
		out.set(c, o);
		o += c.length;
	}
	return out;
}

function encodeUtf8(str) {
	return new TextEncoder().encode(str);
}

/**
 * @param {{ name: string, content: string | Uint8Array | ArrayBuffer }[]} files
 * @returns {Blob}
 */
export function buildStoreZip(files) {
	const localParts = [];
	const centralParts = [];
	let offset = 0;

	for (const file of files) {
		const nameBytes = encodeUtf8(file.name.replace(/\\/g, '/'));
		const data = toBytes(file.content);
		const crc = crc32(data);
		const size = data.length;

		const local = concat([
			u32(0x04034b50),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(size),
			u32(size),
			u16(nameBytes.length),
			u16(0),
			nameBytes,
			data,
		]);

		const central = concat([
			u32(0x02014b50),
			u16(20),
			u16(20),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(crc),
			u32(size),
			u32(size),
			u16(nameBytes.length),
			u16(0),
			u16(0),
			u16(0),
			u16(0),
			u32(0),
			u32(offset),
			nameBytes,
		]);

		localParts.push(local);
		centralParts.push(central);
		offset += local.length;
	}

	const localBlob = concat(localParts);
	const centralBlob = concat(centralParts);
	const end = concat([
		u32(0x06054b50),
		u16(0),
		u16(0),
		u16(files.length),
		u16(files.length),
		u32(centralBlob.length),
		u32(localBlob.length),
		u16(0),
	]);

	return new Blob([concat([localBlob, centralBlob, end])], {
		type: 'application/zip',
	});
}

function toBytes(content) {
	if (content instanceof Uint8Array) return content;
	if (content instanceof ArrayBuffer) return new Uint8Array(content);
	return encodeUtf8(content == null ? '' : String(content));
}
