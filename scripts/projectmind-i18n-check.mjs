#!/usr/bin/env node
/**
 * ProjectMind i18n check: every t('key') used by the module must exist in BOTH en and ar,
 * and the `projectmind` namespace must have identical key sets in both languages.
 *   node scripts/projectmind-i18n-check.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const msgs = {
	en: JSON.parse(fs.readFileSync(path.join(root, 'messages/en.json'), 'utf8')),
	ar: JSON.parse(fs.readFileSync(path.join(root, 'messages/ar.json'), 'utf8')),
};

const get = (obj, p) => p.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
const leaves = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? leaves(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

function walk(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const p = path.join(dir, e.name);
		return e.isDirectory() ? walk(p) : /\.(jsx?|mjs)$/.test(e.name) ? [p] : [];
	});
}

const files = [...walk(path.join(root, 'src/components/projectmind')), ...walk(path.join(root, 'src/app/[locale]/dashboard/projectmind'))];
const problems = [];
let checked = 0;

function checkChunk(src, file) {
	const bind = new Map(); // variable → namespace (within one component function)
	for (const m of src.matchAll(/const\s+(\w+)\s*=\s*useTranslations\(\s*'([^']*)'\s*\)/g)) bind.set(m[1], m[2]);
	for (const [v, ns] of bind) {
		for (const m of src.matchAll(new RegExp(`(?<![\\w.])${v}\\(\\s*'([^']+)'`, 'g'))) {
			checked++;
			const full = `${ns}.${m[1]}`;
			for (const lang of ['en', 'ar']) if (typeof get(msgs[lang], full) !== 'string') problems.push(`${path.relative(root, file)}: missing ${lang} key "${full}"`);
		}
		for (const m of src.matchAll(new RegExp(`(?<![\\w.])${v}\\(\\s*\`([^\`$]*)\\$\\{`, 'g'))) {
			checked++;
			const rel = m[1];
			if (rel && !rel.endsWith('.')) {
				// flat family such as tab_${x}: every sibling key with that prefix must exist in both languages
				const fam = (lang) => Object.keys(get(msgs[lang], ns) || {}).filter((k) => k.startsWith(rel)).sort().join();
				if (!fam('en') || fam('en') !== fam('ar')) problems.push(`${path.relative(root, file)}: key family "${ns}.${rel}*" missing or differs between en and ar`);
				continue;
			}
			const prefix = `${ns}.${rel}`.replace(/\.$/, '');
			const en = get(msgs.en, prefix);
			const ar = get(msgs.ar, prefix);
			if (!en || typeof en !== 'object') problems.push(`${path.relative(root, file)}: dynamic key group "${prefix}" missing in en`);
			else if (!ar || typeof ar !== 'object') problems.push(`${path.relative(root, file)}: dynamic key group "${prefix}" missing in ar`);
			else if (leaves(en).sort().join() !== leaves(ar).sort().join()) problems.push(`${path.relative(root, file)}: dynamic key group "${prefix}" differs between en and ar`);
		}
	}
}

for (const file of files) {
	const whole = fs.readFileSync(file, 'utf8');
	// Variable names (t, tc…) are reused with different namespaces in different components: check per top-level function.
	for (const chunk of whole.split(/\n(?=(?:export )?(?:default )?function )/)) checkChunk(chunk, file);
}

const enKeys = new Set(leaves(msgs.en.projectmind));
const arKeys = new Set(leaves(msgs.ar.projectmind));
for (const k of enKeys) if (!arKeys.has(k)) problems.push(`projectmind.${k} exists in en but not ar`);
for (const k of arKeys) if (!enKeys.has(k)) problems.push(`projectmind.${k} exists in ar but not en`);
for (const lang of ['en', 'ar']) {
	for (const id of ['projectMind', 'pmProjects', 'pmExplorer', 'pmDocs', 'pmChat', 'pmMeetings', 'pmSimulator', 'pmGaps', 'pmSettings']) {
		if (typeof msgs[lang].nav.items[id] !== 'string') problems.push(`nav.items.${id} missing in ${lang}`);
		if (typeof msgs[lang].nav.descriptions[id] !== 'string') problems.push(`nav.descriptions.${id} missing in ${lang}`);
	}
}

console.log(`Checked ${checked} translation calls in ${files.length} files; ${enKeys.size} en keys / ${arKeys.size} ar keys.`);
if (problems.length) {
	console.error(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
	process.exit(1);
}
console.log('OK: no missing keys, en/ar parity holds.');
