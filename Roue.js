
/* ---------- SCRIPT ROUE COMPLET ---------- */
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

const CARD_TYPES = {
  "Point": POINTS,
  "Attaque": ATTAQUES,
  "Défense": DEFENSES,
  "Bonus": BONUS,
  "Malus": MALUS,
  "Joker": JOKERS
};

/* ---------- Canvas / params ---------- */
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

const segments = 14;
const TWO_PI = Math.PI * 2;
const anglePerSegment = TWO_PI / segments;
const colors = ["#f44336", "#4caf50", "#ff9800", "#2196f3", "#e91e63", "#9c27b0", "#3f51b5", "#009688"];
const ledColors = ["#e74c3c", "#f1c40f"];
const borderThicknessBase = 19; // on peut scaler en fonction taille
let ledBlinkState = false;
let ledBlinkTimer = 0;
const ledBlinkDelay = 30;

let rotation = 0;
let spinning = false;
let lastImpactTime = 0;
let arrowTilt = 0;
let arrowDirection = 1;
let arrowDecay = 0.0;

let currentDescription = "";
let currentPlayer = 'player';

let selectedCardImage = null;
let selectedCardAnim = 0; // 0 → invisible, 1 → visible

// === AJOUT GLOBAL DES DECKS ===
let deckPlayer = [];
let deckIA = [];
let currentSpinMode = 'initial'; // 'initial' ou 'deck'

const bgMusic = document.getElementById('bgMusic');
const clickSound = document.getElementById('clickSound');
const winSound = document.getElementById('winSound');

/* base path for images - adapte si nécessaire */
const imageBasePath = './'; // ex: './assets/icons/' si nécessaire


/* ---------- Helpers ---------- */
function normalizeTextToKey(s) {
  if (!s) return '';
  return String(s).normalize('NFKD').replace(/[\u0300-\u036F]/g, '').replace(/[^a-z0-9]+/ig, '_').toLowerCase();
}

