export const BASE_CONFIG = {
  seed: "bungi",

  renderDistance: 3,

  /**
   * How many chunks to load in each direction starting at the player
   */
  loadDistance: 3,

  transparency: true,

  fovFactor: 0.6,

  glFov: (45 * Math.PI) / 180,

  terrain: {
    generateChunks: true,
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
    /**
     * Make the world load forever in all directions.
     * If off the world loads to the size of Config.loadDistance
     */
    infiniteGen: true,
  },

  gravity: -0.013,

  player: {
    speed: 0.2,
    reach: 10,
    // jumpSpeed: 0.16,
    jumpSpeed: 0.25,
    mouseRotSpeed: 0.002,
    thirdPersonCamDist: 6,
  },
};

export let CONFIG = BASE_CONFIG;

export type IConfig = typeof CONFIG;

export function setConfig(config: IConfig) {
  CONFIG = { ...config };
}

// declare var window;

// if (window)
//   (window as any).config = CONFIG;
