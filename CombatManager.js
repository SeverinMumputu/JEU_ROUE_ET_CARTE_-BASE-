/**
 * 3️⃣ Classe 2 : CombatManager
⚔️ Rôle général
Cette classe gère toute la logique du combat :
tours
phases
timer : gère les deux phases (réflexions et pressions) pour le dépôt des cartes
interactions joueur
actions de l’IA
déplacement des cartes
👉 C’est le cerveau du combat.
 */
export default class CombatManager {
    constructor(uiManager, arena3D) {
        this.uiManager = uiManager;
        this.arena3D = arena3D;

        this.isActive = false;
        this.currentTurn = 'player';
        this.turnPhase = 1;
        this.timer = 9;
        this.intervalId = null;

        this.playerAvatarZone = document.getElementById('player-avatar-zone');
        this.iaAvatarZone = document.getElementById('ia-avatar-zone');
        this.timerDisplay = document.getElementById('timer-display');
        this.turnDisplay = document.getElementById('turn-display');
        this.selectedCardIndex = -1;
    }

initiateCombat() {
    console.log("✅ initiateCombat() exécutée");
    console.log("⚔️ DÉBUT DU COMBAT");
    this.isActive = true;
        // 🎵 AUDIO
    this.uiManager.audioManager.play();

    document.getElementById('combat-arena').style.opacity = "1";

    gsap.to(
        ".combat-row-ai, .combat-row-player, #center-line, #combat-phase-indicator",
        { opacity: 1, duration: 0.5 }
    );

    gsap.fromTo(
        ".combat-row-ai > div, .combat-row-player > div",
        { y: 20 },
        { y: 0, duration: 0.8, stagger: 0.1, ease: "back.out(1.7)" }
    );

    this.startTurn('player');
    this.enablePlayerInteraction();
}

            startTurn(player) {
                this.currentTurn = player;
                this.turnPhase = 1;
                this.timer = 9;
                this.updateVisuals();
                this.startTimer();
                if (player === 'ia') this.processIATurn();
            }

            startTimer() {
                if (this.intervalId) clearInterval(this.intervalId);
                this.intervalId = setInterval(() => {
                    this.timer--;
                    this.updateTimerDisplay();
                    if (this.timer <= 0) {
                        if (this.turnPhase === 1) {
                            this.turnPhase = 2;
                            this.timer = 9;
                            this.updateVisuals();
                        } else {
                            this.passTurn();
                        }
                    }
                }, 1000);
            }

            passTurn() {
                if (this.intervalId) clearInterval(this.intervalId);
                this.currentTurn = this.currentTurn === 'player' ? 'ia' : 'player';
                this.startTurn(this.currentTurn);
            }

            updateVisuals() {
                this.playerAvatarZone.classList.remove('avatar-active-turn');
                this.iaAvatarZone.classList.remove('avatar-active-turn');
                this.turnDisplay.innerText = this.currentTurn === 'player' ? "JOUEUR" : "IA";
                this.updateTimerDisplay();
                
                if (this.currentTurn === 'player') this.playerAvatarZone.classList.add('avatar-active-turn');
                else this.iaAvatarZone.classList.add('avatar-active-turn');
                
                this.arena3D.updateTurnVisuals(this.currentTurn, this.turnPhase);
            }

            updateTimerDisplay() {
                this.timerDisplay.innerText = `0${this.timer}s`;
                this.timerDisplay.style.color = this.turnPhase === 2 ? '#ff4d4d' : '#ffffff';
            }

            enablePlayerInteraction() {
                const handSlots = document.getElementById('player-hand-container').children;
                Array.from(handSlots).forEach((slot, index) => {
                    slot.onclick = () => {
                        if (!this.isActive || this.currentTurn !== 'player') return;
                        if (slot.innerHTML.trim() === "") return; 
                        if (this.selectedCardIndex === index) {
                            this.playCard(index, 'player');
                            this.deselectCard();
                        } else {
                            this.selectCard(index);
                        }
                    };
                });
            }

            selectCard(index) {
                this.deselectCard();
                this.selectedCardIndex = index;
                const slot = document.getElementById('player-hand-container').children[index];
                slot.classList.add('card-selected');
            }

            deselectCard() {
                if (this.selectedCardIndex !== -1) {
                    const prevSlot = document.getElementById('player-hand-container').children[this.selectedCardIndex];
                    if (prevSlot) prevSlot.classList.remove('card-selected');
                    this.selectedCardIndex = -1;
                }
            }

          processIATurn() {
    const thinkingTime = Math.floor(Math.random() * 4000) + 2000;
    setTimeout(() => {
        if (this.currentTurn === 'ia') {
            const handContainer = document.getElementById('ia-hand-container');
            const validIndices = [];
            Array.from(handContainer.children).forEach((slot, index) => {
                 // Sélectionner uniquement les slots non vides (cartes présentes)
                 if (slot && slot.innerHTML && slot.innerHTML.trim() !== "") validIndices.push(index);
            });

            if (validIndices.length > 0) {
                const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
                this.playCard(randomIndex, 'ia');
            } else {
                this.passTurn();
            }
        }
    }, thinkingTime);
}

            playCard(index, playerType) {
                const sourceId = playerType === 'player' ? 'player-hand-container' : 'ia-hand-container';
                const targetId = playerType === 'player' ? 'player-combat-slots' : 'ia-combat-slots';
                const sourceSlot = document.getElementById(sourceId).children[index];
                const targetSlot = document.getElementById(targetId).children[index];

                if (!sourceSlot || !targetSlot) return;

                gsap.to(sourceSlot, { duration: 0.3, onComplete: () => {
                    targetSlot.className = sourceSlot.className; 
                    targetSlot.innerHTML = sourceSlot.innerHTML;
                    targetSlot.classList.remove('card-selected', 'hover:border-lantern-gold', 'cursor-pointer', 'card-playable');
                    targetSlot.classList.add('opacity-100');
                    
                    if (playerType === 'player') {
                        sourceSlot.className = "w-20 h-28 md:w-28 md:h-40 glass-panel rounded border-gray-600 opacity-50 flex flex-col p-1 md:p-2 group";
                        sourceSlot.innerHTML = "";
                    } else {
                        sourceSlot.className = "w-16 h-24 md:w-10 md:h-16 bg-[#3d2b25] border border-[#5d4037] rounded shadow-md opacity-20";
                        sourceSlot.innerHTML = ""; 
                    }
                    
                    gsap.fromTo(targetSlot, {y: -20, opacity: 0}, {y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.2)"});
                    this.passTurn();
                }});
            }
}