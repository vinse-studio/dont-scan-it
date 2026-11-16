import { ITEM_CATALOG } from "./ItemData.js";
import { CUSTOMER_ARCHETYPES, CUSTOMER_CLASSES } from "./CustomerData.js";
import { LOCALES } from "./Locale.js";
import { saveManager } from "./SaveManager.js";

export class CounterController {
  constructor() {
    this.resetShift();
  }

  resetShift() {
    this.night = saveManager.state.currentNight || 1;
    this.hour = 0; // 00:00 to 06:00
    this.elapsedSeconds = 0;
    this.secondsPerHour = 48; // ~4.8 mins per night
    this.warnings = 0;
    this.maxWarnings = 2;
    this.customersProcessed = 0;
    this.anomaliesEliminated = 0;
    this.stashedAnomalies = 0;
    this.collectorPaidThisShift = false;
    const difficulty = saveManager.state.difficulty || "NORMAL";
    const ironBonus = saveManager.state.ironNight ? 12 : 0;
    this.maxWarnings = saveManager.state.ironNight ? 1 : 2;
    this.paranormalThreat = Math.min(100, (this.night - 1) * 12 + (difficulty === "HARD" ? 14 : difficulty === "EASY" ? -10 : 0) + ironBonus); // 0 to 100
    this.currentEncounter = null;
  }

