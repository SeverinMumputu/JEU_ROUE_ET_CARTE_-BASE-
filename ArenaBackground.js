/***
2️Classe 1 : ArenaBackground
🎭 Rôle général
Cette classe gère tout l’environnement visuel 3D de l’arène :
décor
lumières
sol
effets visuels (luciole, brouillard)
indicateurs visuels de tour (cristaux)
👉 Elle ne contient aucune logique de jeu.
Elle montre visuellement ce que la logique décide ailleurs.  
 */

export default class ArenaBackground {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.fireflies = null;
        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2();

        this.turnCrystalTop = null;
        this.turnCrystalBottom = null;

        this.init();
    }
            init() {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                this.container.appendChild(this.renderer.domElement);
                this.scene.fog = new THREE.FogExp2(0x0f172a, 0.035);
                this.scene.background = new THREE.Color(0x0f172a);
                this.addLights();
                this.addFloor();
                this.addFireflies();
                this.addTurnCrystals(); // Ajout des cristaux
                this.camera.position.set(0, 4, 12);
                this.camera.lookAt(0, 0, 0);
                window.addEventListener('resize', this.onResize.bind(this));
                document.addEventListener('mousemove', this.onMouseMove.bind(this));
                this.animate();
            }
            addLights() {
                const moonLight = new THREE.DirectionalLight(0x94a3b8, 0.6); moonLight.position.set(-10, 20, -10); this.scene.add(moonLight);
                const ambientLight = new THREE.AmbientLight(0x1e293b, 0.8); this.scene.add(ambientLight);
                const warmLight = new THREE.PointLight(0xfbbf24, 0.8, 25); warmLight.position.set(5, 2, 8); this.scene.add(warmLight);
            }
            addFloor() {
                const geometry = new THREE.PlaneGeometry(100, 100);
                const material = new THREE.MeshStandardMaterial({ color: 0x1a202c, roughness: 0.9, metalness: 0.1 });
                const plane = new THREE.Mesh(geometry, material);
                plane.rotation.x = -Math.PI / 2; plane.position.y = -2; this.scene.add(plane);
                const gridHelper = new THREE.GridHelper(60, 40, 0x334155, 0x0f172a);
                gridHelper.position.y = -1.9; gridHelper.material.opacity = 0.1; gridHelper.material.transparent = true; this.scene.add(gridHelper);
            }
            addFireflies() {
                const particleCount = 150;
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(particleCount * 3);
                const colors = new Float32Array(particleCount * 3);
                const sizes = new Float32Array(particleCount);
                const phases = new Float32Array(particleCount);
                const colorFirefly = new THREE.Color(0xfef3c7);
                for (let i = 0; i < particleCount; i++) {
                    positions[i * 3] = (Math.random() - 0.5) * 40;
                    positions[i * 3 + 1] = Math.random() * 10;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
                    colors[i * 3] = colorFirefly.r; colors[i * 3 + 1] = colorFirefly.g; colors[i * 3 + 2] = colorFirefly.b;
                    sizes[i] = Math.random() * 0.15 + 0.05; phases[i] = Math.random() * Math.PI * 2;
                }
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
                geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
                const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
                this.fireflies = new THREE.Points(geometry, material);
                this.scene.add(this.fireflies);
                this.fireflies.initialPositions = positions.slice();
            }
            addTurnCrystals() {
                const geometry = new THREE.IcosahedronGeometry(0.5, 0);
                const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0 });
                
                // Cristal Haut (IA) - positionné approximativement au dessus
                this.turnCrystalTop = new THREE.Mesh(geometry, material.clone());
                this.turnCrystalTop.position.set(0, 3, -3);
                this.scene.add(this.turnCrystalTop);

                // Cristal Bas (Joueur)
                this.turnCrystalBottom = new THREE.Mesh(geometry, material.clone());
                this.turnCrystalBottom.position.set(0, 0, 3);
                this.scene.add(this.turnCrystalBottom);
            }
            updateTurnVisuals(player, phase) {
                const activeCrystal = player === 'player' ? this.turnCrystalBottom : this.turnCrystalTop;
                const inactiveCrystal = player === 'player' ? this.turnCrystalTop : this.turnCrystalBottom;

                if (activeCrystal && inactiveCrystal) {
                    // Désactiver l'autre
                    inactiveCrystal.material.opacity = 0;
                    
                    // Activer le courant
                    activeCrystal.material.opacity = 0.8;
                    const color = phase === 1 ? 0xfbbf24 : 0xff0000; // Or ou Rouge
                    activeCrystal.material.color.setHex(color);
                    
                    // Rotation speed storage in userData for animation loop
                    activeCrystal.userData.spinSpeed = phase === 1 ? 0.01 : 0.1;
                }
            }
            onResize() {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
            }
            onMouseMove(event) {
                this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            }
            animate() {
                requestAnimationFrame(this.animate.bind(this));
                const time = this.clock.getElapsedTime();
                if (this.fireflies) {
                    const positions = this.fireflies.geometry.attributes.position.array;
                    const initial = this.fireflies.initialPositions;
                    for(let i = 0; i < positions.length / 3; i++) {
                        positions[i*3 + 1] = initial[i*3 + 1] + Math.sin(time * 0.5 + initial[i*3]) * 0.5;
                        positions[i*3] = initial[i*3] + Math.cos(time * 0.3 + initial[i*3+1]) * 0.2;
                    }
                    this.fireflies.geometry.attributes.position.needsUpdate = true;
                }
                // Animation des cristaux
                [this.turnCrystalTop, this.turnCrystalBottom].forEach(crystal => {
                    if (crystal && crystal.material.opacity > 0) {
                        crystal.rotation.y += crystal.userData.spinSpeed || 0.01;
                        crystal.rotation.x += (crystal.userData.spinSpeed || 0.01) * 0.5;
                        crystal.scale.setScalar(1 + Math.sin(time * 5) * 0.1); // Pulsation
                    }
                });

                this.camera.position.x += (this.mouse.x * 0.5 - this.camera.position.x) * 0.05;
                this.camera.position.y += (4 + this.mouse.y * 0.2 - this.camera.position.y) * 0.05;
                this.camera.lookAt(0, 0, 0);
                this.renderer.render(this.scene, this.camera);
            }
}