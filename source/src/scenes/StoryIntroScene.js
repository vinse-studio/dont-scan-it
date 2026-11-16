import { LOCALES } from "../scripts/Locale.js";
import { soundManager } from "../scripts/SoundManager.js";
import { saveManager } from "../scripts/SaveManager.js";

export class StoryIntroScene extends Phaser.Scene {
  constructor() {
    super("StoryIntroScene");
  }

  create() {
    this.transitioned = false;
    this.revealing = false;
    this.lineIndex = 0;
    this.typing = false;
    this.typeEvent = null;
    this.autoEvent = null;
    this.dialogVoice = null;
    this.dialogVoiceDeadline = 0;

    this.lang = saveManager.state.settings.language || this.registry.get("lang") || "UZ";
    this.registry.set("lang", this.lang);
    this.locale = LOCALES[this.lang]?.storyIntro || LOCALES.UZ.storyIntro;

    const volume = saveManager.state.settings.volume;
    soundManager.setVolume(volume);
    this.sound.volume = volume;
    this.cameras.main.setBackgroundColor("#050806");

    this.buildParallaxStore();
    this.buildDialogueUI();
    this.bindControls();

    soundManager.startAmbientHum();
    soundManager.playIntroBassSwell();
    this.showLine(0);

    this.events.once("shutdown", () => {
      soundManager.stopAmbientHum();
      this.clearLineTimers();
    });
  }

  buildParallaxStore() {
    this.bgFar = this.add.image(640, 360, "bg_store_far")
      .setDisplaySize(1360, 765)
      .setDepth(0);

    this.bgMid = this.add.image(640, 360, "bg_shelves_mid")
      .setDisplaySize(1360, 765)
      .setDepth(4);

    this.storeTint = this.add.rectangle(640, 360, 1280, 720, 0x030705, 0.23)
      .setDepth(6);

    this.managerHalo = this.add.circle(900, 305, 215, 0xb4c4a3, 0.055)
      .setDepth(7);

    this.managerPortrait = this.add.image(900, 340, "cust_03_normal")
      .setDisplaySize(470, 470)
      .setDepth(9);
    this.managerBase = { x: 900, y: 340, scaleX: this.managerPortrait.scaleX, scaleY: this.managerPortrait.scaleY };

    this.managerPlaque = this.add.container(900, 118).setDepth(12);
    const plaqueBg = this.add.rectangle(0, 0, 278, 38, 0x07100d, 0.92).setStrokeStyle(1, 0x52745a, 0.8);
    const plaqueTxt = this.add.text(0, 0, this.locale.speakerManager, {
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#cbd5c1",
      letterSpacing: 2
    }).setOrigin(0.5);
    this.managerPlaque.add([plaqueBg, plaqueTxt]);

    this.counter = this.add.image(740, 430, "counter_desk")
      .setDisplaySize(1180, 665)
      .setDepth(15);

    this.foregroundShadow = this.add.graphics().setDepth(17);
    this.foregroundShadow.fillStyle(0x020403, 0.9);
    this.foregroundShadow.fillPoints([
      { x: 0, y: 720 }, { x: 0, y: 670 }, { x: 118, y: 630 },
      { x: 226, y: 650 }, { x: 332, y: 720 }
    ], true);

    this.flickerLight = this.add.rectangle(640, 40, 1280, 4, 0xc9dfb1, 0.08)
      .setDepth(20);
    this.time.addEvent({
      delay: 3600,
      loop: true,
      callback: () => {
        this.flickerLight.setAlpha(0.35);
        this.time.delayedCall(75, () => {
          if (this.flickerLight?.active) this.flickerLight.setAlpha(0.035);
        });
      }
    });

    this.dust = [];
    for (let i = 0; i < 20; i++) {
      const mote = this.add.circle(
        Phaser.Math.Between(160, 1210),
        Phaser.Math.Between(80, 620),
        Phaser.Math.FloatBetween(1, 2.1),
        0xd7e6c8,
        Phaser.Math.FloatBetween(0.08, 0.2)
      ).setDepth(18);
      mote.vx = Phaser.Math.FloatBetween(-0.11, 0.11);
      mote.vy = Phaser.Math.FloatBetween(-0.18, -0.04);
      this.dust.push(mote);
    }

    this.add.image(640, 360, "jumpscare_02")
      .setDisplaySize(1280, 720)
      .setAlpha(0)
      .setDepth(80);
    this.revealImage = this.children.list[this.children.length - 1];

    this.input.on("pointermove", (pointer) => {
      const dx = (pointer.x - 640) / 640;
      const dy = (pointer.y - 360) / 360;
      this.bgFar.setPosition(640 - dx * 4, 360 - dy * 2);
      this.bgMid.setPosition(640 - dx * 10, 360 - dy * 5);
      this.managerPortrait.setPosition(this.managerBase.x - dx * 16, this.managerBase.y - dy * 9);
      this.managerHalo.setPosition(900 - dx * 12, 305 - dy * 7);
      this.counter.setPosition(740 - dx * 19, 430 - dy * 8);
    });
  }

