const GAME_ID = 'match42'; // adapte si besoin
const wheelPopup = document.getElementById("wheel-popup");
const wheelFrame = document.querySelector(".popup-frame");
const wheelImageEl = document.getElementById("wheel-image");
const arenaEl = document.getElementById("arena"); // Arène pour dépôt de cartes
const turnNameEl = document.getElementById('turn-name');
let currentTurn = 'player';
let turnActionDone = false;  
let playerSlotsFilled = 0;
let iaSlotsFilled = 0;
// ---- Decks (état) ----
let playerDeck = []; // tableau d'objets carte { id, label, image }
let iaDeck = [];
let playerDeckEl = null;
let iaDeckEl = null;
let playerDeckCountEl = null;
let iaDeckCountEl = null;
let deckMenuEl = null;
// permission explicite pour autoriser la roue en mode "deck" même si playPhase est true
// (ne change pas le spin initial — autorise seulement le spin en mode 'deck')
let allowDeckSpinsWhilePlaying = true;
let playPhase = false; // devient true quand les 4 slots de chaque joueur sont remplis
let scores = { player: 150, ia: 150 }; // score initial
const PARTIE_DURATION = 9 * 60; // 9 minutes en secondes
let timers = { player: PARTIE_DURATION, ia: PARTIE_DURATION }; // timers par joueur
let partieInterval = null; // intervalle général
let _gameEnded = false; // empêche double endGame
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
  // Protection contre appels multiples
  if (_gameEnded) {
    safeLog('endGame appelé alors que la partie est déjà terminée — appel ignoré.');
    return;
  }
  _gameEnded = true;
  // Stopper intervalle de partie si actif
  try { if (partieInterval) { clearInterval(partieInterval); partieInterval = null; } } catch (e) {}
  // Désactiver interactions (non-destructif)
  try {
    document.querySelectorAll(".card").forEach(c => { c.style.pointerEvents = "none"; });
  } catch (e) { safeLog('endGame: impossible de désactiver les cartes:', e); }
  // Préparer infos pour le popup
  const winnerKey = (winner === 'player' || winner === 'ia') ? winner : null;
  const loserKey = winnerKey ? getOpponent(winnerKey) : null;
  const winnerScore = winnerKey ? (scores[winnerKey] || 0) : Math.max(scores.player || 0, scores.ia || 0);
  const loserScore = loserKey ? (scores[loserKey] || 0) : (winnerKey ? (scores[loserKey] || 0) : Math.min(scores.player || 0, scores.ia || 0));
  const reasonText = reason || 'Fin de partie';
  // Mettre à jour UI avant d'ouvrir popup
  try { updateStatsUI(); updateScoresUI(); updateTimersUI(); } catch (e) {}
  // Afficher le popup stylé (centre / animation) — remplace les anciens alert()
  try {
    showVictoryPopup({
      winner: winnerKey,
      loser: loserKey,
      winnerScore,
      loserScore,
      reason: reasonText
    });
  } catch (e) {
    // fallback minimal si le popup échoue
    safeLog('Erreur showVictoryPopup, fallback text:', e, winnerKey, reasonText);
    try { alert(`${winnerKey ? (winnerKey === 'player' ? 'Le Joueur' : "L'IA") : 'Match'} gagne ! (${reasonText})`); } catch (e2) {}
  }
  safeLog('endGame déclenché:', { winner: winnerKey, reason: reasonText, scores });
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
// =======================================
//DECLARATION DES CARTES (OMISE ICI)
//ZONE A CONSIDERER
// =======================================

