// =========================
// SCRIPT ARENE COMPLET
// =========================

const GAME_ID = 'match42'; // adapte si besoin

// -------------------------
// Références DOM
// -------------------------
const wheelPopup = document.getElementById("wheel-popup");
const wheelFrame = document.querySelector(".popup-frame");
const wheelImageEl = document.getElementById("wheel-image");
const arenaEl = document.getElementById("arena"); // Arène pour dépôt de cartes

// -------------------------
// Gestion du tour
// -------------------------
let currentTurn = 'player'; // 'player' ou 'ia'
let playerSlotsFilled = 0;
let iaSlotsFilled = 0;

function setTurn(player, { notifyWheel = true } = {}) {
  currentTurn = player;

  document.querySelectorAll('.avatar-border').forEach(el => {
    if (el.dataset.player === player) el.classList.add('active');
    else el.classList.remove('active');
  });

  const name = player === 'player' ? 'Joueur' : 'IA';
  const turnNameEl = document.getElementById('turn-name');
  if (turnNameEl) turnNameEl.textContent = name;

  if (wheelImageEl) {
    if (player === 'player') {
      wheelImageEl.classList.remove('disabled');
      wheelImageEl.title = "Cliquez pour ouvrir la roue (votre tour)";
    } else {
      wheelImageEl.classList.add('disabled');
      wheelImageEl.title = "Tour de l'IA — vous ne pouvez pas tourner";
    }
  }

  if (notifyWheel && wheelFrame && wheelFrame.contentWindow) {
    wheelFrame.contentWindow.postMessage({ action: 'setTurn', player }, '*');
  }
}

function nextTurn() {
  setTurn(currentTurn === 'player' ? 'ia' : 'player');
}

setTurn(currentTurn, { notifyWheel: false });

// -------------------------
// Ouverture roue
// -------------------------
wheelImageEl.addEventListener("click", function() {
  if (currentTurn !== 'player') return;

  wheelPopup.style.display = "flex";
  fetchHandsAndRender();

  function notifyIframe() {
    if (wheelFrame && wheelFrame.contentWindow) {
      wheelFrame.contentWindow.postMessage({ action: 'setTurn', player: currentTurn }, '*');
    }
  }
  notifyIframe();
  wheelFrame.addEventListener('load', notifyIframe, { once: true });

  if (!window._arenaPolling) {
    window._arenaPolling = setInterval(fetchHandsAndRender, 3000);
  }
});

// -------------------------
// Tableaux invisibles pour dépôt des cartes
// -------------------------
const arenaSlots = {
  player: [
    { x: 0.2, y: 0.8, occupied: false },
    { x: 0.4, y: 0.8, occupied: false },
    { x: 0.6, y: 0.8, occupied: false },
    { x: 0.8, y: 0.8, occupied: false }
  ],
  ia: [
    { x: 0.2, y: 0.2, occupied: false },
    { x: 0.4, y: 0.2, occupied: false },
    { x: 0.6, y: 0.2, occupied: false },
    { x: 0.8, y: 0.2, occupied: false }
  ]
};

// -------------------------
// Remplissage automatique après roue
// -------------------------
function fillArenaSlots() {
  if (playerSlotsFilled >= 4 && iaSlotsFilled >= 4) {
    arenaSlots.player.forEach(slot => slot.occupied = true);
    arenaSlots.ia.forEach(slot => slot.occupied = true);
    console.log('État des slots arène:', arenaSlots);
  }
}

// -------------------------
// Fermeture popup roue
// -------------------------
document.getElementById("close-popup").addEventListener("click", function () {
  wheelPopup.style.display = "none";
});
window.addEventListener("click", function (e) {
  if (e.target === wheelPopup) wheelPopup.style.display = "none";
});

