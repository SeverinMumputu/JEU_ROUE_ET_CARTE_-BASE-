
// ✅ Ouverture au clic sur l'image de la roue
document.getElementById("wheel-image").addEventListener("click", function() {
  document.getElementById("wheel-popup").style.display = "flex";
});

// ✅ Fermeture au clic sur le bouton X
document.getElementById("close-popup").addEventListener("click", function() {
  document.getElementById("wheel-popup").style.display = "none";
});

// ✅ Fermeture si on clique en dehors du popup
window.addEventListener("click", function(e) {
  const popup = document.getElementById("wheel-popup");
  if (e.target === popup) {
    popup.style.display = "none";
  }
});