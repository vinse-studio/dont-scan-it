import Phaser from "phaser";
import { LOCALES } from "../scripts/Locale.js";
import { soundManager } from "../scripts/SoundManager.js";

const MAZE = [
  "###########",
  "#P..#....C#",
  "#.#.#.##..#",
  "#.#...#...#",
  "#...#...#.#",
  "###.#.#...#",
  "#C..#..#C.#",
  "#....G....#",
  "###########"
];

export class ArcadeScene extends Phaser.Scene {
  constructor() {
    super("ArcadeScene");
  }

  create() {
    this.lang = this.registry.get("lang") || "UZ";
    this.t = LOCALES[this.lang].arcade;
    this.mainScene = this.scene.get("Main");
    this.scene.pause("Main");
    this.add.rectangle(640, 360, 1280, 720, 0x020403, 0.93).setDepth(1999);
    this.add.rectangle(640, 360, 840, 630, 0x07120d, 0.99).setStrokeStyle(4, 0x4ade80).setDepth(1999);
    this.add.text(640, 65, this.t.title, { fontFamily: "Impact, sans-serif", fontSize: "34px", color: "#4ade80", letterSpacing: 3 }).setOrigin(0.5).setDepth(2001);
    this.infoText = this.add.text(640, 112, "", { fontFamily: "'Courier New', monospace", fontSize: "17px", fontStyle: "bold", color: "#fde68a" }).setOrigin(0.5).setDepth(2001);
    this.helpText = this.add.text(640, 615, this.t.help, { fontFamily: "'Courier New', monospace", fontSize: "14px", color: "#cbd5e1", align: "center", wordWrap: { width: 700 } }).setOrigin(0.5).setDepth(2001);
    this.quitText = this.add.text(1025, 72, this.t.quit, { fontFamily: "'Courier New', monospace", fontSize: "16px", fontStyle: "bold", color: "#fca5a5", backgroundColor: "#450a0a", padding: { x: 10, y: 6 } }).setOrigin(0.5).setDepth(2002).setInteractive({ useHandCursor: true });
    this.quitText.on("pointerdown", () => this.finish(false, true));

    this.map = MAZE.map((row) => row.split(""));
    this.player = { x: 1, y: 1 };
    this.ghost = { x: 5, y: 7 };
    this.coins = new Set();
    this.tiles = [];
    const tile = 46;
    const originX = 640 - (11 * tile) / 2;
    const originY = 158;
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const value = this.map[y][x];
        const px = originX + x * tile + tile / 2;
        const py = originY + y * tile + tile / 2;
        const wall = value === "#";
        const rect = this.add.rectangle(px, py, tile - 3, tile - 3, wall ? 0x1e293b : 0x0b1d14).setDepth(2001);
        rect.setStrokeStyle(1, wall ? 0x334155 : 0x14532d);
        this.tiles.push(rect);
        if (value === "C") {
          this.coins.add(`${x},${y}`);
          this.add.circle(px, py, 9, 0xfacc15).setStrokeStyle(2, 0xfef3c7).setDepth(2002);
        }
        if (value === "P") this.player = { x, y };
        if (value === "G") this.ghost = { x, y };
      }
    }
    this.tileSize = tile;
    this.originX = originX;
    this.originY = originY;
    this.playerSprite = this.add.circle(0, 0, 15, 0x4ade80).setStrokeStyle(3, 0xecfccb).setDepth(2004);
    this.ghostSprite = this.add.star(0, 0, 5, 8, 18, 0xef4444).setStrokeStyle(2, 0xfca5a5).setDepth(2004);
    this.collected = 0;
    this.secondsLeft = 45;
    this.moveLocked = false;
    this.gameEnded = false;
    this.placeActors();
    this.updateInfo();

    this.input.keyboard?.on("keydown", (event) => {
      const key = event.key.toLowerCase();
      const moves = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
      if (key === "escape") this.finish(false, true);
      else if (moves[key]) this.movePlayer(...moves[key]);
    });

    const controls = [
      { label: "▲", x: 1030, y: 470, dx: 0, dy: -1 },
      { label: "▼", x: 1030, y: 550, dx: 0, dy: 1 },
      { label: "◀", x: 985, y: 510, dx: -1, dy: 0 },
      { label: "▶", x: 1075, y: 510, dx: 1, dy: 0 }
    ];
    controls.forEach(({ label, x, y, dx, dy }) => {
      const bg = this.add.rectangle(x, y, 64, 58, 0x14532d).setStrokeStyle(2, 0x4ade80).setDepth(2002).setInteractive({ useHandCursor: true });
      this.add.text(x, y, label, { fontFamily: "sans-serif", fontSize: "25px", fontStyle: "bold", color: "#ecfccb" }).setOrigin(0.5).setDepth(2003);
      bg.on("pointerdown", () => this.movePlayer(dx, dy));
    });

    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      if (this.gameEnded) return;
      this.secondsLeft--;
      if (this.secondsLeft <= 0) this.finish(false);
      this.updateInfo();
    }});
    this.time.addEvent({ delay: 720, loop: true, callback: () => this.moveGhost() });
  }

  placeActors() {
    const center = (p) => ({ x: this.originX + p.x * this.tileSize + this.tileSize / 2, y: this.originY + p.y * this.tileSize + this.tileSize / 2 });
    this.playerSprite.setPosition(center(this.player).x, center(this.player).y);
    this.ghostSprite.setPosition(center(this.ghost).x, center(this.ghost).y);
  }

  movePlayer(dx, dy) {
    if (this.gameEnded || this.moveLocked) return;
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    if (this.map[ny]?.[nx] === "#") return;
    this.player = { x: nx, y: ny };
    this.moveLocked = true;
    this.time.delayedCall(115, () => { this.moveLocked = false; });
    soundManager.playMenuHover();
    const key = `${nx},${ny}`;
    if (this.coins.delete(key)) {
      this.collected++;
      const px = this.originX + nx * this.tileSize + this.tileSize / 2;
      const py = this.originY + ny * this.tileSize + this.tileSize / 2;
      this.add.circle(px, py, 9, 0x0b1d14).setDepth(2003);
      soundManager.playCoinChime();
      if (this.collected >= 3) { this.placeActors(); this.finish(true); return; }
    }
    this.placeActors();
    this.checkCaught();
    this.updateInfo();
  }

  moveGhost() {
    if (this.gameEnded) return;
    const options = [[0,-1],[0,1],[-1,0],[1,0]].map(([dx,dy]) => ({ x: this.ghost.x + dx, y: this.ghost.y + dy }))
      .filter((p) => this.map[p.y]?.[p.x] !== "#");
    options.sort((a,b) => (Math.abs(a.x-this.player.x)+Math.abs(a.y-this.player.y)) - (Math.abs(b.x-this.player.x)+Math.abs(b.y-this.player.y)));
    const next = options[0];
    if (next) this.ghost = next;
    this.placeActors();
    this.checkCaught();
  }

  checkCaught() {
    if (this.player.x === this.ghost.x && this.player.y === this.ghost.y) this.finish(false);
  }

  updateInfo() {
    this.infoText.setText(`${this.t.collect}: ${this.collected}/3     ${this.t.time}: ${this.secondsLeft}s`);
  }

  finish(success, quit = false) {
    if (this.gameEnded) return;
    this.gameEnded = true;
    const main = this.mainScene;
    this.scene.stop();
    this.scene.resume("Main");
    if (!quit) main.onArcadeFinished(success);
  }
}
