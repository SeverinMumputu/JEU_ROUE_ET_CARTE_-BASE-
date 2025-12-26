
const GAME_ID = 'match42'; // adapte si besoin
const wheelPopup = document.getElementById("wheel-popup");
const wheelFrame = document.querySelector(".popup-frame");
const wheelImageEl = document.getElementById("wheel-image");
const arenaEl = document.getElementById("arena"); // Arène pour dépôt de cartes
const turnNameEl = document.getElementById('turn-name');
//VARIABLE MOTEUR DE TOUR
let currentTurn = 'player';
let turnActionDone = false;  

//DECLARATION INITIALE POUR GERER LES SLOTS REMPLIS
let playerSlotsFilled = 0;
let iaSlotsFilled = 0;

let playPhase = false; // devient true quand les 4 slots de chaque joueur sont remplis

let scores = { player: 150, ia: 150 }; // score initial
const PARTIE_DURATION = 9 * 60; // 9 minutes en secondes
let timers = { player: PARTIE_DURATION, ia: PARTIE_DURATION }; // timers par joueur
let partieInterval = null; // intervalle général

// Liste de messages/conseils
const messages = [
  "Chaque joueur commence avec 150 points !",
  "Utilisez vos cartes bonus au bon moment pour maximiser vos points.",
  "Les malus peuvent inverser le cours de la partie, soyez vigilants !",
  "Astuce : observez le plateau avant de jouer votre carte."
];

// Fonction pour créer popup
function showPopup(message, duration = 4000) {
  const container = document.getElementById('popup-container');
  
  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.innerText = message;

  // Créer quelques particules de feu
  for(let i = 0; i < 20; i++){
    const particle = document.createElement('div');
    particle.className = 'fire-particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random()}s`;
    popup.appendChild(particle);
  }

  container.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, duration);
}

// Afficher les messages au lancement
messages.forEach((msg, index) => {
  setTimeout(() => showPopup(msg), index * 4500);
});

const playerState = {
  player: {
    mask: false,
    block: false,
    renvoi: false, 
    immunite: false,
    absorbNextAttack: false,
    multiplier: 1,
    gainBoostPct: 0, // ex: 0.3 pour +30%
    skipNextTurn: false,
    noJokerUntil: 0,
    vision: false
  },
  ia: {
    mask: false,
    block: false,
    renvoi: false,
    immunite: false,
    absorbNextAttack: false,
    multiplier: 1,
    gainBoostPct: 0,
    skipNextTurn: false,
    noJokerUntil: 0,
    vision: false
  }
};

function updateStatsUI() {
  // affiche score & timers
  const playerTimerEl = document.getElementById("timer-player");
  const iaTimerEl = document.getElementById("timer-ia");
  const scoreP = document.getElementById("score-player");
  const scoreI = document.getElementById("score-ia");
  if (playerTimerEl) playerTimerEl.textContent = `⏱ ${formatTime(timers.player)}`;
  if (iaTimerEl) iaTimerEl.textContent = `⏱ ${formatTime(timers.ia)}`;
  if (scoreP) scoreP.textContent = `⭐ ${scores.player}`;
  if (scoreI) scoreI.textContent = `⭐ ${scores.ia}`;
}

function endGame(winner, reason) {
  // stoppe la partie proprement
  if (partieInterval) { clearInterval(partieInterval); partieInterval = null; }

  let message;
  if (winner === null || typeof winner === 'undefined') {
    message = `Partie terminée : ${reason}`;
  } else {
    message = `${winner === 'player' ? 'Le Joueur' : 'L\'IA'} gagne !\n(${reason})`;
  }
  alert(message);
  // désactiver interactions
  document.querySelectorAll(".card").forEach(c => { c.style.pointerEvents = "none"; });
}

function startPartieIfReady() {
  if (playerSlotsFilled >= 4 && iaSlotsFilled >= 4 && !partieInterval) {
    console.log("Tous les slots remplis : démarrage de la partie !");
    nextTurn();// Mettre à jour le système de tour(L'indicateur) après son utlisation sur l'interface de la roue
    updateStatsUI();
    partieInterval = setInterval(() => {
      // Décrémenter les timers des deux joueurs
      timers.player = Math.max(0, timers.player - 1);
      timers.ia = Math.max(0, timers.ia - 1);

      // Affichage des timers
      updateStatsUI();

      // Vérifier si temps écoulé
      if (timers.player <= 0 || timers.ia <= 0) {
        if (partieInterval) { clearInterval(partieInterval); partieInterval = null; }
        if (timers.player <= 0 && timers.ia <= 0) {
          endGame(null, "Temps écoulé pour les deux (match nul).");
        } else if (timers.player <= 0) {
          endGame('ia', "Le joueur a manqué de temps.");
        } else {
          endGame('player', "L'IA a manqué de temps.");
        }
        return;
      }

      // Vérifier si score atteint 1000
      if (scores.player >= 1000) {
        if (partieInterval) { clearInterval(partieInterval); partieInterval = null; }
        endGame('player', "Score atteint (1000 points)");
        return;
      }
      if (scores.ia >= 1000) {
        if (partieInterval) { clearInterval(partieInterval); partieInterval = null; }
        endGame('ia', "Score atteint (1000 points)");
        return;
      }
    }, 1000);
  }
}

function updateHandInteraction() {
  // si pas en playPhase, ne rien changer (on conserve le comportement de distribution)
  if (!playPhase) return;

  ['player','ia'].forEach(p => {
    const hand = document.querySelector(`.hand.${p}`);
    if (!hand) return;
    const cards = Array.from(hand.querySelectorAll('.card'));
    cards.forEach(card => {
      const used = (card.style.opacity === '0.5'); // déjà posé
      if (p === currentTurn && !used && !turnActionDone) {
        card.style.pointerEvents = 'auto';
      } else {
        card.style.pointerEvents = 'none';
      }
    });
  });
}

// C.LE MOTEUR DE TOUR / GESTION DU JOUEUR COURANT
function setTurn(player, { notifyWheel = true } = {}) {
  currentTurn = player;

  // reset action lock pour le nouveau tour
  turnActionDone = false;

  document.querySelectorAll('.avatar-border').forEach(el => {
    if (el.dataset.player === player) el.classList.add('active');
    else el.classList.remove('active');
  });

  if (turnNameEl) turnNameEl.textContent = player === 'player' ? 'Joueur' : 'IA';

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

  // mettre à jour les interactions de la main si en phase de jeu
  updateHandInteraction();
  // Si effet skipNextTurn présent, consommer et passer au suivant
  if (playPhase && effects[player] && effects[player].skipNextTurn) {
    effects[player].skipNextTurn = false; // consommé
    safeLog(`${player} skipNextTurn consommé — on passe le tour.`);
    setTimeout(() => nextTurn(), 350);
    return;
  }
  /* IA : si c'est au tour de l'IA et la phase de jeu (les deux mains remplies), déclencher son jeu */
  if (player === 'ia' && playPhase) {
    // délai pour animation + laisser le DOM se mettre à jour
    setTimeout(() => {
      aiPlayTurn();
    }, 700);
  }
}
function nextTurn() {
  setTurn(currentTurn === 'player' ? 'ia' : 'player');
}
setTurn(currentTurn, { notifyWheel: false });
//FIN 

