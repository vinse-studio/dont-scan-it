import { LOCALES } from "../scripts/Locale.js";
import { soundManager } from "../scripts/SoundManager.js";
import { saveManager } from "../scripts/SaveManager.js";

export class ShopScene extends Phaser.Scene {
  constructor() {
    super("ShopScene");
  }

  create() {
    this.lang = this.registry.get("lang") || "UZ";
    const t = LOCALES[this.lang];

    // Morning store backdrop
    this.add.image(640, 360, "ending_survived").setDisplaySize(1280, 720).setTint(0x4b5563);
    this.add.rectangle(640, 360, 1280, 720, 0x040806, 0.86);

    // Header
    const nextNightLabel =
      saveManager.state.currentNight > 7
        ? "ENDLESS OVERTIME"
        : `NIGHT ${saveManager.state.currentNight} / 7`;

    this.add.text(80, 52, `${t.shopTitle}   •   NEXT: ${nextNightLabel}`, {
      fontFamily: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
      fontSize: "38px",
      color: "#f4f4f5",
      letterSpacing: 3
    });

    const daily = saveManager.ensureDaily();
    const choice = saveManager.state.campaignFlags.lastChoice;
    const story = choice === "trust" ? t.campaignStoryTrust : choice === "bribe" ? t.campaignStoryBribe : choice === "challenge" ? t.campaignStoryChallenge : t.campaignStory;
    const campaignText = `${story}\n\n${t.dailyChallengeLabel}: ${t.dailyChallenges[daily.index]} — ${daily.completed ? "✓ COMPLETE" : `${daily.progress}/${daily.index === 0 ? 3 : daily.index === 1 ? 2 : 1}`}`;
    this.add.text(80, 139, campaignText, { fontFamily: "'Courier New', monospace", fontSize: "13px", color: "#94a3b8", wordWrap: { width: 1000 }, lineSpacing: 4 });

    this.add.text(80, 102, t.shopSubtitle, {
      fontFamily: "'Courier New', monospace",
      fontSize: "15px",
      color: "#9ca3af"
    });

    this.cashText = this.add.text(1200, 62, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "24px",
      fontStyle: "bold",
      color: "#fde047"
    }).setOrigin(1, 0.5);

