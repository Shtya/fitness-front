/**
 * Parametric human body for the outfit preview (plain three.js, no assets).
 *
 * The body is sculpted from smooth spline profiles (torso, legs, arms) turned on a lathe with
 * 64 segments and shaded smoothly, so it reads as a real, proportioned person (store-mannequin
 * style) rather than blocks. Height, weight (via BMI), hips and shoulders reshape everything.
 * Garments are shells built from the SAME profiles plus ease, so they follow the body, and
 * fit (slim → wide), hem length, tuck, sleeve length and shoe type change their shape.
 *
 * A real scanned/rigged model can replace this later: export a .glb whose mesh names start with
 * the slot ids (pants, shirt, tshirt, jacket, shoes, belt, strap, socks, skin) and use
 * `applyToNamedMeshes`.
 */
import * as THREE from 'three';
import { DEFAULT_BODY, HEM_LENGTHS, SKIN_COLORS } from '../config/outfit-config.js';

const RADIAL = 64;
const TAU = Math.PI * 2;

/* ---------- Profiles (metres for a 1.75 m reference body; [radius, y]) ---------- */
const TORSO = [
	[0.06, 0.835],
	[0.15, 0.87],
	[0.172, 0.94], // hips
	[0.163, 1.0],
	[0.146, 1.07], // waist
	[0.152, 1.15],
	[0.168, 1.25], // chest
	[0.176, 1.33],
	[0.182, 1.38], // upper chest / armpits
	[0.175, 1.415], // shoulder line
	[0.15, 1.448], // trapezius slope
	[0.105, 1.472],
	[0.066, 1.488], // neck base
];
const LEG = [
	[0.031, 0.075],
	[0.034, 0.11],
	[0.044, 0.2],
	[0.056, 0.32], // calf
	[0.05, 0.42],
	[0.046, 0.48], // knee
	[0.054, 0.56],
	[0.068, 0.68],
	[0.082, 0.8],
	[0.09, 0.9],
	[0.088, 0.95],
];
const ARM_LEN = 0.6; // shoulder → wrist
const ARM = [
	// [radius, distance from the wrist]
	[0.024, 0],
	[0.027, 0.04],
	[0.034, 0.14],
	[0.037, 0.22], // forearm
	[0.033, 0.29], // elbow
	[0.039, 0.37],
	[0.045, 0.47], // biceps
	[0.051, 0.55], // deltoid
	[0.044, 0.6],
	[0.02, 0.625],
];

// Head profile from the chin (0) to the crown (0.245): [radius, height].
const HEAD = [
	[0.012, 0],
	[0.04, 0.012],
	[0.062, 0.04],
	[0.074, 0.075],
	[0.082, 0.115],
	[0.088, 0.155],
	[0.086, 0.19],
	[0.072, 0.222],
	[0.04, 0.24],
	[0.006, 0.245],
];

const HEM_Y = { full: 0.04, slight: 0.06, none: 0.085, cropped: 0.13, ankle: 0.175 };
const FIT_EASE = { skinny: 0.004, slim: 0.009, straight: 0.016, relaxed: 0.026, wide: 0.036, cargo: 0.026, jogger: 0.012 };

function spline(points, samples = 72) {
	const curve = new THREE.SplineCurve(points.map(([r, y]) => new THREE.Vector2(r, y)));
	return curve.getPoints(samples);
}

/** Resample a profile between y0 and y1 (inclusive), mapping radius through `fn(r, y)`. */
function slice(profile, y0, y1, fn = r => r, samples = 56) {
	const pts = spline(profile, 160);
	const out = [];
	for (let i = 0; i <= samples; i += 1) {
		const y = y0 + ((y1 - y0) * i) / samples;
		// Linear lookup on the dense spline.
		let r = pts[0].x;
		for (let k = 1; k < pts.length; k += 1) {
			if (pts[k].y >= y) {
				const a = pts[k - 1];
				const b = pts[k];
				const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
				r = a.x + (b.x - a.x) * t;
				break;
			}
			r = pts[k].x;
		}
		out.push(new THREE.Vector2(Math.max(0.001, fn(r, y)), y));
	}
	return out;
}

