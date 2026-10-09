"use client";

import { useEffect, useRef } from "react";

function cssColor(name, fallback) {
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return value || fallback;
}

/**
 * The sign-in centrepiece: a barbell the form loads.
 *   plates 0 → empty 20 kg bar, 1 → +2×10 kg (email ok), 2 → +2×20 kg (password typed)
 *   mode   idle | loading (does reps) | error (shakes, drops) | success (locks out, lifts away)
 * Three.js is imported lazily; rendering pauses when hidden; reduced motion renders
 * still frames on each change.
 */
export default function AuthBarbell({ plates = 0, mode = "idle", className = "" }) {
	const hostRef = useRef(null);
	const stateRef = useRef({ plates, mode, modeAt: 0 });
	const renderOnceRef = useRef(null);

	useEffect(() => {
		const s = stateRef.current;
		if (s.mode !== mode) s.modeAt = performance.now();
		s.plates = plates;
		s.mode = mode;
		renderOnceRef.current?.();
	}, [plates, mode]);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;
		let disposed = false;
		let cleanup = () => {};

		(async () => {
			const THREE = await import("three");
			const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
			if (disposed) return;
			const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

			const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
			renderer.outputColorSpace = THREE.SRGBColorSpace;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			renderer.toneMappingExposure = 1.08;
			host.appendChild(renderer.domElement);

			const scene = new THREE.Scene();
			const pmrem = new THREE.PMREMGenerator(renderer);
			scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
			const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
			camera.position.set(0, 0.6, 15);
			camera.lookAt(0, 0, 0);

			const steel = new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.18, metalness: 1 });
			const knurl = new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.55, metalness: 0.9 });
			const big = new THREE.MeshPhysicalMaterial({ roughness: 0.34, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.2 });
			const small = new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.15 });
			const recolor = () => {
				big.color.set(cssColor("--color-primary-600", "#2563eb"));
				small.color.set(cssColor("--color-primary-300", "#93c5fd"));
			};
			recolor();

			const rig = new THREE.Group();
			const bar = new THREE.Group();
			rig.add(bar);
			scene.add(rig);

			const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5.2, 40), knurl);
			shaft.rotation.z = Math.PI / 2;
			bar.add(shaft);
			[-1, 1].forEach(side => {
				const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.6, 40), steel);
				sleeve.rotation.z = Math.PI / 2;
				sleeve.position.x = side * 3.85;
				const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 40), steel);
				flange.rotation.z = Math.PI / 2;
				flange.position.x = side * 2.62;
				bar.add(sleeve, flange);
			});

			const makePlate = (radius, width, mat) => {
				const g = new THREE.Group();
				const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 96), mat);
				body.rotation.z = Math.PI / 2;
				const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.05, 0.06, 18, 96), mat);
				rim.rotation.y = Math.PI / 2;
				const rim2 = rim.clone();
				rim.position.x = width / 2;
				rim2.position.x = -width / 2;
				const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, width + 0.04, 40), steel);
				hub.rotation.z = Math.PI / 2;
				g.add(body, rim, rim2, hub);
				return g;
			};

			// Plate sets: [radius, width, material, seat x]. Big bumpers seat first (inside).
			const sets = [
				{ need: 2, radius: 1.75, width: 0.46, mat: big, seat: 2.98 },
				{ need: 1, radius: 1.2, width: 0.3, mat: small, seat: 3.4 },
			].map(spec => {
				const pair = [-1, 1].map(side => {
					const plate = makePlate(spec.radius, spec.width, spec.mat);
					plate.userData = { side, seat: spec.seat, k: 0 };
					plate.position.x = side * 7;
					plate.scale.setScalar(0.001);
					bar.add(plate);
					return plate;
				});
				return { ...spec, pair };
			});
			// Bigger plates must sit inside: when only email is filled the small plates
			// seat further in, at the big plates' spot.
			const seatFor = (spec, loaded) => (loaded >= 2 ? spec.seat : 2.98);

			const collars = [-1, 1].map(side => {
				const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 32), steel);
				c.rotation.z = Math.PI / 2;
				c.position.x = side * 4.9;
				bar.add(c);
				return c;
			});

			const key = new THREE.DirectionalLight(0xffffff, 2.4);
			key.position.set(5, 7, 8);
			const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
			rimLight.position.set(-6, 2, -4);
			scene.add(key, rimLight, new THREE.AmbientLight(0xffffff, 0.2));

			const resize = () => {
				const { clientWidth: w, clientHeight: h } = host;
				if (!w || !h) return;
				renderer.setSize(w, h, false);
				camera.aspect = w / h;
				// Fill the stage with the bar, but keep both collars in frame on narrow hosts.
				const aspect = w / h;
				camera.position.z = aspect < 1.6 ? 15.5 : aspect < 2.3 ? 12 : 10.2;
				camera.updateProjectionMatrix();
			};
			resize();
			const ro = new ResizeObserver(resize);
			ro.observe(host);

			const mo = new MutationObserver(() => {
				recolor();
				if (reduced) renderOnceRef.current?.();
			});
			mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });

			const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
			const onPointer = e => {
				pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
				pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
			};
			window.addEventListener("pointermove", onPointer, { passive: true });

			let visible = true;
			const io = new IntersectionObserver(([entry]) => {
				visible = entry.isIntersecting;
			});
			io.observe(host);

			const lerp = (a, b, t) => a + (b - a) * t;
			const clock = new THREE.Clock();

			const step = (t, snap) => {
				const s = stateRef.current;
				const since = (performance.now() - s.modeAt) / 1000;
				const ease = snap ? 1 : 0.12;

				// Plates slide on and seat; collars follow the outermost plate.
				sets.forEach(spec => {
					const on = s.plates >= spec.need;
					spec.pair.forEach(plate => {
						const { side } = plate.userData;
						const targetX = on ? side * seatFor(spec, s.plates) : side * 7;
						plate.position.x = lerp(plate.position.x, targetX, ease);
						const sc = lerp(plate.scale.x, on ? 1 : 0.001, snap ? 1 : 0.16);
						plate.scale.setScalar(sc);
					});
				});
				const outer = s.plates >= 2 ? 3.4 + 0.15 + 0.2 : s.plates >= 1 ? 2.98 + 0.15 + 0.2 : 2.82;
				collars.forEach((c, i) => {
					c.position.x = lerp(c.position.x, (i ? 1 : -1) * outer, ease);
				});

				// Pose by mode.
				let y = 0;
				let rotZ = 0;
				let x = 0;
				if (s.mode === "loading" && !reduced) {
					y = Math.abs(Math.sin(since * 4.2)) * 0.9; // reps
				} else if (s.mode === "error") {
					const damp = Math.max(0, 1 - since / 0.9);
					x = reduced ? 0 : Math.sin(since * 38) * 0.35 * damp;
					rotZ = reduced ? -0.06 : -0.08 * Math.min(1, since * 3) * (0.4 + damp);
					y = reduced ? -0.25 : -0.3 * Math.min(1, since * 4);
				} else if (s.mode === "success") {
					y = reduced ? 1.4 : Math.min(6, since * since * 5 + since * 1.2);
				} else if (!reduced) {
					y = Math.sin(t * 1.1) * 0.12;
				}
				rig.position.y = lerp(rig.position.y, y, snap ? 1 : 0.25);
				rig.position.x = x;
				rig.rotation.z = lerp(rig.rotation.z, rotZ, snap ? 1 : 0.2);

				if (!reduced) {
					pointer.x += (pointer.tx - pointer.x) * 0.05;
					pointer.y += (pointer.ty - pointer.y) * 0.05;
				}
				rig.rotation.y = -0.38 + pointer.x * 0.22 + (reduced ? 0 : Math.sin(t * 0.35) * 0.06);
				rig.rotation.x = 0.16 + pointer.y * 0.1;
				bar.rotation.x = s.mode === "loading" && !reduced ? since * 0.6 : bar.rotation.x * 0.94;
			};

			let frame = 0;
			const loop = () => {
				frame = requestAnimationFrame(loop);
				if (!visible) return;
				step(clock.getElapsedTime(), false);
				renderer.render(scene, camera);
			};
			renderOnceRef.current = () => {
				if (!reduced) return;
				step(0, true);
				renderer.render(scene, camera);
			};
			if (reduced) renderOnceRef.current();
			else loop();
			host.dataset.ready = "true";

			cleanup = () => {
				cancelAnimationFrame(frame);
				renderOnceRef.current = null;
				io.disconnect();
				ro.disconnect();
				mo.disconnect();
				window.removeEventListener("pointermove", onPointer);
				scene.traverse(obj => obj.geometry?.dispose?.());
				[steel, knurl, big, small].forEach(m => m.dispose());
				pmrem.dispose();
				renderer.dispose();
				renderer.domElement.remove();
			};
		})();

		return () => {
			disposed = true;
			cleanup();
		};
	}, []);

	return <div ref={hostRef} className={`au-barbell ${className}`} aria-hidden="true" />;
}
