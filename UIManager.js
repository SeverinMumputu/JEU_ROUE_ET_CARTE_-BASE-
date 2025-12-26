/**
 *  3️⃣ Classe 4 : UIManager
⚔️ Rôle général
Chef d'orchestre de l'interface :
Animations globales
Roue
Deck
Instanciation des autres classe
 */

import ArenaBackground from "./ArenaBackground.js";
import CombatManager from "./CombatManager.js";
import ArenaNetworkManager from "./ArenaNetworkManager.js";
import AudioManager from "./AudioManager.js";

export default class UIManager {
    constructor() {
        // 🎵 AUDIO GLOBAL (DISPONIBLE IMMÉDIATEMENT)
        this.audioManager = new AudioManager("The_Room.mp3");
        this.showCombatArena();
        this.initAnimations();
        this.initWheelSystem();
        this.initDeckInteraction();

        this.bg = new ArenaBackground();
        this.combatManager = new CombatManager(this, this.bg);
        // 🔊 LIAISON BOUTON SON — VERSION CORRECTE (Musique de fond)
        const soundBtn = document.getElementById('sound-toggle-btn');
        const soundOnIcon = document.getElementById('sound-on-icon');
        const soundOffIcon = document.getElementById('sound-off-icon');

        if (soundBtn) {
            soundBtn.addEventListener('click', () => {
        // ✅ ACCÈS CORRECT À CombatManager
        if (!this.combatManager.audioManager) return;

        const enabled = this.combatManager.audioManager.toggle();

        soundOnIcon.classList.toggle('hidden', !enabled);
        soundOffIcon.classList.toggle('hidden', enabled);
        }); }
        this.networkManager = new ArenaNetworkManager(this);

        const playBtn = document.getElementById('play-btn');
        const playText = document.getElementById('play-btn-text');

        if (playBtn) {
            playBtn.addEventListener('click', () => {
                playText.textContent = "EN COURS...";
                playBtn.classList.add('opacity-50', 'cursor-not-allowed');
            });
        }
    }

 showCombatArena() {
                // Helper appelé par CombatManager
                gsap.to(".combat-row-ai, .combat-row-player, #center-line, #combat-phase-indicator", { opacity: 1, duration: 0.5 });
                gsap.fromTo(".combat-row-ai > div, .combat-row-player > div", { scale: 0.5, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "back.out(1.7)" });
            }

            initAnimations() {
                const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
                tl.from("#ui-layer", { duration: 1.5, opacity: 0 });
                tl.from("header > div", { y: -20, opacity: 0, duration: 1, stagger: 0.3 }, "-=1");
                tl.from("footer > div", { y: 50, opacity: 0, duration: 1 }, "-=0.8");
            }

            initWheelSystem() {
                const btn = document.getElementById('wheel-btn');
                const modal = document.getElementById('wheel-modal');
                const overlay = document.getElementById('wheel-overlay');
                const content = document.getElementById('wheel-content');
                const closeBtn = document.getElementById('close-wheel');
                if (!btn || !modal) return;
                this.openWheel = () => { modal.classList.remove('hidden'); gsap.to(overlay, { opacity: 1, duration: 0.3 }); gsap.fromTo(content, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }); };
                this.closeWheel = () => { gsap.to(content, { scale: 0.9, opacity: 0, duration: 0.2 }); gsap.to(overlay, { opacity: 0, duration: 0.2, onComplete: () => { modal.classList.add('hidden'); } }); };
                btn.addEventListener('click', this.openWheel);
                closeBtn.addEventListener('click', this.closeWheel);
                overlay.addEventListener('click', this.closeWheel);
            }

            initDeckInteraction() {
                const deck = document.getElementById('player-deck');
                const menu = document.getElementById('deck-tools-menu');
                let isOpen = false;
                if (!deck || !menu) return;
                deck.addEventListener('click', (e) => {
                    e.stopPropagation();
                    isOpen = !isOpen;
                    if (isOpen) { menu.classList.remove('hidden'); gsap.fromTo(menu, { opacity: 0, y: 10, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(1.5)" }); } else { gsap.to(menu, { opacity: 0, y: 10, scale: 0.9, duration: 0.2, onComplete: () => menu.classList.add('hidden') }); }
                });
                document.addEventListener('click', (e) => { if (isOpen && !menu.contains(e.target) && e.target !== deck) { isOpen = false; gsap.to(menu, { opacity: 0, y: 10, scale: 0.9, duration: 0.2, onComplete: () => menu.classList.add('hidden') }); } });
            }
}