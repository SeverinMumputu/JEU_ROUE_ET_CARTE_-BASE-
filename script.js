const bgMusic = document.getElementById('bg-music');
const startPopup = document.getElementById('start-popup');
const startMessage = document.getElementById('start-message');
const popupContinue = document.getElementById('popup-continue');
const orientationMsg = document.getElementById('orientation-msg');
const continuePortrait = document.getElementById('continue-portrait');
const startBtn = document.getElementById('start-btn');

// Messages de présentation aléatoires
const messages = [
  "Bienvenue dans l'Arène des Arcanes...",
  "Préparez-vous à un voyage magique et enflammé...",
  "Le feu sacré vous attend dans l'arène..."
];

// Afficher un message aléatoire au chargement
window.addEventListener('load', () => {
  startMessage.textContent = messages[Math.floor(Math.random() * messages.length)];
});

// Clic sur Continuer (popup)
popupContinue.addEventListener('click', () => {
  bgMusic.volume = 0.8;
  bgMusic.play().catch(() => console.log("Musique bloquée."));
  startPopup.style.display = 'none';
});

// Clic sur Démarrer → Redirection après petite animation ou délai
startBtn.addEventListener('click', () => {
  // Optionnel : petite attente pour fluidité
  setTimeout(() => {
    window.location.href = "BarreDeProgression.html"; // <-- Mets ici la page cible
  }, 500);
});

// Vérification orientation
function checkOrientation() {
  if (window.innerHeight > window.innerWidth) {
    orientationMsg.style.display = 'flex';
  } else {
    orientationMsg.style.display = 'none';
  }
}
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', checkOrientation);
checkOrientation();

// Continuer en portrait
continuePortrait.addEventListener('click', () => {
  orientationMsg.style.display = 'none';
});