// -------------------------
// Gestion des cartes
// -------------------------
const POINTS = [
  { id: "pt_25",  typeId: "type_point", label: "+25s",  img: "3d-alarm.png",   description: "Ajoute 25 secondes au score" },
  { id: "pt_50",  typeId: "type_point", label: "+50s",  img: "clock_2.png",    description: "Ajoute 50 secondes au score" },
  { id: "pt_75",  typeId: "type_point", label: "+75s",  img:"clock_3.png",    description: "Ajoute 75 secondes au score" },
  { id: "pt_100", typeId: "type_point", label: "+100s", img:"clock_4.png",   description: "Ajoute 100 secondes au score" },
  { id: "pt_150", typeId: "type_point", label: "+150s", img:"clock.png",     description: "Ajoute 150 secondes au score" },
  { id: "pt_200", typeId: "type_point", label: "+200s", img:"clock.png",     description: "Ajoute 200 secondes au score" }
];

const ATTAQUES = [
  { id: "atk_vision", typeId: "type_attaque", label: "visionnaire",img: "visionary.png", description: "Permet de voir à l'avance les effets" },
  { id: "atk_stop",   typeId: "type_attaque", label: "stop",  img:"stop.png",      description: "Stoppe la roue de l'adversaire" },
  { id: "atk_echange",typeId: "type_attaque", label: "échange", img:"echange.png",   description: "Échange forcé avec un adversaire" } ,
  { id: "atk_vol",    typeId: "type_attaque", label: "vol", img:"bandit.png",    description: "Vole une carte à un autre joueur" },
  { id: "atk_destruction", typeId: "type_attaque", label: "destruction", img:"explosion.png", description: "Détruit une carte d’un adversaire" },
  { id: "atk_reduction", typeId: "type_attaque", label: "réduction", img:"limited_2.png", description: "Réduit le temps adverse" },
  { id: "atk_limitation", typeId: "type_attaque", label: "limitation", img: "sablier.png", description: "Limite l’inventaire adverse" }
];

const DEFENSES = [
  { id: "def_masque", typeId: "type_defense", label: "masque", img:"theatre.png", description: "Masque les effets entrants" },
  { id: "def_blocage", typeId: "type_defense", label: "blocage", img: "no_malus.png", description: "Bloque une attaque" },
  { id: "def_renvoi", typeId: "type_defense", label: "renvoi_Attaque", img:"renvoi.png", description: "Renvoie les attaques" },
  { id: "def_explosion", typeId: "type_defense", label: "explosion_Nettoyage", img: "exploseEtNettoi.png", description: "Explose et nettoie tout" },
  { id: "def_bouclier", typeId: "type_defense", label: "bouclier", img:"bouclier.png", description: "Ajoute une protection temporaire" },
  { id: "def_restauration", typeId: "type_defense", label: "restauration_Etat", img: "super-power.png", description: "Restaure l’état précédent" },
  { id: "def_suppression", typeId: "type_defense", label: "suppresion_malus", img: "no-bomb.png", description: "Supprime un malus actif" }
];

const MALUS = [
  { id: "malus_hasard", typeId: "type_malus", label: "Effet_hasard_malus", img:"effet.png", description: "Effet aléatoire de malus" },
  { id: "malus_division", typeId: "type_malus", label: "division_points_2", img: "division.png", description: "Divise les points en deux" },
  { id: "malus_perteTour", typeId: "type_malus", label: "aucun_gain_tout_perdu", img: "perte.png", description: "Aucun gain, tour perdu" },
  { id: "malus_reductionInv", typeId: "type_malus", label: "réduction_temporaire_inventaire", img: "réduction.png", description: "Réduction temporaire d’inventaire" },
  { id: "malus_perte50",typeId: "type_malus", label: "perte_50secs", img:"Moins-50.png", description: "Perte de 50 secondes" },
  { id: "malus_disparition",typeId: "type_malus", label: "disparition_joker", img: "Disparition_Joker.png", description: "Fait disparaître un joker" },
  { id: "malus_reduction1", typeId: "type_malus", label:"réduction_inventaire_1", img: "Moins-1.png", description: "Réduit l’inventaire de 1" },
  { id: "malus_perte30",typeId: "type_malus", label: "perte_30%_temps", img: "Perte_30.png", description: "Perte de 30% du temps" },
  { id: "malus_limitGain",typeId: "type_malus", label:"limitation_futurs_gains", img:"sablier.png", description: "Limitation des futurs gains" },
  { id: "malus_blocJoker",typeId: "type_malus", label: "blocage_joker_while_3mins", img:"no-bomb.png", description: "Pas de joker pendant 3 minutes" }
];