/* ---------- Generate Titles (length = segments) ---------- */
function generateShuffledTitles() {
  const types = Object.keys(CARD_TYPES); // 6 types
  const out = [];
  while (out.length < segments) out.push(...types);
  out.length = segments;
  // shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/* ---------- FONCTION ATTRIBUTION DES CARTES ---------- */
let segmentData = [];
function genererSegmentDataOnce() {
  const types = Object.keys(CARD_TYPES); 
  segmentData = [];

  // on boucle jusqu’à avoir "segments" segments
  for (let i = 0; i < segments; i++) {
    const titre = types[i % types.length]; // cycle sur les types
    let cartes = CARD_TYPES[titre];
    if (!cartes || cartes.length === 0) cartes = POINTS; 

    // prend une carte aléatoire du type
    const cardObj = Object.assign({}, cartes[Math.floor(Math.random() * cartes.length)]);
    cardObj.image = cardObj.image || '';
    cardObj.label = typeof cardObj.label !== 'undefined' ? cardObj.label : null;
    cardObj.description = cardObj.description || '';

    const segment = {
      title: titre,
      card: cardObj,
      imageObj: null,
      loaded: false
    };

    if (cardObj.image) {
      const img = new Image();
      img.onload = () => {
        segment.loaded = true;
        segment.imageObj = img;
        drawWheel();
      };
      img.onerror = () => {
        segment.loaded = false;
        segment.imageObj = null;
        console.warn('Image failed to load:', cardObj.image);
      };
      img.src = imageBasePath + cardObj.image;
      segment.imageObj = img;
    }

    segmentData.push(segment);
  }

  drawWheel();
  console.log(
    `segmentData generated (${segmentData.length} segments):`,
    segmentData.map(s => ({ t: s.title, id: s.card.id, img: s.card.image }))
  );
}
genererSegmentDataOnce();


/* ---------- Fix taille canvas ---------- */
// Mets ça en haut, juste après avoir récupéré le canvas
canvas.width = 600;
canvas.height = 400;

/* ---------- computeMetrics (corrigé) ---------- */
function computeMetrics() {
  const w = canvas.width;
  const h = canvas.height;

  const centerX = w / 2;
  const centerY = h * 0.50; // roue centrée verticalement

  const radius = Math.min(w, h) * 0.40; // proportionnelle (≈240px sur 600x400)

  const borderThickness = Math.max(10, Math.floor(borderThicknessBase * (radius / 360)));
  const ledRadius = radius + borderThickness / 2 + 8;

  return { centerX, centerY, radius, borderThickness, ledRadius, w, h };
}

/* ---------- drawCurvedMask (corrigé) ---------- */
function drawCurvedMask(metrics) {
  const { w, h, centerX } = metrics;
  ctx.beginPath();

  if (window.innerWidth <= 480) {
    // Version compacte mobile du masque incurvé
    ctx.moveTo(0, h);
    ctx.lineTo(0, h - 150);
    ctx.quadraticCurveTo(centerX, h - 300, w, h - 150);
    ctx.lineTo(w, h);
  } else {
    // Version standard (PC/tablette)
    ctx.moveTo(0, h);
    ctx.lineTo(0, h - 150);
    ctx.quadraticCurveTo(centerX, h - 260, w, h - 150);
    ctx.lineTo(w, h);
  }

  ctx.closePath();
  ctx.fillStyle = "#0f0f1f";
  ctx.fill();
}


function drawCurvedTitleLocal(ctx, text, startAngle, endAngle, radiusVal, color, metrics) {
  const angle = (startAngle + endAngle) / 2;
  const textRadius = radiusVal - 20;
  const x = metrics.centerX + Math.cos(angle) * textRadius;
  const y = metrics.centerY + Math.sin(angle) * textRadius;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.fillStyle = color;
  ctx.shadowColor = "black";
  ctx.shadowBlur = 4;
  ctx.textAlign = "center";
  ctx.font = "bold 14px MedievalSharp";
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

//Animation de la carte sélectionnée
function showSelectedCard(card) {
  const w = canvas.width;
  const h = canvas.height;

  // Position et dimensions du conteneur
  const cardWidth = 160;
  const cardHeight = 180;
  const cardX = (w - cardWidth) / 2;
  const cardY = h - 195; // position au centre du masque incurvé

  // Animation simple (fade-in)
  let opacity = 0;
  const duration = 500; // ms
  const start = performance.now();

  function animate(now) {
    const progress = Math.min(1, (now - start) / duration);
    opacity = progress;

    // Redessiner la roue
    drawWheel();

    // Dessiner le conteneur
    ctx.save();
    ctx.globalAlpha = opacity;

    // Fond du conteneur
    ctx.fillStyle = "#222";
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 3;
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 15);
    ctx.fill();
    ctx.stroke();

    // Titre (type de carte)
    ctx.fillStyle = "white";
    ctx.font = "bold 20px MedievalSharp";
    ctx.textAlign = "center";
    ctx.fillText(
      card.typeId.replace("type_", "").toUpperCase(),
      w / 2,
      cardY + 25
    );

    // Image au centre
    if (card.image) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(
          img,
          cardX + (cardWidth - 100) / 2,
          cardY + 40,
          100,
          100
        );
      };
      img.src = card.image;
    }

    // Description sous l’image
    ctx.fillStyle = "white";
    ctx.font = "bold 15px MedievalSharp";
    ctx.textAlign = "center";
    ctx.fillText(card.description, w / 2, cardY + cardHeight - 20);
    ctx.restore();
    if (progress < 1) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// Ajout d’un helper pour arrondir les coins
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
  return this;
};



