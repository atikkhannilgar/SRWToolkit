export interface BotSkinData {
  image: string;
  height: string;
  customClassName: string;
}

export interface Skins {
  simple: BotSkinData;
  fullbot: BotSkinData;
  faceonly: BotSkinData;
}

export const skins: Skins = {
  simple: { image: "/assets/skins/simple.svg", height: "auto", customClassName: "avatar-simple-custom" },
  fullbot: { image: "/assets/skins/fullbot.png", height: "auto", customClassName: "avatar-fullbot-custom" },
  faceonly: { image: "/assets/skins/faceonly.png", height: "auto", customClassName: "avatar-faceonly-custom" },
};