function formatTime(seconds) {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0');
  const sec = (seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

wheelImageEl.addEventListener("click", function() {
  if (currentTurn !== 'player') return;
  if (playPhase) return; // une fois en phase de jeu, la roue ne doit plus être utilisée

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

function fillArenaSlots() {
  if (playerSlotsFilled >= 4 && iaSlotsFilled >= 4) {
    arenaSlots.player.forEach(slot => slot.occupied = true);
    arenaSlots.ia.forEach(slot => slot.occupied = true);
    console.log('État des slots arène:', arenaSlots);

    // On passe en phase de jeu (tour par tour) : on désactive la roue désormais
    if (!playPhase) {
      playPhase = true;
      safeLog('Phase "tour par tour" démarrée.');
      // mettre à jour interactions pour n'autoriser qu'un dépôt par tour
      updateHandInteraction();
    }

    // Démarrer la partie si tous les slots sont remplis
    startPartieIfReady();
  }
}

document.getElementById("close-popup").addEventListener("click", function () {
  wheelPopup.style.display = "none";
});
window.addEventListener("click", function (e) {
  if (e.target === wheelPopup) wheelPopup.style.display = "none";
});
//Déclaration cartes
const POINTS = [
  { id: "pt_25",  typeId: "type_point", label: "+25s",  img: "3d-alarm.png",   description: "Ajoute 25 points au score" },
  { id: "pt_50",  typeId: "type_point", label: "+50s",  img: "clock_2.png",    description: "Ajoute 50 points au score" },
  { id: "pt_75",  typeId: "type_point", label: "+75s",  img:"clock_3.png",    description: "Ajoute 75 points au score" },
  { id: "pt_100", typeId: "type_point", label: "+100s", img:"clock_4.png",   description: "Ajoute 100 points au score" },
  { id: "pt_150", typeId: "type_point", label: "+150s", img:"clock.png",     description: "Ajoute 150 points au score" },
  { id: "pt_200", typeId: "type_point", label: "+200s", img:"clock.png",     description: "Ajoute 200 points au score" }
];
const ATTAQUES = [
  { id: "atk_vision", typeId: "type_attaque", label: "visionnaire",img: "visionary.png", description: "Permet de voir à l'avance les effets" },
  { id: "atk_stop",   typeId: "type_attaque", label: "stop",  img:"stop.png",      description: "Stoppe la roue de l'adversaire (sa prochaine action de roue sera bloquée)" },
  { id: "atk_echange",typeId: "type_attaque", label: "échange", img:"echange.png",   description: "Échange forcé de points entre joueurs" } ,
  { id: "atk_vol",    typeId: "type_attaque", label: "vol", img:"bandit.png",    description: "Vole 50 points à l'adversaire" },
  { id: "atk_destruction", typeId: "type_attaque", label: "destruction", img:"explosion.png", description: "Détruit une carte (inflige -60 points à l'adversaire)" },
  { id: "atk_reduction", typeId: "type_attaque", label: "réduction", img:"limited_2.png", description: "Réduit le temps adverse de 30 secondes" },
  { id: "atk_limitation", typeId: "type_attaque", label: "limitation", img: "sablier.png", description: "Limite les gains adverses (applique -25% sur gains pendant 30s)" }
];
const DEFENSES = [
  { id: "def_masque", typeId: "type_defense", label: "masque", img:"theatre.png", description: "Masque les effets entrants (bloque la prochaine attaque)" },
  { id: "def_blocage", typeId: "type_defense", label: "blocage", img: "no_malus.png", description: "Bloque une attaque (idem masque)" },
  { id: "def_renvoi", typeId: "type_defense", label: "renvoi_Attaque", img:"renvoi.png", description: "Renvoie la prochaine attaque à l'attaquant" },
  { id: "def_explosion", typeId: "type_defense", label: "explosion_Nettoyage", img: "exploseEtNettoi.png", description: "Explose et inflige -100 points à l'adversaire" },
  { id: "def_bouclier", typeId: "type_defense", label: "bouclier", img:"bouclier.png", description: "Ajoute une protection temporaire (2 attaques)" },
  { id: "def_restauration", typeId: "type_defense", label: "restauration_Etat", img: "super-power.png", description: "Restaure 30 secondes au timer" },
  { id: "def_suppression", typeId: "type_defense", label: "suppresion_malus", img: "no-bomb.png", description: "Supprime un malus actif" }
];
const MALUS = [
  { id: "malus_hasard", typeId: "type_malus", label: "Effet_hasard_malus", img:"effet.png", description: "Inflige -30 points aléatoirement" },
  { id: "malus_division", typeId: "type_malus", label: "division_points_2", img: "division.png", description: "Divise les points du joueur par 2" },
  { id: "malus_perteTour", typeId: "type_malus", label: "aucun_gain_tout_perdu", img: "perte.png", description: "Perd le prochain tour (skip)" },
  { id: "malus_reductionInv", typeId: "type_malus", label: "réduction_temporaire_inventaire", img: "réduction.png", description: "Réduit l'efficacité des gains (-20% pendant 30s)" },
  { id: "malus_perte50",typeId: "type_malus", label: "perte_50secs", img:"Moins-50.png", description: "Perte de 50 secondes" },
  { id: "malus_disparition",typeId: "type_malus", label: "disparition_joker", img: "Disparition_Joker.png", description: "Un joker de l'adversaire est désactivé (si présent)" },
  { id: "malus_reduction1", typeId: "type_malus", label:"réduction_inventaire_1", img: "Moins-1.png", description: "Réduit l'inventaire (effet logique, -10 points appliqués maintenant)" },
  { id: "malus_perte30",typeId: "type_malus", label: "perte_30%_temps", img: "Perte_30.png", description: "Perte de 30% du temps restant" },
  { id: "malus_limitGain",typeId: "type_malus", label:"limitation_futurs_gains", img:"sablier.png", description: "Limitation des futurs gains (-50% pendant 45s)" },
  { id: "malus_blocJoker",typeId: "type_malus", label: "blocage_joker_while_3mins", img:"no-bomb.png", description: "Pas de joker pendant 3 minutes" }
];
const BONUS = [
  { id: "bonus_supprMalus",typeId: "type_bonus", label: "supression_All_malus_Actifs", img: "cadeau_3.png", description: "Supprime tous les malus actifs" },
  { id: "bonus_x3", typeId: "type_bonus",  label: "Temps_multiplié_x3", img:"cadeau.png", description: "Prochain gain x3 (1 utilisation)" },
  { id: "bonus_jokerHasard",typeId: "type_bonus", label: "Gagner_joker_hasard", img: "cadeau_7.png", description: "Reçoit un joker aléatoire (flag)" },
  { id: "bonus_carteHasard",typeId: "type_bonus",  label: "Gagner_Carte_hasard", img:"cadeau_6.png", description: "Donne +50 points" },
  { id: "bonus_plus30", typeId: "type_bonus", label:"Ajout_30%_All_gains", img: "cadeau_5.png", description: "Ajoute +30% aux gains pendant 30s" },
  { id: "bonus_slots", typeId: "type_bonus", label:"Ajout_2_Slots_Cartes", img: "cadeau_4.png", description: "Ajoute 2 slots (effet logique : +40 points maintenant)" },
  { id: "bonus_double",typeId: "type_bonus",  label:"Double_Points_gagnés", img: "cadeau.png", description: "Prochain gain x2 (1 utilisation)" }
];
const JOKERS = [
  { id: "joker_limite",typeId: "type_joker",  label: "Limitation_Effet_Autre_Carte", img: "joker_2.png", description: "Imite l’effet d’une autre carte (flag)" },
  { id: "joker_retourne", typeId: "type_joker",  label:"Retourne_Attaque", img:"joker.png", description: "Retourne la prochaine attaque" },
  { id: "joker_neutralise",typeId: "type_joker", label:"Neutralisation_Pickpocket_ET_Autodestruction", img: "joker_2.png", description: "Neutralise pickpocket et autodestruction (flag)" },
  { id: "joker_parade",typeId: "type_joker",   label: "parade_contre_EchangeForcé_ET_Mine", img: "joker.png", description: "Parade contre échange forcé et mine (flag)" },
  { id: "joker_immunite",typeId: "type_joker", label: "Immunité_totale", img: "joker_2.png", description: "Immunité totale 30s" },
  { id: "joker_annule",typeId: "type_joker",   label: "Annulation_All_limitations", img: "joker.png", description: "Annule toutes les limitations (flag)" },
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

const effects = {
  player: {},
  ia: {}
};

// Utilitaires
function getOpponent(player) {
  return player === 'player' ? 'ia' : 'player';
}
function safeLog(...args) { console.log('[RULES]', ...args); }

// UI update helpers (utilisent tes éléments si présents)
function updateScoresUI() {
  const sp = document.getElementById('score-player');
  const si = document.getElementById('score-ia');
  if (sp) sp.textContent = `⭐ ${scores.player}`;
  if (si) si.textContent = `⭐ ${scores.ia}`;
}
function updateTimersUI() {
  const tp = document.getElementById('timer-player');
  const ti = document.getElementById('timer-ia');
  if (tp) tp.textContent = formatTime(Math.max(0, timers.player));
  if (ti) ti.textContent = formatTime(Math.max(0, timers.ia));
}
function checkVictoryOrTimeout() {
  // Victoire par score
  if (scores.player >= 1000 || scores.ia >= 1000) {
    if (partieInterval) clearInterval(partieInterval);
    const winner = scores.player >= 1000 ? 'Joueur' : 'IA';
    alert(`${winner} a gagné (1000 points atteint).`);
    safeLog('Partie terminée par score', scores);
    return true;
  }
  // Timeout géré ailleurs (startPartieIfReady) mais on peut vérifier rapidement
  if (timers.player <= 0 || timers.ia <= 0) {
    if (partieInterval) clearInterval(partieInterval);
    if (timers.player <= 0 && timers.ia <= 0) alert('Temps écoulé pour les deux ! Match nul.');
    else if (timers.player <= 0) alert('Joueur a perdu le temps ! Partie terminée.');
    else alert('IA a perdu le temps ! Partie terminée.');
    safeLog('Partie terminée par timeout', timers);
    return true;
  }
  return false;
}

const scoreUpdater = (typeof addScore === 'function')
  ? addScore
  : function(player, pts) {
      scores[player] = (scores[player] || 0) + pts;
      updateScoresUI();
      checkVictoryOrTimeout();
    };

// Helpers arène & main
function getArenaSlotDOMs(player) {
  const el = arenaEl;
  if (!el) return [];
  return Array.from(el.querySelectorAll(`.drop-slots.${player} .slot`));
}
function findFreeArenaSlotDOM(player) {
  return getArenaSlotDOMs(player).find(s => !s.classList.contains('occupied'));
}
function findRandomOccupiedArenaSlotDOM(player) {
  const arr = getArenaSlotDOMs(player).filter(s => s.classList.contains('occupied'));
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
function removeArenaCardAtSlot(slotDOM, owner) {
  if (!slotDOM) return false;
  const img = slotDOM.querySelector('img.arena-card');
  if (img) {
    img.src = '';
    img.style.display = 'none';
    img.style.opacity = 0;
  }
  slotDOM.classList.remove('occupied');
  const idx = parseInt(slotDOM.dataset.slot, 10);
  if (!Number.isNaN(idx) && Array.isArray(arenaSlots[owner]) && arenaSlots[owner][idx]) {
    arenaSlots[owner][idx].occupied = false;
  }
  return true;
}
function placeCardImageInArena(player, imgSrc) {
  const target = findFreeArenaSlotDOM(player);
  if (!target) return null;
  const img = target.querySelector('img.arena-card');
  if (!img) return null;
  img.src = imgSrc;
  img.style.display = 'block';
  img.style.opacity = '1';
  target.classList.add('occupied');
  const idx = parseInt(target.dataset.slot, 10);
  if (!Number.isNaN(idx) && Array.isArray(arenaSlots[player]) && arenaSlots[player][idx]) {
    arenaSlots[player][idx].occupied = true;
  }
  return target;
}
function placeCardInHand(player, imgSrc) {
  const hand = document.querySelector(`.hand.${player}`);
  if (!hand) return false;
  const slots = Array.from(hand.querySelectorAll('.card'));
  const free = slots.find(s => !s.style.backgroundImage || s.style.backgroundImage === '' || s.style.opacity === '0.5');
  if (free) {
    free.style.backgroundImage = `url(${imgSrc})`;
    free.style.backgroundSize = 'cover';
    free.style.backgroundPosition = 'center';
    free.style.opacity = '1';
    free.style.pointerEvents = 'auto';
    free.style.border = '2px solid gold';
    return true;
  }
  return false;
}

// Voler une carte dans l’arène (DOM) : clone visuel + transfert logique
function stealArenaCard(fromPlayer, toPlayer) {
  const victimSlot = findRandomOccupiedArenaSlotDOM(fromPlayer);
  if (!victimSlot) {
    safeLog('Aucune carte à voler dans l’arène de', fromPlayer);
    return false;
  }
  const img = victimSlot.querySelector('img.arena-card');
  if (!img || !img.src) return false;

  const src = img.src;

  // Retirer du slot adverse
  removeArenaCardAtSlot(victimSlot, fromPlayer);

  // Tenter de placer dans l'arène du voleur
  const placed = placeCardImageInArena(toPlayer, src);
  if (placed) {
    safeLog(`${toPlayer} a volé une carte depuis ${fromPlayer} (placée en arène).`);
    return true;
  }
  // Sinon tenter main
  const placedHand = placeCardInHand(toPlayer, src);
  if (placedHand) {
    safeLog(`${toPlayer} a volé une carte depuis ${fromPlayer} (placée en main).`);
    return true;
  }

  // fallback : donner des points si pas de place
  scoreUpdater(toPlayer, 25);
  safeLog(`${toPlayer} a volé une carte mais pas d'emplacement — crédité +25 pts.`);
  return true;
}
// Détruire (annihiler) une carte dans l’arène adverse
function destroyArenaCard(ofPlayer) {
  const slot = findRandomOccupiedArenaSlotDOM(ofPlayer);
  if (!slot) {
    safeLog('Aucune carte à détruire dans l’arène de', ofPlayer);
    return false;
  }
  removeArenaCardAtSlot(slot, ofPlayer);
  safeLog('Carte détruite dans l’arène de', ofPlayer);
  return true;
}
// Donner une carte aléatoire (util pour bonus_jokerHasard / bonus_carteHasard)
function randomCardFromAll() {
  const all = [].concat(...Object.values(CARD_MANAGER));
  return all[Math.floor(Math.random() * all.length)];
}

// ------- ANIMATIONS UTILES --------
function pulse(target, { color = 'yellow', scale = 1.2, duration = 500 } = {}) {
  if (!target) return;
  target.style.transition = `transform ${duration/1000}s ease, box-shadow ${duration/1000}s ease`;
  target.style.transform = `scale(${scale})`;
  target.style.boxShadow = `0 0 15px 5px ${color}`;
  setTimeout(() => {
    target.style.transform = `scale(1)`;
    target.style.boxShadow = 'none';
  }, duration);
}

function shake(target, { intensity = 5, duration = 500, color = 'red' } = {}) {
  if (!target) return;
  target.style.transition = `transform ${duration/1000}s`;
  let i = 0;
  const interval = 20;
  const maxSteps = duration / interval;
  const original = target.style.transform || '';
  const sh = setInterval(() => {
    const x = (Math.random() - 0.5) * intensity;
    const y = (Math.random() - 0.5) * intensity;
    target.style.transform = `translate(${x}px, ${y}px)`;
    i++;
    if (i >= maxSteps) {
      clearInterval(sh);
      target.style.transform = original;
    }
  }, interval);
  target.style.border = `2px solid ${color}`;
  setTimeout(() => target.style.border = '', duration);
}

function glow(target, { color='cyan', duration=1000 } = {}) {
  if (!target) return;
  target.style.transition = `box-shadow ${duration/1000}s ease`;
  target.style.boxShadow = `0 0 25px 10px ${color}`;
  setTimeout(() => target.style.boxShadow = '', duration);
}

function flash(target, { color='yellow', repeats=3, duration=300 } = {}) {
  if (!target) return;
  let i = 0;
  const interval = setInterval(() => {
    target.style.backgroundColor = (i%2===0)?color:'';
    i++;
    if (i >= repeats*2) clearInterval(interval);
  }, duration);
}

function slideToOpponent(cardDOM, player) {
  if (!cardDOM) return;
  const rect = cardDOM.getBoundingClientRect();
  const opponent = player==='player1'?'player2':'player1';
  const targetSlot = document.querySelector(`.hand.${opponent} .card:not(.occupied)`);
  if (!targetSlot) return;
  const dx = targetSlot.getBoundingClientRect().left - rect.left;
  const dy = targetSlot.getBoundingClientRect().top - rect.top;
  cardDOM.style.transition = 'transform 0.7s ease';
  cardDOM.style.transform = `translate(${dx}px, ${dy}px)`;
  setTimeout(() => {
    cardDOM.style.transform = '';
    targetSlot.appendChild(cardDOM);
  }, 700);
}

function explode(target) {
  if (!target) return;
  target.classList.add('explode-effect');
  setTimeout(() => target.classList.remove('explode-effect'), 600);
}

// -------------------------
// getAnimationTarget (fiabilisé)
// -------------------------
function getAnimationTarget(player, targetType, cardId) {
  const arena = document.getElementById('arena');
  // fallback générique
  const handEl = document.querySelector(`.hand.${player}`);
  const statusEl = document.querySelector(`.player-indicator.${player}`) || document.querySelector(`.status.${player}`);

  try {
    switch (targetType) {
      case 'slot': {
        if (!arena) return null;
        // Priorité : slot contenant l'image précise (si présent)
        let img = arena.querySelector(`.drop-slots.${player} .slot.occupied img.arena-card[src*="${cardId}"]`);
        if (img) return img;
        // sinon renvoyer première image occupée
        img = arena.querySelector(`.drop-slots.${player} .slot.occupied img.arena-card`);
        return img || null;
      }
      case 'hand': {
        // cherche image exacte puis case contenant data-cardKey
        const byImg = document.querySelector(`.hand.${player} .card[data-cardkey="${cardId}"]`);
        if (byImg) return byImg;
        const cardImg = document.querySelector(`.hand.${player} .card img[src*="${cardId}"]`);
        if (cardImg) return cardImg;
        // fallback: première carte visible
        const anyCard = document.querySelector(`.hand.${player} .card`);
        return anyCard || null;
      }
      case 'player-indicator':
        return statusEl || handEl || document.getElementById('arena');
      case 'arena':
        return arena ? arena.querySelector(`.drop-slots.${player}`) || arena : null;
      default:
        return null;
    }
  } catch (err) {
    console.warn('getAnimationTarget err', err);
    return null;
  }
}

// -------------------------
// applyCardEffect (avec animation de transfert score/timer)
// -------------------------
function applyCardEffect(player, cardId) {
  const opponent = getOpponent(player);
  safeLog(`${player} joue ${cardId}`);

  
  function getCardDescription(id) {
    if (!id || !CARD_MANAGER) return null;
    for (const groupName in CARD_MANAGER) {
      const arr = CARD_MANAGER[groupName];
      if (!Array.isArray(arr)) continue;
      const found = arr.find(c => c.id === id);
      if (found) return found.description || found.label || found.id;
    }
    return null;
  }

  function getCardTypeFromId(id) {
    if (!id || typeof id !== 'string') return 'neutral';
    if (id.startsWith('pt_')) return 'point';
    if (id.startsWith('malus_')) return 'malus';
    if (id.startsWith('atk_')) return 'attack';
    if (id.startsWith('def_')) return 'defense';
    if (id.startsWith('joker_')) return 'joker';
    if (id.startsWith('bonus_')) return 'bonus';
    return 'neutral';
  }

  function normalizeEntity(e) {
    if (e === 'player') return 'Joueur';
    if (e === 'ia' || e === 'IA') return 'IA';
    return String(e);
  }

  function showMagicToast(...parts) {
    try {
      // Détection de la cible (player/ia) dans les arguments du toast
      let anchorKey = null;
      for (const p of parts) {
        if (p === player) { anchorKey = player; break; }
        if (p === opponent) { anchorKey = opponent; break; }
        if (typeof p === 'string') {
          const low = p.toLowerCase();
          if (low === 'player' || low === 'joueur') { anchorKey = player; break; }
          if (low === 'ia' || low === 'i.a.' ) { anchorKey = opponent; break; }
        }
      }

      // description de la carte / texte utilisateur
      const cardDesc = getCardDescription(cardId) || '';
      const userText = parts
        .filter(p => p !== undefined && p !== null)
        .map(p => (p === player || p === opponent) ? normalizeEntity(p) : String(p))
        .join(' ')
        .trim();
      const finalText = cardDesc ? (cardDesc + (userText ? ` — ${userText}` : '')) : (userText || 'Effet appliqué');

      // choix du conteneur selon anchorKey (par joueur) ou global fallback
      const containerId = anchorKey ? `game-toast-container-${anchorKey}` : 'game-toast-container-global';
      let container = document.getElementById(containerId);

      // If container not found, create and position it.
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.zIndex = 99999;
        container.style.pointerEvents = 'none';
        // Positioning: if anchored to a player, position close to that player's arena slot row
        if (anchorKey) {
          // Attempt to anchor near arena drop slots row, otherwise near the hand, otherwise fallback top-right
          const arenaRow = document.querySelector(`#arena .drop-slots.${anchorKey}`);
          const someSlot = document.querySelector(`#arena .drop-slots.${anchorKey} .slot`) || null;
          const fallbackHand = document.querySelector(`.hand.${anchorKey}`) || null;
          let rect = null;
          if (someSlot) rect = someSlot.getBoundingClientRect();
          else if (arenaRow) rect = arenaRow.getBoundingClientRect();
          else if (fallbackHand) rect = fallbackHand.getBoundingClientRect();

          if (rect) {
            // position fixed next to the slot row (to the right)
            container.style.position = 'fixed';
            // We'll set left/top approximatively, then after DOM insertion we adjust vertically to center the container.
            container.style.left = Math.min(window.innerWidth - 20, rect.right + 12) + 'px';
            container.style.top = Math.max(6, rect.top + (rect.height / 2) - 40) + 'px';
            container.dataset.anchorRectTop = rect.top;
          } else {
            // fallback top-right
            Object.assign(container.style, { position: 'fixed', right: '20px', top: '20px' });
          }
        } else {
          // global fallback
          Object.assign(container.style, { position: 'fixed', right: '20px', top: '20px' });
        }
        document.body.appendChild(container);
      } else {
        // if container exists and anchored, try to keep it next to the anchor (update position in case of resize)
        if (anchorKey) {
          const someSlot = document.querySelector(`#arena .drop-slots.${anchorKey} .slot`) || document.querySelector(`#arena .drop-slots.${anchorKey}`) || null;
          if (someSlot) {
            const rect = someSlot.getBoundingClientRect();
            container.style.left = Math.min(window.innerWidth - 20, rect.right + 12) + 'px';
            container.style.top = Math.max(6, rect.top + (rect.height / 2) - (container.offsetHeight/2)) + 'px';
          }
        }
      }

      // choose style based on card type
      const type = getCardTypeFromId(cardId);
      const styleMap = {
        point: { bg: 'linear-gradient(135deg,#2ecc71,#27ae60)', glow: '0 6px 20px rgba(46,204,113,0.28)' }, // vert
        malus: { bg: 'linear-gradient(135deg,#e74c3c,#c0392b)', glow: '0 6px 20px rgba(231,76,60,0.28)' }, // rouge
        attack: { bg: 'linear-gradient(135deg,#f39c12,#e67e22)', glow: '0 6px 20px rgba(243,156,18,0.22)' }, // orange
        defense: { bg: 'linear-gradient(135deg,#3498db,#2980b9)', glow: '0 6px 20px rgba(52,152,219,0.20)' }, // bleu
        joker: { bg: 'linear-gradient(135deg,#8e44ad,#9b59b6)', glow: '0 6px 20px rgba(142,68,173,0.18)' }, // violet
        bonus: { bg: 'linear-gradient(135deg,#f1c40f,#f39c12)', glow: '0 6px 20px rgba(241,196,15,0.18)' }, // or
        neutral: { bg: 'linear-gradient(135deg,#ffffff,#ececec)', glow: '0 6px 20px rgba(0,0,0,0.06)' }
      };
      const s = styleMap[type] || styleMap.neutral;

      // Build the toast element with owner/title
      const toast = document.createElement('div');
      toast.className = 'game-toast';
      Object.assign(toast.style, {
        pointerEvents: 'auto',
        minWidth: '220px',
        maxWidth: '360px',
        padding: '10px 14px',
        borderRadius: '12px',
        color: (type === 'neutral' ? '#222' : '#fff'),
        background: s.bg,
        boxShadow: s.glow,
        fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '13px',
        lineHeight: '1.2',
        transform: 'translateY(-6px)',
        opacity: '0',
        transition: 'transform .25s ease, opacity .25s ease',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'flex-start'
      });

      // Header with owner name (title)
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.style.width = '100%';

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';

      const typeDot = document.createElement('span');
      typeDot.style.width = '10px';
      typeDot.style.height = '10px';
      typeDot.style.borderRadius = '50%';
      typeDot.style.display = 'inline-block';
      const dotColorMap = {
        point: '#2ecc71', malus: '#e74c3c', attack: '#f39c12',
        defense: '#3498db', joker: '#8e44ad', bonus: '#f1c40f', neutral: '#999'
      };
      typeDot.style.background = dotColorMap[type] || '#999';

      // owner badge (player/IA) shown prominently
      const ownerBadge = document.createElement('span');
      ownerBadge.style.fontSize = '12px';
      ownerBadge.style.fontWeight = 700;
      ownerBadge.style.opacity = '0.95';
      ownerBadge.style.padding = '2px 8px';
      ownerBadge.style.borderRadius = '999px';
      ownerBadge.style.background = 'rgba(0,0,0,0.08)';
      ownerBadge.style.color = (type === 'neutral' ? '#222' : '#fff');
      // if anchorKey exists we display an owner (Joueur/IA), else a generic title
      ownerBadge.textContent = anchorKey ? normalizeEntity(anchorKey) : (cardDesc ? cardDesc.split(' ')[0] : 'Info');

      const title = document.createElement('div');
      title.style.fontSize = '13px';
      title.style.fontWeight = 600;
      title.style.opacity = '0.95';
      title.textContent = cardDesc ? (cardDesc.length < 36 ? cardDesc : cardDesc.slice(0,34) + '…') : (userText || 'Effet');

      left.appendChild(typeDot);
      left.appendChild(ownerBadge);
      left.appendChild(title);
      header.appendChild(left);

      // close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      Object.assign(closeBtn.style, {
        background: 'transparent',
        border: 'none',
        color: (type === 'neutral' ? '#555' : 'rgba(255,255,255,0.9)'),
        cursor: 'pointer',
        fontSize: '12px',
        padding: '2px 6px',
        borderRadius: '6px',
      });
      closeBtn.addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 220);
      });
      header.appendChild(closeBtn);

      const body = document.createElement('div');
      body.style.fontSize = '12px';
      body.style.opacity = '0.95';
      body.style.maxHeight = '120px';
      body.style.overflow = 'hidden';
      body.textContent = finalText;

      toast.appendChild(header);
      toast.appendChild(body);

      // add toast to container (newest on top)
      container.prepend(toast);

      // animate in
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      // after append, if anchored, adjust vertical centering relative to anchor
      if (anchorKey) {
        const anchorSlot = document.querySelector(`#arena .drop-slots.${anchorKey} .slot`) ||
                           document.querySelector(`#arena .drop-slots.${anchorKey}`) ||
                           document.querySelector(`.hand.${anchorKey}`);
        if (anchorSlot) {
          const rect = anchorSlot.getBoundingClientRect();
          // center the container vertically around the slot center
          const newTop = Math.max(6, rect.top + (rect.height / 2) - (container.offsetHeight / 2));
          // ensure it stays on viewport
          container.style.top = Math.min(Math.max(6, newTop), window.innerHeight - container.offsetHeight - 8) + 'px';
          // adjust left again (in case of window resizing)
          container.style.left = Math.min(window.innerWidth - 20 - container.offsetWidth, rect.right + 12) + 'px';
        }
      }

      // auto remove after TTL, pause on hover
      let ttl = 3000;
      let removal = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-8px)';
        setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 220);
      }, ttl);

      toast.addEventListener('mouseenter', () => clearTimeout(removal));
      toast.addEventListener('mouseleave', () => {
        removal = setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-8px)';
          setTimeout(() => { if (toast.parentElement) toast.parentElement.removeChild(toast); }, 220);
        }, 1500);
      });

    } catch (e) {
      console.warn('showMagicToast erreur', e);
    }
  } // end showMagicToast

  // trouve la source DOM de la carte (slot image ou main card) pour ancrer l'animation
  function findSourceDom(owner, cardId) {
    // essaye slot précis
    try {
      const arena = document.getElementById('arena');
      if (arena) {
        const img = arena.querySelector(`.drop-slots.${owner} .slot.occupied img.arena-card[src*="${cardId}"]`);
        if (img) return img;
        const slot = arena.querySelector(`.drop-slots.${owner} .slot.occupied`);
        if (slot) return slot;
      }
      // main card with data-cardKey or image
      const byKey = document.querySelector(`.hand.${owner} .card[data-cardkey="${cardId}"]`);
      if (byKey) return byKey;
      const byImg = document.querySelector(`.hand.${owner} .card img[src*="${cardId}"]`);
      if (byImg) return byImg;
      const handAny = document.querySelector(`.hand.${owner} .card`);
      if (handAny) return handAny;
      // fallback to player-indicator
      const status = document.querySelector(`.player-indicator.${owner}`) || document.querySelector(`.status.${owner}`);
      return status || document.getElementById('arena') || document.body;
    } catch (e) {
      return document.body;
    }
  }

  // trouve l'élément DOM du compteur (score ou timer), plusieurs fallback
  function findCounterElement(targetPlayer, kind) {
    // 'score' || 'timer'
    const selectors = [];
    if (kind === 'score') {
      selectors.push(`#${targetPlayer}-score`, `#score-${targetPlayer}`,
                     `.score.${targetPlayer}`, `.player-score.${targetPlayer}`,
                     `.player-indicator.${targetPlayer} .score`,
                     `.player-indicator.${targetPlayer} .score-value`,
                     `.status.${targetPlayer} .score`);
    } else {
      selectors.push(`#${targetPlayer}-timer`, `#timer-${targetPlayer}`,
                     `.timer.${targetPlayer}`, `.player-timer.${targetPlayer}`,
                     `.player-indicator.${targetPlayer} .timer`,
                     `.player-indicator.${targetPlayer} .time`,
                     `.status.${targetPlayer} .timer`);
    }
    for (const s of selectors) {
      try {
        const el = document.querySelector(s);
        if (el) return el;
      } catch (e) { /* ignore invalid selectors */ }
    }
    // fallback: player indicator or arena
    const fallback = document.querySelector(`.player-indicator.${targetPlayer}`) ||
                     document.querySelector(`.status.${targetPlayer}`) ||
                     document.getElementById('arena') ||
                     document.body;
    return fallback;
  }

  //  Crée et anime l'étiquette flottante depuis startEl vers endEl. Retourne Promise.
  function animateFloatingLabel(startEl, endEl, labelText, opts = {}) {
    return new Promise(resolve => {
      try {
        const {
          duration = 900,
          color = '#2ecc71', // vert par défaut pour gains
          negativeColor = '#e74c3c',
          size = 16
        } = opts;

        if (!startEl || !endEl) {
          resolve();
          return;
        }

        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();

        // texte et style
        const isNegative = String(labelText).trim().startsWith('-');
        const bg = isNegative ? 'linear-gradient(90deg,#ff6b6b,#e74c3c)' : 'linear-gradient(90deg,#71e07e,#2ecc71)';
        const textColor = '#fff';

        const label = document.createElement('div');
        label.className = 'floating-transfer-label';
        label.textContent = labelText;
        Object.assign(label.style, {
          position: 'fixed',
          left: (startRect.left + startRect.width/2) + 'px',
          top: (startRect.top + startRect.height/2) + 'px',
          transform: 'translate(-50%,-50%) scale(1)',
          padding: '6px 10px',
          borderRadius: '12px',
          color: textColor,
          fontWeight: 700,
          fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
          fontSize: `${Math.max(12, size)}px`,
          pointerEvents: 'none',
          zIndex: 2147483647,
          background: bg,
          boxShadow: '0 8px 18px rgba(0,0,0,0.28)',
          opacity: '1',
          transition: `transform ${duration}ms cubic-bezier(.2,.9,.2,1), opacity ${Math.floor(duration*0.6)}ms linear`,
          willChange: 'transform, opacity, left, top'
        });

        document.body.appendChild(label);

        // compute translation (we animate via transform translate, so compute delta)
        const startCenterX = startRect.left + startRect.width/2;
        const startCenterY = startRect.top + startRect.height/2;
        const endCenterX = endRect.left + endRect.width/2;
        const endCenterY = endRect.top + endRect.height/2;

        const dx = endCenterX - startCenterX;
        const dy = endCenterY - startCenterY;

        // small entrance pop then fly
        requestAnimationFrame(() => {
          label.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.9)`;
          label.style.opacity = '0.95';
        });

        // after finish: little shrink/fade
        const cleanup = () => {
          try {
            label.style.opacity = '0';
            label.style.transform += ' scale(0.6)';
            setTimeout(() => {
              if (label.parentElement) label.parentElement.removeChild(label);
              resolve();
            }, 220);
          } catch (e) { if (label.parentElement) label.parentElement.removeChild(label); resolve(); }
        };

        // ensure cleanup after duration + small margin
        setTimeout(cleanup, duration + 80);

      } catch (e) {
        console.warn('animateFloatingLabel error', e);
        resolve();
      }
    });
  }

  // anime visuellement le chiffre d'un compteur DOM de from -> to (utilise innerText / textContent)
  function animateNumericChange(counterEl, fromVal, toVal, duration = 700) {
    try {
      if (!counterEl || typeof fromVal !== 'number' || typeof toVal !== 'number') return;
      // extraire nombre dans le texte (si contenu complexe)
      const textBefore = (counterEl.textContent || '').trim();
      // decide if counterEl contains only number
      const onlyNumber = /^-?\d+$/.test(textBefore);
      if (!onlyNumber) {
        // try to find the first number and animate it in place,
        // but to keep it robust, we will temporarily animate a small badge near the counter
        // simpler: pulse the counter
        pulse(counterEl, { color: toVal >= fromVal ? 'lime' : 'red', scale: 1.06, duration: 400 });
        return;
      }
      const start = Math.floor(fromVal);
      const end = Math.floor(toVal);
      if (start === end) return;
      const startTime = performance.now();
      function step(now) {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = (1 - Math.cos(t * Math.PI)) / 2; // easing in/out
        const current = Math.round(start + (end - start) * eased);
        counterEl.textContent = String(current);
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    } catch (e) {
      // fallback: pulse
      try { pulse(counterEl, { color: toVal >= fromVal ? 'lime' : 'red' }); } catch(e2){}
    }
  }

  // wrappers pour appliquer et animer en même temps (score/timer)
  function applyScoreDelta(targetPlayer, delta, sourceDom) {
    try {
      if (!delta || delta === 0) {
        // nothing to apply
        return;
      }
      const oldScore = (typeof scores !== 'undefined' && scores[targetPlayer] !== undefined) ? scores[targetPlayer] : null;
      // apply immediately to game state (conserve moteur intact)
      scoreUpdater(targetPlayer, delta);
      const newScore = (typeof scores !== 'undefined' && scores[targetPlayer] !== undefined) ? scores[targetPlayer] : (oldScore !== null ? oldScore + delta : null);

      // find counter DOM
      const toEl = findCounterElement(targetPlayer, 'score');
      // label text
      const labelText = (delta > 0 ? `+${delta} pts` : `${delta} pts`);
      // animate floating label from sourceDom -> toEl
      animateFloatingLabel(sourceDom || findSourceDom(targetPlayer, cardId), toEl, labelText, {
        duration: 900,
        color: delta > 0 ? '#2ecc71' : '#e74c3c'
      });
      // animate numeric change on counter if possible
      if (oldScore !== null && newScore !== null) {
        animateNumericChange(toEl, oldScore, newScore, 900);
      } else {
        pulse(toEl, { color: delta>0 ? 'lime' : 'red', scale: 1.06 });
      }
    } catch (e) {
      console.warn('applyScoreDelta error', e);
      // fallback plain update
      scoreUpdater(targetPlayer, delta);
      updateScoresUI();
    }
  }

  function applyScoreSet(targetPlayer, newValue, sourceDom) {
    try {
      const oldScore = (typeof scores !== 'undefined' && scores[targetPlayer] !== undefined) ? scores[targetPlayer] : 0;
      const delta = Math.floor((newValue || 0) - oldScore);
      // set immediately
      scores[targetPlayer] = newValue;
      updateScoresUI();
      // animate
      const toEl = findCounterElement(targetPlayer, 'score');
      const labelText = (delta > 0 ? `+${delta} pts` : `${delta} pts`);
      animateFloatingLabel(sourceDom || findSourceDom(targetPlayer, cardId), toEl, labelText, {
        duration: 900,
        color: delta > 0 ? '#2ecc71' : '#e74c3c'
      });
      animateNumericChange(toEl, oldScore, newValue, 900);
    } catch (e) {
      console.warn('applyScoreSet error', e);
      scores[targetPlayer] = newValue;
      updateScoresUI();
    }
  }

  function applyTimerDelta(targetPlayer, delta, sourceDom) {
    try {
      if (!delta || delta === 0) {
        return;
      }
      const oldTimer = (typeof timers !== 'undefined' && timers[targetPlayer] !== undefined) ? timers[targetPlayer] : 0;
      // apply immediately
      timers[targetPlayer] = Math.max(0, (timers[targetPlayer] || 0) + delta);
      updateTimersUI();
      const newTimer = timers[targetPlayer];
      const toEl = findCounterElement(targetPlayer, 'timer');
      const labelText = (delta > 0 ? `+${delta}s` : `${delta}s`);
      animateFloatingLabel(sourceDom || findSourceDom(targetPlayer, cardId), toEl, labelText, {
        duration: 900,
        color: delta > 0 ? '#2ecc71' : '#e74c3c'
      });
      animateNumericChange(toEl, oldTimer, newTimer, 900);
    } catch (e) {
      console.warn('applyTimerDelta error', e);
      timers[targetPlayer] = Math.max(0, (timers[targetPlayer] || 0) + delta);
      updateTimersUI();
    }
  }

  const now = () => Date.now();

  function computeGain(targetPlayer, basePoints) {
    let pts = Math.floor(basePoints || 0);
    if (effects[targetPlayer].limitGainUntil && effects[targetPlayer].limitGainUntil > Date.now()) {
      const f = effects[targetPlayer].limitedGainFactor || 1;
      pts = Math.floor(pts * f);
    }
    if (effects[targetPlayer].reducedGainFactor) {
      pts = Math.floor(pts * effects[targetPlayer].reducedGainFactor);
    }
    if (effects[targetPlayer].plus30) {
      pts = Math.ceil(pts * 1.30);
      effects[targetPlayer].plus30 = false;
    }
    if (effects[targetPlayer].doubleNext) {
      pts = pts * 2;
      effects[targetPlayer].doubleNext = false;
    }
    if (effects[targetPlayer].x3Next) {
      pts = pts * 3;
      effects[targetPlayer].x3Next = false;
    }
    return Math.floor(pts);
  }

  function resolveDefenses(attacker, defender) {
    const tDef = effects[defender] || {};
    const targetDom = getAnimationTarget(defender, 'player-indicator');
    if (tDef.immunityUntil && Date.now() < tDef.immunityUntil) {
      glow(targetDom, { color: 'lime' });
      safeLog(defender, 'immunisé — attaque bloquée.');
      return { status: 'blocked', reason: 'immunity' };
    }
    if (tDef.shield && tDef.shield > 0) {
      tDef.shield = Math.max(0, tDef.shield - 1);
      pulse(targetDom, { color: 'aqua', scale: 1.15 });
      safeLog(defender, 'bouclier consommé — attaque bloquée.');
      return { status: 'blocked', reason: 'shield' };
    }
    if (tDef.blockNext) {
      tDef.blockNext = false;
      flash(targetDom, { color: 'white', repeats: 2 });
      safeLog(defender, 'blockNext consommé — attaque bloquée.');
      return { status: 'blocked', reason: 'blockNext' };
    }
    if (tDef.masked) {
      tDef.masked = false;
      pulse(targetDom, { color: 'silver' });
      safeLog(defender, 'masque consommé — attaque bloquée.');
      return { status: 'blocked', reason: 'masked' };
    }
    if (tDef.reflectNext) {
      tDef.reflectNext = false;
      flash(getAnimationTarget(defender, 'player-indicator'), { color: 'lime', repeats: 3 });
      safeLog(defender, 'reflectNext consommé — attaque renvoyée.');
      return { status: 'reflected', reason: 'reflect' };
    }
    if (tDef.absorbNext) {
      tDef.absorbNext = false;
      glow(getAnimationTarget(defender, 'player-indicator'), { color: 'purple' });
      safeLog(defender, 'absorbNext consommé — attaque absorbée.');
      return { status: 'absorbed', reason: 'absorb' };
    }
    return { status: 'ok' };
  }

  const animate = (type, whoOrDom, opt = {}) => {
    if (!whoOrDom) return;
    let dom = null;
    if (typeof whoOrDom === 'string') {
      dom = getAnimationTarget(whoOrDom, 'player-indicator', cardId);
    } else dom = whoOrDom;
    if (!dom) return;
    switch (type) {
      case 'pulse': pulse(dom, opt); break;
      case 'shake': shake(dom, opt); break;
      case 'glow': glow(dom, opt); break;
      case 'flash': flash(dom, opt); break;
      case 'explode': explode(dom, opt); break;
      case 'slide': slideToOpponent(dom, opt.player || player); break;
    }
  };

  const domPlayer = getAnimationTarget(player, 'player-indicator', cardId);
  const domOpponent = getAnimationTarget(opponent, 'player-indicator', cardId);
  const domArenaPlayer = getAnimationTarget(player, 'arena', cardId);
  const domArenaOpponent = getAnimationTarget(opponent, 'arena', cardId);

  //D. LA SUPPRESSION OU NETTOYAGE D'UNE CARTE
  switch (cardId) {
    // -------- POINTS (s'appliquent au joueur qui joue) ----------
    case 'pt_25':
    case 'pt_50':
    case 'pt_75':
    case 'pt_100':
    case 'pt_150':
    case 'pt_200': {
      const base = parseInt(cardId.split('_')[1]) || 0;
      const gain = computeGain(player, base);
      // visuel + mise à jour via wrapper
      applyScoreDelta(player, gain, findSourceDom(player, cardId));
      animate('pulse', domPlayer, { color: 'gold', scale: 1.3 });
      animate('flash', domArenaPlayer, { color: 'gold', repeats: 3 });
      // toast: show description
      showMagicToast(player);
      break;
    }

    // -------- ATTAQUES ----------
    case 'atk_vision': {
      effects[player].vision = (effects[player].vision || 0) + 1;
      safeLog(player, 'vision activée (flag).');
      showMagicToast(player, 'vision activée');
      animate('glow', domPlayer, { color: 'cyan', duration: 12000 });
      break;
    }

    case 'atk_stop': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent, { color: 'orange' }); showMagicToast('Roue stoppée bloquée', opponent); break; }
      if (res.status === 'reflected') {
        effects[player].wheelStopped = true;
        animate('shake', domPlayer, { color: 'orange' });
        safeLog('Stop renvoyé — roue stoppée pour', player);
        showMagicToast('Stop renvoyé — roue stoppée pour', player);
        break;
      }
      if (res.status === 'absorbed') {
        applyScoreDelta(opponent, 20, findSourceDom(opponent, cardId));
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, 'a absorbé l\'effet et gagne +20 pts');
        break;
      }
      effects[opponent].wheelStopped = true;
      safeLog('Roue stoppée pour', opponent);
      showMagicToast('Roue stoppée pour', opponent);
      animate('shake', domOpponent, { color: 'orange' });
      break;
    }

    case 'atk_echange': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('flash', domOpponent); showMagicToast('Échange bloqué', opponent); break; }
      const actualTarget = (res.status === 'reflected') ? player : opponent;
      const other = getOpponent(actualTarget);

      const mySlot = findRandomOccupiedArenaSlotDOM(actualTarget);
      const hisSlot = findRandomOccupiedArenaSlotDOM(other);
      if (mySlot && hisSlot) {
        const myImg = mySlot.querySelector('img.arena-card');
        const hisImg = hisSlot.querySelector('img.arena-card');
        const tmp = myImg.src;
        myImg.src = hisImg.src;
        hisImg.src = tmp;
        animate('flash', mySlot);
        animate('flash', hisSlot);
        safeLog('Échange d’arène entre', actualTarget, 'et', other);
        showMagicToast(actualTarget, 'échange d’arène avec', other);
      } else {
        const handA = document.querySelector(`.hand.${actualTarget}`);
        const handB = document.querySelector(`.hand.${other}`);
        if (handA && handB) {
          const cardsA = Array.from(handA.querySelectorAll('.card')).filter(c => c.style.backgroundImage);
          const cardsB = Array.from(handB.querySelectorAll('.card')).filter(c => c.style.backgroundImage);
          if (cardsA.length && cardsB.length) {
            const a = cardsA[Math.floor(Math.random()*cardsA.length)];
            const b = cardsB[Math.floor(Math.random()*cardsB.length)];
            const tmpbg = a.style.backgroundImage;
            a.style.backgroundImage = b.style.backgroundImage;
            b.style.backgroundImage = tmpbg;
            animate('flash', a);
            animate('flash', b);
            safeLog('Échange forcé de mains entre', actualTarget, 'et', other);
            showMagicToast(actualTarget, 'échange forcé de mains avec', other);
          } else {
            safeLog('Aucun échange possible — pas de cartes trouvées.');
            showMagicToast('Aucun échange possible — pas de cartes trouvées.');
          }
        }
      }
      break;
    }

    case 'atk_vol': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Vol bloqué', opponent); break; }
      if (res.status === 'reflected') {
        stealArenaCard(player, opponent);
        animate('slide', getAnimationTarget(player, 'hand', cardId));
        safeLog('Vol renvoyé : attaquant volé à son tour.');
        showMagicToast('Vol renvoyé : attaquant volé à son tour.');
        break;
      }
      if (res.status === 'absorbed') {
        applyScoreDelta(opponent, 25, findSourceDom(opponent, cardId));
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, 'a absorbé le vol et gagne +25 pts');
        break;
      }
      const stolen = stealArenaCard(opponent, player);
      if (!stolen) {
        const gain = computeGain(player, 50);
        applyScoreDelta(player, gain, findSourceDom(player, cardId));
        showMagicToast(player, `+${gain} points (crédit car pas d'emplacement)`);
      } else {
        safeLog('Carte volée depuis arène adverse.');
        showMagicToast('Carte volée depuis arène adverse.');
      }
      animate('slide', getAnimationTarget(player, 'arena', cardId));
      break;
    }

    case 'atk_destruction': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('explode', domOpponent); showMagicToast('Destruction bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      const destroyed = destroyArenaCard(targetName);
      if (!destroyed) {
        const hisHand = document.querySelector(`.hand.${targetName}`);
        if (hisHand) {
          const hisCards = Array.from(hisHand.querySelectorAll('.card')).filter(c => c.style.backgroundImage);
          if (hisCards.length) {
            const victim = hisCards[Math.floor(Math.random()*hisCards.length)];
            victim.style.backgroundImage = '';
            victim.style.opacity = 0.5;
            victim.style.pointerEvents = 'none';
            animate('explode', victim);
            safeLog('Carte détruite dans la main de', targetName);
            showMagicToast('Carte détruite dans la main de', targetName);
          }
        }
      } else {
        animate('explode', getAnimationTarget(targetName, 'arena', cardId));
        showMagicToast('Carte détruite en arène de', targetName);
      }
      if (res.status === 'absorbed') {
        applyScoreDelta(opponent, 60, findSourceDom(opponent, cardId));
        showMagicToast(opponent, '+60 points (absorption)');
      } else {
        applyScoreDelta(targetName, -60, findSourceDom(targetName, cardId));
        showMagicToast(targetName, '-60 points appliqués');
      }
      break;
    }

    case 'atk_reduction': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Réduction bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        applyTimerDelta(opponent, +10, findSourceDom(opponent, cardId));
        animate('pulse', domOpponent, { color: 'purple' });
        updateTimersUI();
        safeLog('Reduction absorbée : défenseur récupère du temps.');
        showMagicToast(opponent, 'Reduction absorbée : +10s pour défenseur');
      } else {
        applyTimerDelta(targetName, -30, findSourceDom(targetName, cardId));
        animate('shake', (targetName === player) ? domPlayer : domOpponent, { color: 'red' });
        safeLog(targetName, 'a perdu 30s (atk_reduction).');
        showMagicToast(targetName, 'a perdu 30s (atk_reduction).');
      }
      checkVictoryOrTimeout();
      break;
    }

    case 'atk_limitation': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('glow', domOpponent); showMagicToast('Limitation bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        applyScoreDelta(opponent, 15, findSourceDom(opponent, cardId));
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, '+15 points (absorption)');
      } else {
        effects[targetName].limitedInventory = (effects[targetName].limitedInventory || 0) + 1;
        effects[targetName].limitedGainFactor = 0.75;
        safeLog(targetName, 'limité (inventory, -25% gains).');
        showMagicToast(targetName, 'limitation : -25% sur gains (flag)');
        animate('glow', (targetName === player) ? domPlayer : domOpponent, { color: 'orange' });
      }
      break;
    }

    // -------- DEFENSES ----------
    case 'def_masque':
      effects[player].masked = true;
      safeLog(player, 'masque activé.');
      showMagicToast(player, 'Masque activé — bloque la prochaine attaque');
      animate('glow', domPlayer, { color: 'lightblue' });
      break;

    case 'def_blocage':
      effects[player].blockNext = true;
      safeLog(player, 'blockNext activé.');
      showMagicToast(player, 'Blocage activé — bloque la prochaine attaque');
      animate('pulse', domPlayer, { color: 'silver' });
      break;

    case 'def_renvoi':
      effects[player].reflectNext = true;
      safeLog(player, 'reflectNext activé.');
      showMagicToast(player, 'Renvoi activé — renvoie la prochaine attaque');
      animate('flash', domPlayer, { color: 'lime', repeats: 3 });
      break;

    case 'def_explosion': {
      const doms = getArenaSlotDOMs(opponent);
      doms.forEach(s => {
        if (s.classList.contains('occupied')) {
          removeArenaCardAtSlot(s, opponent);
          animate('explode', s);
        }
      });
      safeLog('Explosion : arène de', opponent, 'nettoyée.');
      showMagicToast('Explosion : arène de', opponent, 'nettoyée.');
      applyScoreDelta(opponent, -100, findSourceDom(opponent, cardId));
      animate('flash', domPlayer, { color: 'red' });
      break;
    }

    case 'def_bouclier':
      effects[player].shield = (effects[player].shield || 0) + 1;
      safeLog(player, 'bouclier ajouté (stack).');
      showMagicToast(player, 'Bouclier ajouté (consomme 1 attaque)');
      animate('glow', domPlayer, { color: 'aqua' });
      break;

    case 'def_restauration':
      applyTimerDelta(player, +30, findSourceDom(player, cardId));
      safeLog(player, '+30s timer restauré.');
      showMagicToast(player, '+30s restaurés');
      animate('pulse', domPlayer, { color: 'lime' });
      break;

    case 'def_suppression':
      effects[player] = {};
      safeLog(player, 'tous malus supprimés (reset).');
      showMagicToast(player, 'Tous les malus supprimés');
      animate('flash', domPlayer, { color: 'yellow', repeats: 4 });
      break;

    // -------- MALUS ----------
    case 'malus_hasard': {
      const maluses = ['malus_perte50', 'malus_reduction1', 'malus_perte30'];
      const pick = maluses[Math.floor(Math.random()*maluses.length)];
      safeLog('Malus hasard choisi :', pick);
      showMagicToast('Malus hasard choisi :', pick);
      applyCardEffect(player, pick);
      break;
    }

    case 'malus_division': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Division bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        applyScoreDelta(opponent, 30, findSourceDom(opponent, cardId));
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, '+30 points (absorption)');
      } else {
        const old = (scores[targetName] || 0);
        const newVal = Math.floor((scores[targetName] || 0) / 2);
        applyScoreSet(targetName, newVal, findSourceDom(targetName, cardId));
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, 'points divisés par 2.');
        showMagicToast(targetName, 'points divisés par 2.');
      }
      break;
    }

    case 'malus_perteTour': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Perte de tour bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        effects[player].skipNextTurn = true;
        animate('pulse', domPlayer, { color: 'purple' });
        showMagicToast(player, 'Skip appliqué à l\'attaquant (absorption)');
      } else {
        effects[targetName].skipNextTurn = true;
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, 'va perdre son prochain tour.');
        showMagicToast(targetName, 'va perdre son prochain tour.');
      }
      break;
    }

    case 'malus_reductionInv': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Réduction inventaire bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        applyScoreDelta(opponent, 20, findSourceDom(opponent, cardId));
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, '+20 points (absorption)');
      } else {
        effects[targetName].reducedInventory = (effects[targetName].reducedInventory || 0) + 1;
        effects[targetName].reducedGainFactor = 0.8; // -20%
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, 'réduction des gains (-20%).');
        showMagicToast(targetName, 'réduction des gains (-20%).');
      }
      break;
    }

    case 'malus_perte50': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Perte 50s bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        applyTimerDelta(opponent, +20, findSourceDom(opponent, cardId));
        updateTimersUI();
        animate('pulse', domOpponent, { color: 'purple' });
        showMagicToast(opponent, '+20s (absorption)');
      } else {
        applyTimerDelta(targetName, -50, findSourceDom(targetName, cardId));
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, '-50s.');
        showMagicToast(targetName, '-50s.');
      }
      checkVictoryOrTimeout();
      break;
    }

    case 'malus_disparition': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('flash', domOpponent); showMagicToast('Disparition bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      const hisHand = document.querySelector(`.hand.${targetName}`);
      if (hisHand) {
        const jokersIds = CARD_MANAGER.JOKERS.map(j => j.id);
        const hisCards = Array.from(hisHand.querySelectorAll('.card'));
        for (const c of hisCards) {
          const bg = (c.style.backgroundImage || '').toLowerCase();
          if (!bg) continue;
          if (jokersIds.some(id => bg.includes(id.toLowerCase()) || bg.includes('joker'))) {
            c.style.backgroundImage = '';
            c.style.opacity = 0.5;
            c.style.pointerEvents = 'none';
            animate('explode', c);
            safeLog('Joker retiré de la main de', targetName);
            showMagicToast('Joker retiré de la main de', targetName);
            break;
          }
        }
      }
      break;
    }

    case 'malus_reduction1': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Réduction 1 bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        applyScoreDelta(opponent, 5, findSourceDom(opponent, cardId));
        animate('pulse', domOpponent);
        showMagicToast(opponent, '+5 pts (absorption)');
      } else {
        effects[targetName].reducedInventory = (effects[targetName].reducedInventory || 0) + 1;
        applyScoreDelta(targetName, -10, findSourceDom(targetName, cardId));
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        showMagicToast(targetName, '-10 points (réduction inventaire)');
      }
      break;
    }

    case 'malus_perte30': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('shake', domOpponent); showMagicToast('Perte30 bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        applyTimerDelta(opponent, +10, findSourceDom(opponent, cardId));
        updateTimersUI();
        animate('pulse', domOpponent);
        showMagicToast(opponent, '+10s (absorption)');
      } else {
        const lost = Math.floor((timers[targetName] || 0) * 0.30);
        applyTimerDelta(targetName, -lost, findSourceDom(targetName, cardId));
        animate('shake', (targetName === player) ? domPlayer : domOpponent);
        safeLog(targetName, `-30% du temps (${lost}s).`);
        showMagicToast(targetName, `-30% du temps (${lost}s).`);
      }
      checkVictoryOrTimeout();
      break;
    }

    case 'malus_limitGain': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('glow', domOpponent); showMagicToast('LimitGain bloquée', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      if (res.status === 'absorbed') {
        applyScoreDelta(opponent, 20, findSourceDom(opponent, cardId));
        animate('pulse', domOpponent);
        showMagicToast(opponent, '+20 pts (absorption)');
      } else {
        effects[targetName].limitGainUntil = Date.now() + 45 * 1000;
        effects[targetName].limitedGainFactor = 0.5;
        safeLog(targetName, 'limitation -50% pour 45s.');
        showMagicToast(targetName, 'limitation -50% pour 45s.');
        animate('glow', (targetName === player) ? domPlayer : domOpponent, { color: 'orange' });
      }
      break;
    }

    case 'malus_blocJoker': {
      const res = resolveDefenses(player, opponent);
      if (res.status === 'blocked') { animate('pulse', domOpponent); showMagicToast('BlocJoker bloqué', opponent); break; }
      const targetName = (res.status === 'reflected') ? player : opponent;
      effects[targetName].blockJokerUntil = Date.now() + 3 * 60 * 1000;
      safeLog(targetName, 'blocage des jokers pour 3 minutes.');
      showMagicToast(targetName, 'blocage des jokers pour 3 minutes.');
      animate('flash', (targetName === player) ? domPlayer : domOpponent, { color: 'gray', repeats: 3 });
      break;
    }

    // -------- BONUS ----------
    case 'bonus_supprMalus':
      effects[player] = {};
      safeLog(player, 'Tous les malus supprimés.');
      showMagicToast(player, 'Tous les malus supprimés.');
      animate('flash', domPlayer, { color: 'yellow', repeats: 4 });
      break;

    case 'bonus_x3':
      effects[player].x3Next = true;
      safeLog(player, 'x3 activé pour la prochaine action de gain.');
      showMagicToast(player, 'x3 activé pour la prochaine action de gain.');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    case 'bonus_jokerHasard': {
      const jr = CARD_MANAGER.JOKERS[Math.floor(Math.random()*CARD_MANAGER.JOKERS.length)];
      const placed = placeCardInHand(player, getCardImagePath(jr.id));
      if (!placed) applyScoreDelta(player, 25, findSourceDom(player, cardId));
      safeLog(player, 'a reçu un joker aléatoire:', jr.id);
      showMagicToast(player, 'a reçu un joker aléatoire:', jr.id);
      animate('pulse', domPlayer, { color: 'cyan' });
      break;
    }

    case 'bonus_carteHasard': {
      const gain = computeGain(player, 50);
      applyScoreDelta(player, gain, findSourceDom(player, cardId));
      const any = randomCardFromAll();
      placeCardInHand(player, getCardImagePath(any.id));
      safeLog(player, 'a reçu une carte aléatoire:', any.id);
      showMagicToast(player, 'a reçu une carte aléatoire:', any.id);
      animate('pulse', domPlayer, { color: 'gold' });
      break;
    }

    case 'bonus_plus30':
      effects[player].plus30 = true;
      safeLog(player, 'plus30 activé (prochain gain +30%).');
      showMagicToast(player, 'plus30 activé (prochain gain +30%).');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    case 'bonus_slots':
      effects[player].extraSlots = (effects[player].extraSlots || 0) + 2;
      applyScoreDelta(player, 40, findSourceDom(player, cardId));
      safeLog(player, '2 slots additionnels accordés (+40 points appliqués).');
      showMagicToast(player, '2 slots additionnels accordés (+40 points appliqués).');
      animate('pulse', domPlayer, { color: 'blue' });
      break;

    case 'bonus_double':
      effects[player].doubleNext = true;
      safeLog(player, 'doublePoints activé pour le prochain gain.');
      showMagicToast(player, 'doublePoints activé pour le prochain gain.');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    // -------- JOKERS ----------
    case 'joker_limite':
      effects[opponent].jokerLimited = true;
      safeLog('Joker : limitation appliquée sur', opponent);
      showMagicToast('Joker : limitation appliquée sur', opponent);
      animate('shake', domOpponent);
      break;

    case 'joker_retourne':
      effects[player].returnAttackNext = true;
      safeLog(player, 'joker_retourne activé (renvoi d’attaque).');
      showMagicToast(player, 'joker_retourne activé (renvoi d’attaque).');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    case 'joker_neutralise':
      effects[player].neutralizePickpocket = true;
      safeLog(player, 'joker_neutralise activé (neutralise pickpocket/autodestruction).');
      showMagicToast(player, 'joker_neutralise activé (neutralise pickpocket/autodestruction).');
      animate('pulse', domPlayer, { color: 'aqua' });
      break;

    case 'joker_parade':
      effects[player].parade = true;
      safeLog(player, 'joker_parade activé (parade échanges/mine).');
      showMagicToast(player, 'joker_parade activé (parade échanges/mine).');
      animate('flash', domPlayer, { color: 'gold', repeats: 3 });
      break;

    case 'joker_immunite':
      effects[player].immunityUntil = Date.now() + (2 * 60 * 1000); // 2 minutes
      safeLog(player, 'joker_immunite activé (immunité temporaire).');
      showMagicToast(player, 'joker_immunite activé (immunité temporaire).');
      animate('glow', domPlayer, { color: 'lime' });
      break;

    case 'joker_annule':
      effects[player] = {};
      safeLog(player, 'joker_annule : toutes limitations annulées.');
      showMagicToast(player, 'joker_annule : toutes limitations annulées.');
      animate('flash', domPlayer, { color: 'yellow', repeats: 3 });
      break;

    case 'joker_absorbe':
      effects[player].absorbNext = true;
      safeLog(player, 'joker_absorbe : absorbera la prochaine attaque.');
      showMagicToast(player, 'joker_absorbe : absorbera la prochaine attaque.');
      animate('glow', domPlayer, { color: 'purple' });
      break;

    default:
      safeLog('Carte sans règle implémentée pour', cardId);
      showMagicToast('Carte sans règle implémentée pour', cardId);
      animate('pulse', domPlayer, { color: 'white' });
      break;
  }

  // Mise à jour UI & vérifications (inchangées)
  updateScoresUI();
  updateTimersUI();
  checkVictoryOrTimeout();
}