/* ---------- drawWheel ---------- */
function drawWheel() {
  // clear using CSS logical pixels
  const metrics = computeMetrics();
  ctx.clearRect(0, 0, metrics.w, metrics.h);

  // recompute derived params
  const { centerX, centerY, radius, borderThickness, ledRadius, w, h } = metrics;
  const anglePerSeg = TWO_PI / segments;

  for (let i = 0; i < segments; i++) {
    const start = rotation + i * anglePerSeg;
    const end = start + anglePerSeg;
    const angle = (start + end) / 2;

    // draw segment
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // inner crust
    const crustOuterRadius = radius - 2;
    const crustInnerRadius = radius - 28;
    ctx.beginPath();
    ctx.arc(centerX, centerY, crustOuterRadius, start, end);
    ctx.arc(centerX, centerY, crustInnerRadius, end, start, true);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;

    // title
    const segment = segmentData[i];
    const titleText = segment ? segment.title : "";
    drawCurvedTitleLocal(ctx, titleText, start, end, radius, "white", metrics);

    // image + label
    const carte = segment ? segment.card : null;
    if (carte) {
      const imageRadius = radius - 70;
      const imageX = centerX + Math.cos(angle) * imageRadius;
      const imageY = centerY + Math.sin(angle) * imageRadius;

      if (segment.imageObj && segment.loaded) {
        ctx.save();
        ctx.translate(imageX, imageY);
        ctx.rotate(angle + Math.PI / 2);
        ctx.shadowColor = "black";
        ctx.shadowBlur = 12;
        // draw at fixed display size (scale if needed)
        ctx.drawImage(segment.imageObj, -20, -20, 40, 40);
        ctx.restore();
      } else {
        // placeholder circle (for missing image)
        ctx.save();
        ctx.translate(imageX, imageY);
        ctx.rotate(angle + Math.PI / 2);
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fill();
        ctx.restore();
      }

      // label only for Points
      if (segment.title === "Point" && carte.label) {
        const labelX = centerX + Math.cos(angle) * (radius - 60);
        const labelY = centerY + Math.sin(angle) * (radius - 60) - 12;
        ctx.save();
        ctx.translate(labelX, labelY);
        ctx.rotate(angle + Math.PI / 2);
        ctx.font = "bold 14px MedievalSharp";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(carte.label, 0, 0);
        ctx.restore();
      }
    }

    // small decorative dots
    const buttonRadius = radius - 16;
    const buttonSize = 4;
    const leftX = centerX + Math.cos(start) * buttonRadius;
    const leftY = centerY + Math.sin(start) * buttonRadius;
    const rightX = centerX + Math.cos(end) * buttonRadius;
    const rightY = centerY + Math.sin(end) * buttonRadius;
    ctx.beginPath();
    ctx.arc(leftX, leftY, buttonSize, 0, 2 * Math.PI);
    ctx.fillStyle = "#ccc";
    ctx.fill();
    ctx.strokeStyle = "#555";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rightX, rightY, buttonSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // arrow impact sound detection
    const fx = centerX;
    const fy = centerY - radius - borderThickness / 2 + 18;
    const dL = Math.hypot(fx - leftX, fy - leftY);
    const dR = Math.hypot(fx - rightX, fy - rightY);
    if ((dL < 8 || dR < 8) && spinning && Date.now() - lastImpactTime > 100) {
      lastImpactTime = Date.now();
      if (clickSound) try { clickSound.currentTime = 0; clickSound.play(); } catch(e){}
    }
  }

  // outer border ring
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + borderThickness / 2, 0, TWO_PI);
  ctx.strokeStyle = "rgba(61,107,207,0.9)";
  ctx.lineWidth = borderThickness;
  ctx.stroke();

  // LEDs
  const currentColor = ledBlinkState ? ledColors[0] : ledColors[1];
  for (let i = 0; i < segments; i++) {
    const angle = i * anglePerSeg + anglePerSeg / 2;
    const x = centerX + Math.cos(angle) * ledRadius;
    const y = centerY + Math.sin(angle) * ledRadius;
    ctx.beginPath();
    ctx.shadowColor = currentColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = currentColor;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.arc(x, y, 6, 0, TWO_PI);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // arrow (top)
  const arrowBaseY = centerY - radius - borderThickness / 4;
  ctx.save();
  ctx.translate(centerX, arrowBaseY);
  ctx.rotate(-arrowTilt);
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.quadraticCurveTo(-6, 6, -3, 20);
  ctx.lineTo(3, 20);
  ctx.quadraticCurveTo(6, 6, 12, 0);
  ctx.closePath();
  ctx.fillStyle = "red";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Masque incurvé responsive
  drawCurvedMask(metrics);

  // --- Image vignette animée + description ---
if (selectedCardImage) {
  const cardBoxW = (window.innerWidth <= 480) ? 120 : 160;
  const cardBoxH = (window.innerWidth <= 480) ? 150 : 200;

  const boxX = (metrics.w - cardBoxW) / 2;
  const boxY = metrics.h - cardBoxH - 20; // collé au masque incurvé

  ctx.save();
  ctx.globalAlpha = selectedCardAnim;

  // Fond carte
  ctx.fillStyle = "#222";
  ctx.strokeStyle = "#888";
  ctx.lineWidth = 2;
  ctx.roundRect(boxX, boxY, cardBoxW, cardBoxH, 12);
  ctx.fill();
  ctx.stroke();

  // Type (titre en haut)
  ctx.fillStyle = "white";
  ctx.font = "bold 14px MedievalSharp";
  ctx.textAlign = "center";
  ctx.fillText(segmentData.find(s => s.card.image === selectedCardImage.src)?.title || "", metrics.w / 2, boxY + 18);

  // Image centrale
  ctx.drawImage(selectedCardImage, boxX + (cardBoxW - 70) / 2, boxY + 30, 70, 70);

  // Description en bas
  ctx.fillStyle = "white";
  ctx.font = "bold 12px MedievalSharp";
  ctx.fillText(currentDescription, metrics.w / 2, boxY + cardBoxH - 10);

  ctx.restore();
}

  // --- Description juste en bas de l’image ---
  if (currentDescription) {
    ctx.fillStyle = "white";
    ctx.font = "bold 18px MedievalSharp";
    ctx.textAlign = "center";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(currentDescription, w / 2, h - 40);
    ctx.shadowBlur = 0;
  }
}


