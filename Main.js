/**
 * Fichier de lancement et initialisation du jeu...
 */
import UIManager from "./UIManager.js";

window.addEventListener("load", () => {
    const ui = new UIManager();
    console.log("Initialisation du jeu...");

    const soundBtn = document.getElementById("sound-toggle-btn");
    const soundOnIcon = document.getElementById("sound-on-icon");
    const soundOffIcon = document.getElementById("sound-off-icon");

    let unlocked = false;

    soundBtn.addEventListener("click", () => {

        // 🔓 UNLOCK OBLIGATOIRE
        if (!unlocked) {
            console.log("🔓 Déblocage audio via bouton visible");

            ui.audioManager.unlock();
            ui.audioManager.play();

            unlocked = true;

            soundOnIcon.classList.remove("hidden");
            soundOffIcon.classList.add("hidden");
            return;
        }

        // 🔁 ON / OFF
        const enabled = ui.audioManager.toggle();

        soundOnIcon.classList.toggle("hidden", !enabled);
        soundOffIcon.classList.toggle("hidden", enabled);
    });
});