function lathe(points, { phiStart = 0, phiLength = TAU, cap = false } = {}) {
	const pts = cap ? [new THREE.Vector2(0.0005, points[0].y), ...points, new THREE.Vector2(0.0005, points[points.length - 1].y)] : points;
	const geometry = new THREE.LatheGeometry(pts, RADIAL, phiStart, phiLength);
	geometry.computeVertexNormals();
	return geometry;
}

function fabric(hex, { roughness = 0.9, sheen = 0.18 } = {}) {
	// Low sheen keeps the garment's real colour (high sheen washes dark fabrics out to grey).
	return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(hex), roughness, metalness: 0, sheen, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide });
}

/**
 * Procedural fabric weaves (near-white, so they multiply with the garment colour without shifting
 * it): denim twill, chino twill, oxford basket weave, jersey knit. Also used as bump maps.
 */
function weave(kind) {
	const size = 256;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d');
	const img = ctx.createImageData(size, size);
	let seed = kind.length * 9973;
	const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			let v = 0.93 + rand() * 0.05;
			if (kind === 'denim') {
				// 3/1 diagonal twill + slubby vertical yarn variation.
				const d = (x + y * 3) % 8;
				v = 0.8 + (d < 3 ? 0.17 : 0.04) + Math.sin(x * 0.21) * 0.02 + rand() * 0.04;
			} else if (kind === 'twill') {
				v = 0.9 + ((x + y * 2) % 6 < 3 ? 0.07 : 0.0) + rand() * 0.03;
			} else if (kind === 'oxford') {
				v = 0.9 + ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 0.08 : 0.0) + rand() * 0.02;
			} else if (kind === 'jersey') {
				v = 0.9 + Math.abs(Math.sin((x % 4) * 0.8 + (y % 6) * 0.5)) * 0.07 + rand() * 0.02;
			}
			const c = Math.max(0, Math.min(255, Math.round(v * 255)));
			const i = (y * size + x) * 4;
			img.data[i] = c;
			img.data[i + 1] = c;
			img.data[i + 2] = c;
			img.data[i + 3] = 255;
		}
	}
	ctx.putImageData(img, 0, 0);
	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.anisotropy = 4;
	return texture;
}

function applyWeave(material, texture, repeatX, repeatY, bump = 0.6) {
	const map = texture.clone();
	map.needsUpdate = true;
	map.repeat.set(repeatX, repeatY);
	material.map = map;
	material.bumpMap = map;
	material.bumpScale = bump;
	material.needsUpdate = true;
}

/** Body dimensions from height (cm), weight (kg), hips and shoulders (−1 … +1). */
export function bodyMetrics(body = DEFAULT_BODY) {
	const height = Math.min(210, Math.max(140, Number(body.height) || DEFAULT_BODY.height));
	const weight = Math.min(160, Math.max(40, Number(body.weight) || DEFAULT_BODY.weight));
	const bmi = weight / (height / 100) ** 2;
	const sy = height / 175;
	// Girth grows with BMI; the waist and depth grow faster than the frame.
	const frame = Math.pow(bmi / 23.5, 0.42);
	const belly = Math.pow(bmi / 23.5, 0.85);
	return {
		sy,
		frame: Math.min(1.6, Math.max(0.78, frame)),
		belly: Math.min(1.9, Math.max(0.75, belly)),
		hips: 1 + Math.max(-1, Math.min(1, Number(body.hips) || 0)) * 0.12,
		shoulders: 1 + Math.max(-1, Math.min(1, Number(body.shoulders) || 0)) * 0.1,
		skin: SKIN_COLORS[body.skin] || SKIN_COLORS.wheat,
	};
}

