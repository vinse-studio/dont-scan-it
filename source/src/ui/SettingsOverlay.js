import { LOCALES } from "../scripts/Locale.js";
import { saveManager } from "../scripts/SaveManager.js";
import { soundManager } from "../scripts/SoundManager.js";

const TAB_KEYS = ["screen", "controls", "audio", "language", "gameplay"];
const TAB_CENTERS = [190, 415, 640, 865, 1090];

export class SettingsOverlay {
  constructor(scene) {
    this.scene = scene;
    this.activeTab = 0;
    this.volumeDragging = false;
    this.container = scene.add.container(0, 0).setVisible(false);
    this.content = scene.add.container(0, 0);
    this.tabs = [];
    this.buildFrame();
    this.container.add(this.content);

    this.onPointerMove = (pointer) => {
      if (this.volumeDragging && pointer.isDown && this.scene.activeModal === "settings" && this.activeTab === 2) {
        this.setVolumeFromPointer(pointer);
      }
    };
    this.onPointerUp = () => { this.volumeDragging = false; };
    scene.input.on("pointermove", this.onPointerMove);
    scene.input.on("pointerup", this.onPointerUp);
  }

  buildFrame() {
    const s = this.scene;
    const panel = s.add.rectangle(640, 360, 1120, 560, 0x050806, 0.985)
      .setStrokeStyle(2, 0xc2c8bd, 0.86);
    const innerFrame = s.add.rectangle(640, 360, 1098, 538, 0x000000, 0)
      .setStrokeStyle(1, 0x778176, 0.38);
    const headerRuleLeft = s.add.rectangle(354, 101, 210, 2, 0x9ba69a, 0.72);
    const headerRuleRight = s.add.rectangle(926, 101, 210, 2, 0x9ba69a, 0.72);
    this.header = s.add.text(640, 101, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "27px",
      fontStyle: "bold",
      color: "#eceee8",
      letterSpacing: 5
    }).setOrigin(0.5);
    this.tabIndicator = s.add.rectangle(TAB_CENTERS[0], 180, 116, 3, 0x9c302a, 1);
    const tabDivider = s.add.rectangle(640, 190, 1048, 1, 0xb3b9ad, 0.45);

    this.container.add([panel, innerFrame, headerRuleLeft, headerRuleRight, this.header, tabDivider]);
    TAB_KEYS.forEach((key, index) => {
      const x = TAB_CENTERS[index];
      const hit = s.add.rectangle(x, 153, 210, 48, 0x000000, 0.001)
        .setInteractive({ useHandCursor: true });
      const label = s.add.text(x, 153, "", {
        fontFamily: "'Courier New', monospace",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#899188",
        letterSpacing: 1
      }).setOrigin(0.5);
      hit.on("pointerdown", () => {
        this.activeTab = index;
        soundManager.playMenuHover();
        this.refresh();
      });
      this.tabs.push({ key, x, label });
      this.container.add([hit, label]);
    });

