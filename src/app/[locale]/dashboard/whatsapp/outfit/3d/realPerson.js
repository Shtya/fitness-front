/**
 * A real human for the outfit preview: Microsoft Rocketbox avatars (MIT, see
 * public/models/outfit/ROCKETBOX-LICENSE.txt), converted to .glb with a clothing mask
 * (R = top, G = pants, B = shoes). A small shader recolours each masked region to the
 * outfit's colour while keeping the photo-real folds, seams and wash of the original fabric.
 *
 * Same API as the procedural mannequin: { root, update(state), dispose() }.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { DEFAULT_BODY, SKIN_COLORS } from '../config/outfit-config.js';

// Overridable for offline test pages; the app serves the models from /public.
const BASE = (typeof window !== 'undefined' && window.__WA_OUTFIT_MODELS__) || '/models/outfit';
/** Average linear-light luminance of each masked region [top, pants, shoes] (from the converter). */
export const AVATARS = {
	tee: { url: `${BASE}/person-tee.glb`, mask: `${BASE}/person-tee-mask.png`, avg: [0.0163, 0.1325, 0.0582], skin: '#C9946F' },
	shirt: { url: `${BASE}/person-shirt.glb`, mask: `${BASE}/person-shirt-mask.png`, avg: [0.3025, 0.0226, 0.0116], skin: '#D9A37F' },
};
const TARGET_HEIGHT = 1.75;

const cache = new Map();
function loadAvatar(kind) {
	if (!cache.has(kind)) {
		const spec = AVATARS[kind];
		cache.set(
			kind,
			Promise.all([
				new GLTFLoader().loadAsync(spec.url),
				new THREE.TextureLoader().loadAsync(spec.mask).then(tex => {
					tex.flipY = false; // glTF orientation (verified with the mask debug view)
					tex.colorSpace = THREE.NoColorSpace;
					return tex;
				}),
			]).then(([gltf, mask]) => ({ scene: gltf.scene, mask })),
		);
	}
	return cache.get(kind);
}

/** Recolour the body material: region colour × (texture luminance / region average luminance). */
/** One set of recolour uniforms per avatar, shared by every body primitive. */
function recolorUniforms(mask, avg) {
	return {
		uMask: { value: mask },
		uTop: { value: new THREE.Color('#ffffff') },
		uPants: { value: new THREE.Color('#ffffff') },
		uShoes: { value: new THREE.Color('#ffffff') },
		uOn: { value: new THREE.Vector3(0, 0, 0) },
		uAvg: { value: new THREE.Vector3(...avg) },
		uSkin: { value: new THREE.Color(1, 1, 1) },
	};
}

function recolorMaterial(material, uniforms) {
	material.onBeforeCompile = shader => {
		Object.assign(shader.uniforms, uniforms);
		shader.fragmentShader = shader.fragmentShader
			.replace(
				'#include <common>',
				`#include <common>
uniform sampler2D uMask;
uniform vec3 uTop;
uniform vec3 uPants;
uniform vec3 uShoes;
uniform vec3 uOn;
uniform vec3 uAvg;
uniform vec3 uSkin;
vec3 waRecolor(vec3 original, vec3 target, float avgL) {
	float L = dot(original, vec3(0.2126, 0.7152, 0.0722));
	// Keep the fabric's light and shadow (folds, seams) but on the new colour.
	float ratio = clamp(L / max(avgL, 0.012), 0.35, 2.2);
	ratio = mix(1.0, ratio, 0.8);
	return target * ratio;
}`,
			)
			.replace(
				'#include <map_fragment>',
				`#include <map_fragment>
vec4 waM = texture2D(uMask, vMapUv);
float waTop = smoothstep(0.35, 0.65, waM.r) * uOn.x;
float waPants = smoothstep(0.35, 0.65, waM.g) * uOn.y;
float waShoes = smoothstep(0.35, 0.65, waM.b) * uOn.z;
float waCloth = max(max(smoothstep(0.35, 0.65, waM.r), smoothstep(0.35, 0.65, waM.g)), smoothstep(0.35, 0.65, waM.b));
vec3 waBase = diffuseColor.rgb;
diffuseColor.rgb = mix(diffuseColor.rgb, waRecolor(waBase, uTop, uAvg.x), waTop);
diffuseColor.rgb = mix(diffuseColor.rgb, waRecolor(waBase, uPants, uAvg.y), waPants);
diffuseColor.rgb = mix(diffuseColor.rgb, waRecolor(waBase, uShoes, uAvg.z), waShoes);
diffuseColor.rgb *= mix(uSkin, vec3(1.0), waCloth);`,
			);
	};
	material.customProgramCacheKey = () => 'wa-recolor-v1';
	material.needsUpdate = true;
	return uniforms;
}

function tintMaterial(material, uniforms) {
	material.onBeforeCompile = shader => {
		Object.assign(shader.uniforms, uniforms);
		shader.fragmentShader = shader.fragmentShader
			.replace('#include <common>', '#include <common>\nuniform vec3 uSkin;')
			.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= uSkin;');
	};
	material.customProgramCacheKey = () => 'wa-skin-v1';
	material.needsUpdate = true;
	return uniforms;
}