const arenaMusic = new Audio('Black Mountains.mp3');
arenaMusic.loop = true; // boucle infinie
// B.FONCTION DE PLACEMENT OU DEPOT CARTE
function assignCardToSlot(player, cardKey) {
  const handEl = document.querySelector(`.hand.${player}`);
  const slotIndex = (player === "player") ? playerSlotsFilled : iaSlotsFilled;
  const slots = handEl.querySelectorAll(".card");

  if (slotIndex >= slots.length) return;

  const nextSlot = slots[slotIndex];
  const thisCardKey = cardKey; // 🔒 Carte distribuée

  // Stocker le cardKey sur l'élément pour que l'IA puisse le lire ensuite
  nextSlot.dataset.cardKey = thisCardKey;

  // ----------- Distribution dans la main -----------
  nextSlot.style.backgroundImage = `url(${getCardImagePath(thisCardKey)})`;
  nextSlot.style.backgroundSize = "cover";
  nextSlot.style.backgroundPosition = "center";
  nextSlot.style.border = "2px solid gold";
  nextSlot.style.cursor = "pointer";
  nextSlot.style.opacity = '1';
  nextSlot.style.pointerEvents = 'auto';

  // ----------- Incrémentation immédiate dans la main -----------
  if (player === "player") {
    playerSlotsFilled++;
  } else {
    iaSlotsFilled++;
  }

  // ----------- Interaction : dépôt dans les slots de l’arène -----------
  nextSlot.addEventListener("click", () => {
    // Protection simple : si ce slot a été utilisé, ignorer
    if (nextSlot.style.pointerEvents === 'none' || nextSlot.style.opacity === '0.5') return;

    // Si on est en phase de jeu, vérifier que c'est bien le tour du joueur et qu'il n'a pas déjà joué
    if (playPhase && currentTurn !== player) {
      safeLog('Ce n\'est pas le tour de', player, '— dépôt ignoré.');
      return;
    }
    if (playPhase && turnActionDone) {
      safeLog(player, 'a déjà joué ce tour — dépôt ignoré.');
      return;
    }

    console.log(`[DEBUG] Clic sur une carte du hand (${player}) - Carte:`, thisCardKey);

    const arenaElLocal = document.getElementById("arena");
    if (!arenaElLocal) {
      console.error("[ERREUR] Élément #arena introuvable dans le DOM !");
      return;
    }

    // Chercher les slots DOM invisibles correspondant au joueur
    const arenaSlotsDOM = Array.from(arenaElLocal.querySelectorAll(`.drop-slots.${player} .slot`));
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

    try {
      applyCardEffect(player, thisCardKey);
    } catch (err) {
      console.error("Erreur lors de l'application de la règle:", err);
    }
    // Si en playPhase, verrouiller l'action pour éviter multi-dépôts et mettre à jour interactions
    if (playPhase) {
      turnActionDone = true;
      updateHandInteraction();
    }
    // Vérifier si l’arène est complète et remplir les slots
    fillArenaSlots();
     // --- Lancer la musique de l'arène au premier slot rempli ---
    if (arenaMusic.paused) {
      arenaMusic.play().catch(err => console.warn("Impossible de jouer la musique:", err));
    }
    // Si on est en phase de jeu (les deux mains sont pleines), passer le tour après pose (donc IA pourra jouer)
    if (playerSlotsFilled >= 4 && iaSlotsFilled >= 4) {
      setTimeout(() => {
        
        nextTurn();
        // Bloquer la musique si on passe à la phase de roue
       //arenaMusic.pause();
      }, 400);
    }
  });
}
// A. FONCTION QUI AFFICHE LES SLOTS DE LA MAIN
function getHandCards(player) {
  const hand = document.querySelector(`.hand.${player}`);
  if (!hand) return [];
  return Array.from(hand.querySelectorAll('.card'))
    .map(c => ({ el: c, key: c.dataset.cardKey || null }))
    .filter(x => x.key && x.el.style.opacity !== '0.5');
}

