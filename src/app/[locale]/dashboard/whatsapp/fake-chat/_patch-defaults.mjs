import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, 'defaults.js');
const old = fs.readFileSync(target, 'utf8');
const marker = 'export const INFO_JSON_HELP';
const idx = old.indexOf(marker);
if (idx < 0) throw new Error('marker not found');
const rest = old.slice(idx);

const headPath = path.join(__dirname, '_defaults_head.js');
const head = fs.readFileSync(headPath, 'utf8');
fs.writeFileSync(target, head + '\n' + rest);
console.log('rewrote defaults.js', target.length);