/** Torso radius at y for this body (width; depth is applied by scale.z). */
function torsoProfile(m) {
	return TORSO.map(([r, y]) => {
		let k = m.frame;
		if (y >= 0.86 && y <= 1.02) k *= m.hips;
		if (y > 1.0 && y < 1.2) k *= 0.55 + 0.45 * m.belly; // waist follows weight more
		if (y >= 1.36 && y <= 1.44) k *= m.shoulders;
		return [r * k, y];
	});
}

export function createMannequin() {
	const root = new THREE.Group();
	root.name = 'mannequin';
	const body = new THREE.Group();
	const clothes = new THREE.Group();
	root.add(body, clothes);

	const mats = {
		skin: new THREE.MeshPhysicalMaterial({ color: SKIN_COLORS.wheat, roughness: 0.55, sheen: 0.25, sheenRoughness: 0.6, clearcoat: 0.05 }),
		pants: fabric('#1F2A44'),
		shirt: fabric('#F7F7F5', { roughness: 0.82 }),
		tshirt: fabric('#F7F7F5', { roughness: 0.9 }),
		jacket: fabric('#36454F', { roughness: 0.9, sheen: 0.35 }),
		shoes: new THREE.MeshPhysicalMaterial({ color: '#6B4423', roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
		sole: new THREE.MeshStandardMaterial({ color: '#EDEBE6', roughness: 0.7 }),
		belt: new THREE.MeshPhysicalMaterial({ color: '#6B4423', roughness: 0.4, clearcoat: 0.3 }),
		metal: new THREE.MeshStandardMaterial({ color: '#C8C8C8', roughness: 0.25, metalness: 0.9 }),
		strap: new THREE.MeshStandardMaterial({ color: '#6B4423', roughness: 0.45 }),
		socks: fabric('#1F2A44', { roughness: 0.95 }),
	};

	const weaves = typeof document !== 'undefined' ? { denim: weave('denim'), twill: weave('twill'), oxford: weave('oxford'), jersey: weave('jersey') } : null;
	if (weaves) {
		applyWeave(mats.shirt, weaves.oxford, 40, 26, 0.4);
		applyWeave(mats.tshirt, weaves.jersey, 48, 30, 0.35);
		applyWeave(mats.jacket, weaves.twill, 36, 26, 0.6);
		applyWeave(mats.socks, weaves.jersey, 30, 6, 0.3);
	}
	let pantsWeave = null;

	const state = {
		body: { ...DEFAULT_BODY },
		slots: {},
		topSlot: 'shirt',
		hem: 'none',
		fit: 'slim',
		shoeType: 'whiteSneakers',
		pantsType: 'jeans',
		tuck: false,
	};

	function add(group, name, geometry, material, setup) {
		const mesh = new THREE.Mesh(geometry, material);
		mesh.name = name;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		setup?.(mesh);
		group.add(mesh);
		return mesh;
	}

	function clear(group) {
		for (const child of [...group.children]) {
			child.traverse(object => object.isMesh && object.geometry.dispose());
			group.remove(child);
		}
	}

	function build() {
		clear(body);
		clear(clothes);
		const m = bodyMetrics(state.body);
		mats.skin.color.set(m.skin);
		const torso = torsoProfile(m);
		const depth = 0.64 + 0.08 * (m.belly - 1);
		const legX = 0.088 * m.hips * Math.sqrt(m.frame);
		const legK = Math.sqrt(m.frame) * (0.6 + 0.4 * m.hips);
		const shoulderX = 0.176 * m.frame * m.shoulders + 0.02;
		const armTilt = 0.1 + 0.04 * (m.frame - 1); // heavier bodies hold arms wider

		/* ---- Body ---- */
		add(body, 'skin', lathe(slice(torso, 0.835, 1.485), { cap: true }), mats.skin, mesh => (mesh.scale.z = depth));
		add(body, 'skin', new THREE.CylinderGeometry(0.047 * Math.sqrt(m.frame), 0.055 * Math.sqrt(m.frame), 0.12, 40), mats.skin, mesh => (mesh.position.y = 1.53));
		// Head: a sculpted egg profile (narrow chin, full cranium), deeper front-to-back.
		add(body, 'skin', lathe(slice(HEAD, 0, 0.245, r => r, 48), { cap: true }), mats.skin, mesh => {
			mesh.position.set(0, 1.535, 0.004);
			mesh.scale.set(0.92, 1, 1.1);
		});
		// Nose: a soft wedge, so the face has a front.
		add(body, 'skin', new THREE.ConeGeometry(0.014, 0.04, 20), mats.skin, mesh => {
			mesh.position.set(0, 1.635, 0.094);
			mesh.rotation.x = -0.35;
			mesh.scale.set(1, 1, 0.7);
		});
		for (const side of [-1, 1]) {
			add(body, 'skin', new THREE.SphereGeometry(0.02, 20, 14), mats.skin, mesh => {
				mesh.position.set(side * 0.087, 1.64, -0.005);
				mesh.scale.set(0.45, 1.2, 0.8);
			});
		}
		const legProfile = LEG.map(([r, y]) => [r * legK, y]);
		for (const side of [-1, 1]) {
			add(body, 'skin', lathe(slice(legProfile, 0.075, 0.95), { cap: true }), mats.skin, mesh => {
				mesh.position.x = side * legX;
				mesh.scale.z = 0.92;
			});
			// Arm: built hanging down from the shoulder pivot.
			const armGroup = new THREE.Group();
			armGroup.position.set(side * shoulderX, 1.415, -0.005);
			armGroup.rotation.z = side * armTilt;
			armGroup.rotation.x = 0.04;
			body.add(armGroup);
			const armProfile = ARM.map(([r, d]) => [r * Math.sqrt(m.frame) * (d > 0.4 ? m.shoulders : 1), d - ARM_LEN]);
			add(armGroup, 'skin', lathe(slice(armProfile, -ARM_LEN, 0.025), { cap: true }), mats.skin, mesh => (mesh.scale.z = 0.9));
			const hand = add(armGroup, 'skin', new THREE.CapsuleGeometry(0.027, 0.07, 10, 24), mats.skin, mesh => {
				mesh.position.y = -ARM_LEN - 0.065;
				mesh.scale.set(1, 1, 0.55);
				mesh.rotation.y = side * 0.4;
			});
			void hand;
			armGroup.userData = { side, profile: armProfile };
			body.userData[side < 0 ? 'armL' : 'armR'] = armGroup;
		}

		/* ---- Clothes ---- */
		const slots = state.slots;
		const shoeType = state.shoeType;
		const chunky = shoeType === 'chunkySneakers';
		const boots = shoeType === 'boots';
		const sandals = shoeType === 'sandals';
		const shoeTop = boots ? 0.21 : chunky ? 0.11 : sandals ? 0.03 : 0.09;

		// Socks (hidden with sandals).
		if (!sandals) {
			for (const side of [-1, 1]) {
				add(clothes, 'socks', lathe(slice(legProfile, 0.07, 0.17, r => r + 0.003)), mats.socks, mesh => {
					mesh.position.x = side * legX;
					mesh.scale.z = 0.93;
				});
			}
		}

		// Pants (waist part + legs), shaped by fit and hem.
		const shorts = state.pantsType === 'shorts';
		// Jeans get denim twill; chinos / trousers a fine twill; joggers a knit.
		const wantWeave = state.pantsType === 'jeans' ? 'denim' : state.pantsType === 'joggers' ? 'jersey' : 'twill';
		if (weaves && pantsWeave !== wantWeave) {
			mats.pants.map?.dispose();
			applyWeave(mats.pants, weaves[wantWeave], wantWeave === 'denim' ? 44 : 40, wantWeave === 'denim' ? 60 : 50, wantWeave === 'denim' ? 0.9 : 0.5);
			pantsWeave = wantWeave;
		}
		const ease = FIT_EASE[state.fit] ?? FIT_EASE.slim;
		const hemY = shorts ? 0.5 : Math.max(HEM_Y[state.hem] ?? HEM_Y.none, boots ? Math.min(0.2, (HEM_Y[state.hem] ?? 0.085) + 0.12) : shoeTop - 0.035);
		const kneeR = 0.046 * legK + ease + 0.008;
		const thighR = 0.082 * legK + ease;
		const legFn = (r, y) => {
			let out = r + ease;
			if (state.fit === 'straight') out = Math.max(out, y < 0.5 ? kneeR + 0.004 : out);
			if (state.fit === 'relaxed' || state.fit === 'cargo') out = Math.max(out, y < 0.5 ? kneeR + 0.012 : thighR * 0.92);
			if (state.fit === 'wide') out = Math.max(out, thighR * 0.98);
			if (state.fit === 'jogger' && y < hemY + 0.05) out = r + 0.004; // elastic cuff
			// The break: fabric stacks and flares over the shoe when the hem is long.
			if (y < hemY + 0.03 && (state.hem === 'full' || state.hem === 'slight')) out += (state.hem === 'full' ? 0.012 : 0.006) * (1 - (y - hemY) / 0.03);
			return out;
		};
		// Untucked tops cover the waistband, so the pants stop under the top's hem.
		const pantsTorso = slice(torso, 0.84, state.tuck ? 1.075 : 0.97, r => r + 0.012 + ease * 0.4);
		add(clothes, 'pants', lathe(pantsTorso), mats.pants, mesh => (mesh.scale.z = depth + 0.02));
		for (const side of [-1, 1]) {
			add(clothes, 'pants', lathe(slice(legProfile, hemY, 0.95, legFn)), mats.pants, mesh => {
				mesh.position.x = side * legX;
				mesh.scale.z = 0.94;
			});
			if (state.fit === 'cargo' && !shorts) {
				add(clothes, 'pants', new THREE.BoxGeometry(0.03, 0.13, 0.1), mats.pants, mesh => {
					mesh.position.set(side * (legX + thighR + 0.008), 0.64, 0.005);
				});
			}
		}

		// Belt: only visible when the top is tucked in (an untucked top covers it).
		if (slots.belt?.hex && state.tuck) {
			add(clothes, 'belt', lathe(slice(torso, 1.035, 1.068, r => r + 0.017 + ease * 0.4, 6)), mats.belt, mesh => (mesh.scale.z = depth + 0.03));
			const front = slice(torso, 1.05, 1.05, r => r + 0.017 + ease * 0.4, 1)[0].x * (depth + 0.03);
			add(clothes, 'buckle', new THREE.BoxGeometry(0.045, 0.034, 0.008), mats.metal, mesh => mesh.position.set(0, 1.0515, front + 0.004));
		}

		// Top: shirt (collar, long sleeves) or t-shirt (short sleeves). Tucked for dressy looks.
		const tshirt = state.topSlot === 'tshirt' || (!slots.shirt && slots.tshirt);
		const topMat = tshirt ? mats.tshirt : mats.shirt;
		const topBottom = state.tuck ? 1.0 : tshirt ? 0.9 : 0.86;
		const topEase = (state.tuck ? 0.012 : 0.02) + (state.topLoose ? 0.02 : 0);
		add(clothes, tshirt ? 'tshirt' : 'shirt', lathe(slice(torso, topBottom, 1.47, (r, y) => r + topEase + (y < 1.0 ? 0.006 : 0))), topMat, mesh => (mesh.scale.z = depth + 0.025));
		add(clothes, tshirt ? 'tshirt' : 'shirt', new THREE.TorusGeometry(0.062 * Math.sqrt(m.frame), tshirt ? 0.008 : 0.014, 12, 48), topMat, mesh => {
			mesh.position.y = tshirt ? 1.475 : 1.49;
			mesh.rotation.x = Math.PI / 2 - 0.12;
			mesh.scale.y = 0.85;
		});
		const hasJacket = Boolean(slots.jacket?.hex);
		for (const side of [-1, 1]) {
			const arm = body.userData[side < 0 ? 'armL' : 'armR'];
			const sleeveFrom = tshirt ? -0.2 : -ARM_LEN + 0.02;
			if (!hasJacket) {
				add(arm, tshirt ? 'tshirt' : 'shirt', lathe(slice(arm.userData.profile, sleeveFrom, 0.03, r => r + (tshirt ? 0.012 : 0.008))), topMat, mesh => (mesh.scale.z = 0.92));
			}
		}

		// Jacket: open front, longer, with sleeves to the wrist.
		if (hasJacket) {
			const gap = 0.16;
			add(clothes, 'jacket', lathe(slice(torso, 0.8, 1.475, (r, y) => r + 0.03 + (y < 1.0 ? 0.01 : 0)), { phiStart: gap, phiLength: TAU - 2 * gap }), mats.jacket, mesh => (mesh.scale.z = depth + 0.05));
			for (const side of [-1, 1]) {
				const arm = body.userData[side < 0 ? 'armL' : 'armR'];
				add(arm, 'jacket', lathe(slice(arm.userData.profile, -ARM_LEN + 0.035, 0.035, r => r + 0.02)), mats.jacket, mesh => (mesh.scale.z = 0.94));
			}
		}

		// Watch on the left wrist.
		if (slots.strap?.hex) {
			const arm = body.userData.armL;
			add(arm, 'strap', new THREE.TorusGeometry(0.029, 0.007, 10, 40), mats.strap, mesh => {
				mesh.position.y = -ARM_LEN + 0.045;
				mesh.rotation.x = Math.PI / 2;
				mesh.scale.y = 0.85;
			});
			add(arm, 'watch', new THREE.CylinderGeometry(0.017, 0.017, 0.008, 32), mats.metal, mesh => {
				mesh.position.set(0, -ARM_LEN + 0.045, 0.028);
				mesh.rotation.x = Math.PI / 2;
			});
		}

		// Shoes: shaped by type.
		const leather = ['loafers', 'derby', 'boots'].includes(shoeType);
		mats.sole.color.set(leather ? '#2B211C' : sandals ? '#6B5B4B' : '#F1EFEA');
		for (const side of [-1, 1]) {
			const shoe = new THREE.Group();
			shoe.position.set(side * legX, 0, 0.04);
			shoe.rotation.y = side * 0.06;
			clothes.add(shoe);
			const length = chunky ? 0.29 : leather ? 0.28 : 0.275;
			const width = chunky ? 0.112 : leather ? 0.094 : 0.1;
			const soleH = chunky ? 0.045 : leather ? 0.016 : sandals ? 0.02 : 0.026;
			add(shoe, 'sole', new THREE.CapsuleGeometry(width / 2, length - width, 8, 32), mats.sole, mesh => {
				mesh.rotation.x = Math.PI / 2;
				mesh.scale.set(1, 1, soleH / width);
				mesh.position.y = soleH / 2;
			});
			if (sandals) {
				add(shoe, 'skin', new THREE.CapsuleGeometry(0.036, 0.15, 8, 24), mats.skin, mesh => {
					mesh.rotation.x = Math.PI / 2;
					mesh.scale.set(1.1, 1, 0.55);
					mesh.position.y = soleH + 0.018;
				});
				for (const z of [0.05, -0.02]) {
					add(shoe, 'shoes', new THREE.TorusGeometry(0.042, 0.007, 8, 32, Math.PI), mats.shoes, mesh => {
						mesh.position.set(0, soleH + 0.01, z);
						mesh.scale.set(1.05, 0.7, 1);
					});
				}
				continue;
			}
			const upperH = leather ? 0.062 : chunky ? 0.075 : 0.07;
			add(shoe, 'shoes', new THREE.CapsuleGeometry(width / 2 - 0.004, length - width - 0.01, 10, 40), mats.shoes, mesh => {
				mesh.rotation.x = Math.PI / 2;
				mesh.scale.set(1, 1, upperH / width);
				mesh.position.y = soleH + upperH / 2 - 0.004;
			});
			// Ankle collar so the shoe reads as a shoe, not a pebble.
			add(shoe, 'shoes', new THREE.CylinderGeometry(0.04, 0.046, boots ? 0.17 : 0.04, 40, 1, true), mats.shoes, mesh => {
				mesh.position.set(0, soleH + (boots ? 0.1 : 0.05), -0.055);
			});
		}

		applyColors();
	}

	function applyColors() {
		for (const slot of ['pants', 'shirt', 'tshirt', 'jacket', 'shoes', 'belt', 'strap', 'socks']) {
			const hex = state.slots[slot]?.hex;
			if (hex) mats[slot].color.set(hex);
		}
		// A shirt locked without a t-shirt colour (or vice versa) still shows its colour.
		if (!state.slots.tshirt?.hex && state.slots.shirt?.hex) mats.tshirt.color.set(state.slots.shirt.hex);
		if (!state.slots.shirt?.hex && state.slots.tshirt?.hex) mats.shirt.color.set(state.slots.tshirt.hex);
		mats.belt.color.set(state.slots.belt?.hex || state.slots.shoes?.hex || '#3B2A20');
	}

	let pending = false;
	const schedule = () => {
		if (pending) return;
		pending = true;
		queueMicrotask(() => {
			pending = false;
			build();
		});
	};

	function update(next) {
		const shapeKeys = ['body', 'topSlot', 'hem', 'fit', 'shoeType', 'pantsType', 'tuck', 'topLoose'];
		let reshape = false;
		for (const [key, value] of Object.entries(next)) {
			if (value === undefined) continue;
			if (key === 'slots') {
				const hadJacket = Boolean(state.slots.jacket?.hex);
				const hadBelt = Boolean(state.slots.belt?.hex);
				const hadStrap = Boolean(state.slots.strap?.hex);
				state.slots = value || {};
				if (hadJacket !== Boolean(state.slots.jacket?.hex) || hadBelt !== Boolean(state.slots.belt?.hex) || hadStrap !== Boolean(state.slots.strap?.hex)) reshape = true;
			} else if (shapeKeys.includes(key) && JSON.stringify(state[key]) !== JSON.stringify(value)) {
				state[key] = key === 'body' ? { ...value } : value;
				reshape = true;
			}
		}
		if (reshape) schedule();
		else applyColors();
	}

	build();

	function dispose() {
		clear(body);
		clear(clothes);
		for (const mat of Object.values(mats)) {
			mat.map?.dispose();
			mat.dispose();
		}
		for (const texture of Object.values(weaves || {})) texture.dispose();
	}

	return {
		root,
		update,
		setColors: (slots, topSlot) => update({ slots, topSlot }),
		setHem: hem => update({ hem: HEM_LENGTHS.includes(hem) ? hem : 'none' }),
		setFit: fit => update({ fit: fit || 'slim' }),
		setShoeType: shoeType => update({ shoeType: shoeType || 'whiteSneakers' }),
		setBody: bodyParams => update({ body: bodyParams }),
		dispose,
	};
}

/** For a loaded .glb: colour meshes whose names start with a slot id. */
export function applyToNamedMeshes(root, slots = {}) {
	root.traverse(object => {
		if (!object.isMesh) return;
		const slot = Object.keys(slots).find(id => object.name.toLowerCase().startsWith(id));
		const hex = slot && slots[slot]?.hex;
		if (hex && object.material?.color) object.material.color.set(hex);
	});
}
