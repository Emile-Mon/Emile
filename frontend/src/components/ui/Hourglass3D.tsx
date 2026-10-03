'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Hourglass } from '@/components/ui/Hourglass';

interface Props {
  /** Sand level 0–100: how much sand has fallen into the bottom bulb. Comes from the model run. */
  pct: number;
  className?: string;
}

// Glass silhouette as radius over height. y runs from -H (bottom) to +H (top); the neck is at y = 0.
const H = 2;
const SAND_TOP = H - 0.08;
const NECK_GAP = 0.05;

function glassRadius(y: number) {
  const t = Math.min(1, Math.abs(y) / H);
  if (t <= 0.62) return 0.09 + 0.91 * Math.pow(Math.sin((Math.PI / 2) * (t / 0.62)), 1.35);
  return 1.0 - 0.34 * Math.pow((t - 0.62) / 0.38, 2);
}

/**
 * WebGL hourglass (three.js): refractive glass, brass caps, sand that piles up as `pct` grows,
 * a falling stream while it runs, slow rotation and pointer tilt. Falls back to the SVG hourglass
 * when WebGL is unavailable. three is loaded on demand so it never weighs on other pages.
 */
export const Hourglass3D: React.FC<Props> = ({ pct, className }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef(Math.max(0, Math.min(100, pct)) / 100);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    targetRef.current = Math.max(0, Math.min(100, pct)) / 100;
  }, [pct]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      const THREE = await import('three');
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      if (disposed) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      } catch {
        setFallback(true);
        return;
      }

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.domElement.style.display = 'block';
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTex;

      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
      camera.position.set(0, 0.35, 10.2);
      camera.lookAt(0, 0, 0);

      // Lights: warm key, amber rim from behind, soft fill
      scene.add(new THREE.AmbientLight(0xfff1dc, 0.35));
      const key = new THREE.DirectionalLight(0xffe2b0, 1.6);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.PointLight(0xe99f30, 30, 12);
      rim.position.set(-2.5, 1, -3);
      scene.add(rim);
      const sandGlow = new THREE.PointLight(0xf5c26f, 4, 5);
      scene.add(sandGlow);

      const rig = new THREE.Group();
      scene.add(rig);

      // ---- Glass ----
      const glassPts: InstanceType<typeof THREE.Vector2>[] = [];
      for (let i = 0; i <= 120; i++) {
        const y = -H + (2 * H * i) / 120;
        glassPts.push(new THREE.Vector2(glassRadius(y), y));
      }
      const glassGeo = new THREE.LatheGeometry(glassPts, 96);
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 1, thickness: 0.2, ior: 1.45,
        transparent: true, opacity: 1, side: THREE.DoubleSide, envMapIntensity: 1.3,
        clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: new THREE.Color(0xfff2dc), attenuationDistance: 10,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.renderOrder = 2;
      rig.add(glass);

      // ---- Brass frame: caps, rims, posts ----
      const brass = new THREE.MeshStandardMaterial({ color: 0xc8862a, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
      const darkBrass = new THREE.MeshStandardMaterial({ color: 0x6b4512, metalness: 0.9, roughness: 0.45 });
      for (const sign of [1, -1]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.32, 0.2, 96), brass);
        cap.position.y = sign * (H + 0.12);
        rig.add(cap);
        const lip = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, 0.08, 96), darkBrass);
        lip.position.y = sign * (H + 0.0);
        rig.add(lip);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.045, 16, 120), brass);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = sign * (H + 0.12 + sign * 0.1);
        rig.add(ring);
      }
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2 * H, 24);
      // Four posts on the diagonals, so none sits directly behind the neck at rest
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const post = new THREE.Mesh(postGeo, brass);
        post.position.set(Math.cos(a) * 1.16, 0, Math.sin(a) * 1.16);
        rig.add(post);
        for (const s of [1, -1]) {
          const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), brass);
          knob.position.set(post.position.x, s * (H - 0.08), post.position.z);
          rig.add(knob);
        }
      }

      // ---- Sand ----
      const sandMat = new THREE.MeshStandardMaterial({
        color: 0xd9861c, roughness: 1, metalness: 0, emissive: 0x5c2a02, emissiveIntensity: 0.3,
      });
      let topSand: InstanceType<typeof THREE.Mesh> | null = null;
      let bottomSand: InstanceType<typeof THREE.Mesh> | null = null;
      const inner = (y: number) => glassRadius(y) * 0.9;
      const SPAN = SAND_TOP - NECK_GAP;

      const buildSand = (p: number) => {
        for (const m of [topSand, bottomSand]) {
          if (m) { rig.remove(m); m.geometry.dispose(); }
        }
        topSand = bottomSand = null;
        const steps = 48;
        // Bottom pile: rises from the base with a mound on top
        if (p > 0.002) {
          const yTop = -SAND_TOP + p * SPAN;
          const mound = Math.min(0.22, p * 0.6) * (p >= 0.999 ? 0.3 : 1);
          const pts = [new THREE.Vector2(0, -SAND_TOP)];
          for (let i = 0; i <= steps; i++) {
            const y = -SAND_TOP + ((yTop + SAND_TOP) * i) / steps;
            pts.push(new THREE.Vector2(inner(y), y));
          }
          pts.push(new THREE.Vector2(0, yTop + mound));
          bottomSand = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), sandMat);
          rig.add(bottomSand);
          sandGlow.position.set(0, yTop + 0.2, 0.4);
        }
        // Top reserve: sits on the neck, with a funnel dip draining into it
        if (p < 0.998) {
          const ySurf = NECK_GAP + (1 - p) * SPAN;
          const funnel = Math.min(0.3, (1 - p) * 0.5);
          const pts = [new THREE.Vector2(0, NECK_GAP)];
          for (let i = 0; i <= steps; i++) {
            const y = NECK_GAP + ((ySurf - NECK_GAP) * i) / steps;
            pts.push(new THREE.Vector2(inner(y), y));
          }
          pts.push(new THREE.Vector2(0, Math.max(NECK_GAP + 0.02, ySurf - funnel)));
          topSand = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), sandMat);
          rig.add(topSand);
        }
      };

      // ---- Falling stream + grains ----
      const streamMat = new THREE.MeshStandardMaterial({ color: 0xf5c26f, emissive: 0xe99f30, emissiveIntensity: 0.8, roughness: 0.6 });
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 1, 12), streamMat);
      rig.add(stream);
      const GRAINS = 70;
      const grains = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 8, 6), streamMat, GRAINS);
      const grainSeed = Array.from({ length: GRAINS }, () => ({ o: Math.random(), dx: (Math.random() - 0.5) * 0.05, dz: (Math.random() - 0.5) * 0.05 }));
      rig.add(grains);
      const m4 = new THREE.Matrix4();

      // ---- Sizing, interaction, loop ----
      const resize = () => {
        const w = mount.clientWidth || 1;
        const h = mount.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = w / h;
        // Keep the whole glass in frame on narrow and wide boxes alike
        camera.position.z = w / h < 0.75 ? 10.2 / Math.max(0.55, (w / h) / 0.75) : 10.2;
        camera.updateProjectionMatrix();
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(mount);

      const tilt = { x: 0, y: 0 };
      const onPointer = (e: PointerEvent) => {
        const r = mount.getBoundingClientRect();
        tilt.x = ((e.clientY - r.top) / r.height - 0.5) * 0.35;
        tilt.y = ((e.clientX - r.left) / r.width - 0.5) * 0.8;
      };
      const onLeave = () => { tilt.x = 0; tilt.y = 0; };
      mount.addEventListener('pointermove', onPointer);
      mount.addEventListener('pointerleave', onLeave);

      let visible = true;
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
      io.observe(mount);

      let shown = -1;
      let spin = 0;
      let raf = 0;
      let last = performance.now();
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (!visible || document.hidden) { last = now; return; }
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        // Ease the displayed level toward the live value
        const target = targetRef.current;
        const next = shown < 0 || reduceMotion ? target : shown + (target - shown) * Math.min(1, dt * 2.5);
        if (Math.abs(next - shown) > 0.0015 || shown < 0) {
          shown = Math.abs(next - target) < 0.0015 ? target : next;
          buildSand(shown);
        }

        if (!reduceMotion) spin += dt * 0.32;
        rig.rotation.y += ((spin + tilt.y) - rig.rotation.y) * Math.min(1, dt * 4);
        rig.rotation.x += (tilt.x - rig.rotation.x) * Math.min(1, dt * 4);

        const flowing = shown > 0.002 && shown < 0.998;
        stream.visible = flowing;
        grains.visible = flowing && !reduceMotion;
        if (flowing) {
          const yTop = -SAND_TOP + shown * SPAN + Math.min(0.22, shown * 0.6);
          const len = Math.max(0.05, NECK_GAP - yTop);
          stream.scale.y = len;
          stream.position.y = NECK_GAP - len / 2;
          if (grains.visible) {
            const t = now / 1000;
            grainSeed.forEach((s, i) => {
              const f = (t * 1.6 + s.o) % 1;
              m4.makeTranslation(s.dx, NECK_GAP - f * len, s.dz);
              grains.setMatrixAt(i, m4);
            });
            grains.instanceMatrix.needsUpdate = true;
          }
        }
        // A full glass glows brighter
        sandGlow.intensity = shown >= 0.998 ? 10 + Math.sin(now / 400) * 2 : 4;
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(loop);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        mount.removeEventListener('pointermove', onPointer);
        mount.removeEventListener('pointerleave', onLeave);
        scene.traverse((obj) => {
          const mesh = obj as InstanceType<typeof THREE.Mesh>;
          if (mesh.geometry) mesh.geometry.dispose();
        });
        [glassMat, brass, darkBrass, sandMat, streamMat].forEach((m) => m.dispose());
        envTex.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => setFallback(true));

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const label = `Hourglass ${Math.round(Math.max(0, Math.min(100, pct)))}% full`;
  if (fallback) return <Hourglass pct={pct} className={className} />;
  return <div ref={mountRef} role="img" aria-label={label} className={`touch-pan-y ${className ?? 'relative'}`} />;
};