  generateEncounter(lang = "UZ") {
    const t = LOCALES[lang] || LOCALES.UZ;
    const regularArchetypeIndices = [0, 1, 2, 3, 4, 8, 9, 10];
    let archIdx = regularArchetypeIndices[Math.floor(Math.random() * regularArchetypeIndices.length)];
    let arch = CUSTOMER_ARCHETYPES[archIdx];

    // Higher nights & higher threat increase anomaly spawn rate
    const threatBonus = Math.min(0.22, this.paranormalThreat * 0.0025);
    const humanChance = Math.max(0.28, 0.50 - threatBonus);
    const doppelChance = 0.35 + threatBonus * 0.7;

    const roll = Math.random();
    let customerClass = CUSTOMER_CLASSES.HUMAN;
    if (roll < humanChance) {
      customerClass = CUSTOMER_CLASSES.HUMAN;
    } else if (roll < humanChance + doppelChance) {
      customerClass = CUSTOMER_CLASSES.DOPPEL;
    } else {
      customerClass = CUSTOMER_CLASSES.PARASITE;
    }
    if (customerClass !== CUSTOMER_CLASSES.HUMAN && this.night >= 2) {
      const family = Math.random();
      if (family < 0.13) customerClass = CUSTOMER_CLASSES.MIMIC;
      else if (family < 0.26) customerClass = CUSTOMER_CLASSES.ECHO;
      else if (family < 0.39) customerClass = CUSTOMER_CLASSES.SHADE;
    }

    if (customerClass === CUSTOMER_CLASSES.MIMIC) { archIdx = 5; arch = CUSTOMER_ARCHETYPES[5]; }
    else if (customerClass === CUSTOMER_CLASSES.ECHO) { archIdx = 6; arch = CUSTOMER_ARCHETYPES[6]; }
    else if (customerClass === CUSTOMER_CLASSES.SHADE) { archIdx = 7; arch = CUSTOMER_ARCHETYPES[7]; }

    // Three-item baskets are uncommon: they add inspection and change-making pressure.
    const basketRoll = Math.random();
    const itemCount = basketRoll < 0.18 ? 3 : basketRoll < 0.68 ? 2 : 1;
    const item1Base = ITEM_CATALOG[Math.floor(Math.random() * ITEM_CATALOG.length)];
    let item2Base = ITEM_CATALOG[Math.floor(Math.random() * ITEM_CATALOG.length)];
    let item3Base = ITEM_CATALOG[Math.floor(Math.random() * ITEM_CATALOG.length)];

    if (customerClass === CUSTOMER_CLASSES.HUMAN && itemCount > 1) {
      const chosen = [item1Base];
      for (let i = 1; i < itemCount; i++) {
        let candidate = i === 1 ? item2Base : item3Base;
        if (chosen.some((item) => item.id === candidate.id)) {
          const others = ITEM_CATALOG.filter((item) => !chosen.some((used) => used.id === item.id));
          candidate = others[Math.floor(Math.random() * others.length)];
        }
        chosen.push(candidate);
        if (i === 1) item2Base = candidate; else item3Base = candidate;
      }
    }

    const tells = {
      neverBlinks: false,
      identicalItems: false,
      uvSigil: false,
      flickerFace: false,
      register666: false,
      wrongWeight: false,
      expired1998: false,
      creepyInterrogation: false,
      mutatedItem: false,
      mirrorLag: false,
      repeatedSpeech: false,
      missingShadow: false
    };
    if (customerClass === CUSTOMER_CLASSES.MIMIC) tells.mirrorLag = true;
    if (customerClass === CUSTOMER_CLASSES.ECHO) tells.repeatedSpeech = true;
    if (customerClass === CUSTOMER_CLASSES.SHADE) tells.missingShadow = true;

    const traitTags = [];

    if (customerClass === CUSTOMER_CLASSES.DOPPEL) {
      const pool = [
        "neverBlinks",
        "uvSigil",
        "flickerFace",
        "register666",
        "wrongWeight",
        "expired1998",
        "creepyInterrogation"
      ];
      if (this.hour >= 1 && itemCount === 2) {
        pool.push("identicalItems");
      }
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const count = this.night >= 4 ? 2 : 3;
      for (let i = 0; i < count; i++) {
        tells[shuffled[i]] = true;
      }
    } else if (customerClass === CUSTOMER_CLASSES.PARASITE) {
      tells.mutatedItem = true;
      tells.uvSigil = true;
      tells.wrongWeight = true;
      tells.creepyInterrogation = true;
    } else {
      traitTags.push("[Normal]");
    }

    if (tells.neverBlinks) traitTags.push("[Unblinking]");
    if (tells.wrongWeight) traitTags.push("[Wrong Weight]");
    if (tells.expired1998) traitTags.push("[Expired 1998]");
    if (tells.uvSigil) traitTags.push("[UV Sigil]");
    if (tells.flickerFace) traitTags.push("[Flicker Shadow]");

    // A clean human customer never offers a bribe.
    const offersBribe = customerClass !== CUSTOMER_CLASSES.HUMAN && Math.random() < 0.22;
    const bribeAmount = offersBribe ? 65 + Math.floor(Math.random() * 8) * 5 : 0;
    if (offersBribe) traitTags.push("[Briber]");

    const anomWeights = [66.6, 0.0, 13.37];
    const buildItemObj = (base, forceMutated) => {
      const isAnomItem = forceMutated || tells.register666 || tells.wrongWeight || tells.expired1998;
      const weightKg = tells.wrongWeight || forceMutated
        ? anomWeights[Math.floor(Math.random() * anomWeights.length)]
        : Number((base.normalWeightKg + (Math.random() * 0.08 - 0.04)).toFixed(2));
      const serialYear = tells.expired1998 || forceMutated ? 1998 : 2026 + (Math.random() < 0.5 ? 1 : 0);
      return {
        base,
        isMutated: forceMutated,
        isError666: tells.register666,
        isAnomItem,
        weightKg,
        serialYear,
        inspected: false,
        stashed: false,
        resolved: false
      };
    };

    const items = [];
    if (itemCount === 1) {
      const isMut =
        customerClass === CUSTOMER_CLASSES.PARASITE ||
        (customerClass === CUSTOMER_CLASSES.DOPPEL && this.hour === 0 && Math.random() < 0.45);
      if (isMut) tells.mutatedItem = true;
      items.push(buildItemObj(item1Base, isMut));
    } else {
      const secondBase = tells.identicalItems ? item1Base : item2Base;
      const mutateIdx = customerClass === CUSTOMER_CLASSES.PARASITE ? Math.floor(Math.random() * 2) : -1;
      items.push(buildItemObj(item1Base, mutateIdx === 0));
      items.push(buildItemObj(secondBase, mutateIdx === 1));
      if (itemCount === 3) {
        items.push(buildItemObj(item3Base, customerClass === CUSTOMER_CLASSES.PARASITE && mutateIdx === 2));
      }
    }

    const gender = arch.gender || "male";
    const greetingPool = customerClass === CUSTOMER_CLASSES.HUMAN
      ? t[`greetings${gender === "female" ? "Female" : "Male"}`]
      : t[`greetingsParasite${gender === "female" ? "Female" : "Male"}`];
    let greeting = "";
    let greetingVoiceKey = null;
    if (offersBribe) {
      const suffix = gender === "female" ? "Female" : "Male";
      greeting = t[`bribeOffer${suffix}`] || t.bribeOfferLine.replace("${amt}", String(bribeAmount));
      greetingVoiceKey = `customer_${lang.toLowerCase()}_${gender}_bribe`;
    } else {
      const greetingIndex = Math.floor(Math.random() * greetingPool.length);
      greeting = greetingPool[greetingIndex];
      const voiceGroup =
        customerClass === CUSTOMER_CLASSES.HUMAN ? "human" : "parasite";
      greetingVoiceKey = `customer_${lang.toLowerCase()}_${gender}_${voiceGroup}_${String(greetingIndex + 1).padStart(2, "0")}`;
    }

    // Customer archetypes 0..4 map to codex 01..05; new regular portraits map to 16..18.
    const custCodexId = archIdx <= 4
      ? `codex_${String(archIdx + 1).padStart(2, "0")}`
      : `codex_${String(archIdx + 8).padStart(2, "0")}`;
    const itemCodexNum = parseInt(items[0].base.id.replace("item_0", ""), 10) + 5;
    const itemCodexId = `codex_${String(itemCodexNum).padStart(2, "0")}`;

    this.currentEncounter = {
      archetype: arch,
      customerClass,
      tells,
      traitTags,
      items,
      greeting,
      greetingVoiceKey,
      offersBribe,
      bribeAmount,
      bribeResolved: false,
      revealedTrueForm: false,
      uvExposureTime: 0,
      uvAngered: false,
      custCodexId,
      itemCodexId
    };

    if (customerClass !== CUSTOMER_CLASSES.HUMAN) {
      const special = customerClass === CUSTOMER_CLASSES.MIMIC ? "codex_13" : customerClass === CUSTOMER_CLASSES.ECHO ? "codex_14" : customerClass === CUSTOMER_CLASSES.SHADE ? "codex_15" : custCodexId;
      this.currentEncounter.custCodexId = special;
      saveManager.recordBestiary(special);
    }
    if (items.some((it) => it.isMutated || it.isAnomItem)) {
      saveManager.recordBestiary(itemCodexId);
    }

    return this.currentEncounter;
  }

