// --- Variables ---

const slides = document.querySelectorAll('.slide');
const popup = document.querySelector('.popup');
const popupText = document.getElementById('popup-text');
const circle = document.querySelector('.progress-ring__circle');
const avatar = document.querySelector('.avatar');

const music = document.getElementById('bg-music');
const musicPopup = document.getElementById('music-popup');

// Fonction déclenchée au clic sur le bouton
function startMusic() {
  music.play().then(() => {
    console.log("Musique démarrée !");
  }).catch(err => console.log("Lecture bloquée:", err));

  // Faire disparaître le popup
  musicPopup.style.opacity = '0';
  setTimeout(() => {
    musicPopup.style.display = 'none';
  }, 400);
}

// Afficher le popup dès le chargement
window.addEventListener('load', () => {
  musicPopup.style.display = 'flex';
});



/********* Mode rotation automatique
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
});
*******************/


// Phrases associées aux images
const phrases = [
  "Initialisation du réseau...",
  "Chargement des textures...",
  "Synchronisation audio...",
  "Préparation de l'arène magique...",
  "Configuration des sorts...",
  "Invocation des héros..."
];

// Avatars en diaporama
const avatars = [
  "emblem_1.png",
  "emblem_7.png",
  "emblem_9.png",
  "AvatarVieuxPere_1.jpg"
];
let indexSlide = 0;
let indexAvatar = 0;

// --- Barre circulaire ---
const radius = circle.r.baseVal.value;
const circumference = 2 * Math.PI * radius;
circle.style.strokeDasharray = circumference;
circle.style.strokeDashoffset = circumference;

function setProgress(percent) {
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
}

// --- Fonction principale ---
function nextStep() {
  // Image BG
  slides.forEach(s => s.classList.remove('active'));
  slides[indexSlide].classList.add('active');

  // Popup texte
  popupText.textContent = phrases[indexSlide];
  popup.classList.add('show');

  // Progression
  const percent = ((indexSlide + 1) / slides.length) * 100;
  setProgress(percent);

  // Avatar diaporama
  avatar.src = avatars[indexAvatar];
  indexAvatar = (indexAvatar + 1) % avatars.length;

  // Passage à l'image suivante
  indexSlide++;

  // Si c'était la dernière image
  if (indexSlide === slides.length) {
    setTimeout(() => {
      popupText.textContent = "Lancement du menu principal...";
    }, 2000);

    setTimeout(() => {
      window.location.href = "Main_Menu.html"; // Redirection
    }, 10000); // 5s après le message final
  }
}

// Lancement : toutes les 3 sec jusqu'à la 6e image
const interval = setInterval(() => {
  if (indexSlide < slides.length) {
    nextStep();
  } else {
    clearInterval(interval);
  }
}, 5000);

// Initialisation
nextStep();

