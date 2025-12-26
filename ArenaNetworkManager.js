/**
 *  3️⃣ Classe 3 : ArenaNetworkManager
⚔️ Rôle général
Cette classe est le pont entre la roue et le combat :
Base de données des cartes
Réception des résultats de la roue
Placement des cartes
Déclenchement du combat

 */
export default class ArenaNetworkManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.initializeDatabase();

        this.hands = {
            player: { count: 0, max: 4 },
            ia: { count: 0, max: 4 }
        };

        window.addEventListener("message", this.handleMessage.bind(this));
    }
 initializeDatabase() {
                const POINTS = [
                  { id: "pt_25",  typeId: "type_point", label: "+25s", image: "3d-alarm.png",   description: "Ajoute 25 secondes au score" },
                  { id: "pt_50",  typeId: "type_point", label: "+50s", image: "clock_2.png",    description: "Ajoute 50 secondes au score" },
                  { id: "pt_75",  typeId: "type_point", label: "+75s", image: "clock_3.png",    description: "Ajoute 75 secondes au score" },
                  { id: "pt_100", typeId: "type_point", label: "+100s", image: "clock_4.png",   description: "Ajoute 100 secondes au score" },
                  { id: "pt_150", typeId: "type_point", label: "+150s", image: "clock.png",     description: "Ajoute 150 secondes au score" },
                  { id: "pt_200", typeId: "type_point", label: "+200s", image: "clock.png",     description: "Ajoute 200 secondes au score" }
                ];

                const ATTAQUES = [
                  { id: "atk_vision", typeId: "type_attaque", label: "visionnaire", image: "visionary.png", description: "Permet de voir à l'avance les effets" },
                  { id: "atk_stop",   typeId: "type_attaque", label: "stop",        image: "stop.png",      description: "Stoppe la roue de l'adversaire" },
                  { id: "atk_echange",typeId: "type_attaque", label: "échange",     image: "echange.png",   description: "Échange forcé avec un adversaire" },
                  { id: "atk_vol",    typeId: "type_attaque", label: "vol",         image: "bandit.png",    description: "Vole une carte à un autre joueur" },
                  { id: "atk_destruction", typeId: "type_attaque", label: "destruction", image: "explosion.png", description: "Détruit une carte d’un adversaire" },
                  { id: "atk_reduction", typeId: "type_attaque", label: "réduction", image: "limited_2.png", description: "Réduit le temps adverse" },
                  { id: "atk_limitation", typeId: "type_attaque", label: "limitation", image: "sablier.png", description: "Limite l’inventaire adverse" }
                ];

                const DEFENSES = [
                  { id: "def_masque", typeId: "type_defense", label: "masque" , image: "theatre.png", description: "Masque les effets entrants" },
                  { id: "def_blocage", typeId: "type_defense", label: "blocage", image: "no_malus.png", description: "Bloque une attaque" },
                  { id: "def_renvoi", typeId: "type_defense", label: "renvoi_Attaque", image: "renvoi.png", description: "Renvoie les attaques" },
                  { id: "def_explosion", typeId: "type_defense", label: "explosion_Nettoyage", image: "exploseEtNettoi.png", description: "Explose et nettoie tout" },
                  { id: "def_bouclier", typeId: "type_defense", label: "bouclier", image: "bouclier.png", description: "Ajoute une protection temporaire" },
                  { id: "def_restauration", typeId: "type_defense", label: "restauration_Etat", image: "super-power.png", description: "Restaure l’état précédent" },
                  { id: "def_suppression", typeId: "type_defense", label: "suppresion_malus", image: "no-bomb.png", description: "Supprime un malus actif" }
                ];

                const MALUS = [
                  { id: "malus_hasard", typeId: "type_malus", label: "Effet_hasard_malus", image: "effet.png", description: "Effet aléatoire de malus" },
                  { id: "malus_division", typeId: "type_malus", label: "division_points_2", image: "division.png", description: "Divise les points en deux" },
                  { id: "malus_perteTour", typeId: "type_malus", label: "aucun_gain_tout_perdu", image: "perte.png", description: "Aucun gain, tour perdu" },
                  { id: "malus_reductionInv", typeId: "type_malus", label: "réduction_temporaire_inventaire", image: "réduction.png", description: "Réduction temporaire d’inventaire" },
                  { id: "malus_perte50", typeId: "type_malus", label: "perte_50secs", image: "Moins-50.png", description: "Perte de 50 secondes" },
                  { id: "malus_disparition", typeId: "type_malus", label: "disparition_joker", image: "Disparition_Joker.png", description: "Fait disparaître un joker" },
                  { id: "malus_reduction1", typeId: "type_malus", label: "réduction_inventaire_1", image: "Moins-1.png", description: "Réduit l’inventaire de 1" },
                  { id: "malus_perte30", typeId: "type_malus", label: "perte_30%_temps", image: "Perte_30.png", description: "Perte de 30% du temps" },
                  { id: "malus_limitGain", typeId: "type_malus", label: "limitation_futurs_gains", image: "sablier.png", description: "Limitation des futurs gains" },
                  { id: "malus_blocJoker", typeId: "type_malus", label: "blocage_joker_while_3mins", image: "no-bomb.png", description: "Pas de joker pendant 3 minutes" }
                ];

                const BONUS = [
                  { id: "bonus_supprMalus", typeId: "type_bonus", label: "supression_All_malus_Actifs", image: "cadeau_3.png", description: "Supprime tous les malus actifs" },
                  { id: "bonus_x3", typeId: "type_bonus", label: "Temps_multiplié_x3", image: "cadeau.png", description: "Temps multiplié par 3" },
                  { id: "bonus_jokerHasard", typeId: "type_bonus", label: "Gagner_joker_hasard", image: "cadeau_7.png", description: "Obtenez un joker aléatoire" },
                  { id: "bonus_carteHasard", typeId: "type_bonus", label: "Gagner_Carte_hasard", image: "cadeau_6.png", description: "Gagnez une carte aléatoire" },
                  { id: "bonus_plus30", typeId: "type_bonus", label: "Ajout_30%_All_gains", image: "cadeau_5.png", description: "Ajoute 30% à tous les gains" },
                  { id: "bonus_slots", typeId: "type_bonus", label: "Ajout_2_Slots_Cartes", image: "cadeau_4.png", description: "Ajoute 2 slots de cartes" },
                  { id: "bonus_double", typeId: "type_bonus", label: "Double_Points_gagnés", image: "cadeau.png", description: "Double les points gagnés" }
                ];

                const JOKERS = [
                  { id: "joker_limite", typeId: "type_joker", label: "Limitation_Effet_Autre_Carte", image: "joker_2.png", description: "Imite l’effet d’une autre carte" },
                  { id: "joker_retourne", typeId: "type_joker", label: "Retourne_Attaque", image: "joker.png", description: "Retourne une attaque" },
                  { id: "joker_neutralise", typeId: "type_joker", label: "Neutralisation_Pickpocket_ET_Autodestruction", image: "joker_2.png", description: "Neutralise Pickpocket et Autodestruction" },
                  { id: "joker_parade", typeId: "type_joker", label: "parade_contre_EchangeForcé_ET_Mine", image: "joker.png", description: "Parade contre Échange forcé et Mine" },
                  { id: "joker_immunite", typeId: "type_joker", label: "Immunité_totale", image: "joker_2.png", description: "Immunité totale" },
                  { id: "joker_annule", typeId: "type_joker", label: "Annulation_All_limitations", image: "joker.png", description: "Annule toutes les limitations" },
                  { id: "joker_absorbe", typeId: "type_joker", label: "Absorbe_Next_Attaque", image: "joker_2.png", description: "Absorbe la prochaine attaque" }
                ];

                this.CARD_DB = {};
                
                const addCards = (list, typeLabel) => {
                    list.forEach(card => {
                        this.CARD_DB[card.id] = { ...card, typeLabel };
                    });
                };

                addCards(POINTS, "Point");
                addCards(ATTAQUES, "Attaque");
                addCards(DEFENSES, "Défense");
                addCards(MALUS, "Malus");
                addCards(BONUS, "Bonus");
                addCards(JOKERS, "Joker");
            }