/* ---------- LED blink ---------- */
function updateLedBlink() {
  ledBlinkTimer++;
  if (ledBlinkTimer > ledBlinkDelay) {
    ledBlinkTimer = 0;
    ledBlinkState = !ledBlinkState;
  }
}

// -------- finalizeSelectionAndSend (version adaptée pour modes deck / fast / initial) ----------
function finalizeSelectionAndSend() {
  const metrics = computeMetrics();
  const anglePerSeg = TWO_PI / segments;
  const pointerAngle = -Math.PI / 2;
  const norm = (a) => ((a % TWO_PI) + TWO_PI) % TWO_PI;
  let best = { idx: -1, diff: Infinity };
  for (let i = 0; i < segments; i++) {
    const midAngle = rotation + (i + 0.5) * anglePerSeg;
    const midN = norm(midAngle);
    let d = Math.abs(midN - norm(pointerAngle));
    if (d > Math.PI) d = TWO_PI - d;
    if (d < best.diff) best = { idx: i, diff: d };
  }
  const selectedIndex = best.idx;
  if (selectedIndex < 0 || selectedIndex >= segmentData.length) {
    console.warn('No segment selected reliably:', selectedIndex);
    return;
  }
  const segment = segmentData[selectedIndex];
  if (!segment || !segment.card) {
    console.warn('selected segment has no card', segment);
    return;
  }
  showSelectedCard(segment.card);
  drawWheel();
  // Reset visuel après petit délai
  setTimeout(() => {
    rotation = 0;
    selectedCardImage = null;
    selectedCardAnim = 0;
    currentDescription = "";
    genererSegmentDataOnce();
    drawWheel();
  }, 1500);
  const cardKey = segment.card.id;


// ... après avoir calculé segment et cardKey ...
// --- Mode deck : stocker localement puis notifier l'arène via action 'deckUpdate' ---
if (currentSpinMode === 'deck') {
  if (currentPlayer === 'player') {
    if (typeof deckPlayer !== 'undefined') deckPlayer.push(segment.card);
  } else if (currentPlayer === 'ia') {
    if (typeof deckIA !== 'undefined') deckIA.push(segment.card);
  }
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      action: 'deckUpdate',
      player: currentPlayer,
      card: segment.card,
      mode: 'deck',
      keepPopupOpen: currentPlayer === 'player'
    }, '*');
  }
  // enchaîner IA/player comme avant
  if (currentPlayer === 'player') {
    setTimeout(() => { currentPlayer = 'ia'; try { updateTurnIndicator(); } catch (e) {} ; spin('ia', 'deck'); }, 900);
  } else if (currentPlayer === 'ia') {
    setTimeout(() => { currentPlayer = 'player'; try { updateTurnIndicator(); } catch (e) {} ; }, 600);
  }
  return;
}
// --- Mode initial (nouveau comportement réutilisable) ---
if (currentSpinMode === 'initial' || currentSpinMode == null) {
  // on envoie le card id et précise mode initial ; on ne demande pas de fermer la popup
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      action: 'wheelResult',
      player: currentPlayer,
      card: cardKey,
      mode: 'initial'
    }, '*');
  }
  // enchaînement côté iframe : si player a tourné, lancer spin IA (optionnel)
  if (currentPlayer === 'player') {
    setTimeout(() => { currentPlayer = 'ia'; try { updateTurnIndicator(); } catch (e) {} ; spin('ia', 'initial'); }, 900);
  } else if (currentPlayer === 'ia') {
    setTimeout(() => { currentPlayer = 'player'; try { updateTurnIndicator(); } catch (e) {} ; }, 600);
  }
  return;
}
  // --- Mode initial (comportement historique) ---
  sendSelectionToServer({
    gameId: 'match42',
    player: currentPlayer,
    cardKey
  }).then(resp => { if (resp) console.log('server ok', resp); });
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      action: 'wheelResult',
      player: currentPlayer,
      card: cardKey,
      mode: 'initial'
    }, '*');
  }
  // UX : si distribution complète, fermer popup légèrement
 
}

