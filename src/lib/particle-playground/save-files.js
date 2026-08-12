/**
 * Download the animation package as one folder (via zip).
 *
 * particle-animation/          — static Studio hero
 * particle-scroll-morph/       — scroll dissolve/reassemble package
 */

import { buildStoreZip } from './zip-store';

export const PACKAGE_FOLDER_NAME = 'particle-animation';
export { SCROLL_MORPH_FOLDER_NAME } from './scroll-morph-export';

/**
 * Put every file under one root folder. Preserves nested paths (assets/...).
 * @param {{ name: string, content: string | Uint8Array }[]} files
 * @param {string} [folderName]
 */
export function nestFilesInFolder(files, folderName = PACKAGE_FOLDER_NAME) {
	const root = String(folderName || PACKAGE_FOLDER_NAME).replace(/\/+$/, '');
	return files.map((file) => {
		const rel = String(file.name || 'file.txt')
			.replace(/\\/g, '/')
			.replace(/^\/+/, '');
		return {
			name: `${root}/${rel}`,
			content: file.content,
		};
	});
}

/**
 * @param {{ name: string, content: string | Uint8Array }[]} files
 */
export function downloadPackageFolder(files, folderName = PACKAGE_FOLDER_NAME) {
	if (!files?.length) throw new Error('No files to download');
	const nested = nestFilesInFolder(files, folderName);
	const zip = buildStoreZip(nested);
	const url = URL.createObjectURL(zip);
	const a = document.createElement('a');
	a.href = url;
	a.download = `${folderName}.zip`;
	a.click();
	URL.revokeObjectURL(url);
}