const POINTS = [
  { id: "pt_25",  typeId: "type_point", label: "+25s",  img: "25Points.jpg",   description: "Ajoute 25 points au score" },
  { id: "pt_50",  typeId: "type_point", label: "+50s",  img: "clock_2.png",    description: "Ajoute 50 points au score" },
  { id: "pt_75",  typeId: "type_point", label: "+75s",  img:"75Points.jpg",    description: "Ajoute 75 points au score" },
  { id: "pt_100", typeId: "type_point", label: "+100s", img:"100Points.jpg",   description: "Ajoute 100 points au score" },
  { id: "pt_150", typeId: "type_point", label: "+150s", img:"clock.png",     description: "Ajoute 150 points au score" },
  { id: "pt_200", typeId: "type_point", label: "+200s", img:"200Points.jpg",     description: "Ajoute 200 points au score" }
];
const ATTAQUES = [
  { id: "atk_vision", typeId: "type_attaque", label: "visionnaire",img: "visionary.png", description: "Permet de voir à l'avance les effets" },
  { id: "atk_stop",   typeId: "type_attaque", label: "stop",  img:"Stop.jpg",      description: "Stoppe la roue de l'adversaire (sa prochaine action de roue sera bloquée)" },
  { id: "atk_echange",typeId: "type_attaque", label: "échange", img:"EchangeForced.jpg",   description: "Échange forcé de points entre joueurs" } ,
  { id: "atk_vol",    typeId: "type_attaque", label: "vol", img:"PickPocket.jpg",    description: "Vole 50 points à l'adversaire" },
  { id: "atk_destruction", typeId: "type_attaque", label: "destruction", img:"blast.png", description: "Détruit une carte (inflige -60 points à l'adversaire)" },
  { id: "atk_reduction", typeId: "type_attaque", label: "réduction", img:"Reduction.jpg", description: "Réduit le temps adverse de 30 secondes" },
  { id: "atk_limitation", typeId: "type_attaque", label: "limitation", img: "sablier.png", description: "Limite les gains adverses (applique -25% sur gains pendant 30s)" }
];
const DEFENSES = [
  { id: "def_masque", typeId: "type_defense", label: "masque", img:"Rideau_noir.jpg", description: "Masque les effets entrants (bloque la prochaine attaque)" },
  { id: "def_blocage", typeId: "type_defense", label: "blocage", img: "bloqued.jpg", description: "Bloque une attaque (idem masque)" },
  { id: "def_renvoi", typeId: "type_defense", label: "renvoi_Attaque", img:"Parades.jpg", description: "Renvoie la prochaine attaque à l'attaquant" },
  { id: "def_explosion", typeId: "type_defense", label: "explosion_Nettoyage", img: "exploseEtNettoi.png", description: "Explose et inflige -100 points à l'adversaire" },
  { id: "def_bouclier", typeId: "type_defense", label: "bouclier", img:"bouclier.jpg", description: "Ajoute une protection temporaire (2 attaques)" },
  { id: "def_restauration", typeId: "type_defense", label: "restauration_Etat", img: "Restauration.jpg", description: "Restaure 30 secondes au timer" },
  { id: "def_suppression", typeId: "type_defense", label: "suppresion_malus", img: "no-bomb.png", description: "Supprime un malus actif" }
];
const MALUS = [
  { id: "malus_hasard", typeId: "type_malus", label: "Effet_hasard_malus", img:"effet.png", description: "Inflige -30 points aléatoirement" },
  { id: "malus_division", typeId: "type_malus", label: "division_points_2", img: "division.png", description: "Divise les points du joueur par 2" },
  { id: "malus_perteTour", typeId: "type_malus", label: "aucun_gain_tout_perdu", img: "perte.png", description: "Perd le prochain tour (skip)" },
  { id: "malus_reductionInv", typeId: "type_malus", label: "réduction_temporaire_inventaire", img: "réduction.png", description: "Réduit l'efficacité des gains (-20% pendant 30s)" },
  { id: "malus_perte50",typeId: "type_malus", label: "perte_50secs", img:"50_CountDown.jpg", description: "Perte de 50 secondes" },
  { id: "malus_disparition",typeId: "type_malus", label: "disparition_joker", img: "Disparition_Joker.png", description: "Un joker de l'adversaire est désactivé (si présent)" },
  { id: "malus_reduction1", typeId: "type_malus", label:"réduction_inventaire_1", img: "Moins-1.png", description: "Réduit l'inventaire (effet logique, -10 points appliqués maintenant)" },
  { id: "malus_perte30",typeId: "type_malus", label: "perte_30%_temps", img: "Perte_30.png", description: "Perte de 30% du temps restant" },
  { id: "malus_limitGain",typeId: "type_malus", label:"limitation_futurs_gains", img:"sablier.png", description: "Limitation des futurs gains (-50% pendant 45s)" },
  { id: "malus_blocJoker",typeId: "type_malus", label: "blocage_joker_while_3mins", img:"no-bomb.png", description: "Pas de joker pendant 3 minutes" }
];
const BONUS = [
  { id: "bonus_supprMalus",typeId: "type_bonus", label: "supression_All_malus_Actifs", img: "Offre.jpg", description: "Supprime tous les malus actifs" },
  { id: "bonus_x3", typeId: "type_bonus",  label: "Temps_multiplié_x3", img:"Offre.jpg", description: "Prochain gain x3 (1 utilisation)" },
  { id: "bonus_jokerHasard",typeId: "type_bonus", label: "Gagner_joker_hasard", img: "Offre.jpg", description: "Reçoit un joker aléatoire (flag)" },
  { id: "bonus_carteHasard",typeId: "type_bonus",  label: "Gagner_Carte_hasard", img:"cadeau_6.png", description: "Donne +50 points" },
  { id: "bonus_plus30", typeId: "type_bonus", label:"Ajout_30%_All_gains", img: "cadeau_5.png", description: "Ajoute +30% aux gains pendant 30s" },
  { id: "bonus_slots", typeId: "type_bonus", label:"Ajout_2_Slots_Cartes", img: "cadeau_4.png", description: "Ajoute 2 slots (effet logique : +40 points maintenant)" },
  { id: "bonus_double",typeId: "type_bonus",  label:"Double_Points_gagnés", img: "Offre.jpg", description: "Prochain gain x2 (1 utilisation)" }
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
  // Ne rien faire si déjà terminé
  if (_gameEnded) return true;
  // 1) Vérifier victoires par score (prioritaire)
  const playerReached = (scores.player || 0) >= 1000;
  const iaReached = (scores.ia || 0) >= 1000;
  if (playerReached || iaReached) {
    // Si les deux atteignent, comparer scores
    if (playerReached && iaReached) {
      if (scores.player > scores.ia) {
        endGame('player', 'Les deux ont atteint 1000, le joueur a le score le plus élevé.');
      } else if (scores.ia > scores.player) {
        endGame('ia', 'Les deux ont atteint 1000, l\'IA a le score le plus élevé.');
      } else {
        endGame(null, 'Les deux ont atteint 1000 — match nul.');
      }
      return true;
    }
    // Un seul a atteint 1000
    if (playerReached) { endGame('player', 'Score atteint (1000 points)'); return true; }
    if (iaReached) { endGame('ia', 'Score atteint (1000 points)'); return true; }
  }
  // 2) Vérifier timeout(s)
  const playerTimedOut = (timers.player || 0) <= 0;
  const iaTimedOut = (timers.ia || 0) <= 0;
  if (playerTimedOut || iaTimedOut) {
    // Si les deux à 0 -> décider par score
    if (playerTimedOut && iaTimedOut) {
      if (scores.player > scores.ia) endGame('player', 'Les deux ont manqué de temps — le joueur a le meilleur score.');
      else if (scores.ia > scores.player) endGame('ia', 'Les deux ont manqué de temps — l\'IA a le meilleur score.');
      else endGame(null, 'Les deux ont manqué de temps et les scores sont égaux — match nul.');
      return true;
    }
    // Un seul a time-out -> l'autre gagne
    if (playerTimedOut) { endGame('ia', 'Le joueur a manqué de temps.'); return true; }
    if (iaTimedOut) { endGame('player', 'L\'IA a manqué de temps.'); return true; }
  }
  // Rien de terminé
  return false;
}


