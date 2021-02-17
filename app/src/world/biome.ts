import Random from "../utils/random";
import { Vector2D, VectorIndex } from "../utils/vector";


export enum Biome {
  Plains,
  Mountain,
  Forest,
}

interface IBiomeInfo {
  maxHeight: number;
  sizeFactor: number;
}

const BiomeInfo = new Map<Biome, IBiomeInfo>();

BiomeInfo.set(Biome.Plains, {
  maxHeight: 4,
  sizeFactor: 2
});

BiomeInfo.set(Biome.Mountain, {
  maxHeight: 20,
  sizeFactor: .5
});

BiomeInfo.set(Biome.Forest, {
  maxHeight: 10,
  sizeFactor: 1
});

export function GetBiomeInfo(biome: Biome): IBiomeInfo {
  const biomeInfo = BiomeInfo.get(biome);
  if (!biomeInfo) throw new Error("Biome doesn't exist");
  return biomeInfo;
}

interface BiomeGridSectionWithBiome {
  hasBiome: true;
  sectionPos: Vector2D;
  biome: Biome;
  biomeWorldPos: Vector2D;
}

interface BiomeGridSectionWithoutBiome {
  hasBiome: false;
  sectionPos: Vector2D;
}


type BiomeGridSection = BiomeGridSectionWithBiome | BiomeGridSectionWithoutBiome;


export const BIOME_SIZE = 60;
// This should be a function of the heights of the two biomes
const BIOME_EASE_FACTOR = 10;
const SAMPLE_AMOUNT = 3;


export class BiomeGenerator {
  public biomeGrid: BiomeGridSection[] = [];

  private biomeMap: Map<VectorIndex, BiomeGridSection> = new Map();

  public fringeBlocks = new Set<string>();
  public fringeNum = new Map<string, number>();
  public fringeHeight = new Map<string, number>();

  constructor() {
    const startingBiome: BiomeGridSection = {
      hasBiome: true,
      sectionPos: new Vector2D([0, 0]),
      biome: BiomeGenerator.getRandomBiome(),
      biomeWorldPos: new Vector2D([0, 0]),
    };
    this.biomeGrid.push(startingBiome);
    this.biomeMap.set(startingBiome.sectionPos.toIndex(), startingBiome);
  }

  public getBiomeFromWorldPos(worldPos: Vector2D): Biome {
    // This will generate the biome if it hasn't been yet
    // TODO make this not return nullable
    const biomeGridData = this.getClosestSectionWithBiomeForWorldPos(worldPos);
    // Default to Plains
    if (!biomeGridData) return Biome.Plains;
    return biomeGridData.biome;
  }

  public getBiomeHeightForWorldPos(worldPos: Vector2D): number {
    const inSection = this.getSectionFromSectionPos(BiomeGenerator.getSectionPosFromWorldPos(worldPos));
    const mainSection = this.getClosestSectionWithBiomeForWorldPos(worldPos);

    // Default to plains
    if (!mainSection) return this.getBiomeInfoForBiome(Biome.Plains).maxHeight

    const mainBiomeInfo = this.getBiomeInfoForBiome(mainSection.biome);
    const mainBiomeWorldDist = mainSection.biomeWorldPos.distFrom(worldPos) // * mainBiomeInfo.sizeFactor;

    // Set the starting values
    let biomeHeightsSum = mainBiomeInfo.maxHeight;
    let allBiomeHeights = mainBiomeInfo.maxHeight;

    // Check all nearby biomes to see if we should "ease" this biomes height to fit in more
    Vector2D.squareVectors.forEach(edge => {
      const checkingPos = inSection.sectionPos.add(edge);
      const checkingSection = this.getSectionFromSectionPos(checkingPos);

      // don't check myself
      if (checkingSection === mainSection) return;

      // Skip since there isn't a biome
      if (!checkingSection.hasBiome) {
        return;
      }

      const checkingBiomeInfo = this.getBiomeInfoForBiome(checkingSection.biome);
      const checkingBiomeWorldDist = checkingSection.biomeWorldPos.distFrom(worldPos) //* checkingBiomeInfo.sizeFactor;

      if (Math.abs(checkingBiomeWorldDist - mainBiomeWorldDist) > BIOME_EASE_FACTOR) return;

      this.fringeBlocks.add(worldPos.toIndex());
      this.fringeNum.set(worldPos.toIndex(), (this.fringeNum.get(worldPos.toIndex()) ?? 1) + 1);

      // We are on the border of two biomes. Lets do a weighted average of their heights
      const normalizedDistFactor = mainBiomeWorldDist / (checkingBiomeWorldDist + mainBiomeWorldDist);

      if (normalizedDistFactor === 0) return;

      const minBiomeHeight = Math.min(checkingBiomeInfo.maxHeight, mainBiomeInfo.maxHeight);
      const avgBiomeHeight = (normalizedDistFactor * Math.abs(checkingBiomeInfo.maxHeight - mainBiomeInfo.maxHeight)) + minBiomeHeight;

      biomeHeightsSum += avgBiomeHeight;
      allBiomeHeights += checkingBiomeInfo.maxHeight;
    });


    // This shouldn't be needed
    if (biomeHeightsSum === 0) {
      this.fringeHeight.set(worldPos.toIndex(), Math.floor(mainBiomeInfo.maxHeight));
      return mainBiomeInfo.maxHeight;
    }



    const height = (allBiomeHeights / biomeHeightsSum) * mainBiomeInfo.maxHeight;
    this.fringeHeight.set(worldPos.toIndex(), Math.floor(height));
    return height;
  }

