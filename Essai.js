//SCRIPT ARENE

const GAME_ID = 'match42'; // adapte si besoin

// Références DOM
const wheelPopup = document.getElementById("wheel-popup");
const wheelFrame = document.querySelector(".popup-frame");

/* ---------- Turn management (UI) ---------- */
let currentTurn = 'player'; // valeur initiale : 'player' ou 'ia'

// Met à jour l'UI pour indiquer le tour courant
function setTurn(player, { notifyWheel = true } = {}) {
  currentTurn = player;

  // applique la classe active sur l'avatar correspondant
  document.querySelectorAll('.avatar-border').forEach(el => {
    if (el.dataset.player === player) el.classList.add('active');
    else el.classList.remove('active');
  });

  // update texte
  const name = player === 'player' ? 'Joueur' : 'IA';
  const turnNameEl = document.getElementById('turn-name');
  if (turnNameEl) turnNameEl.textContent = name;

  // activer / désactiver l'image de la roue (visuel)
  const wheelImg = document.getElementById('wheel-image');
  if (wheelImg) {
    if (player === 'player') {
      wheelImg.classList.remove('disabled');
      wheelImg.title = "Cliquez pour ouvrir la roue (votre tour)";
    } else {
      wheelImg.classList.add('disabled');
      wheelImg.title = "Tour de l'IA — vous ne pouvez pas tourner";
    }
  }

  // Notifier l'iframe de la roue (optionnel)
  if (notifyWheel) {
    const iframe = document.querySelector('.popup-frame'); // ou '#wheel-iframe'
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action: 'setTurn', player }, '*');
    }
  }
}

// bascule vers le tour suivant
function nextTurn() {
  setTurn(currentTurn === 'player' ? 'ia' : 'player');
}

// Initialise l'UI
setTurn(currentTurn, { notifyWheel: false });

const wheelImageEl = document.getElementById("wheel-image");
wheelImageEl.addEventListener("click", function() {
  // si on veut empêcher l'ouverture de la roue lorsqu'il n'y a pas le tour du joueur :
  if (currentTurn !== 'player') return; // refuse l'ouverture si IA (garde ton comportement)

  wheelPopup.style.display = "flex";
  fetchHandsAndRender();

  // envoie la notification setTurn à l'iframe (immédiat + à la load)
  const iframe = document.querySelector('.popup-frame');
  function notifyIframe() {
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action: 'setTurn', player: currentTurn }, '*');
    }
  }
  // tentative immédiate
  notifyIframe();
  // si l'iframe n'est pas encore chargée, assure-toi que ça part lors du load
  iframe.addEventListener('load', notifyIframe, { once: true });

  // polling (évite setInterval doublé)
  if (!window._arenaPolling) {
    window._arenaPolling = setInterval(fetchHandsAndRender, 3000);
  }
});

/* ---------- Receive events from wheel (optionnel) ---------- */
window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.action === 'wheelResult') {
    // msg.player, msg.card (ex: "pt_50")
    console.log('Résultat roue reçu en arène:', msg);

     // Après 1 seconde → change de joueur
    setTimeout(() => {
      nextTurn();

      // 🚀 Si c'est au tour de l'IA → on déclenche la roue automatiquement
      if (currentTurn === 'ia') {
        const iframe = document.querySelector('.popup-frame');
        if (iframe && iframe.contentWindow) {
          // on attend 1,5 sec avant de lancer le spin IA
          setTimeout(() => {
            iframe.contentWindow.postMessage({ action: 'spinNow' }, '*');
          }, 1500);
        }
      }
    }, 1000);
  }
});

// ✅ Fermeture au clic sur le bouton X
document.getElementById("close-popup").addEventListener("click", function () {
  wheelPopup.style.display = "none";
});

// ✅ Fermeture si on clique en dehors du popup
window.addEventListener("click", function (e) {
  if (e.target === wheelPopup) {
    wheelPopup.style.display = "none";
  }
});

// --- Gestionnaire logique des cartes ---

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


// Gestionnaire global regroupant toutes les cartes
const CARD_MANAGER = {
  POINTS,
  ATTAQUES,
  DEFENSES,
  JOKERS,
  MALUS  
};

// Helper : retrouve le chemin image depuis un id
function getCardImagePath(cardKey) {
  for (const type in CARD_MANAGER) {
    const found = CARD_MANAGER[type].find(c => c.id === cardKey);
    if (found) return found.img;
  }
  return 'Card_Empty.jpg';
}

// --- Récupération des mains ---
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

// --- Rendu des mains ---
function renderHand(player, cardsArray) {
  const container = player === 'player'
    ? document.querySelector('.hand.player')
    : document.querySelector('.hand.ia');
  if (!container) return;

  let cardEls = Array.from(container.querySelectorAll('img.card'));
}

// ----------- Interaction : dépôt dans l’arène -----------
  nextSlot.addEventListener("click", () => {
    console.log(`[DEBUG] Clic sur une carte du hand (${player}) - Carte:`, thisCardKey);

    const arenaEl = document.getElementById("arena");
    if (!arenaEl) {
      console.error("[ERREUR] Élément #arena introuvable dans le DOM !");
      return;
    }

    // 👉 Chercher les slots DOM correspondant au joueur
    const arenaSlots = arenaEl.querySelectorAll(`.drop-slots.${player} .slot`);
    const freeSlot = Array.from(arenaSlots).find(s => !s.classList.contains("occupied"));

    if (!freeSlot) {
      console.warn(`[WARN] Plus de slots disponibles pour ${player} dans l’arène.`);
      return;
    }

    console.log(`[DEBUG] Slot DOM trouvé pour ${player}:`, freeSlot);

   // Créer l’image de la carte
const cardImg = document.createElement("img");
cardImg.src = getCardImagePath(thisCardKey);
cardImg.classList.add("arena-card");

// 👉 Forcer une taille et un affichage visible
cardImg.style.width = "80px";
cardImg.style.height = "120px";
cardImg.style.objectFit = "cover";

    // On ajoute directement l’image dans le slot DOM
    freeSlot.appendChild(cardImg);

    // Marquer le slot comme occupé
    freeSlot.classList.add("occupied");

    // Marquer la carte comme utilisée dans la main
    nextSlot.style.opacity = 0.5;
    nextSlot.style.pointerEvents = "none";

    console.log(`[DEBUG] Carte déposée dans l’arène (${player}) sur le slot index=${freeSlot.dataset.slot}`);
  });