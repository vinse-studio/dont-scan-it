const SAVE_KEY = "vinse_dont_scan_it_v3_save";

const DEFAULT_SAVE = {
  currentNight: 1,       // 1 to 7 (8+ = Endless Overtime)
  endlessUnlocked: false,
  cash: 0,
  shells: 2,
  waterCharges: 4,
  taserCharges: 3,
  espressoActive: false,
  difficulty: "NORMAL",
  ironNight: false,
  unlockedEvidence: [],
  achievements: {},
  lifetime: { nights: 0, cleanScans: 0, mistakes: 0, bribes: 0, anomalies: 0, bestCash: 0 },
  campaignFlags: { lastChoice: "", storySeen: 0 },
  settings: { textScale: 1, reducedFlash: false, vibration: true, largeText: false, language: "UZ", volume: 0.7 },
  daily: { date: "", index: 0, progress: 0, completed: false },
  tutorialSeen: false,
  upgrades: {
    scale: false,        // Digital Counter Scale ($40)
    uvBattery: false,    // Overcharged UV Battery ($50) -> 2.5s to 5.0s
    bandolier: false,    // Bandolier Upgrade ($60) -> max 3 shells
    cctv: false,         // Backroom CCTV Feed ($55) -> [CAM] tab on CRT
    bribeFund: false     // Police Bribe Fund ($80) -> one-time arrest insurance
  },
  bestiary: {},          // { [anomalyId]: count } (18 entries total)
  endingsUnlocked: {}    // { SURVIVED_WEEK, CORRUPT_MILLIONAIRE, ARRESTED, FIRED, CONSUMED }
};

export class SaveManager {
  constructor() {
    this.state = this.load();
  }

  load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_SAVE));
      const parsed = JSON.parse(raw);
      return {
        ...JSON.parse(JSON.stringify(DEFAULT_SAVE)),
        ...parsed,
        upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) },
        bestiary: { ...(parsed.bestiary || {}) },
        endingsUnlocked: { ...(parsed.endingsUnlocked || {}) },
        lifetime: { ...DEFAULT_SAVE.lifetime, ...(parsed.lifetime || {}) },
        campaignFlags: { ...DEFAULT_SAVE.campaignFlags, ...(parsed.campaignFlags || {}) },
        settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings || {}) },
        unlockedEvidence: Array.isArray(parsed.unlockedEvidence) ? parsed.unlockedEvidence : [],
        achievements: { ...(parsed.achievements || {}) },
        daily: { ...DEFAULT_SAVE.daily, ...(parsed.daily || {}) }
      };
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_SAVE));
    }
  }

  save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    } catch (e) {}
  }

  resetCampaignKeepCodex() {
    const bestiary = { ...this.state.bestiary };
    const endingsUnlocked = { ...this.state.endingsUnlocked };
    const endlessUnlocked = this.state.endlessUnlocked;
    const settings = { ...this.state.settings };
    this.state = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    this.state.bestiary = bestiary;
    this.state.endingsUnlocked = endingsUnlocked;
    this.state.endlessUnlocked = endlessUnlocked;
    this.state.settings = { ...DEFAULT_SAVE.settings, ...settings };
    this.save();
  }

  ensureDaily() {
    const date = new Date().toISOString().slice(0, 10);
    if (this.state.daily.date !== date) {
      const seed = date.split("-").join("").split("").reduce((sum, n) => sum + Number(n), 0);
      this.state.daily = { date, index: seed % 3, progress: 0, completed: false };
      this.save();
    }
    return this.state.daily;
  }

  updateDaily(progress = 1) {
    const daily = this.ensureDaily();
    daily.progress += progress;
    const goal = daily.index === 0 ? 3 : 2;
    if (daily.index === 1 && daily.progress >= goal) daily.completed = true;
    this.save();
    return daily;
  }

  unlockAchievement(id) { this.state.achievements[id] = true; this.save(); }

  recordEvidence(id) {
    if (!this.state.unlockedEvidence.includes(id)) { this.state.unlockedEvidence.push(id); this.save(); }
  }

  getMaxShells() {
    return this.state.upgrades.bandolier ? 3 : 2;
  }

  getMaxUvSeconds() {
    return this.state.upgrades.uvBattery ? 5.0 : 2.5;
  }

  recordBestiary(entryId) {
    if (!entryId) return;
    this.state.bestiary[entryId] = (this.state.bestiary[entryId] || 0) + 1;
    this.save();
  }

  unlockEnding(endingKey) {
    if (!endingKey) return;
    this.state.endingsUnlocked[endingKey] = true;
    this.save();
  }

  getDiscoveredBestiaryCount() {
    return Object.keys(this.state.bestiary).length;
  }

  getUnlockedEndingsCount() {
    return Object.keys(this.state.endingsUnlocked).length;
  }
}

export const saveManager = new SaveManager();
