/**
 * Download the animation package as one flat folder.
 * Browsers ship folders via zip — unzip gives:
 *
 * particle-animation/
 *   INSTALL.md
 *   ParticleObject.jsx
 *   MyParticleHero.jsx
 *   particle-scene.json
 */

import { buildStoreZip } from './zip-store';

export const PACKAGE_FOLDER_NAME = 'particle-animation';

function basename(path) {
	const parts = String(path).replace(/\\/g, '/').split('/');
	return parts[parts.length - 1] || 'file.txt';
}

/**
 * Put every file directly under one root folder (no nested dirs).
 * @param {{ name: string, content: string }[]} files
 * @param {string} [folderName]
 */
export function nestFilesInFolder(files, folderName = PACKAGE_FOLDER_NAME) {
	const root = String(folderName || PACKAGE_FOLDER_NAME).replace(/\/+$/, '');
	return files.map((file) => ({
		name: `${root}/${basename(file.name)}`,
		content: file.content,
	}));
}

/**
 * @param {{ name: string, content: string }[]} files
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
