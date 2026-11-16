import { LOCALES } from "../scripts/Locale.js";
import { soundManager } from "../scripts/SoundManager.js";
import { saveManager } from "../scripts/SaveManager.js";

export class GameOver extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  init(data) {
    this.endingType = data.endingType || "CONSUMED";
    this.finalCash = data.cash !== undefined ? data.cash : saveManager.state.cash;
    this.anomaliesEliminated = data.anomalies || 0;
    this.reachedHour = data.hour || 0;
    this.nightCompleted = data.night || saveManager.state.currentNight;
  }

  create() {
    this.lang = this.registry.get("lang") || "UZ";
    const t = LOCALES[this.lang];

    // Record unlocked ending in SaveManager (for the 5 primary endings)
    if (
      ["SURVIVED_WEEK", "CORRUPT_MILLIONAIRE", "ARRESTED", "FIRED", "CONSUMED"].includes(
        this.endingType
      )
    ) {
      saveManager.unlockEnding(this.endingType);
    }

    const endData = t.endings[this.endingType] || t.endings.CONSUMED;
    this.cameras.main.setBackgroundColor("#040605");

    if (this.endingType === "CONSUMED") {
      soundManager.playJumpscare();
      const jumpKey = Math.random() < 0.5 ? "jumpscare_01" : "jumpscare_02";
      this.face = this.add.image(640, 360, jumpKey).setDisplaySize(1280, 720);
      this.strobe = this.add.rectangle(640, 360, 1280, 720, 0xdc2626, 0.36);
      if (!saveManager.state.settings.reducedFlash) this.cameras.main.shake(1100, 0.045);

      this.tweens.add({
        targets: this.face,
        scaleX: { from: 1.0, to: 1.2 },
        scaleY: { from: 1.0, to: 1.2 },
        duration: 180,
        yoyo: true,
        repeat: 4
      });
    } else if (this.endingType === "ARRESTED") {
      soundManager.playSiren();
      this.add.image(640, 360, "ending_arrested").setDisplaySize(1280, 720);
      this.sirenOverlay = this.add.rectangle(640, 360, 1280, 720, 0x1e3a8a, 0.25);
      this.time.addEvent({
        delay: 300,
        loop: true,
        callback: () => {
          const isBlue = this.sirenOverlay.fillColor === 0x1e3a8a;
          this.sirenOverlay.setFillStyle(isBlue ? 0x991b1b : 0x1e3a8a, 0.25);
        }
      });
    } else if (
      this.endingType === "SURVIVED_WEEK" ||
      this.endingType === "CORRUPT_MILLIONAIRE" ||
      this.endingType === "SHIFT_CLEAR"
    ) {
      soundManager.playVictoryChime();
      this.add.image(640, 360, "ending_survived").setDisplaySize(1280, 720);
    } else {
      soundManager.playBeep(true);
      this.add.image(640, 360, "bg_store_far").setDisplaySize(1280, 720).setTint(0x3f1d1d);
    }

    this.add.rectangle(640, 360, 1280, 720, 0x030504, 0.76);

    const isPositive =
      this.endingType === "SURVIVED_WEEK" ||
      this.endingType === "CORRUPT_MILLIONAIRE" ||
      this.endingType === "SHIFT_CLEAR";

    this.add.text(640, 185, endData.title, {
      fontFamily: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
      fontSize: "44px",
      color: isPositive ? "#fde047" : "#f87171",
      letterSpacing: 3,
      align: "center",
      wordWrap: { width: 980 }
    }).setOrigin(0.5);

    this.add.text(640, 270, endData.subtitle, {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#f4f4f5",
      align: "center",
      wordWrap: { width: 880 }
    }).setOrigin(0.5);

    this.add.text(640, 340, endData.note, {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      color: "#a1a1aa",
      align: "center",
      wordWrap: { width: 820 }
    }).setOrigin(0.5);

    const unlockedTotal = saveManager.getUnlockedEndingsCount();
    const codexTotal = saveManager.getDiscoveredBestiaryCount();

    const daily = saveManager.ensureDaily();
    const ratingPoints = this.anomaliesEliminated * 15 + Math.floor(this.finalCash / 100) * 5 + (daily.completed ? 20 : 0) + (this.reachedHour >= 6 ? 20 : 0);
    const rating = Math.max(1, Math.min(5, Math.ceil(ratingPoints / 20)));
    this.add.text(640, 452, `${t.dailyChallengeLabel}: ${daily.completed ? `✓ ${t.dailyComplete}` : t.dailyProgress}   |   ${t.anomaliesLabel}: ${this.anomaliesEliminated}   |   ${saveManager.state.difficulty}${saveManager.state.ironNight ? ` / ${t.ironTag}` : ""}`, {
      fontFamily: "'Courier New', monospace", fontSize: "14px", fontStyle: "bold", color: daily.completed ? "#4ade80" : "#a1a1aa", align: "center"
    }).setOrigin(0.5);

    this.add.text(
      640,
      410,
      `${t.nightLabel} ${this.nightCompleted}   |   ${t.cashLabel}: $${this.finalCash}   |   ${t.endingsLabel}: ${unlockedTotal}/5   |   ${t.bestiaryLabel}: ${codexTotal}/15`,
      {
        fontFamily: "'Courier New', monospace",
        fontSize: "17px",
        fontStyle: "bold",
        color: "#4ade80"
      }
    ).setOrigin(0.5);

    this.add.text(640, 478, `${t.nightRating}: ${"★".repeat(rating)}${"☆".repeat(5 - rating)}`, {
      fontFamily: "'Courier New', monospace", fontSize: "16px", fontStyle: "bold", color: "#fde047", align: "center"
    }).setOrigin(0.5);

    this.brush = this.add.image(640, 505, "brush_highlight").setDisplaySize(290, 44);

    const primaryLabel = isPositive ? t.btnShop : t.btnRetry;
    const primaryAction = () => {
      soundManager.playBeep(false);
      if (isPositive) {
        this.scene.start("ShopScene");
      } else {
        this.scene.start("Main");
      }
    };

    const retryTxt = this.add.text(640, 505, primaryLabel, {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#050806",
      letterSpacing: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const menuTxt = this.add.text(640, 565, t.btnMenu, {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#f4f4f5",
      letterSpacing: 3
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryTxt.on("pointerover", () => {
      this.brush.setPosition(640, 505);
      retryTxt.setColor("#050806");
      menuTxt.setColor("#f4f4f5");
    });
    menuTxt.on("pointerover", () => {
      this.brush.setPosition(640, 565);
      menuTxt.setColor("#050806");
      retryTxt.setColor("#f4f4f5");
    });

    retryTxt.on("pointerdown", primaryAction);
    menuTxt.on("pointerdown", () => {
      soundManager.playBeep(false);
      this.scene.start("MainMenu");
    });

    this.input.keyboard.on("keydown-ENTER", primaryAction);
    this.input.keyboard.on("keydown-ESC", () => this.scene.start("MainMenu"));
  }
}
