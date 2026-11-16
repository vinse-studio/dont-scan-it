import { soundManager } from "../scripts/SoundManager.js";

export class IntroScene extends Phaser.Scene {
  constructor() {
    super("IntroScene");
  }

  create() {
    this.transitioned = false;
    this.cameras.main.setBackgroundColor("#000000");

    // Full-screen VINSE Studio logo (white "VINSE" eye-V emblem on red gradient background)
    this.logo = this.add.image(640, 360, "vinse_intro")
      .setDisplaySize(1280, 720)
      .setAlpha(0);

    // Black fade veil
    this.veil = this.add.rectangle(640, 360, 1280, 720, 0x000000, 1);

    // Play deep Web Audio synth bass swell on first interaction or immediately if unlocked
    soundManager.playIntroBassSwell();
    this.input.once("pointerdown", () => {
      soundManager.playIntroBassSwell();
      this.finishIntro();
    });
    this.input.keyboard.once("keydown", () => {
      soundManager.playIntroBassSwell();
      this.finishIntro();
    });

    // 1.2s smooth fade-in from black + subtle scale zoom (1.0 -> 1.04)
    this.tweens.add({
      targets: this.logo,
      alpha: 1,
      scaleX: this.logo.scaleX * 1.04,
      scaleY: this.logo.scaleY * 1.04,
      duration: 2700,
      ease: "Sine.easeOut"
    });

    this.tweens.add({
      targets: this.veil,
      alpha: 0,
      duration: 1200,
      ease: "Power2",
      onComplete: () => {
        // 1.5s hold, then smooth fade-out into MainMenu
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: this.veil,
            alpha: 1,
            duration: 900,
            ease: "Power2",
            onComplete: () => {
              this.finishIntro();
            }
          });
        });
      }
    });
  }

  finishIntro() {
    if (this.transitioned) return;
    this.transitioned = true;
    this.scene.start("MainMenu");
  }
}
