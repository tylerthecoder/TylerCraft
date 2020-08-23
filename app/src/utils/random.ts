import seedrandom from "seedrandom";
import random from "random";
import { CONFIG } from "../constants";
import simplexNoise from "simplex-noise";

class RandomClass {
  _rndNoise: simplexNoise;

  jagFactor = CONFIG.terrain.jagFactor;

  constructor() {
    random.use(seedrandom(CONFIG.seed));

    this._rndNoise = new simplexNoise(CONFIG.seed);
  }

  // returns random number from [0,1]
  noise(x: number, y: number) {
    const num = this._rndNoise.noise2D(x / this.jagFactor, y / this.jagFactor);
    return (num + 1) / 2;
  }


}


const Random = new RandomClass();
export default Random;