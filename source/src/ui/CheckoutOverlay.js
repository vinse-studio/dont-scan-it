import { soundManager } from "../scripts/SoundManager.js";

export class CheckoutOverlay {
  constructor(scene) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(120).setVisible(false);
    this.due = 0;
    this.tender = 0;
    this.counted = 0;
    this.accepted = false;
    this.completing = false;
    this.finalized = false;
    this.labels = null;
    this.onComplete = null;
    this.method = "CASH";
    this.hasChange = false;

    const dim = scene.add.rectangle(640, 360, 1280, 720, 0x020403, 0.91).setInteractive();
    const panel = scene.add.rectangle(640, 360, 800, 570, 0x0b120e, 0.99).setStrokeStyle(3, 0x4ade80);
    const topRule = scene.add.rectangle(640, 128, 700, 2, 0x166534, 1);
    this.title = scene.add.text(640, 101, "", { fontFamily: "'Courier New', monospace", fontSize: "27px", fontStyle: "bold", color: "#4ade80" }).setOrigin(0.5);
    this.totalText = scene.add.text(640, 158, "", { fontFamily: "'Courier New', monospace", fontSize: "19px", fontStyle: "bold", color: "#f4f4f5" }).setOrigin(0.5);
    this.tenderText = scene.add.text(640, 198, "", { fontFamily: "'Courier New', monospace", fontSize: "17px", fontStyle: "bold", color: "#fde047" }).setOrigin(0.5);
    this.changeDueText = scene.add.text(640, 236, "", { fontFamily: "'Courier New', monospace", fontSize: "17px", fontStyle: "bold", color: "#a7f3d0" }).setOrigin(0.5);
    this.countedText = scene.add.text(640, 274, "", { fontFamily: "'Courier New', monospace", fontSize: "16px", color: "#e5e7eb" }).setOrigin(0.5);

    this.cashNote = this.createBill(0x14532d, "#dcfce7");
    this.changeNote = this.createBill(0x1e3a8a, "#dbeafe");
    this.changeNote.setVisible(false);
    this.acceptButton = this.addButton(640, 359, 370, 48, "", () => this.acceptPayment(), 0x14532d, 0x4ade80);
    this.denomButtons = [];
    [1, 5, 10, 20, 50].forEach((amount, index) => {
      const x = 410 + index * 115;
      this.denomButtons.push(this.addButton(x, 431, 102, 50, `+$${amount}`, () => this.addChange(amount), 0x26342b, 0x64748b, 13));
    });
    this.clearButton = this.addButton(475, 505, 190, 48, "", () => this.clearChange(), 0x3f1d1d, 0xf87171);
    this.giveButton = this.addButton(805, 505, 250, 48, "", () => this.giveChange(), 0x164e63, 0x38bdf8);
    this.statusText = scene.add.text(640, 566, "", { fontFamily: "'Courier New', monospace", fontSize: "15px", fontStyle: "bold", color: "#fde68a", align: "center", wordWrap: { width: 700 } }).setOrigin(0.5);

