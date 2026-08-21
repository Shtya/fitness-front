const EXT_MIME = {
	'.pdf': 'application/pdf',
	'.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'.doc': 'application/msword',
	'.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'.xls': 'application/vnd.ms-excel',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.zip': 'application/zip',
	'.txt': 'text/plain',
	'.csv': 'text/csv',
	'.json': 'application/json',
	'.md': 'text/markdown',
	'.markdown': 'text/markdown',
};

export function extensionOf(filename = '') {
	const match = String(filename).toLowerCase().match(/(\.[a-z0-9]+)$/);
	return match ? match[1] : '';
}

export function mimeFromFilename(filename = '') {
	return EXT_MIME[extensionOf(filename)] || 'application/octet-stream';
}

export function resolveMimeType(mimeType, filename) {
	if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
	return mimeFromFilename(filename);
}

export function isZipBuffer(buffer) {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export function isOleBuffer(buffer) {
	const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
	return (
		bytes.length >= 8 &&
		bytes[0] === 0xd0 &&
		bytes[1] === 0xcf &&
		bytes[2] === 0x11 &&
		bytes[3] === 0xe0
	);
}

export function detectPreviewKind(mimeType, filename = '') {
	const mime = resolveMimeType(mimeType, filename).toLowerCase();
	const ext = extensionOf(filename);

	if (mime.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
		return 'image';
	}
	if (mime === 'application/pdf' || ext === '.pdf') return 'pdf';
	if (
		mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
		mime === 'application/msword' ||
		ext === '.docx' ||
		ext === '.doc'
	) {
		return 'docx';
	}
	if (
		mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
		mime === 'application/vnd.ms-excel' ||
		['.xlsx', '.xls', '.csv'].includes(ext) ||
		mime === 'text/csv'
	) {
		return 'xlsx';
	}
	if (mime === 'text/markdown' || ['.md', '.markdown'].includes(ext)) {
		return 'markdown';
	}
	if (mime.startsWith('text/') || mime === 'application/json' || ['.txt', '.json', '.log'].includes(ext)) {
		return 'text';
	}
	if (mime === 'application/zip' || ext === '.zip') return 'zip';
	return 'unsupported';
}