  // Static Helpers

  static getRandomBiome(): Biome {
    return Random.randomElement(
      [
        Biome.Forest,
        Biome.Mountain,
        Biome.Plains
      ]
    )
  }

  static getSectionPosFromWorldPos(worldPos: Vector2D) {
    return new Vector2D([
      Math.floor(worldPos.data[0] / BIOME_SIZE),
      Math.floor(worldPos.data[1] / BIOME_SIZE),
    ]);
  }

  // This returns the section with the biome closest to the world point
  private getClosestSectionWithBiomeForWorldPos(worldPos: Vector2D): BiomeGridSectionWithBiome | undefined {
    const sectionPos = BiomeGenerator.getSectionPosFromWorldPos(worldPos)

    let minDist = Infinity;
    let closestGridSection: BiomeGridSectionWithBiome | undefined = undefined;

    // Check all surrounding biome plots to find which biome is closest to the point
    Vector2D.squareVectors.forEach(edge => {
      const checkingPos = sectionPos.add(edge);
      const checkingSection = this.getSectionFromSectionPos(checkingPos);

      // Doesn't have a biome so don't consider it
      if (!checkingSection.hasBiome) return;

      // const checkingBiomeInfo = this.getBiomeInfoForBiome(checkingSection.biome);

      // Size factor allows for some biomes to be bigger than other
      const dist = worldPos.distFrom(checkingSection.biomeWorldPos); // * checkingBiomeInfo.sizeFactor;

      if (dist < minDist) {
        minDist = dist;
        closestGridSection = checkingSection;
      }
    });

    return closestGridSection;
  }

  private getSectionFromSectionPos(sectionPos: Vector2D) {
    const biomeGridData = this.biomeMap.get(sectionPos.toIndex());

    // We have already loaded this point! Hooray!
    if (biomeGridData) {
      return biomeGridData;
    }

    // We need load this section

    this.genBiomeForSection(sectionPos);

    // now try again to get it
    // (I'm pretty sure it will always be there after you generate it, but these is a chance the above function doesn't work. We are working with randomness here so who knows?)
    const loadedBiomeGridData = this.biomeMap.get(sectionPos.toIndex());

    if (!loadedBiomeGridData) {
      console.log("Something went terribly wrong. Maybe it doesn't matter though");
      throw new Error("This is actually bad");
    }

    return loadedBiomeGridData;
  }

  private getBiomeInfoForBiome(biome: Biome) {
    const biomeData = BiomeInfo.get(biome);
    // Maybe do some "assert" bullshit here to make the error check be removed for a production build
    if (!biomeData) throw new Error("Biome not found");
    return biomeData;
  }


  private genBiomeForSection(sectionPos: Vector2D) {
    // Generate a random point in this square SAMPLE AMOUNT times to see if there is anywhere I can place it
    // if not then mark it inactive and move on
    for (let i = 0; i < SAMPLE_AMOUNT; i++) {
      const x = Random.randomInt(0, BIOME_SIZE);
      const z = Random.randomInt(0, BIOME_SIZE);
      const newBiomeWorldPos = sectionPos.scalarMultiply(BIOME_SIZE).add(new Vector2D([x, z]));

      const tooClose = Vector2D.squareVectors.some(edge => {
        const checkingPos = sectionPos.add(edge);
        const checkingBiomeData = this.biomeMap.get(checkingPos.toIndex());

        if (
          !checkingBiomeData ||
          !checkingBiomeData.hasBiome
        ) return false;


        const dist = newBiomeWorldPos.distFrom(checkingBiomeData.biomeWorldPos);

        if (dist < BIOME_SIZE) return true;

        return false;
      });

      if (tooClose) continue;

      const biomeGridSection: BiomeGridSectionWithBiome = {
        // active: true,
        biome: BiomeGenerator.getRandomBiome(),
        biomeWorldPos: newBiomeWorldPos,
        sectionPos,
        hasBiome: true,
      };

      this.biomeMap.set(sectionPos.toIndex(), biomeGridSection);
      this.biomeGrid.push(biomeGridSection);

      return;
    }

    // We didn't generate a biome, so add an empty grid section
    const emptyBiomeGridData: BiomeGridSectionWithoutBiome = {
      sectionPos,
      hasBiome: false,
    }

    this.biomeMap.set(sectionPos.toIndex(), emptyBiomeGridData);
    this.biomeGrid.push(emptyBiomeGridData);
  }

}

