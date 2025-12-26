// --- Particules feu ---
const canvas = document.getElementById('fireParticles');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const startPopup = document.getElementById('start-popup');
const startMessage = document.getElementById('start-message');
const startBtn = document.getElementById('start-btn');
const bgMusic = document.getElementById('bg-music');
const fireSound = document.getElementById('fire-sound');

// Messages aléatoires
const messages = [
  "La flamme des arcanes brûle en vous...",
  "Préparez votre deck, l'arène vous attend...",
  "Le feu sacré forge les héros légendaires...",
  "Chaque carte est une arme, chaque choix un destin...",
  "Les cendres d'hier allument les flammes d'aujourd'hui..."
];

// Afficher un message aléatoire
window.addEventListener('load', () => {
  startMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
});

// Clic sur Continuer
startBtn.addEventListener('click', () => {
  // Lancer musique fond
  bgMusic.volume = 0.8;
  bgMusic.play().catch(() => console.log("Musique bloquée"));
  
  // Précharger crépitement
  fireSound.load();
  fireSound.volume = 1.0;
  fireSound.play().then(() => {
    fireSound.pause();
    fireSound.currentTime = 0;
  });

  // Fermer popup
  startPopup.style.opacity = '0';
  setTimeout(() => startPopup.style.display = 'none', 600);
});

/******   Mode rotation automatique
const orientationMsg = document.getElementById('orientation-msg');
const continueBtn = document.getElementById('continue-btn');

function checkOrientation() {
  if (window.innerHeight > window.innerWidth) {
    // Mode portrait → afficher message
    orientationMsg.style.display = 'flex';
  } else {
    // Mode paysage → cacher message
    orientationMsg.style.display = 'none';
  }
}

// Vérification initiale et écoute des changements
window.addEventListener('load', checkOrientation);
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);

// Bouton "Continuer en portrait"
continueBtn.addEventListener('click', () => {
  orientationMsg.style.display = 'none';
}); *******/

const arenaPopup = document.getElementById('arena-popup');
const btnArena = document.getElementById('btn-arena');
const closeBtn = document.querySelector('.close-btn');

// Ouvrir popup Arène
btnArena.addEventListener('click', () => {
  arenaPopup.style.display = 'flex';
});

// Fermer popup
closeBtn.addEventListener('click', () => {
  arenaPopup.style.display = 'none';
});

// Sélection mode IA
document.getElementById('btn-ai').addEventListener('click', () => {
  console.log("Mode Contre IA sélectionné");
  arenaPopup.style.display = 'none';
  // Redirection ou création arène IA à venir
   window.location.href = "New_Arena_2.html"; // <-- Mets ici la page cible
});

// Sélection mode 1v3
document.getElementById('btn-1v3').addEventListener('click', () => {
  console.log("Mode 1 vs 3 sélectionné");
  arenaPopup.style.display = 'none';
  // Redirection ou création arène 4 joueurs à venir
});


// --- Braises du titre ---
const emberCanvas = document.getElementById('emberCanvas');
const eCtx = emberCanvas.getContext('2d');
emberCanvas.width = window.innerWidth;
emberCanvas.height = window.innerHeight;

let particles = [];
function createParticle() {
  const x = Math.random() * canvas.width;
  const y = canvas.height;
  const size = Math.random() * 4 + 2;
  const speedY = Math.random() * 2 + 1;
  const alpha = 1;
  particles.push({ x, y, size, speedY, alpha });
}


let embers = [];
function createEmber() {
  const x = window.innerWidth / 2 + (Math.random() * 200 - 100);
  const y = 200; // position du titre
  const size = Math.random() * 3 + 1;
  const speedY = Math.random() * 1 + 0.5;
  const alpha = 1;
  embers.push({ x, y, size, speedY, alpha });
}
function animateEmbers() {
  eCtx.clearRect(0, 0, emberCanvas.width, emberCanvas.height);
  embers.forEach((e, i) => {
    e.y += e.speedY;
    e.alpha -= 0.01;
    eCtx.fillStyle = `rgba(255, ${100+Math.random()*100}, 0, ${e.alpha})`;
    eCtx.beginPath();
    eCtx.arc(e.x, e.y, e.size, 0, Math.PI*2);
    eCtx.fill();
    if (e.alpha <= 0) embers.splice(i, 1);
  });
  requestAnimationFrame(animateEmbers);
}
setInterval(createEmber, 150);
animateEmbers();

// --- Particules feu dans popup ---
const popupFire = document.querySelector('.popup-fire');
function spawnPopupParticle() {
  const particle = document.createElement('div');
  particle.style.position = 'absolute';
  particle.style.width = '4px';
  particle.style.height = '4px';
  particle.style.borderRadius = '50%';
  particle.style.background = `rgba(255,${100+Math.random()*100},0,1)`;
  particle.style.left = `${Math.random()*100}%`;
  particle.style.top = '100%';
  particle.style.opacity = 1;
  particle.style.transition = 'all 1s linear';
  popupFire.appendChild(particle);

  setTimeout(() => {
    particle.style.top = '0%';
    particle.style.opacity = 0;
  }, 50);

  setTimeout(() => particle.remove(), 1000);
}

// Popup hover + particules feu
document.querySelectorAll('.circle').forEach(circle => {
  circle.addEventListener('mouseenter', (e) => {
    popupText.textContent = circle.dataset.info;
    popup.style.opacity = 1;
    const rect = e.target.getBoundingClientRect();
    popup.style.left = `${rect.left + rect.width/2 - 80}px`;
    popup.style.top = `${rect.top - 80}px`;
    fireSound.currentTime = 0;
    fireSound.play();
    popupFire.innerHTML = '';
    setInterval(spawnPopupParticle, 150);
  });
  circle.addEventListener('mouseleave', () => {
    popup.style.opacity = 0;
    popupFire.innerHTML = '';
  });
});



function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, i) => {
    p.y -= p.speedY;
    p.alpha -= 0.005;
    ctx.fillStyle = `rgba(255, ${80+Math.random()*100}, 0, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    if (p.alpha <= 0) particles.splice(i, 1);
  });
  requestAnimationFrame(animateParticles);
}
setInterval(createParticle, 40);
animateParticles();

// --- Popup au survol ---
const popup = document.getElementById('popup');
const popupText = document.getElementById('popup-text');


document.querySelectorAll('.circle').forEach(circle => {
  circle.addEventListener('mouseenter', (e) => {
    popupText.textContent = circle.dataset.info;
    popup.style.opacity = 1;
    const rect = e.target.getBoundingClientRect();
    popup.style.left = `${rect.left + rect.width/2 - 80}px`;
    popup.style.top = `${rect.top - 60}px`;
   
  });
  circle.addEventListener('mouseleave', () => {
    popup.style.opacity = 0;
  });
});