    this.backHit = s.add.rectangle(222, 598, 300, 54, 0x111713, 0.9)
      .setStrokeStyle(1, 0x8e998d, 0.55)
      .setInteractive({ useHandCursor: true });
    this.backText = s.add.text(222, 598, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#e6e9e2",
      letterSpacing: 1
    }).setOrigin(0.5);
    this.backHit.on("pointerdown", () => {
      soundManager.playBeep(false);
      this.scene.closeModal();
    });
    this.hint = s.add.text(860, 598, "", {
      fontFamily: "'Courier New', monospace",
      fontSize: "13px",
      color: "#8c958b",
      letterSpacing: 1
    }).setOrigin(0.5);
    this.container.add([this.backHit, this.backText, this.hint, this.tabIndicator]);
  }

  setVisible(visible) {
    this.container.setVisible(visible);
    if (!visible) this.volumeDragging = false;
  }

  refresh() {
    const t = LOCALES[this.scene.lang] || LOCALES.UZ;
    const ui = t.settingsUi;
    if (!ui) return;
    this.header.setText(ui.header);
    this.backText.setText(ui.back);
    this.hint.setText(ui.hint);
    this.tabIndicator.setX(TAB_CENTERS[this.activeTab]);
    this.tabs.forEach((tab, index) => {
      tab.label.setText(ui.tabs[index]);
      tab.label.setColor(index === this.activeTab ? "#f1f2ec" : "#899188");
    });
    this.content.removeAll(true);
    this.volumeHit = null;
    this.volumeUi = null;
    this.volumeValueText = null;

    switch (this.activeTab) {
      case 0: this.renderScreen(t, ui); break;
      case 1: this.renderControls(t, ui); break;
      case 2: this.renderAudio(t, ui); break;
      case 3: this.renderLanguage(t, ui); break;
      case 4: this.renderGameplay(t, ui); break;
      default: this.renderScreen(t, ui);
    }
  }

  addRow(y, label, value, { onPrev = null, onNext = null, accent = false } = {}) {
    const s = this.scene;
    const card = s.add.rectangle(640, y, 950, 62, 0x111713, 0.93)
      .setStrokeStyle(1, 0x7a8579, 0.43);
    this.content.add(card);
    const labelText = s.add.text(190, y, label, {
      fontFamily: "'Courier New', monospace",
      fontSize: "16px",
      fontStyle: "bold",
      color: "#d8ddd5",
      letterSpacing: 0.2,
      wordWrap: { width: 390 }
    }).setOrigin(0, 0.5);
    const valueText = s.add.text(930, y, value, {
      fontFamily: "'Courier New', monospace",
      fontSize: "15px",
      fontStyle: "bold",
      color: accent ? "#c6d6a8" : "#f0f1eb",
      align: "center",
      wordWrap: { width: 250 }
    }).setOrigin(0.5);
    this.content.add([labelText, valueText]);

    if (onNext) {
      const addArrow = (x, glyph, action) => {
        const hit = s.add.rectangle(x, y, 52, 48, 0x28312a, 0.8)
          .setStrokeStyle(1, 0x879286, 0.6)
          .setInteractive({ useHandCursor: true });
        const text = s.add.text(x, y, glyph, {
          fontFamily: "'Courier New', monospace",
          fontSize: "27px",
          fontStyle: "bold",
          color: "#e5e9e0"
        }).setOrigin(0.5);
        hit.on("pointerdown", () => {
          soundManager.playMenuHover();
          action();
        });
        this.content.add([hit, text]);
      };
      addArrow(760, "‹", onPrev || onNext);
      addArrow(1090, "›", onNext);
      card.setInteractive({ useHandCursor: true });
      card.on("pointerdown", () => onNext());
      card.on("pointerover", () => card.setStrokeStyle(1, 0xb7c2b2, 0.8));
      card.on("pointerout", () => card.setStrokeStyle(1, 0x7a8579, 0.43));
    }
    return { valueText };
  }

  renderScreen(t, ui) {
    const settings = saveManager.state.settings;
    this.addRow(260, ui.canvasLabel, ui.canvasValue, { accent: true });
    this.addRow(350, t.reducedFlashLabel, settings.reducedFlash ? t.stateOn : t.stateOff, {
      onNext: () => this.toggleSetting("reducedFlash")
    });
    this.addRow(440, t.largeTextLabel, settings.largeText ? t.stateOn : t.stateOff, {
      onNext: () => this.toggleSetting("largeText")
    });
  }

  renderControls(t, ui) {
    const settings = saveManager.state.settings;
    this.addRow(260, ui.touchLabel, ui.touchValue, { accent: true });
    this.addRow(350, t.vibrationLabel, settings.vibration ? t.stateOn : t.stateOff, {
      onNext: () => this.toggleSetting("vibration")
    });
    this.addRow(440, ui.controlHintLabel, ui.controlHintValue, { accent: true });
  }

  renderAudio(t, ui) {
    const s = this.scene;
    const volume = Phaser.Math.Clamp(Number(saveManager.state.settings.volume) || 0, 0, 1);
    const volumeRow = this.addRow(260, t.volumeLabel, `${Math.round(volume * 100)}%`, { accent: true });
    this.volumeValueText = volumeRow.valueText;
    const trackX = 875;
    const minX = 690;
    const maxX = 1060;
    const y = 284;
    const track = s.add.rectangle((minX + maxX) / 2, y, maxX - minX, 6, 0x404b41, 1)
      .setStrokeStyle(1, 0x9ba69a, 0.55);
    const fill = s.add.rectangle(minX, y, Math.max(2, volume * (maxX - minX)), 4, 0xa3b487, 1)
      .setOrigin(0, 0.5);
    const thumb = s.add.circle(minX + volume * (maxX - minX), y, 10, 0xe8ebe4, 1)
      .setStrokeStyle(2, 0x849278, 1);
    const hit = s.add.rectangle(trackX, y, maxX - minX + 26, 34, 0xffffff, 0.001)
      .setInteractive({ useHandCursor: true });
    hit.on("pointerdown", (pointer) => {
      this.volumeDragging = true;
      this.setVolumeFromPointer(pointer);
    });
    this.content.add([track, fill, thumb, hit]);
    this.volumeUi = { fill, thumb, minX, maxX, y };

    this.addRow(370, ui.muteLabel, soundManager.muted ? t.stateOff : t.stateOn, {
      onNext: () => {
        soundManager.toggleMute();
        this.scene.refreshMenuLanguage();
        this.scene.refreshModalContent();
      }
    });
    this.addRow(460, ui.audioLayersLabel, ui.audioLayersValue, { accent: true });
  }

  renderLanguage(t, ui) {
    const lang = this.scene.lang;
    this.addRow(275, t.languageLabel, `${t.languageNames[lang]} (${lang})`, {
      onNext: () => this.scene.cycleLanguage(),
      onPrev: () => this.scene.cycleLanguage(),
      accent: true
    });
    this.addRow(375, ui.storyVoiceLabel, ui.storyVoiceValue, { accent: true });
    this.addRow(475, ui.customerVoiceLabel, ui.customerVoiceValue, { accent: true });
  }

  renderGameplay(t, ui) {
    const s = saveManager.state;
    const difficulties = ["EASY", "NORMAL", "HARD"];
    const currentIndex = Math.max(0, difficulties.indexOf(s.difficulty));
    this.addRow(245, t.difficultyLabel, t.difficultyNames[s.difficulty] || s.difficulty, {
      onPrev: () => this.setDifficulty(difficulties[(currentIndex + difficulties.length - 1) % difficulties.length]),
      onNext: () => this.setDifficulty(difficulties[(currentIndex + 1) % difficulties.length])
    });
    this.addRow(325, t.ironLabel, s.ironNight ? t.stateOn : t.stateOff, {
      onNext: () => {
        s.ironNight = !s.ironNight;
        saveManager.save();
        this.scene.refreshModalContent();
      }
    });
    this.addRow(405, ui.campaignStatus, `${ui.nightShort} ${s.currentNight}  •  ${ui.cashShort} $${s.cash}`, { accent: true });

    const reset = this.scene.add.rectangle(640, 490, 950, 54, 0x26100f, 0.92)
      .setStrokeStyle(1, 0x9c3932, 0.8)
      .setInteractive({ useHandCursor: true });
    const resetText = this.scene.add.text(640, 490, ui.reset, {
      fontFamily: "'Courier New', monospace",
      fontSize: "15px",
      fontStyle: "bold",
      color: "#e6a09b",
      letterSpacing: 0.8
    }).setOrigin(0.5);
    reset.on("pointerdown", () => {
      soundManager.playBeep(true);
      saveManager.resetCampaignKeepCodex();
      this.scene.scene.restart();
    });
    this.content.add([reset, resetText]);
    const resetNote = this.scene.add.text(640, 535, ui.resetNote, {
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      color: "#9aa398",
      align: "center",
      wordWrap: { width: 930 }
    }).setOrigin(0.5);
    this.content.add(resetNote);
  }

  toggleSetting(key) {
    saveManager.state.settings[key] = !saveManager.state.settings[key];
    saveManager.save();
    this.scene.refreshModalContent();
  }

  setDifficulty(value) {
    saveManager.state.difficulty = value;
    saveManager.save();
    this.scene.refreshModalContent();
  }

  setVolumeFromPointer(pointer) {
    const value = Phaser.Math.Clamp((pointer.x - this.volumeUi.minX) / (this.volumeUi.maxX - this.volumeUi.minX), 0, 1);
    saveManager.state.settings.volume = value;
    saveManager.save();
    soundManager.setVolume(value);
    this.scene.sound.volume = value;
    this.volumeUi.fill.setSize(Math.max(2, value * (this.volumeUi.maxX - this.volumeUi.minX)), 4);
    this.volumeUi.thumb.setPosition(this.volumeUi.minX + value * (this.volumeUi.maxX - this.volumeUi.minX), this.volumeUi.y);
    if (this.volumeValueText) this.volumeValueText.setText(`${Math.round(value * 100)}%`);
  }
}
