export const CUSTOMER_ARCHETYPES = [
  {
    id: "cust_01",
    gender: "male",
    patienceSeconds: 36,
    normalTexture: "cust_01_normal",
    anomalyTexture: "cust_01_anomaly",
    names: {
      UZ: "Yashil Xudili Yigit",
      EN: "Green Hoodie Guy",
      RU: "Парень в худи"
    }
  },
  {
    id: "cust_02",
    gender: "female",
    patienceSeconds: 44,
    normalTexture: "cust_02_normal",
    anomalyTexture: "cust_02_anomaly",
    names: {
      UZ: "Plashli Ayol",
      EN: "Trenchcoat Woman",
      RU: "Женщина в плаще"
    }
  },
  {
    id: "cust_03",
    gender: "male",
    patienceSeconds: 46,
    normalTexture: "cust_03_normal",
    anomalyTexture: "cust_03_anomaly",
    names: {
      UZ: "Keksa Kishi",
      EN: "Old Man in Flannel",
      RU: "Старик в кепке"
    }
  },
  {
    id: "cust_04",
    gender: "female",
    patienceSeconds: 40,
    normalTexture: "cust_04_normal",
    anomalyTexture: "cust_04_anomaly",
    names: {
      UZ: "Tungi Hamshira",
      EN: "Night-Shift Nurse",
      RU: "Ночная медсестра"
    }
  },
  { id: "cust_05", gender: "male", patienceSeconds: 35, normalTexture: "cust_05_normal", anomalyTexture: "cust_05_anomaly", names: { UZ: "Charchagan Biznesmen", EN: "Tired Businessman", RU: "Уставший бизнесмен" } },
  { id: "cust_06", gender: "female", patienceSeconds: 39, normalTexture: "cust_02_normal", anomalyTexture: "cust_06_anomaly", names: { UZ: "Jim Turgan Xaridor", EN: "The Quiet Regular", RU: "Молчаливая покупательница" } },
  { id: "cust_07", gender: "male", patienceSeconds: 34, normalTexture: "cust_03_normal", anomalyTexture: "cust_07_anomaly", names: { UZ: "Aks-Sado Mijoz", EN: "The Echo Customer", RU: "Покупатель-эхо" } },
  { id: "cust_08", gender: "female", patienceSeconds: 42, normalTexture: "cust_04_normal", anomalyTexture: "cust_08_anomaly", names: { UZ: "Soyasiz Ayol", EN: "The Shadowless Woman", RU: "Женщина без тени" } },
  { id: "cust_09", gender: "male", patienceSeconds: 38, normalTexture: "cust_09_normal", anomalyTexture: "cust_09_anomaly", names: { UZ: "Yomg‘irli Kuryer", EN: "Rain-Soaked Courier", RU: "Курьер под дождём" } },
  { id: "cust_10", gender: "female", patienceSeconds: 42, normalTexture: "cust_10_normal", anomalyTexture: "cust_10_anomaly", names: { UZ: "Charchagan Talaba", EN: "Exhausted Student", RU: "Уставшая студентка" } },
  { id: "cust_11", gender: "male", patienceSeconds: 40, normalTexture: "cust_11_normal", anomalyTexture: "cust_11_anomaly", names: { UZ: "Tungi Novvoy", EN: "Night Baker", RU: "Ночной пекарь" } }
];

export const CUSTOMER_CLASSES = {
  HUMAN: "HUMAN",
  DOPPEL: "DOPPEL",
  PARASITE: "PARASITE",
  MIMIC: "MIMIC",
  ECHO: "ECHO",
  SHADE: "SHADE"
};

// 18 Bestiary Codex Entries tracked in the Notebook
export const BESTIARY_CODEX = [
  {
    id: "codex_01",
    sprite: "cust_01_anomaly",
    title: "1. Grinning Hoodie Mimic",
    tip: "Stares without blinking; Eliminate with Sawed-Off Shotgun."
  },
  {
    id: "codex_02",
    sprite: "cust_02_anomaly",
    title: "2. Hollow-Eyed Trench Doppel",
    tip: "Flashes split jaw during 200ms ceiling light flickers."
  },
  {
    id: "codex_03",
    sprite: "cust_03_anomaly",
    title: "3. Mandible Flannel Parasite",
    tip: "Hisses and brings mutated items; Repel with Holy Water (+$10)."
  },
  {
    id: "codex_04",
    sprite: "cust_04_anomaly",
    title: "4. Ward-666 Nurse Mimic",
    tip: "Carries 66.6kg or 1998 recalled medical/meat packages."
  },
  {
    id: "codex_05",
    sprite: "cust_05_anomaly",
    title: "5. Elongated Tie Broker",
    tip: "Offers dirty cash bribes ($65-$100) to sneak cursed goods past POS."
  },
  {
    id: "codex_06",
    sprite: "item_01_anomaly",
    title: "6. Ocular Flesh Carton",
    tip: "Staring eyeball carton; Stash under desk for the 04:00 AM Collector (+$45)."
  },
  {
    id: "codex_07",
    sprite: "item_02_anomaly",
    title: "7. Severed Finger Tray",
    tip: "Triggers ERROR: HUMAN MEAT 666 on CRT; Never scan."
  },
  {
    id: "codex_08",
    sprite: "item_03_anomaly",
    title: "8. Abyssal Tentacle Tin",
    tip: "Weighs 13.37kg on the Digital Counter Scale; Stash or spray owner."
  },
  {
    id: "codex_09",
    sprite: "item_04_anomaly",
    title: "9. Optic Nerve Pickle Jar",
    tip: "Reveals glowing 666 sigils under UV Flashlight inspection."
  },
  {
    id: "codex_10",
    sprite: "item_05_anomaly",
    title: "10. Hemorrhaging Energy Can",
    tip: "Serial year 1998; Stash under counter for Night Collector payout."
  },
  {
    id: "codex_11",
    sprite: "jumpscare_01",
    title: "11. Phone Line Voice Mimic",
    tip: "Imitates the Manager over the desk phone with fake rules and static."
  },
  {
    id: "codex_12",
    sprite: "jumpscare_02",
    title: "12. Backroom Storage Stalker",
    tip: "Peers through rear CCTV door; Slam Red Panic Button or fire warning shot."
  },
  { id: "codex_16", sprite: "cust_09_anomaly", title: "16. Rain-Soaked Courier", tip: "A familiar face returns with a borrowed shadow. Verify the customer before scanning." },
  { id: "codex_17", sprite: "cust_10_anomaly", title: "17. Exhausted Student", tip: "The eyes do not follow the light. Check the face again during a flicker." },
  { id: "codex_18", sprite: "cust_11_anomaly", title: "18. Night Baker", tip: "Its reflection lags behind. Compare the customer with the counter shadow." },
  { id: "codex_13", sprite: "cust_06_anomaly", title: "13. The Quiet Regular", tip: "Its reflection blinks a beat late. Compare customer and reflection." },
  { id: "codex_14", sprite: "cust_07_anomaly", title: "14. The Echo Customer", tip: "Repeats the last customer's words. Ask twice and compare the answers." },
  { id: "codex_15", sprite: "cust_08_anomaly", title: "15. The Shadowless Woman", tip: "Her shadow disappears during a light flicker. Watch the rear-wall silhouette." }
];