  buildDialogueUI() {
    this.locationText = this.add.text(72, 45, this.locale.location, {
      fontFamily: "'Courier New', monospace",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#a3b79c",
      letterSpacing: 2
    }).setDepth(70);

    this.dialogPanel = this.add.rectangle(640, 594, 1188, 184, 0x020403, 0.9)
      .setStrokeStyle(2, 0x43624a, 0.9)
      .setDepth(70)
      .setInteractive({ useHandCursor: true });

    this.speakerText = this.add.text(640, 529, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#a3e635",
      letterSpacing: 3
    }).setOrigin(0.5).setDepth(71);

    this.dialogText = this.add.text(640, 584, "", {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "23px",
      fontStyle: "bold",
      color: "#f1f5f0",
      align: "center",
      lineSpacing: 7,
      wordWrap: { width: 1060, useAdvancedWrap: true }
    }).setOrigin(0.5).setDepth(71);

    this.continueText = this.add.text(640, 663, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#82917f",
      letterSpacing: 2
    }).setOrigin(0.5).setDepth(71);

    this.skipBg = this.add.rectangle(1133, 47, 232, 42, 0x070b09, 0.88)
      .setStrokeStyle(1, 0x6b7869, 0.8)
      .setDepth(75)
      .setInteractive({ useHandCursor: true });
    this.skipText = this.add.text(1133, 47, this.locale.skip, {
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#e2e8df",
      letterSpacing: 1
    }).setOrigin(0.5).setDepth(76);
    this.skipBg.on("pointerover", () => this.skipBg.setFillStyle(0x18241c, 0.98));
    this.skipBg.on("pointerout", () => this.skipBg.setFillStyle(0x070b09, 0.88));
    this.skipBg.on("pointerdown", () => this.skipToGameplay());

    this.dialogPanel.on("pointerdown", () => this.advanceDialogue());

    this.blackFade = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0)
      .setDepth(90);
    this.redFlash = this.add.rectangle(640, 360, 1280, 720, 0xa30012, 0)
      .setDepth(82);
  }

  bindControls() {
    this.input.keyboard.on("keydown-SPACE", () => this.advanceDialogue());
    this.input.keyboard.on("keydown-ENTER", () => this.advanceDialogue());
    this.input.keyboard.on("keydown-ESC", () => this.skipToGameplay());
  }

  showLine(index) {
    if (this.transitioned || this.revealing) return;
    this.clearLineTimers();
    this.lineIndex = index;
    const voiceDuration = this.playDialogueVoice(index);
    const line = this.locale.lines[index];
    this.activeCharacters = Array.from(line.text);
    this.revealedCount = 0;
    this.typing = true;
    this.dialogText.setText("");
    this.continueText.setText("");

    const isManager = line.speaker === "manager";
    this.speakerText
      .setText(isManager ? this.locale.speakerManager : this.locale.speakerCashier)
      .setColor(isManager ? "#a3e635" : "#7dd3fc");

    if (isManager) {
      this.managerPortrait.clearTint().setAlpha(1);
      this.managerPlaque.setAlpha(1);
      this.tweens.killTweensOf(this.managerPortrait);
      this.tweens.add({
        targets: this.managerPortrait,
        y: this.managerBase.y - 4,
        duration: 580,
        yoyo: true,
        ease: "Sine.easeInOut"
      });
    } else {
      this.managerPortrait.setTint(0x8c9787).setAlpha(0.82);
      this.managerPlaque.setAlpha(0.78);
    }

    this.typeEvent = this.time.addEvent({
      delay: 24,
      loop: true,
      callback: () => {
        this.revealedCount += 1;
        this.dialogText.setText(this.activeCharacters.slice(0, this.revealedCount).join(""));
        if (this.revealedCount >= this.activeCharacters.length) {
          this.typeEvent?.remove(false);
          this.typeEvent = null;
          this.typing = false;
          this.continueText.setText(`${this.locale.continue}  [ENTER]`);
        }
      }
    });

    const fallbackDelay = Math.max(4200, 1750 + this.activeCharacters.length * 23);
    const autoDelay = voiceDuration > 0 ? Math.max(1800, voiceDuration + 320) : fallbackDelay;
    this.autoEvent = this.time.delayedCall(autoDelay, () => this.advanceDialogue());
  }

  playDialogueVoice(index) {
    if (soundManager.muted) return 0;
    const suffix = String(index + 1).padStart(2, "0");
    const audioKey = `story_${this.lang.toLowerCase()}_${suffix}`;
    if (!this.cache.audio.exists(audioKey)) return 0;
    try {
      const voice = this.sound.add(audioKey, { volume: 0.92 });
      this.dialogVoice = voice;
      const duration = Number(voice.duration || 0) * 1000;
      this.dialogVoiceDeadline = duration > 0 ? Date.now() + duration : 0;
      voice.once("complete", () => {
        if (this.dialogVoice === voice) {
          this.dialogVoice = null;
          this.dialogVoiceDeadline = 0;
        }
        voice.destroy();
      });
      voice.play();
      return duration;
    } catch (error) {
      this.dialogVoice = null;
      this.dialogVoiceDeadline = 0;
      return 0;
    }
  }

  advanceDialogue() {
    if (this.transitioned || this.revealing) return;
    if (this.typing) {
      this.typeEvent?.remove(false);
      this.typeEvent = null;
      this.dialogText.setText(this.activeCharacters.join(""));
      this.typing = false;
      this.continueText.setText(`${this.locale.continue}  [ENTER]`);
      this.autoEvent?.remove(false);
      const remainingVoiceMs = this.dialogVoiceDeadline ? Math.max(0, this.dialogVoiceDeadline - Date.now()) : 0;
      this.autoEvent = this.time.delayedCall(Math.max(1800, remainingVoiceMs + 320), () => this.advanceDialogue());
      return;
    }

    if (this.lineIndex < this.locale.lines.length - 1) {
      this.showLine(this.lineIndex + 1);
    } else {
      this.playFinalReveal();
    }
  }

  clearLineTimers() {
    this.typeEvent?.remove(false);
    this.autoEvent?.remove(false);
    this.typeEvent = null;
    this.autoEvent = null;
    if (this.dialogVoice) {
      this.dialogVoice.stop();
      this.dialogVoice.destroy();
      this.dialogVoice = null;
    }
    this.dialogVoiceDeadline = 0;
  }

  update() {
    for (const mote of this.dust || []) {
      mote.x += mote.vx;
      mote.y += mote.vy;
      if (mote.y < 40) mote.y = 680;
      if (mote.x < 80) mote.x = 1200;
      if (mote.x > 1220) mote.x = 90;
    }
  }

  playFinalReveal() {
    if (this.revealing || this.transitioned) return;
    this.revealing = true;
    this.clearLineTimers();
    this.dialogPanel.disableInteractive();
    this.dialogPanel.setVisible(false);
    this.speakerText.setVisible(false);
    this.dialogText.setVisible(false);
    this.continueText.setVisible(false);

    this.time.delayedCall(650, () => {
      if (this.transitioned) return;
      this.redFlash.setAlpha(0.34);
      this.cameras.main.shake(330, 0.012);
      this.revealImage.setAlpha(1).setScale(1.12);
      this.tweens.add({ targets: this.revealImage, scale: 1, duration: 260, ease: "Cubic.easeOut" });
      soundManager.playJumpscare();
      this.time.delayedCall(520, () => {
        this.redFlash.setAlpha(0);
        this.tweens.add({
          targets: this.blackFade,
          alpha: 1,
          duration: 700,
          ease: "Power2",
          onComplete: () => this.enterGameplay()
        });
      });
    });
  }

  skipToGameplay() {
    if (this.transitioned) return;
    this.enterGameplay();
  }

  enterGameplay() {
    if (this.transitioned) return;
    this.transitioned = true;
    this.clearLineTimers();
    soundManager.stopAmbientHum();
    this.scene.start("Main");
  }
}
