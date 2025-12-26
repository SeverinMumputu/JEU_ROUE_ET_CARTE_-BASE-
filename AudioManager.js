export default class AudioManager {
    constructor(src) {
        this.audio = new Audio(src);
        this.audio.loop = true;
        this.audio.volume = 0.5;

        this.isEnabled = true;
        this.isUnlocked = false;
    }

    unlock() {
        if (this.isUnlocked) return;

        this.audio.play()
            .then(() => {
                this.audio.pause();
                this.audio.currentTime = 0;
                this.isUnlocked = true;
                console.log("🔓 Audio débloqué");
            })
            .catch(err => {
                console.warn("❌ Unlock audio refusé", err);
            });
    }

    play() {
        if (!this.isEnabled || !this.isUnlocked) return;
        this.audio.play().catch(() => {});
    }

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    toggle() {
        this.isEnabled = !this.isEnabled;

        if (this.isEnabled && this.isUnlocked) {
            this.audio.play();
        } else {
            this.audio.pause();
        }
        return this.isEnabled;
    }
}