/** Rotate `bone` (in world space) so the direction from it to `child` points along `target`. */
function aimBone(bone, child, target) {
	bone.updateWorldMatrix(true, true);
	const a = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
	const b = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);
	const dir = b.sub(a).normalize();
	const rot = new THREE.Quaternion().setFromUnitVectors(dir, target.clone().normalize());
	const parentQ = new THREE.Quaternion();
	bone.parent.getWorldQuaternion(parentQ);
	const worldQ = new THREE.Quaternion();
	bone.getWorldQuaternion(worldQ);
	const nextWorld = rot.multiply(worldQ);
	bone.quaternion.copy(parentQ.invert().multiply(nextWorld));
	bone.updateWorldMatrix(false, true);
}

function poseArms(root) {
	const get = name => root.getObjectByName(name);
	for (const side of ['L', 'R']) {
		const upper = get(`Bip01_${side}_UpperArm`);
		const fore = get(`Bip01_${side}_Forearm`);
		const hand = get(`Bip01_${side}_Hand`);
		if (!upper || !fore || !hand) continue;
		upper.updateWorldMatrix(true, false);
		const sx = Math.sign(new THREE.Vector3().setFromMatrixPosition(upper.matrixWorld).x) || (side === 'L' ? 1 : -1);
		// Relaxed stance: arms down, slightly away from the body, elbows a touch bent.
		aimBone(upper, fore, new THREE.Vector3(sx * 0.17, -1, 0.02));
		aimBone(fore, hand, new THREE.Vector3(sx * 0.08, -1, 0.16));
	}
}

/**
 * Watch on the left wrist (model units = cm). Placed after posing: the strap ring wraps the
 * forearm just above the wrist joint and the face sits on the outside of the wrist.
 */
function makeWatch(object) {
	const hand = object.getObjectByName('Bip01_L_Hand');
	const fore = object.getObjectByName('Bip01_L_Forearm');
	if (!hand || !fore) return null;
	object.updateMatrixWorld(true);
	const toLocal = v => object.worldToLocal(v);
	const wrist = toLocal(new THREE.Vector3().setFromMatrixPosition(hand.matrixWorld));
	const elbow = toLocal(new THREE.Vector3().setFromMatrixPosition(fore.matrixWorld));
	const along = wrist.clone().sub(elbow).normalize(); // elbow → wrist
	const out = new THREE.Vector3(Math.sign(wrist.x) || 1, 0, 0.35).projectOnPlane(along).normalize();
	const group = new THREE.Group();
	const strapMat = new THREE.MeshStandardMaterial({ color: '#3B2A20', roughness: 0.5 });
	const faceMat = new THREE.MeshStandardMaterial({ color: '#C9C9C9', roughness: 0.25, metalness: 0.9 });
	const strap = new THREE.Mesh(new THREE.TorusGeometry(2.85, 0.55, 10, 40), strapMat);
	strap.scale.set(1, 0.85, 1.6);
	const face = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.9, 32), faceMat);
	face.position.copy(out.clone().multiplyScalar(2.6));
	face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
	const ring = new THREE.Group();
	ring.add(strap);
	ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), along);
	group.add(ring, face);
	group.position.copy(wrist.clone().sub(along.clone().multiplyScalar(3.2)));
	group.userData = { strapMat, faceMat };
	object.add(group);
	return group;
}