function parsePointFromId(id) {
  // ex: 'pt_150' => 150
  const parts = id.split('_');
  if (parts.length >= 2) {
    const n = parseInt(parts[1], 10);
    if (!isNaN(n)) return n;
  }
  return 0;
}

// =======================================
// FONCTION AI  DECISION CONTEXTUELLE
// =======================================
function aiChooseCardElement() {
  const aiScore = scores.ia;
  const playerScore = scores.player;
  const hand = Array.from(document.querySelectorAll('.hand.ia .card')).filter(c => c.style.opacity !== '0.5');

  if (!hand.length) return null;

  // Priorité : analyser le contexte
  const diff = aiScore - playerScore;
  let chosenType = 'strategic'; // par défaut

  if (diff < -50) {
    // IA est en retard → offensive
    chosenType = 'attack';
  } else if (diff > 50) {
    // IA a l'avantage → défensive
    chosenType = 'defense';
  } else {
    // Scores proches → stratégique
    chosenType = 'joker_or_bonus';
  }

 // Récupération cartes par type
  const cardsByType = hand.map(card => {
   const bg = card.style.backgroundImage;
    for (const type in CARD_MANAGER) {
      const found = CARD_MANAGER[type].find(c => bg.includes(c.img));
      if (found) return { card, type: type.toLowerCase(), id: found.id };
    }
    return { card, type: 'unknown', id: null };
  });

  let candidates = [];
 if (chosenType === 'attack') candidates = cardsByType.filter(c => c.type === 'attaques');
  else if (chosenType === 'defense') candidates = cardsByType.filter(c => c.type === 'defenses');
  else if (chosenType === 'joker_or_bonus') candidates = cardsByType.filter(c => c.type === 'jokers' || c.type === 'bonus');

  if (!candidates.length) candidates = cardsByType; // fallback si pas de carte du type voulu

  // Choisir aléatoirement parmi candidats
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return selected.card || hand[0];
}