const BONUS = [
  { id: "bonus_supprMalus",typeId: "type_bonus", label: "supression_All_malus_Actifs", img: "cadeau_3.png", description: "Supprime tous les malus actifs" },
  { id: "bonus_x3", typeId: "type_bonus",  label: "Temps_multiplié_x3", img:"cadeau.png", description: "Temps multiplié par 3" },
  { id: "bonus_jokerHasard",typeId: "type_bonus", label: "Gagner_joker_hasard", img: "cadeau_7.png", description: "Obtenez un joker aléatoire" },
  { id: "bonus_carteHasard",typeId: "type_bonus",  label: "Gagner_Carte_hasard", img:"cadeau_6.png", description: "Gagnez une carte aléatoire" },
  { id: "bonus_plus30", typeId: "type_bonus", label:"Ajout_30%_All_gains", img: "cadeau_5.png", description: "Ajoute 30% à tous les gains" },
  { id: "bonus_slots", typeId: "type_bonus", label:"Ajout_2_Slots_Cartes", img: "cadeau_4.png", description: "Ajoute 2 slots de cartes" },
  { id: "bonus_double",typeId: "type_bonus",  label:"Double_Points_gagnés", img: "cadeau.png", description: "Double les points gagnés" }
];

const JOKERS = [
  { id: "joker_limite",typeId: "type_joker",  label: "Limitation_Effet_Autre_Carte", img: "joker_2.png", description: "Imite l’effet d’une autre carte" },
  { id: "joker_retourne", typeId: "type_joker",  label:"Retourne_Attaque", img:"joker.png", description: "Retourne une attaque" },
  { id: "joker_neutralise",typeId: "type_joker", label:"Neutralisation_Pickpocket_ET_Autodestruction", img: "joker_2.png", description: "Neutralise Pickpocket et Autodestruction" },
  { id: "joker_parade",typeId: "type_joker",   label: "parade_contre_EchangeForcé_ET_Mine", img: "joker.png", description: "Parade contre Échange forcé et Mine" },
  { id: "joker_immunite",typeId: "type_joker", label: "Immunité_totale", img: "joker_2.png", description: "Immunité totale" },
  { id: "joker_annule",typeId: "type_joker",   label: "Annulation_All_limitations", img: "joker.png", description: "Annule toutes les limitations" },
  { id: "joker_absorbe",typeId: "type_joker",  label:"Absorbe_Next_Attaque", img: "joker_2.png", description: "Absorbe la prochaine attaque" }
];

const CARD_MANAGER = { POINTS, ATTAQUES, DEFENSES, JOKERS, MALUS, BONUS };

