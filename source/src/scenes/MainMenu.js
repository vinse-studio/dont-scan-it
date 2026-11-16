import { LOCALES } from "../scripts/Locale.js";
import { soundManager } from "../scripts/SoundManager.js";
import { saveManager } from "../scripts/SaveManager.js";
import { SettingsOverlay } from "../ui/SettingsOverlay.js";

export class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    this.lang = saveManager.state.settings.language || this.registry.get("lang") || "UZ";
    this.registry.set("lang", this.lang);
    soundManager.setVolume(saveManager.state.settings.volume);
    this.sound.volume = saveManager.state.settings.volume;
    const t = LOCALES[this.lang];
    this.selectedIndex = 0;
    this.activeModal = null;

    // =========================================================================
    // 1. RIGHT 65% OF SCREEN: 2.5D LIVE STORE PREVIEW WITH PARALLAX & DUST
    // =========================================================================
    this.bgFar = this.add.image(740, 360, "bg_store_far")
      .setDisplaySize(1180, 720)
      .setDepth(0);

    this.bgMid = this.add.image(760, 360, "bg_shelves_mid")
      .setDisplaySize(1180, 720)
      .setDepth(5);

    this.previewCustomer = this.add.image(830, 345, "cust_01_normal")
      .setDisplaySize(330, 330)
      .setTint(0x1e2923)
      .setAlpha(0.75)
      .setDepth(10);

    this.bgCounter = this.add.image(780, 390, "counter_desk")
      .setDisplaySize(1160, 680)
      .setDepth(15);

    this.dustParticles = [];
    for (let i = 0; i < 28; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(420, 1260),
        Phaser.Math.Between(40, 680),
        Phaser.Math.FloatBetween(1.0, 2.4),
        0xd1fae5,
        Phaser.Math.FloatBetween(0.08, 0.26)
      ).setDepth(18);
      dot.vx = Phaser.Math.FloatBetween(-0.18, 0.18);
      dot.vy = Phaser.Math.FloatBetween(-0.25, -0.06);
      this.dustParticles.push(dot);
    }

    this.input.on("pointermove", (pointer) => {
      const nx = (pointer.x - 640) / 640;
      const ny = (pointer.y - 360) / 360;
      this.bgFar.setPosition(740 - nx * 10, 360 - ny * 6);
      this.bgMid.setPosition(760 - nx * 22, 360 - ny * 12);
      this.previewCustomer.setPosition(830 - nx * 28, 345 - ny * 14);
      this.bgCounter.setPosition(780 - nx * 38, 390 - ny * 18);
    });

    this.time.addEvent({
      delay: 4200,
      loop: true,
      callback: () => {
        soundManager.playFlickerBuzz();
        this.bgFar.setTint(0x223328);
        this.previewCustomer.setTexture("cust_01_anomaly").setTint(0x7f1d1d).setAlpha(0.9);
        this.time.delayedCall(180, () => {
          if (this.bgFar && this.bgFar.active) {
            this.bgFar.clearTint();
            this.previewCustomer.setTexture("cust_01_normal").setTint(0x1e2923).setAlpha(0.75);
          }
        });
      }
    });

    // =========================================================================
    // 2. LEFT 35% OF SCREEN: DARK SMOKE / INK VIGNETTE OVERLAY
    // =========================================================================
    const smokeTexKey = "left_smoke_vignette";
    if (!this.textures.exists(smokeTexKey)) {
      const c = document.createElement("canvas");
      c.width = 720;
      c.height = 720;
      const ctx = c.getContext("2d");

      const grad = ctx.createLinearGradient(0, 0, 680, 0);
      grad.addColorStop(0.0, "rgba(4, 6, 5, 0.99)");
      grad.addColorStop(0.55, "rgba(5, 8, 7, 0.96)");
      grad.addColorStop(0.76, "rgba(6, 10, 8, 0.72)");
      grad.addColorStop(1.0, "rgba(6, 10, 8, 0.0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 720);

      for (let i = 0; i < 95; i++) {
        const sx = 360 + Math.sin(i * 1.7) * 75;
        const sy = (i / 95) * 720;
        const rad = 45 + (i % 5) * 18;
        const rGrad = ctx.createRadialGradient(sx, sy, 4, sx, sy, rad);
        rGrad.addColorStop(0, "rgba(5, 8, 6, 0.85)");
        rGrad.addColorStop(1, "rgba(5, 8, 6, 0)");
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      this.textures.addCanvas(smokeTexKey, c);
    }

    this.add.image(360, 360, smokeTexKey).setDepth(25);

    // =========================================================================
    // 3. BOX-FREE TYPOGRAPHY & BRUSH-STROKE MENU LIST (NO FOUNDER NAME)
    // =========================================================================
    this.titleShadow = this.add.text(84, 178, t.gameTitle, {
      fontFamily: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
      fontSize: "64px",
      fontStyle: "bold",
      color: "#000000",
      letterSpacing: 4
    }).setOrigin(0, 0.5).setDepth(30);

    this.titleMain = this.add.text(80, 174, t.gameTitle, {
      fontFamily: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
      fontSize: "64px",
      fontStyle: "bold",
      color: "#f4f4f5",
      letterSpacing: 4
    }).setOrigin(0, 0.5).setDepth(31);

    const nightLabel = saveManager.state.currentNight > 7
      ? t.endlessLabel
      : `${t.nightLabel} ${saveManager.state.currentNight} / 7`;
    const endingsCount = saveManager.getUnlockedEndingsCount();
    const codexCount = saveManager.getDiscoveredBestiaryCount();

    this.studioTag = this.add.text(
      82,
      224,
      `${t.studioSub}   •   ${nightLabel}   •   ${t.endingsLabel} ${endingsCount}/5   •   ${t.bestiaryLabel} ${codexCount}/18`,
      {
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "11px",
        color: "#9ca3af",
        letterSpacing: 2
      }
    ).setOrigin(0, 0.5).setDepth(31);

    this.brushSprite = this.add.image(175, 310, "brush_highlight")
      .setDisplaySize(255, 44)
      .setDepth(30);

    const daily = saveManager.ensureDaily();
    this.dailyChallengeTxt = this.add.text(82, 585, `${t.dailyChallengeLabel}: ${t.dailyChallenges[daily.index]}${daily.completed ? "  ✓" : ""}`, {
      fontFamily: "'Courier New', monospace", fontSize: "12px", fontStyle: "bold", color: daily.completed ? "#4ade80" : "#facc15", wordWrap: { width: 340 }
    }).setDepth(32);

    this.menuDefs = [
      { key: "play", getLabel: () => LOCALES[this.lang].menuPlay, action: () => this.startShift() },
      { key: "help", getLabel: () => LOCALES[this.lang].menuHelp, action: () => this.openModal("help") },
      { key: "settings", getLabel: () => LOCALES[this.lang].menuSettings, action: () => this.openModal("settings") },
      { key: "exit", getLabel: () => LOCALES[this.lang].menuExit, action: () => this.scene.start("IntroScene") }
    ];

    this.menuTexts = [];
    this.menuDefs.forEach((item, idx) => {
      const y = 310 + idx * 52;
      const hitZone = this.add.rectangle(185, y, 270, 44, 0xffffff, 0)
        .setDepth(32)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(84, y, item.getLabel(), {
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "21px",
        fontStyle: "bold",
        color: "#f4f4f5",
        letterSpacing: 3
      }).setOrigin(0, 0.5).setDepth(33);

      hitZone.on("pointerover", () => {
        if (this.activeModal) return;
        if (this.selectedIndex !== idx) {
          soundManager.playMenuHover();
          this.setSelectedIndex(idx);
        }
      });

      hitZone.on("pointerdown", () => {
        if (this.activeModal) return;
        soundManager.init();
        soundManager.playBeep(false);
        this.setSelectedIndex(idx);
        item.action();
      });

      this.menuTexts.push(txt);
    });

    this.setSelectedIndex(0);

    this.bottomRightAudioTxt = this.add.text(
      1230,
      682,
      `${soundManager.muted ? t.audioOff : t.audioOn}   |   ${t.escExit}`,
      {
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#d4d4d8",
        letterSpacing: 2
      }
    )
      .setOrigin(1, 0.5)
      .setDepth(33)
      .setInteractive({ useHandCursor: true });

    this.bottomRightAudioTxt.on("pointerdown", () => {
      soundManager.init();
      const muted = soundManager.toggleMute();
      const curT = LOCALES[this.lang];
      this.bottomRightAudioTxt.setText(`${muted ? curT.audioOff : curT.audioOn}   |   ${curT.escExit}`);
    });

    this.buildOverlayModals();

    this.input.keyboard.on("keydown-UP", () => {
      if (this.activeModal) return;
      soundManager.playMenuHover();
      this.setSelectedIndex((this.selectedIndex - 1 + this.menuDefs.length) % this.menuDefs.length);
    });
    this.input.keyboard.on("keydown-DOWN", () => {
      if (this.activeModal) return;
      soundManager.playMenuHover();
      this.setSelectedIndex((this.selectedIndex + 1) % this.menuDefs.length);
    });
    this.input.keyboard.on("keydown-ENTER", () => {
      if (this.activeModal) {
        this.closeModal();
        return;
      }
      soundManager.init();
      soundManager.playBeep(false);
      this.menuDefs[this.selectedIndex].action();
    });
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.activeModal) {
        this.closeModal();
      }
    });
  }

  update() {
    this.dustParticles.forEach((d) => {
      d.x += d.vx;
      d.y += d.vy;
      if (d.y < 20) d.y = 700;
      if (d.x < 400) d.x = 1250;
      if (d.x > 1260) d.x = 420;
    });
  }

  setSelectedIndex(idx) {
    this.selectedIndex = idx;
    const targetY = 310 + idx * 52;
    const targetTxt = this.menuTexts[idx];
    const brushW = Math.max(220, targetTxt.width + 52);

    this.brushSprite.setPosition(84 + brushW / 2 - 16, targetY);
    this.brushSprite.setDisplaySize(brushW, 42);

    this.menuTexts.forEach((tObj, i) => {
      tObj.setColor(i === idx ? "#050806" : "#f4f4f5");
    });
  }

  cycleLanguage() {
    const order = ["UZ", "EN", "RU"];
    const next = order[(order.indexOf(this.lang) + 1) % order.length];
    this.lang = next;
    this.registry.set("lang", next);
    saveManager.state.settings.language = next;
    saveManager.save();
    this.refreshMenuLanguage();
    this.refreshModalContent();
  }

  refreshMenuLanguage() {
    const t = LOCALES[this.lang];
    this.titleMain.setText(t.gameTitle);
    this.titleShadow.setText(t.gameTitle);
    this.studioTag.setText(`${t.studioSub}   •   ${saveManager.state.currentNight > 7 ? t.endlessLabel : `${t.nightLabel} ${saveManager.state.currentNight} / 7`}   •   ${t.endingsLabel} ${saveManager.getUnlockedEndingsCount()}/5   •   ${t.bestiaryLabel} ${saveManager.getDiscoveredBestiaryCount()}/18`);
    this.menuDefs.forEach((def, i) => this.menuTexts[i].setText(def.getLabel()));
    this.dailyChallengeTxt.setText(`${t.dailyChallengeLabel}: ${t.dailyChallenges[saveManager.ensureDaily().index]}${saveManager.state.daily.completed ? "  ✓" : ""}`);
    this.bottomRightAudioTxt.setText(`${soundManager.muted ? t.audioOff : t.audioOn}   |   ${t.escExit}`);
    this.setSelectedIndex(this.selectedIndex);
  }

  setVolumeFromPointer(pointer) {
    const value = Phaser.Math.Clamp((pointer.x - 390) / 500, 0, 1);
    saveManager.state.settings.volume = value;
    saveManager.save();
    soundManager.setVolume(value);
    this.sound.volume = value;
    this.refreshVolumeUi();
  }

  refreshVolumeUi() {
    const value = Phaser.Math.Clamp(Number(saveManager.state.settings.volume) || 0, 0, 1);
    const x = 390 + value * 500;
    this.modalVolumeFill.setSize(Math.max(2, value * 500), 6);
    this.modalVolumeThumb.setPosition(x, 438);
    const t = LOCALES[this.lang];
    this.modalVolumeTxt.setText(`${t.volumeLabel}: ${Math.round(value * 100)}% — ${t.volumeHint}`);
  }

  buildOverlayModals() {
    this.modalContainer = this.add.container(0, 0).setDepth(80).setVisible(false);
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x020403, 0.9).setInteractive();

    this.modalTitle = this.add.text(120, 100, "", {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "28px",
      fontStyle: "bold",
      color: "#f8fafc",
      letterSpacing: 3
    });

    this.modalBody = this.add.text(120, 165, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      color: "#d4d4d8",
      lineSpacing: 10,
      wordWrap: { width: 1020 }
    });

    this.resetCampaignBtn = this.add.text(120, 540, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f87171"
    })
      .setInteractive({ useHandCursor: true })
      .setVisible(false);

    this.resetCampaignBtn.on("pointerdown", () => {
      soundManager.playBeep(true);
      saveManager.resetCampaignKeepCodex();
      this.scene.restart();
    });

    this.modalBackTxt = this.add.text(120, 610, "[ESC] BACK", {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#4ade80",
      letterSpacing: 2
    }).setInteractive({ useHandCursor: true });

    this.modalSettingsToggle = this.add.text(120, 478, "", {
      fontFamily: "'Courier New', monospace", fontSize: "15px", fontStyle: "bold", color: "#38bdf8", wordWrap: { width: 850 }
    }).setInteractive({ useHandCursor: true }).setVisible(false);
    this.modalSettingsToggle.on("pointerdown", () => {
      const s = saveManager.state;
      if (this.activeModal === "settings") {
        const option = (this.settingsCursor || 0) % 5;
        if (option === 0) s.difficulty = s.difficulty === "EASY" ? "NORMAL" : s.difficulty === "NORMAL" ? "HARD" : "EASY";
        if (option === 1) s.ironNight = !s.ironNight;
        if (option === 2) s.settings.reducedFlash = !s.settings.reducedFlash;
        if (option === 3) s.settings.vibration = !s.settings.vibration;
        if (option === 4) s.settings.largeText = !s.settings.largeText;
        this.settingsCursor = option + 1;
        saveManager.save(); this.refreshModalContent();
      }
    });
    this.modalBackTxt.on("pointerdown", () => {
      soundManager.playBeep(false);
      this.closeModal();
    });
    dim.on("pointerdown", () => {
      this.closeModal();
    });

    this.modalContainer.add([dim, this.modalTitle, this.modalBody, this.resetCampaignBtn, this.modalBackTxt]);
    this.modalContainer.add(this.modalSettingsToggle);

    this.modalLanguageTxt = this.add.text(120, 360, "", {
      fontFamily: "'Courier New', monospace", fontSize: "17px", fontStyle: "bold", color: "#facc15"
    }).setInteractive({ useHandCursor: true });
    this.modalLanguageTxt.on("pointerdown", () => {
      if (this.activeModal === "settings") this.cycleLanguage();
    });
    this.modalVolumeTxt = this.add.text(120, 397, "", {
      fontFamily: "'Courier New', monospace", fontSize: "16px", fontStyle: "bold", color: "#38bdf8"
    });
    this.modalVolumeTrack = this.add.rectangle(640, 438, 500, 10, 0x334155).setStrokeStyle(1, 0x94a3b8);
    this.modalVolumeFill = this.add.rectangle(390, 438, 2, 6, 0x38bdf8).setOrigin(0, 0.5);
    this.modalVolumeThumb = this.add.circle(390, 438, 11, 0xf8fafc).setStrokeStyle(2, 0x38bdf8);
    this.modalVolumeHit = this.add.rectangle(640, 438, 520, 38, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    this.modalVolumeHit.on("pointerdown", (pointer) => {
      if (this.activeModal !== "settings") return;
      this.volumeDragging = true;
      this.setVolumeFromPointer(pointer);
    });
    this.input.on("pointermove", (pointer) => {
      if (this.volumeDragging && pointer.isDown && this.activeModal === "settings") this.setVolumeFromPointer(pointer);
    });
    this.input.on("pointerup", () => { this.volumeDragging = false; });
    this.modalContainer.add([this.modalLanguageTxt, this.modalVolumeTxt, this.modalVolumeTrack, this.modalVolumeFill, this.modalVolumeThumb, this.modalVolumeHit]);
    this.settingsOverlay = new SettingsOverlay(this);
    this.modalContainer.add(this.settingsOverlay.container);
  }

  openModal(kind) {
    this.activeModal = kind;
    this.refreshModalContent();
    this.modalContainer.setVisible(true);
  }

  refreshModalContent() {
    const t = LOCALES[this.lang];
    if (this.activeModal === "help") {
      this.settingsOverlay.setVisible(false);
      this.modalTitle.setText(t.helpTitle);
      this.modalBody.setText(t.helpBody.join("\n\n"));
      this.modalTitle.setVisible(true);
      this.modalBody.setVisible(true);
      this.modalBackTxt.setVisible(true);
      this.resetCampaignBtn.setVisible(false);
      this.modalSettingsToggle.setVisible(false);
      this.modalLanguageTxt.setVisible(false);
      this.modalVolumeTxt.setVisible(false);
      this.modalVolumeTrack.setVisible(false);
      this.modalVolumeFill.setVisible(false);
      this.modalVolumeThumb.setVisible(false);
      this.modalVolumeHit.setVisible(false);
    } else if (this.activeModal === "settings") {
      this.modalTitle.setVisible(false);
      this.modalBody.setVisible(false);
      this.modalBackTxt.setVisible(false);
      this.resetCampaignBtn.setVisible(false);
      this.modalSettingsToggle.setVisible(false);
      this.modalLanguageTxt.setVisible(false);
      this.modalVolumeTxt.setVisible(false);
      this.modalVolumeTrack.setVisible(false);
      this.modalVolumeFill.setVisible(false);
      this.modalVolumeThumb.setVisible(false);
      this.modalVolumeHit.setVisible(false);
      this.settingsOverlay.setVisible(true);
      this.settingsOverlay.refresh();
    }
    this.modalBackTxt.setText(t.escBack);
  }

  closeModal() {
    this.activeModal = null;
    this.settingsOverlay.setVisible(false);
    this.modalContainer.setVisible(false);
  }

  startShift() {
    soundManager.playShutterSlam();
    this.scene.start("StoryIntroScene");
  }
}
