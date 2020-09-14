export const CONFIG = {
  renderDistance: 4,
  loadDistance: 4,
  seed: "bungus",

  transparency: true,

  fovFactor: .6,

  glFov: (45 * Math.PI) / 180,

  terrain: {
    jagFactor: 32,
    maxHeight: 12,
    cloudLevel: 30,
    waterLever: 3,
    chunkSize: 16,
    // chunkSize: 4,
    // flatWorld: true,
    flatWorld: false,
    trees: true,
    // trees: false,
    flowers: true,
    // flowers: false,
  },

  gravity: -0.013,

  player: {
    speed: .2,
    reach: 10,
    jumpSpeed: 0.16,
    rotSpeed: 0.002,
  }
};

// declare var window;

// if (window)
//   (window as any).config = CONFIG;