// Récupère l'image d'une carte
function getCardImagePath(cardKey) {
  for (const type in CARD_MANAGER) {
    const found = CARD_MANAGER[type].find(c => c.id === cardKey);
    if (found) return found.img;
  }
  return 'Card_Empty.jpg';
}
function assignCardToSlot(player, cardKey) {
  const handEl = document.querySelector(`.hand.${player}`);
  const slotIndex = (player === "player") ? playerSlotsFilled : iaSlotsFilled;
  const slots = handEl.querySelectorAll(".card");

  if (slotIndex >= slots.length) return;

  const nextSlot = slots[slotIndex];
  const thisCardKey = cardKey; // 🔒 Carte distribuée

  // ----------- Distribution dans la main -----------
  nextSlot.style.backgroundImage = `url(${getCardImagePath(thisCardKey)})`;
  nextSlot.style.backgroundSize = "cover";
  nextSlot.style.backgroundPosition = "center";
  nextSlot.style.border = "2px solid gold";
  nextSlot.style.cursor = "pointer";

  // ----------- Incrémentation immédiate dans la main -----------
  if (player === "player") {
    playerSlotsFilled++;
  } else {
    iaSlotsFilled++;
  }

  // ----------- Interaction : dépôt dans les slots de l’arène -----------
  nextSlot.addEventListener("click", () => {
    console.log(`[DEBUG] Clic sur une carte du hand (${player}) - Carte:`, thisCardKey);

    const arenaEl = document.getElementById("arena");
    if (!arenaEl) {
      console.error("[ERREUR] Élément #arena introuvable dans le DOM !");
      return;
    }

    // Chercher les slots DOM invisibles correspondant au joueur
    const arenaSlotsDOM = Array.from(arenaEl.querySelectorAll(`.drop-slots.${player} .slot`));
    const freeSlotDOM = arenaSlotsDOM.find(s => !s.classList.contains("occupied"));

    if (!freeSlotDOM) {
      console.warn(`[WARN] Plus de slots disponibles pour ${player} dans l’arène.`);
      return;
    }

    console.log(`[DEBUG] Slot DOM trouvé pour ${player}:`, freeSlotDOM);

    // --- Utiliser l'image déjà présente dans le slot ---
    const slotImg = freeSlotDOM.querySelector("img.arena-card");
    if (slotImg) {
      slotImg.src = getCardImagePath(thisCardKey);
      slotImg.style.display = "block"; // rendre visible
      slotImg.style.opacity = "1";
    } else {
      console.error("[ERREUR] Aucun <img> trouvé dans le slot. Vérifie ton HTML.");
      return;
    }

    // Marquer le slot comme occupé
    freeSlotDOM.classList.add("occupied");

    // Mettre à jour le tableau logique
    const idx = parseInt(freeSlotDOM.dataset.slot, 10);
    if (!Number.isNaN(idx) && Array.isArray(arenaSlots[player]) && arenaSlots[player][idx]) {
      arenaSlots[player][idx].occupied = true;
    }

    // Marquer la carte dans la main comme utilisée
    nextSlot.style.opacity = 0.5;
    nextSlot.style.pointerEvents = "none";

    console.log(`[DEBUG] Carte déposée dans l’arène (${player}) sur le slot index=${freeSlotDOM.dataset.slot}`);

    // Vérifier si l’arène est complète et remplir les slots
    fillArenaSlots();
  });
}
// -------------------------
// Réception résultat roue
// -------------------------
window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.action === 'wheelResult') {
    assignCardToSlot(msg.player, msg.card);
    fillArenaSlots();

    if (playerSlotsFilled >= 4 && iaSlotsFilled >= 4) {
      setTimeout(() => { wheelPopup.style.display = "none"; }, 1200);
      return;
    }

    setTimeout(() => {
      nextTurn();
      if (currentTurn === 'ia' && wheelFrame && wheelFrame.contentWindow) {
        setTimeout(() => { wheelFrame.contentWindow.postMessage({ action: 'spinNow' }, '*'); }, 1500);
      }
    }, 1000);
  }
});

// -------------------------
// Récupération des mains (optionnel serveur)
// -------------------------
async function fetchHandsAndRender() {
  try {
    const resp = await fetch(`http://localhost:3000/api/hands?gameId=${encodeURIComponent(GAME_ID)}`);
    const data = await resp.json();
    renderHand('player', data.player);
    renderHand('ia', data.ia);
  } catch (err) {
    console.error('fetchHands error', err);
  }
}

function renderHand(player, cardsArray) {
  const container = player === 'player'
    ? document.querySelector('.hand.player')
    : document.querySelector('.hand.ia');
  if (!container) return;

  // TODO : actualiser les cartes dans la main si besoin
}