    this.root.add([dim, panel, topRule, this.title, this.totalText, this.tenderText, this.changeDueText, this.countedText,
      this.cashNote, this.changeNote, this.acceptButton.bg, this.acceptButton.label,
      ...this.denomButtons.flatMap((button) => [button.bg, button.label]), this.clearButton.bg, this.clearButton.label,
      this.giveButton.bg, this.giveButton.label, this.statusText]);
  }

  createBill(fill, textColor) {
    const bill = this.scene.add.container(420, 330);
    const bg = this.scene.add.rectangle(0, 0, 112, 48, fill).setStrokeStyle(2, 0x86efac);
    const amount = this.scene.add.text(0, 0, "", { fontFamily: "'Courier New', monospace", fontSize: "19px", fontStyle: "bold", color: textColor }).setOrigin(0.5);
    bill.add([bg, amount]);
    bill.amountLabel = amount;
    return bill;
  }

  addButton(x, y, width, height, text, callback, fill, stroke, fontSize = 14) {
    const bg = this.scene.add.rectangle(x, y, width, height, fill).setStrokeStyle(2, stroke).setInteractive({ useHandCursor: true });
    const label = this.scene.add.text(x, y, text, { fontFamily: "'Courier New', monospace", fontSize: `${fontSize}px`, fontStyle: "bold", color: "#f4f4f5", align: "center", wordWrap: { width: width - 12 } }).setOrigin(0.5);
    bg.on("pointerover", () => { if (bg.input?.enabled) bg.setAlpha(0.88); });
    bg.on("pointerout", () => bg.setAlpha(1));
    bg.on("pointerdown", () => { soundManager.init(); callback(); });
    return { bg, label };
  }

  open({ due, tender, method = "CASH", locale, onComplete }) {
    this.due = Math.max(0, Math.round(due));
    this.method = method;
    this.tender = method === "CARD" ? this.due : Math.max(this.due, Math.round(tender));
    this.hasChange = method === "CASH" && this.tender > this.due;
    this.counted = 0;
    this.accepted = false;
    this.completing = false;
    this.finalized = false;
    this.labels = locale.paymentUi;
    this.onComplete = onComplete;
    this.cashNote.amountLabel.setText(method === "CARD" ? "CARD" : `$${this.tender}`);
    this.changeNote.amountLabel.setText(`$${this.tender - this.due}`);
    this.cashNote.setPosition(420, 330).setVisible(true);
    this.changeNote.setPosition(860, 330).setVisible(false);
    this.statusText.setText(method === "CARD" ? this.labels.cardPrompt : this.labels.acceptPrompt);
    this.root.setVisible(true);
    this.refresh();
  }

  refresh() {
    const labels = this.labels;
    this.title.setText(labels.title);
    this.totalText.setText(`${labels.totalDue}: $${this.due}`);
    this.tenderText.setText(this.method === "CARD" ? labels.cardMethod : `${labels.tender}: $${this.tender}`);
    this.changeDueText.setText(`${labels.changeDue}: $${this.hasChange ? this.tender - this.due : 0}`);
    this.countedText.setText(this.hasChange ? `${labels.changeCount}: $${this.counted}` : "");
    this.acceptButton.label.setText(this.accepted ? labels.cashAccepted : this.method === "CARD" ? labels.tapCard : labels.acceptCash);
    this.acceptButton.bg.setVisible(!this.accepted);
    this.acceptButton.label.setVisible(!this.accepted);
    this.denomButtons.forEach((button) => {
      button.bg.setVisible(this.hasChange);
      button.label.setVisible(this.hasChange);
      button.bg.setFillStyle(this.accepted ? 0x14532d : 0x26342b);
      this.setButtonEnabled(button, this.hasChange && this.accepted && !this.completing);
    });
    this.clearButton.bg.setVisible(this.hasChange);
    this.clearButton.label.setVisible(this.hasChange);
    this.giveButton.bg.setVisible(this.hasChange);
    this.giveButton.label.setVisible(this.hasChange);
    this.clearButton.label.setText(labels.clearChange);
    this.giveButton.label.setText(labels.giveChange);
    this.setButtonEnabled(this.acceptButton, !this.accepted && !this.completing);
    this.setButtonEnabled(this.clearButton, this.hasChange && this.accepted && !this.completing);
    this.setButtonEnabled(this.giveButton, this.hasChange && this.accepted && !this.completing);
  }

  setButtonEnabled(button, enabled) {
    const inputEnabled = Boolean(button.bg.input?.enabled);
    if (enabled && !inputEnabled) button.bg.setInteractive({ useHandCursor: true });
    else if (!enabled && inputEnabled) button.bg.disableInteractive();
    button.bg.setAlpha(enabled ? 1 : 0.55);
    button.label.setAlpha(enabled ? 1 : 0.55);
  }

  acceptPayment() {
    if (this.accepted || this.completing) return;
    this.accepted = true;
    soundManager.playRegisterRattle();
    this.statusText.setText(this.method === "CARD" ? this.labels.cardApproved : this.labels.cashAccepted);
    this.refresh();
    this.scene.tweens.killTweensOf(this.cashNote);
    this.scene.tweens.add({ targets: this.cashNote, x: 860, y: 330, duration: 650, ease: "Cubic.easeInOut", onComplete: () => {
      if (!this.root.visible) return;
      soundManager.playCoinChime();
      if (!this.hasChange) this.completePayment();
    }});
  }

  addChange(amount) {
    if (this.completing) return;
    if (!this.accepted) { this.statusText.setText(this.labels.acceptPrompt); soundManager.playBeep(true); return; }
    const due = this.tender - this.due;
    if (this.counted + amount > due) { this.statusText.setText(this.labels.tooMuchChange); soundManager.playBeep(true); return; }
    this.counted += amount;
    this.statusText.setText(this.counted === due ? this.labels.exactChange : this.labels.countingChange);
    soundManager.playBeep(false);
    this.refresh();
  }

  clearChange() {
    if (!this.accepted || this.completing) return;
    this.counted = 0;
    this.statusText.setText(this.labels.countingChange);
    soundManager.playBeep(false);
    this.refresh();
  }

  giveChange() {
    if (this.completing) return;
    if (!this.accepted || this.counted !== this.tender - this.due) {
      this.statusText.setText(this.labels.exactChange);
      soundManager.playBeep(true);
      return;
    }
    this.completing = true;
    this.refresh();
    this.changeNote.amountLabel.setText(`$${this.counted}`);
    this.changeNote.setPosition(860, 330).setVisible(true);
    soundManager.playRegisterRattle();
    this.scene.tweens.add({ targets: this.changeNote, x: 420, y: 330, duration: 650, ease: "Cubic.easeInOut", onComplete: () => this.completePayment() });
  }

  completePayment() {
    if (!this.root.visible || this.finalized) return;
    this.finalized = true;
    this.completing = true;
    this.refresh();
    this.statusText.setText(this.labels.paymentComplete);
    this.scene.time.delayedCall(300, () => {
      if (!this.root.visible) return;
      this.root.setVisible(false);
      const done = this.onComplete;
      this.onComplete = null;
      if (done) done();
    });
  }
}
