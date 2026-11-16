import { ITEM_CATALOG } from "../scripts/ItemData.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.cameras.main.setBackgroundColor("#050806");

    this.add.text(w / 2, h / 2 - 24, "VINSE STUDIO", {
      fontFamily: "sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
      color: "#f8fafc",
      letterSpacing: 6
    }).setOrigin(0.5);

    const barBg = this.add.rectangle(w / 2, h / 2 + 16, 320, 6, 0x1a1f1c);
    const barFill = this.add.rectangle(w / 2 - 160, h / 2 + 16, 2, 6, 0xef4444).setOrigin(0, 0.5);

    this.load.on("progress", (val) => {
      barFill.width = Math.max(2, 320 * val);
    });

    const sprites = [
      "vinse_intro",
      // Batch A: 10 Customer sprites
      "cust_01_normal", "cust_01_anomaly",
      "cust_02_normal", "cust_02_anomaly",
      "cust_03_normal", "cust_03_anomaly",
      "cust_04_normal", "cust_04_anomaly",
      "cust_05_normal", "cust_05_anomaly",
      "cust_09_normal", "cust_10_normal", "cust_11_normal",
      // Grocery catalog textures (aliases may intentionally reuse existing art)
      ...new Set(ITEM_CATALOG.flatMap((item) => [item.normalTexture, item.anomalyTexture])),
      // Batch C: 10 Diegetic Desk Props & First-Person Hands
      "prop_scanner", "prop_shotgun", "prop_sprayer", "prop_taser", "prop_uv", "prop_notebook",
      "hand_shotgun", "hand_sprayer", "hand_taser", "hand_uv",
      // Batch D: 5 Environment & UI Layers
      "bg_store_far", "bg_shelves_mid", "counter_desk", "shutter", "brush_highlight",
      // Batch E: 4 Jumpscare & Ending Screens
      "jumpscare_01", "jumpscare_02", "ending_arrested", "ending_survived"
    ];

    const embedded = window.__EMBEDDED_SPRITES__ || null;
    sprites.forEach((key) => {
      if (embedded && embedded[key]) {
        this.load.image(key, embedded[key]);
      } else {
        this.load.image(key, `assets/sprites/${key}.png`);
      }
    });

    const voiceKinds = [
      "male_human_01", "male_human_02", "male_human_03",
      "female_human_01", "female_human_02", "female_human_03",
      "male_parasite_01", "male_parasite_02",
      "female_parasite_01", "female_parasite_02",
      "male_bribe", "female_bribe"
    ];
    const voiceClips = ["uz", "en", "ru"].flatMap((language) =>
      voiceKinds.map((kind) => `${language}_${kind}`)
    );
    voiceClips.forEach((clip) => {
      this.load.audio(`customer_${clip}`, `assets/audio/customers/${clip}.ogg`);
    });

    ["uz", "en", "ru"].forEach((language) => {
      for (let line = 1; line <= 8; line++) {
        const suffix = String(line).padStart(2, "0");
        this.load.audio(`story_${language}_${suffix}`, `assets/audio/story/${language}_${suffix}.ogg`);
      }
    });
  }

  create() {
    // Mandatory flood-fill background removal on all #FFFFFF-background sprites
    const cutoutKeys = [
      "cust_01_normal", "cust_01_anomaly",
      "cust_02_normal", "cust_02_anomaly",
      "cust_03_normal", "cust_03_anomaly",
      "cust_04_normal", "cust_04_anomaly",
      "cust_05_normal", "cust_05_anomaly",
      "cust_09_normal", "cust_10_normal", "cust_11_normal",
      "item_01_normal", "item_01_anomaly",
      "item_02_normal", "item_02_anomaly",
      "item_03_normal", "item_03_anomaly",
      "item_04_normal", "item_04_anomaly",
      "item_05_normal", "item_05_anomaly",
      "prop_scanner", "prop_shotgun", "prop_sprayer", "prop_taser", "prop_uv", "prop_notebook",
      "hand_shotgun", "hand_sprayer", "hand_taser", "hand_uv",
      "bg_shelves_mid", "counter_desk", "brush_highlight"
    ];

    cutoutKeys.forEach((key) => {
      this.removeSolidBackground(key);
    });

    if (!this.registry.get("lang")) {
      this.registry.set("lang", "UZ");
    }

    this.createAnomalyVariants();
    this.scene.start("IntroScene");
  }

  createAnomalyVariants() {
    const variants = [
      ["cust_02_anomaly", "cust_06_anomaly", "#9d174d"],
      ["cust_03_anomaly", "cust_07_anomaly", "#7c3aed"],
      ["cust_04_anomaly", "cust_08_anomaly", "#0f766e"],
      ["cust_09_normal", "cust_09_anomaly", "#a31926"],
      ["cust_10_normal", "cust_10_anomaly", "#8c1d3b"],
      ["cust_11_normal", "cust_11_anomaly", "#6b2024"]
    ];
    variants.forEach(([source, key, tint]) => {
      if (this.textures.exists(key) || !this.textures.exists(source)) return;
      const image = this.textures.get(source).getSourceImage();
      const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext("2d"); ctx.drawImage(image, 0, 0);
      ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = tint; ctx.globalAlpha = 0.28;
      ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = "source-over";
      this.textures.addCanvas(key, canvas);
    });
  }

  removeSolidBackground(textureKey) {
    if (!this.textures.exists(textureKey)) return;
    const tex = this.textures.get(textureKey);
    const srcImg = tex.getSourceImage();
    if (!srcImg || !srcImg.width || !srcImg.height) return;

    const w = srcImg.width;
    const h = srcImg.height;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(srcImg, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Special handling for brush_highlight (white paint stroke on dark/transparent bg)
    if (textureKey === "brush_highlight") {
      for (let i = 0; i < data.length; i += 4) {
        const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (lum < 65) {
          data[i + 3] = 0;
        } else {
          data[i] = 246;
          data[i + 1] = 246;
          data[i + 2] = 244;
          data[i + 3] = Math.min(255, Math.floor(lum * 1.15));
        }
      }
      ctx.putImageData(imgData, 0, 0);
      this.textures.remove(textureKey);
      this.textures.addCanvas(textureKey, canvas);
      return;
    }

    // Standard top-left solid background flood-fill removal
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];

    const isBgMatch = (idx) => {
      const a = data[idx + 3];
      if (a === 0) return true;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const dist = Math.hypot(r - bgR, g - bgG, b - bgB);
      const isNearWhite = r > 212 && g > 212 && b > 212;
      return dist < 56 || isNearWhite;
    };

    const visited = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    const pushSeed = (x, y) => {
      const p = y * w + x;
      if (!visited[p] && isBgMatch(p * 4)) {
        visited[p] = 1;
        queue[tail++] = p;
      }
    };

    // Seed from top, left, and right edges (for counter_desk, bottom edge is solid desk)
    for (let x = 0; x < w; x++) {
      pushSeed(x, 0);
      if (textureKey !== "counter_desk" && textureKey !== "bg_shelves_mid") {
        pushSeed(x, h - 1);
      }
    }
    for (let y = 0; y < h; y++) {
      if (textureKey !== "counter_desk" && textureKey !== "bg_shelves_mid") {
        pushSeed(0, y);
        pushSeed(w - 1, y);
      } else if (y < h * 0.42) {
        pushSeed(0, y);
        pushSeed(w - 1, y);
      }
    }

    while (head < tail) {
      const p = queue[head++];
      data[p * 4 + 3] = 0;
      const x = p % w;
      const y = (p / w) | 0;
      if (x > 0) pushSeed(x - 1, y);
      if (x < w - 1) pushSeed(x + 1, y);
      if (y > 0) pushSeed(x, y - 1);
      if (y < h - 1) pushSeed(x, y + 1);
    }

    ctx.putImageData(imgData, 0, 0);
    this.textures.remove(textureKey);
    this.textures.addCanvas(textureKey, canvas);
  }
}