    this.feedbackText = this.add.text(640, 610, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#4ade80"
    }).setOrigin(0.5);

    this.buildShopGrid();
    this.refreshShopState();

    // Start Next Night Button (minimalist brush-stroke style)
    this.nextBrush = this.add.image(1020, 665, "brush_highlight").setDisplaySize(370, 48);
    this.nextBtnTxt = this.add.text(1020, 665, t.shopNextNightBtn, {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#050806",
      letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.nextBtnTxt.on("pointerdown", () => {
      soundManager.playShutterSlam();
      this.scene.start("Main");
    });

    // Main Menu link on bottom-left
    const menuBack = this.add.text(80, 665, t.escBack, {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#d4d4d8",
      letterSpacing: 2
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    menuBack.on("pointerdown", () => {
      soundManager.playBeep(false);
      this.scene.start("MainMenu");
    });

    this.input.keyboard.on("keydown-ENTER", () => {
      soundManager.playShutterSlam();
      this.scene.start("Main");
    });
  }

  buildShopGrid() {
    const t = LOCALES[this.lang];
    const items = t.shopItems;

    this.catalog = [
      { id: "scale", type: "upgrade", data: items.scale },
      { id: "uvBattery", type: "upgrade", data: items.uvBattery },
      { id: "bandolier", type: "upgrade", data: items.bandolier },
      { id: "cctv", type: "upgrade", data: items.cctv },
      { id: "bribeFund", type: "upgrade", data: items.bribeFund },
      { id: "shell", type: "consumable", data: items.shell },
      { id: "water", type: "consumable", data: items.water },
      { id: "taserCharge", type: "consumable", data: items.taserCharge },
      { id: "espresso", type: "consumable", data: items.espresso }
    ];

    this.cards = [];
    this.catalog.forEach((entry, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 250 + col * 390;
      const y = 210 + row * 140;

      const bg = this.add.rectangle(x, y, 365, 118, 0x0b150f, 0.92)
        .setStrokeStyle(1, 0x334155)
        .setInteractive({ useHandCursor: true });

      const title = this.add.text(x - 168, y - 42, entry.data.name, {
        fontFamily: "'Courier New', monospace",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#f8fafc",
        wordWrap: { width: 255 }
      });

      const priceBadge = this.add.text(x + 168, y - 42, `$${entry.data.cost}`, {
        fontFamily: "'Courier New', monospace",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#fde047"
      }).setOrigin(1, 0);

      const desc = this.add.text(x - 168, y - 8, entry.data.desc, {
        fontFamily: "'Courier New', monospace",
        fontSize: "12px",
        color: "#94a3b8",
        wordWrap: { width: 335 }
      });

      const status = this.add.text(x - 168, y + 34, "", {
        fontFamily: "'Courier New', monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#4ade80"
      });

      bg.on("pointerdown", () => {
        this.purchaseItem(entry);
      });

      this.cards.push({ entry, bg, title, priceBadge, desc, status });
    });
  }

  purchaseItem(entry) {
    const s = saveManager.state;
    const cost = entry.data.cost;

    if (entry.type === "upgrade" && s.upgrades[entry.id]) {
      soundManager.playBeep(false);
      return;
    }

    if (entry.id === "shell" && s.shells >= saveManager.getMaxShells()) {
      soundManager.playBeep(true);
      this.feedbackText.setText("SHOTGUN SHELLS FULL!").setColor("#facc15");
      return;
    }

    if (entry.id === "espresso" && s.espressoActive) {
      soundManager.playBeep(false);
      return;
    }

    if (s.cash < cost) {
      soundManager.playBeep(true);
      this.feedbackText.setText("NOT ENOUGH CASH!").setColor("#f87171");
      return;
    }

    s.cash -= cost;
    soundManager.playCoinChime();

    if (entry.type === "upgrade") {
      s.upgrades[entry.id] = true;
      if (entry.id === "bandolier") {
        s.shells = Math.min(3, s.shells + 1);
      }
    } else if (entry.id === "shell") {
      s.shells = Math.min(saveManager.getMaxShells(), s.shells + 1);
    } else if (entry.id === "water") {
      s.waterCharges += 2;
    } else if (entry.id === "taserCharge") {
      s.taserCharges += 2;
    } else if (entry.id === "espresso") {
      s.espressoActive = true;
    }

    saveManager.save();
    this.feedbackText.setText(`PURCHASED: ${entry.data.name}`).setColor("#4ade80");
    this.refreshShopState();
  }

  refreshShopState() {
    const s = saveManager.state;
    const maxShells = saveManager.getMaxShells();
    this.cashText.setText(
      `CASH: $${s.cash}  |  SHELLS: ${s.shells}/${maxShells}  |  WATER: ${s.waterCharges}  |  TASER: ${s.taserCharges}`
    );

    this.cards.forEach(({ entry, bg, status, priceBadge }) => {
      if (entry.type === "upgrade") {
        const owned = s.upgrades[entry.id];
        status.setText(owned ? "✓ OWNED & ACTIVE" : "[TAP TO BUY]");
        status.setColor(owned ? "#4ade80" : "#38bdf8");
        bg.setStrokeStyle(2, owned ? 0x22c55e : 0x334155);
        priceBadge.setVisible(!owned);
      } else if (entry.id === "shell") {
        status.setText(`INVENTORY: ${s.shells}/${maxShells}`);
      } else if (entry.id === "water") {
        status.setText(`CHARGES: ${s.waterCharges}`);
      } else if (entry.id === "taserCharge") {
        status.setText(`CHARGES: ${s.taserCharges}`);
      } else if (entry.id === "espresso") {
        status.setText(s.espressoActive ? "✓ ACTIVE FOR NEXT NIGHT" : "[TAP TO BUY]");
      }
    });
  }
}