// Réception de messages depuis l'arène (postMessage)
function updateTurnIndicator() {
  const el = document.getElementById('turn-indicator');
  if (!el) return;
  if (currentPlayer === 'player') {
    el.textContent = "Tour : Joueur";
    el.style.borderColor = "#FFD700";
    el.style.boxShadow = "0 0 15px rgba(255, 215, 0, 0.7)";
  } else {
    el.textContent = "Tour : IA";
    el.style.borderColor = "#FF4500";
    el.style.boxShadow = "0 0 15px rgba(255, 69, 0, 0.7)";
  }
}


// MOTEUR PRINCIPAL (dans l'iframe roue) : reception de messages depuis parent
window.addEventListener('message', (ev) => {
  const msg = ev.data;
  if (!msg || typeof msg !== 'object') return;
  // setTurn (optionnel) — permet de synchroniser visuel tour si besoin
  if (msg.action === 'setTurn') {
    currentPlayer = msg.player || currentPlayer;
    updateTurnIndicator();
  }
  // spinNow attendu : { action:'spinNow', player: 'player'|'ia', mode: 'initial'|'deck'|'fast' }
  if (msg.action === 'spinNow') {
    const who = msg.player || currentPlayer;
    const mode = msg.mode || 'initial';
    // assign currentSpinMode to ensure finalizeSelectionAndSend detects it
    currentSpinMode = mode;
    if (who === 'ia') spin('ia', mode);
    else if (who === 'player') spin('player', mode);
  }
});

// Appelle une première fois pour initialiser
updateTurnIndicator();


// -------- MODIFICATION DE LA FONCTION SPIN --------
function spin(forcedPlayer = 'player', mode = 'initial') {
  if (spinning) return;

  // --- Empêcher les boucles infinies du spin IA ---
if (forcedPlayer === 'ia' && currentSpinMode === 'deck' && spinning) {
  console.warn("[AUTO-SPIN BLOQUÉ] L'IA tente de relancer un spin alors qu'un autre est actif.");
  return;
}

  if (currentPlayer && currentPlayer !== forcedPlayer) {
    console.warn(`Blocked spin: tour courant = ${currentPlayer}, demandé = ${forcedPlayer}`);
    return;
  }

  // --- Vérification du mode deck pour popup humain ---
  currentSpinMode = mode;
  if (mode === 'deck' && forcedPlayer === 'player') {
    const confirmDeck = confirm("Voulez-vous tourner la roue pour recharger votre deck ?");
    if (!confirmDeck) return; // si refus, on stoppe
  }

  // --- RESET roue avant un nouveau tour ---
  rotation = 0;
  selectedCardImage = null;
  selectedCardAnim = 0;
  currentDescription = "";
  genererSegmentDataOnce();

  spinning = true;

  const targetIndex = Math.floor(Math.random() * segments);
  const rounds = Math.floor(Math.random() * 3) + 6;
  const currentNorm = ((rotation % TWO_PI) + TWO_PI) % TWO_PI;
  const desiredMid = -Math.PI / 2;
  const midAngleOfSegment = (targetIndex + 0.5) * (TWO_PI / segments);
  let delta = desiredMid - (rotation + midAngleOfSegment);
  delta = ((delta % TWO_PI) + TWO_PI) % TWO_PI;
  const targetRotation = rotation + rounds * TWO_PI + delta;

  const duration = 3500 + Math.floor(Math.random() * 700);
  const start = performance.now();
  const startRotation = rotation;
  const totalDelta = targetRotation - startRotation;

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const eased = easeOutCubic(t);
    rotation = startRotation + totalDelta * eased;

    if (Date.now() - lastImpactTime < 120) {
      arrowTilt += arrowDirection * 0.07;
      if (Math.abs(arrowTilt) > 0.35) arrowDirection *= -1;
      arrowTilt *= (1 - arrowDecay);
    } else {
      arrowTilt = 0;
    }

    updateLedBlink();
    drawWheel();

    if (t < 1) requestAnimationFrame(frame);
    else {
      spinning = false;
      rotation = targetRotation;
      drawWheel();
      if (winSound) try { winSound.currentTime = 0; winSound.play(); } catch(e){}

      // --- FIN DU SPIN ---
      finalizeSelectionAndSend();
    }
  }
  requestAnimationFrame(frame);
}


/* ---------- NETWORK ---------- */
async function sendSelectionToServer({ gameId = 'game1', player = 'player', cardKey }) {
  try {
    const resp = await fetch('http://localhost:3000/api/wheel/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, player, cardKey })
    });
    const data = await resp.json();
    if (!resp.ok) {
      console.error('Server error:', data);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Network error:', err);
    return null;
  }
}

drawWheel();
//canvas.addEventListener('click', () => { spin(); });