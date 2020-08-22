import seedrandom from "seedrandom";
import random from "random";
import { CONFIG } from "../constants";
import simplexNoise from "simplex-noise";

class RandomClass {
  _rndNoise: simplexNoise;

  constructor() {
    random.use(seedrandom(CONFIG.seed));

    this._rndNoise = new simplexNoise(CONFIG.seed);
  }

  noise(x: number, y: number) {
    return this._rndNoise.noise2D(x / 32, y / 32);
  }


}


const Random = new RandomClass();
export default Random;