getCardData(cardKey) {
                // Fallback si la clé n'existe pas exactement
                return this.CARD_DB[cardKey] || this.CARD_DB['pt_25'];
            }
    

            handleMessage(event) {
                const data = event.data;
                if (data.action === 'wheelResult') {
                    const cardData = this.getCardData(data.card);
                    if (cardData) {
                        this.placeCardInHand(data.player, cardData);
                        this.checkHandsFull();
                    }
                }
            }
            

  placeCardInHand(playerType, card) {
    console.log(`[DEBUG] placeCardInHand appelé pour ${playerType} avec carte ${card.id}`);

    const containerId = playerType === 'player' ? 'player-hand-container' : 'ia-hand-container';
    let container = document.getElementById(containerId);

    const isFirstCard = this.hands[playerType].count === 0;
    const isBroken = !container || container.children.length < this.hands[playerType].max;

    // ÉTAPE 2 : Vérification Logique (Main pleine ?)
    if (this.hands[playerType].count >= this.hands[playerType].max) {
        console.log(`[INFO] Main pleine pour ${playerType}, carte ignorée.`);
        return;
    }

    // ÉTAPE 3 : Ciblage du Slot
    let slots = container.children;
    let targetSlot = slots[this.hands[playerType].count];

    // ÉTAPE 4 : Sécurité Ultime
    if (!targetSlot) {
        console.error(`[CRITIQUE] Slot index ${this.hands[playerType].count} introuvable après régénération.`);
        return;
    }

    // Si on arrive ici, targetSlot EXISTE.
    const baseClasses = playerType === 'player'
        ? "w-20 h-28 md:w-28 md:h-40"
        : "w-16 h-24 md:w-10 md:h-16";

    targetSlot.className = `${baseClasses} glass-panel rounded border-lantern-gold shadow-[0_0_15px_rgba(251,191,36,0.2)] bg-gray-900/95 flex flex-col p-1 md:p-2 cursor-pointer transform transition-all duration-500`;

    const imageContent = card.image.includes('.png') 
        ? `<img src="${card.image}" alt="${card.label}" class="w-full h-full object-contain opacity-90 drop-shadow-md">` 
        : `<span class="text-xl md:text-3xl opacity-80">${card.image}</span>`;

    targetSlot.innerHTML = `<div class="text-[9px] md:text-xs text-lantern-gold font-fantasy text-center mb-1 truncate w-full">${card.label}</div><div class="flex-grow bg-lantern-orange/10 rounded flex items-center justify-center border border-lantern-orange/20 overflow-hidden">${imageContent}</div><div class="mt-1 text-center font-bold text-white text-[9px] md:text-sm">${card.typeLabel}</div>`;

    // Incrémentation
    this.hands[playerType].count++;
    
    console.log(`[SUCCESS] Carte placée pour ${playerType}. Nouveau count: ${this.hands[playerType].count}`);

    // Animation (Note: si GSAP cause des soucis d'affichage, commenter cette ligne pour tester)
    try {
        gsap.from(targetSlot, {scale: 0, duration: 0.4, clearProps: "scale"});
    } catch(e) {
        console.warn("GSAP animation error", e);
    }
}
            checkHandsFull() {
                // Condition critique : Remplissage complet avant combat
                if (this.hands.player.count === 4 && this.hands.ia.count === 4) {
                    console.log("Main complète ! Lancement du combat...");
                    // Fermeture de la roue via UIManager
                    if (this.uiManager.closeWheel) this.uiManager.closeWheel();
                    // Lancement de la logique de combat
                    if (this.uiManager.combatManager) this.uiManager.combatManager.initiateCombat();
                }
            }
}