export function createRealPerson() {
	const root = new THREE.Group();
	root.name = 'real-person';
	const state = { kind: null, slots: {}, body: { ...DEFAULT_BODY } };
	let current = null; // { kind, object, uniforms, skinUniforms[], watch, base }
	let disposed = false;
	let loadToken = 0;
	const listeners = new Set();

	function applyColors() {
		if (!current) return;
		const { uniforms } = current;
		const top = state.slots[state.topSlot] || state.slots.shirt || state.slots.tshirt;
		const set = (color, on, slot, index) => {
			if (slot?.hex) {
				color.set(slot.hex);
				on.setComponent(index, 1);
			} else on.setComponent(index, 0);
		};
		set(uniforms.uTop.value, uniforms.uOn.value, top, 0);
		set(uniforms.uPants.value, uniforms.uOn.value, state.slots.pants, 1);
		set(uniforms.uShoes.value, uniforms.uOn.value, state.slots.shoes, 2);
		// Skin tone: tint relative to the avatar's own skin.
		const wanted = new THREE.Color(SKIN_COLORS[state.body.skin] || SKIN_COLORS.wheat);
		const base = new THREE.Color(AVATARS[current.kind].skin);
		const tint = new THREE.Color(Math.min(1.6, wanted.r / base.r), Math.min(1.6, wanted.g / base.g), Math.min(1.6, wanted.b / base.b));
		uniforms.uSkin.value.copy(tint);
		for (const u of current.skinUniforms) u.uSkin.value.copy(tint);
		if (current.watch) {
			current.watch.visible = Boolean(state.slots.strap?.hex);
			if (state.slots.strap?.hex) current.watch.userData.strapMat.color.set(state.slots.strap.hex);
		}
	}

	function applyBody() {
		if (!current) return;
		const height = Math.min(205, Math.max(145, Number(state.body.height) || 175));
		const weight = Math.min(140, Math.max(45, Number(state.body.weight) || 74));
		const bmi = weight / (height / 100) ** 2;
		const k = (TARGET_HEIGHT * (height / 175)) / current.base.height;
		const girth = Math.min(1.35, Math.max(0.85, Math.pow(bmi / 23.5, 0.45)));
		current.object.scale.set(k * girth, k, k * Math.min(1.45, girth * 1.04));
		const pelvis = current.object.getObjectByName('Bip01_Pelvis');
		if (pelvis) pelvis.scale.set(1 + (Number(state.body.hips) || 0) * 0.08, 1, 1);
		const chest = current.object.getObjectByName('Bip01_Spine2');
		if (chest) chest.scale.set(1, 1, 1 + (Number(state.body.shoulders) || 0) * 0.08);
	}

	async function show(kind) {
		const token = (loadToken += 1);
		let data;
		try {
			data = await loadAvatar(kind);
		} catch (error) {
			for (const listener of listeners) listener({ type: 'error', error });
			return;
		}
		if (disposed || token !== loadToken) return;
		const object = cloneSkinned(data.scene);
		const uniforms = recolorUniforms(data.mask, AVATARS[kind].avg);
		const headUniforms = { uSkin: { value: new THREE.Color(1, 1, 1) } };
		const skinUniforms = [headUniforms];
		object.traverse(o => {
			if (!o.isMesh) return;
			o.castShadow = true;
			o.receiveShadow = true;
			o.frustumCulled = false;
			o.material = [].concat(o.material).map(m => m.clone());
			if (o.material.length === 1) o.material = o.material[0];
			for (const m of [].concat(o.material)) {
				if (/body/i.test(m.name)) recolorMaterial(m, uniforms);
				else if (/head/i.test(m.name)) tintMaterial(m, headUniforms);
				if (m.map) m.map.anisotropy = 8;
			}
		});
		// Cloned skeletons start with stale world matrices: refresh before posing and measuring.
		object.updateMatrixWorld(true);
		poseArms(object);
		object.updateMatrixWorld(true);
		object.traverse(o => {
			if (o.isSkinnedMesh) {
				o.skeleton.update();
				o.computeBoundingBox();
				o.computeBoundingSphere();
			}
		});
		const box = new THREE.Box3().setFromObject(object, true);
		const height = box.max.y - box.min.y || 182;
		object.position.y = -box.min.y;
		const holder = new THREE.Group();
		holder.add(object);
		const watch = makeWatch(object);
		if (current) {
			root.remove(current.object);
			disposeObject(current.object);
		}
		current = { kind, object: holder, uniforms, skinUniforms, watch, base: { height } };
		root.add(holder);
		applyBody();
		applyColors();
		for (const listener of listeners) listener({ type: 'ready' });
	}

	function update(next) {
		const prevKind = state.kind;
		if (next.slots !== undefined) state.slots = next.slots || {};
		if (next.topSlot !== undefined) state.topSlot = next.topSlot;
		if (next.body !== undefined) state.body = { ...next.body };
		const top = state.slots[state.topSlot] ? state.topSlot : state.slots.shirt ? 'shirt' : 'tshirt';
		state.kind = top === 'shirt' || state.slots.jacket?.hex ? 'shirt' : 'tee';
		if (state.kind !== prevKind) void show(state.kind);
		applyBody();
		applyColors();
	}

	function disposeObject(object) {
		object.traverse(o => {
			if (!o.isMesh) return;
			// Geometry and textures are shared with the cached original; only drop cloned materials.
			for (const m of [].concat(o.material)) m.dispose();
		});
	}

	return {
		root,
		update,
		onEvent: listener => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		dispose() {
			disposed = true;
			if (current) disposeObject(current.object);
			listeners.clear();
		},
	};
}

/**
 * The person shown in the viewer: the real avatar, or the procedural mannequin if the model
 * can't load (offline, blocked file, old GPU). `onChange` fires when something new can be drawn.
 */
export function createPerson({ createFallback, onChange }) {
	const root = new THREE.Group();
	let last = {};
	let impl = createRealPerson();
	root.add(impl.root);
	let off = impl.onEvent(event => {
		if (event.type === 'error' && createFallback) {
			off();
			root.remove(impl.root);
			impl.dispose();
			impl = createFallback();
			root.add(impl.root);
			impl.update(last);
		}
		onChange?.();
	});
	return {
		root,
		update(next) {
			last = { ...last, ...next };
			impl.update(next);
		},
		dispose() {
			off();
			impl.dispose();
		},
	};
}