  getBranchingAnswer(questionIndex, lang = "UZ") {
    const t = LOCALES[lang] || LOCALES.UZ;
    const enc = this.currentEncounter;
    if (!enc) return "";

    const isAnom = enc.customerClass !== CUSTOMER_CLASSES.HUMAN &&
      (enc.tells.creepyInterrogation || enc.revealedTrueForm || enc.tells.mirrorLag || enc.tells.repeatedSpeech || enc.tells.missingShadow);

    if (enc.customerClass === CUSTOMER_CLASSES.MIMIC) return t.specialMimicAnswers[questionIndex];
    if (enc.customerClass === CUSTOMER_CLASSES.ECHO) return t.specialEchoAnswers[questionIndex];
    if (enc.customerClass === CUSTOMER_CLASSES.SHADE) return t.specialShadeAnswers[questionIndex];
    if (questionIndex === 0) {
      const pool = isAnom ? t.answersWhereAnomaly : t.answersWhereHuman;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    if (questionIndex === 1) {
      const pool =
        enc.customerClass !== CUSTOMER_CLASSES.HUMAN &&
        (enc.tells.wrongWeight || enc.tells.expired1998 || enc.tells.mutatedItem || isAnom)
          ? t.answersItemAnomaly
          : t.answersItemHuman;
      return pool[Math.floor(Math.random() * pool.length)];
    }
    const pool =
      enc.customerClass !== CUSTOMER_CLASSES.HUMAN && (enc.tells.neverBlinks || isAnom)
        ? t.answersLightAnomaly
        : t.answersLightHuman;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}
