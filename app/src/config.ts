export const BASE_CONFIG = {
  seed: "bungus",

  renderDistance: 1,
  loadDistance: 1,

  transparency: true,

  fovFactor: .6,

  glFov: (45 * Math.PI) / 180,

  terrain: {
    jagFactor: 32,
    maxHeight: 12,
    cloudLevel: 30,
    waterLever: -1,
    chunkSize: 8,
    // chunkSize: 4,
    flatWorld: false,
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

// declare var window;

// if (window)
//   (window as any).config = CONFIG;