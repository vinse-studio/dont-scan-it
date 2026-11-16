import { LOCALES } from "../scripts/Locale.js";
import { CUSTOMER_CLASSES, BESTIARY_CODEX } from "../scripts/CustomerData.js";
import { CounterController } from "../scripts/CounterController.js";
import { soundManager } from "../scripts/SoundManager.js";
import { saveManager } from "../scripts/SaveManager.js";
import { CheckoutOverlay } from "../ui/CheckoutOverlay.js";

export class Main extends Phaser.Scene {
  constructor() {
    super("Main");
  }

  create() {
    this.lang = this.registry.get("lang") || "UZ";
    this.controller = new CounterController();
    saveManager.ensureDaily();
    this.controller.shotgunShots = 0;
    this.equippedTool = null; // null | "shotgun" | "sprayer" | "taser" | "uv"
    this.uvActive = false;
    this.shutterClosed = false;
    this.transitioningCustomer = false;
    this.waitingForCustomer = false;
    this.arrivalDelayRemaining = 0;
    this.checkoutOpen = false;
    this.checkoutSessionId = 0;
    this.encounterToken = 0;
    this.rulebookOpen = false;
    this.notebookTab = "rules"; // "rules" | "codex"
    this.paused = false;
    this.arcadeUsedThisShift = false;

    // Dynamic Event States
    this.cctvMode = false;
    this.rearIntruderActive = false;
    this.rearIntruderTimer = 0;
    this.phoneRinging = false;
    this.phoneRingElapsed = 0;
    this.phonePanel = null;
    this.activePhoneCall = null;
    this.pausedBeforePhone = false;
    this.patienceRemaining = 0;
    this.patienceTotal = 0;
    this.patienceWarned = false;
    this.blackoutActive = false;
    this.blackoutStep = 1;
    this.blackoutTimer = 0;
    this.inspectedItemObj = null;

    soundManager.startAmbientHum();

    // =========================================================================
    // DEPTH 0..15: 2.5D STORE INTERIOR & CUSTOMER LAYER
    // =========================================================================
    this.bgFar = this.add.image(640, 320, "bg_store_far")
      .setDisplaySize(1320, 680)
      .setDepth(0);

    this.bgMid = this.add.image(640, 320, "bg_shelves_mid")
      .setDisplaySize(1320, 680)
      .setDepth(5);

    this.customerShadow = this.add.image(565, 315, "cust_01_normal")
      .setDisplaySize(370, 370)
      .setTint(0x000000)
      .setAlpha(0)
      .setDepth(10);

    this.customerSprite = this.add.image(545, 325, "cust_01_normal")
      .setDisplaySize(345, 345)
      .setAlpha(0)
      .setDepth(15)
      .setInteractive({ useHandCursor: true });

    this.customerSprite.on("pointerdown", () => {
      this.handleCustomerTap();
    });

    this.eyeStateDot = this.add.circle(545, 150, 5, 0x4ade80, 0.85).setDepth(16).setVisible(false);

    this.customerUvMark = this.add.text(545, 290, "⛧ 666 ⛧\nVEINS", {
      fontFamily: "'Courier New', monospace",
      fontSize: "24px",
      fontStyle: "bold",
      align: "center",
      color: "#e879f9"
    }).setOrigin(0.5).setDepth(17).setAlpha(0);

    // Speech Bubble + Branching 3-Question / Bribe Container above customer
    this.speechText = this.add.text(545, 92, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#f4f4f5",
      backgroundColor: "#050907e6",
      padding: { x: 12, y: 7 },
      align: "center",
      wordWrap: { width: 470 }
    }).setOrigin(0.5).setDepth(18);

    this.createPatienceMeter();
    this.patienceLabel.setVisible(false);
    this.patienceBarBg.setVisible(false);
    this.patienceBarFill.setVisible(false);
    this.buildBranchingDialogueAndBribeUi();

    // =========================================================================
    // DEPTH 20: SECURITY SHUTTER
    // =========================================================================
    this.shutterSprite = this.add.image(640, -360, "shutter")
      .setDisplaySize(1280, 540)
      .setDepth(20);

    // =========================================================================
    // DEPTH 30: DIEGETIC COUNTER DESK, REGISTER CRT, CCTV TAB & DESK PHONE
    // =========================================================================
    this.buildDiegeticCounterLayer();

    // =========================================================================
    // DEPTH 40: CONVEYOR ITEMS + INSPECT / STASH ACTION OVERLAY
    // =========================================================================
    this.itemsContainer = this.add.container(0, 0).setDepth(40);
    this.itemSprites = [];
    this.buildItemActionPopup();

    // =========================================================================
    // DEPTH 50: DIEGETIC DESK PROPS
    // =========================================================================
    this.buildDiegeticDeskProps();

    // =========================================================================
    // DEPTH 60: FIRST-PERSON EQUIPPED HAND
    // =========================================================================
    this.buildFirstPersonHandLayer();

    // =========================================================================
    // DEPTH 70+: LIGHTING, FUSE BOX MINI-GAME, 2-TAB NOTEBOOK & MINIMALIST HUD
    // =========================================================================
    this.buildAtmosphereAndMinimalHud();
    this.buildFuseBoxMiniGame();
    this.buildHandwrittenRulebookAndCodexOverlay();
    this.buildCaseFileOverlay();
    this.buildPauseOverlay();
    this.checkoutOverlay = new CheckoutOverlay(this);

