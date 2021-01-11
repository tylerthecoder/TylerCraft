export const BASE_CONFIG = {
  seed: "bungus",

  renderDistance: 2,
  loadDistance: 2,

  transparency: true,

  fovFactor: .6,

  glFov: (45 * Math.PI) / 180,

  terrain: {
    jagFactor: 32,
    maxHeight: 12,
    cloudLevel: 30,
    waterLever: -1,
    chunkSize: 16,
    // chunkSize: 4,
    flatWorld: true,
    // flatWorld: true,
    // trees: true,
    trees: false,
    // flowers: true,
    flowers: false,
  },

  gravity: -0.013,

  player: {
    speed: .2,
    reach: 10,
    // jumpSpeed: 0.16,
    jumpSpeed: 0.25,
    mouseRotSpeed: 0.002,
    thirdPersonCamDist: 6,
  }
};

export let CONFIG = BASE_CONFIG;

export type IConfig = typeof CONFIG;

export function setConfig(config: IConfig) {
  CONFIG = { ...config };
}

export const APP_NAME = "tylercraft";
export const SOCKET_SERVER_URL = `${process.env.SOCKET_SERVER_URL}?app=${APP_NAME}`;
export const SERVER_URL = process.env.SERVER_URL;

// declare var window;

// if (window)
//   (window as any).config = CONFIG;