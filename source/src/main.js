import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { IntroScene } from "./scenes/IntroScene.js";
import { StoryIntroScene } from "./scenes/StoryIntroScene.js";
import { MainMenu } from "./scenes/MainMenu.js";
import { Main } from "./scenes/Main.js";
import { ArcadeScene } from "./scenes/ArcadeScene.js";
import { ShopScene } from "./scenes/ShopScene.js";
import { GameOver } from "./scenes/GameOver.js";

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 1280,
  height: 720,
  backgroundColor: "#050806",
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, IntroScene, StoryIntroScene, MainMenu, Main, ArcadeScene, ShopScene, GameOver]
};

window.addEventListener("load", () => {
  new Phaser.Game(config);
});
