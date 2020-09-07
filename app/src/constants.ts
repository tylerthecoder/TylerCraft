export const CONFIG = {
  renderDistance: 4,
  playerSpeed: .2,
  playerReach: 10,
  seed: "bungus",

  transparency: true,

  fovFactor: .6,

  terrain: {
    jagFactor: 32,
    maxHeight: 10,
    flatWorld: false,
    chunkSize: 16,
    cloudLevel: 30,
    // flatWorld: true,
    // chunkSize: 4,
  },

  gravity: -0.009,

  player: {
    jumpSpeed: 0.14,
    rotSpeed: 0.002,
  }
};

// declare var window;

// if (window)
//   (window as any).config = CONFIG;