    this.setupParallaxAndTimers();
    this._visibilityHandler = () => { if (document.hidden && this.scene.isActive() && !this.caseFileOpen && !this.checkoutOpen) this.togglePauseMenu(true); };
    document.addEventListener("visibilitychange", this._visibilityHandler);
    this.events.once("shutdown", () => {
      document.removeEventListener("visibilitychange", this._visibilityHandler);
      this.checkoutSessionId++;
      this.checkoutOpen = false;
      this.customerIdleTween?.stop();
      this.customerWalkTween?.stop();
      this.tweens.killAll();
    });
    this.scheduleCustomerArrival();
    if (!saveManager.state.tutorialSeen) {
      this.time.delayedCall(900, () => this.showToast(LOCALES[this.lang].tutorialShort, "#38bdf8"));
      saveManager.state.tutorialSeen = true; saveManager.save();
    }
  }

  createPatienceMeter() {
    this.patienceLabel = this.add.text(545, 122, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#bbf7d0",
      backgroundColor: "#050806cc",
      padding: { x: 5, y: 2 }
    }).setOrigin(0.5).setDepth(18);
    this.patienceBarBg = this.add.rectangle(545, 143, 230, 10, 0x18181b)
      .setStrokeStyle(1, 0x71717a)
      .setDepth(18);
    this.patienceBarFill = this.add.rectangle(430, 143, 228, 7, 0x4ade80)
      .setOrigin(0, 0.5)
      .setDepth(19);
    this.eyeStateDot.setPosition(675, 143);
  }

  updatePatienceMeter() {
    if (!this.patienceLabel || !this.patienceBarFill || !this.patienceTotal) return;
    const ratio = Phaser.Math.Clamp(this.patienceRemaining / this.patienceTotal, 0, 1);
    this.patienceLabel.setText(`${LOCALES[this.lang].patienceLabel}: ${Math.ceil(this.patienceRemaining)}s`);
    this.patienceBarFill.scaleX = ratio;
    this.patienceBarFill.setFillStyle(ratio < 0.25 ? 0xef4444 : ratio < 0.5 ? 0xfacc15 : 0x4ade80);
  }

  buildBranchingDialogueAndBribeUi() {
    // 3-Option Branching Interrogation Menu (appears when tapping customer with empty hands)
    this.questionMenu = this.add.container(545, 195).setDepth(19).setVisible(false);
    this.questionButtons = [];

    for (let i = 0; i < 3; i++) {
      const y = (i - 1) * 32;
      const btnBg = this.add.rectangle(0, y, 420, 28, 0x09140e, 0.95)
        .setStrokeStyle(1, 0x4ade80)
        .setInteractive({ useHandCursor: true });
      const btnTxt = this.add.text(0, y, "", {
        fontFamily: "'Courier New', monospace",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#dcfce7"
      }).setOrigin(0.5);

      btnBg.on("pointerover", () => btnBg.setFillStyle(0x14532d, 0.98));
      btnBg.on("pointerout", () => btnBg.setFillStyle(0x09140e, 0.95));
      btnBg.on("pointerdown", () => {
        this.askBranchingQuestion(i);
      });

      this.questionMenu.add([btnBg, btnTxt]);
      this.questionButtons.push(btnTxt);
    }

    // Bribe Offer Choice Bar ([ACCEPT BRIBE +$XX] / [REFUSE])
    this.bribeBar = this.add.container(545, 146).setDepth(19).setVisible(false);
    const accBg = this.add.rectangle(-95, 0, 175, 28, 0x14532d, 0.96)
      .setStrokeStyle(1, 0xfde047)
      .setInteractive({ useHandCursor: true });
    this.bribeAcceptTxt = this.add.text(-95, 0, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fde047"
    }).setOrigin(0.5);

    const refBg = this.add.rectangle(95, 0, 140, 28, 0x450a0a, 0.96)
      .setStrokeStyle(1, 0xf87171)
      .setInteractive({ useHandCursor: true });
    this.bribeRefuseTxt = this.add.text(95, 0, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      fontStyle: "bold",
      color: "#fca5a5"
    }).setOrigin(0.5);

    accBg.on("pointerdown", () => this.resolveBribeOffer(true));
    refBg.on("pointerdown", () => this.resolveBribeOffer(false));

    this.bribeBar.add([accBg, this.bribeAcceptTxt, refBg, this.bribeRefuseTxt]);
  }

  buildDiegeticCounterLayer() {
    const g = this.add.graphics().setDepth(29);
    g.fillStyle(0x141a16, 1);
    g.fillRect(0, 455, 1280, 265);

    this.counterDeskImg = this.add.image(640, 385, "counter_desk")
      .setDisplaySize(1300, 680)
      .setDepth(30);

    this.conveyorRollers = [];
    for (let rx = 55; rx < 455; rx += 38) {
      const roller = this.add.rectangle(rx, 540, 4, 88, 0x29352d, 0.75).setDepth(31);
      this.conveyorRollers.push(roller);
    }

    // Glowing Green CRT Screen on Cash Register
    this.crtScreenGlow = this.add.rectangle(1088, 398, 215, 96, 0x052e16, 0.94)
      .setStrokeStyle(2, 0x22c55e, 0.85)
      .setDepth(32);

    this.crtMainText = this.add.text(986, 356, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#4ade80",
      wordWrap: { width: 198 },
      lineSpacing: 3
    }).setDepth(33);

    this.crtBossText = this.add.text(986, 412, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "10px",
      color: "#a3e635",
      wordWrap: { width: 198 }
    }).setDepth(33);

    // Backroom CCTV Feed Eyes Graphic inside CRT when [CAM] mode is active
    this.cctvEyesTxt = this.add.text(1088, 395, "👁   👁\n[REAR DOOR INTRUDER!]", {
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#ef4444",
      align: "center"
    }).setOrigin(0.5).setDepth(34).setVisible(false);

    // [CAM] / [POS] Toggle Tab on CRT (unlocked via Backroom CCTV upgrade or Night 2+)
    this.camToggleBtn = this.add.text(1188, 354, "[CAM]", {
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#38bdf8",
      backgroundColor: "#09151e",
      padding: { x: 4, y: 2 }
    })
      .setOrigin(1, 0)
      .setDepth(35)
      .setInteractive({ useHandCursor: true });

    this.camToggleBtn.on("pointerdown", () => {
      soundManager.playBeep(false);
      this.cctvMode = !this.cctvMode;
      this.refreshHudAndMonitor(true);
    });

    // Interactive [+$30 SHELL] badge on CRT
    this.reloadBadge = this.add.text(1088, 458, "[+$30 SHELL]", {
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#fde047",
      backgroundColor: "#14532d",
      padding: { x: 7, y: 2 }
    })
      .setOrigin(0.5)
      .setDepth(35)
      .setInteractive({ useHandCursor: true });

    this.reloadBadge.on("pointerdown", () => {
      this.buyShotgunShell();
    });

    this.arcadeBadge = this.add.text(1088, 482, `[${LOCALES[this.lang].arcade.button}]`, {
      fontFamily: "'Courier New', monospace", fontSize: "11px", fontStyle: "bold",
      color: "#4ade80", backgroundColor: "#052e16", padding: { x: 8, y: 3 }
    }).setOrigin(0.5).setDepth(36).setInteractive({ useHandCursor: true });
    this.arcadeBadge.on("pointerdown", () => this.openArcade());

    // Physical RED PANIC BUTTON on Register
    this.panicButtonProp = this.add.circle(942, 430, 22, 0xb91c1c)
      .setStrokeStyle(3, 0xfca5a5)
      .setDepth(35)
      .setInteractive({ useHandCursor: true });

    this.panicButtonLabel = this.add.text(942, 462, "PANIC", {
      fontFamily: "'Courier New', monospace",
      fontSize: "10px",
      fontStyle: "bold",
      color: "#fca5a5"
    }).setOrigin(0.5).setDepth(35);

    this.panicButtonProp.on("pointerdown", () => {
      this.triggerPanicShutter();
    });

    // Diegetic Retro Desk Phone (center-right counter edge x=835, y=495)
    this.phonePropBg = this.add.rectangle(835, 495, 86, 48, 0x18181b)
      .setStrokeStyle(2, 0x52525b)
      .setDepth(35)
      .setInteractive({ useHandCursor: true });

    this.phonePropTxt = this.add.text(835, 495, "☎ PHONE", {
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#a1a1aa"
    }).setOrigin(0.5).setDepth(36);

    this.phonePropBg.on("pointerdown", () => {
      this.answerDeskPhone();
    });

    // Under-Desk Stash Drawer indicator (bottom-left under conveyor x=215, y=588)
    this.stashBadge = this.add.text(215, 588, "📦 STASHED: 0", {
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#a78bfa",
      backgroundColor: "#090d16cc",
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5).setDepth(35);
  }

  buildItemActionPopup() {
    // Floating diegetic action choices above an inspected conveyor item: [SCAN $15] | [STASH]
    this.itemActionPopup = this.add.container(360, 445).setDepth(45).setVisible(false);

    const scanBg = this.add.rectangle(-68, 0, 120, 26, 0x14532d, 0.96)
      .setStrokeStyle(1, 0x4ade80)
      .setInteractive({ useHandCursor: true });
    this.itemScanBtnTxt = this.add.text(-68, 0, "[SCAN $15]", {
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#dcfce7"
    }).setOrigin(0.5);

    const stashBg = this.add.rectangle(72, 0, 145, 26, 0x3b0764, 0.96)
      .setStrokeStyle(1, 0xc084fc)
      .setInteractive({ useHandCursor: true });
    this.itemStashBtnTxt = this.add.text(72, 0, "[STASH]", {
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      fontStyle: "bold",
      color: "#f3e8ff"
    }).setOrigin(0.5);

    scanBg.on("pointerdown", () => {
      if (this.inspectedItemObj) {
        this.performBarcodeScan(this.inspectedItemObj);
      }
    });
    stashBg.on("pointerdown", () => {
      if (this.inspectedItemObj) {
        this.stashItemUnderDesk(this.inspectedItemObj);
      }
    });

    this.itemActionPopup.add([scanBg, this.itemScanBtnTxt, stashBg, this.itemStashBtnTxt]);
  }

  buildDiegeticDeskProps() {
    this.deskProps = {};

    const propConfigs = [
      {
        key: "notebook",
        tex: "prop_notebook",
        x: 115,
        y: 642,
        w: 125,
        h: 125,
        tag: "NOTEBOOK / CODEX",
        onTap: () => this.toggleRulebook()
      },
      {
        key: "scanner",
        tex: "prop_scanner",
        x: 270,
        y: 635,
        w: 118,
        h: 118,
        tag: "SCAN ITEM",
        onTap: () => this.performBarcodeScan()
      },
      {
        key: "uv",
        tex: "prop_uv",
        x: 425,
        y: 642,
        w: 118,
        h: 118,
        tag: "UV LIGHT",
        onTap: () => this.equipOrToggleTool("uv")
      },
      {
        key: "sprayer",
        tex: "prop_sprayer",
        x: 585,
        y: 636,
        w: 122,
        h: 122,
        tag: "HOLY WATER",
        onTap: () => this.equipOrToggleTool("sprayer")
      },
      {
        key: "taser",
        tex: "prop_taser",
        x: 745,
        y: 642,
        w: 122,
        h: 122,
        tag: "TASER",
        onTap: () => this.equipOrToggleTool("taser")
      },
      {
        key: "shotgun",
        tex: "prop_shotgun",
        x: 935,
        y: 642,
        w: 165,
        h: 135,
        tag: "SHOTGUN",
        onTap: () => this.equipOrToggleTool("shotgun")
      }
    ];

    propConfigs.forEach((cfg) => {
      const spr = this.add.image(cfg.x, cfg.y, cfg.tex)
        .setDisplaySize(cfg.w, cfg.h)
        .setDepth(50)
        .setInteractive({ useHandCursor: true });

      const hoverLabel = this.add.text(cfg.x, cfg.y - 62, cfg.tag, {
        fontFamily: "'Courier New', monospace",
        fontSize: "11px",
        fontStyle: "bold",
        color: "#e2e8f0",
        backgroundColor: "#050806cc",
        padding: { x: 6, y: 2 }
      }).setOrigin(0.5).setDepth(52).setAlpha(0.85);

      spr.on("pointerover", () => {
        spr.setY(cfg.y - 6);
        hoverLabel.setAlpha(1).setColor("#4ade80");
      });
      spr.on("pointerout", () => {
        spr.setY(cfg.y);
        hoverLabel.setAlpha(0.85).setColor("#e2e8f0");
      });
      spr.on("pointerdown", () => {
        if (this.paused || this.rulebookOpen || this.blackoutActive) return;
        soundManager.init();
        cfg.onTap();
      });

      this.deskProps[cfg.key] = { spr, hoverLabel, cfg };
    });
  }

  buildFirstPersonHandLayer() {
    this.fpHandSprite = this.add.image(1110, 565, "hand_shotgun")
      .setDisplaySize(310, 310)
      .setDepth(60)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    this.fpHandSprite.on("pointerdown", () => {
      soundManager.playMenuHover();
      this.equipOrToggleTool(null);
    });

    this.holsterText = this.add.text(1110, 700, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "11px",
      color: "#a1a1aa",
      backgroundColor: "#050806cc",
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5).setDepth(61).setVisible(false);

    this.tweens.add({
      targets: this.fpHandSprite,
      y: "+=7",
      x: "-=4",
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  buildAtmosphereAndMinimalHud() {
    this.darknessOverlay = this.add.rectangle(640, 360, 1280, 720, 0x010302, 0).setDepth(70);

    this.uvCone = this.add.circle(545, 325, 150, 0x9333ea, 0.28)
      .setStrokeStyle(2, 0xd8b4fe, 0.75)
      .setDepth(71)
      .setVisible(false);

    const scan = this.add.graphics().setDepth(72);
    scan.fillStyle(0x000000, 0.18);
    for (let y = 0; y < 720; y += 4) {
      scan.fillRect(0, y, 1280, 2);
    }

    // Minimalist Top-Left HUD (Night, Clock, Cash, Threat%)
    this.topLeftHudText = this.add.text(28, 22, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#e4e4e7"
    }).setDepth(75);

    // Top-Right Pause Icon (||)
    this.topRightPauseBtn = this.add.text(1242, 22, "||", {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#e4e4e7",
      padding: { x: 8, y: 4 }
    })
      .setOrigin(1, 0)
      .setDepth(75)
      .setInteractive({ useHandCursor: true });

    this.topRightPauseBtn.on("pointerdown", () => {
      soundManager.playBeep(false);
      this.togglePauseMenu();
    });

    this.toastBanner = this.add.text(545, 412, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#fef08a",
      backgroundColor: "#050806eb",
      padding: { x: 12, y: 5 },
      align: "center",
      wordWrap: { width: 760 }
    }).setOrigin(0.5).setDepth(76).setVisible(false);
  }

  buildFuseBoxMiniGame() {
    // Under-Counter Breaker Box Mini-Game during Power Outage Blackout (Depth 80)
    this.fuseBoxContainer = this.add.container(640, 360).setDepth(80).setVisible(false);

    const panel = this.add.rectangle(0, 0, 560, 270, 0x0f172a, 0.96)
      .setStrokeStyle(3, 0xfacc15);

    this.fuseTitleTxt = this.add.text(0, -100, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#fde047",
      align: "center",
      wordWrap: { width: 520 }
    }).setOrigin(0.5);

    this.fuseSwitches = [];
    for (let i = 0; i < 4; i++) {
      const sx = -180 + i * 120;
      const swBg = this.add.rectangle(sx, 10, 88, 120, 0x1e293b)
        .setStrokeStyle(2, 0x64748b)
        .setInteractive({ useHandCursor: true });

      const swNum = this.add.text(sx, -20, `#${i + 1}`, {
        fontFamily: "'Courier New', monospace",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#f8fafc"
      }).setOrigin(0.5);

      const swState = this.add.text(sx, 25, "OFF", {
        fontFamily: "'Courier New', monospace",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#f87171"
      }).setOrigin(0.5);

      swBg.on("pointerdown", () => {
        this.flipFuseSwitch(i);
      });

      this.fuseBoxContainer.add([swBg, swNum, swState]);
      this.fuseSwitches.push({ swBg, swNum, swState, targetOrder: i + 1, flipped: false });
    }

    this.fuseBoxContainer.add([panel, this.fuseTitleTxt]);
    this.fuseBoxContainer.sendToBack(panel);
  }

  buildHandwrittenRulebookAndCodexOverlay() {
    this.rulebookOverlay = this.add.container(0, 0).setDepth(85).setVisible(false);
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.82).setInteractive();

    const paper = this.add.rectangle(640, 360, 860, 520, 0xd6d3c4)
      .setStrokeStyle(3, 0x44403c);

    // Tab 1: Shift Rules | Tab 2: Anomaly Bestiary Codex
    this.tabRulesBtn = this.add.text(430, 128, "[1] SHIFT RULES", {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#050806",
      backgroundColor: "#a8a29e",
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tabCodexBtn = this.add.text(790, 128, "[2] ANOMALY BESTIARY", {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#44403c",
      backgroundColor: "#e7e5e4",
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tabRulesBtn.on("pointerdown", () => {
      soundManager.playMenuHover();
      this.notebookTab = "rules";
      this.refreshNotebookContent();
    });

    this.tabCodexBtn.on("pointerdown", () => {
      soundManager.playMenuHover();
      this.notebookTab = "codex";
      this.refreshNotebookContent();
    });

    this.rulebookTitle = this.add.text(640, 174, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#1c1917"
    }).setOrigin(0.5);

    this.rulebookBody = this.add.text(245, 206, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "14px",
      fontStyle: "bold",
      color: "#292524",
      lineSpacing: 8,
      wordWrap: { width: 790 }
    });

    const closeHint = this.add.text(640, 592, "[TAP OUTSIDE OR PRESS ESC TO CLOSE]", {
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      fontStyle: "bold",
      color: "#7f1d1d"
    }).setOrigin(0.5);

    dim.on("pointerdown", () => this.toggleRulebook(false));

    this.rulebookOverlay.add([
      dim,
      paper,
      this.tabRulesBtn,
      this.tabCodexBtn,
      this.rulebookTitle,
      this.rulebookBody,
      closeHint
    ]);
  }

  buildCaseFileOverlay() {
    this.caseOverlay = this.add.container(0, 0).setDepth(95).setVisible(false);
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x020403, 0.88).setInteractive();
    const paper = this.add.rectangle(640, 360, 940, 500, 0x111a15).setStrokeStyle(3, 0x4ade80);
    this.caseTitle = this.add.text(640, 145, LOCALES[this.lang].caseTitle, { fontFamily: "'Courier New', monospace", fontSize: "28px", fontStyle: "bold", color: "#4ade80" }).setOrigin(0.5);
    this.caseEvidenceText = this.add.text(210, 195, "", { fontFamily: "'Courier New', monospace", fontSize: "17px", color: "#e5e7eb", lineSpacing: 8, wordWrap: { width: 850 } });
    this.caseDecisionText = this.add.text(640, 442, "", { fontFamily: "'Courier New', monospace", fontSize: "14px", color: "#facc15", align: "center", wordWrap: { width: 850 } }).setOrigin(0.5);
    this.caseDecisionLabels = [];
    const choices = [
      { key: "serve", x: 365, label: LOCALES[this.lang].caseServe, color: 0x14532d },
      { key: "detain", x: 640, label: LOCALES[this.lang].caseDetain, color: 0x7f1d1d },
      { key: "report", x: 915, label: LOCALES[this.lang].caseReport, color: 0x1e3a8a }
    ];
    choices.forEach((c) => {
      const bg = this.add.rectangle(c.x, 510, 235, 54, c.color).setStrokeStyle(2, 0xe2e8f0).setInteractive({ useHandCursor: true });
      const label = this.add.text(c.x, 510, c.label, { fontFamily: "'Courier New', monospace", fontSize: "15px", fontStyle: "bold", color: "#fff" }).setOrigin(0.5);
      bg.on("pointerdown", () => this.resolveCaseDecision(c.key));
      this.caseOverlay.add([bg, label]);
      this.caseDecisionLabels.push({ label, key: c.key });
    });
    const close = this.add.text(640, 585, "[ESC / OUTSIDE TO CLOSE]", { fontFamily: "'Courier New', monospace", fontSize: "13px", color: "#a1a1aa" }).setOrigin(0.5);
    dim.on("pointerdown", () => this.closeCaseFile());
    this.caseOverlay.add([dim, paper, this.caseTitle, this.caseEvidenceText, this.caseDecisionText, close]);
    this.caseOverlay.sendToBack(paper);
    this.caseOverlay.sendToBack(dim);
    const badge = this.add.text(1090, 625, LOCALES[this.lang].caseBadge, { fontFamily: "'Courier New', monospace", fontSize: "12px", fontStyle: "bold", color: "#bbf7d0", backgroundColor: "#052e16", padding: { x: 8, y: 5 } }).setOrigin(0.5).setDepth(77).setInteractive({ useHandCursor: true });
    badge.on("pointerdown", () => this.openCaseFile());
    this.caseBadge = badge;
  }

  openCaseFile() {
    if (this.paused || this.transitioningCustomer || this.blackoutActive) return;
    const enc = this.controller.currentEncounter;
    if (!enc) return;
    const t = LOCALES[this.lang];
    this.caseTitle.setText(t.caseTitle);
    this.caseBadge.setText(t.caseBadge);
    this.caseDecisionLabels.forEach(({ label, key }) => label.setText(key === "serve" ? t.caseServe : key === "detain" ? t.caseDetain : t.caseReport));
    this.caseEvidenceText.setText(this.formatCaseEvidence());
    this.caseDecisionText.setText(LOCALES[this.lang].caseDecisionPrompt);
    this.pausedBeforeCase = this.paused; this.setGameplayPaused(true);
    this.caseOverlay.setVisible(true);
    this.caseFileOpen = true;
  }

  closeCaseFile() { this.caseOverlay.setVisible(false); this.caseFileOpen = false; this.setGameplayPaused(this.pausedBeforeCase || false); }

  formatCaseEvidence() {
    const t = LOCALES[this.lang];
    const lines = (this.evidenceFound || []).map((id) => `• ${t.evidenceNames[id] || id}`);
    const archive = (saveManager.state.unlockedEvidence || []).map((id) => t.evidenceNames[id] || id);
    const anomalyKeys = ["anomaly_item", "expired", "weight", "mirror", "echo", "shadow", "behavior", "uv", "blink"];
    const humanKeys = ["normal_item", "normal_response"];
    const anomalyProof = anomalyKeys.filter((key) => this.evidenceFound?.includes(key)).length;
    const humanProof = humanKeys.filter((key) => this.evidenceFound?.includes(key)).length;
    const count = lines.length;
    const level = Math.max(anomalyProof, humanProof) >= 2 ? t.confidenceHigh : count > 0 ? t.confidenceMedium : t.confidenceLow;
    return `${t.caseEvidenceHeader} (${count}) — ${level}\n\n${lines.length ? lines.join("\n") : t.caseNoEvidence}\n\n${t.savedEvidenceHeader}: ${archive.join(" • ") || "—"}\n\n${t.caseCustomer}: ${this.controller.currentEncounter?.archetype.names[this.lang] || "—"}`;
  }

  recordCaseEvidence(id) {
    if (!this.evidenceFound) this.evidenceFound = [];
    if (this.evidenceFound.includes(id)) return;
    this.evidenceFound.push(id);
    saveManager.recordEvidence(id);
    if (this.caseOverlay?.visible) this.caseEvidenceText.setText(this.formatCaseEvidence());
    const enc = this.controller.currentEncounter;
    if (enc && enc.customerClass !== CUSTOMER_CLASSES.HUMAN) {
      const match = (id === "mirror" && enc.tells.mirrorLag) || (id === "echo" && enc.tells.repeatedSpeech) || (id === "shadow" && enc.tells.missingShadow) || (id === "anomaly_item" && enc.items.some((i) => i.isAnomItem));
      if (match) saveManager.unlockAchievement("sharp_eye");
    }
  }

  resolveCaseDecision(choice) {
    const enc = this.controller.currentEncounter;
    if (!enc) return;
    const isAnomaly = enc.customerClass !== CUSTOMER_CLASSES.HUMAN;
    const clues = new Set(this.evidenceFound || []);
    const anomalyIds = ["anomaly_item", "expired", "weight", "mirror", "echo", "shadow", "behavior", "uv", "blink"];
    const humanIds = ["normal_item", "normal_response"];
    const anomalyEvidence = anomalyIds.filter((id) => clues.has(id)).length;
    const humanEvidence = humanIds.filter((id) => clues.has(id)).length;
    const confidence = Math.max(anomalyEvidence, humanEvidence) >= 2 ? "HIGH" : anomalyEvidence === 1 || humanEvidence > 0 ? "MEDIUM" : "LOW";
    const checkoutDue = choice === "serve" && !isAnomaly && humanEvidence > 0 && !enc.paymentBlocked && enc.items.every((item) => !item.isAnomItem && !item.isMutated)
      ? (enc.paymentTotal || 0)
      : 0;
    this.closeCaseFile();
    saveManager.state.campaignFlags.lastChoice = choice;
    // A case decision closes out the whole visit, so do not silently leave orphaned products.
    this.itemsContainer.removeAll(true);
    this.itemSprites = [];
    enc.items.forEach((item) => { item.resolved = true; });
    enc.items = [];
    this.inspectedItemObj = null;
    this.itemActionPopup.setVisible(false);

    if (choice === "serve") {
      if (!isAnomaly && humanEvidence > 0) {
        saveManager.state.cash += 10; saveManager.state.lifetime.cleanScans++;
        this.showToast(LOCALES[this.lang].caseCorrectHuman, "#4ade80");
      } else {
        this.controller.paranormalThreat = Math.min(100, this.controller.paranormalThreat + 12);
        saveManager.state.lifetime.mistakes++;
        this.showToast(LOCALES[this.lang].caseReleasedAnomaly, "#f87171");
      }
      saveManager.save();
      if (checkoutDue > 0 && this.beginCheckout(checkoutDue)) return;
      this.controller.customersProcessed++; this.refreshHudAndMonitor(true); this.completeCustomerTurn();
    } else if (choice === "detain") {
      if (isAnomaly && anomalyEvidence > 0) {
        saveManager.state.cash += 20; saveManager.state.lifetime.anomalies++;
        this.controller.anomaliesEliminated++;
        if (saveManager.ensureDaily().index === 1) saveManager.updateDaily(1);
        saveManager.unlockAchievement("night_guard");
        this.recordCaseEvidence("confirmed_anomaly");
        this.showToast(LOCALES[this.lang].caseCorrectDetain, "#4ade80");
      } else {
        this.controller.warnings++; saveManager.state.lifetime.mistakes++;
        saveManager.state.cash = Math.max(0, saveManager.state.cash - 15);
        this.showToast(`${LOCALES[this.lang].caseWrongDetain} (${this.controller.warnings}/${this.controller.maxWarnings})`, "#f87171");
      }
      saveManager.save(); this.controller.customersProcessed++; this.refreshHudAndMonitor(true);
      if (this.controller.warnings >= this.controller.maxWarnings) this.time.delayedCall(500, () => this.triggerGameOver("FIRED")); else this.completeCustomerTurn();
    } else {
      const enough = isAnomaly && anomalyEvidence >= 2 && confidence === "HIGH";
      if (enough) {
        saveManager.state.cash += 15; this.controller.paranormalThreat = Math.max(0, this.controller.paranormalThreat - 8);
        this.showToast(LOCALES[this.lang].caseBossPraise, "#38bdf8");
      } else {
        saveManager.state.cash = Math.max(0, saveManager.state.cash - 10); saveManager.state.lifetime.mistakes++;
        this.showToast(LOCALES[this.lang].caseWeakReport, "#facc15");
      }
      saveManager.save(); this.controller.customersProcessed++; this.refreshHudAndMonitor(true); this.completeCustomerTurn();
    }
  }

  buildPauseOverlay() {
    this.pauseOverlay = this.add.container(0, 0).setDepth(90).setVisible(false);
    const t = LOCALES[this.lang].pauseUi;
    const dim = this.add.rectangle(640, 360, 1280, 720, 0x010302, 0.78).setInteractive();
    const panel = this.add.rectangle(640, 360, 590, 420, 0x07100b, 0.98)
      .setStrokeStyle(2, 0x22c55e, 0.95);
    const innerFrame = this.add.rectangle(640, 360, 566, 396, 0x000000, 0)
      .setStrokeStyle(1, 0x14532d, 0.9);
    const accents = this.add.graphics();
    accents.lineStyle(2, 0x4ade80, 0.9);
    accents.lineBetween(368, 214, 912, 214);
    accents.lineBetween(368, 506, 912, 506);
    accents.fillStyle(0x4ade80, 0.9);
    accents.fillCircle(388, 214, 3);
    accents.fillCircle(892, 214, 3);

    const eyebrow = this.add.text(640, 238, `${t.header}  //  N${String(saveManager.state.currentNight || 1).padStart(2, "0")}`, {
      fontFamily: "'Courier New', monospace", fontSize: "12px", fontStyle: "bold",
      color: "#86efac", letterSpacing: 2
    }).setOrigin(0.5);
    const title = this.add.text(640, 274, t.title, {
      fontFamily: "Impact, 'Arial Black', sans-serif", fontSize: "38px", fontStyle: "bold",
      color: "#f4f4f5", letterSpacing: 3, stroke: "#052e16", strokeThickness: 3
    }).setOrigin(0.5);
    const subtitle = this.add.text(640, 308, t.subtitle, {
      fontFamily: "'Courier New', monospace", fontSize: "12px", color: "#a1a1aa", letterSpacing: 1
    }).setOrigin(0.5);

    const resumeBg = this.add.rectangle(640, 357, 360, 48, 0x14532d, 1)
      .setStrokeStyle(2, 0x4ade80).setInteractive({ useHandCursor: true });
    const resumeTxt = this.add.text(640, 357, t.resume, {
      fontFamily: "'Courier New', monospace", fontSize: "18px", fontStyle: "bold",
      color: "#dcfce7", letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const makeToggle = (y, getLabel, onToggle) => {
      const bg = this.add.rectangle(640, y, 430, 38, 0x0b1510, 0.96)
        .setStrokeStyle(1, 0x166534).setInteractive({ useHandCursor: true });
      const label = this.add.text(640, y, getLabel(), {
        fontFamily: "'Courier New', monospace", fontSize: "13px", fontStyle: "bold",
        color: "#7dd3fc", letterSpacing: 1
      }).setOrigin(0.5);
      bg.on("pointerover", () => bg.setStrokeStyle(2, 0x38bdf8));
      bg.on("pointerout", () => bg.setStrokeStyle(1, 0x166534));
      bg.on("pointerdown", onToggle);
      label.setInteractive({ useHandCursor: true }).on("pointerdown", onToggle);
      return label;
    };
    const flashTxt = makeToggle(411,
      () => `${t.reduceFlash}: ${saveManager.state.settings.reducedFlash ? t.on : t.off}`,
      () => { saveManager.state.settings.reducedFlash = !saveManager.state.settings.reducedFlash; saveManager.save(); flashTxt.setText(`${t.reduceFlash}: ${saveManager.state.settings.reducedFlash ? t.on : t.off}`); }
    );
    const vibrationTxt = makeToggle(456,
      () => `${t.vibration}: ${saveManager.state.settings.vibration ? t.on : t.off}`,
      () => { saveManager.state.settings.vibration = !saveManager.state.settings.vibration; saveManager.save(); vibrationTxt.setText(`${t.vibration}: ${saveManager.state.settings.vibration ? t.on : t.off}`); }
    );
    const menuBg = this.add.rectangle(640, 493, 260, 38, 0x240b0b, 0.94)
      .setStrokeStyle(1, 0x7f1d1d).setInteractive({ useHandCursor: true });
    const menuTxt = this.add.text(640, 493, t.menu, {
      fontFamily: "'Courier New', monospace", fontSize: "14px", fontStyle: "bold",
      color: "#fca5a5", letterSpacing: 2
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    resumeBg.on("pointerover", () => resumeBg.setFillStyle(0x166534));
    resumeBg.on("pointerout", () => resumeBg.setFillStyle(0x14532d));
    resumeBg.on("pointerdown", () => this.togglePauseMenu(false));
    resumeTxt.on("pointerdown", () => this.togglePauseMenu(false));
    menuTxt.on("pointerdown", () => {
      soundManager.stopAmbientHum();
      this.scene.start("MainMenu");
    });

    this.pauseOverlay.add([dim, panel, innerFrame, accents, eyebrow, title, subtitle,
      resumeBg, resumeTxt, flashTxt, vibrationTxt, menuBg, menuTxt]);
  }

  setupParallaxAndTimers() {
    this.input.on("pointermove", (pointer) => {
      const nx = (pointer.x - 640) / 640;
      const ny = (pointer.y - 360) / 360;
      this.bgFar.setPosition(640 - nx * 8, 320 - ny * 5);
      this.bgMid.setPosition(640 - nx * 18, 320 - ny * 9);
      this.customerShadow.setPosition(this.customerSprite.x + 20 - nx * 22, this.customerSprite.y - 10 - ny * 10);

      if (this.uvActive) {
        this.uvCone.setPosition(
          Phaser.Math.Clamp(pointer.x, 80, 1180),
          Phaser.Math.Clamp(pointer.y, 90, 620)
        );
      }
    });

    // Main 1-second Shift Clock + Dynamic Store Events Trigger
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.paused) return;

        if (this.waitingForCustomer && this.arrivalDelayRemaining > 0) {
          this.arrivalDelayRemaining--;
          const shiftEndsNextTick = this.controller.elapsedSeconds + 1 >= 6 * this.controller.secondsPerHour;
          if (this.arrivalDelayRemaining <= 0) {
            if (!shiftEndsNextTick) this.spawnNextCustomer();
            else this.waitingForCustomer = false;
          }
        }

        if (this.phoneRinging) {
          this.phoneRingElapsed++;
          if (this.phoneRingElapsed >= 12) {
            this.phoneRinging = false;
            this.phoneRingElapsed = 0;
            this.phonePropBg.setFillStyle(0x18181b).setStrokeStyle(2, 0x52525b);
            this.phonePropTxt.setText("☎ PHONE").setColor("#a1a1aa");
            this.showToast(LOCALES[this.lang].phoneMissed, "#facc15");
          }
        }

        // Handle active Fuse Box Blackout countdown
        if (this.blackoutActive) {
          this.blackoutTimer++;
          soundManager.playFootstepThud();
          const difficultyBonus = saveManager.state.difficulty === "HARD" ? -2 : saveManager.state.difficulty === "EASY" ? 5 : 0;
          const limit = (saveManager.state.espressoActive ? 16 : 12) + difficultyBonus;
          if (this.blackoutTimer >= limit) {
            this.triggerGameOver("CONSUMED");
            return;
          }
        }

        // Handle active Rear Door Intruder countdown
        if (this.rearIntruderActive) {
          this.rearIntruderTimer++;
          const difficultyBonus = saveManager.state.difficulty === "HARD" ? -2 : saveManager.state.difficulty === "EASY" ? 5 : 0;
          const limit = (saveManager.state.espressoActive ? 15 : 11) + difficultyBonus;
          if (this.rearIntruderTimer >= limit) {
            this.triggerGameOver("CONSUMED");
            return;
          }
        }

        if (!this.transitioningCustomer && this.patienceRemaining > 0) {
          this.patienceRemaining--;
          this.updatePatienceMeter();
          if (this.patienceRemaining <= 8 && !this.patienceWarned) {
            this.patienceWarned = true;
            this.showToast(LOCALES[this.lang].patienceWarning, "#facc15");
          }
          if (this.patienceRemaining <= 0) {
            this.handleCustomerWalkout();
            return;
          }
        }

        this.controller.elapsedSeconds++;
        const newHour = Math.floor(
          this.controller.elapsedSeconds / this.controller.secondsPerHour
        );

        if (newHour > this.controller.hour) {
          this.controller.hour = newHour;
          soundManager.playBeep(false);
          const ruleLine = LOCALES[this.lang].hourlyRules[Math.min(5, this.controller.hour)];
          this.showToast(ruleLine, "#38bdf8");

          // At 04:00 AM, the Night Collector buys all stashed anomaly items for +$45 each!
          if (
            this.controller.hour === 4 &&
            !this.controller.collectorPaidThisShift &&
            this.controller.stashedAnomalies > 0
          ) {
            this.controller.collectorPaidThisShift = true;
            const count = this.controller.stashedAnomalies;
            const payout = count * 45;
            saveManager.state.cash += payout;
            saveManager.save();
            soundManager.playCoinChime();
            const msg = LOCALES[this.lang].collectorVisitToast
              .replace("{count}", String(count))
              .replace("${total}", String(payout));
            this.showToast(msg, "#fde047");
          }
        }

        if (this.controller.hour >= 6) {
          this.triggerShiftComplete();
          return;
        }

        // Random Live Store Events (Phone Call, Fuse Box Blackout, Rear Door Intrusion)
        const sec = this.controller.elapsedSeconds;
        if (sec % 29 === 14 && !this.phoneRinging && !this.blackoutActive) {
          this.startPhoneRingEvent();
        } else if (
          sec % 43 === 25 &&
          !this.blackoutActive &&
          this.controller.hour >= 1 &&
          Math.random() < 0.65
        ) {
          this.startBlackoutEvent();
        } else if (
          sec % 37 === 19 &&
          !this.rearIntruderActive &&
          !this.blackoutActive &&
          (saveManager.state.upgrades.cctv || this.controller.night >= 2)
        ) {
          this.startRearDoorIntruderEvent();
        }

        this.refreshHudAndMonitor(true);
      }
    });

    // 200ms Ceiling Light Flicker every 6.5 seconds
    this.time.addEvent({
      delay: 6500,
      loop: true,
      callback: () => {
        if (this.paused || this.transitioningCustomer || this.blackoutActive) return;
        this.triggerCeilingFlicker();
      }
    });

    // Periodic Eye Blink check
    this.time.addEvent({
      delay: 2200,
      loop: true,
      callback: () => {
        if (this.paused || this.transitioningCustomer || this.shutterClosed) return;
        const enc = this.controller.currentEncounter;
        if (!enc) return;
        if (enc.tells.neverBlinks || enc.customerClass === CUSTOMER_CLASSES.PARASITE) {
          this.eyeStateDot.setFillStyle(0xef4444, 0.95);
        } else {
          this.eyeStateDot.setFillStyle(0x4ade80, 0.85);
          this.customerSprite.setScale(
            this.customerSprite.scaleX,
            this.customerSprite.scaleY * 0.96
          );
          this.time.delayedCall(110, () => {
            if (this.customerSprite && this.customerSprite.active) {
              this.customerSprite.setDisplaySize(345, 345);
            }
          });
        }
      }
    });

    // Conveyor Rollers + UV Exposure Check (2.5s default, 5.0s with Overcharged UV Battery!)
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (this.paused) return;
        this.conveyorRollers.forEach((r) => {
          r.x += 2;
          if (r.x > 455) r.x = 55;
        });

        const enc = this.controller.currentEncounter;
        if (this.uvActive && enc && !this.shutterClosed && !this.transitioningCustomer) {
          const dist = Phaser.Math.Distance.Between(
            this.uvCone.x,
            this.uvCone.y,
            this.customerSprite.x,
            this.customerSprite.y
          );
          if (dist < 210) {
            enc.uvExposureTime += 0.1;
            const maxUv = saveManager.getMaxUvSeconds();
            if (enc.uvExposureTime >= maxUv - 1.0 && enc.uvExposureTime < maxUv) {
              this.showToast(LOCALES[this.lang].uvAngerWarning, "#e879f9");
            }
            if (enc.uvExposureTime >= maxUv && !enc.uvAngered) {
              enc.uvAngered = true;
              this.equipOrToggleTool(null);
              if (enc.customerClass === CUSTOMER_CLASSES.DOPPEL) {
                this.triggerGameOver("CONSUMED");
              } else if (enc.customerClass === CUSTOMER_CLASSES.HUMAN) {
                soundManager.playBeep(true);
                this.applyHumanPenalty(LOCALES[this.lang].uvAngerWarning);
              } else {
                soundManager.playBeep(false);
                this.recordCaseEvidence("uv");
                this.showToast(LOCALES[this.lang].uvExposeAnomaly, "#e879f9");
              }
            }
          }
        }
      }
    });

    this.input.keyboard.on("keydown-J", () => this.openCaseFile());
    this.input.keyboard.on("keydown-ESC", () => {
      if (this.checkoutOpen) return;
      if (this.caseFileOpen) { this.closeCaseFile();
      } else if (this.phonePanel) {
        this.closePhonePanel();
      } else if (this.rulebookOpen) {
        this.toggleRulebook(false);
      } else if (this.questionMenu.visible) {
        this.questionMenu.setVisible(false);
      } else if (this.equippedTool) {
        this.equipOrToggleTool(null);
      } else {
        this.togglePauseMenu();
      }
    });
    this.input.keyboard.on("keydown-SPACE", () => { this.triggerPanicShutter(); });
    this.input.keyboard.on("keydown-ENTER", () => { if (this.paused && !this.caseFileOpen && !this.phonePanel && !this.checkoutOpen) this.togglePauseMenu(false); });
  }

  // =========================================================================
  // LIVE EVENT A: FUSE BOX BLACKOUT MINI-GAME
  // =========================================================================
  startBlackoutEvent() {
    this.blackoutActive = true;
    this.blackoutTimer = 0;
    this.blackoutStep = 1;
    soundManager.playFlickerBuzz();
    this.darknessOverlay.setAlpha(0.92);

    const t = LOCALES[this.lang];
    this.fuseTitleTxt.setText(t.blackoutTitle);

    // Shuffle target sequence 1..4 across the 4 physical switches
    const orders = [1, 2, 3, 4].sort(() => Math.random() - 0.5);
    this.fuseSwitches.forEach((sw, idx) => {
      sw.targetOrder = orders[idx];
      sw.flipped = false;
      sw.swNum.setText(`[${sw.targetOrder}]`);
      sw.swState.setText("OFF").setColor("#f87171");
      sw.swBg.setFillStyle(0x1e293b).setStrokeStyle(2, 0xfacc15);
    });

    this.fuseBoxContainer.setVisible(true);
  }

  flipFuseSwitch(idx) {
    if (!this.blackoutActive) return;
    const sw = this.fuseSwitches[idx];
    if (sw.flipped) return;

    if (sw.targetOrder === this.blackoutStep) {
      sw.flipped = true;
      soundManager.playBreakerClick(1 + this.blackoutStep * 0.15);
      sw.swState.setText("ON").setColor("#4ade80");
      sw.swBg.setFillStyle(0x14532d).setStrokeStyle(2, 0x4ade80);
      this.blackoutStep++;

      if (this.blackoutStep > 4) {
        // Power restored!
        this.blackoutActive = false;
        this.darknessOverlay.setAlpha(0);
        this.fuseBoxContainer.setVisible(false);
        soundManager.playCoinChime();
        saveManager.state.cash += 15;
        saveManager.save();
        this.showToast("⚡ POWER RESTORED! +$15 HAZARD BONUS", "#4ade80");
        this.refreshHudAndMonitor(true);
      }
    } else {
      // Wrong order resets switches
      soundManager.playBeep(true);
      this.blackoutStep = 1;
      this.fuseSwitches.forEach((s) => {
        s.flipped = false;
        s.swState.setText("OFF").setColor("#f87171");
        s.swBg.setFillStyle(0x1e293b);
      });
    }
  }

  // =========================================================================
  // LIVE EVENT B: DESK PHONE CALLS (REAL MANAGER VS. ANOMALY MIMIC)
  // =========================================================================
  startPhoneRingEvent() {
    this.phoneRinging = true;
    this.phoneRingElapsed = 0;
    soundManager.playPhoneRing();
    soundManager.playRadioStatic();
    this.phonePropBg.setFillStyle(0x7f1d1d).setStrokeStyle(2, 0xfca5a5);
    this.phonePropTxt.setText("☎ RING!").setColor("#fef08a");
    this.showToast(LOCALES[this.lang].phoneRingBanner, "#fef08a");
  }

  answerDeskPhone() {
    if (!this.phoneRinging) {
      soundManager.playMenuHover();
      this.openPhonePanel();
      return;
    }
    this.phoneRinging = false;
    this.phoneRingElapsed = 0;
    this.phonePropBg.setFillStyle(0x18181b).setStrokeStyle(2, 0x52525b);
    this.phonePropTxt.setText("☎ PHONE").setColor("#a1a1aa");

    const t = LOCALES[this.lang];
    const isMimic = Math.random() < (saveManager.state.campaignFlags.lastChoice === "trust" ? 0.62 : 0.45);
    let message;
    if (isMimic) {
      soundManager.playFlickerBuzz();
      message = t.phoneMimicCalls[Math.floor(Math.random() * t.phoneMimicCalls.length)];
    } else {
      soundManager.playBeep(false);
      message = t.phoneRealCalls[Math.floor(Math.random() * t.phoneRealCalls.length)];
    }
    this.openPhonePanel(message, isMimic);
  }

  openPhonePanel(callText = "", isMimic = false) {
    this.closePhonePanel();
    this.pausedBeforePhone = this.paused;
    this.setGameplayPaused(true);
    this.activePhoneCall = callText ? { isMimic, message: callText } : null;
    const labels = {
      UZ: {
        title: "KASSA TELEFONI",
        incoming: "KIRUVCHI QO‘NG‘IROQ",
        idle: "FAOL QO‘NG‘IROQ YO‘Q",
        waiting: "Telefon jiringlashini kuting.",
        close: "YOPISH"
      },
      EN: {
        title: "DESK PHONE",
        incoming: "INCOMING CALL",
        idle: "NO ACTIVE CALL",
        waiting: "Wait for the phone to ring.",
        close: "CLOSE"
      },
      RU: {
        title: "ТЕЛЕФОН КАССЫ",
        incoming: "ВХОДЯЩИЙ ЗВОНОК",
        idle: "НЕТ АКТИВНОГО ЗВОНКА",
        waiting: "Дождитесь звонка.",
        close: "ЗАКРЫТЬ"
      }
    }[this.lang] || {
      title: "KASSA TELEFONI",
      incoming: "KIRUVCHI QO‘NG‘IROQ",
      idle: "FAOL QO‘NG‘IROQ YO‘Q",
      waiting: "Telefon jiringlashini kuting.",
      close: "YOPISH"
    };

    const panel = this.add.container(0, 0).setDepth(1800);
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x020617, 0.82).setInteractive();
    const shell = this.add.rectangle(640, 360, 610, 500, 0x171717)
      .setStrokeStyle(4, 0x64748b);
    const screen = this.add.rectangle(640, 335, 545, 285, 0x030712)
      .setStrokeStyle(2, isMimic ? 0x991b1b : 0x475569);
    const title = this.add.text(640, 182, labels.title, {
      fontFamily: "'Courier New', monospace",
      fontSize: "28px",
      fontStyle: "bold",
      color: "#e2e8f0"
    }).setOrigin(0.5);
    const status = this.add.text(640, 235, callText ? labels.incoming : labels.idle, {
      fontFamily: "'Courier New', monospace",
      fontSize: "18px",
      fontStyle: "bold",
      color: callText ? (isMimic ? "#f87171" : "#4ade80") : "#facc15"
    }).setOrigin(0.5);
    const message = this.add.text(640, 332, callText || labels.waiting, {
      fontFamily: "'Courier New', monospace",
      fontSize: "18px",
      color: "#e5e7eb",
      align: "center",
      lineSpacing: 5,
      wordWrap: { width: 470, useAdvancedWrap: true }
    }).setOrigin(0.5);
    panel.add([shade, shell, screen, title, status, message]);

    if (this.activePhoneCall) {
      const choiceLabel = this.add.text(640, 432, LOCALES[this.lang].phoneDecisionPrompt, {
        fontFamily: "'Courier New', monospace",
        fontSize: "15px",
        color: "#94a3b8"
      }).setOrigin(0.5);
      panel.add(choiceLabel);
      this.addPhoneChoice(panel, 510, 490, LOCALES[this.lang].phoneTrustBtn, 0x14532d, "trust");
      this.addPhoneChoice(panel, 770, 490, LOCALES[this.lang].phoneChallengeBtn, 0x7f1d1d, "challenge");
    }

    const closeButton = this.add.rectangle(640, 568, 190, 38, 0x27272a)
      .setStrokeStyle(2, 0x71717a)
      .setInteractive({ useHandCursor: true });
    const closeLabel = this.add.text(640, 568, labels.close, {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff"
    }).setOrigin(0.5);
    panel.add([closeButton, closeLabel]);
    closeButton.on("pointerdown", () => this.closePhonePanel());
    this.phonePanel = panel;
  }

  addPhoneChoice(panel, x, y, label, color, choice) {
    const button = this.add.rectangle(x, y, 220, 52, color)
      .setStrokeStyle(2, 0xe2e8f0)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#ffffff",
      align: "center",
      wordWrap: { width: 195 }
    }).setOrigin(0.5);
    panel.add([button, text]);
    button.on("pointerdown", () => this.resolvePhoneCall(choice));
  }

  resolvePhoneCall(choice) {
    const call = this.activePhoneCall;
    if (!call) {
      this.closePhonePanel();
      return;
    }
    this.closePhonePanel();
    const t = LOCALES[this.lang];
    const isMimic = call.isMimic;
    saveManager.state.campaignFlags.lastChoice = choice;
    if (choice === "trust" && !isMimic) {
      saveManager.state.cash += 10;
      this.controller.paranormalThreat = Math.max(0, this.controller.paranormalThreat - 5);
      soundManager.playCoinChime();
      this.showToast(t.phoneTrustReal, "#4ade80");
    } else if (choice === "trust" && isMimic) {
      saveManager.state.cash = Math.max(0, saveManager.state.cash - 20);
      this.controller.paranormalThreat = Math.min(100, this.controller.paranormalThreat + 15);
      soundManager.playFlickerBuzz();
      this.showToast(t.phoneTrustMimic, "#f87171");
    } else if (choice === "challenge" && isMimic) {
      saveManager.state.cash += 20;
      this.controller.paranormalThreat = Math.max(0, this.controller.paranormalThreat - 10);
      saveManager.recordBestiary("codex_11");
      soundManager.playCoinChime();
      this.showToast(t.phoneChallengeMimic, "#4ade80");
    } else {
      saveManager.state.cash = Math.max(0, saveManager.state.cash - 8);
      soundManager.playBeep(true);
      this.showToast(t.phoneChallengeReal, "#facc15");
    }
    saveManager.save();
    this.refreshHudAndMonitor(true);
  }

  closePhonePanel() {
    if (this.phonePanel) {
      this.phonePanel.destroy(true);
      this.phonePanel = null;
    }
    this.activePhoneCall = null;
    this.setGameplayPaused(this.pausedBeforePhone);
  }

  // =========================================================================
  // LIVE EVENT C: REAR DOOR INTRUSION (CCTV)
  // =========================================================================
  startRearDoorIntruderEvent() {
    this.rearIntruderActive = true;
    this.rearIntruderTimer = 0;
    saveManager.recordBestiary("codex_12");
    soundManager.playFootstepThud();
    this.camToggleBtn.setColor("#ef4444");
    this.showToast(LOCALES[this.lang].rearDoorWarning, "#ef4444");
    this.refreshHudAndMonitor(true);
  }

  // =========================================================================
  // DIEGETIC TOOLS & MULTI-CHOICE INTERACTIONS
  // =========================================================================
  equipOrToggleTool(toolKey) {
    if (this.equippedTool === toolKey || toolKey === null) {
      this.equippedTool = null;
      this.uvActive = false;
      this.uvCone.setVisible(false);
      this.fpHandSprite.setVisible(false);
      this.holsterText.setVisible(false);
      Object.values(this.deskProps).forEach((p) => p.spr.setAlpha(1));
      this.updateUvMarks();
      return;
    }

    soundManager.playMenuHover();
    this.equippedTool = toolKey;
    this.questionMenu.setVisible(false);

    Object.entries(this.deskProps).forEach(([k, p]) => {
      p.spr.setAlpha(k === toolKey ? 0.35 : 1);
    });

    const handMap = {
      shotgun: "hand_shotgun",
      sprayer: "hand_sprayer",
      taser: "hand_taser",
      uv: "hand_uv"
    };

    if (handMap[toolKey]) {
      this.fpHandSprite.setTexture(handMap[toolKey]).setDisplaySize(310, 310).setVisible(true);
      this.holsterText.setText(LOCALES[this.lang].holsterHint).setVisible(true);
    }

    this.uvActive = toolKey === "uv";
    if (this.uvActive && this.controller.currentEncounter?.customerClass !== CUSTOMER_CLASSES.HUMAN) this.recordCaseEvidence("uv");
    this.uvCone.setVisible(this.uvActive);
    this.updateUvMarks();
  }

  updateUvMarks() {
    const enc = this.controller.currentEncounter;
    if (!enc) return;
    const showCustUv =
      this.uvActive && (enc.tells.uvSigil || enc.customerClass !== CUSTOMER_CLASSES.HUMAN);
    this.customerUvMark.setAlpha(showCustUv ? 0.92 : 0);

    this.itemSprites.forEach(({ uvTag, itemObj }) => {
      const showItemUv =
        this.uvActive && (itemObj.isMutated || itemObj.isAnomItem || enc.tells.identicalItems);
      uvTag.setAlpha(showItemUv ? 0.95 : 0);
    });
  }

  scheduleCustomerArrival() {
    if (this.waitingForCustomer || this.checkoutOpen || this.controller.hour >= 6) return;
    this.waitingForCustomer = true;
    this.transitioningCustomer = true;
    this.arrivalDelayRemaining = Phaser.Math.Between(8, 10);
    this.customerSprite.setAlpha(0);
    this.customerShadow.setAlpha(0);
    this.eyeStateDot.setVisible(false);
    this.patienceLabel.setVisible(false);
    this.patienceBarBg.setVisible(false);
    this.patienceBarFill.setVisible(false);
    this.bribeBar.setVisible(false);
    this.questionMenu.setVisible(false);
    const t = LOCALES[this.lang] || LOCALES.UZ;
    this.speechText.setText(t.customerWaiting || LOCALES.UZ.customerWaiting).setColor("#a1a1aa");
    this.crtMainText.setText(t.crtReady).setColor("#4ade80");
  }

  syncCustomerShadow() {
    if (!this.customerSprite?.active || !this.customerShadow?.active) return;
    this.customerShadow.setPosition(this.customerSprite.x + 20, this.customerSprite.y - 10);
  }

  startCustomerIdleAnimation() {
    this.customerIdleTween?.stop();
    this.customerIdleTween = this.tweens.add({
      targets: this.customerSprite,
      scaleY: this.customerSprite.scaleY * 1.018,
      y: this.customerSprite.y - 3,
      duration: 1450,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onUpdate: () => this.syncCustomerShadow()
    });
  }

  animateCustomerDeparture(onComplete) {
    const sprite = this.customerSprite;
    const baseScaleX = Math.abs(sprite.scaleX);
    const turnAngle = Math.random() < 0.5 ? -8 : 8;
    const token = this.encounterToken;
    const encounter = this.controller.currentEncounter;
    const isCurrent = () => this.scene.isActive() && this.encounterToken === token && this.controller.currentEncounter === encounter;
    this.customerIdleTween?.stop();
    this.customerWalkTween?.stop();
    this.tweens.killTweensOf(sprite);
    this.tweens.killTweensOf(this.customerShadow);

    // A short squash-and-flip gives the existing portrait art a readable turn before it walks out.
    this.tweens.add({
      targets: sprite,
      scaleX: baseScaleX * 0.12,
      angle: turnAngle,
      duration: 220,
      ease: "Sine.easeIn",
      onComplete: () => {
        if (!isCurrent()) return;
        sprite.setFlipX(!sprite.flipX);
        this.tweens.add({
          targets: sprite,
          scaleX: baseScaleX,
          x: 355,
          y: 340,
          alpha: 0,
          angle: turnAngle * 0.5,
          duration: 2600,
          ease: "Sine.easeInOut",
          onUpdate: () => this.syncCustomerShadow(),
          onComplete: () => {
            if (!isCurrent()) return;
            sprite.setAngle(0).setFlipX(false).setScale(baseScaleX, sprite.scaleY).setAlpha(0);
            this.customerShadow.setAlpha(0);
            this.eyeStateDot.setVisible(false);
            if (onComplete) onComplete();
          }
        });
        this.tweens.add({ targets: this.customerShadow, alpha: 0, duration: 2400, ease: "Sine.easeInOut" });
      }
    });
  }

  spawnNextCustomer() {
    if (this.checkoutOpen || !this.waitingForCustomer || this.controller.hour >= 6) return;
    this.waitingForCustomer = false;
    this.arrivalDelayRemaining = 0;
    this.transitioningCustomer = true;
    this.shutterClosed = false;
    this.shutterSprite.setY(-360);
    this.customerUvMark.setAlpha(0);
    this.questionMenu.setVisible(false);
    this.itemActionPopup.setVisible(false);
    this.inspectedItemObj = null;

    const encounterToken = ++this.encounterToken;
    const enc = this.controller.generateEncounter(this.lang);
    const isCurrentEncounter = () => this.scene.isActive() && this.encounterToken === encounterToken && this.controller.currentEncounter === enc;
    enc.paymentTotal = 0;
    enc.paymentStarted = false;
    enc.paymentSettled = false;
    soundManager.playStoreBell();
    this.evidenceFound = [];
    this.questionsAsked = [];
    this.caseFileOpen = false; this.caseOverlay?.setVisible(false);
    const t = LOCALES[this.lang];
    this.patienceTotal = Math.round((enc.archetype.patienceSeconds || 40) * (saveManager.state.difficulty === "EASY" ? 1.3 : saveManager.state.difficulty === "HARD" ? 0.78 : 1));
    this.topLeftHudText.setFontSize(saveManager.state.settings.largeText ? 20 : 18);
    this.speechText.setFontSize(saveManager.state.settings.largeText ? 16 : 13);
    this.toastBanner.setFontSize(saveManager.state.settings.largeText ? 17 : 14);
    this.patienceRemaining = 0;
    this.patienceWarned = false;
    this.updatePatienceMeter();

    const initialTex =
      enc.customerClass === CUSTOMER_CLASSES.PARASITE && Math.random() < 0.45
        ? enc.archetype.anomalyTexture
        : enc.archetype.normalTexture;

    this.customerSprite
      .setTexture(initialTex)
      .setDisplaySize(345, 345)
      .setAlpha(0)
      .setPosition(930, 325)
      .setAngle(0)
      .setFlipX(true)
      .clearTint();
    const customerBaseScaleX = this.customerSprite.scaleX;

    this.customerShadow
      .setTexture(enc.archetype.normalTexture)
      .setDisplaySize(370, 370)
      .setTint(0x000000)
      .setPosition(950, 315)
      .setAlpha(0);

    this.speechText.setText(t.customerArrivalWalking);
    this.bribeBar.setVisible(false);
    const arrivalDuration = Phaser.Math.Between(5000, 9000);
    this.customerWalkTween = this.tweens.add({
      targets: this.customerSprite,
      y: 330,
      angle: 2,
      duration: 320,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      onUpdate: () => this.syncCustomerShadow()
    });
    this.tweens.add({
      targets: this.customerSprite,
      x: 590,
      alpha: 1,
      duration: arrivalDuration,
      ease: "Sine.easeInOut",
      onUpdate: () => this.syncCustomerShadow(),
      onComplete: () => {
        if (!isCurrentEncounter()) return;
        this.customerWalkTween?.stop();
        this.customerSprite.setAngle(0).setY(325);
        this.tweens.add({
          targets: this.customerSprite,
          scaleX: customerBaseScaleX * 0.12,
          duration: 200,
          ease: "Sine.easeIn",
          onComplete: () => {
            if (!isCurrentEncounter()) return;
            this.customerSprite.setFlipX(false);
            this.tweens.add({
              targets: this.customerSprite,
              scaleX: customerBaseScaleX,
              x: 545,
              duration: 220,
              ease: "Sine.easeOut",
              onUpdate: () => this.syncCustomerShadow(),
              onComplete: () => {
                if (!isCurrentEncounter()) return;
                this.transitioningCustomer = false;
                this.patienceRemaining = this.patienceTotal;
                this.patienceLabel.setVisible(true);
                this.patienceBarBg.setVisible(true);
                this.patienceBarFill.setVisible(true);
                this.eyeStateDot.setVisible(true);
                this.speechText.setText(`${enc.archetype.names[this.lang]}: ${enc.greeting}`);
                soundManager.playCustomerVoice(this, enc.greetingVoiceKey);
                this.startCustomerIdleAnimation();
                if (enc.offersBribe) this.bribeBar.setVisible(true);
                this.updatePatienceMeter();
                this.refreshHudAndMonitor(true);
              }
            });
          }
        });
      }
    });
    this.tweens.add({
      targets: this.customerShadow,
      alpha: 0.42,
      duration: arrivalDuration,
      ease: "Sine.easeInOut"
    });

    // Show Bribe Bar if visitor offers a Bribe
    if (enc.offersBribe) {
      this.bribeAcceptTxt.setText(
        t.bribeAcceptBtn.replace("${amt}", String(enc.bribeAmount))
      );
      this.bribeRefuseTxt.setText(t.bribeRefuseBtn);
    }

    this.refreshHudAndMonitor();

    // Spawn 1 to 2 grocery items on the conveyor belt
    this.itemsContainer.removeAll(true);
    this.itemSprites = [];

    enc.items.forEach((itemObj, idx) => {
      const startX = 95 + idx * 120;
      const targetX = 305 + idx * 125;
      const targetY = 528;
      const texKey = itemObj.isMutated
        ? itemObj.base.anomalyTexture
        : itemObj.base.normalTexture;

      const spr = this.add.image(startX, targetY, texKey)
        .setDisplaySize(102, 102)
        .setInteractive({ useHandCursor: true });
      if (!itemObj.isMutated && itemObj.base.tint) spr.setTint(itemObj.base.tint);

      const uvTag = this.add.text(startX, targetY, "666", {
        fontFamily: "'Courier New', monospace",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#e879f9"
      }).setOrigin(0.5).setAlpha(0);

      spr.on("pointerdown", () => {
        if (this.paused || this.transitioningCustomer || this.shutterClosed || this.blackoutActive) {
          return;
        }
        this.handleConveyorItemTap(itemObj, spr);
      });

      this.itemsContainer.add([spr, uvTag]);
      this.itemSprites.push({ spr, uvTag, itemObj });

      this.tweens.add({
        targets: [spr, uvTag],
        x: targetX,
        duration: 600 + idx * 140,
        ease: "Cubic.easeOut"
      });
    });

    this.updateUvMarks();
  }

  handleConveyorItemTap(itemObj, spr) {
    const t = LOCALES[this.lang];
    const enc = this.controller.currentEncounter;
    if (!enc) return;

    // First tap: Inspect item on counter (shows weight on scale, serial year, and [SCAN] / [STASH] popup)
    if (this.inspectedItemObj !== itemObj) {
      this.inspectedItemObj = itemObj;
      itemObj.inspected = true;
      soundManager.playScaleBeep();
      this.recordCaseEvidence(itemObj.isAnomItem ? "anomaly_item" : "normal_item");
      if (itemObj.serialYear === 1998) this.recordCaseEvidence("expired");
      if (itemObj.weightKg === 66.6 || itemObj.weightKg === 0 || itemObj.weightKg > 10) this.recordCaseEvidence("weight");

      const hasScale = saveManager.state.upgrades.scale;
      const weightStr = hasScale
        ? `WEIGHT: ${itemObj.weightKg} kg`
        : `WEIGHT: [BUY SCALE $40]`;
      const yearStr = `EXP YEAR: ${itemObj.serialYear}`;
      const inspectionNote = itemObj.base.inspection?.[this.lang] || "";
      const dupWarn =
        this.controller.hour >= 1 && enc.tells.identicalItems ? "\n[2X IDENTICAL!]" : "";

      this.crtMainText
        .setText(`${itemObj.base.names[this.lang]}  $${itemObj.base.price}\n${weightStr} | ${yearStr}${dupWarn}${inspectionNote ? `\n${inspectionNote}` : ""}`)
        .setColor(
          itemObj.weightKg > 10 || itemObj.weightKg === 0 || itemObj.serialYear === 1998
            ? "#facc15"
            : "#4ade80"
        );

      this.itemScanBtnTxt.setText(t.inspectScanBtn);
      this.itemStashBtnTxt.setText(t.inspectStashBtn);
      this.itemActionPopup.setPosition(spr.x, 452).setVisible(true);
      return;
    }

    // Keep inspection explicit: use the visible [SCAN] or [STASH] action.
    this.itemActionPopup.setVisible(true);
  }

  stashItemUnderDesk(itemObj) {
    if (this.transitioningCustomer || this.shutterClosed) return;
    const enc = this.controller.currentEncounter;
    if (!enc) return;

    soundManager.playBreakerClick(0.9);
    this.itemActionPopup.setVisible(false);

    if (itemObj.isAnomItem || itemObj.isMutated) {
      this.controller.stashedAnomalies++;
      this.stashBadge.setText(`📦 STASHED: ${this.controller.stashedAnomalies}`);
      this.showToast("📦 STASHED CURSED ITEM FOR 04:00 AM COLLECTOR (+$45)", "#c084fc");
    } else {
      // Stashing a normal human's item annoys them (-$10)
      saveManager.state.cash = Math.max(0, saveManager.state.cash - 10);
      saveManager.save();
      this.showToast("CONFISCATED NORMAL ITEM (-$10)", "#facc15");
    }

    this.refreshHudAndMonitor(true);
    this.settleBasketItem(itemObj);
  }

  settleBasketItem(itemObj) {
    const enc = this.controller.currentEncounter;
    if (!enc || !itemObj || itemObj.resolved) return;
    const itemIndex = enc.items.indexOf(itemObj);
    if (itemIndex < 0) return;

    itemObj.resolved = true;
    enc.items.splice(itemIndex, 1);
    const spriteIndex = this.itemSprites.findIndex((entry) => entry.itemObj === itemObj);
    if (spriteIndex >= 0) {
      const [entry] = this.itemSprites.splice(spriteIndex, 1);
      this.itemsContainer.remove(entry.spr);
      this.itemsContainer.remove(entry.uvTag);
      entry.spr.destroy();
      entry.uvTag.destroy();
    }

    this.inspectedItemObj = null;
    this.itemActionPopup.setVisible(false);
    this.itemSprites.forEach(({ spr, uvTag }, index) => {
      const targetX = 305 + index * 125;
      this.tweens.add({
        targets: [spr, uvTag],
        x: targetX,
        duration: 220,
        ease: "Cubic.easeOut"
      });
    });

    if (enc.items.length > 0) {
      const message = LOCALES[this.lang].basketRemaining.replace("{count}", String(enc.items.length));
      this.showToast(message, "#38bdf8");
      this.crtMainText.setText(message).setColor("#38bdf8");
      this.updateUvMarks();
      return;
    }

    if (!enc.paymentBlocked && enc.customerClass === CUSTOMER_CLASSES.HUMAN && enc.paymentTotal > 0 && this.beginCheckout(enc.paymentTotal)) return;
    this.controller.customersProcessed++;
    this.refreshHudAndMonitor(true);
    this.completeCustomerTurn();
  }

  openArcade() {
    if (this.paused || this.checkoutOpen || this.rulebookOpen || this.phonePanel || this.blackoutActive || this.rearIntruderActive) return;
    if (!this.waitingForCustomer) {
      this.showToast(LOCALES[this.lang].arcade.wait, "#facc15");
      return;
    }
    if (this.arcadeUsedThisShift) {
      this.showToast(LOCALES[this.lang].arcade.used, "#facc15");
      return;
    }
    this.arcadeUsedThisShift = true;
    this.scene.launch("ArcadeScene");
  }

  onArcadeFinished(success) {
    const t = LOCALES[this.lang].arcade;
    if (success) {
      saveManager.state.cash += 20;
      this.showToast(t.win, "#4ade80");
      soundManager.playCoinChime();
    } else {
      this.controller.paranormalThreat = Math.min(100, this.controller.paranormalThreat + 8);
      this.showToast(t.lose, "#f87171");
      soundManager.playFlickerBuzz();
    }
    saveManager.save();
    this.refreshHudAndMonitor(true);
  }

  beginCheckout(due) {
    const enc = this.controller.currentEncounter;
    if (!enc || enc.customerClass !== CUSTOMER_CLASSES.HUMAN || enc.paymentBlocked || due <= 0 || enc.paymentStarted || enc.paymentSettled) return false;
    enc.paymentStarted = true;
    this.pausedBeforeCheckout = this.paused;
    this.paused = true;
    this.checkoutOpen = true;
    const sessionId = ++this.checkoutSessionId;
    const paymentRoll = Phaser.Math.Between(1, 100);
    const method = paymentRoll <= 30 ? "CARD" : "CASH";
    const exactCash = method === "CASH" && paymentRoll <= 60;
    const tenderOptions = [20, 50, 100].filter((amount) => amount > due);
    if (!tenderOptions.length) tenderOptions.push(Math.ceil((due + 5) / 50) * 50);
    const tender = method === "CARD" || exactCash ? due : tenderOptions[Phaser.Math.Between(0, tenderOptions.length - 1)];
    this.checkoutOverlay.open({
      due,
      tender,
      method,
      locale: LOCALES[this.lang],
      onComplete: () => {
        if (!this.scene.isActive() || !this.checkoutOpen || this.checkoutSessionId !== sessionId || this.controller.currentEncounter !== enc) return;
        this.checkoutOpen = false;
        this.checkoutSessionId++;
        this.setGameplayPaused(this.pausedBeforeCheckout || false);
        if (enc.paymentSettled) return;
        enc.paymentSettled = true;
        enc.paymentStarted = false;
        saveManager.state.cash += due;
        saveManager.save();
        this.controller.customersProcessed++;
        this.refreshHudAndMonitor(true);
        this.completeCustomerTurn();
      }
    });
    return true;
  }

  resolveBribeOffer(accepted) {
    const enc = this.controller.currentEncounter;
    if (!enc || enc.bribeResolved) return;
    enc.bribeResolved = true;
    saveManager.state.campaignFlags.lastChoice = accepted ? "bribe" : "refuse";
    this.bribeBar.setVisible(false);

    if (accepted) {
      soundManager.playCoinChime();
      saveManager.state.cash += enc.bribeAmount;
      saveManager.state.lifetime.bribes++;
      saveManager.save();
      this.controller.paranormalThreat = Math.min(100, this.controller.paranormalThreat + 22);
      this.controller.customersProcessed++;
      this.showToast(
        `💰 ACCEPTED DIRTY BRIBE +$${enc.bribeAmount} (THREAT INCREASED!)`,
        "#fde047"
      );
      this.refreshHudAndMonitor(true);
      this.completeCustomerTurn();
    } else {
      soundManager.playBeep(false);
      this.showToast("BRIBE REFUSED — INSPECT VISITOR CAREFULLY", "#38bdf8");
    }
  }

  handleCustomerTap() {
    if (this.paused || this.transitioningCustomer || this.shutterClosed || this.blackoutActive) {
      return;
    }

    if (this.equippedTool === "shotgun") {
      this.playHandRecoil();
      this.fireShotgun();
    } else if (this.equippedTool === "sprayer") {
      this.playHandRecoil();
      this.sprayHolyWater();
    } else if (this.equippedTool === "taser") {
      this.playHandRecoil();
      this.fireTaser();
    } else {
      // Open 3-Option Branching Interrogation Menu
      soundManager.playMenuHover();
      const qs = LOCALES[this.lang].questions3;
      this.questionButtons.forEach((btnTxt, idx) => {
        btnTxt.setText(qs[idx]);
      });
      this.questionMenu.setVisible(!this.questionMenu.visible);
    }
  }

  askBranchingQuestion(qIdx) {
    this.questionMenu.setVisible(false);
    soundManager.playBeep(false);
    const ans = this.controller.getBranchingAnswer(qIdx, this.lang);
    this.speechText.setText(ans);
    const enc = this.controller.currentEncounter;
    if (enc && enc.customerClass !== CUSTOMER_CLASSES.HUMAN) {
      if (enc.tells.repeatedSpeech && this.questionsAsked.includes(qIdx)) this.recordCaseEvidence("echo");
      else if (enc.tells.mirrorLag && qIdx === 2) this.recordCaseEvidence("mirror");
      else if (enc.tells.missingShadow && qIdx === 2) this.recordCaseEvidence("shadow");
      else if (enc.tells.neverBlinks && qIdx === 2) this.recordCaseEvidence("blink");
      else if (enc.tells.creepyInterrogation) this.recordCaseEvidence("behavior");
    } else this.recordCaseEvidence("normal_response");
    this.questionsAsked.push(qIdx);

    // Question 3 ("Look directly at the light") also tests pupil/blink state
    if (qIdx === 2 && enc && enc.customerClass !== CUSTOMER_CLASSES.HUMAN) {
      this.eyeStateDot.setFillStyle(0xef4444, 1);
    }
  }

  playHandRecoil() {
    if (!this.fpHandSprite.visible) return;
    this.tweens.add({
      targets: this.fpHandSprite,
      x: "+=28",
      y: "+=22",
      angle: 8,
      duration: 90,
      yoyo: true
    });
  }

  performBarcodeScan(clickedItem = null) {
    if (this.transitioningCustomer || this.shutterClosed || this.blackoutActive) return;
    const enc = this.controller.currentEncounter;
    const t = LOCALES[this.lang];
    if (!enc) return;

    this.itemActionPopup.setVisible(false);
    const itemObj = clickedItem || enc.items[0];
    if (!itemObj) return;

    if (itemObj.isAnomItem || itemObj.isMutated) {
      enc.paymentBlocked = true;
      this.recordCaseEvidence("anomaly_item");
      soundManager.playBeep(true);
      this.crtMainText.setText(t.crtHumanMeat).setColor("#ef4444");
      if (enc.customerClass === CUSTOMER_CLASSES.DOPPEL || enc.customerClass === CUSTOMER_CLASSES.MIMIC) {
        this.triggerGameOver("CONSUMED");
      } else {
        this.applyHumanPenalty(t.crtHumanMeat);
        this.settleBasketItem(itemObj);
      }
      return;
    }

    soundManager.playBeep(false);
    soundManager.playRegisterRattle();
    enc.paymentTotal = (enc.paymentTotal || 0) + itemObj.base.price;
    saveManager.updateDaily(1);
    saveManager.save();
    const itemName = itemObj.base.names[this.lang];
    this.crtMainText.setText(t.crtClean.replace("{item}", itemName).replace("{price}", String(itemObj.base.price))).setColor("#4ade80");
    this.showToast(t.toastCleanScan, "#4ade80");
    this.refreshHudAndMonitor(true);
    this.settleBasketItem(itemObj);
  }

  fireShotgun() {
    const enc = this.controller.currentEncounter;
    const t = LOCALES[this.lang];
    if (!enc) return;

    if (saveManager.state.shells <= 0) {
      soundManager.playBeep(true);
      this.showToast(t.toastOutAmmo, "#f87171");
      return;
    }

    saveManager.state.shells--;
    this.controller.shotgunShots = (this.controller.shotgunShots || 0) + 1;
    saveManager.save();
    soundManager.playShotgun();
    if (!saveManager.state.settings.reducedFlash) { this.cameras.main.shake(260, 0.026); this.cameras.main.flash(130, 255, 190, 90); }
    if (saveManager.state.settings.vibration && navigator.vibrate) navigator.vibrate(35);

    // Firing shotgun also scares away any Rear Door Intruder
    if (this.rearIntruderActive) {
      this.rearIntruderActive = false;
      this.camToggleBtn.setColor("#38bdf8");
    }

    this.refreshHudAndMonitor(true);

    if (enc.customerClass === CUSTOMER_CLASSES.HUMAN) {
      // Check if player owns Police Bribe Fund ($80 insurance)
      if (saveManager.state.upgrades.bribeFund) {
        saveManager.state.upgrades.bribeFund = false;
        saveManager.save();
        soundManager.playSiren();
        this.showToast(t.toastBribeInsuranceUsed, "#fde047");
        this.equipOrToggleTool(null);
        this.completeCustomerTurn();
        return;
      }

      soundManager.playSiren();
      this.crtMainText.setText(t.endings.ARRESTED.subtitle).setColor("#ef4444");
      this.time.delayedCall(600, () => {
        this.triggerGameOver("ARRESTED");
      });
      return;
    }

    saveManager.state.cash += enc.customerClass === CUSTOMER_CLASSES.DOPPEL ? 25 : 10;
    saveManager.save();
    this.controller.anomaliesEliminated++;
    this.controller.customersProcessed++;
    this.customerSprite.setTexture(enc.archetype.anomalyTexture).setTint(0xef4444);
    this.showToast(t.toastDoppelKilled, "#4ade80");
    this.equipOrToggleTool(null);
    this.refreshHudAndMonitor(true);
    this.completeCustomerTurn();
  }

  sprayHolyWater() {
    const enc = this.controller.currentEncounter;
    const t = LOCALES[this.lang];
    if (!enc) return;

    if (saveManager.state.waterCharges <= 0) {
      soundManager.playBeep(true);
      this.showToast("HOLY WATER EMPTY!", "#f87171");
      return;
    }
    saveManager.state.waterCharges--;
    saveManager.save();

    if (enc.customerClass === CUSTOMER_CLASSES.PARASITE) {
      soundManager.playHolyWater(true);
      saveManager.state.cash += 10;
      saveManager.save();
      this.controller.anomaliesEliminated++;
      this.controller.customersProcessed++;
      this.customerSprite.setTexture(enc.archetype.anomalyTexture).setTint(0x38bdf8);
      this.showToast(t.toastParasiteRepelled, "#38bdf8");
      this.equipOrToggleTool(null);
      this.refreshHudAndMonitor(true);
      this.completeCustomerTurn();
    } else if (enc.customerClass === CUSTOMER_CLASSES.HUMAN) {
      soundManager.playHolyWater(false);
      this.applyHumanPenalty(t.toastHumanPenalty);
    } else {
      soundManager.playHolyWater(true);
      enc.revealedTrueForm = true;
      this.customerSprite.setTexture(enc.archetype.anomalyTexture);
      this.showToast(t.toastTaserReveal, "#f43f5e");
      this.refreshHudAndMonitor(true);
    }
  }

  fireTaser() {
    const enc = this.controller.currentEncounter;
    const t = LOCALES[this.lang];
    if (!enc) return;

    if (saveManager.state.taserCharges <= 0) {
      soundManager.playBeep(true);
      this.showToast("TASER BATTERY EMPTY!", "#f87171");
      return;
    }
    saveManager.state.taserCharges--;
    saveManager.save();

    soundManager.playTaser();
    this.cameras.main.flash(100, 125, 211, 252);

    if (enc.customerClass === CUSTOMER_CLASSES.HUMAN) {
      this.applyHumanPenalty(t.toastHumanPenalty);
    } else {
      enc.revealedTrueForm = true;
      this.customerSprite.setTexture(enc.archetype.anomalyTexture);
      this.eyeStateDot.setFillStyle(0xef4444, 1);
      this.showToast(t.toastTaserReveal, "#38bdf8");
      this.refreshHudAndMonitor(true);
    }
  }

  triggerPanicShutter() {
    if (this.transitioningCustomer || this.shutterClosed || this.paused) return;
    const enc = this.controller.currentEncounter;
    const t = LOCALES[this.lang];
    if (!enc) return;

    this.shutterClosed = true;
    this.questionMenu.setVisible(false);
    this.itemActionPopup.setVisible(false);
    soundManager.playShutterSlam();
    if (!saveManager.state.settings.reducedFlash) this.cameras.main.shake(180, 0.014);

    // Slamming the shutter also locks out Rear Door Intruders!
    const blockedRear = this.rearIntruderActive;
    if (this.rearIntruderActive) {
      this.rearIntruderActive = false;
      this.camToggleBtn.setColor("#38bdf8");
    }

    this.tweens.add({
      targets: this.shutterSprite,
      y: 235,
      duration: 250,
      ease: "Bounce.easeOut",
      onComplete: () => {
        if (enc.customerClass !== CUSTOMER_CLASSES.HUMAN || blockedRear) {
          saveManager.state.cash += 10;
          saveManager.save();
          this.controller.anomaliesEliminated++;
          this.showToast(t.toastShutterSaved, "#4ade80");
        } else {
          saveManager.state.cash = Math.max(0, saveManager.state.cash - 10);
          saveManager.save();
          this.showToast(t.toastShutterHuman, "#facc15");
        }
        this.controller.customersProcessed++;
        this.refreshHudAndMonitor(true);
        this.time.delayedCall(620, () => {
          this.tweens.add({
            targets: this.shutterSprite,
            y: -360,
            duration: 300,
            onComplete: () => {
              this.completeCustomerTurn();
            }
          });
        });
      }
    });
  }

  triggerCeilingFlicker() {
    const enc = this.controller.currentEncounter;
    if (!enc) return;

    soundManager.playFlickerBuzz();
    if (!saveManager.state.settings.reducedFlash) this.darknessOverlay.setAlpha(0.76);

    const isAnomaly = enc.customerClass !== CUSTOMER_CLASSES.HUMAN;
    if (enc.tells.missingShadow) this.recordCaseEvidence("shadow");
    if (isAnomaly && !this.shutterClosed) {
      this.customerShadow
        .setTexture(enc.archetype.anomalyTexture)
        .setDisplaySize(420, 420)
        .setAlpha(0.88);
      if (enc.tells.flickerFace || this.controller.hour >= 2) {
        this.customerSprite.setTexture(enc.archetype.anomalyTexture);
      }
    }

    this.time.delayedCall(200, () => {
      if (!this.blackoutActive) {
        this.darknessOverlay.setAlpha(0);
      }
      if (enc && this.customerShadow.active) {
        this.customerShadow
          .setTexture(enc.archetype.normalTexture)
          .setDisplaySize(370, 370)
          .setAlpha(0.42);
      }
      if (enc && !enc.revealedTrueForm && enc.customerClass === CUSTOMER_CLASSES.DOPPEL) {
        this.customerSprite.setTexture(enc.archetype.normalTexture);
      }
    });
  }

  buyShotgunShell() {
    soundManager.init();
    const maxShells = saveManager.getMaxShells();
    if (saveManager.state.shells >= maxShells) {
      soundManager.playBeep(false);
      return;
    }
    if (saveManager.state.cash < 30) {
      soundManager.playBeep(true);
      this.showToast("NEED $30 FOR SHELL", "#f87171");
      return;
    }
    saveManager.state.cash -= 30;
    saveManager.state.shells++;
    saveManager.save();
    soundManager.playCoinChime();
    this.refreshHudAndMonitor(true);
  }

  applyHumanPenalty(msg) {
    saveManager.state.cash = Math.max(0, saveManager.state.cash - 20);
    saveManager.save();
    this.controller.warnings++;
    this.showToast(`${msg} (${this.controller.warnings}/2)`, "#f87171");
    this.refreshHudAndMonitor(true);

    if (this.controller.warnings >= this.controller.maxWarnings) {
      this.time.delayedCall(550, () => {
        this.triggerGameOver("FIRED");
      });
    }
  }

  handleCustomerWalkout() {
    const enc = this.controller.currentEncounter;
    if (!enc || this.transitioningCustomer) return;
    if (enc.customerClass === CUSTOMER_CLASSES.HUMAN) {
      saveManager.state.cash = Math.max(0, saveManager.state.cash - 5);
      this.showToast(LOCALES[this.lang].customerWalkedAwayHuman, "#facc15");
    } else {
      this.controller.paranormalThreat = Math.min(100, this.controller.paranormalThreat + 10);
      this.showToast(LOCALES[this.lang].customerWalkedAwayAnomaly, "#f87171");
    }
    saveManager.save();
    this.controller.customersProcessed++;
    this.refreshHudAndMonitor(true);
    this.completeCustomerTurn();
  }

  completeCustomerTurn() {
    if (this.transitioningCustomer) return;
    this.transitioningCustomer = true;
    this.patienceRemaining = 0;
    this.updatePatienceMeter();
    this.patienceLabel.setVisible(false);
    this.patienceBarBg.setVisible(false);
    this.patienceBarFill.setVisible(false);
    this.questionMenu.setVisible(false);
    this.bribeBar.setVisible(false);
    this.itemActionPopup.setVisible(false);
    this.itemsContainer.removeAll(true);
    this.itemSprites = [];
    this.inspectedItemObj = null;
    this.animateCustomerDeparture(() => {
      if (!this.scene.isActive()) return;
      this.controller.currentEncounter = null;
      this.scheduleCustomerArrival();
      this.refreshHudAndMonitor(true);
    });
  }

  refreshHudAndMonitor(keepMonitorText = false) {
    const t = LOCALES[this.lang];
    const s = saveManager.state;
    const maxShells = saveManager.getMaxShells();
    const h = String(this.controller.hour).padStart(2, "0");
    const rem = this.controller.elapsedSeconds % this.controller.secondsPerHour;
    const mins = String(Math.floor((rem / this.controller.secondsPerHour) * 60)).padStart(2, "0");

    const nightTag = s.currentNight > 7 ? `OVERTIME` : `N${s.currentNight}`;
    this.topLeftHudText.setText(
      `${nightTag} ${h}:${mins} $${s.cash} THREAT:${this.controller.paranormalThreat}%  ${s.difficulty || "NORMAL"}${s.ironNight ? " IRON" : ""}`
    );

    if (this.deskProps.shotgun) {
      this.deskProps.shotgun.hoverLabel.setText(`SHOTGUN (${s.shells}/${maxShells})`);
    }
    if (this.deskProps.sprayer) {
      this.deskProps.sprayer.hoverLabel.setText(`HOLY WATER (${s.waterCharges})`);
    }
    if (this.deskProps.taser) {
      this.deskProps.taser.hoverLabel.setText(`TASER (${s.taserCharges})`);
    }

    this.reloadBadge.setText(t.reloadShellBadge).setVisible(s.shells < maxShells);
    this.camToggleBtn.setText(this.cctvMode ? t.posBtnLabel : t.camBtnLabel);

    if (this.cctvMode) {
      this.crtMainText
        .setText(
          this.rearIntruderActive
            ? "REAR CAM: MOVEMENT DETECTED!"
            : "REAR CAM: STORAGE DOOR CLEAR"
        )
        .setColor(this.rearIntruderActive ? "#ef4444" : "#38bdf8");
      this.cctvEyesTxt.setVisible(this.rearIntruderActive);
      this.crtBossText.setVisible(false);
    } else {
      this.cctvEyesTxt.setVisible(false);
      this.crtBossText.setVisible(true);
      if (!keepMonitorText) {
        this.crtMainText.setText(t.crtReady).setColor("#4ade80");
      }
      const quotes = t.crtBossQuotes;
      this.crtBossText.setText(quotes[this.controller.customersProcessed % quotes.length]);
    }
  }

  toggleRulebook(forceState) {
    soundManager.playMenuHover();
    this.rulebookOpen = typeof forceState === "boolean" ? forceState : !this.rulebookOpen;
    if (this.rulebookOpen) {
      this.refreshNotebookContent();
    }
    this.rulebookOverlay.setVisible(this.rulebookOpen);
  }

  refreshNotebookContent() {
    const t = LOCALES[this.lang];
    this.tabRulesBtn.setText(t.rulebookTabRules);
    this.tabCodexBtn.setText(
      `${t.rulebookTabCodex} (${saveManager.getDiscoveredBestiaryCount()}/15)`
    );

    if (this.notebookTab === "rules") {
      this.tabRulesBtn.setBackgroundColor("#a8a29e");
      this.tabCodexBtn.setBackgroundColor("#e7e5e4");
      this.rulebookTitle.setText(`${t.rulebookHeader} — NIGHT ${saveManager.state.currentNight}`);
      const lines = [];
      for (let h = 0; h <= 5; h++) {
        const prefix = h <= this.controller.hour ? "✓ " : "🔒 ";
        lines.push(prefix + t.hourlyRules[h]);
      }
      this.rulebookBody.setText(lines.join("\n\n"));
    } else {
      this.tabCodexBtn.setBackgroundColor("#a8a29e");
      this.tabRulesBtn.setBackgroundColor("#e7e5e4");
      this.rulebookTitle.setText(
        `ANOMALY BESTIARY CODEX (${saveManager.getDiscoveredBestiaryCount()} / ${BESTIARY_CODEX.length} DISCOVERED)`
      );
      const codexLines = [...BESTIARY_CODEX].sort((a, b) =>
        Number(a.id.replace("codex_", "")) - Number(b.id.replace("codex_", ""))
      ).map((entry) => {
        const count = saveManager.state.bestiary[entry.id] || 0;
        if (count > 0) {
          return `✓ ${entry.title} [Seen: ${count}x] — ${entry.tip}`;
        }
        return `🔒 ${entry.title} — [UNDISCOVERED ANOMALY]`;
      });
      this.rulebookBody.setText(codexLines.join("\n"));
    }
  }

  setGameplayPaused(isPaused) {
    this.paused = Boolean(isPaused);
    if (!this.checkoutOpen) this.tweens.paused = this.paused;
  }

  togglePauseMenu(forceState) {
    if (this.checkoutOpen) return;
    this.paused = typeof forceState === "boolean" ? forceState : !this.paused;
    this.tweens.paused = this.paused;
    this.pauseOverlay.setVisible(this.paused);
  }

  showToast(text, colorHex = "#fef08a") {
    this.toastBanner.setText(text).setColor(colorHex).setVisible(true);
    if (this.toastTimer) this.toastTimer.remove(false);
    this.toastTimer = this.time.delayedCall(2600, () => {
      if (this.toastBanner && this.toastBanner.active) {
        this.toastBanner.setVisible(false);
      }
    });
  }

  triggerGameOver(endingType) {
    this.transitioningCustomer = true;
    const outcome = {
      endingType,
      cash: saveManager.state.cash,
      anomalies: this.controller.anomaliesEliminated,
      hour: this.controller.hour,
      night: saveManager.state.currentNight
    };
    if (saveManager.state.ironNight && !["SHIFT_CLEAR", "SURVIVED_WEEK", "CORRUPT_MILLIONAIRE"].includes(endingType)) {
      const codex = { ...saveManager.state.bestiary }, achievements = { ...saveManager.state.achievements };
      const ironMode = saveManager.state.ironNight;
      saveManager.resetCampaignKeepCodex(); saveManager.state.bestiary = codex; saveManager.state.achievements = achievements;
      saveManager.state.ironNight = ironMode; saveManager.save();
    }
    soundManager.stopAmbientHum();
    this.scene.start("GameOver", outcome);
  }

  triggerShiftComplete() {
    this.transitioningCustomer = true;
    soundManager.stopAmbientHum();
    soundManager.playVictoryChime();

    const daily = saveManager.ensureDaily();
    if (daily.index === 2 && (this.controller.shotgunShots || 0) === 0) { daily.completed = true; daily.progress = 1; saveManager.unlockAchievement("no_shotgun"); }
    if (daily.index === 0 && daily.progress >= 3) { daily.completed = true; saveManager.unlockAchievement("daily_complete"); }
    const completedNight = saveManager.state.currentNight;
    saveManager.state.lifetime.nights++;
    saveManager.state.lifetime.bestCash = Math.max(saveManager.state.lifetime.bestCash, saveManager.state.cash);
    if (this.controller.anomaliesEliminated >= 3) saveManager.unlockAchievement("night_guard");
    if (saveManager.state.cash >= 500) saveManager.unlockAchievement("high_roller");
    if (saveManager.state.ironNight) saveManager.unlockAchievement("iron_survivor");
    saveManager.state.campaignFlags.storySeen = Math.max(saveManager.state.campaignFlags.storySeen || 0, completedNight);
    saveManager.state.espressoActive = false;
    saveManager.state.currentNight = completedNight + 1;
    if (completedNight >= 7) {
      saveManager.state.endlessUnlocked = true;
    }
    saveManager.save();

    // Check special unlockable endings: Corrupt Millionaire ($500+) or Survived the Week (Night 7)
    let endingType = "SHIFT_CLEAR";
    if (saveManager.state.cash >= 500 && !saveManager.state.endingsUnlocked.CORRUPT_MILLIONAIRE) {
      endingType = "CORRUPT_MILLIONAIRE";
    } else if (completedNight === 7) {
      endingType = "SURVIVED_WEEK";
    }

    this.scene.start("GameOver", {
      endingType,
      cash: saveManager.state.cash,
      anomalies: this.controller.anomaliesEliminated,
      hour: 6,
      night: completedNight
    });
  }
}
