"use client";

import { useEffect, useRef } from "react";
import { getGsap, prefersReducedMotion } from "./motion/gsap";

function readThemeColor(name, fallback) {
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return value || fallback;
}

/**
 * The hero's 3D object: a loaded dumbbell in the live theme colour.
 * Three.js is imported lazily so it never blocks first paint; rendering pauses
 * off-screen and reduced-motion visitors get one still frame.
 */
export default function HeroDumbbell({ className = "" }) {
	const hostRef = useRef(null);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return undefined;
		let disposed = false;
		let cleanup = () => {};

		(async () => {
			const THREE = await import("three");
			const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
			if (disposed) return;
			const { ScrollTrigger } = getGsap();
			const reduced = prefersReducedMotion();

			const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
			renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
			renderer.outputColorSpace = THREE.SRGBColorSpace;
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			renderer.toneMappingExposure = 1.05;
			host.appendChild(renderer.domElement);

			const scene = new THREE.Scene();
			const pmrem = new THREE.PMREMGenerator(renderer);
			scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

			const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
			camera.position.set(0, 0, 11);

			const plateMat = new THREE.MeshPhysicalMaterial({
				color: new THREE.Color(readThemeColor("--color-primary-500", "#3b82f6")),
				roughness: 0.32,
				metalness: 0.15,
				clearcoat: 1,
				clearcoatRoughness: 0.18,
			});
			const innerMat = new THREE.MeshPhysicalMaterial({
				color: new THREE.Color(readThemeColor("--color-primary-800", "#1e3a8a")),
				roughness: 0.45,
				metalness: 0.1,
				clearcoat: 0.6,
			});
			const steel = new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.22, metalness: 1 });

			const group = new THREE.Group();
			const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6.2, 48), steel);
			bar.rotation.z = Math.PI / 2;
			group.add(bar);

			const plate = (radius, width, x, mat) => {
				const g = new THREE.Group();
				const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 96, 1), mat);
				body.rotation.z = Math.PI / 2;
				g.add(body);
				// Raised rim and recessed hub read as a real bumper plate.
				const rim = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.06, 0.07, 20, 96), mat);
				rim.rotation.y = Math.PI / 2;
				rim.position.x = width / 2;
				const rim2 = rim.clone();
				rim2.position.x = -width / 2;
				const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, width + 0.04, 48), steel);
				hub.rotation.z = Math.PI / 2;
				g.add(rim, rim2, hub);
				g.position.x = x;
				return g;
			};
			[-1, 1].forEach(side => {
				group.add(plate(1.55, 0.42, side * 2.05, plateMat));
				group.add(plate(1.18, 0.32, side * 1.62, innerMat));
				const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 32), steel);
				collar.rotation.z = Math.PI / 2;
				collar.position.x = side * 1.32;
				group.add(collar);
			});
			group.rotation.set(0.35, -0.55, 0.18);
			scene.add(group);

			const key = new THREE.DirectionalLight(0xffffff, 2.2);
			key.position.set(4, 6, 6);
			scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

			const resize = () => {
				const { clientWidth: w, clientHeight: h } = host;
				if (!w || !h) return;
				renderer.setSize(w, h, false);
				camera.aspect = w / h;
				camera.updateProjectionMatrix();
			};
			resize();
			const ro = new ResizeObserver(resize);
			ro.observe(host);

			// Theme changes repaint the plates.
			const recolor = () => {
				plateMat.color.set(readThemeColor("--color-primary-500", "#3b82f6"));
				innerMat.color.set(readThemeColor("--color-primary-800", "#1e3a8a"));
				if (reduced) renderer.render(scene, camera);
			};
			const mo = new MutationObserver(recolor);
			mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });

			const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
			const onPointer = event => {
				pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
				pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
			};
			window.addEventListener("pointermove", onPointer, { passive: true });

			// Scroll spins the bar and lets it drift up and out as the hero leaves.
			let scrollProgress = 0;
			const trigger = ScrollTrigger.create({
				trigger: host.closest("section") || host,
				start: "top top",
				end: "bottom top",
				onUpdate: self => {
					scrollProgress = self.progress;
				},
			});

			let visible = true;
			const io = new IntersectionObserver(([entry]) => {
				visible = entry.isIntersecting;
			});
			io.observe(host);

			let frame = 0;
			const clock = new THREE.Clock();
			const render = () => {
				frame = requestAnimationFrame(render);
				if (!visible) return;
				const t = clock.getElapsedTime();
				pointer.x += (pointer.tx - pointer.x) * 0.05;
				pointer.y += (pointer.ty - pointer.y) * 0.05;
				group.rotation.x = 0.35 + Math.sin(t * 0.6) * 0.08 + pointer.y * 0.18 + scrollProgress * 0.9;
				group.rotation.y = -0.55 + t * 0.12 + pointer.x * 0.3 + scrollProgress * 2.2;
				group.rotation.z = 0.18 + Math.sin(t * 0.4) * 0.05;
				group.position.y = Math.sin(t * 0.9) * 0.18 + scrollProgress * 2.4;
				renderer.render(scene, camera);
			};
			if (reduced) renderer.render(scene, camera);
			else render();
			host.dataset.ready = "true";

			cleanup = () => {
				cancelAnimationFrame(frame);
				trigger.kill();
				io.disconnect();
				ro.disconnect();
				mo.disconnect();
				window.removeEventListener("pointermove", onPointer);
				scene.traverse(obj => {
					obj.geometry?.dispose?.();
				});
				[plateMat, innerMat, steel].forEach(m => m.dispose());
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

	return <div ref={hostRef} className={`hm-dumbbell ${className}`} aria-hidden="true" />;
}
