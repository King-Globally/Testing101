"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * WavingFlag — Three.js plane-mesh flag with the Jamiat Joburg logo as texture.
 * - Realistic wind: two superposed sine waves along the X axis, anchored at the pole edge.
 * - Hardware-accelerated; respects reduced-motion preference (renders a static flag).
 * - Moderately large (used as a logo-style hero element).
 */
export default function WavingFlag({ width = 720, height = 280 }: { width?: number; height?: number }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 5.5;
    camera.position.x = 0.2;
    camera.position.y = 0;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // Lighting — soft ambient + warm key light to highlight folds
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xffe9b8, 0.55);
    keyLight.position.set(4, 6, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xb8e0c8, 0.25);
    fillLight.position.set(-4, -2, 4);
    scene.add(fillLight);

    // Flag geometry — 5 x 3 with high subdivision for smooth waves
    const flagWidth = 5;
    const flagHeight = 3;
    const geometry = new THREE.PlaneGeometry(flagWidth, flagHeight, 60, 36);

    // Texture
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const texture = loader.load("/jamiat-logo.png", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    });

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.05,
    });
    const flag = new THREE.Mesh(geometry, material);
    flag.position.set(0.3, 0, 0); // shift right so pole sits at left edge
    scene.add(flag);

    // Pole — gold cylinder
    const poleGeom = new THREE.CylinderGeometry(0.06, 0.06, 4.2, 24);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xC9A03A, roughness: 0.25, metalness: 0.85,
    });
    const pole = new THREE.Mesh(poleGeom, poleMat);
    pole.position.set(-2.2, -0.4, 0);
    scene.add(pole);

    // Finial — small gold sphere on top of pole
    const finialGeom = new THREE.SphereGeometry(0.13, 24, 16);
    const finialMat = new THREE.MeshStandardMaterial({
      color: 0xD4A830, roughness: 0.18, metalness: 0.95,
    });
    const finial = new THREE.Mesh(finialGeom, finialMat);
    finial.position.set(-2.2, 1.75, 0);
    scene.add(finial);

    // Wind animation — vertex displacement on Z
    const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
    const vertex = new THREE.Vector3();
    const clock = new THREE.Clock();

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      if (!prefersReducedMotion) {
        for (let i = 0; i < positionAttr.count; i++) {
          vertex.fromBufferAttribute(positionAttr, i);
          const wave1 = 0.45 * Math.sin(vertex.x * 2.0 + time * 3.6);
          const wave2 = 0.18 * Math.sin(vertex.x * 4.2 + time * 2.7 + vertex.y * 1.4);
          const wave3 = 0.08 * Math.sin(vertex.y * 3.0 + time * 2.0);
          // Pin the left edge (near pole) so it doesn't fly off
          const t = Math.max(0, (vertex.x + flagWidth / 2) / flagWidth);
          const anchor = Math.pow(t, 1.7);
          positionAttr.setZ(i, (wave1 + wave2 + wave3) * anchor);
        }
        positionAttr.needsUpdate = true;
        geometry.computeVertexNormals();
      }
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
      poleGeom.dispose();
      poleMat.dispose();
      finialGeom.dispose();
      finialMat.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [width, height]);

  return (
    <div
      ref={mountRef}
      style={{ width: `${width}px`, height: `${height}px`, maxWidth: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}
      aria-label="Animated waving flag of the Jamiatul Ulama Johannesburg"
      role="img"
    />
  );
}
