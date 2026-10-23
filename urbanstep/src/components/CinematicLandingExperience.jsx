import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Sparkles, Compass, ShieldCheck, Zap, ArrowDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/**
 * CinematicLandingExperience — Experiencia 3D Cinematográfica con Three.js + GSAP ScrollTrigger
 * Controla profundidad 3D, paralaje, iluminación suave, sombras de contacto y movimiento de cámara contínuo al hacer scroll.
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
        renderer.toneMappingExposure = isDark ? 1.15 : 1.0;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // -------------------------------------------------------------
        // 2. ILLUMINATION & DYNAMIC LIGHTING
        // -------------------------------------------------------------
        // Ambient fill light
        const ambientLight = new THREE.AmbientLight(
            isDark ? 0x1e293b : 0xf8fafc,
            isDark ? 1.2 : 1.8
        );
        scene.add(ambientLight);

        // Key spotlight casting contact shadows
        const keyLight = new THREE.SpotLight(0x3b82f6, 3.5);
        keyLight.position.set(5, 7, 6);
        keyLight.angle = Math.PI / 4;
        keyLight.penumbra = 0.6;
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 25;
        keyLight.shadow.bias = -0.0001;
        scene.add(keyLight);

        // Electric indigo rim light (depth contour)
        const rimLight = new THREE.PointLight(0x6366f1, 2.8, 15);
        rimLight.position.set(-6, 3, -2);
        scene.add(rimLight);

        // Cyber cyan underglow light
        const cyanLight = new THREE.PointLight(0x06b6d4, 2.2, 12);
        cyanLight.position.set(2, -4, 3);
        scene.add(cyanLight);

        // -------------------------------------------------------------
        // 3. PARAMETRIC 3D SNEAKER SCULPT (Sculpted with realistic materials)
        // -------------------------------------------------------------
        const sneakerGroup = new THREE.Group();

        // 3.1 Outsole / Cushioning Base
        const soleGeometry = new THREE.CylinderGeometry(1.2, 1.4, 0.45, 32);
        soleGeometry.scale(1.8, 0.7, 0.9);
        const soleMaterial = new THREE.MeshStandardMaterial({
            color: isDark ? 0x111827 : 0xe2e8f0,
            roughness: 0.35,
            metalness: 0.25,
            flatShading: false
        });
        const soleMesh = new THREE.Mesh(soleGeometry, soleMaterial);
        soleMesh.position.set(0, -0.65, 0);
        soleMesh.castShadow = true;
        soleMesh.receiveShadow = true;
        sneakerGroup.add(soleMesh);

        // 3.2 Translucent Air-Cushion Pod
        const airPodGeo = new THREE.TorusGeometry(0.85, 0.18, 16, 32);
        airPodGeo.scale(1.4, 0.6, 0.8);
        const airPodMat = new THREE.MeshPhysicalMaterial({
            color: 0x3b82f6,
            emissive: 0x1d4ed8,
            emissiveIntensity: 0.35,
            roughness: 0.1,
            transmission: 0.85,
            thickness: 0.5,
            transparent: true,
            opacity: 0.85
        });
        const airPod = new THREE.Mesh(airPodGeo, airPodMat);
        airPod.position.set(-0.2, -0.6, 0);
        airPod.rotation.x = Math.PI / 2;
        sneakerGroup.add(airPod);

        // 3.3 Aerodynamic Upper Body
        const upperGeo = new THREE.ConeGeometry(1.35, 2.6, 32);
        upperGeo.scale(1.5, 0.55, 0.85);
        const upperMat = new THREE.MeshStandardMaterial({
            color: isDark ? 0x0f172a : 0xffffff,
            roughness: 0.4,
            metalness: 0.15
        });
        const upperMesh = new THREE.Mesh(upperGeo, upperMat);
        upperMesh.position.set(0.1, -0.1, 0);
        upperMesh.rotation.z = -Math.PI / 2.3;
        upperMesh.castShadow = true;
        sneakerGroup.add(upperMesh);

        // 3.4 Neon Speed Swoop / Accent Ribbon
        const swoopCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-1.3, -0.2, 0.75),
            new THREE.Vector3(-0.4, 0.1, 0.82),
            new THREE.Vector3(0.6, 0.25, 0.78),
            new THREE.Vector3(1.4, -0.05, 0.65)
        ]);
        const swoopGeo = new THREE.TubeGeometry(swoopCurve, 32, 0.08, 12, false);
        const swoopMat = new THREE.MeshStandardMaterial({
            color: 0x3b82f6,
            emissive: 0x2563eb,
            emissiveIntensity: 0.85,
            roughness: 0.2,
            metalness: 0.8
        });
        const swoopMesh = new THREE.Mesh(swoopGeo, swoopMat);
        sneakerGroup.add(swoopMesh);

        // Also add swoop on reverse side
        const swoopMesh2 = swoopMesh.clone();
        swoopMesh2.scale.set(1, 1, -1);
        sneakerGroup.add(swoopMesh2);

        // 3.5 Contact Shadow Plane directly underneath
        const shadowPlaneGeo = new THREE.PlaneGeometry(5, 5);
        const canvasShadow = document.createElement('canvas');
        canvasShadow.width = 128;
        canvasShadow.height = 128;
        const ctx = canvasShadow.getContext('2d');
        const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
        gradient.addColorStop(0, isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15,23,42,0.45)');
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
        shadowMesh.position.set(0, -1.25, 0);
        scene.add(shadowMesh);

        // -------------------------------------------------------------
        // 4. LAYERED 3D DEPTH HUD RINGS & PARTICLES
        // -------------------------------------------------------------
        // Holographic Gyro Ring
        const ringGeo = new THREE.RingGeometry(2.2, 2.23, 64);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: isDark ? 0.25 : 0.4,
            side: THREE.DoubleSide
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.4;
        scene.add(ringMesh);

        const ringMesh2 = new THREE.Mesh(
            new THREE.RingGeometry(2.8, 2.82, 64),
            new THREE.MeshBasicMaterial({
                color: 0x6366f1,
                transparent: true,
                opacity: isDark ? 0.18 : 0.3,
                side: THREE.DoubleSide
            })
        );
        ringMesh2.rotation.y = Math.PI / 3;
        scene.add(ringMesh2);

        // 1,200 Floating 3D Micro-Particles (Stardust & Embers)
        const particleCount = 650;
        const particleGeo = new THREE.BufferGeometry();
        const posArray = new Float32Array(particleCount * 3);
        const colorArray = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            posArray[i] = (Math.random() - 0.5) * 16;
            posArray[i + 1] = (Math.random() - 0.5) * 12;
            posArray[i + 2] = (Math.random() - 0.5) * 14;

            // Cyan and Electric Blue hues
            const isBlue = Math.random() > 0.4;
            colorArray[i] = isBlue ? 0.23 : 0.05;
            colorArray[i + 1] = isBlue ? 0.51 : 0.71;
            colorArray[i + 2] = 0.96;
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

        scene.add(sneakerGroup);

        // Initial orientation
        sneakerGroup.position.set(1.4, 0.2, 0);
        sneakerGroup.rotation.set(0.35, -0.65, 0.15);

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

            // SCENE STAGE 1 -> 2: Zoom in, 360 degree spin, dynamic elevation
            tl.to(sneakerGroup.position, {
                x: 0,
                y: 0.3,
                z: 1.2,
                duration: 2,
                ease: 'power2.inOut'
            }, 0);

            tl.to(sneakerGroup.rotation, {
                y: Math.PI * 2 - 0.65,
                x: 0.1,
                z: -0.15,
                duration: 2,
                ease: 'power2.inOut'
            }, 0);

            tl.to(camera.position, {
                z: 5.2,
                y: 0.4,
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

            // SCENE STAGE 2 -> 3: Dock into catalog drops, smooth tilt down, settle
            tl.to(sneakerGroup.position, {
                x: -1.6,
                y: -1.0,
                z: 0.2,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);

            tl.to(sneakerGroup.rotation, {
                y: Math.PI * 2.8,
                x: 0.4,
                z: 0.2,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);

            tl.to(sneakerGroup.scale, {
                x: 0.8,
                y: 0.8,
                z: 0.8,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);

            tl.to(camera.position, {
                z: 7.2,
                y: -0.6,
                duration: 2,
                ease: 'power2.inOut'
            }, 2);

            tl.to(shadowMesh.position, {
                x: -1.6,
                y: -2.0,
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

            // Subtle continuous floating breathing
            const breatheOffset = Math.sin(elapsedTime * 1.5) * 0.06;
            sneakerGroup.position.y += breatheOffset * 0.05;

            // Gentle parallax rotation following mouse
            camera.position.x = currentMouseX * 0.65;
            camera.position.y = -currentMouseY * 0.45;
            camera.lookAt(0, 0, 0);

            // Orbit ambient particles slowly
            particleField.rotation.y = elapsedTime * 0.03;
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
                            <span>VISTA 3D CINEMATOGRÁFICA · SCROLL CONTROLL</span>
                        </div>

                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] text-gray-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>FASE {currentSceneStage}/3: {currentSceneStage === 1 ? 'HERO PERSPECTIVE' : currentSceneStage === 2 ? '360° SNEAKER LAB' : 'CATALOG DOCK'}</span>
                        </div>
                    </div>

                    {/* Stage 2 Depth Badge Pill (appears during mid-scroll) */}
                    {currentSceneStage === 2 && (
                        <div className="self-center flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-blue-500/40 text-white shadow-2xl animate-fade-in">
                            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                            <span className="text-xs font-bold uppercase tracking-wider font-mono">
                                ROTACIÓN 360° SNEAKER LAB · AMORTIGUACIÓN AIR & CARBONO
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