//SUITE C
function aiPlayTurn() {
  // Ne jouer que si c'est bien le tour de l'IA et phase de jeu
  if (currentTurn !== 'ia') return;
  if (!playPhase) {
    // phase distribution, IA ne pose pas ici
    return;
  }
  // si l'IA a déjà joué ce tour, ne rien faire
  if (turnActionDone) return;

  const entries = getHandCards('ia');
  if (!entries.length) {
    safeLog('IA : plus de cartes jouables.');
    // passer le tour
    setTimeout(nextTurn, 200);
    return;
  }
  const chosenEl = aiChooseCardElement(entries);
  if (!chosenEl) {
    safeLog('IA : aucune carte choisie (erreur).');
    setTimeout(nextTurn, 200);
    return;
  }
  const cardKey = chosenEl.dataset.cardKey;
  const imgSrc = getCardImagePath(cardKey);
  // tenter placer en arène
  const placedTarget = placeCardImageInArena('ia', imgSrc);
  if (placedTarget) {
    // marquer la carte comme utilisée dans la main
    chosenEl.style.opacity = 0.5;
    chosenEl.style.pointerEvents = 'none';
    safeLog('IA place', cardKey, 'en arène.');
  } else {
    // si pas de place, tenter main fallback (rare)
    const placedHand = placeCardInHand('ia', imgSrc);
    if (placedHand) {
      chosenEl.style.opacity = 0.5;
      chosenEl.style.pointerEvents = 'none';
      safeLog('IA a placé en main (fallback).');
    } else {
      // pas de place du tout : créditer
      scoreUpdater('ia', 25);
      safeLog('IA n\'a pas pu placer — crédit +25pts.');
    }
  }
  // Appliquer l'effet de la carte choisie
  try {
    applyCardEffect('ia', cardKey);
  } catch (err) {
    console.error("Erreur lors de l'application d'une règle IA:", err);
  }
  // Marquer action faite et mettre à jour interactions
  turnActionDone = true;
  updateHandInteraction();

  // Vérifier arène remplie
  fillArenaSlots();

  // Après un petit délai, repasser le tour au joueur
  setTimeout(() => {
    nextTurn();
  }, 500);
}

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
//SUITE CODE QUI AFFICHE SLOT DE LA MAIN
function renderHand(player, cardsArray) {
  const container = player === 'player'
    ? document.querySelector('.hand.player')
    : document.querySelector('.hand.ia');
  if (!container) return;
}
//INITIALISATION / INTERFACE
window.addEventListener("DOMContentLoaded", () => {
  updateStatsUI();
});