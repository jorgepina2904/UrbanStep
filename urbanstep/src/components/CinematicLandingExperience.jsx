import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Compass, Zap, ArrowDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicLandingExperience — Experiencia 3D Cinematográfica con Three.js + GSAP ScrollTrigger
 * Diseñado con el Emblema Oficial UrbanStep en 3D:
 * - Corona real en cian neón (Crown)
 * - Letra 'U' en cromo pulido / plata metálica con biseles aerodinámicos
 * - Letra 'S' en azul eléctrico brillante / lacquer
 * - Silueta de sneaker incrustada en la unión central con swoosh y estelas de velocidad
 * Posicionado estratégicamente a la izquierda para máxima visibilidad sin ser tapado por las tarjetas de producto.
 */
export default function CinematicLandingExperience({ isDark = true, activeBrand = 'URBANSTEP' }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const scrollProxyRef = useRef(null);
    const [webglSupported, setWebglSupported] = useState(true);
    const [currentSceneStage, setCurrentSceneStage] = useState(1); // 1: Hero, 2: 360 Feature, 3: Catalog Dock

    useEffect(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        if (!container || !canvas) return;

        // Check WebGL support
        try {
            const testCanvas = document.createElement('canvas');
            const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
            if (!gl) {
                setWebglSupported(false);
                return;
            }
        } catch {
            setWebglSupported(false);
            return;
        }

        // -------------------------------------------------------------
        // 1. THREE.JS SCENE, CAMERA & RENDERER SETUP
        // -------------------------------------------------------------
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            45,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        camera.position.set(0, 0, 7.5);

        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = isDark ? 1.25 : 1.05;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // -------------------------------------------------------------
        // 2. ILLUMINATION & DYNAMIC LIGHTING
        // -------------------------------------------------------------
        // Ambient fill light
        const ambientLight = new THREE.AmbientLight(
            isDark ? 0x1e293b : 0xf8fafc,
            isDark ? 1.4 : 1.9
        );
        scene.add(ambientLight);

        // Key spotlight casting contact shadows on metallic facets
        const keyLight = new THREE.SpotLight(0x38bdf8, 4.2);
        keyLight.position.set(-3, 6, 6);
        keyLight.angle = Math.PI / 4;
        keyLight.penumbra = 0.55;
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 25;
        keyLight.shadow.bias = -0.0001;
        scene.add(keyLight);

        // Electric blue fill spotlight from right side
        const fillLight = new THREE.SpotLight(0x2563eb, 3.5);
        fillLight.position.set(5, 4, 5);
        fillLight.angle = Math.PI / 3.5;
        fillLight.penumbra = 0.7;
        scene.add(fillLight);

        // Electric indigo rim light (depth contour)
        const rimLight = new THREE.PointLight(0x818cf8, 3.2, 16);
        rimLight.position.set(-6, 2, -3);
        scene.add(rimLight);

        // Cyber cyan underglow light
        const cyanUnderglow = new THREE.PointLight(0x00f2fe, 2.5, 12);
        cyanUnderglow.position.set(-1.8, -3.5, 2.5);
        scene.add(cyanUnderglow);

        // -------------------------------------------------------------
        // 3. URBANSTEP 3D EMBLEM SCULPT (Crown + U + S + Embedded Sneaker)
        // -------------------------------------------------------------
        const logoGroup = new THREE.Group();

        // 3.1 Materials
        const chromeMaterial = new THREE.MeshStandardMaterial({
            color: isDark ? 0xf8fafc : 0xffffff,
            roughness: 0.16,
            metalness: 0.92,
            flatShading: false
        });

        const electricBlueMaterial = new THREE.MeshStandardMaterial({
            color: 0x1d4ed8,
            emissive: 0x1e40af,
            emissiveIntensity: 0.45,
            roughness: 0.22,
            metalness: 0.8
        });

        const crownMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x00d2ff,
            emissive: 0x0099ff,
            emissiveIntensity: 0.85,
            roughness: 0.12,
            metalness: 0.88,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        const sneakerSoleMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.25,
            metalness: 0.1
        });

        const sneakerUpperMaterial = new THREE.MeshStandardMaterial({
            color: 0x09090b,
            roughness: 0.35,
            metalness: 0.3
        });

        const swooshMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x00e5ff,
            emissiveIntensity: 0.75,
            roughness: 0.15,
            metalness: 0.5
        });

        // 3.2 Crown Mesh (3 royal points on top of the 'U')
        const crownShape = new THREE.Shape();
        crownShape.moveTo(-0.42, 0);
        crownShape.lineTo(0.42, 0);
        crownShape.lineTo(0.62, 0.52); // right tip
        crownShape.lineTo(0.2, 0.24);   // right valley
        crownShape.lineTo(0.0, 0.82);   // center tall point
        crownShape.lineTo(-0.2, 0.24);  // left valley
        crownShape.lineTo(-0.62, 0.52); // left tip
        crownShape.closePath();

        const crownGeo = new THREE.ExtrudeGeometry(crownShape, {
            depth: 0.16,
            bevelEnabled: true,
            bevelSegments: 3,
            bevelSize: 0.035,
            bevelThickness: 0.035
        });
        const crownMesh = new THREE.Mesh(crownGeo, crownMaterial);
        crownMesh.position.set(-0.25, 1.28, 0.05);
        crownMesh.rotation.z = -0.12;
        crownMesh.castShadow = true;
        logoGroup.add(crownMesh);

        // 3.3 Stylized Italic Letter "U" (Polished Chrome / Silver)
        const uShape = new THREE.Shape();
        uShape.moveTo(-1.25, 1.25);
        uShape.lineTo(-0.52, 1.25);
        uShape.lineTo(-0.68, -0.1);
        uShape.quadraticCurveTo(-0.58, -0.65, 0.0, -0.65);
        uShape.lineTo(0.35, 0.65);
        uShape.lineTo(0.9, 0.65);
        uShape.lineTo(0.45, -0.65);
        uShape.quadraticCurveTo(-0.18, -1.2, -1.02, -0.65);
        uShape.lineTo(-1.42, 1.05);
        uShape.closePath();

        const uGeo = new THREE.ExtrudeGeometry(uShape, {
            depth: 0.24,
            bevelEnabled: true,
            bevelSegments: 4,
            bevelSize: 0.045,
            bevelThickness: 0.045
        });
        const uMesh = new THREE.Mesh(uGeo, chromeMaterial);
        uMesh.position.set(-0.15, 0, 0);
        uMesh.castShadow = true;
        uMesh.receiveShadow = true;
        logoGroup.add(uMesh);

        // 3.4 Stylized Italic Letter "S" (Electric Royal Blue)
        const sShape = new THREE.Shape();
        sShape.moveTo(0.35, 1.15);
        sShape.lineTo(1.65, 1.15);
        sShape.lineTo(1.5, 0.72);
        sShape.lineTo(0.75, 0.72);
        sShape.lineTo(0.85, 0.38);
        sShape.lineTo(1.55, 0.38);
        sShape.quadraticCurveTo(1.85, -0.15, 1.35, -0.75);
        sShape.lineTo(-0.05, -0.75);
        sShape.lineTo(0.28, -0.38);
        sShape.lineTo(1.0, -0.38);
        sShape.quadraticCurveTo(1.22, -0.18, 1.12, 0.0);
        sShape.lineTo(0.35, 0.0);
        sShape.quadraticCurveTo(0.18, 0.55, 0.35, 1.15);
        sShape.closePath();

        const sGeo = new THREE.ExtrudeGeometry(sShape, {
            depth: 0.22,
            bevelEnabled: true,
            bevelSegments: 4,
            bevelSize: 0.045,
            bevelThickness: 0.045
        });
        const sMesh = new THREE.Mesh(sGeo, electricBlueMaterial);
        sMesh.position.set(-0.1, 0, -0.02);
        sMesh.castShadow = true;
        sMesh.receiveShadow = true;
        logoGroup.add(sMesh);

        // 3.5 Embedded Sneaker Silhouette inside the central notch
        const sneakerEmblemGroup = new THREE.Group();

        // Sneaker Outsole
        const soleShape = new THREE.Shape();
        soleShape.moveTo(0.05, -0.72);
        soleShape.quadraticCurveTo(0.65, -0.78, 1.25, -0.58);
        soleShape.lineTo(1.3, -0.46);
        soleShape.quadraticCurveTo(0.7, -0.62, 0.15, -0.58);
        soleShape.closePath();

        const soleGeo = new THREE.ExtrudeGeometry(soleShape, {
            depth: 0.16,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.02,
            bevelThickness: 0.02
        });
        const soleMesh = new THREE.Mesh(soleGeo, sneakerSoleMaterial);
        sneakerEmblemGroup.add(soleMesh);

        // Sneaker Upper Body
        const upperShape = new THREE.Shape();
        upperShape.moveTo(0.18, -0.58);
        upperShape.lineTo(0.42, -0.26);
        upperShape.quadraticCurveTo(0.55, -0.22, 0.68, -0.32);
        upperShape.lineTo(0.9, -0.38);
        upperShape.quadraticCurveTo(1.22, -0.42, 1.28, -0.46);
        upperShape.lineTo(0.18, -0.58);
        upperShape.closePath();

        const upperGeo = new THREE.ExtrudeGeometry(upperShape, {
            depth: 0.14,
            bevelEnabled: true,
            bevelSegments: 2,
            bevelSize: 0.02,
            bevelThickness: 0.02
        });
        const upperMesh = new THREE.Mesh(upperGeo, sneakerUpperMaterial);
        sneakerEmblemGroup.add(upperMesh);

        // Dynamic Swoosh Ribbon
        const swooshCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0.32, -0.52, 0.16),
            new THREE.Vector3(0.55, -0.46, 0.17),
            new THREE.Vector3(0.85, -0.42, 0.16),
            new THREE.Vector3(1.18, -0.48, 0.15)
        ]);
        const swooshGeo = new THREE.TubeGeometry(swooshCurve, 24, 0.035, 10, false);
        const swooshMesh = new THREE.Mesh(swooshGeo, swooshMaterial);
        sneakerEmblemGroup.add(swooshMesh);

        // Speed Streaks / Aerodynamic slashes (3 slashes trailing bottom-left)
        const streakCoords = [
            [[-0.1, -0.65], [-0.65, -0.82], [-0.58, -0.86], [-0.08, -0.70]],
            [[-0.15, -0.78], [-0.95, -1.02], [-0.88, -1.06], [-0.12, -0.83]],
            [[-0.25, -0.90], [-0.75, -1.12], [-0.70, -1.16], [-0.22, -0.95]]
        ];

        streakCoords.forEach((pts, idx) => {
            const strkShape = new THREE.Shape();
            strkShape.moveTo(pts[0][0], pts[0][1]);
            strkShape.lineTo(pts[1][0], pts[1][1]);
            strkShape.lineTo(pts[2][0], pts[2][1]);
            strkShape.lineTo(pts[3][0], pts[3][1]);
            strkShape.closePath();

            const strkGeo = new THREE.ExtrudeGeometry(strkShape, {
                depth: 0.08,
                bevelEnabled: true,
                bevelSegments: 2,
                bevelSize: 0.015,
                bevelThickness: 0.015
            });
            const strkMat = idx === 1 ? chromeMaterial : electricBlueMaterial;
            const strkMesh = new THREE.Mesh(strkGeo, strkMat);
            sneakerEmblemGroup.add(strkMesh);
        });

        sneakerEmblemGroup.position.set(-0.05, 0.02, 0.06);
        logoGroup.add(sneakerEmblemGroup);

        // Internal Emblem Point Light for gleaming specular highlights
        const innerGleam = new THREE.PointLight(0x00d2ff, 1.6, 4.5);
        innerGleam.position.set(0.1, 0.2, 0.8);
        logoGroup.add(innerGleam);

        // 3.6 Contact Shadow Plane directly underneath
        const shadowPlaneGeo = new THREE.PlaneGeometry(6, 6);
        const canvasShadow = document.createElement('canvas');
        canvasShadow.width = 128;
        canvasShadow.height = 128;
        const ctx = canvasShadow.getContext('2d');
        const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
        gradient.addColorStop(0, isDark ? 'rgba(0,0,0,0.88)' : 'rgba(15,23,42,0.4)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);

        const shadowTexture = new THREE.CanvasTexture(canvasShadow);
        const shadowMat = new THREE.MeshBasicMaterial({
            map: shadowTexture,
            transparent: true,
            opacity: 0.75,
            depthWrite: false
        });
        const shadowMesh = new THREE.Mesh(shadowPlaneGeo, shadowMat);
        shadowMesh.rotation.x = -Math.PI / 2;
        scene.add(shadowMesh);

        // -------------------------------------------------------------
        // 4. LAYERED 3D DEPTH HUD RINGS & PARTICLES
        // -------------------------------------------------------------
        // Holographic Gyro Ring
        const ringGeo = new THREE.RingGeometry(2.3, 2.34, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: isDark ? 0.28 : 0.42,
            side: THREE.DoubleSide
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.3;
        scene.add(ringMesh);

        const ringMesh2 = new THREE.Mesh(
            new THREE.RingGeometry(2.9, 2.92, 64),
            new THREE.MeshBasicMaterial({
                color: 0x6366f1,
                transparent: true,
                opacity: isDark ? 0.18 : 0.3,
                side: THREE.DoubleSide
            })
        );
        ringMesh2.rotation.y = Math.PI / 3;
        scene.add(ringMesh2);

        // 1,200 Floating 3D Micro-Particles (Cyan & Electric Blue)
        const particleCount = 700;
        const particleGeo = new THREE.BufferGeometry();
        const posArray = new Float32Array(particleCount * 3);
        const colorArray = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            posArray[i] = (Math.random() - 0.5) * 16;
            posArray[i + 1] = (Math.random() - 0.5) * 12;
            posArray[i + 2] = (Math.random() - 0.5) * 14;

            const isBlue = Math.random() > 0.4;
            colorArray[i] = isBlue ? 0.15 : 0.02;
            colorArray[i + 1] = isBlue ? 0.45 : 0.85;
            colorArray[i + 2] = 0.98;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.055,
            vertexColors: true,
            transparent: true,
            opacity: isDark ? 0.65 : 0.4,
            blending: THREE.AdditiveBlending
        });
        const particleField = new THREE.Points(particleGeo, particleMat);
        scene.add(particleField);

        scene.add(logoGroup);

        // Responsive position: On desktop/widescreen move to the LEFT side (x: -2.25)
        // so it never overlaps the product card on the right and stays prominently visible!
        const isWide = container.clientWidth >= 1280;
        const isDesktop = container.clientWidth >= 1024;
        const initialX = isWide ? -2.25 : (isDesktop ? -1.95 : 0);
        const initialY = isDesktop ? 0.2 : 0.45;
        const initialZ = isDesktop ? 0.15 : -0.5;
        const initialScale = isWide ? 1.2 : (isDesktop ? 1.05 : 0.85);

        logoGroup.position.set(initialX, initialY, initialZ);
        logoGroup.rotation.set(0.18, 0.42, -0.06);
        logoGroup.scale.set(initialScale, initialScale, initialScale);

        shadowMesh.position.set(initialX, -1.35, initialZ);
        ringMesh.position.set(initialX, initialY, initialZ);
        ringMesh2.position.set(initialX, initialY, initialZ);

        // -------------------------------------------------------------
        // 5. GSAP SCROLLTRIGGER CINEMATIC CONTINUOUS TIMELINE
        // -------------------------------------------------------------
        const scrollProxy = scrollProxyRef.current;
        let tl = null;

        if (scrollProxy) {
            tl = gsap.timeline({
                scrollTrigger: {
                    trigger: scrollProxy,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 1.2,
                    onUpdate: (self) => {
                        const progress = self.progress;
                        if (progress < 0.35) {
                            setCurrentSceneStage(1);
                        } else if (progress < 0.75) {
                            setCurrentSceneStage(2);
                        } else {
                            setCurrentSceneStage(3);
                        }
                    }
                }
            });

            // SCENE STAGE 1 -> 2: Glide to center stage, full 360° spin, zoom in
            tl.to(logoGroup.position, {
                x: 0,
                y: 0.25,
                z: 1.35,
                duration: 2,
                ease: 'power2.inOut'
            }, 0);

            tl.to(shadowMesh.position, {
                x: 0,
                y: -1.35,
                z: 1.35,
                duration: 2,
                ease: 'power2.inOut'
            }, 0);

            tl.to(ringMesh.position, {
                x: 0,
                y: 0.25,
                z: 1.35,
                duration: 2,
                ease: 'power2.inOut'
            }, 0);

            tl.to(ringMesh2.position, {
                x: 0,
                y: 0.25,
                z: 1.35,
                duration: 2,
                ease: 'power2.inOut'
            }, 0);

            tl.to(logoGroup.rotation, {
                y: Math.PI * 2 + 0.42,
                x: 0.08,
                z: -0.08,
                duration: 2,
                ease: 'power2.inOut'
            }, 0);

            tl.to(camera.position, {
                z: 5.4,
                y: 0.35,
                duration: 2,
                ease: 'power2.inOut'
            }, 0);

            tl.to(ringMesh.rotation, {
                z: Math.PI * 1.5,
                duration: 2,
                ease: 'none'
            }, 0);

            tl.to(particleField.position, {
                z: 4,
                duration: 2,
                ease: 'none'
            }, 0);

            // SCENE STAGE 2 -> 3: Dock into catalog section smoothly
            tl.to(logoGroup.position, {
                x: -1.75,
                y: -0.95,
                z: 0.15,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);

            tl.to(shadowMesh.position, {
                x: -1.75,
                y: -2.1,
                z: 0.15,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);

            tl.to(logoGroup.rotation, {
                y: Math.PI * 2.8,
                x: 0.35,
                z: 0.15,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);

            tl.to(logoGroup.scale, {
                x: 0.9,
                y: 0.9,
                z: 0.9,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);

            tl.to(camera.position, {
                z: 7.2,
                y: -0.6,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);
        }

        // -------------------------------------------------------------
        // 6. MOUSE GYROSCOPE / PARALLAX INTERACTION (SMOOTH LERP)
        // -------------------------------------------------------------
        let targetMouseX = 0;
        let targetMouseY = 0;
        let currentMouseX = 0;
        let currentMouseY = 0;

        const handleMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            targetMouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
            targetMouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });

        // -------------------------------------------------------------
        // 7. CONTINUOUS RENDER LOOP (RAF)
        // -------------------------------------------------------------
        let animationFrameId;
        let clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const elapsedTime = clock.getElapsedTime();

            // Smooth mouse interpolation (lerp)
            currentMouseX += (targetMouseX - currentMouseX) * 0.05;
            currentMouseY += (targetMouseY - currentMouseY) * 0.05;

            // Subtle continuous breathing
            const breatheOffset = Math.sin(elapsedTime * 1.5) * 0.05;
            logoGroup.position.y += breatheOffset * 0.04;

            // Gentle parallax rotation following mouse
            camera.position.x = currentMouseX * 0.55;
            camera.position.y = -currentMouseY * 0.35;
            camera.lookAt(0, 0, 0);

            // Orbit ambient particles slowly
            particleField.rotation.y = elapsedTime * 0.025;
            ringMesh.rotation.z += delta * 0.15;
            ringMesh2.rotation.x += delta * 0.1;

            renderer.render(scene, camera);
        };

        animate();

        // -------------------------------------------------------------
        // 8. RESIZE OBSERVER
        // -------------------------------------------------------------
        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        window.addEventListener('resize', handleResize);

        // -------------------------------------------------------------
        // CLEANUP
        // -------------------------------------------------------------
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            if (tl) tl.kill();
            ScrollTrigger.getAll().forEach(st => {
                if (st.trigger === scrollProxy) st.kill();
            });
            renderer.dispose();
            scene.clear();
        };
    }, [isDark]);

    if (!webglSupported) {
        return null;
    }

    return (
        <div ref={containerRef} className="relative w-full overflow-hidden select-none">
            {/* Scroll Proxy Anchor: Drives the 3 cinematic timeline stages seamlessly */}
            <div ref={scrollProxyRef} className="absolute inset-0 h-[220vh] pointer-events-none -z-10" />

            {/* Three.js WebGL Canvas (Sticks while user scrolls through the 220vh experience) */}
            <div className="sticky top-0 h-[92vh] w-full pointer-events-none z-0">
                <canvas ref={canvasRef} className="w-full h-full block" />

                {/* Layered 3D Depth Typography & Parallax Badges */}
                <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-12 pointer-events-none">
                    {/* Top HUD Tag */}
                    <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600/10 backdrop-blur-md border border-blue-500/20 text-blue-400">
                            <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
                            <span>URBANSTEP 3D CINEMATIC · LOGO EMBLEM EXP</span>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] text-gray-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>FASE {currentSceneStage}/3: {currentSceneStage === 1 ? 'HERO EMBLEM PERSPECTIVE' : currentSceneStage === 2 ? '360° 3D LOGO LAB' : 'CATALOG DOCK'}</span>
                        </div>
                    </div>

                    {/* Stage 2 Depth Badge Pill (appears during mid-scroll) */}
                    {currentSceneStage === 2 && (
                        <div className="self-center flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-blue-500/40 text-white shadow-2xl animate-fade-in">
                            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider font-mono">
                                ROTACIÓN 360° URBANSTEP 3D EMBLEM · SNEAKERS & STREETWEAR CULTURE
                            </span>
                        </div>
                    )}

                    {/* Scroll Prompt Arrow */}
                    <div className="self-center flex flex-col items-center gap-1.5 text-gray-400 text-[11px] font-mono animate-bounce">
                        <span>Desplaza hacia abajo para navegar la experiencia</span>
                        <ArrowDown className="w-4 h-4 text-blue-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}