function showVictoryPopup({ winner = null, loser = null, winnerScore = 0, loserScore = 0, reason = '' } = {}) {
  // Empêcher la création multiple
  if (document.getElementById('victory-popup-root')) return;
  // Injecter CSS minimal pour style "fantasy / feu"
  const styleId = 'victory-popup-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes vp-entrance { 0% { transform: scale(.6); opacity:0 } 60% { transform: scale(1.05); opacity:1 } 100% { transform: scale(1); } }
      #victory-popup-root { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; z-index:9999; pointer-events:auto; }
      .vp-backdrop { position:absolute; inset:0; background: radial-gradient(rgba(0,0,0,.6), rgba(0,0,0,.85)); backdrop-filter: blur(2px); }
      .vp-card { position:relative; min-width:320px; max-width:90%; padding:22px; border-radius:16px; box-shadow: 0 10px 30px rgba(0,0,0,.6); background: linear-gradient(180deg,#120806 0%, #2b0f07 100%); color:#ffdca8; transform-origin:center; animation: vp-entrance .45s ease-out; border:2px solid rgba(255,160,0,.12); }
      .vp-title { font-size:20px; font-weight:700; margin-bottom:8px; text-align:center; letter-spacing:1px; text-shadow: 0 0 8px rgba(255,140,0,.25); }
      .vp-main { display:flex; gap:12px; align-items:center; justify-content:space-between; margin-bottom:12px; }
      .vp-winner { flex:1; padding:12px; border-radius:12px; background: linear-gradient(90deg, rgba(255,200,90,.06), rgba(255,120,20,.03)); box-shadow: 0 6px 18px rgba(255,120,20,.06); transform: scale(1.03); border:1px solid rgba(255,200,90,.06); }
      .vp-loser { flex:1; padding:10px; border-radius:10px; opacity:0.7; text-align:center; }
      .vp-scores { font-family: monospace; font-size:18px; margin-top:10px; text-align:center; }
      .vp-reason { font-size:13px; opacity:0.85; text-align:center; margin-bottom:10px; }
      .vp-actions { display:flex; gap:10px; justify-content:center; margin-top:8px; }
      .vp-btn { padding:10px 14px; border-radius:10px; cursor:pointer; border:0; font-weight:700; }
      .vp-replay { background: linear-gradient(90deg,#ffb66a,#ff6b3a); color:#2b0700; box-shadow: 0 6px 20px rgba(255,100,20,.12); }
      .vp-close { background: transparent; color:#ffd6b3; border:1px solid rgba(255,255,255,.06); }
      /* petites flammes (simple) */
      .vp-flame { position:absolute; width:16px; height:28px; background: radial-gradient(circle at 40% 30%, #ffd98a 0%, #ff6b3a 40%, transparent 60%); filter: blur(.6px); opacity:0.85; transform-origin:center; animation: flame-flicker 1.1s infinite; }
      @keyframes flame-flicker { 0% { transform: translateY(0) scale(1); } 50% { transform: translateY(-3px) scale(1.05); } 100% { transform: translateY(0) scale(1); } }
      @media (max-width:420px) { .vp-card { padding:14px; } .vp-title { font-size:16px; } }
    `;
    document.head.appendChild(style);
  }
  // Construire la structure DOM
  const root = document.createElement('div');
  root.id = 'victory-popup-root';
  const backdrop = document.createElement('div');
  backdrop.className = 'vp-backdrop';
  backdrop.addEventListener('click', () => {
    try { document.body.removeChild(root); _gameEnded = true; } catch (e) {}
  });
  const card = document.createElement('div');
  card.className = 'vp-card';
  // Title
  const title = document.createElement('div');
  title.className = 'vp-title';
  title.textContent = winner ? (winner === 'player' ? 'Victoire du Joueur' : 'Victoire de l\'IA') : 'Match nul';
  // Main area (winner / loser)
  const main = document.createElement('div');
  main.className = 'vp-main';
  const winnerBox = document.createElement('div');
  winnerBox.className = 'vp-winner';
  winnerBox.innerHTML = `<div style="font-weight:800; font-size:16px; text-align:center;">${winner ? (winner === 'player' ? 'Joueur' : 'IA') : 'Aucun'}</div>
    <div class="vp-scores">Score: ${winnerScore}</div>`;
  const loserBox = document.createElement('div');
  loserBox.className = 'vp-loser';
  loserBox.innerHTML = `<div style="font-weight:700; font-size:14px;">${loser ? (loser === 'player' ? 'Joueur' : 'IA') : ' — '}</div>
    <div class="vp-scores">${loserScore}</div>`;
  main.appendChild(winnerBox);
  main.appendChild(loserBox);
  const reasonEl = document.createElement('div');
  reasonEl.className = 'vp-reason';
  reasonEl.textContent = reason || '';
  const actions = document.createElement('div');
  actions.className = 'vp-actions';
  const replayBtn = document.createElement('button');
  replayBtn.className = 'vp-btn vp-replay';
  replayBtn.textContent = 'Rejouer';
  replayBtn.addEventListener('click', () => {
    // Si une fonction reset globale existe, l'appeler; sinon utiliser replayResetGame interne
    try {
      if (typeof resetGame === 'function') {
        resetGame();
      } else {
        // fonction locale de reset sûre (implémentée ci-dessous)
        replayResetGame();
      }
    } catch (e) { safeLog('Erreur au Rejouer:', e); }
    try { document.body.removeChild(root); } catch (e) {}
  });
  const closeBtn = document.createElement('button');
  closeBtn.className = 'vp-btn vp-close';
  closeBtn.textContent = 'Fermer';
  closeBtn.addEventListener('click', () => {
    try { document.body.removeChild(root); } catch (e) {}
  });
  actions.appendChild(replayBtn);
  actions.appendChild(closeBtn);
  // petites flammes décoratives
  const flame1 = document.createElement('div'); flame1.className = 'vp-flame'; flame1.style.left = '8%'; flame1.style.top = '8%';
  const flame2 = document.createElement('div'); flame2.className = 'vp-flame'; flame2.style.right = '8%'; flame2.style.bottom = '10%';
  card.appendChild(title);
  card.appendChild(main);
  card.appendChild(reasonEl);
  card.appendChild(actions);
  card.appendChild(flame1);
  card.appendChild(flame2);
  root.appendChild(backdrop);
  root.appendChild(card);
  document.body.appendChild(root);
  // Marquer le jeu comme terminé (sécurise double appels)
  _gameEnded = true;
}


function replayResetGame() {
  // Nettoyage intervalle si encore présent
  try { if (partieInterval) { clearInterval(partieInterval); partieInterval = null; } } catch (e) {}
  // Réinitialiser flags & états essentiels (non-destructif)
  _gameEnded = false;
  playerSlotsFilled = 0;
  iaSlotsFilled = 0;
  // Réinitialiser scores et timers aux valeurs initiales (conformes au contrat)
  scores.player = 150;
  scores.ia = 150;
  timers.player = PARTIE_DURATION;
  timers.ia = PARTIE_DURATION;
  // Vider decks localement (garde structure)
  playerDeck = Array.isArray(playerDeck) ? [] : playerDeck;
  iaDeck = Array.isArray(iaDeck) ? [] : iaDeck;
  // Réactiver interactions des cartes (non destructif)
  try {
    document.querySelectorAll(".card").forEach(c => { c.style.pointerEvents = "auto"; c.style.opacity = '1'; });
  } catch (e) {}
  // Mettre à jour UI
  try { updateStatsUI(); updateScoresUI(); updateTimersUI(); } catch (e) {}
  // Recréer l'état d'arène si fonctions existantes
  try { if (typeof resetArenaSlots === 'function') resetArenaSlots(); } catch (e) {}
  try { if (typeof createDeckUI === 'function') createDeckUI(); } catch (e) {}
  // Relancer la logique de démarrage si possible
  try { startPartieIfReady(); } catch (e) {}
  safeLog('replayResetGame : état remis à zéro (non-destructif).');
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

function cleanArenaSlot(slotDOM, owner, delay = 600) {
  if (!slotDOM) return;
  // Défensive : obtenir l'image et l'index
  const idxStr = slotDOM.dataset ? slotDOM.dataset.slot : null;
  const idx = idxStr ? parseInt(idxStr, 10) : NaN;
  const img = slotDOM.querySelector ? slotDOM.querySelector('img.arena-card') : null;
  // Laisser un court délai pour voir l'animation/effet avant suppression
  setTimeout(() => {
    try {
      // 1) tenter la méthode existante
      if (typeof removeArenaCardAtSlot === 'function') {
        // removeArenaCardAtSlot gère image + occupied flag + tableau logique
        const ok = removeArenaCardAtSlot(slotDOM, owner);
        if (ok) {
          safeLog('cleanArenaSlot : removeArenaCardAtSlot OK pour', owner, 'slot', idx);
          return;
        }
      }
      // 2) fallback manuel : vider l'image et flags DOM
      if (img) {
        try { img.src = ''; } catch(e) {}
        try { img.style.display = 'none'; img.style.opacity = 0; } catch(e) {}
      }
      try { slotDOM.classList.remove('occupied'); } catch(e) {}
      // mettre à jour le tableau logique si possible
      if (!Number.isNaN(idx) && Array.isArray(arenaSlots[owner]) && arenaSlots[owner][idx]) {
        arenaSlots[owner][idx].occupied = false;
      }
      safeLog('cleanArenaSlot fallback nettoyé pour', owner, 'slot', idx);
    } catch (err) {
      console.warn('cleanArenaSlot erreur:', err);
    }
  }, delay);
}
function cleanHandSlot(slotEl, delay = 600) {
  if (!slotEl) return;
  // Protection si déjà nettoyé
  try {
    // Marquer d'abord comme "utilisé" visuellement pour UX (si pas déjà fait)
    if (!slotEl.style.opacity || slotEl.style.opacity !== '0.5') {
      slotEl.style.opacity = '0.5';
      slotEl.style.pointerEvents = 'none';
    }
  } catch (e) { /* ignore style set errors */ }
  setTimeout(() => {
    try {
      // Vider visuel + logique
      slotEl.style.backgroundImage = '';
      slotEl.style.backgroundSize = '';
      slotEl.style.backgroundPosition = '';
      slotEl.style.border = '';
      slotEl.style.cursor = '';
      // Laisser opacity à 0.5 : placeCardInHand considère '0.5' comme slot libre
      slotEl.style.opacity = '0.5';
      slotEl.style.pointerEvents = 'none';
      // supprimer la donnée liée si présente
      if (slotEl.dataset && typeof slotEl.dataset.cardKey !== 'undefined') {
        delete slotEl.dataset.cardKey;
      }
      safeLog('Slot de main nettoyé.', slotEl);
    } catch (err) {
      console.warn('cleanHandSlot erreur', err);
    }
  }, delay);
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
// =======================================
//FONCTION D'ENSEMBLE D'ANIMATION ET FONCTION APPLICATION REGLE ET EFFET + TOAST (OMISE ICI)
//ZONE A CONSIDERER
// =======================================

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
    // ---> Nettoyage du slot de main (player ou ia) : libération pour remplacement
    // -- après applyCardEffect : nettoyage main + nettoyage arène --
  try {
    // nettoyage du slot de main (libération pour remplacement)
    try { cleanHandSlot(nextSlot, 600); } catch(e) { console.warn('cleanHandSlot failed', e); }
    // nettoyage du slot d'arène où la carte a été placée (libération après effet)
    try { cleanArenaSlot(freeSlotDOM, player, 800); } catch(e) { console.warn('cleanArenaSlot failed', e); }
  } catch (e) {
    console.warn('Erreur pendant les cleanups post-play :', e);
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
  // Si on est en phase de jeu (les deux mains sont pleines), passer le tour après pose
  if (playerSlotsFilled >= 4 && iaSlotsFilled >= 4) {
    setTimeout(() => {
      nextTurn();
    }, 400);
  }
});
}
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
// ---------------------- UI Deck & Actions ----------------------
function createDeckUI() {
  const handPlayer = document.querySelector('.hand.player');
  const handIA = document.querySelector('.hand.ia');
  if (!handPlayer || !handIA) return;
  // --- PLAYER deck element (visuel, placé après .hand.player) ---
  playerDeckEl = document.createElement('div');
  playerDeckEl.className = 'deck-ui deck-player';
  playerDeckEl.title = 'Deck Joueur';
  playerDeckEl.innerHTML = '<div class="deck-back"></div><div class="deck-count">0</div>';
  // placer après la main du joueur
  handPlayer.parentNode.insertBefore(playerDeckEl, handPlayer.nextSibling);
  playerDeckCountEl = playerDeckEl.querySelector('.deck-count');
  // --- IA deck element (visuel) ---
  iaDeckEl = document.createElement('div');
  iaDeckEl.className = 'deck-ui deck-ia';
  iaDeckEl.title = 'Deck IA';
  iaDeckEl.innerHTML = '<div class="deck-back"></div><div class="deck-count">0</div>';
  handIA.parentNode.insertBefore(iaDeckEl, handIA.nextSibling);
  iaDeckCountEl = iaDeckEl.querySelector('.deck-count');

 
  // --- Mini menu joueur (inchangé fonctionnellement) ---
  deckMenuEl = document.createElement('div');
  deckMenuEl.className = 'deck-mini-menu hidden';
  deckMenuEl.innerHTML =
    '<button class="deck-action keep" title="Garder dans la main (si slot libre)">🖐️</button>' +
    '<button class="deck-action send" title="Envoyer en arène">⚔️</button>' +
    '<button class="deck-action replace" title="Remplacer une carte dans la main">🔄</button>' +
    '<button class="deck-action reload" title="Recharger le deck (roue)">🃏</button>';
  // insérer le mini-menu immédiatement après le deck du joueur
  playerDeckEl.parentNode.insertBefore(deckMenuEl, playerDeckEl.nextSibling);
  // handlers du mini-menu joueur (la logique existante est conservée)
  deckMenuEl.querySelector('.keep').addEventListener('click', () => {
    if (!playerDeck.length) { safeLog('Deck vide — rien à garder.'); return; }
    handleKeepCard(playerDeck[0]);
    toggleDeckMenu(false);
  });
  deckMenuEl.querySelector('.send').addEventListener('click', () => {
    if (!playerDeck.length) { safeLog('Deck vide — rien à envoyer.'); return; }
    handleSendCard(playerDeck[0]);
    toggleDeckMenu(false);
  });
  deckMenuEl.querySelector('.replace').addEventListener('click', () => {
    if (!playerDeck.length) { safeLog('Deck vide — rien à remplacer.'); return; }
    handleReplaceCard(playerDeck[0]);
    toggleDeckMenu(false);
  });
  deckMenuEl.querySelector('.reload').addEventListener('click', () => {
    toggleDeckMenu(false);
    requestWheelDeckSpin('player');
  });
  // clic sur l'icône du deck : toggle mini-menu (apparition locale, pas overlay)
  playerDeckEl.addEventListener('click', () => {
    if (!playerDeck.length) { safeLog('Deck joueur vide'); return; }
    toggleDeckMenu();
  });
  // petit feedback pour l'IA deck (clic visuel uniquement)
  iaDeckEl.addEventListener('click', () => {
    if (!iaDeck.length) { safeLog('Deck IA vide'); return; }
    iaDeckEl.classList.add('deck-bounce');
    setTimeout(() => iaDeckEl.classList.remove('deck-bounce'), 220);
  });
  // ----------------------------
  // --- MINI-MENU IA (INTÉGRÉ) ---
  // ----------------------------
  // --- Distinction visuelle ---
const iaTitle = document.createElement('div');
iaTitle.className = 'deck-title';
iaTitle.textContent = 'Deck IA';
iaDeckEl.appendChild(iaTitle);
  let iaDeckMenuEl = iaDeckEl.querySelector('.deck-mini-menu.ia');
  if (!iaDeckMenuEl) {
    iaDeckMenuEl = document.createElement('div');
    iaDeckMenuEl.className = 'deck-mini-menu ia hidden';
    iaDeckMenuEl.style.pointerEvents = 'none'; // pour permettre des clicks programmés
    iaDeckMenuEl.style.display = 'flex';
    iaDeckMenuEl.style.gap = '6px';
    iaDeckMenuEl.style.top = '350px';
    iaDeckMenuEl.style.alignItems = 'center';
    iaDeckMenuEl.innerHTML =
      '<button class="deck-action keep" title="IA: Garder dans la main">🖐️</button>' +
      '<button class="deck-action send" title="IA: Envoyer en arène">⚔️</button>' +
      '<button class="deck-action replace" title="IA: Remplacer une carte">🔄</button>' +
      '<button class="deck-action reload" title="IA: Recharger le deck (roue)">🃏</button>';
    // placer le menu IA après le deck IA
    iaDeckEl.parentNode.insertBefore(iaDeckMenuEl, iaDeckEl.nextSibling);
    // wrapper utilitaire local pour déclencher visuel + handler
    const makeIAActionWrapper = (actionKey, handlerFn) => {
      return (ev) => {
        try {
          // animation visuelle (glow du bouton + tip)
          try { animateIAAction(actionKey, { duration: 900 }); } catch (e) { /* ignore */ }
          // message lisible sous la forme demandée (bonus)
          try { showIATip(`IA utilise ${actionKey === 'keep' ? '🖐️ Garder' : actionKey === 'send' ? '⚔️ Envoyer' : actionKey === 'replace' ? '🔄 Remplacer' : '🃏 Recharger'}`, 900); } catch (e) { /* ignore */ }
        } catch (err) {
          console.warn('IA visual wrapper failed', err);
        }
        // appeler le handler réel (externe)
        try {
          if (typeof handlerFn === 'function') handlerFn();
        } catch (err) {
          console.error('IA handler threw', err);
        }
      };
    };
    // attacher listeners "forcés" aux boutons IA (permet aussi de simuler par .click())
    const iaKeepBtn = iaDeckMenuEl.querySelector('.keep');
    const iaSendBtn = iaDeckMenuEl.querySelector('.send');
    const iaReplaceBtn = iaDeckMenuEl.querySelector('.replace');
    const iaReloadBtn = iaDeckMenuEl.querySelector('.reload');
    if (iaKeepBtn) iaKeepBtn.addEventListener('click', makeIAActionWrapper('keep', iaHandleKeepCard));
    if (iaSendBtn) iaSendBtn.addEventListener('click', makeIAActionWrapper('send', iaHandleSendCard));
    if (iaReplaceBtn) iaReplaceBtn.addEventListener('click', makeIAActionWrapper('replace', iaHandleReplaceCard));
    if (iaReloadBtn) iaReloadBtn.addEventListener('click', () => {
      // visual + tip et demande de spin pour l'ia
      try { animateIAAction('reload', { duration: 900 }); } catch (e) { /* ignore */ }
      try { showIATip('IA utilise 🃏 Recharger', 900); } catch (e) { /* ignore */ }
      // demander spin roue (IA)
      try { requestWheelDeckSpin('ia'); } catch (err) { console.warn('requestWheelDeckSpin failed', err); }
    });
    // Par défaut, garder le menu IA masqué (possibilité de l'afficher via CSS devtools)
    // (ne pas interférer avec le layout)
  }
  // NOTE: on NE fait PAS de pointerEvents:none ici, pour permettre au code interne
  // ou aux tests d'appeler iaDeckMenuEl.querySelector('button').click() si besoin.
  // update visuel initial des decks
  updateDeckUI('player');
  updateDeckUI('ia');
  // IMPORTANT: l'ancien appel à createIAActionUI() n'est plus nécessaire car le menu IA est intégré.
  // Si tu veux garder la fonction legacy pour compatibilité, elle peut rester dans le code mais ne sera pas appelée ici.
}




function animateIAAction(actionKey, options = {}) {
  const duration = options.duration || 900;
  if (!iaDeckEl) return;
  // Glow + shake
  iaDeckEl.style.transition = `box-shadow 180ms ease, transform 180ms ease`;
  iaDeckEl.style.boxShadow = '0 0 20px rgba(255,215,0,0.6)';
  iaDeckEl.style.transform = 'translateX(-2px) rotate(-2deg)';
  // Reflow pour déclencher l'animation
  void iaDeckEl.offsetWidth;
  iaDeckEl.style.transform = 'translateX(2px) rotate(2deg)';
  setTimeout(() => {
    iaDeckEl.style.transform = '';
    iaDeckEl.style.boxShadow = '';
  }, duration);
  // Tip texte IA
  showIATip(`IA → ${actionKey}`, duration);
}
function showIATip(text, duration = 900) {
  if (!iaDeckEl) return;
  const tip = iaDeckEl.querySelector('.ia-action-tip');
  if (!tip) return;
  tip.textContent = text;
  tip.style.display = 'block';
  tip.style.opacity = '0';
  void tip.offsetWidth;
  tip.style.opacity = '1';
  setTimeout(() => {
    tip.style.opacity = '0';
    setTimeout(() => { tip.style.display = 'none'; }, 200);
  }, duration);
}

function toggleDeckMenu(forceState) {
  if (!deckMenuEl) return;
  const isHidden = deckMenuEl.classList.contains('hidden');
  if (typeof forceState === 'boolean') {
    deckMenuEl.classList.toggle('hidden', !forceState);
  } else {
    deckMenuEl.classList.toggle('hidden');
  }
}
function handleKeepCard(cardObj) {
  if (playerSlotsFilled >= 4) { safeLog('Main pleine — impossible de garder.'); return; }
  assignCardToSlot('player', cardObj.id);
  playerDeck.shift();
  updateDeckUI('player');
  startPartieIfReady();
}
function handleSendCard(cardObj) {
  const arenaElLocal = document.getElementById("arena");
  if (!arenaElLocal) { safeLog('Arène introuvable'); return; }
  const arenaSlotsDOM = Array.from(arenaElLocal.querySelectorAll(`.drop-slots.player .slot`));
  const freeSlotDOM = arenaSlotsDOM.find(s => !s.classList.contains('occupied'));
  if (!freeSlotDOM) { safeLog('Aucun slot libre en arène pour envoyer la carte.'); return; }
  const slotImg = freeSlotDOM.querySelector('img.arena-card');
  if (!slotImg) { console.error('Slot sans img'); return; }
  slotImg.src = getCardImagePath(cardObj.id);
  slotImg.style.display = 'block';
  slotImg.style.opacity = '1';
  freeSlotDOM.classList.add('occupied');
  const idx = parseInt(freeSlotDOM.dataset.slot, 10);
  if (!Number.isNaN(idx) && Array.isArray(arenaSlots.player) && arenaSlots.player[idx]) {
    arenaSlots.player[idx].occupied = true;
  }
try { applyCardEffect('player', cardObj.id); } catch(e) { console.error(e); }
  // --- Nettoyage automatique du slot d'arène placé par handleSendCard ---
  // freeSlotDOM est le slot dans lequel on a placé l'image (défini plus haut)
  setTimeout(() => {
    try {
      // freeSlotDOM est la référence trouvée plus haut ; si non dispo, chercher par image
      const targetSlot = freeSlotDOM || (arenaSlotsDOM.length ? arenaSlotsDOM.find(s => s.classList.contains('occupied')) : null);
      if (targetSlot) removeArenaCardAtSlot(targetSlot, 'player');
    } catch (err) {
      console.warn('Erreur nettoyage slot après handleSendCard:', err);
    }
  }, 600);
  playerDeck.shift();
  updateDeckUI('player');
  fillArenaSlots();
  startPartieIfReady();
}
function handleReplaceCard(cardObj) {
  const handCards = getHandCards('player');
  if (!handCards.length) { safeLog('Aucune carte en main à remplacer.'); return; }
  // prompt minimal (compatible) ; on peut remplacer par UI plus tard
  const idxStr = prompt(`Index de la carte à remplacer (0 - ${handCards.length - 1})`);
  const idx = parseInt(idxStr, 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= handCards.length) { safeLog('Index invalide — annulation.'); return; }
  const targetEl = handCards[idx].el;
  targetEl.dataset.cardKey = cardObj.id;
  targetEl.style.backgroundImage = `url(${getCardImagePath(cardObj.id)})`;
  targetEl.style.opacity = '1';
  targetEl.style.pointerEvents = 'auto';
  playerDeck.shift();
  updateDeckUI('player');
}
function addCardToDeck(player, cardObj) {
  if (player === 'ia') iaDeck.push(cardObj);
  else playerDeck.push(cardObj);
  updateDeckUI(player);
}
function updateDeckUI(player) {
  const deck = (player === 'ia') ? iaDeck : playerDeck;
  const deckEl = (player === 'ia') ? iaDeckEl : playerDeckEl;
  const countEl = (player === 'ia') ? iaDeckCountEl : playerDeckCountEl;
  if (!deckEl || !countEl) return;
  countEl.textContent = `${deck.length}`;
  deckEl.querySelector('.deck-back').style.opacity = deck.length ? '1' : '0.4';
}
// demande à la roue un spin en mode deck (postMessage) et ouvre le popup iframe
function requestWheelDeckSpin(who = 'player') {
  safeLog(`Demande spin (mode deck) pour ${who}`);
  // ouvrir le popup iframe (même si playPhase true — autorisé pour mode 'deck')
  try {
    wheelPopup.style.display = "flex";
  } catch (e) { /* ignore */ }
  try {
    if (wheelFrame && wheelFrame.contentWindow) {
      wheelFrame.contentWindow.postMessage({ action: 'spinNow', player: who, mode: 'deck' }, '*');
    } else if (window.frames['wheelFrame'] && window.frames['wheelFrame'].postMessage) {
      window.frames['wheelFrame'].postMessage({ action: 'spinNow', player: who, mode: 'deck' }, '*');
    } else {
      // fallback vers parent
      window.parent.postMessage({ action: 'spinNow', player: who, mode: 'deck' }, '*');
    }
  } catch (e) {
    console.warn('requestWheelDeckSpin failed', e);
  }
  // demander aussi l'IA automatiquement (elle accepte toujours)
}
// ---------------------- Fonctions internes & Actions IA, Handlers IA (avec animation non-bloquante) ----------------------
function iaHandleKeepCard() {
  // visuel : avertir le joueur que l'IA 'garde'
  try { animateIAAction('keep', { duration: 850 }); } catch(e) { /* ignore */ }
  if (!iaDeck.length) return false;
  const cardObj = iaDeck.shift();
  const img = getCardImagePath(cardObj.id);
  const ok = placeCardInHand('ia', img);
  updateDeckUI('ia');
  if (ok) safeLog('IA keep -> card added to hand', cardObj.id);
  else {
    // si pas de place, ajouter en arène si possible
    const placed = placeCardImageInArena('ia', img);
    if (placed) safeLog('IA keep fallback -> placed in arena', cardObj.id);
    else {
      scoreUpdater('ia', 25);
      safeLog('IA keep fallback -> no place, credited +25', cardObj.id);
    }
  }
  return true;
}
function iaHandleSendCard() {
  // visuel : IA envoie directement en arène
  try { animateIAAction('send', { duration: 900 }); } catch(e) { /* ignore */ }
  if (!iaDeck.length) return false;
  const cardObj = iaDeck.shift();
  const img = getCardImagePath(cardObj.id);

  const placedTarget = placeCardImageInArena('ia', img);
  updateDeckUI('ia');
  if (placedTarget) {
    chosenEl.style.opacity = 0.5;
    chosenEl.style.pointerEvents = 'none';
    safeLog('IA send -> placed in arena from deck', cardObj.id);
    try { applyCardEffect('ia', cardObj.id); } catch(e) { console.error(e); }

     // ---> NETTOYAGE du slot IA utilisé (pour permettre remplacement/immediate reuse)
  try { cleanHandSlot(chosenEl, 600); } catch(e){ /* ignore */ }
    return true;
  } 
   else {
    // fallback : try to put in hand or give points
    const inHand = placeCardInHand('ia', img);
    if (inHand) {
      safeLog('IA send fallback -> placed in hand', cardObj.id);
      return true;
    } else {
      scoreUpdater('ia', 25);
      safeLog('IA send fallback -> no space, credited +25', cardObj.id);
      return true;
    }
  }
}
function iaHandleReplaceCard() {
  // visuel : IA remplace une carte
  try { animateIAAction('replace', { duration: 900 }); } catch(e) { /* ignore */ }
  if (!iaDeck.length) return false;
  const handCards = getHandCards('ia'); // format: [{el, key}, ...]
  if (!handCards.length) {
    // si pas de main, faire keep
    return iaHandleKeepCard();
  }
  const cardObj = iaDeck.shift();
  // stratégie : remplacer une carte aléatoire
  const targetIndex = Math.floor(Math.random() * handCards.length);
  const targetEl = handCards[targetIndex].el;
  targetEl.dataset.cardKey = cardObj.id;
  targetEl.style.backgroundImage = `url(${getCardImagePath(cardObj.id)})`;
  targetEl.style.opacity = '1';
  targetEl.style.pointerEvents = 'auto';
  updateDeckUI('ia');
  safeLog('IA replace -> replaced hand card at index', targetIndex, 'with', cardObj.id);
  return true;
}
// =======================================
// FONCTION AI  DECISION CONTEXTUELLE
// =======================================
function aiChooseCardElement() {
  const aiScore = scores.ia;
  const playerScore = scores.player;
  const handEls = Array.from(document.querySelectorAll('.hand.ia .card'))
    .filter(c => c.style.opacity !== '0.5');
  // Si pas de cartes en main mais deck présent -> prioriser actions deck
  if (handEls.length === 0 && iaDeck.length) {
    return { mode: 'deck-action', payload: { action: 'keep' } };
  }
  if (!handEls.length) return null;
  // Analyse contextuelle
  const diff = aiScore - playerScore;
  let chosenType = 'strategic';
  if (diff < -50) chosenType = 'attack';
  else if (diff > 50) chosenType = 'defense';
  else chosenType = 'joker_or_bonus';
  // Regrouper les cartes par type
  const cardsByType = handEls.map(card => {
    const bg = card.style.backgroundImage || '';
    for (const type in CARD_MANAGER) {
      const found = CARD_MANAGER[type].find(c => bg.includes(c.img));
      if (found) return { card, type: type.toLowerCase(), id: found.id };
    }
    return { card, type: 'unknown', id: card.dataset.cardKey || null };
  });
  let candidates = [];
  if (chosenType === 'attack') candidates = cardsByType.filter(c => c.type === 'attaques');
  else if (chosenType === 'defense') candidates = cardsByType.filter(c => c.type === 'defenses');
  else if (chosenType === 'joker_or_bonus') candidates = cardsByType.filter(c => c.type === 'jokers' || c.type === 'bonus');
  if (!candidates.length) candidates = cardsByType;
  // Si IA possède un deck, possibilité de jouer aussi depuis celui-ci
  if (iaDeck.length) {
    const rand = Math.random();
    if (diff < -50) {
      // IA en retard : plus agressive
      if (rand < 0.45) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        return { mode: 'hand', payload: selected.card };
      } else if (rand < 0.8) {
        return { mode: 'deck-action', payload: { action: 'send' } };
      } else {
        return { mode: 'deck-action', payload: { action: 'replace' } };
      }
    } else if (diff > 50) {
      // IA en avance : défensive
      if (rand < 0.6) return { mode: 'deck-action', payload: { action: 'keep' } };
      if (rand < 0.9) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        return { mode: 'hand', payload: selected.card };
      }
      return { mode: 'deck-action', payload: { action: 'replace' } };
    } else {
      // Équilibrée
      if (rand < 0.4) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        return { mode: 'hand', payload: selected.card };
      } else if (rand < 0.7) {
        return { mode: 'deck-action', payload: { action: 'keep' } };
      } else {
        return { mode: 'deck-action', payload: { action: 'replace' } };
      }
    }
  }
  // Par défaut : jouer une carte depuis la main
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  return { mode: 'hand', payload: selected.card || handEls[0] };
}
// --------- aiPlayTurn (corrigée, intégrée aux noms existants) ----------
function aiPlayTurn() {
  // ne rien faire si ce n'est pas le tour ou pas la phase de jeu
  if (currentTurn !== 'ia') return;
  if (!playPhase) return;
  if (turnActionDone) return;
  // Obtenir les cartes jouables en main (DOM -> format existant)
  const entries = getHandCards('ia');

  // Si IA n'a plus de cartes en main mais a des cartes dans le deck -> piocher (keep)
if (!entries.length && iaDeck.length) {
  const ok = iaHandleKeepCard(); // pioche depuis le deck
  if (ok) {
    setTimeout(() => aiPlayTurn(), 250); // relancer IA après prise de main
    return;
  }
}
// Si plus de cartes du tout -> demander spin roue IA
if (!iaDeck.length && !entries.length) {
  safeLog("IA : deck vide, demande spin roue");
  requestWheelDeckSpin('ia'); // recharge le deck
  setTimeout(() => nextTurn(), 400); // passer le tour
  return;
}

  // Prendre la décision (main vs deck-action)
  const decision = aiChooseCardElement();
  if (!decision) {
    safeLog('IA : aucune décision possible.');
    setTimeout(() => { nextTurn(); }, 300);
    return;
  }
  // Si la décision porte sur le deck (keep/send/replace)
  if (decision.mode === 'deck-action') {
    const action = decision.payload && decision.payload.action;
    safeLog('IA décide action deck:', action);
    if (action === 'keep') iaHandleKeepCard();
    else if (action === 'send') iaHandleSendCard();
    else if (action === 'replace') iaHandleReplaceCard();
    // après action deck, considérer le tour consommé
    turnActionDone = true;
    updateHandInteraction();
    fillArenaSlots();
    setTimeout(() => { nextTurn(); }, 420);
    return;
  }
  // Sinon : jouer depuis la main (comportement historique)
  const chosenEl = decision.payload;
  if (!chosenEl || !chosenEl.dataset) {
    safeLog('IA : élément main invalide.');
    setTimeout(() => { nextTurn(); }, 300);
    return;
  }
  const cardKey = chosenEl.dataset.cardKey;
  const imgSrc = getCardImagePath(cardKey);
  // Tenter de placer en arène
  const placedTarget = placeCardImageInArena('ia', imgSrc);
  if (placedTarget) {
    
// si IA a placé en arène et on a le DOM target -> planifier nettoyage arène
try {
  if (placedTarget) {
    // delay légèrement supérieur pour laisser l'effet IA se montrer
    cleanArenaSlot(placedTarget, 'ia', 800);
  }
} catch (e) {
  console.warn('cleanArenaSlot IA failed', e);
}
    // marquer la carte comme utilisée
    chosenEl.style.opacity = 0.5;
    chosenEl.style.pointerEvents = 'none';
    safeLog('IA place', cardKey, 'en arène.');
  } else {
    // fallback : tenter main, sinon créditer
    const placedHand = placeCardInHand('ia', imgSrc);
    if (placedHand) {
      chosenEl.style.opacity = 0.5;
      chosenEl.style.pointerEvents = 'none';
      safeLog('IA a placé en main (fallback).');
    } else {
      scoreUpdater('ia', 25);
      safeLog("IA n'a pas pu placer — crédit +25pts.");
    }
  }
  // Appliquer l'effet de la carte (si défini)
  try { applyCardEffect('ia', cardKey); } catch (err) { console.error("Erreur application effet IA:", err); }
  //Nettoyer le slot ia
chosenEl.style.opacity = 0.5;
chosenEl.style.pointerEvents = 'none';
cleanHandSlot(chosenEl,600);
  // Fin de l'action IA : verrouiller et passer
  turnActionDone = true;
  updateHandInteraction();
  fillArenaSlots();
  setTimeout(() => {
    nextTurn();
   }, 500);
}
// ---------------- Handler parent (arène) : réception messages depuis la roue ----------------
window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;
  // --- 1) Deck update (mode 'deck' from iframe)
  if (msg.action === 'deckUpdate') {
    const fromPlayer = msg.player || 'player';
    const cardData = msg.card || msg.cardData || null;
    if (!cardData) {
      safeLog('deckUpdate reçu mais sans card data', msg);
      return;
    }
    const cardObj = (typeof cardData === 'string')
      ? { id: cardData, label: cardData, image: getCardImagePath(cardData) }
      : { id: cardData.id || cardData.cardKey || '', label: cardData.label || cardData.id || '', image: cardData.img || cardData.image || getCardImagePath(cardData.id || cardData.cardKey) };
    addCardToDeck(fromPlayer, cardObj);
    safeLog('deckUpdate -> ajouté au deck de', fromPlayer, cardObj);
    const keepOpenFlag = (typeof msg.keepPopupOpen !== 'undefined') ? !!msg.keepPopupOpen : null;
    const mode = msg.mode || null;
    // Si explicitement demandé, garder la popup ouverte
    if (keepOpenFlag === true || mode === 'fast') {
      try { if (wheelPopup) wheelPopup.style.display = "flex"; } catch(e) {}
      return;
    }
    // Sinon, si IA ou keepPopupOpen === false, fermer popup après court délai
    if (fromPlayer === 'ia' || keepOpenFlag === false) {
      setTimeout(() => { try { if (wheelPopup) wheelPopup.style.display = "none"; } catch(e) {} }, 800);
      return;
    }
    // Par défaut (player), garder la popup ouverte
    try { if (wheelPopup) wheelPopup.style.display = "flex"; } catch(e) {}
    return;
  }
  // --- 2) wheelResult : traiter seulement 'deck' et 'initial'
  if (msg.action === 'wheelResult') {
    const cardId = msg.card;
    const fromPlayer = msg.player || 'player';
    const mode = msg.mode || msg.toDeck || null;
    // Mode deck (comportement inchangé)
    if (mode === 'deck') {
      const cardObj = { id: cardId, label: cardId, image: getCardImagePath(cardId) };
      addCardToDeck(fromPlayer, cardObj);
      safeLog('wheelResult (deck) -> ajouté au deck de', fromPlayer, cardObj);
      // fermer la popup si l'IA a rempli son deck ou si explicitement demandé
      if (playerSlotsFilled >= 4 && iaSlotsFilled >= 4) {
        setTimeout(() => { try { if (wheelPopup) wheelPopup.style.display = "none"; } catch(e){} }, 800);
      }
      return;
    }
    // Mode initial (réutilisable) : *NE PAS FERMER LA POPUP AUTOMATIQUEMENT*
    if (mode === 'initial' || mode === null) {
      safeLog(`[INIT] wheelResult reçu de ${fromPlayer} (mode initial).`);
      if ((fromPlayer === 'player' && playerSlotsFilled < 4) || (fromPlayer === 'ia' && iaSlotsFilled < 4)) {
        assignCardToSlot(fromPlayer, cardId);
      } else {
        const cardObj = { id: cardId, label: cardId, image: getCardImagePath(cardId) };
        addCardToDeck(fromPlayer, cardObj);
        safeLog('Main pleine -> carte ajoutée au deck', fromPlayer, cardObj);
      }
      fillArenaSlots();
 
      // COMPORTEMENT TOUR : si initial est utilisé en distribution automatique,
      // on conserve l'ancien chaînage IA/player mais on *ne ferme pas* la popup.
      if (fromPlayer === 'player') {
        // demander à l'iframe (si nécessaire) d'enchaîner le spin IA
        setTimeout(() => {
          try {
            if (wheelFrame && wheelFrame.contentWindow) {
              wheelFrame.contentWindow.postMessage({ action: 'spinNow', player: 'ia', mode: 'initial' }, '*');
            }
          } catch (e) { console.warn('Erreur envoi spin IA (initial)', e); }
        }, 900);
      } else if (fromPlayer === 'ia') {
        // remettre le focus local au joueur ; la popup reste ouverte pour qu'il puisse re-cliquer
        try { setTimeout(() => setTurn('player'), 600); } catch (e) {}
      }
      // Si tous les slots sont remplis on peut fermer la popup (optionnel) — sinon on laisse ouverte
      if (playerSlotsFilled >= 4 && iaSlotsFilled >= 4) {
        setTimeout(() => { try { if (wheelPopup) wheelPopup.style.display = "none"; } catch(e){} }, 1200);
      }
      return;
    }
    // Si un autre mode inconnu arrive, log et ignorer
    safeLog('wheelResult reçu avec mode inconnu :', mode);
    return;
  }
  // --- 3) autres messages utiles ---
  if (msg.action === 'setTurn') {
    safeLog('Message setTurn reçu de la roue :', msg.player);
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
function renderHand(player, cardsArray) {
  const container = player === 'player'
    ? document.querySelector('.hand.player')
    : document.querySelector('.hand.ia');
  if (!container) return;
}
window.addEventListener("DOMContentLoaded", () => {
  
  updateStatsUI();
  // créer UI du deck après que le DOM des mains soit rendu
  createDeckUI();
});
