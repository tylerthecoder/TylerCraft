import seedrandom from "seedrandom";
import random from "random";
import { CONFIG } from "../config";
import simplexNoise from "simplex-noise";

class RandomClass {
  private _rndNoise: simplexNoise = new simplexNoise();
  private jagFactor = CONFIG.terrain.jagFactor;



  setSeed(seed: string) {
    console.log("Setting random seed", seed);
    random.use(seedrandom(seed));
    this._rndNoise = new simplexNoise(seed);
  }

  // returns random number from [0,1]
  noise(x: number, y: number) {
    return this.customNoise(x, y, this.jagFactor)
  }

  customNoise(x: number, y: number, jagFactor: number) {
    const num = this._rndNoise.noise2D(x / jagFactor, y / jagFactor);
    return (num + 1) / 2;
  }

  randomNum() {
    return random.float(0, 1);
  }

  randomInt(min: number, max: number) {
    return random.int(min, max);
  }

  randomFloat(min: number, max: number) {
    return random.float(min, max);
  }

  randomString() {
    return random.float(0, 1).toString();
  }

  randomElement<T>(data: T[]) {
    const rndIndex = this.randomInt(0, data.length - 1);
    return data[rndIndex];
  }
}


export const Random = new RandomClass();